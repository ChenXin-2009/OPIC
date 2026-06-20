import { PerformanceMonitor, resetPerformanceMonitor } from '../PerformanceMonitor';
import { resetEventBus, getEventBus } from '../../core/EventBus';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    resetPerformanceMonitor();
    resetEventBus();
    monitor = new PerformanceMonitor();
  });

  describe('record', () => {
    it('should record a metric', () => {
      monitor.record('mod-1', 'init', 500);

      const metrics = monitor.getMetrics('mod-1');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        modId: 'mod-1',
        type: 'init',
        duration: 500,
      });
    });

    it('should emit warning when duration exceeds threshold', () => {
      const eventBus = getEventBus();
      const warningHandler = jest.fn();
      eventBus.on('performance:warning', warningHandler);

      monitor.record('mod-1', 'init', 2000);

      expect(warningHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          modId: 'mod-1',
          type: 'init',
          duration: 2000,
          threshold: 1000,
        })
      );
    });

    it('should not emit warning when under threshold', () => {
      const eventBus = getEventBus();
      const warningHandler = jest.fn();
      eventBus.on('performance:warning', warningHandler);

      monitor.record('mod-1', 'render', 10);

      expect(warningHandler).not.toHaveBeenCalled();
    });

    it('should cap metrics at maxMetrics', () => {
      for (let i = 0; i < 1001; i++) {
        monitor.record('mod-1', 'render', 10);
      }

      expect(monitor.getMetrics()).toHaveLength(1000);
    });
  });

  describe('startTimer / endTimer', () => {
    it('should measure duration', () => {
      const startTime = monitor.startTimer();
      const duration = monitor.endTimer('mod-1', 'init', startTime);

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(monitor.getMetrics('mod-1')).toHaveLength(1);
    });
  });

  describe('getMetrics', () => {
    it('should return all metrics when no modId', () => {
      monitor.record('mod-1', 'init', 100);
      monitor.record('mod-2', 'render', 50);

      expect(monitor.getMetrics()).toHaveLength(2);
    });

    it('should filter by modId', () => {
      monitor.record('mod-1', 'init', 100);
      monitor.record('mod-2', 'render', 50);

      expect(monitor.getMetrics('mod-1')).toHaveLength(1);
    });
  });

  describe('getAveragePerformance', () => {
    it('should return 0 for no metrics', () => {
      expect(monitor.getAveragePerformance('mod-1')).toBe(0);
    });

    it('should calculate average for a mod', () => {
      monitor.record('mod-1', 'init', 100);
      monitor.record('mod-1', 'init', 200);

      expect(monitor.getAveragePerformance('mod-1', 'init')).toBe(150);
    });

    it('should filter by type', () => {
      monitor.record('mod-1', 'init', 100);
      monitor.record('mod-1', 'render', 50);

      expect(monitor.getAveragePerformance('mod-1', 'init')).toBe(100);
      expect(monitor.getAveragePerformance('mod-1', 'render')).toBe(50);
    });
  });

  describe('getWarnings', () => {
    it('should return metrics exceeding threshold', () => {
      monitor.record('mod-1', 'init', 2000);
      monitor.record('mod-1', 'render', 10);

      const warnings = monitor.getWarnings('mod-1');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('init');
    });

    it('should return all warnings when no modId', () => {
      monitor.record('mod-1', 'init', 2000);
      monitor.record('mod-2', 'init', 2000);

      expect(monitor.getWarnings()).toHaveLength(2);
    });
  });

  describe('setThreshold / getThreshold', () => {
    it('should set and get threshold', () => {
      monitor.setThreshold('render', 32);
      expect(monitor.getThreshold('render')).toBe(32);
    });

    it('should return default threshold for unknown type', () => {
      expect(monitor.getThreshold('init')).toBe(1000);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      monitor.record('mod-1', 'init', 100);
      monitor.record('mod-2', 'render', 50);

      monitor.clearMetrics();
      expect(monitor.getMetrics()).toHaveLength(0);
    });

    it('should clear metrics for a specific mod', () => {
      monitor.record('mod-1', 'init', 100);
      monitor.record('mod-2', 'render', 50);

      monitor.clearMetrics('mod-1');
      expect(monitor.getMetrics()).toHaveLength(1);
      expect(monitor.getMetrics('mod-2')).toHaveLength(1);
    });
  });

  describe('getSummary', () => {
    it('should return correct summary', () => {
      monitor.record('mod-1', 'init', 500);
      monitor.record('mod-1', 'init', 1500);
      monitor.record('mod-1', 'render', 10);

      const summary = monitor.getSummary('mod-1');
      expect(summary).toEqual({
        initCount: 2,
        renderCount: 1,
        avgInitTime: 1000,
        avgRenderTime: 10,
        warningCount: 1,
      });
    });
  });
});

describe('getPerformanceMonitor', () => {
  beforeEach(() => {
    resetPerformanceMonitor();
  });

  it('should return a singleton instance', () => {
    const { getPerformanceMonitor } = require('../PerformanceMonitor');
    const a = getPerformanceMonitor();
    const b = getPerformanceMonitor();
    expect(a).toBe(b);
  });
});
