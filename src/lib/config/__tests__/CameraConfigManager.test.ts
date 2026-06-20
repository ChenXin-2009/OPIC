import { cameraConfigManager } from '../CameraConfigManager';

describe('CameraConfigManager', () => {
  it('should get config', () => {
    const config = cameraConfigManager.getConfig();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should update config', () => {
    const initial = cameraConfigManager.getConfig();
    cameraConfigManager.updateConfig({ minDistance: 0.5 });
    const updated = cameraConfigManager.getConfig();
    expect(updated.minDistance).toBe(0.5);
  });

  it('should notify listeners on update', () => {
    const listener = jest.fn();
    const unsubscribe = cameraConfigManager.addListener(listener);
    cameraConfigManager.updateConfig({ minDistance: 1 });
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('should return unsubscribe function from addListener', () => {
    const listener = jest.fn();
    const unsubscribe = cameraConfigManager.addListener(listener);
    unsubscribe();
    cameraConfigManager.updateConfig({ minDistance: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should reset to defaults', () => {
    cameraConfigManager.updateConfig({ zoomEasingSpeed: 0.99 });
    cameraConfigManager.resetToDefaults();
    const config = cameraConfigManager.getConfig();
    expect(config.zoomEasingSpeed).toBe(0.35);
  });
});
