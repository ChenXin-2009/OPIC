/**
 * @module mod-manager/sandbox/Sandbox
 * @description 沙箱实现（简化版，用于 API 代理）
 */

import { DEFAULT_QUOTA, QuotaExceededError, type ResourceQuota, type ResourceUsage } from './types';

/**
 * 沙箱
 * 
 * 限制 MOD 的资源使用，防止单个 MOD 消耗过多资源。
 */
export class Sandbox {
  /** MOD 的资源配额 */
  private quotas: Map<string, ResourceQuota> = new Map();
  
  /** MOD 的资源使用情况 */
  private usage: Map<string, ResourceUsage> = new Map();
  
  /** MOD 的定时器 ID 集合 */
  private timers: Map<string, Set<number>> = new Map();
  
  /** MOD 的 API 调用时间戳 */
  private apiCallTimestamps: Map<string, number[]> = new Map();

  /**
   * 初始化 MOD 的沙箱
   * 
   * @param modId - MOD ID
   * @param quota - 可选的自定义配额
   */
  initialize(modId: string, quota?: Partial<ResourceQuota>): void {
    this.quotas.set(modId, {
      ...DEFAULT_QUOTA,
      ...quota,
    });

    this.usage.set(modId, {
      memoryMB: 0,
      renderObjects: 0,
      eventListeners: 0,
      timers: 0,
      apiCallsLastSecond: 0,
    });

    this.timers.set(modId, new Set());
    this.apiCallTimestamps.set(modId, []);
  }

  /**
   * 检查配额
   * 
   * @param modId - MOD ID
   * @param resourceType - 资源类型
   * @throws {QuotaExceededError} 当超过配额时抛出
   */
  checkQuota(modId: string, resourceType: keyof ResourceUsage): void {
    const quota = this.quotas.get(modId);
    const usage = this.usage.get(modId);

    if (!quota || !usage) {
      // 如果沙箱未初始化，自动初始化
      this.initialize(modId);
      return;
    }

    // 特殊处理 API 调用速率限制
    if (resourceType === 'apiCallsLastSecond') {
      this.checkAPICallRate(modId);
      return;
    }

    // 检查其他资源配额
    const quotaKey = `max${resourceType.charAt(0).toUpperCase()}${resourceType.slice(1)}` as keyof ResourceQuota;
    const limit = quota[quotaKey] as number;
    const current = usage[resourceType];

    if (current >= limit) {
      throw new QuotaExceededError(modId, resourceType, limit, current);
    }
  }

  /**
   * 检查 API 调用速率
   */
  private checkAPICallRate(modId: string): void {
    const quota = this.quotas.get(modId);
    const timestamps = this.apiCallTimestamps.get(modId);

    if (!quota || !timestamps) {
      return;
    }

    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // 移除超过 1 秒的时间戳
    const recentCalls = timestamps.filter(ts => ts > oneSecondAgo);
    this.apiCallTimestamps.set(modId, recentCalls);

    // 检查速率限制
    if (recentCalls.length >= quota.maxAPICallsPerSecond) {
      throw new QuotaExceededError(
        modId,
        'apiCallsPerSecond',
        quota.maxAPICallsPerSecond,
        recentCalls.length
      );
    }

    // 记录当前调用
    recentCalls.push(now);
    this.apiCallTimestamps.set(modId, recentCalls);
  }

  /**
   * 跟踪渲染对象
   */
  trackRenderObject(modId: string): void {
    const usage = this.usage.get(modId);
    if (usage) {
      usage.renderObjects++;
    }
  }

  /**
   * 取消跟踪渲染对象
   */
  untrackRenderObject(modId: string): void {
    const usage = this.usage.get(modId);
    if (usage && usage.renderObjects > 0) {
      usage.renderObjects--;
    }
  }

  /**
   * 跟踪事件监听器
   */
  trackEventListener(modId: string): void {
    const usage = this.usage.get(modId);
    if (usage) {
      usage.eventListeners++;
    }
  }

  /**
   * 取消跟踪事件监听器
   */
  untrackEventListener(modId: string): void {
    const usage = this.usage.get(modId);
    if (usage && usage.eventListeners > 0) {
      usage.eventListeners--;
    }
  }

  /**
   * 跟踪定时器
   */
  trackTimer(modId: string, timerId: number): void {
    const timerSet = this.timers.get(modId);
    if (timerSet) {
      timerSet.add(timerId);
    }

    const usage = this.usage.get(modId);
    if (usage) {
      usage.timers = timerSet?.size || 0;
    }
  }

  /**
   * 取消跟踪定时器
   */
  untrackTimer(modId: string, timerId: number): void {
    const timerSet = this.timers.get(modId);
    if (timerSet) {
      timerSet.delete(timerId);
    }

    const usage = this.usage.get(modId);
    if (usage) {
      usage.timers = timerSet?.size || 0;
    }
  }

  /**
   * 获取资源使用情况
   */
  getUsage(modId: string): ResourceUsage | undefined {
    return this.usage.get(modId);
  }

  /**
   * 获取资源配额
   */
  getQuota(modId: string): ResourceQuota | undefined {
    return this.quotas.get(modId);
  }

  /**
   * 清理 MOD 的所有资源
   */
  cleanup(modId: string): void {
    // 清除所有定时器
    const timerSet = this.timers.get(modId);
    if (timerSet) {
      for (const timerId of timerSet) {
        clearTimeout(timerId);
        clearInterval(timerId);
      }
    }

    // 重置资源使用
    this.usage.delete(modId);
    this.quotas.delete(modId);
    this.timers.delete(modId);
    this.apiCallTimestamps.delete(modId);
  }
}
