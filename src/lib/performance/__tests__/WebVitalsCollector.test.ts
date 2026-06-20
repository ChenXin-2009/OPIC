import { WebVitalsCollector } from '../WebVitalsCollector';

let mockCallbacks: Record<string, Function> = {};

jest.mock('web-vitals', () => ({
  onCLS: jest.fn((cb: Function) => { mockCallbacks.CLS = cb; }),
  onFCP: jest.fn((cb: Function) => { mockCallbacks.FCP = cb; }),
  onINP: jest.fn((cb: Function) => { mockCallbacks.INP = cb; }),
  onLCP: jest.fn((cb: Function) => { mockCallbacks.LCP = cb; }),
  onTTFB: jest.fn((cb: Function) => { mockCallbacks.TTFB = cb; }),
}));

beforeEach(() => {
  mockCallbacks = {};
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('WebVitalsCollector', () => {
  describe('constructor', () => {
    it('should initialize with empty metrics', () => {
      const collector = new WebVitalsCollector();
      expect(collector.getMetrics()).toEqual({});
    });
  });

  describe('getMetrics', () => {
    it('should return a copy of metrics', () => {
      const collector = new WebVitalsCollector();
      const m1 = collector.getMetrics();
      const m2 = collector.getMetrics();
      expect(m1).toEqual(m2);
      expect(m1).not.toBe(m2);
    });
  });

  describe('initialize', () => {
    it('should do nothing on server side (no window)', async () => {
      const originalWindow = (global as any).window;
      delete (global as any).window;
      const collector = new WebVitalsCollector();
      await collector.initialize();
      expect(collector.getMetrics()).toEqual({});
      (global as any).window = originalWindow;
    });

    it('should register all web-vitals callbacks', async () => {
      const collector = new WebVitalsCollector();
      await collector.initialize();

      expect(mockCallbacks.CLS).toBeDefined();
      expect(mockCallbacks.FCP).toBeDefined();
      expect(mockCallbacks.INP).toBeDefined();
      expect(mockCallbacks.LCP).toBeDefined();
      expect(mockCallbacks.TTFB).toBeDefined();
    });

    it('should update metrics when callbacks fire', async () => {
      const collector = new WebVitalsCollector();
      await collector.initialize();

      mockCallbacks.CLS({ value: 0.1 });
      mockCallbacks.FCP({ value: 1200 });
      mockCallbacks.INP({ value: 50 });
      mockCallbacks.LCP({ value: 2500 });
      mockCallbacks.TTFB({ value: 100 });

      const metrics = collector.getMetrics();
      expect(metrics.CLS).toBe(0.1);
      expect(metrics.FCP).toBe(1200);
      expect(metrics.INP).toBe(50);
      expect(metrics.LCP).toBe(2500);
      expect(metrics.TTFB).toBe(100);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      const collector = new WebVitalsCollector();
      (collector as any).webVitals = { FCP: 100, LCP: 200 };
      collector.reset();
      expect(collector.getMetrics()).toEqual({});
    });
  });
});
