import * as THREE from 'three';
import {
  exoplanetEquatorialToCartesian,
  stellarRadiusSolarToAU,
  stellarColorFromTemperature,
  planetColorFromRadius,
  estimateSemiMajorAxisAU,
  formatMaybe,
} from '../coordinates';

describe('exoplanet coordinates', () => {
  describe('exoplanetEquatorialToCartesian', () => {
    it('should convert equatorial coordinates to cartesian', () => {
      const result = exoplanetEquatorialToCartesian(0, 0, 1);
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(-0);
    });

    it('should handle negative declination', () => {
      const result = exoplanetEquatorialToCartesian(0, -45, 1);
      expect(result.y).toBeLessThan(0);
    });
  });

  describe('stellarRadiusSolarToAU', () => {
    it('should convert solar radius to AU', () => {
      expect(stellarRadiusSolarToAU(1)).toBeGreaterThan(0);
      expect(stellarRadiusSolarToAU(1)).toBeLessThan(0.01);
    });

    it('should default to solar radius 1', () => {
      expect(stellarRadiusSolarToAU()).toBe(stellarRadiusSolarToAU(1));
    });

    it('should enforce minimum radius', () => {
      expect(stellarRadiusSolarToAU(0)).toBeGreaterThan(0);
    });
  });

  describe('stellarColorFromTemperature', () => {
    it('should return default color for missing temperature', () => {
      const color = stellarColorFromTemperature();
      expect(color.getHex()).toBe(0xfff4ea);
    });

    it('should return blue for hot stars', () => {
      const color = stellarColorFromTemperature(30000);
      expect(color.getHex()).toBe(0x9bb0ff);
    });

    it('should return orange for cool stars', () => {
      const color = stellarColorFromTemperature(5000);
      expect(color.getHex()).toBe(0xffb56b);
    });

    it('should return red for very cool stars', () => {
      const color = stellarColorFromTemperature(2000);
      expect(color.getHex()).toBe(0xff7a45);
    });
  });

  describe('planetColorFromRadius', () => {
    it('should return a Color for high temperature', () => {
      const color = planetColorFromRadius(1, 2000);
      expect(color).toBeInstanceOf(THREE.Color);
    });

    it('should return a Color for small planets', () => {
      const color = planetColorFromRadius(1);
      expect(color).toBeInstanceOf(THREE.Color);
    });

    it('should return a Color for medium planets', () => {
      const color = planetColorFromRadius(2);
      expect(color).toBeInstanceOf(THREE.Color);
    });

    it('should return a Color for large planets', () => {
      const color = planetColorFromRadius(4);
      expect(color).toBeInstanceOf(THREE.Color);
    });

    it('should return a Color for very large planets', () => {
      const color = planetColorFromRadius(10);
      expect(color).toBeInstanceOf(THREE.Color);
    });
  });

  describe('estimateSemiMajorAxisAU', () => {
    it('should estimate semi-major axis for known values', () => {
      const result = estimateSemiMajorAxisAU(365.25, 1);
      expect(result).toBeCloseTo(1, 0);
    });

    it('should return undefined for invalid period', () => {
      expect(estimateSemiMajorAxisAU()).toBeUndefined();
      expect(estimateSemiMajorAxisAU(-1)).toBeUndefined();
      expect(estimateSemiMajorAxisAU(0)).toBeUndefined();
    });

    it('should use default stellar mass when not provided', () => {
      const result = estimateSemiMajorAxisAU(365.25);
      expect(result).toBeCloseTo(1, 0);
    });
  });

  describe('formatMaybe', () => {
    it('should format a number', () => {
      expect(formatMaybe(3.14159, 2)).toBe('3.14');
    });

    it('should return dash for undefined', () => {
      expect(formatMaybe(undefined)).toBe('-');
    });

    it('should return dash for non-finite values', () => {
      expect(formatMaybe(Infinity)).toBe('-');
      expect(formatMaybe(NaN)).toBe('-');
    });
  });
});
