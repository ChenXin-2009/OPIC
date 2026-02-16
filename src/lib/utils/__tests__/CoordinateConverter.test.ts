/**
 * CoordinateConverter.test.ts - 坐标转换工具单元测试
 */

import { CoordinateConverter } from '../CoordinateConverter';

describe('CoordinateConverter', () => {
  describe('equatorialToGalactic', () => {
    it('should convert Andromeda Galaxy (M31) coordinates correctly', () => {
      // M31: RA = 10.68°, Dec = 41.27°
      // Expected Galactic: l ≈ 121.17°, b ≈ -21.57°
      const result = CoordinateConverter.equatorialToGalactic(10.68, 41.27);

      expect(result.l).toBeCloseTo(121.17, 1);
      expect(result.b).toBeCloseTo(-21.57, 1);
    });

    it('should convert Galactic Center coordinates correctly', () => {
      // Galactic Center: RA ≈ 266.42°, Dec ≈ -29.01°
      // Expected Galactic: l ≈ 0°, b ≈ 0°
      const result = CoordinateConverter.equatorialToGalactic(266.42, -29.01);

      expect(result.l).toBeCloseTo(0, 1);
      expect(result.b).toBeCloseTo(0, 1);
    });

    it('should handle North Galactic Pole correctly', () => {
      // NGP: RA = 192.86°, Dec = 27.13°
      // Expected Galactic: b ≈ 90°
      const result = CoordinateConverter.equatorialToGalactic(192.86, 27.13);

      expect(result.b).toBeCloseTo(90, 1);
    });

    it('should handle South Galactic Pole correctly', () => {
      // SGP: RA = 12.86°, Dec = -27.13°
      // Expected Galactic: b ≈ -90°
      const result = CoordinateConverter.equatorialToGalactic(12.86, -27.13);

      expect(result.b).toBeCloseTo(-90, 1);
    });
  });

  describe('galacticToSupergalactic', () => {
    it('should convert coordinates to supergalactic system', () => {
      // Test with a known position
      const l = 120;
      const b = -20;
      const distance = 0.78; // Mpc (M31 distance)

      const result = CoordinateConverter.galacticToSupergalactic(l, b, distance);

      // Check that the result is a valid Vector3
      expect(result.x).toBeDefined();
      expect(result.y).toBeDefined();
      expect(result.z).toBeDefined();

      // Check that the distance is preserved
      const resultDistance = Math.sqrt(
        result.x * result.x + result.y * result.y + result.z * result.z
      );
      expect(resultDistance).toBeCloseTo(distance, 2);
    });

    it('should handle zero distance', () => {
      const result = CoordinateConverter.galacticToSupergalactic(0, 0, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('equatorialToSupergalactic', () => {
    it('should convert M31 coordinates correctly', () => {
      // M31: RA = 10.68°, Dec = 41.27°, distance = 0.78 Mpc
      const result = CoordinateConverter.equatorialToSupergalactic(
        10.68,
        41.27,
        0.78
      );

      // Check that the result is a valid Vector3
      expect(result.x).toBeDefined();
      expect(result.y).toBeDefined();
      expect(result.z).toBeDefined();

      // Check that the distance is preserved (within 1% error)
      const resultDistance = Math.sqrt(
        result.x * result.x + result.y * result.y + result.z * result.z
      );
      expect(resultDistance).toBeCloseTo(0.78, 2);
    });
  });

  describe('redshiftToComovingDistance', () => {
    it('should handle z = 0 correctly', () => {
      const distance = CoordinateConverter.redshiftToComovingDistance(0);
      expect(distance).toBe(0);
    });

    it('should use approximation for small redshift (z = 0.05)', () => {
      // For z = 0.05, d ≈ c * z / H0 ≈ 299792.458 * 0.05 / 70 ≈ 214.1 Mpc
      const distance = CoordinateConverter.redshiftToComovingDistance(0.05);
      expect(distance).toBeCloseTo(214.1, 0);
    });

    it('should use numerical integration for larger redshift (z = 0.5)', () => {
      // For z = 0.5, d ≈ 1900 Mpc (approximate)
      const distance = CoordinateConverter.redshiftToComovingDistance(0.5);
      expect(distance).toBeGreaterThan(1800);
      expect(distance).toBeLessThan(2000);
    });

    it('should handle z = 1.0 correctly', () => {
      // For z = 1.0, d ≈ 3300 Mpc (approximate)
      const distance = CoordinateConverter.redshiftToComovingDistance(1.0);
      expect(distance).toBeGreaterThan(3200);
      expect(distance).toBeLessThan(3500);
    });

    it('should handle z = 2.0 correctly', () => {
      // For z = 2.0, d ≈ 5500 Mpc (approximate)
      const distance = CoordinateConverter.redshiftToComovingDistance(2.0);
      expect(distance).toBeGreaterThan(5300);
      expect(distance).toBeLessThan(5800);
    });

    it('should return increasing distances for increasing redshifts', () => {
      const d1 = CoordinateConverter.redshiftToComovingDistance(0.1);
      const d2 = CoordinateConverter.redshiftToComovingDistance(0.5);
      const d3 = CoordinateConverter.redshiftToComovingDistance(1.0);

      expect(d2).toBeGreaterThan(d1);
      expect(d3).toBeGreaterThan(d2);
    });
  });

  describe('comovingDistanceToRedshift', () => {
    it('should be inverse of redshiftToComovingDistance', () => {
      const testRedshifts = [0.05, 0.1, 0.5, 1.0];

      testRedshifts.forEach((z) => {
        const distance = CoordinateConverter.redshiftToComovingDistance(z);
        const recoveredZ = CoordinateConverter.comovingDistanceToRedshift(distance);
        expect(recoveredZ).toBeCloseTo(z, 3);
      });
    });

    it('should handle zero distance', () => {
      const z = CoordinateConverter.comovingDistanceToRedshift(0);
      expect(z).toBe(0);
    });
  });

  describe('cartesianToSpherical', () => {
    it('should convert cartesian to spherical coordinates', () => {
      const result = CoordinateConverter.cartesianToSpherical(1, 0, 0);

      expect(result.r).toBeCloseTo(1, 5);
      expect(result.theta).toBeCloseTo(Math.PI / 2, 5);
      expect(result.phi).toBeCloseTo(0, 5);
    });

    it('should handle point on z-axis', () => {
      const result = CoordinateConverter.cartesianToSpherical(0, 0, 1);

      expect(result.r).toBeCloseTo(1, 5);
      expect(result.theta).toBeCloseTo(0, 5);
    });

    it('should handle origin', () => {
      const result = CoordinateConverter.cartesianToSpherical(0, 0, 0);

      expect(result.r).toBe(0);
      expect(isNaN(result.theta) || result.theta === 0).toBe(true);
    });
  });

  describe('sphericalToCartesian', () => {
    it('should convert spherical to cartesian coordinates', () => {
      const result = CoordinateConverter.sphericalToCartesian(
        1,
        Math.PI / 2,
        0
      );

      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(0, 5);
    });

    it('should be inverse of cartesianToSpherical', () => {
      const x = 1.5;
      const y = 2.3;
      const z = 0.7;

      const spherical = CoordinateConverter.cartesianToSpherical(x, y, z);
      const cartesian = CoordinateConverter.sphericalToCartesian(
        spherical.r,
        spherical.theta,
        spherical.phi
      );

      expect(cartesian.x).toBeCloseTo(x, 5);
      expect(cartesian.y).toBeCloseTo(y, 5);
      expect(cartesian.z).toBeCloseTo(z, 5);
    });
  });
});
