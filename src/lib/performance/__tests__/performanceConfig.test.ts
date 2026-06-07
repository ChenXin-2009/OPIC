import { PERFORMANCE_CONFIG, isDevelopment } from '../performanceConfig';

describe('performanceConfig', () => {
  it('should export PERFORMANCE_CONFIG with update interval', () => {
    expect(PERFORMANCE_CONFIG.DEFAULT_UPDATE_INTERVAL).toBe(2000);
    expect(PERFORMANCE_CONFIG.FPS_LOW_THRESHOLD).toBe(30);
    expect(PERFORMANCE_CONFIG.FPS_HIGH_THRESHOLD).toBe(55);
  });

  it('should export isDevelopment function', () => {
    expect(typeof isDevelopment).toBe('function');
  });
});
