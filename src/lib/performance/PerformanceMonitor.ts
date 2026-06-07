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

/**
 * Web Vitals 指标接口
 */
export interface WebVitalsMetrics {
  /** First Contentful Paint (ms) */
  FCP?: number;
  /** Largest Contentful Paint (ms) */
  LCP?: number;
  /** Interaction to Next Paint (ms) */
  INP?: number;
  /** Cumulative Layout Shift */
  CLS?: number;
  /** Time to First Byte (ms) */
  TTFB?: number;
}

/**
 * 性能指标接口（增强版）
 */
export interface PerformanceMetrics {
  /** 当前 FPS */
  fps: number;
  
  /** 帧时间（毫秒） */
  frameTime: number;
  
  /** 平均 FPS */
  avgFPS: number;
  
  /** 最小 FPS */
  minFPS: number;
  
  /** 最大 FPS */
  maxFPS: number;
  
  /** 内存使用（字节） */
  heapSize: number;
  usedHeapSize: number;
  heapLimit: number;
  
  /** 渲染统计 */
  trianglesRendered: number;
  drawCalls: number;
  cesiumActiveObjects: number;
  threeActiveObjects: number;
  
  /** 自定义域指标（平均值，毫秒） */
  celestialCalculationTime: number;
  cesiumTileLoadTime: number;
  ephemerisParseTime: number;
  modLoadTime: number;
  
  /** Web Vitals */
  webVitals: WebVitalsMetrics;
  
  /** 时间戳 */
  timestamp: number;
  
  /** 自定义测量 */
  customMetrics: Map<string, number>;

  /** 插值时间（毫秒） */
  interpolationTime: number;

  /** 卫星数量 */
  satelliteCount: number;

  /** 可见卫星数量 */
  visibleSatelliteCount: number;

  /** GPU 上传时间（毫秒） */
  gpuUploadTime: number;

  /** SGP4 计算时间（毫秒） */
  sgp4CalculationTime: number;
}

/**
 * 存储的性能数据条目
 */
interface StoredMetricsEntry {
  timestamp: number;
  metrics: Omit<PerformanceMetrics, 'customMetrics'> & {
    customMetrics: Record<string, number>;
  };
}

/**
 * 性能监控器类（单例模式，增强版）
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  
  // FPS 相关
  private fps: number = 60;
  private frameTime: number = 16.67; // 默认60fps对应的帧时间
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fpsHistory: number[] = [];
  private readonly FPS_HISTORY_SIZE = 60; // 保留最近60帧的记录
  
  // 内存相关
  private memoryCheckInterval: number | null = null;
  private readonly MEMORY_CHECK_INTERVAL = 1000; // 每秒检查一次
  
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
  
  // Web Vitals
  private webVitals: WebVitalsMetrics = {};
  
  // 性能标记
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();
  
  // 监控状态
  private isMonitoring: boolean = false;
  private isProduction: boolean;
  private samplingInterval: number;
  private rafId: number | null = null;
  
  // localStorage 持久化
  private readonly STORAGE_KEY = 'opic_performance_metrics';
  private readonly RETENTION_DAYS = 7;
  private readonly MAX_STORAGE_MB = 10;
  private metricsHistory: StoredMetricsEntry[] = [];
  
  // 回调函数
  private metricsCallbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    this.lastFrameTime = performance.now();
    this.isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
    
    // 生产环境10%采样率（10秒间隔），开发环境100%采样率（1秒间隔）
    this.samplingInterval = this.isProduction ? 10000 : 1000;
    
    // 加载历史数据并清理过期数据
    this.loadMetricsFromStorage();
    this.cleanOldMetrics();
    
    // 初始化 Web Vitals（如果可用）
    this.initWebVitals();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始监控
   */
  public start(): void {
    if (this.isMonitoring) {
      console.warn('PerformanceMonitor 已经在运行中');
      return;
    }

    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.fpsHistory = [];
    
    // 开始 FPS 监控循环
    this.monitorFrame();
    
    // 开始内存监控
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      this.memoryCheckInterval = window.setInterval(() => {
        this.notifyCallbacks();
      }, this.MEMORY_CHECK_INTERVAL);
    }
    
    logger.debug('PerformanceMonitor 已启动');
  }

  /**
   * 停止监控
   */
  public stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    // 停止 FPS 监控
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // 停止内存监控
    if (this.memoryCheckInterval !== null) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    logger.debug('PerformanceMonitor 已停止');
  }

  /**
   * 监控帧（requestAnimationFrame 循环）
   */
  private monitorFrame = (): void => {
    if (!this.isMonitoring) {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    // 计算 FPS（每帧）
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.fps = currentFPS;
      this.frameTime = deltaTime;
      
      // 记录到历史
      this.fpsHistory.push(currentFPS);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
    }
    
    this.frameCount++;
    this.lastFrameTime = currentTime;
    
    // 继续下一帧
    this.rafId = requestAnimationFrame(this.monitorFrame);
  };

  /**
   * 标记帧开始（用于外部手动调用）
   * 
   * 在渲染循环开始时调用此方法来手动追踪帧性能。
   * 与自动FPS监控不同，这允许更精细的控制。
   */
  public beginFrame(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.fps = currentFPS;
      this.frameTime = deltaTime;
      
      // 记录到历史
      this.fpsHistory.push(currentFPS);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
    }
    
    this.frameCount++;
    this.lastFrameTime = currentTime;
  }

  /**
   * 初始化 Web Vitals 集成
   */
  private async initWebVitals(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // 动态导入 @vercel/analytics 的 web-vitals
      const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
      
      onCLS((metric) => {
        this.webVitals.CLS = metric.value;
      });
      
      onFCP((metric) => {
        this.webVitals.FCP = metric.value;
      });
      
      onINP((metric) => {
        this.webVitals.INP = metric.value;
      });
      
      onLCP((metric) => {
        this.webVitals.LCP = metric.value;
      });
      
      onTTFB((metric) => {
        this.webVitals.TTFB = metric.value;
      });
    } catch (error) {
      console.warn('Web Vitals 初始化失败:', error);
    }
  }

  /**
   * 加载历史指标数据
   */
  private loadMetricsFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metricsHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('加载性能指标失败:', error);
      this.metricsHistory = [];
    }
  }

  /**
   * 保存指标到 localStorage
   */
  private saveMetricsToStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      // 检查存储大小
      const dataStr = JSON.stringify(this.metricsHistory);
      const sizeInMB = new Blob([dataStr]).size / (1024 * 1024);
      
      // 如果超过10MB，删除最旧的数据直到低于限制
      while (sizeInMB > this.MAX_STORAGE_MB && this.metricsHistory.length > 0) {
        this.metricsHistory.shift();
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metricsHistory));
    } catch (error) {
      console.error('保存性能指标失败:', error);
      
      // 如果存储失败（可能是配额问题），清理一半数据重试
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.metricsHistory = this.metricsHistory.slice(Math.floor(this.metricsHistory.length / 2));
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metricsHistory));
        } catch (retryError) {
          console.error('重试保存性能指标失败:', retryError);
        }
      }
    }
  }

  /**
   * 清理过期的指标数据（超过7天）
   */
  private cleanOldMetrics(): void {
    const cutoffTime = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
    this.saveMetricsToStorage();
  }

  /**
   * 获取内存使用情况（字节）
   */
  public getMemoryUsage(): { heapSize: number; usedHeapSize: number; heapLimit: number } {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return { heapSize: 0, usedHeapSize: 0, heapLimit: 0 };
    }

    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
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

  /**
   * 计算滚动平均值
   */
  private calculateRollingAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * 记录天体计算时间
   */
  public recordCelestialCalculationTime(timeMs: number): void {
    this.celestialCalculationTimes.push(timeMs);
    if (this.celestialCalculationTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.celestialCalculationTimes.shift();
    }
  }

  /**
   * 记录 Cesium 瓦片加载时间
   */
  public recordTileLoadTime(timeMs: number): void {
    this.cesiumTileLoadTimes.push(timeMs);
    if (this.cesiumTileLoadTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.cesiumTileLoadTimes.shift();
    }
  }

  /**
   * 记录星历数据解析时间
   */
  public recordEphemerisParseTime(timeMs: number): void {
    this.ephemerisParseTimes.push(timeMs);
    if (this.ephemerisParseTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.ephemerisParseTimes.shift();
    }
  }

  /**
   * 记录 MOD 加载时间
   */
  public recordModLoadTime(timeMs: number): void {
    this.modLoadTimes.push(timeMs);
    if (this.modLoadTimes.length > this.DOMAIN_METRICS_SAMPLE_SIZE) {
      this.modLoadTimes.shift();
    }
  }

  /**
   * 记录插值计算时间
   */
  public recordInterpolation(timeMs: number): void {
    this.recordMetric('interpolation', timeMs);
  }

  /**
   * 记录 GPU 上传时间
   */
  public recordGPUUpload(timeMs: number): void {
    this.recordMetric('gpuUpload', timeMs);
  }

  /**
   * 记录 SGP4 计算时间
   */
  public recordSGP4Calculation(timeMs: number): void {
    this.recordMetric('sgp4Calculation', timeMs);
  }

  /**
   * 记录 Cesium 渲染时间
   */
  public recordCesiumRenderTime(timeMs: number): void {
    this.recordTileLoadTime(timeMs); // Reuse tile load time tracking
  }

  /**
   * 标记帧结束
   */
  public endFrame(): void {
    // 可以在这里添加帧结束时的逻辑，例如通知订阅者
    // 当前实现为空，保持向后兼容
  }

  /**
   * 设置卫星总数
   */
  public setSatelliteCount(count: number): void {
    this.recordMetric('satelliteCount', count);
  }

  /**
   * 设置可见卫星数量
   */
  public setVisibleSatelliteCount(count: number): void {
    this.recordMetric('visibleSatelliteCount', count);
  }

  /**
   * 设置渲染统计
   */
  public setRenderStats(stats: {
    trianglesRendered?: number;
    drawCalls?: number;
    cesiumActiveObjects?: number;
    threeActiveObjects?: number;
  }): void {
    if (stats.trianglesRendered !== undefined) {
      this.trianglesRendered = stats.trianglesRendered;
    }
    if (stats.drawCalls !== undefined) {
      this.drawCalls = stats.drawCalls;
    }
    if (stats.cesiumActiveObjects !== undefined) {
      this.cesiumActiveObjects = stats.cesiumActiveObjects;
    }
    if (stats.threeActiveObjects !== undefined) {
      this.threeActiveObjects = stats.threeActiveObjects;
    }
  }

  /**
   * 获取当前 FPS
   */
  public getCurrentFPS(): number {
    return Math.round(this.fps);
  }

  /**
   * 获取平均 FPS
   */
  public getAverageFPS(): number {
    if (this.fpsHistory.length === 0) {
      return 0;
    }
    
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  /**
   * 获取最小/最大 FPS
   */
  public getMinMaxFPS(): { min: number; max: number } {
    if (this.fpsHistory.length === 0) {
      return { min: 0, max: 0 };
    }
    
    return {
      min: Math.round(Math.min(...this.fpsHistory)),
      max: Math.round(Math.max(...this.fpsHistory)),
    };
  }

  /**
   * 添加性能标记
   * 
   * @param name - 标记名称
   */
  public mark(name: string): void {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    
    // 也使用原生 Performance API
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        performance.mark(name);
      } catch (e) {
        // 某些浏览器可能不支持
      }
    }
  }

  /**
   * 测量两个标记之间的时间
   * 
   * @param name - 测量名称
   * @param startMark - 开始标记
   * @param endMark - 结束标记
   * @returns 时间差（毫秒）
   */
  public measure(name: string, startMark: string, endMark: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = this.marks.get(endMark);
    
    if (startTime === undefined || endTime === undefined) {
      console.warn(`标记 ${startMark} 或 ${endMark} 不存在`);
      return 0;
    }
    
    const duration = endTime - startTime;
    this.measures.set(name, duration);
    
    // 也使用原生 Performance API
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        // 某些浏览器可能不支持
      }
    }
    
    return duration;
  }

  /**
   * 获取测量结果
   */
  public getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  /**
   * 获取所有测量结果
   */
  public getAllMeasures(): Map<string, number> {
    return new Map(this.measures);
  }

  /**
   * 清除所有标记和测量
   */
  public clearMarks(): void {
    this.marks.clear();
    this.measures.clear();
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        performance.clearMarks();
        performance.clearMeasures();
      } catch (e) {
        // 某些浏览器可能不支持
      }
    }
  }

  /**
   * 获取完整的性能指标
   */
  public getMetrics(): PerformanceMetrics {
    const { min, max } = this.getMinMaxFPS();
    const memory = this.getMemoryUsage();
    
    return {
      fps: this.getCurrentFPS(),
      frameTime: this.frameTime,
      avgFPS: this.getAverageFPS(),
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
      webVitals: { ...this.webVitals },
      timestamp: Date.now(),
      customMetrics: this.getAllMeasures(),
      // 添加从 customMetrics 中提取的常用字段，提供向后兼容
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

  /**
   * 获取指定时间范围内的历史指标
   * @param durationMs 时间范围（毫秒），默认返回所有数据
   */
  public getMetricsHistory(durationMs?: number): StoredMetricsEntry[] {
    if (!durationMs) {
      return [...this.metricsHistory];
    }
    
    const cutoffTime = Date.now() - durationMs;
    return this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * 导出性能指标为 JSON 格式
   */
  public exportMetrics(): string {
    try {
      const currentMetrics = this.getMetrics();
      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        currentMetrics,
        history: this.metricsHistory,
        environment: {
          isProduction: this.isProduction,
          samplingInterval: this.samplingInterval,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
      };
      
      return JSON.stringify(exportData, (_key, value) => {
        // Convert Map to object for JSON serialization
        if (value instanceof Map) {
          return Object.fromEntries(value);
        }
        return value;
      }, 2);
    } catch (error) {
      console.error('导出性能指标失败:', error);
      return JSON.stringify({ error: 'Export failed', message: String(error) });
    }
  }

  /**
   * 清除指定天数之前的旧指标数据
   */
  public clearOldMetrics(retentionDays: number): void {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
    this.saveMetricsToStorage();
  }

  /**
   * 订阅性能指标更新
   * 
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  public subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    
    return () => {
      this.metricsCallbacks.delete(callback);
    };
  }

  /**
   * 通知所有订阅者
   */
  private notifyCallbacks(): void {
    const metrics = this.getMetrics();
    
    // 保存当前指标到历史记录
    const { customMetrics, ...metricsWithoutMap } = metrics;
    this.metricsHistory.push({
      timestamp: metrics.timestamp,
      metrics: {
        ...metricsWithoutMap,
        customMetrics: Object.fromEntries(customMetrics),
      },
    });
    
    // 定期保存到 localStorage
    this.saveMetricsToStorage();
    
    this.metricsCallbacks.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('性能监控回调执行失败:', error);
      }
    });
  }

  /**
   * 记录自定义指标
   * 
   * @param name - 指标名称
   * @param value - 指标值
   */
  public recordMetric(name: string, value: number): void {
    this.measures.set(name, value);
  }

  /**
   * 获取性能报告（用于日志或上报）
   */
  public getPerformanceReport(): string {
    const metrics = this.getMetrics();
    
    return `
性能报告
========
FPS: ${metrics.fps} (平均: ${metrics.avgFPS}, 最小: ${metrics.minFPS}, 最大: ${metrics.maxFPS})
帧时间: ${metrics.frameTime.toFixed(2)}ms
内存: ${(metrics.usedHeapSize / 1048576).toFixed(2)}MB / ${(metrics.heapSize / 1048576).toFixed(2)}MB (限制: ${(metrics.heapLimit / 1048576).toFixed(2)}MB)
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

  /**
   * 重置所有性能指标（用于清理/销毁场景）
   */
  public reset(): void {
    this.fpsHistory = [];
    this.celestialCalculationTimes = [];
    this.cesiumTileLoadTimes = [];
    this.ephemerisParseTimes = [];
    this.modLoadTimes = [];
    this.marks.clear();
    this.measures.clear();
    this.metricsCallbacks.clear();
    this.metricsHistory = [];
    this.webVitals = {};
    this.fps = 0;
    this.frameTime = 0;
    this.trianglesRendered = 0;
    this.drawCalls = 0;
    this.cesiumActiveObjects = 0;
    this.threeActiveObjects = 0;
  }
}

/**
 * 导出单例实例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * 便捷函数：开始监控
 */
export const startPerformanceMonitoring = (): void => {
  performanceMonitor.start();
};

/**
 * 便捷函数：停止监控
 */
export const stopPerformanceMonitoring = (): void => {
  performanceMonitor.stop();
};

/**
 * 便捷函数：获取性能指标
 */
export const getPerformanceMetrics = (): PerformanceMetrics => {
  return performanceMonitor.getMetrics();
};

/**
 * 便捷函数：导出性能指标
 */
export const exportPerformanceMetrics = (): string => {
  return performanceMonitor.exportMetrics();
};
