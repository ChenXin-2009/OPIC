/**
 * Unit tests for PositionInterpolator
 * 
 * Tests Hermite cubic interpolation with edge cases and specific examples.
 */

import { PositionInterpolator } from './interpolator';
import { EphemerisData, SatelliteId, Vector3 } from './types';

describe('PositionInterpolator', () => {
  let testData: EphemerisData;
  let interpolator: PositionInterpolator;

  beforeEach(() => {
    // Create test ephemeris data with simple circular orbit
    // This allows us to verify interpolation behavior
    const numSamples = 10;
    const startJD = 2451545.0; // J2000.0
    const stepDays = 0.1;
    const endJD = startJD + (numSamples - 1) * stepDays;

    // Generate circular orbit positions for Io
    const radius = 0.002819; // AU (421,700 km)
    const period = 1.769; // days
    const positions: Vector3[] = [];

    for (let i = 0; i < numSamples; i++) {
      const jd = startJD + i * stepDays;
      const angle = (2 * Math.PI * (jd - startJD)) / period;
      positions.push(new Vector3(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        0
      ));
    }

    testData = {
      header: {
        version: 1,
        numSatellites: 4,
        numSamples,
        startJD,
        endJD,
        stepDays,
        kernelVersions: 'test',
        generationTimestamp: Date.now()
      },
      satellites: {
        [SatelliteId.IO]: { positions },
        [SatelliteId.EUROPA]: { positions: [] },
        [SatelliteId.GANYMEDE]: { positions: [] },
        [SatelliteId.CALLISTO]: { positions: [] }
      }
    };

    interpolator = new PositionInterpolator(testData);
  });

  describe('Edge Cases', () => {
    it('should return null for time before ephemeris range', () => {
      const jd = testData.header.startJD - 1;
      const result = interpolator.interpolate(SatelliteId.IO, jd);
      expect(result).toBeNull();
    });

    it('should return null for time after ephemeris range', () => {
      const jd = testData.header.endJD + 1;
      const result = interpolator.interpolate(SatelliteId.IO, jd);
      expect(result).toBeNull();
    });

    it('should return exact position at first data point', () => {
      const jd = testData.header.startJD;
      const result = interpolator.interpolate(SatelliteId.IO, jd);
      const expected = testData.satellites[SatelliteId.IO].positions[0];
      
      expect(result).not.toBeNull();
      expect(result!.equals(expected, 1e-10)).toBe(true);
    });

    it('should return exact position at last data point', () => {
      const jd = testData.header.endJD;
      const result = interpolator.interpolate(SatelliteId.IO, jd);
      const positions = testData.satellites[SatelliteId.IO].positions;
      const expected = positions[positions.length - 1];
      
      expect(result).not.toBeNull();
      expect(result!.equals(expected, 1e-10)).toBe(true);
    });

    it('should return exact position at intermediate data point', () => {
      const index = 5;
      const jd = testData.header.startJD + index * testData.header.stepDays;
      const result = interpolator.interpolate(SatelliteId.IO, jd);
      const expected = testData.satellites[SatelliteId.IO].positions[index];
      
      expect(result).not.toBeNull();
      expect(result!.equals(expected, 1e-10)).toBe(true);
    });
  });

  describe('Interpolation Behavior', () => {
    it('should interpolate between data points', () => {
      // Interpolate at midpoint between samples 4 and 5
      const jd = testData.header.startJD + 4.5 * testData.header.stepDays;
      const result = interpolator.interpolate(SatelliteId.IO, jd);
      
      expect(result).not.toBeNull();
      expect(result!.isFinite()).toBe(true);
      
      // Result should be somewhere between the two points
      const p4 = testData.satellites[SatelliteId.IO].positions[4];
      const p5 = testData.satellites[SatelliteId.IO].positions[5];
      
      // Check that interpolated position is reasonable
      // For a circular orbit, the interpolated point should be close to
      // the midpoint but slightly inside due to curvature
      const midpoint = p4.add(p5).scale(0.5);
      const distance = result!.sub(midpoint).length();
      
      // Distance should be small (within 10% of step size)
      expect(distance).toBeLessThan(0.1 * testData.header.stepDays);
    });

    it('should produce smooth interpolation across multiple intervals', () => {
      // Sample at many points and verify smoothness
      const samples: Vector3[] = [];
      const numTestPoints = 50;
      
      for (let i = 0; i < numTestPoints; i++) {
        const jd = testData.header.startJD + 
                   (i / (numTestPoints - 1)) * (testData.header.endJD - testData.header.startJD);
        const pos = interpolator.interpolate(SatelliteId.IO, jd);
        if (pos) samples.push(pos);
      }
      
      expect(samples.length).toBe(numTestPoints);
      
      // Verify all positions are finite
      samples.forEach(pos => {
        expect(pos.isFinite()).toBe(true);
      });
      
      // Verify positions maintain roughly constant distance from origin (circular orbit)
      const radii = samples.map(pos => pos.length());
      const meanRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
      const maxDeviation = Math.max(...radii.map(r => Math.abs(r - meanRadius)));
      
      // For circular orbit, radius should be very stable
      expect(maxDeviation / meanRadius).toBeLessThan(0.01); // Within 1%
    });

    it('should handle interpolation near boundaries', () => {
      // Test interpolation very close to start
      const jd1 = testData.header.startJD + 0.01 * testData.header.stepDays;
      const result1 = interpolator.interpolate(SatelliteId.IO, jd1);
      expect(result1).not.toBeNull();
      expect(result1!.isFinite()).toBe(true);
      
      // Test interpolation very close to end
      const jd2 = testData.header.endJD - 0.01 * testData.header.stepDays;
      const result2 = interpolator.interpolate(SatelliteId.IO, jd2);
      expect(result2).not.toBeNull();
      expect(result2!.isFinite()).toBe(true);
    });
  });

  describe('Hermite Interpolation Properties', () => {
    it('should preserve monotonic motion for circular orbit', () => {
      // For a circular orbit, the angle should increase monotonically
      const angles: number[] = [];
      const numTestPoints = 20;
      
      for (let i = 0; i < numTestPoints; i++) {
        const jd = testData.header.startJD + 
                   (i / (numTestPoints - 1)) * (testData.header.endJD - testData.header.startJD);
        const pos = interpolator.interpolate(SatelliteId.IO, jd);
        if (pos) {
          const angle = Math.atan2(pos.y, pos.x);
          angles.push(angle);
        }
      }
      
      // Verify angles increase monotonically (accounting for 2π wrap)
      for (let i = 1; i < angles.length; i++) {
        let delta = angles[i] - angles[i - 1];
        // Handle 2π wrap
        if (delta < -Math.PI) delta += 2 * Math.PI;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        
        // Angle should increase (positive delta)
        expect(delta).toBeGreaterThan(-0.1); // Allow small numerical errors
      }
    });

    it('should maintain reasonable velocity continuity', () => {
      // Sample positions at fine intervals and compute numerical velocities
      const dt = 0.001; // Small time step for numerical derivative
      const testJD = testData.header.startJD + 0.5 * (testData.header.endJD - testData.header.startJD);
      
      const p1 = interpolator.interpolate(SatelliteId.IO, testJD - dt);
      const p2 = interpolator.interpolate(SatelliteId.IO, testJD);
      const p3 = interpolator.interpolate(SatelliteId.IO, testJD + dt);
      
      expect(p1).not.toBeNull();
      expect(p2).not.toBeNull();
      expect(p3).not.toBeNull();
      
      // Compute velocities
      const v1 = p2!.sub(p1!).scale(1 / dt);
      const v2 = p3!.sub(p2!).scale(1 / dt);
      
      // Velocities should be similar (C1 continuity)
      const velocityChange = v2.sub(v1).length();
      const avgVelocity = (v1.length() + v2.length()) / 2;
      
      // Velocity change should be small relative to velocity magnitude
      expect(velocityChange / avgVelocity).toBeLessThan(0.1);
    });
  });

  describe('getInterpolationError', () => {
    it('should return a reasonable error estimate', () => {
      const error = interpolator.getInterpolationError();
      expect(error).toBeGreaterThan(0);
      expect(error).toBeLessThan(0.1); // Should be less than requirement (0.1 degrees)
    });
  });

  describe('Linear Motion Test', () => {
    it('should correctly interpolate linear motion', () => {
      // Create data with linear motion
      const linearData: EphemerisData = {
        header: {
          version: 1,
          numSatellites: 4,
          numSamples: 5,
          startJD: 2451545.0,
          endJD: 2451545.4,
          stepDays: 0.1,
          kernelVersions: 'test',
          generationTimestamp: Date.now()
        },
        satellites: {
          [SatelliteId.IO]: {
            positions: [
              new Vector3(0, 0, 0),
              new Vector3(1, 0, 0),
              new Vector3(2, 0, 0),
              new Vector3(3, 0, 0),
              new Vector3(4, 0, 0)
            ]
          },
          [SatelliteId.EUROPA]: { positions: [] },
          [SatelliteId.GANYMEDE]: { positions: [] },
          [SatelliteId.CALLISTO]: { positions: [] }
        }
      };

      const linearInterpolator = new PositionInterpolator(linearData);
      
      // Interpolate at midpoint
      const jd = 2451545.0 + 1.5 * 0.1;
      const result = linearInterpolator.interpolate(SatelliteId.IO, jd);
      
      expect(result).not.toBeNull();
      // For linear motion, Hermite should give exact linear interpolation
      expect(result!.x).toBeCloseTo(1.5, 5);
      expect(result!.y).toBeCloseTo(0, 10);
      expect(result!.z).toBeCloseTo(0, 10);
    });
  });
});
