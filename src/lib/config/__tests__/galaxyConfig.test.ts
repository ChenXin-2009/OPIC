import {
  SCALE_VIEW_CONFIG, NEARBY_STARS_CONFIG, GALAXY_CONFIG,
  NEARBY_STARS_DATA, getStarColorFromSpectralType, equatorialToCartesian,
} from '../galaxyConfig';

describe('galaxyConfig data', () => {
  it('should export SCALE_VIEW_CONFIG with fade ranges', () => {
    expect(SCALE_VIEW_CONFIG.solarSystemFadeStart).toBe(500);
    expect(SCALE_VIEW_CONFIG.milkyWayBackgroundFadeStart).toBe(30000);
  });

  it('should export NEARBY_STARS_CONFIG', () => {
    expect(NEARBY_STARS_CONFIG.enabled).toBe(true);
    expect(NEARBY_STARS_CONFIG.maxDistance).toBe(300);
  });

  it('should export GALAXY_CONFIG with galaxy parameters', () => {
    expect(GALAXY_CONFIG.radius).toBe(50000);
    expect(GALAXY_CONFIG.armCount).toBe(4);
  });

  it('should export NEARBY_STARS_DATA with star entries', () => {
    expect(NEARBY_STARS_DATA.length).toBeGreaterThan(50);
    expect(NEARBY_STARS_DATA[0].name).toBe('比邻星');
  });
});

describe('getStarColorFromSpectralType', () => {
  it('should return correct color for O type', () => {
    const color = getStarColorFromSpectralType('O5V');
    expect(color).toBe(0x9bb0ff);
  });

  it('should return correct color for G type (Sun)', () => {
    const color = getStarColorFromSpectralType('G2V');
    expect(color).toBe(0xfff4ea);
  });

  it('should return correct color for M type', () => {
    const color = getStarColorFromSpectralType('M5V');
    expect(color).toBe(0xffcc6f);
  });

  it('should handle lowercase spectral type', () => {
    const color = getStarColorFromSpectralType('k5iii');
    expect(color).toBe(0xffd2a1);
  });

  it('should return white for unknown type', () => {
    const color = getStarColorFromSpectralType('Q');
    expect(color).toBe(0xffffff);
  });
});

describe('equatorialToCartesian', () => {
  it('should return xyz coordinates', () => {
    const result = equatorialToCartesian(0, 0, 10);
    expect(result).toHaveProperty('x');
    expect(result).toHaveProperty('y');
    expect(result).toHaveProperty('z');
  });

  it('should place RA=0, Dec=0 on positive x', () => {
    const result = equatorialToCartesian(0, 0, 10);
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });
});
