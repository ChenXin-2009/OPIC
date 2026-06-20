import { QualityController, QualityLevel } from '../QualityController';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { PERFORMANCE_CONFIG } from '../performanceConfig';

jest.mock('../PerformanceMonitor');

function createMockMonitor(fps: number): jest.Mocked<PerformanceMonitor> {
  const mock = {
    getAverageFPS: jest.fn().mockReturnValue(fps),
    getMetrics: jest.fn().mockReturnValue({
      fps, frameTime: 16.67, avgFPS: fps, minFPS: fps, maxFPS: fps,
      heapSize: 0, usedHeapSize: 0, heapLimit: 0,
      trianglesRendered: 0, drawCalls: 0, cesiumActiveObjects: 0, threeActiveObjects: 0,
      celestialCalculationTime: 0, cesiumTileLoadTime: 0, ephemerisParseTime: 0, modLoadTime: 0,
      webVitals: {}, timestamp: Date.now(), customMetrics: new Map(),
      interpolationTime: 0, satelliteCount: 0, visibleSatelliteCount: 0,
      gpuUploadTime: 0, sgp4CalculationTime: 0,
    }),
  } as unknown as jest.Mocked<PerformanceMonitor>;
  return mock;
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('QualityController', () => {
  describe('constructor', () => {
    it('should initialize with medium quality', () => {
      const controller = new QualityController(createMockMonitor(60));
      expect(controller.getQualityLevel()).toBe(QualityLevel.MEDIUM);
    });

    it('should initialize with default settings', () => {
      const controller = new QualityController(createMockMonitor(60));
      const settings = controller.getSettings();
      expect(settings.updateInterval).toBe(PERFORMANCE_CONFIG.DEFAULT_UPDATE_INTERVAL);
      expect(settings.interpolationMethod).toBe(PERFORMANCE_CONFIG.DEFAULT_INTERPOLATION);
      expect(settings.maxSatellites).toBe(100000);
      expect(settings.enableBoundingSphere).toBe(true);
    });
  });

  describe('adjustQuality', () => {
    it('should not adjust during cooldown period', () => {
      const controller = new QualityController(createMockMonitor(20));
      controller.adjustQuality();
      Date.now = jest.fn().mockReturnValue(1000 + 100);
      controller.adjustQuality();
      expect(controller.getQualityLevel()).toBe(QualityLevel.MEDIUM);
    });

    it('should decrease quality when FPS is low for sustained duration', () => {
      const controller = new QualityController(createMockMonitor(20));
      controller.setAdjustmentCooldown(0);
      const lowDuration = PERFORMANCE_CONFIG.LOW_FPS_DURATION;

      Date.now = jest.fn().mockReturnValue(1000);
      controller.adjustQuality();
      Date.now = jest.fn().mockReturnValue(1000 + lowDuration + 1);
      controller.adjustQuality();
      expect(controller.getQualityLevel()).toBe(QualityLevel.LOW);
    });

    it('should increase quality when FPS is high for sustained duration', () => {
      const controller = new QualityController(createMockMonitor(70));
      controller.setAdjustmentCooldown(0);
      controller.setQualityLevel(QualityLevel.LOW);

      const highDuration = PERFORMANCE_CONFIG.HIGH_FPS_DURATION;
      Date.now = jest.fn().mockReturnValue(1000);
      controller.adjustQuality();
      Date.now = jest.fn().mockReturnValue(1000 + highDuration + 1);
      controller.adjustQuality();
      expect(controller.getQualityLevel()).toBe(QualityLevel.MEDIUM);
    });

    it('should not adjust if low FPS duration not met', () => {
      const controller = new QualityController(createMockMonitor(20));
      controller.setAdjustmentCooldown(0);

      Date.now = jest.fn().mockReturnValue(1000);
      controller.adjustQuality();
      Date.now = jest.fn().mockReturnValue(1000 + 100);
      controller.adjustQuality();
      expect(controller.getQualityLevel()).toBe(QualityLevel.MEDIUM);
    });

    it('should reset low FPS timer when FPS recovers', () => {
      const monitor = createMockMonitor(20);
      const controller = new QualityController(monitor);
      controller.setAdjustmentCooldown(0);

      Date.now = jest.fn().mockReturnValue(1000);
      controller.adjustQuality();

      monitor.getAverageFPS.mockReturnValue(60);
      Date.now = jest.fn().mockReturnValue(1000 + 100);
      controller.adjustQuality();

      Date.now = jest.fn().mockReturnValue(1000 + 100 + PERFORMANCE_CONFIG.LOW_FPS_DURATION + 1);
      controller.adjustQuality();
      expect(controller.getQualityLevel()).toBe(QualityLevel.MEDIUM);
    });
  });

  describe('getSettings / setSettings', () => {
    it('should return a copy of settings', () => {
      const controller = new QualityController(createMockMonitor(60));
      const settings1 = controller.getSettings();
      const settings2 = controller.getSettings();
      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2);
    });

    it('should merge partial settings', () => {
      const controller = new QualityController(createMockMonitor(60));
      controller.setSettings({ updateInterval: 5000 });
      const settings = controller.getSettings();
      expect(settings.updateInterval).toBe(5000);
      expect(settings.maxSatellites).toBe(100000);
    });
  });

  describe('setQualityLevel', () => {
    it('should set LOW quality with correct settings', () => {
      const controller = new QualityController(createMockMonitor(60));
      controller.setQualityLevel(QualityLevel.LOW);
      expect(controller.getQualityLevel()).toBe(QualityLevel.LOW);
      expect(controller.getSettings().updateInterval).toBe(4000);
      expect(controller.getSettings().positionThreshold).toBe(0.0002);
    });

    it('should set MEDIUM quality with correct settings', () => {
      const controller = new QualityController(createMockMonitor(60));
      controller.setQualityLevel(QualityLevel.LOW);
      controller.setQualityLevel(QualityLevel.MEDIUM);
      expect(controller.getQualityLevel()).toBe(QualityLevel.MEDIUM);
      expect(controller.getSettings().updateInterval).toBe(2000);
      expect(controller.getSettings().positionThreshold).toBe(0.0001);
    });

    it('should set HIGH quality with correct settings', () => {
      const controller = new QualityController(createMockMonitor(60));
      controller.setQualityLevel(QualityLevel.HIGH);
      expect(controller.getQualityLevel()).toBe(QualityLevel.HIGH);
      expect(controller.getSettings().updateInterval).toBe(1000);
    });
  });

  describe('isAtLowestQuality / isAtHighestQuality', () => {
    it('should correctly identify lowest quality', () => {
      const controller = new QualityController(createMockMonitor(60));
      expect(controller.isAtLowestQuality()).toBe(false);
      controller.setQualityLevel(QualityLevel.LOW);
      expect(controller.isAtLowestQuality()).toBe(true);
    });

    it('should correctly identify highest quality', () => {
      const controller = new QualityController(createMockMonitor(60));
      expect(controller.isAtHighestQuality()).toBe(false);
      controller.setQualityLevel(QualityLevel.HIGH);
      expect(controller.isAtHighestQuality()).toBe(true);
    });
  });

  describe('setFpsThresholds / getFpsThresholds', () => {
    it('should set and get fps thresholds', () => {
      const controller = new QualityController(createMockMonitor(60));
      controller.setFpsThresholds(25, 50);
      const thresholds = controller.getFpsThresholds();
      expect(thresholds.low).toBe(25);
      expect(thresholds.high).toBe(50);
    });

    it('should return a copy of thresholds', () => {
      const controller = new QualityController(createMockMonitor(60));
      const t1 = controller.getFpsThresholds();
      const t2 = controller.getFpsThresholds();
      expect(t1).toEqual(t2);
      expect(t1).not.toBe(t2);
    });
  });

  describe('setAdjustmentCooldown / getAdjustmentCooldown', () => {
    it('should set and get cooldown', () => {
      const controller = new QualityController(createMockMonitor(60));
      controller.setAdjustmentCooldown(10000);
      expect(controller.getAdjustmentCooldown()).toBe(10000);
    });
  });

  describe('reset', () => {
    it('should reset to medium quality and default settings', () => {
      const controller = new QualityController(createMockMonitor(60));
      controller.setQualityLevel(QualityLevel.HIGH);
      controller.setSettings({ updateInterval: 9999 });
      controller.reset();
      expect(controller.getQualityLevel()).toBe(QualityLevel.MEDIUM);
      expect(controller.getSettings().updateInterval).toBe(PERFORMANCE_CONFIG.DEFAULT_UPDATE_INTERVAL);
    });
  });

  describe('decreaseQuality edge cases', () => {
    it('should not decrease below LOW', () => {
      const controller = new QualityController(createMockMonitor(20));
      controller.setAdjustmentCooldown(0);
      controller.setQualityLevel(QualityLevel.LOW);

      Date.now = jest.fn().mockReturnValue(1000);
      controller.adjustQuality();
      Date.now = jest.fn().mockReturnValue(1000 + PERFORMANCE_CONFIG.LOW_FPS_DURATION + 1);
      controller.adjustQuality();
      expect(controller.getQualityLevel()).toBe(QualityLevel.LOW);
    });
  });

  describe('increaseQuality edge cases', () => {
    it('should not increase above HIGH', () => {
      const controller = new QualityController(createMockMonitor(70));
      controller.setAdjustmentCooldown(0);
      controller.setQualityLevel(QualityLevel.HIGH);

      Date.now = jest.fn().mockReturnValue(1000);
      controller.adjustQuality();
      Date.now = jest.fn().mockReturnValue(1000 + PERFORMANCE_CONFIG.HIGH_FPS_DURATION + 1);
      controller.adjustQuality();
      expect(controller.getQualityLevel()).toBe(QualityLevel.HIGH);
    });
  });
});
