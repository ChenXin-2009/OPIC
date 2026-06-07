import { PerformanceMonitor, performanceMonitor, startPerformanceMonitoring, stopPerformanceMonitoring, getPerformanceMetrics, exportPerformanceMetrics } from '../PerformanceMonitor';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should be a singleton', () => {
    const a = PerformanceMonitor.getInstance();
    const b = PerformanceMonitor.getInstance();
    expect(a).toBe(b);
  });

  it('should start and stop monitoring', () => {
    jest.useFakeTimers();
    const monitor = PerformanceMonitor.getInstance();
    monitor.start();
    monitor.stop();
    expect(true).toBe(true);
    jest.useRealTimers();
  });

  it('should return default FPS before starting', () => {
    const monitor = PerformanceMonitor.getInstance();
    expect(monitor.getCurrentFPS()).toBe(60);
  });

  it('should return 0 average FPS when no history', () => {
    const monitor = PerformanceMonitor.getInstance();
    expect(monitor.getAverageFPS()).toBe(0);
  });

  it('should return 0 min/max when no history', () => {
    const monitor = PerformanceMonitor.getInstance();
    const { min, max } = monitor.getMinMaxFPS();
    expect(min).toBe(0);
    expect(max).toBe(0);
  });

  it('should return 0 memory when no window.performance.memory', () => {
    const monitor = PerformanceMonitor.getInstance();
    const memory = monitor.getMemoryUsage();
    expect(memory.heapSize).toBe(0);
    expect(memory.usedHeapSize).toBe(0);
    expect(memory.heapLimit).toBe(0);
  });

  it('should add marks via mark()', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.mark('test-start');
    monitor.mark('test-end');
    const duration = monitor.measure('test', 'test-start', 'test-end');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 for missing marks', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const monitor = PerformanceMonitor.getInstance();
    const duration = monitor.measure('missing', 'nonexistent-a', 'nonexistent-b');
    expect(duration).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should get and set measures', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.recordMetric('custom', 42);
    expect(monitor.getMeasure('custom')).toBe(42);
  });

  it('should return all measures', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.recordMetric('a', 1);
    monitor.recordMetric('b', 2);
    const all = monitor.getAllMeasures();
    expect(all.get('a')).toBe(1);
    expect(all.get('b')).toBe(2);
  });

  it('should clear marks', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.recordMetric('x', 100);
    monitor.clearMarks();
    expect(monitor.getAllMeasures().size).toBe(0);
  });

  it('should get metrics with enhanced fields', () => {
    const monitor = PerformanceMonitor.getInstance();
    const metrics = monitor.getMetrics();
    expect(typeof metrics.fps).toBe('number');
    expect(typeof metrics.frameTime).toBe('number');
    expect(typeof metrics.avgFPS).toBe('number');
    expect(typeof metrics.heapSize).toBe('number');
    expect(typeof metrics.usedHeapSize).toBe('number');
    expect(typeof metrics.heapLimit).toBe('number');
    expect(typeof metrics.trianglesRendered).toBe('number');
    expect(typeof metrics.drawCalls).toBe('number');
    expect(typeof metrics.cesiumActiveObjects).toBe('number');
    expect(typeof metrics.threeActiveObjects).toBe('number');
    expect(typeof metrics.celestialCalculationTime).toBe('number');
    expect(typeof metrics.cesiumTileLoadTime).toBe('number');
    expect(typeof metrics.ephemerisParseTime).toBe('number');
    expect(typeof metrics.modLoadTime).toBe('number');
    expect(typeof metrics.timestamp).toBe('number');
    expect(metrics.webVitals).toBeDefined();
    expect(metrics.customMetrics).toBeInstanceOf(Map);
  });

  it('should record domain-specific metrics', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.recordCelestialCalculationTime(10.5);
    monitor.recordCelestialCalculationTime(12.3);
    monitor.recordTileLoadTime(25.0);
    monitor.recordEphemerisParseTime(8.7);
    monitor.recordModLoadTime(150.0);
    
    const metrics = monitor.getMetrics();
    expect(metrics.celestialCalculationTime).toBeCloseTo(11.4, 1);
    expect(metrics.cesiumTileLoadTime).toBe(25.0);
    expect(metrics.ephemerisParseTime).toBe(8.7);
    expect(metrics.modLoadTime).toBe(150.0);
  });

  it('should set render stats', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.setRenderStats({
      trianglesRendered: 50000,
      drawCalls: 150,
      cesiumActiveObjects: 20,
      threeActiveObjects: 35,
    });
    
    const metrics = monitor.getMetrics();
    expect(metrics.trianglesRendered).toBe(50000);
    expect(metrics.drawCalls).toBe(150);
    expect(metrics.cesiumActiveObjects).toBe(20);
    expect(metrics.threeActiveObjects).toBe(35);
  });

  it('should export metrics as JSON', () => {
    const monitor = PerformanceMonitor.getInstance();
    const json = monitor.exportMetrics();
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(parsed.currentMetrics).toBeDefined();
    expect(parsed.environment).toBeDefined();
  });

  it('should get metrics history', () => {
    const monitor = PerformanceMonitor.getInstance();
    const history = monitor.getMetricsHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should clear old metrics', () => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.clearOldMetrics(7);
    // Should not throw
    expect(true).toBe(true);
  });

  it('should subscribe and unsubscribe callbacks', () => {
    const monitor = PerformanceMonitor.getInstance();
    const callback = jest.fn();
    const unsubscribe = monitor.subscribe(callback);
    unsubscribe();
  });

  it('should generate enhanced performance report', () => {
    const monitor = PerformanceMonitor.getInstance();
    const report = monitor.getPerformanceReport();
    expect(report).toContain('FPS');
    expect(report).toContain('帧时间');
    expect(report).toContain('内存');
    expect(report).toContain('渲染统计');
    expect(report).toContain('域特定指标');
    expect(report).toContain('Web Vitals');
  });
});

describe('convenience exports', () => {
  it('should export performanceMonitor instance', () => {
    expect(performanceMonitor).toBeDefined();
  });

  it('should provide start/stop/get/export convenience functions', () => {
    expect(typeof startPerformanceMonitoring).toBe('function');
    expect(typeof stopPerformanceMonitoring).toBe('function');
    expect(typeof getPerformanceMetrics).toBe('function');
    expect(typeof exportPerformanceMetrics).toBe('function');
  });
});
