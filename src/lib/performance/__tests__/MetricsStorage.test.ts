import { MetricsStorage } from '../MetricsStorage';
import type { PerformanceMetrics } from '../performance-types';

const mockStore: Record<string, string> = {};

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => mockStore[key] ?? null),
      setItem: jest.fn((key: string, value: string) => { mockStore[key] = value; }),
      removeItem: jest.fn((key: string) => { delete mockStore[key]; }),
      clear: jest.fn(() => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }),
      get length() { return Object.keys(mockStore).length; },
      key: jest.fn((i: number) => Object.keys(mockStore)[i] ?? null),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function makeMetrics(timestamp: number): PerformanceMetrics {
  return {
    fps: 60,
    frameTime: 16.67,
    avgFPS: 60,
    minFPS: 50,
    maxFPS: 65,
    heapSize: 1000000,
    usedHeapSize: 500000,
    heapLimit: 2000000,
    trianglesRendered: 1000,
    drawCalls: 50,
    cesiumActiveObjects: 10,
    threeActiveObjects: 20,
    celestialCalculationTime: 5,
    cesiumTileLoadTime: 3,
    ephemerisParseTime: 2,
    modLoadTime: 1,
    webVitals: {},
    timestamp,
    customMetrics: new Map([['test', 42]]),
    interpolationTime: 1,
    satelliteCount: 100,
    visibleSatelliteCount: 50,
    gpuUploadTime: 0.5,
    sgp4CalculationTime: 2,
  };
}

describe('MetricsStorage', () => {
  describe('loadFromStorage', () => {
    it('should load metrics from localStorage', () => {
      const data = [{ timestamp: 1000, metrics: { fps: 60, customMetrics: {} } }];
      mockStore['opic_performance_metrics'] = JSON.stringify(data);
      const storage = new MetricsStorage();
      storage.loadFromStorage();
      expect(storage.getHistory()).toHaveLength(1);
    });

    it('should handle empty localStorage', () => {
      const storage = new MetricsStorage();
      storage.loadFromStorage();
      expect(storage.getHistory()).toHaveLength(0);
    });

    it('should handle invalid JSON in localStorage', () => {
      mockStore['opic_performance_metrics'] = 'invalid-json';
      const storage = new MetricsStorage();
      storage.loadFromStorage();
      expect(storage.getHistory()).toHaveLength(0);
    });
  });

  describe('addEntry', () => {
    it('should add an entry to history', () => {
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(1000));
      expect(storage.getHistory()).toHaveLength(1);
    });

    it('should store timestamp from metrics', () => {
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(2000));
      const history = storage.getHistory();
      expect(history[0].timestamp).toBe(2000);
    });

    it('should convert customMetrics Map to plain object', () => {
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(1000));
      const history = storage.getHistory();
      expect(history[0].metrics.customMetrics).toEqual({ test: 42 });
    });
  });

  describe('getHistory', () => {
    it('should return all entries without duration filter', () => {
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(1000));
      storage.addEntry(makeMetrics(2000));
      expect(storage.getHistory()).toHaveLength(2);
    });

    it('should filter by duration', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(now - 100000));
      storage.addEntry(makeMetrics(now - 1000));
      const history = storage.getHistory(5000);
      expect(history).toHaveLength(1);
    });

    it('should return copy of history', () => {
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(1000));
      const h1 = storage.getHistory();
      const h2 = storage.getHistory();
      expect(h1).not.toBe(h2);
    });
  });

  describe('clearOld', () => {
    it('should remove entries older than retention period', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(now - 8 * 24 * 60 * 60 * 1000));
      storage.addEntry(makeMetrics(now - 1000));
      storage.clearOld(7);
      expect(storage.getHistory()).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('should clear all history', () => {
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(1000));
      storage.addEntry(makeMetrics(2000));
      storage.reset();
      expect(storage.getHistory()).toHaveLength(0);
    });
  });

  describe('saveToStorage', () => {
    it('should save to localStorage', () => {
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(1000));
      storage.saveToStorage();
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should handle QuotaExceededError by halving history', () => {
      const storage = new MetricsStorage();
      for (let i = 0; i < 10; i++) {
        storage.addEntry(makeMetrics(i));
      }
      let callCount = 0;
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          const err = new DOMException('quota exceeded', 'QuotaExceededError');
          throw err;
        }
      });
      storage.saveToStorage();
      expect(storage.getHistory().length).toBeLessThanOrEqual(5);
    });
  });

  describe('cleanOldMetrics', () => {
    it('should remove old metrics and save', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const storage = new MetricsStorage();
      storage.addEntry(makeMetrics(now - 8 * 24 * 60 * 60 * 1000));
      storage.addEntry(makeMetrics(now - 1000));
      storage.cleanOldMetrics();
      expect(storage.getHistory()).toHaveLength(1);
    });
  });
});
