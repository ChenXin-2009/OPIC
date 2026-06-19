/**
 * 性能监控类型定义 (Performance Types)
 *
 * 定义性能指标、Web Vitals 和自定义度量的 TypeScript 接口。
 */

/** Core Web Vitals 指标 (毫秒或无量纲) */
export interface WebVitalsMetrics {
  /** First Contentful Paint — 首次内容绘制 */
  FCP?: number;
  /** Largest Contentful Paint — 最大内容绘制 */
  LCP?: number;
  /** Interaction to Next Paint — 交互到下次绘制 */
  INP?: number;
  /** Cumulative Layout Shift — 累积布局偏移 (无量纲) */
  CLS?: number;
  /** Time to First Byte — 首字节时间 */
  TTFB?: number;
}

/** 综合性能指标快照 */
export interface PerformanceMetrics {
  /** 当前帧率 */
  fps: number;
  /** 当前帧耗时 (ms) */
  frameTime: number;
  /** 平均帧率（最近 60 帧） */
  avgFPS: number;
  /** 最小帧率 */
  minFPS: number;
  /** 最大帧率 */
  maxFPS: number;
  /** JS 堆总大小 (bytes) */
  heapSize: number;
  /** 已使用堆大小 (bytes) */
  usedHeapSize: number;
  /** 堆大小上限 (bytes) */
  heapLimit: number;
  /** Three.js 渲染三角形数 */
  trianglesRendered: number;
  /** Three.js 绘制调用数 */
  drawCalls: number;
  /** Cesium 活跃对象数 */
  cesiumActiveObjects: number;
  /** Three.js 活跃对象数 */
  threeActiveObjects: number;
  /** 天体位置计算耗时 (ms) */
  celestialCalculationTime: number;
  /** Cesium 瓦片加载耗时 (ms) */
  cesiumTileLoadTime: number;
  /** 星历表数据解析耗时 (ms) */
  ephemerisParseTime: number;
  /** MOD 加载耗时 (ms) */
  modLoadTime: number;
  /** Web Vitals 指标 */
  webVitals: WebVitalsMetrics;
  /** 采集时间戳 */
  timestamp: number;
  /** 自定义性能度量 */
  customMetrics: Map<string, number>;
  /** 位置插值耗时 (ms) */
  interpolationTime: number;
  /** 卫星总数 */
  satelliteCount: number;
  /** 可见卫星数 */
  visibleSatelliteCount: number;
  /** GPU 纹理上传耗时 (ms) */
  gpuUploadTime: number;
  /** SGP4 轨道计算耗时 (ms) */
  sgp4CalculationTime: number;
}
