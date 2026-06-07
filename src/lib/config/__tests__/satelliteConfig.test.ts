import {
  satelliteConfig,
  EARTH_RADIUS,
  ORBIT_ALTITUDE_THRESHOLDS,
  getOrbitType,
} from '../satelliteConfig';
import { OrbitType } from '../../types/satellite';

describe('satelliteConfig', () => {
  it('should have API configuration', () => {
    expect(satelliteConfig.api.endpoint).toBe('/api/satellites');
    expect(satelliteConfig.api.cacheTime).toBe(2 * 60 * 60 * 1000);
    expect(satelliteConfig.api.retryAttempts).toBe(3);
    expect(satelliteConfig.api.timeout).toBe(10000);
  });

  it('should have rendering configuration', () => {
    expect(satelliteConfig.rendering.maxSatellites).toBe(100000);
    expect(satelliteConfig.rendering.pointSize).toBe(5);
    expect(satelliteConfig.rendering.opacity).toBe(1);
    expect(satelliteConfig.rendering.lodDistances).toEqual([10, 50, 100]);
  });

  it('should have orbit type color mapping', () => {
    expect(satelliteConfig.rendering.colors[OrbitType.LEO]).toBe('#00aaff');
    expect(satelliteConfig.rendering.colors[OrbitType.MEO]).toBe('#00ff00');
    expect(satelliteConfig.rendering.colors[OrbitType.GEO]).toBe('#ff0000');
    expect(satelliteConfig.rendering.colors[OrbitType.HEO]).toBe('#ffffff');
  });

  it('should have computation configuration', () => {
    expect(satelliteConfig.computation.maxBatchSize).toBe(5000);
    expect(satelliteConfig.computation.workerCount).toBe(1);
    expect(satelliteConfig.computation.cacheSize).toBe(10000);
  });

  it('should have UI configuration', () => {
    expect(satelliteConfig.ui.maxOrbits).toBe(10);
    expect(satelliteConfig.ui.searchDebounce).toBe(300);
    expect(satelliteConfig.ui.updateInterval).toBe(16);
  });
});

describe('EARTH_RADIUS', () => {
  it('should be 6371 km', () => {
    expect(EARTH_RADIUS).toBe(6371);
  });
});

describe('ORBIT_ALTITUDE_THRESHOLDS', () => {
  it('should define LEO max as 2000 km', () => {
    expect(ORBIT_ALTITUDE_THRESHOLDS.LEO_MAX).toBe(2000);
  });

  it('should define MEO max as 35786 km', () => {
    expect(ORBIT_ALTITUDE_THRESHOLDS.MEO_MAX).toBe(35786);
  });

  it('should define GEO altitude as 35786 km', () => {
    expect(ORBIT_ALTITUDE_THRESHOLDS.GEO_ALTITUDE).toBe(35786);
  });

  it('should define GEO tolerance as 100 km', () => {
    expect(ORBIT_ALTITUDE_THRESHOLDS.GEO_TOLERANCE).toBe(100);
  });
});

describe('getOrbitType', () => {
  it('should return HEO for eccentricity > 0.25', () => {
    expect(getOrbitType(1000, 0.3)).toBe(OrbitType.HEO);
    expect(getOrbitType(35786, 0.26)).toBe(OrbitType.HEO);
  });

  it('should return GEO for altitude around 35786km with low eccentricity', () => {
    expect(getOrbitType(35786, 0)).toBe(OrbitType.GEO);
    expect(getOrbitType(35786 - 99, 0)).toBe(OrbitType.GEO);
    expect(getOrbitType(35786 + 99, 0)).toBe(OrbitType.GEO);
  });

  it('should not return GEO for altitude at tolerance boundary', () => {
    expect(getOrbitType(35786 - 100, 0)).not.toBe(OrbitType.GEO);
    expect(getOrbitType(35786 + 100, 0)).not.toBe(OrbitType.GEO);
  });

  it('should return LEO for altitude below 2000km', () => {
    expect(getOrbitType(0, 0)).toBe(OrbitType.LEO);
    expect(getOrbitType(500, 0)).toBe(OrbitType.LEO);
    expect(getOrbitType(1999, 0)).toBe(OrbitType.LEO);
  });

  it('should return MEO for altitude 2000-35786km', () => {
    expect(getOrbitType(2000, 0)).toBe(OrbitType.MEO);
    expect(getOrbitType(10000, 0)).toBe(OrbitType.MEO);
    expect(getOrbitType(35000, 0)).toBe(OrbitType.MEO);
  });

  it('should return HEO for altitude above MEO max', () => {
    expect(getOrbitType(40000, 0)).toBe(OrbitType.HEO);
    expect(getOrbitType(50000, 0.1)).toBe(OrbitType.HEO);
  });
});
