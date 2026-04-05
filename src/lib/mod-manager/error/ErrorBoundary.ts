/**
 * @module mod-manager/error/ErrorBoundary
 * @description MOD错误边界 - 捕获和处理MOD错误
 */

import type { ModContext } from '../types';
import { ModError, LifecycleError } from './ModError';
import { ERROR_THRESHOLD } from '../types';

/**
 * 错误恢复策略
 */
export interface ErrorRecoveryStrategy {
  [errorType: string]: (error: Error, modId: string, context?: ModContext) => void;
}

/**
 * 错误处理器配置
 */
export interface ErrorBoundaryConfig {
  maxErrors: number;
  resetInterval: number;
  onThresholdReached?: (modId: string, errorCount: number) => void;
}

/**
 * MOD错误边界
 * 
 * 负责捕获MOD生命周期钩子中的错误，进行错误计数和恢复处理。
 */
export class ModErrorBoundary {
  private errorCounts: Map<string, number> = new Map();
  private errorTimestamps: Map<string, number[]> = new Map();
  private readonly config: ErrorBoundaryConfig;

  constructor(config?: Partial<ErrorBoundaryConfig>) {
    this.config = {
      maxErrors: config?.maxErrors ?? ERROR_THRESHOLD,
      resetInterval: config?.resetInterval ?? 60000, // 1分钟
      onThresholdReached: config?.onThresholdReached,
    };
  }

  /**
   * 包装MOD生命周期钩子，捕获错误
   */
  wrapLifecycleHook<T>(
    modId: string,
    hookName: string,
    hook: () => T | Promise<T>,
    fallback: T,
    context?: ModContext
  ): T | Promise<T> {
    try {
      const result = hook();

      // 处理异步钩子
      if (result instanceof Promise) {
        return result.catch((error) => {
          this.handleError(modId, new LifecycleError(modId, hookName, error));
          return fallback;
        }) as T;
      }

      return result;
    } catch (error) {
      this.handleError(modId, new LifecycleError(modId, hookName, error as Error));
      return fallback;
    }
  }

  /**
   * 包装异步生命周期钩子
   */
  async wrapAsyncLifecycleHook<T>(
    modId: string,
    hookName: string,
    hook: () => Promise<T>,
    fallback: T,
    context?: ModContext
  ): Promise<T> {
    try {
      return await hook();
    } catch (error) {
      this.handleError(modId, new LifecycleError(modId, hookName, error as Error));
      return fallback;
    }
  }

  /**
   * 处理MOD错误
   */
  handleError(modId: string, error: Error): void {
    console.error(`[MOD ${modId}] Error:`, error);

    // 清理过期的错误记录
    this.cleanupOldErrors(modId);

    // 增加错误计数
    const count = (this.errorCounts.get(modId) ?? 0) + 1;
    this.errorCounts.set(modId, count);

    // 记录错误时间戳
    const timestamps = this.errorTimestamps.get(modId) ?? [];
    timestamps.push(Date.now());
    this.errorTimestamps.set(modId, timestamps);

    // 检查是否达到阈值
    if (count >= this.config.maxErrors) {
      console.warn(`[MOD ${modId}] 达到错误阈值 (${count}/${this.config.maxErrors})，建议禁用`);
      this.config.onThresholdReached?.(modId, count);
    }
  }

  /**
   * 获取MOD的错误计数
   */
  getErrorCount(modId: string): number {
    this.cleanupOldErrors(modId);
    return this.errorCounts.get(modId) ?? 0;
  }

  /**
   * 重置MOD的错误计数
   */
  resetErrorCount(modId: string): void {
    this.errorCounts.delete(modId);
    this.errorTimestamps.delete(modId);
  }

  /**
   * 检查MOD是否应该被禁用
   */
  shouldDisable(modId: string): boolean {
    return this.getErrorCount(modId) >= this.config.maxErrors;
  }

  /**
   * 清理过期的错误记录
   */
  private cleanupOldErrors(modId: string): void {
    const timestamps = this.errorTimestamps.get(modId);
    if (!timestamps) return;

    const now = Date.now();
    const validTimestamps = timestamps.filter(
      (ts) => now - ts < this.config.resetInterval
    );

    if (validTimestamps.length !== timestamps.length) {
      this.errorTimestamps.set(modId, validTimestamps);
      this.errorCounts.set(modId, validTimestamps.length);
    }
  }
}

/**
 * 默认错误恢复策略
 */
export const defaultRecoveryStrategy: ErrorRecoveryStrategy = {
  // onEnable失败 → 回退到loaded状态
  onEnable: (error, modId, context) => {
    console.warn(`[MOD ${modId}] onEnable失败，已回退到loaded状态`);
  },

  // onDisable失败 → 仍转换到disabled状态
  onDisable: (error, modId, context) => {
    console.warn(`[MOD ${modId}] onDisable失败，但仍已禁用`);
  },

  // 渲染错误 → 注销渲染器
  render: (error, modId, context) => {
    console.warn(`[MOD ${modId}] 渲染错误，应注销渲染器`);
  },
};

/**
 * 全局错误边界实例
 */
export const globalErrorBoundary = new ModErrorBoundary();