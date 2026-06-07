/**
 * @module mod-manager/service/ServiceRegistry
 * @description 服务注册表实现
 */

import type { PermissionSystem } from '../permission/PermissionSystem';
import type { ModRegistry } from '../core/ModRegistry';
import type {
  ServiceDescriptor,
  ServiceRegistrationOptions,
  ServiceCallLog,
  ServiceStats,
} from './types';
import {
  ServiceNotFoundError,
  ServiceAccessDeniedError,
  ServiceIdConflictError,
  CircularDependencyError,
} from './types';

/**
 * 服务注册表
 * 
 * 管理 MOD 间的服务注册和调用。
 */
export class ServiceRegistry {
  /** 服务注册表 */
  private services: Map<string, ServiceDescriptor> = new Map();
  
  /** 服务调用日志 */
  private callLogs: ServiceCallLog[] = [];
  
  /** 服务依赖图 */
  private dependencies: Map<string, Set<string>> = new Map();
  
  /** 最大日志数量 */
  private maxLogs = 1000;

  constructor(
    private permissionSystem: PermissionSystem,
    _modRegistry: ModRegistry
  ) {}

  /**
   * 注册服务
   * 
   * @param modId - 提供服务的 MOD ID
   * @param serviceId - 服务 ID
   * @param options - 注册选项
   * @throws {ServiceIdConflictError} 当服务 ID 已存在时抛出
   * 
   * @example
   * ```ts
   * registry.registerService('my-mod', 'my-service', {
   *   interface: 'IMyService',
   *   implementation: myServiceImpl,
   *   visibility: 'public',
   * });
   * ```
   */
  registerService(
    modId: string,
    serviceId: string,
    options: ServiceRegistrationOptions
  ): void {
    const fullId = `${modId}.${serviceId}`;

    // 检查 ID 冲突
    if (this.services.has(fullId)) {
      throw new ServiceIdConflictError(fullId);
    }

    // 创建服务描述符
    const descriptor: ServiceDescriptor = {
      id: fullId,
      providerId: modId,
      interface: options.interface,
      implementation: options.implementation,
      visibility: options.visibility || 'public',
      requiredPermission: options.requiredPermission,
      version: options.version,
      lazy: options.lazy,
    };

    // 注册服务
    this.services.set(fullId, descriptor);

    // 初始化依赖记录
    if (!this.dependencies.has(modId)) {
      this.dependencies.set(modId, new Set());
    }
  }

  /**
   * 获取服务
   * 
   * @param callerId - 调用者 MOD ID
   * @param serviceId - 服务 ID
   * @returns 服务实现
   * @throws {ServiceNotFoundError} 当服务不存在时抛出
   * @throws {ServiceAccessDeniedError} 当访问被拒绝时抛出
   * 
   * @example
   * ```ts
   * const service = registry.getService<IMyService>('caller-mod', 'provider-mod.my-service');
   * ```
   */
  getService<T = unknown>(callerId: string, serviceId: string): T {
    let success = false;
    let error: Error | undefined;

    try {
      // 查找服务
      const descriptor = this.services.get(serviceId);
      if (!descriptor) {
        throw new ServiceNotFoundError(serviceId);
      }

      // 检查可见性
      this.checkVisibility(callerId, descriptor);

      // 检查权限
      if (descriptor.requiredPermission) {
        if (!this.permissionSystem.hasPermission(callerId, descriptor.requiredPermission)) {
          throw new ServiceAccessDeniedError(
            serviceId,
            callerId,
            `MOD "${callerId}" does not have required permission: ${descriptor.requiredPermission}`
          );
        }
      }

      // 记录依赖
      this.recordDependency(callerId, descriptor.providerId);

      // 检查循环依赖
      this.checkCircularDependency(callerId);

      success = true;
      return descriptor.implementation as T;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      // 记录调用日志
      this.logCall({
        serviceId,
        callerId,
        timestamp: new Date(),
        success,
        error: error?.message,
      });
    }
  }

  /**
   * 检查可见性
   */
  private checkVisibility(callerId: string, descriptor: ServiceDescriptor): void {
    switch (descriptor.visibility) {
      case 'public':
        // 公开服务，所有人都可以访问
        return;

      case 'internal':
        // 内部服务，只有同一 MOD 可以访问
        if (callerId !== descriptor.providerId) {
          throw new ServiceAccessDeniedError(
            descriptor.id,
            callerId,
            `Service "${descriptor.id}" is internal and can only be accessed by "${descriptor.providerId}"`
          );
        }
        return;

      case 'private':
        // 私有服务，不允许外部访问
        throw new ServiceAccessDeniedError(
          descriptor.id,
          callerId,
          `Service "${descriptor.id}" is private`
        );
    }
  }

  /**
   * 记录依赖关系
   */
  private recordDependency(callerId: string, providerId: string): void {
    if (!this.dependencies.has(callerId)) {
      this.dependencies.set(callerId, new Set());
    }
    this.dependencies.get(callerId)!.add(providerId);
  }

  /**
   * 检查循环依赖
   */
  private checkCircularDependency(modId: string): void {
    const visited = new Set<string>();
    const path: string[] = [];

    const visit = (current: string): boolean => {
      if (path.includes(current)) {
        // 找到循环
        const cycleStart = path.indexOf(current);
        const cycle = [...path.slice(cycleStart), current];
        throw new CircularDependencyError(cycle);
      }

      if (visited.has(current)) {
        return false;
      }

      visited.add(current);
      path.push(current);

      const deps = this.dependencies.get(current);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }

      path.pop();
      return false;
    };

    visit(modId);
  }

  /**
   * 注销服务
   * 
   * @param serviceId - 服务 ID
   * @returns 是否成功注销
   */
  unregisterService(serviceId: string): boolean {
    return this.services.delete(serviceId);
  }

  /**
   * 注销 MOD 的所有服务
   * 
   * @param modId - MOD ID
   */
  unregisterModServices(modId: string): void {
    for (const [id, descriptor] of this.services) {
      if (descriptor.providerId === modId) {
        this.services.delete(id);
      }
    }

    // 清除依赖记录
    this.dependencies.delete(modId);
  }

  /**
   * 检查服务是否存在
   * 
   * @param serviceId - 服务 ID
   * @returns 是否存在
   */
  hasService(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  /**
   * 获取服务描述符
   * 
   * @param serviceId - 服务 ID
   * @returns 服务描述符或 undefined
   */
  getServiceDescriptor(serviceId: string): ServiceDescriptor | undefined {
    return this.services.get(serviceId);
  }

  /**
   * 获取所有服务
   * 
   * @returns 服务描述符数组
   */
  getAllServices(): ServiceDescriptor[] {
    return Array.from(this.services.values());
  }

  /**
   * 获取 MOD 提供的服务
   * 
   * @param modId - MOD ID
   * @returns 服务描述符数组
   */
  getServicesByProvider(modId: string): ServiceDescriptor[] {
    return this.getAllServices().filter(s => s.providerId === modId);
  }

  /**
   * 获取公开服务
   * 
   * @returns 服务描述符数组
   */
  getPublicServices(): ServiceDescriptor[] {
    return this.getAllServices().filter(s => s.visibility === 'public');
  }

  /**
   * 记录调用日志
   */
  private logCall(log: ServiceCallLog): void {
    this.callLogs.push(log);

    // 限制日志数量
    if (this.callLogs.length > this.maxLogs) {
      this.callLogs.shift();
    }
  }

  /**
   * 获取服务调用日志
   * 
   * @param serviceId - 可选的服务 ID
   * @returns 调用日志数组
   */
  getCallLogs(serviceId?: string): ServiceCallLog[] {
    if (serviceId) {
      return this.callLogs.filter(log => log.serviceId === serviceId);
    }
    return [...this.callLogs];
  }

  /**
   * 获取服务统计信息
   * 
   * @param serviceId - 服务 ID
   * @returns 统计信息
   */
  getServiceStats(serviceId: string): ServiceStats {
    const logs = this.getCallLogs(serviceId);
    const callers = new Set(logs.map(log => log.callerId));

    return {
      totalCalls: logs.length,
      successfulCalls: logs.filter(log => log.success).length,
      failedCalls: logs.filter(log => !log.success).length,
      uniqueCallers: callers.size,
    };
  }

  /**
   * 获取依赖图
   * 
   * @returns 依赖关系映射
   */
  getDependencyGraph(): Map<string, Set<string>> {
    return new Map(this.dependencies);
  }

  /**
   * 获取 MOD 的依赖
   * 
   * @param modId - MOD ID
   * @returns 依赖的 MOD ID 集合
   */
  getModDependencies(modId: string): Set<string> {
    return this.dependencies.get(modId) || new Set();
  }

  /**
   * 获取依赖 MOD 的服务
   * 
   * @param modId - MOD ID
   * @returns 依赖该 MOD 的 MOD ID 数组
   */
  getModDependents(modId: string): string[] {
    const dependents: string[] = [];

    for (const [caller, deps] of this.dependencies) {
      if (deps.has(modId)) {
        dependents.push(caller);
      }
    }

    return dependents;
  }

  /**
   * 清除调用日志
   * 
   * @param serviceId - 可选的服务 ID
   */
  clearLogs(serviceId?: string): void {
    if (serviceId) {
      this.callLogs = this.callLogs.filter(log => log.serviceId !== serviceId);
    } else {
      this.callLogs = [];
    }
  }

  /**
   * 获取注册表统计信息
   * 
   * @returns 统计信息
   */
  getStats() {
    return {
      totalServices: this.services.size,
      publicServices: this.getPublicServices().length,
      totalCalls: this.callLogs.length,
    };
  }
}
