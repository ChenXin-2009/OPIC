/**
 * @module mod-manager/core/ModLifecycle
 * @description MOD生命周期管理器
 * 
 * 负责MOD状态转换和生命周期钩子调用。
 */

import type {
  ModState,
  ModContext,
  ModInstance,
  ModLifecycleHooks,
} from '../types';
import { getRegistry } from './ModRegistry';
import { getEventBus } from './EventBus';
import { LifecycleError } from '../error/ModError';

/**
 * 状态转换表
 * 定义允许的状态转换
 */
const STATE_TRANSITIONS: Record<ModState, ModState[]> = {
  registered: ['loaded', 'enabled', 'unloaded'],
  loaded: ['enabled', 'disabled', 'unloaded'],
  enabled: ['disabled'],
  disabled: ['enabled', 'loaded', 'unloaded'],
  unloaded: ['registered'],
};

/**
 * 检查状态转换是否有效
 */
function isValidTransition(from: ModState, to: ModState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * MOD生命周期管理器
 */
export class ModLifecycle {
  private registry = getRegistry();
  private eventBus = getEventBus();

  /**
   * 加载MOD
   */
  async load(modId: string, contextFactory: () => ModContext): Promise<void> {
    const instance = this.registry.get(modId);
    if (!instance) {
      throw new LifecycleError(modId, 'load');
    }

    if (!isValidTransition(instance.state, 'loaded')) {
      throw new LifecycleError(
        modId,
        `load: 无效的状态转换 ${instance.state} -> loaded`
      );
    }

    try {
      // 创建上下文
      const context = contextFactory();
      this.registry.setContext(modId, context);

      // 调用onLoad钩子
      if (instance.lifecycleHooks?.onLoad) {
        await instance.lifecycleHooks.onLoad(context);
      }

      // 更新状态
      this.registry.setState(modId, 'loaded');
      instance.loadTime = Date.now();
    } catch (error) {
      this.registry.recordError(modId, error as Error);
      throw new LifecycleError(modId, 'load', error as Error);
    }
  }

  /**
   * 启用MOD
   */
  async enable(modId: string, contextFactory?: () => ModContext): Promise<void> {
    const instance = this.registry.get(modId);
    if (!instance) {
      throw new LifecycleError(modId, 'enable');
    }

    // 如果处于 registered 状态，先加载
    if (instance.state === 'registered') {
      if (!contextFactory) {
        throw new LifecycleError(modId, 'enable: 需要上下文工厂函数来加载MOD');
      }
      await this.load(modId, contextFactory);
    }

    // 重新获取实例（状态可能已更新）
    const updatedInstance = this.registry.get(modId);
    if (!updatedInstance) {
      throw new LifecycleError(modId, 'enable');
    }

    if (!isValidTransition(updatedInstance.state, 'enabled')) {
      throw new LifecycleError(
        modId,
        `enable: 无效的状态转换 ${updatedInstance.state} -> enabled`
      );
    }

    try {
      // 调用onEnable钩子
      if (updatedInstance.lifecycleHooks?.onEnable && updatedInstance.context) {
        await updatedInstance.lifecycleHooks.onEnable(updatedInstance.context);
      }

      // 更新状态
      this.registry.setState(modId, 'enabled');
      this.registry.resetErrors(modId);

      // 发送事件
      this.eventBus.emit('mod:enabled', { modId });
    } catch (error) {
      this.registry.recordError(modId, error as Error);

      // 调用错误处理钩子
      if (updatedInstance.lifecycleHooks?.onError && updatedInstance.context) {
        updatedInstance.lifecycleHooks.onError(error as Error, updatedInstance.context);
      }

      throw new LifecycleError(modId, 'enable', error as Error);
    }
  }

  /**
   * 禁用MOD
   */
  async disable(modId: string): Promise<void> {
    const instance = this.registry.get(modId);
    if (!instance) {
      throw new LifecycleError(modId, 'disable');
    }

    if (!isValidTransition(instance.state, 'disabled')) {
      throw new LifecycleError(
        modId,
        `disable: 无效的状态转换 ${instance.state} -> disabled`
      );
    }

    try {
      // 调用onDisable钩子
      if (instance.lifecycleHooks?.onDisable && instance.context) {
        await instance.lifecycleHooks.onDisable(instance.context);
      }

      // 清理资源
      await this.cleanupResources(modId);

      // 更新状态
      this.registry.setState(modId, 'disabled');

      // 发送事件
      this.eventBus.emit('mod:disabled', { modId });
    } catch (error) {
      this.registry.recordError(modId, error as Error);
      throw new LifecycleError(modId, 'disable', error as Error);
    }
  }

  /**
   * 卸载MOD
   */
  async unload(modId: string): Promise<void> {
    const instance = this.registry.get(modId);
    if (!instance) {
      throw new LifecycleError(modId, 'unload');
    }

    if (!isValidTransition(instance.state, 'unloaded')) {
      throw new LifecycleError(
        modId,
        `unload: 无效的状态转换 ${instance.state} -> unloaded`
      );
    }

    try {
      // 如果处于enabled状态，先禁用
      if (instance.state === 'enabled') {
        await this.disable(modId);
      }

      // 调用onUnload钩子
      if (instance.lifecycleHooks?.onUnload && instance.context) {
        await instance.lifecycleHooks.onUnload(instance.context);
      }

      // 清理上下文
      this.registry.setContext(modId, null);

      // 更新状态
      this.registry.setState(modId, 'unloaded');
    } catch (error) {
      this.registry.recordError(modId, error as Error);
      throw new LifecycleError(modId, 'unload', error as Error);
    }
  }

  /**
   * 清理MOD资源
   */
  private async cleanupResources(modId: string): Promise<void> {
    // 取消事件订阅
    this.eventBus.unsubscribeMod(modId);

    // 清理定时器等资源（由MOD上下文管理）
    const instance = this.registry.get(modId);
    if (instance?.context) {
      // 上下文会自动清理定时器
    }
  }

  /**
   * 获取MOD状态
   */
  getState(modId: string): ModState | undefined {
    return this.registry.getState(modId);
  }

  /**
   * 检查MOD是否已启用
   */
  isEnabled(modId: string): boolean {
    return this.registry.getState(modId) === 'enabled';
  }

  /**
   * 检查MOD是否已加载
   */
  isLoaded(modId: string): boolean {
    const state = this.registry.getState(modId);
    return state === 'loaded' || state === 'enabled' || state === 'disabled';
  }

  /**
   * 获取允许的下一状态
   */
  getAllowedTransitions(modId: string): ModState[] {
    const state = this.registry.getState(modId);
    if (!state) return [];
    return STATE_TRANSITIONS[state] || [];
  }
}

// 单例实例
let lifecycleInstance: ModLifecycle | null = null;

/**
 * 获取生命周期管理器单例
 */
export function getModLifecycle(): ModLifecycle {
  if (!lifecycleInstance) {
    lifecycleInstance = new ModLifecycle();
  }
  return lifecycleInstance;
}

/**
 * 重置生命周期管理器（仅用于测试）
 */
export function resetModLifecycle(): void {
  lifecycleInstance = null;
}