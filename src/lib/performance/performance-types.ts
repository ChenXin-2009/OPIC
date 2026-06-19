export interface WebVitalsMetrics {
  FCP?: number;
  LCP?: number;
  INP?: number;
  CLS?: number;
  TTFB?: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  avgFPS: number;
  minFPS: number;
  maxFPS: number;
  heapSize: number;
  usedHeapSize: number;
  heapLimit: number;
  trianglesRendered: number;
  drawCalls: number;
  cesiumActiveObjects: number;
  threeActiveObjects: number;
  celestialCalculationTime: number;
  cesiumTileLoadTime: number;
  ephemerisParseTime: number;
  modLoadTime: number;
  webVitals: WebVitalsMetrics;
  timestamp: number;
  customMetrics: Map<string, number>;
  interpolationTime: number;
  satelliteCount: number;
  visibleSatelliteCount: number;
  gpuUploadTime: number;
  sgp4CalculationTime: number;
}
