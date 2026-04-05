/**
 * @module mod-manager/core/DependencyResolver
 * @description 依赖解析器核心实现
 * 
 * 负责构建依赖图、检测循环依赖、计算加载/卸载顺序。
 */

import type { DependencyResolution, ModDependency } from '../types';
import { CircularDependencyError, MissingDependencyError } from '../error/ModError';
import { isVersionCompatible } from '../utils/version';

/**
 * 依赖图节点
 */
interface DependencyNode {
  modId: string;
  dependencies: Set<string>;
  dependents: Set<string>;
}

/**
 * 依赖解析器
 */
export class DependencyResolver {
  private graph: Map<string, DependencyNode> = new Map();
  private manifests: Map<string, { dependencies?: ModDependency[] }> = new Map();

  /**
   * 注册一个MOD的依赖信息
   */
  register(modId: string, dependencies?: ModDependency[]): void {
    this.manifests.set(modId, { dependencies });
    this.rebuildGraph();
  }

  /**
   * 注销一个MOD的依赖信息
   */
  unregister(modId: string): void {
    this.manifests.delete(modId);
    this.rebuildGraph();
  }

  /**
   * 重建依赖图
   */
  private rebuildGraph(): void {
    this.graph.clear();

    // 创建所有节点
    for (const [modId] of this.manifests) {
      this.graph.set(modId, {
        modId,
        dependencies: new Set(),
        dependents: new Set(),
      });
    }

    // 建立依赖关系
    for (const [modId, manifest] of this.manifests) {
      const node = this.graph.get(modId);
      if (!node || !manifest.dependencies) continue;

      for (const dep of manifest.dependencies) {
        if (this.graph.has(dep.id)) {
          node.dependencies.add(dep.id);
          const depNode = this.graph.get(dep.id);
          depNode?.dependents.add(modId);
        }
      }
    }
  }

  /**
   * 检测循环依赖
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (modId: string): void => {
      visited.add(modId);
      recursionStack.add(modId);
      path.push(modId);

      const node = this.graph.get(modId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visited.has(depId)) {
            dfs(depId);
          } else if (recursionStack.has(depId)) {
            // 找到循环
            const cycleStart = path.indexOf(depId);
            if (cycleStart !== -1) {
              cycles.push([...path.slice(cycleStart), depId]);
            }
          }
        }
      }

      path.pop();
      recursionStack.delete(modId);
    };

    for (const modId of this.graph.keys()) {
      if (!visited.has(modId)) {
        dfs(modId);
      }
    }

    return cycles;
  }

  /**
   * 检查是否有循环依赖
   */
  hasCycles(): boolean {
    return this.detectCycles().length > 0;
  }

  /**
   * 获取缺失的依赖
   */
  getMissingDependencies(modId: string): string[] {
    const manifest = this.manifests.get(modId);
    if (!manifest?.dependencies) return [];

    return manifest.dependencies
      .filter(dep => !this.manifests.has(dep.id) && !dep.optional)
      .map(dep => dep.id);
  }

  /**
   * 获取所有缺失的依赖
   */
  getAllMissingDependencies(): Map<string, string[]> {
    const missing = new Map<string, string[]>();
    for (const modId of this.manifests.keys()) {
      const modMissing = this.getMissingDependencies(modId);
      if (modMissing.length > 0) {
        missing.set(modId, modMissing);
      }
    }
    return missing;
  }

  /**
   * 拓扑排序（Kahn算法）
   */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];

    // 计算入度
    for (const [modId, node] of this.graph) {
      if (!inDegree.has(modId)) {
        inDegree.set(modId, 0);
      }
      for (const depId of node.dependencies) {
        inDegree.set(depId, (inDegree.get(depId) || 0) + 1);
      }
    }

    // 找到所有入度为0的节点
    const queue: string[] = [];
    for (const [modId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(modId);
      }
    }

    // 处理队列
    while (queue.length > 0) {
      const modId = queue.shift()!;
      result.push(modId);

      const node = this.graph.get(modId);
      if (node) {
        for (const depId of node.dependencies) {
          const newDegree = (inDegree.get(depId) || 0) - 1;
          inDegree.set(depId, newDegree);
          if (newDegree === 0) {
            queue.push(depId);
          }
        }
      }
    }

    return result;
  }

  /**
   * 计算启用顺序
   * 
   * 返回按依赖关系排序的MOD ID列表，确保依赖先于依赖者启用。
   */
  getEnableOrder(modIds: string[]): DependencyResolution {
    // 检查循环依赖
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      return {
        success: false,
        loadOrder: [],
        cycles,
        missing: [],
      };
    }

    // 检查缺失依赖
    const allMissing: string[] = [];
    for (const modId of modIds) {
      const missing = this.getMissingDependencies(modId);
      allMissing.push(...missing);
    }

    if (allMissing.length > 0) {
      return {
        success: false,
        loadOrder: [],
        cycles: [],
        missing: [...new Set(allMissing)],
      };
    }

    // 获取拓扑排序
    const sorted = this.topologicalSort();

    // 只返回请求的MOD，保持拓扑顺序
    const modIdSet = new Set(modIds);
    const loadOrder = sorted.filter(id => modIdSet.has(id));

    return {
      success: true,
      loadOrder,
      cycles: [],
      missing: [],
    };
  }

  /**
   * 计算禁用顺序
   * 
   * 返回按依赖关系排序的MOD ID列表，确保依赖者先于依赖禁用。
   */
  getDisableOrder(modIds: string[]): string[] {
    // 反向拓扑排序
    const sorted = this.topologicalSort().reverse();

    // 只返回请求的MOD，保持反向拓扑顺序
    const modIdSet = new Set(modIds);
    return sorted.filter(id => modIdSet.has(id));
  }

  /**
   * 获取MOD的所有依赖（递归）
   */
  getAllDependencies(modId: string, visited: Set<string> = new Set()): string[] {
    const node = this.graph.get(modId);
    if (!node || visited.has(modId)) return [];

    visited.add(modId);
    const deps: string[] = [];

    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        deps.push(depId);
        deps.push(...this.getAllDependencies(depId, visited));
      }
    }

    return deps;
  }

  /**
   * 获取MOD的所有依赖者（递归）
   */
  getAllDependents(modId: string, visited: Set<string> = new Set()): string[] {
    const node = this.graph.get(modId);
    if (!node || visited.has(modId)) return [];

    visited.add(modId);
    const dependents: string[] = [];

    for (const depId of node.dependents) {
      if (!visited.has(depId)) {
        dependents.push(depId);
        dependents.push(...this.getAllDependents(depId, visited));
      }
    }

    return dependents;
  }

  /**
   * 验证版本兼容性
   */
  validateVersions(availableMods: Map<string, string>): Map<string, string[]> {
    const versionErrors = new Map<string, string[]>();

    for (const [modId, manifest] of this.manifests) {
      const errors: string[] = [];

      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          const availableVersion = availableMods.get(dep.id);
          if (availableVersion && dep.version) {
            // 检查版本约束
            if (dep.version.exact && availableVersion !== dep.version.exact) {
              errors.push(`${dep.id}: 需要精确版本 ${dep.version.exact}，但找到 ${availableVersion}`);
            } else if (dep.version.min || dep.version.max) {
              // 简化版本检查
              const required = dep.version.min || dep.version.max || '';
              if (!isVersionCompatible(required)) {
                errors.push(`${dep.id}: 版本不兼容`);
              }
            }
          }
        }
      }

      if (errors.length > 0) {
        versionErrors.set(modId, errors);
      }
    }

    return versionErrors;
  }

  /**
   * 清空解析器
   */
  clear(): void {
    this.graph.clear();
    this.manifests.clear();
  }
}

// 单例实例
let resolverInstance: DependencyResolver | null = null;

/**
 * 获取解析器单例
 */
export function getDependencyResolver(): DependencyResolver {
  if (!resolverInstance) {
    resolverInstance = new DependencyResolver();
  }
  return resolverInstance;
}

/**
 * 重置解析器（仅用于测试）
 */
export function resetDependencyResolver(): void {
  resolverInstance = null;
}