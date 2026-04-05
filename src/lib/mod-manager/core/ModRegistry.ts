/**
 * @module mod-manager/core/ModRegistry
 * @description MOD注册表核心实现
 * 
 * 负责MOD的注册、注销和状态查询。
 */

import type {
  ModManifest,
  ModInstance,
  ModState,
  ModContext,
  ModLifecycleHooks,
} from '../types';
import { validateManifest } from '../utils/validateManifest';
import { DuplicateIdError, ManifestValidationError } from '../error/ModError';

/**
 * MOD注册表
 * 
 * 管理所有已注册MOD的中央存储。
 */
export class ModRegistry {
  private mods: Map<string, ModInstance> = new Map();
  private stateListeners: Set<(modId: string, state: ModState) => void> = new Set();

  /**
   * 注册一个MOD
   * @throws {DuplicateModError} 如果MOD ID已存在
   * @throws {ModValidationError} 如果清单验证失败
   */
  register(manifest: ModManifest, lifecycleHooks?: ModLifecycleHooks): void {
    // 验证清单
    const result = validateManifest(manifest);
    if (!result.valid) {
      throw new ManifestValidationError(
        manifest.id,
        result.errors
      );
    }

    // 检查重复ID
    if (this.mods.has(manifest.id)) {
      throw new DuplicateIdError(manifest.id);
    }

    // 创建MOD实例
    const instance: ModInstance = {
      manifest,
      state: 'registered',
      context: null,
      errorCount: 0,
      lastError: null,
      loadTime: 0,
      renderTime: 0,
      lifecycleHooks,
    };

    this.mods.set(manifest.id, instance);
    this.notifyStateChange(manifest.id, 'registered');
  }

  /**
   * 注销一个MOD
   */
  unregister(modId: string): boolean {
    const instance = this.mods.get(modId);
    if (!instance) return false;

    // 只能注销已禁用或已注册的MOD
    if (instance.state !== 'disabled' && instance.state !== 'registered') {
      return false;
    }

    this.mods.delete(modId);
    return true;
  }

  /**
   * 获取MOD实例
   */
  get(modId: string): ModInstance | undefined {
    return this.mods.get(modId);
  }

  /**
   * 获取MOD清单
   */
  getManifest(modId: string): ModManifest | undefined {
    return this.mods.get(modId)?.manifest;
  }

  /**
   * 获取MOD状态
   */
  getState(modId: string): ModState | undefined {
    return this.mods.get(modId)?.state;
  }

  /**
   * 设置MOD状态
   */
  setState(modId: string, state: ModState): boolean {
    const instance = this.mods.get(modId);
    if (!instance) return false;

    instance.state = state;
    this.notifyStateChange(modId, state);
    return true;
  }

  /**
   * 设置MOD上下文
   */
  setContext(modId: string, context: ModContext | null): boolean {
    const instance = this.mods.get(modId);
    if (!instance) return false;

    instance.context = context;
    return true;
  }

  /**
   * 记录MOD错误
   */
  recordError(modId: string, error: Error): void {
    const instance = this.mods.get(modId);
    if (!instance) return;

    instance.errorCount++;
    instance.lastError = error;
  }

  /**
   * 重置MOD错误计数
   */
  resetErrors(modId: string): void {
    const instance = this.mods.get(modId);
    if (!instance) return;

    instance.errorCount = 0;
    instance.lastError = null;
  }

  /**
   * 获取所有已注册的MOD ID
   */
  getModIds(): string[] {
    return Array.from(this.mods.keys());
  }

  /**
   * 获取所有MOD实例
   */
  getAll(): ModInstance[] {
    return Array.from(this.mods.values());
  }

  /**
   * 获取指定状态的MOD
   */
  getByState(state: ModState): ModInstance[] {
    return this.getAll().filter(mod => mod.state === state);
  }

  /**
   * 检查MOD是否存在
   */
  has(modId: string): boolean {
    return this.mods.has(modId);
  }

  /**
   * 获取MOD数量
   */
  get size(): number {
    return this.mods.size;
  }

  /**
   * 订阅状态变化
   */
  onStateChange(listener: (modId: string, state: ModState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(modId: string, state: ModState): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(modId, state);
      } catch {
        // 忽略监听器错误
      }
    });
  }

  /**
   * 清空所有MOD
   */
  clear(): void {
    this.mods.clear();
  }
}

// 单例实例
let registryInstance: ModRegistry | null = null;

/**
 * 获取注册表单例
 */
export function getRegistry(): ModRegistry {
  if (!registryInstance) {
    registryInstance = new ModRegistry();
  }
  return registryInstance;
}

/**
 * 重置注册表（仅用于测试）
 */
export function resetRegistry(): void {
  registryInstance = null;
}