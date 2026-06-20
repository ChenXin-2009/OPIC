/**
 * 性能监控器
 *
 * 核心功能：
 * - FPS（帧率）监控
 * - 内存使用追踪
 * - 渲染性能统计
 * - 自定义性能指标
 * - Web Vitals 集成
 * - localStorage 持久化存储
 *
 * 使用场景：
 * - 开发环境性能调试
 * - 生产环境性能追踪
 * - 性能回归检测
 * - 用户体验优化
 *
 * @example
 * ```typescript
 * const monitor = PerformanceMonitor.getInstance();
 * monitor.start();
 *
 * // 标记自定义指标
 * monitor.mark('data-load-start');
 * await loadData();
 * monitor.mark('data-load-end');
 * monitor.measure('data-load', 'data-load-start', 'data-load-end');
 *
 * // 获取当前 FPS
 * const fps = monitor.getCurrentFPS();
 *
 * // 记录域特定指标
 * monitor.recordCelestialCalculationTime(15.3);
 * monitor.recordTileLoadTime(23.7);
 * ```
 */

import { logger } from '@/utils/logger';
import { FpsTracker } from './FpsTracker';
import { WebVitalsCollector } from './WebVitalsCollector';
import { MetricsStorage } from './MetricsStorage';
import type { WebVitalsMetrics, PerformanceMetrics } from './performance-types';

// Re-export types for backward compatibility
export type { WebVitalsMetrics, PerformanceMetrics };

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;

  private fpsTracker: FpsTracker;
  private webVitalsCollector: WebVitalsCollector;
  private storage: MetricsStorage;

  // 内存相关
  private memoryCheckInterval: number | null = null;
  private readonly MEMORY_CHECK_INTERVAL = 1000;

  // 渲染统计
  private trianglesRendered: number = 0;
  private drawCalls: number = 0;
  private cesiumActiveObjects: number = 0;
  private threeActiveObjects: number = 0;

  // 自定义域指标（滚动平均，最近100个样本）
  private celestialCalculationTimes: number[] = [];
  private cesiumTileLoadTimes: number[] = [];
  private ephemerisParseTimes: number[] = [];
  private modLoadTimes: number[] = [];
  private readonly DOMAIN_METRICS_SAMPLE_SIZE = 100;

  // 性能标记
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  // 监控状态
  private isMonitoring: boolean = false;
  private isProduction: boolean;
  private samplingInterval: number;

  // 回调函数
  private metricsCallbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

  private constructor() {
    this.fpsTracker = new FpsTracker();
    this.webVitalsCollector = new WebVitalsCollector();
    this.storage = new MetricsStorage();

    this.isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
    this.samplingInterval = this.isProduction ? 10000 : 1000;

    this.storage.loadFromStorage();
    this.storage.cleanOldMetrics();
    this.webVitalsCollector.initialize();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public start(): void {
    if (this.isMonitoring) {
      console.warn('PerformanceMonitor 已经在运行中');
      return;
    }

    this.isMonitoring = true;
    this.fpsTracker.start();

    if (typeof window !== 'undefined' && 'performance' in window && (performance as any).memory) {
      this.memoryCheckInterval = window.setInterval(() => {
        this.notifyCallbacks();
      }, this.MEMORY_CHECK_INTERVAL);
    }

    logger.debug('PerformanceMonitor 已启动');
  }

  public stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.fpsTracker.stop();

    if (this.memoryCheckInterval !== null) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    logger.debug('PerformanceMonitor 已停止');
  }

  public beginFrame(): void {
    this.fpsTracker.beginFrame();
  }

  public endFrame(): void {
  }

  public getCurrentFPS(): number {
    return this.fpsTracker.getCurrentFPS();
  }

  public getAverageFPS(): number {
    return this.fpsTracker.getAverageFPS();
  }

  public getMinMaxFPS(): { min: number; max: number } {
    return this.fpsTracker.getMinMaxFPS();
  }

  public getMemoryUsage(): { heapSize: number; usedHeapSize: number; heapLimit: number } {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return { heapSize: 0, usedHeapSize: 0, heapLimit: 0 };
    }

    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
    };

    if (!perf.memory) {
      return { heapSize: 0, usedHeapSize: 0, heapLimit: 0 };
    }

    return {
      heapSize: perf.memory.totalJSHeapSize,
      usedHeapSize: perf.memory.usedJSHeapSize,
      heapLimit: perf.memory.jsHeapSizeLimit,
    };
  }

  // --- 域特定指标 ---

  private calculateRollingAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  public recordCelestialCalculationTime(timeMs: number): void {
    this.celestialCalculationTimes.push(timeMs);
    if (this.celestialCalculationTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.celestialCalculationTimes.shift();
    }
  }

  public recordTileLoadTime(timeMs: number): void {
    this.cesiumTileLoadTimes.push(timeMs);
    if (this.cesiumTileLoadTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.cesiumTileLoadTimes.shift();
    }
  }

  public recordEphemerisParseTime(timeMs: number): void {
    this.ephemerisParseTimes.push(timeMs);
    if (this.ephemerisParseTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.ephemerisParseTimes.shift();
    }
  }

  public recordModLoadTime(timeMs: number): void {
    this.modLoadTimes.push(timeMs);
    if (this.modLoadTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.modLoadTimes.shift();
    }
  }

  public recordInterpolation(timeMs: number): void {
    this.recordMetric('interpolation', timeMs);
  }

  public recordGPUUpload(timeMs: number): void {
    this.recordMetric('gpuUpload', timeMs);
  }

  public recordSGP4Calculation(timeMs: number): void {
    this.recordMetric('sgp4Calculation', timeMs);
  }

  public recordCesiumRenderTime(timeMs: number): void {
    this.recordTileLoadTime(timeMs);
  }

  // --- 标记/测量 ---

  public mark(name: string): void {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);

    if (typeof window !== 'undefined' && 'performance' in window) {
      try { performance.mark(name); } catch (_e) {}
    }
  }

  public measure(name: string, startMark: string, endMark: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = this.marks.get(endMark);

    if (startTime === undefined || endTime === undefined) {
      console.warn(`标记 ${startMark} 或 ${endMark} 不存在`);
      return 0;
    }

    const duration = endTime - startTime;
    this.measures.set(name, duration);

    if (typeof window !== 'undefined' && 'performance' in window) {
      try { performance.measure(name, startMark, endMark); } catch (_e) {}
    }

    return duration;
  }

  public getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  public getAllMeasures(): Map<string, number> {
    return new Map(this.measures);
  }

  public clearMarks(): void {
    this.marks.clear();
    this.measures.clear();

    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        performance.clearMarks();
        performance.clearMeasures();
      } catch (_e) {}
    }
  }

  public recordMetric(name: string, value: number): void {
    this.measures.set(name, value);
  }

  // --- 渲染统计 ---

  public setSatelliteCount(count: number): void {
    this.recordMetric('satelliteCount', count);
  }

  public setVisibleSatelliteCount(count: number): void {
    this.recordMetric('visibleSatelliteCount', count);
  }

  public setRenderStats(stats: {
    trianglesRendered?: number;
    drawCalls?: number;
    cesiumActiveObjects?: number;
    threeActiveObjects?: number;
  }): void {
    if (stats.trianglesRendered !== undefined) this.trianglesRendered = stats.trianglesRendered;
    if (stats.drawCalls !== undefined) this.drawCalls = stats.drawCalls;
    if (stats.cesiumActiveObjects !== undefined) this.cesiumActiveObjects = stats.cesiumActiveObjects;
    if (stats.threeActiveObjects !== undefined) this.threeActiveObjects = stats.threeActiveObjects;
  }

  // --- 指标聚合 ---

  public getMetrics(): PerformanceMetrics {
    const { min, max } = this.fpsTracker.getMinMaxFPS();
    const memory = this.getMemoryUsage();

    return {
      fps: this.fpsTracker.getCurrentFPS(),
      frameTime: this.fpsTracker.getFrameTime(),
      avgFPS: this.fpsTracker.getAverageFPS(),
      minFPS: min,
      maxFPS: max,
      heapSize: memory.heapSize,
      usedHeapSize: memory.usedHeapSize,
      heapLimit: memory.heapLimit,
      trianglesRendered: this.trianglesRendered,
      drawCalls: this.drawCalls,
      cesiumActiveObjects: this.cesiumActiveObjects,
      threeActiveObjects: this.threeActiveObjects,
      celestialCalculationTime: this.calculateRollingAverage(this.celestialCalculationTimes),
      cesiumTileLoadTime: this.calculateRollingAverage(this.cesiumTileLoadTimes),
      ephemerisParseTime: this.calculateRollingAverage(this.ephemerisParseTimes),
      modLoadTime: this.calculateRollingAverage(this.modLoadTimes),
      webVitals: this.webVitalsCollector.getMetrics(),
      timestamp: Date.now(),
      customMetrics: this.getAllMeasures(),
      interpolationTime: this.measures.get('interpolation') || 0,
      satelliteCount: this.measures.get('satelliteCount') || 0,
      visibleSatelliteCount: this.measures.get('visibleSatelliteCount') || 0,
      gpuUploadTime: this.measures.get('gpuUpload') || 0,
      sgp4CalculationTime: this.measures.get('sgp4Calculation') || 0,
    } as PerformanceMetrics & {
      interpolationTime: number;
      satelliteCount: number;
      visibleSatelliteCount: number;
      gpuUploadTime: number;
      sgp4CalculationTime: number;
    };
  }

  // --- 历史记录 ---

  public getMetricsHistory(durationMs?: number): any[] {
    return this.storage.getHistory(durationMs);
  }

  public exportMetrics(): string {
    try {
      const currentMetrics = this.getMetrics();
      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        currentMetrics,
        history: this.storage.getHistory(),
        environment: {
          isProduction: this.isProduction,
          samplingInterval: this.samplingInterval,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
      };

      return JSON.stringify(exportData, (_key, value) => {
        if (value instanceof Map) return Object.fromEntries(value);
        return value;
      }, 2);
    } catch (error) {
      console.error('导出性能指标失败:', error);
      return JSON.stringify({ error: 'Export failed', message: String(error) });
    }
  }

  public clearOldMetrics(retentionDays: number): void {
    this.storage.clearOld(retentionDays);
  }

  // --- 订阅/通知 ---

  public subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    return () => { this.metricsCallbacks.delete(callback); };
  }

  private notifyCallbacks(): void {
    const metrics = this.getMetrics();
    this.storage.addEntry(metrics);
    this.storage.saveToStorage();

    this.metricsCallbacks.forEach(callback => {
      try { callback(metrics); } catch (error) {
        console.error('性能监控回调执行失败:', error);
      }
    });
  }

  // --- 报告 ---

  public getPerformanceReport(): string {
    const metrics = this.getMetrics();

    return `
性能报告
========
FPS: ${metrics.fps} (平均: ${metrics.avgFPS}, 最小: ${metrics.minFPS}, 最大: ${metrics.maxFPS})
帧时间: ${metrics.frameTime.toFixed(2)}ms
内存: ${(metrics.usedHeapSize / 1048576).toFixed(2)}MB / ${(metrics.usedHeapSize / 1048576).toFixed(2)}MB (限制: ${(metrics.heapLimit / 1048576).toFixed(2)}MB)
渲染统计:
  三角形数: ${metrics.trianglesRendered.toLocaleString()}
  绘制调用: ${metrics.drawCalls}
  Cesium 对象: ${metrics.cesiumActiveObjects}
  Three.js 对象: ${metrics.threeActiveObjects}
域特定指标:
  天体计算时间: ${metrics.celestialCalculationTime.toFixed(2)}ms
  瓦片加载时间: ${metrics.cesiumTileLoadTime.toFixed(2)}ms
  星历解析时间: ${metrics.ephemerisParseTime.toFixed(2)}ms
  MOD 加载时间: ${metrics.modLoadTime.toFixed(2)}ms
Web Vitals:
  FCP: ${metrics.webVitals.FCP !== undefined ? metrics.webVitals.FCP.toFixed(2) + 'ms' : 'N/A'}
  LCP: ${metrics.webVitals.LCP !== undefined ? metrics.webVitals.LCP.toFixed(2) + 'ms' : 'N/A'}
  INP: ${metrics.webVitals.INP !== undefined ? metrics.webVitals.INP.toFixed(2) + 'ms' : 'N/A'}
  CLS: ${metrics.webVitals.CLS !== undefined ? metrics.webVitals.CLS.toFixed(4) : 'N/A'}
  TTFB: ${metrics.webVitals.TTFB !== undefined ? metrics.webVitals.TTFB.toFixed(2) + 'ms' : 'N/A'}
自定义指标:
${Array.from(metrics.customMetrics.entries())
  .map(([name, value]) => `  ${name}: ${value.toFixed(2)}ms`)
  .join('\n') || '  (无)'}
    `.trim();
  }

  // --- 重置 ---

  public reset(): void {
    this.fpsTracker.reset();
    this.celestialCalculationTimes = [];
    this.cesiumTileLoadTimes = [];
    this.ephemerisParseTimes = [];
    this.modLoadTimes = [];
    this.marks.clear();
    this.measures.clear();
    this.metricsCallbacks.clear();
    this.storage.reset();
    this.webVitalsCollector.reset();
    this.trianglesRendered = 0;
    this.drawCalls = 0;
    this.cesiumActiveObjects = 0;
    this.threeActiveObjects = 0;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

export const startPerformanceMonitoring = (): void => {
  performanceMonitor.start();
};

export const stopPerformanceMonitoring = (): void => {
  performanceMonitor.stop();
};

export const getPerformanceMetrics = (): PerformanceMetrics => {
  return performanceMonitor.getMetrics();
};

export const exportPerformanceMetrics = (): string => {
  return performanceMonitor.exportMetrics();
};
