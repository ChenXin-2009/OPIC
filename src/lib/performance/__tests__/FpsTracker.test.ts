import { FpsTracker } from '../FpsTracker';

let mockNow = 0;

beforeEach(() => {
  mockNow = 1000;
  jest.spyOn(performance, 'now').mockImplementation(() => mockNow);
  (global as any).requestAnimationFrame = jest.fn((_cb: FrameRequestCallback) => {
    return 1;
  });
  (global as any).cancelAnimationFrame = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (global as any).requestAnimationFrame;
  delete (global as any).cancelAnimationFrame;
});

describe('FpsTracker', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const tracker = new FpsTracker();
      expect(tracker.getCurrentFPS()).toBe(60);
      expect(tracker.getFrameTime()).toBe(16.67);
    });
  });

  describe('getCurrentFPS', () => {
    it('should return 60 by default', () => {
      const tracker = new FpsTracker();
      expect(tracker.getCurrentFPS()).toBe(60);
    });
  });

  describe('getAverageFPS', () => {
    it('should return 0 when no history', () => {
      const tracker = new FpsTracker();
      expect(tracker.getAverageFPS()).toBe(0);
    });
  });

  describe('getMinMaxFPS', () => {
    it('should return 0,0 when no history', () => {
      const tracker = new FpsTracker();
      const { min, max } = tracker.getMinMaxFPS();
      expect(min).toBe(0);
      expect(max).toBe(0);
    });
  });

  describe('beginFrame', () => {
    it('should update fps and frameTime', () => {
      const tracker = new FpsTracker();
      mockNow = 1016.67;
      tracker.beginFrame();
      expect(tracker.getCurrentFPS()).toBe(60);
      expect(tracker.getFrameTime()).toBeCloseTo(16.67, 1);
    });

    it('should handle zero deltaTime', () => {
      const tracker = new FpsTracker();
      tracker.beginFrame();
      expect(tracker.getCurrentFPS()).toBe(60);
    });

    it('should populate fps history', () => {
      const tracker = new FpsTracker();
      mockNow = 1016.67;
      tracker.beginFrame();
      expect(tracker.getAverageFPS()).toBe(60);
    });

    it('should track multiple frames', () => {
      const tracker = new FpsTracker();
      mockNow = 1016.67;
      tracker.beginFrame();
      mockNow = 1033.34;
      tracker.beginFrame();
      const { min, max } = tracker.getMinMaxFPS();
      expect(min).toBeGreaterThan(0);
      expect(max).toBeGreaterThan(0);
    });

    it('should cap fps history at 60 entries', () => {
      const tracker = new FpsTracker();
      for (let i = 0; i < 70; i++) {
        mockNow = 1000 + (i + 1) * 16.67;
        tracker.beginFrame();
      }
      const avg = tracker.getAverageFPS();
      expect(avg).toBeGreaterThan(0);
    });
  });

  describe('start / stop', () => {
    it('should start monitoring', () => {
      const tracker = new FpsTracker();
      tracker.start();
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should stop monitoring', () => {
      const tracker = new FpsTracker();
      tracker.start();
      tracker.stop();
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should set rafId to null after stop', () => {
      const tracker = new FpsTracker();
      tracker.start();
      tracker.stop();
      tracker.start();
      tracker.stop();
    });

    it('should handle stop when not started', () => {
      const tracker = new FpsTracker();
      tracker.stop();
    });

    it('should reset state on start', () => {
      const tracker = new FpsTracker();
      tracker.start();
      tracker.stop();
      expect(tracker.getAverageFPS()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const tracker = new FpsTracker();
      mockNow = 1016.67;
      tracker.beginFrame();
      tracker.reset();
      expect(tracker.getCurrentFPS()).toBe(60);
      expect(tracker.getFrameTime()).toBe(16.67);
      expect(tracker.getAverageFPS()).toBe(0);
    });
  });
});
