/**
 * @module mod-manager/core/EventBus
 * @description 事件总线核心实现
 * 
 * 提供MOD间通信的事件发布/订阅机制。
 */

import { SYSTEM_EVENTS } from '../types';

/**
 * 事件处理器
 */
type EventHandler = (data: unknown) => void;

/**
 * 事件订阅信息
 */
interface EventSubscription {
  handler: EventHandler;
  modId: string;
  once: boolean;
}

/**
 * 事件总线
 */
export class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private modSubscriptions: Map<string, Set<string>> = new Map();
  private errorHandler?: (error: Error, modId: string, event: string) => void;

  /**
   * 发送事件
   */
  emit(event: string, data?: unknown): void {
    const subs = this.subscriptions.get(event);
    if (!subs || subs.length === 0) return;

    // 复制数组以防止在迭代时修改
    const toCall = [...subs];

    for (const sub of toCall) {
      try {
        sub.handler(data);

        // 处理一次性订阅
        if (sub.once) {
          this.off(event, sub.handler);
        }
      } catch (error) {
        if (this.errorHandler) {
          this.errorHandler(error as Error, sub.modId, event);
        }
      }
    }
  }

  /**
   * 订阅事件
   */
  on(event: string, handler: EventHandler, modId: string = 'system'): () => void {
    return this.subscribe(event, handler, modId, false);
  }

  /**
   * 一次性订阅
   */
  once(event: string, handler: EventHandler, modId: string = 'system'): () => void {
    return this.subscribe(event, handler, modId, true);
  }

  /**
   * 取消订阅
   */
  off(event: string, handler: EventHandler): void {
    const subs = this.subscriptions.get(event);
    if (!subs) return;

    const index = subs.findIndex(s => s.handler === handler);
    if (index !== -1) {
      const sub = subs[index];
      subs.splice(index, 1);

      // 从MOD订阅记录中移除
      const modSubs = this.modSubscriptions.get(sub.modId);
      if (modSubs) {
        modSubs.delete(event);
        if (modSubs.size === 0) {
          this.modSubscriptions.delete(sub.modId);
        }
      }
    }
  }

  /**
   * 内部订阅实现
   */
  private subscribe(
    event: string,
    handler: EventHandler,
    modId: string,
    once: boolean
  ): () => void {
    // 添加到事件订阅
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    const sub: EventSubscription = { handler, modId, once };
    this.subscriptions.get(event)!.push(sub);

    // 记录MOD订阅
    if (!this.modSubscriptions.has(modId)) {
      this.modSubscriptions.set(modId, new Set());
    }
    this.modSubscriptions.get(modId)!.add(event);

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * 取消MOD的所有订阅
   */
  unsubscribeMod(modId: string): void {
    const events = this.modSubscriptions.get(modId);
    if (!events) return;

    for (const event of events) {
      const subs = this.subscriptions.get(event);
      if (subs) {
        // 过滤掉该MOD的订阅
        const remaining = subs.filter(s => s.modId !== modId);
        if (remaining.length > 0) {
          this.subscriptions.set(event, remaining);
        } else {
          this.subscriptions.delete(event);
        }
      }
    }

    this.modSubscriptions.delete(modId);
  }

  /**
   * 设置错误处理器
   */
  setErrorHandler(handler: (error: Error, modId: string, event: string) => void): void {
    this.errorHandler = handler;
  }

  /**
   * 检查事件是否有订阅者
   */
  hasSubscribers(event: string): boolean {
    const subs = this.subscriptions.get(event);
    return subs !== undefined && subs.length > 0;
  }

  /**
   * 获取事件的订阅者数量
   */
  getSubscriberCount(event: string): number {
    return this.subscriptions.get(event)?.length || 0;
  }

  /**
   * 获取MOD订阅的事件列表
   */
  getModSubscriptions(modId: string): string[] {
    return Array.from(this.modSubscriptions.get(modId) || []);
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.subscriptions.clear();
    this.modSubscriptions.clear();
  }

  /**
   * 获取系统事件常量
   */
  static get SYSTEM_EVENTS() {
    return SYSTEM_EVENTS;
  }
}

// 单例实例
let busInstance: EventBus | null = null;

/**
 * 获取事件总线单例
 */
export function getEventBus(): EventBus {
  if (!busInstance) {
    busInstance = new EventBus();
  }
  return busInstance;
}

/**
 * 重置事件总线（仅用于测试）
 */
export function resetEventBus(): void {
  busInstance = null;
}