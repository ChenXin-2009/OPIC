import * as THREE from 'three';
import { PARSEC_TO_AU } from '@/lib/constants/units';
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
    it('should convert (RA=0, Dec=0) to RenderWorld +X direction (vernal equinox)', () => {
      const result = exoplanetEquatorialToCartesian(0, 0, 1);
      expect(result.x).toBeGreaterThan(0);
      // Dec=0, RA=0 → ICRF +X → RenderWorld +X（旋转绕 X 轴，X 分量不变）
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should convert north celestial pole (Dec=90°) to near ecliptic pole', () => {
      const distanceAU = 1 * PARSEC_TO_AU;
      const result = exoplanetEquatorialToCartesian(0, 90, 1);
      const eps = 23.43928 * Math.PI / 180;
      // ICRF +Z (celestial pole) → RenderWorld (0, distance*sin(eps), distance*cos(eps))
      expect(result.x).toBeCloseTo(0, 4);
      expect(result.y).toBeCloseTo(distanceAU * Math.sin(eps), 4);
      expect(result.z).toBeCloseTo(distanceAU * Math.cos(eps), 4);
    });

    it('should handle negative declination', () => {
      const result = exoplanetEquatorialToCartesian(0, -45, 1);
      // 负赤纬 → ICRF -Z → RenderWorld -Y component
      // result.y = y_i*cos(eps) + z_i*sin(eps) where z_i is negative
      // result.z = -y_i*sin(eps) + z_i*cos(eps) where z_i is negative
      expect(result.z).toBeLessThan(0); // 黄道南半球
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
