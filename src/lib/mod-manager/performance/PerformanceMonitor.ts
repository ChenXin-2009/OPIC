/**
 * @module mod-manager/performance/PerformanceMonitor
 * @description 性能监控器实现
 */

import type { PerformanceMetric } from '../types';
import { getEventBus } from '../core/EventBus';

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private eventBus = getEventBus();
  private metrics: PerformanceMetric[] = [];
  private thresholds: Map<string, number> = new Map();
  private maxMetrics: number = 1000;

  constructor() {
    // 设置默认阈值
    this.thresholds.set('init', 1000); // 初始化阈值：1秒
    this.thresholds.set('render', 16); // 渲染阈值：16ms (60fps)
  }

  /**
   * 记录性能指标
   */
  record(
    modId: string,
    type: 'init' | 'render',
    duration: number
  ): void {
    const threshold = this.thresholds.get(type) || 100;

    const metric: PerformanceMetric = {
      modId,
      type,
      duration,
      timestamp: new Date(),
      threshold,
    };

    this.metrics.push(metric);

    // 限制存储数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 检查是否超过阈值
    if (duration > threshold) {
      this.eventBus.emit('performance:warning', {
        modId,
        type,
        duration,
        threshold,
      });
    }
  }

  /**
   * 开始计时
   */
  startTimer(): number {
    return performance.now();
  }

  /**
   * 结束计时并记录
   */
  endTimer(
    modId: string,
    type: 'init' | 'render',
    startTime: number
  ): number {
    const duration = performance.now() - startTime;
    this.record(modId, type, duration);
    return duration;
  }

  /**
   * 获取MOD的性能指标
   */
  getMetrics(modId?: string): PerformanceMetric[] {
    if (modId) {
      return this.metrics.filter(m => m.modId === modId);
    }
    return [...this.metrics];
  }

  /**
   * 获取MOD的平均性能
   */
  getAveragePerformance(modId: string, type?: 'init' | 'render'): number {
    const metrics = this.getMetrics(modId).filter(
      m => !type || m.type === type
    );

    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * 获取性能警告
   */
  getWarnings(modId?: string): PerformanceMetric[] {
    return this.getMetrics(modId).filter(m => m.duration > m.threshold);
  }

  /**
   * 设置阈值
   */
  setThreshold(type: 'init' | 'render', threshold: number): void {
    this.thresholds.set(type, threshold);
  }

  /**
   * 获取阈值
   */
  getThreshold(type: 'init' | 'render'): number {
    return this.thresholds.get(type) || 100;
  }

  /**
   * 清除指标
   */
  clearMetrics(modId?: string): void {
    if (modId) {
      this.metrics = this.metrics.filter(m => m.modId !== modId);
    } else {
      this.metrics = [];
    }
  }

  /**
   * 获取性能摘要
   */
  getSummary(modId: string): {
    initCount: number;
    renderCount: number;
    avgInitTime: number;
    avgRenderTime: number;
    warningCount: number;
  } {
    const metrics = this.getMetrics(modId);
    const initMetrics = metrics.filter(m => m.type === 'init');
    const renderMetrics = metrics.filter(m => m.type === 'render');
    const warnings = metrics.filter(m => m.duration > m.threshold);

    return {
      initCount: initMetrics.length,
      renderCount: renderMetrics.length,
      avgInitTime: this.getAveragePerformance(modId, 'init'),
      avgRenderTime: this.getAveragePerformance(modId, 'render'),
      warningCount: warnings.length,
    };
  }
}

// 单例实例
let monitorInstance: PerformanceMonitor | null = null;

/**
 * 获取性能监控器单例
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * 重置性能监控器（仅用于测试）
 */
export function resetPerformanceMonitor(): void {
  monitorInstance = null;
}