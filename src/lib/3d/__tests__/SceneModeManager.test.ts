import { SceneModeManager, SceneMode } from '../SceneModeManager';

describe('SceneModeManager', () => {
  let manager: SceneModeManager;

  beforeEach(() => {
    manager = new SceneModeManager();
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start in THREE_DOMINANT mode', () => {
      expect(manager.getCurrentMode()).toBe(SceneMode.THREE_DOMINANT);
    });

    it('should not be transitioning initially', () => {
      expect(manager.isInTransition()).toBe(false);
    });

    it('should return 1 for transition progress when not transitioning', () => {
      expect(manager.getTransitionProgress()).toBe(1);
    });
  });

  describe('switchMode', () => {
    it('should switch to CESIUM_DOMINANT', () => {
      const result = manager.switchMode(SceneMode.CESIUM_DOMINANT);
      expect(result).toBe(true);
      expect(manager.getCurrentMode()).toBe(SceneMode.CESIUM_DOMINANT);
    });

    it('should return false when switching to same mode', () => {
      const result = manager.switchMode(SceneMode.THREE_DOMINANT);
      expect(result).toBe(false);
    });

    it('should set isTransitioning during transition', () => {
      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      expect(manager.isInTransition()).toBe(true);
    });

    it('should reject switch while transitioning', () => {
      jest.useFakeTimers();
      manager.updateConfig({ transitionDuration: 500 });
      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      const result = manager.switchMode(SceneMode.THREE_DOMINANT);
      expect(result).toBe(false);
      expect(manager.getCurrentMode()).toBe(SceneMode.CESIUM_DOMINANT);
      jest.useRealTimers();
    });
  });

  describe('updateModeByDistance', () => {
    it('should switch to CESIUM when distance < threshold', () => {
      const switched = manager.updateModeByDistance(0.00005);
      expect(switched).toBe(true);
      expect(manager.getCurrentMode()).toBe(SceneMode.CESIUM_DOMINANT);
    });

    it('should not switch when distance > threshold', () => {
      const switched = manager.updateModeByDistance(0.001);
      expect(switched).toBe(false);
      expect(manager.getCurrentMode()).toBe(SceneMode.THREE_DOMINANT);
    });

    it('should switch back to THREE when distance > threeModeThreshold', () => {
      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      jest.advanceTimersByTime(1000);

      const switched = manager.updateModeByDistance(0.001);
      expect(switched).toBe(true);
      expect(manager.getCurrentMode()).toBe(SceneMode.THREE_DOMINANT);
    });

    it('should not switch back when in hysteresis zone', () => {
      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      jest.advanceTimersByTime(1000);

      // Between cesium and three thresholds — should stay in CESIUM
      const switched = manager.updateModeByDistance(0.000085);
      expect(switched).toBe(false);
      expect(manager.getCurrentMode()).toBe(SceneMode.CESIUM_DOMINANT);
    });

    it('should return false when autoSwitch is disabled', () => {
      manager.updateConfig({ autoSwitch: false });
      const switched = manager.updateModeByDistance(0.00005);
      expect(switched).toBe(false);
      expect(manager.getCurrentMode()).toBe(SceneMode.THREE_DOMINANT);
    });
  });

  describe('onModeChange', () => {
    it('should call callback on mode change', () => {
      const callback = jest.fn();
      manager.onModeChange(callback);

      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      expect(callback).toHaveBeenCalledWith(SceneMode.CESIUM_DOMINANT);
    });

    it('should unsubscribe correctly', () => {
      const callback = jest.fn();
      const unsubscribe = manager.onModeChange(callback);

      unsubscribe();
      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple callbacks', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      manager.onModeChange(cb1);
      manager.onModeChange(cb2);

      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });

  describe('config', () => {
    it('should return default config', () => {
      const config = manager.getConfig();
      expect(config.cesiumModeDistanceThreshold).toBe(0.000076);
      expect(config.threeModeDistanceThreshold).toBe(0.000096);
      expect(config.autoSwitch).toBe(true);
    });

    it('should update config partially', () => {
      manager.updateConfig({ autoSwitch: false });
      const config = manager.getConfig();
      expect(config.autoSwitch).toBe(false);
      expect(config.cesiumModeDistanceThreshold).toBe(0.000076);
    });

    it('should accept custom config in constructor', () => {
      const custom = new SceneModeManager({ cesiumModeDistanceThreshold: 0.001 });
      expect(custom.getConfig().cesiumModeDistanceThreshold).toBe(0.001);
    });
  });

  describe('transition progress', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return partial progress during transition', () => {
      manager.updateConfig({ transitionDuration: 1000 });

      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      jest.advanceTimersByTime(500);

      expect(manager.getTransitionProgress()).toBeCloseTo(0.5);
    });

    it('should return 1 after transition completes', () => {
      manager.updateConfig({ transitionDuration: 1000 });

      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      jest.advanceTimersByTime(1000);

      expect(manager.getTransitionProgress()).toBe(1);
      expect(manager.isInTransition()).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clear all callbacks', () => {
      const callback = jest.fn();
      manager.onModeChange(callback);
      manager.dispose();

      manager.switchMode(SceneMode.CESIUM_DOMINANT);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
