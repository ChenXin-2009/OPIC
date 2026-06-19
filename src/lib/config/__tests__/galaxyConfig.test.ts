import {
  SCALE_VIEW_CONFIG, GALAXY_CONFIG,
} from '../galaxyConfig';

describe('galaxyConfig data', () => {
  it('should export SCALE_VIEW_CONFIG with fade ranges', () => {
    expect(SCALE_VIEW_CONFIG.solarSystemFadeStart).toBe(500);
    expect(SCALE_VIEW_CONFIG.milkyWayBackgroundFadeStart).toBe(30000);
  });

  it('should export GALAXY_CONFIG with galaxy parameters', () => {
    expect(GALAXY_CONFIG.radius).toBe(50000);
    expect(GALAXY_CONFIG.armCount).toBe(4);
  });
});
