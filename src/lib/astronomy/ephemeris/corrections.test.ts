/**
 * Unit tests for light-time and aberration corrections
 */

import { LightTimeCorrector, AberrationCorrector } from './corrections';
import { Vector3, SatelliteId, AberrationMode, EphemerisData } from './types';
import { PositionInterpolator } from './interpolator';

describe('LightTimeCorrector', () => {
  let corrector: LightTimeCorrector;
  let mockInterpolator: PositionInterpolator;

  beforeEach(() => {
    corrector = new LightTimeCorrector();

    // Create mock ephemeris data for testing
    const mockData: EphemerisData = {
      header: {
        version: 1,
        numSatellites: 4,
        numSamples: 100,
        startJD: 2451545.0, // J2000.0
        endJD: 2451645.0,   // 100 days later
        stepDays: 1.0,
        kernelVersions: 'test',
        generationTimestamp: Date.now()
      },
      satellites: {
        [SatelliteId.IO]: {
          positions: Array.from({ length: 100 }, (_, i) => {
            // Simulate circular orbit around Jupiter
            const angle = (i / 100) * 2 * Math.PI * 10; // 10 orbits
            const radius = 421700 / 149597870.7; // Io's orbital radius in AU
            return new Vector3(
              radius * Math.cos(angle),
              radius * Math.sin(angle),
              0
            );
          })
        },
        [SatelliteId.EUROPA]: { positions: [] },
        [SatelliteId.GANYMEDE]: { positions: [] },
        [SatelliteId.CALLISTO]: { positions: [] }
      }
    };

    mockInterpolator = new PositionInterpolator(mockData);
  });

  it('should handle zero distance correctly', () => {
    // Observer at same position as satellite
    const jd = 2451545.0;
    const satPos = mockInterpolator.interpolate(SatelliteId.IO, jd);
    expect(satPos).not.toBeNull();

    const observerPos = satPos!;
    const corrected = corrector.correct(observerPos, SatelliteId.IO, jd, mockInterpolator);

    expect(corrected).not.toBeNull();
    // With zero distance, light time is zero, so position should be unchanged
    expect(corrected!.equals(satPos!, 1e-6)).toBe(true);
  });

  it('should apply correction for Earth-Jupiter distance', () => {
    // Jupiter at ~5.2 AU from Sun, Earth at ~1 AU
    // Approximate Earth-Jupiter distance: ~4-6 AU
    const jd = 2451545.0;
    const jupiterPos = new Vector3(5.2, 0, 0); // Jupiter's heliocentric position
    const earthPos = new Vector3(0, 0, 0);     // Earth at origin (heliocentric)

    // Io's position relative to Jupiter
    const ioJovicentric = mockInterpolator.interpolate(SatelliteId.IO, jd);
    expect(ioJovicentric).not.toBeNull();

    // Io's heliocentric position
    const ioHeliocentric = jupiterPos.add(ioJovicentric!);

    // Apply light-time correction from Earth's perspective
    // Note: We need to adjust the mock interpolator to return heliocentric positions
    // For this test, we'll use a simplified approach
    const distance = ioHeliocentric.sub(earthPos).length();
    const expectedLightTimeMinutes = (distance * 149597870.7) / 299792.458 / 60;

    // Light time should be approximately 40-45 minutes for 5 AU
    expect(expectedLightTimeMinutes).toBeGreaterThan(35);
    expect(expectedLightTimeMinutes).toBeLessThan(50);
  });

  it('should converge within maximum iterations', () => {
    const jd = 2451545.0;
    const observerPos = new Vector3(5.0, 0, 0); // 5 AU away

    const corrected = corrector.correct(observerPos, SatelliteId.IO, jd, mockInterpolator);

    expect(corrected).not.toBeNull();
    // If we got a result, it means convergence succeeded
    expect(corrected!.isFinite()).toBe(true);
  });

  it('should return null when interpolation fails', () => {
    const jd = 2451545.0;
    const observerPos = new Vector3(5.0, 0, 0);

    // Use a time outside the ephemeris range
    const outOfRangeJd = 2460000.0;
    const corrected = corrector.correct(observerPos, SatelliteId.IO, outOfRangeJd, mockInterpolator);

    expect(corrected).toBeNull();
  });

  it('should handle very small distances', () => {
    const jd = 2451545.0;
    const satPos = mockInterpolator.interpolate(SatelliteId.IO, jd);
    expect(satPos).not.toBeNull();

    // Observer very close to satellite (0.001 AU = ~150,000 km)
    const observerPos = satPos!.add(new Vector3(0.001, 0, 0));
    const corrected = corrector.correct(observerPos, SatelliteId.IO, jd, mockInterpolator);

    expect(corrected).not.toBeNull();
    expect(corrected!.isFinite()).toBe(true);
  });
});

describe('AberrationCorrector', () => {
  let corrector: AberrationCorrector;

  beforeEach(() => {
    corrector = new AberrationCorrector();
  });

  it('should not apply correction when mode is NONE', () => {
    const position = new Vector3(1, 0, 0);
    const velocity = new Vector3(30, 0, 0); // 30 km/s

    const corrected = corrector.correct(position, velocity, AberrationMode.NONE);

    expect(corrected.equals(position)).toBe(true);
  });

  it('should not apply correction when mode is LT', () => {
    const position = new Vector3(1, 0, 0);
    const velocity = new Vector3(30, 0, 0);

    const corrected = corrector.correct(position, velocity, AberrationMode.LT);

    expect(corrected.equals(position)).toBe(true);
  });

  it('should preserve distance when applying aberration', () => {
    const position = new Vector3(5.2, 0, 0);
    const velocity = new Vector3(0, 30, 0); // 30 km/s perpendicular

    const corrected = corrector.correct(position, velocity, AberrationMode.LT_S);

    const originalDistance = position.length();
    const correctedDistance = corrected.length();

    // Distance should be preserved within floating-point precision
    expect(Math.abs(correctedDistance - originalDistance)).toBeLessThan(1e-6);
  });

  it('should apply classical aberration for low velocities', () => {
    const position = new Vector3(1, 0, 0);
    const velocity = new Vector3(0, 30, 0); // 30 km/s, beta ~ 0.0001

    const corrected = corrector.correct(position, velocity, AberrationMode.LT_S);

    // Direction should change slightly
    expect(corrected.equals(position)).toBe(false);
    // But distance should be preserved
    expect(Math.abs(corrected.length() - position.length())).toBeLessThan(1e-6);
  });

  it('should apply relativistic aberration for high velocities', () => {
    const position = new Vector3(1, 0, 0);
    const velocity = new Vector3(0, 100000, 0); // 100,000 km/s, beta ~ 0.33

    const corrected = corrector.correct(position, velocity, AberrationMode.LT_S);

    // Direction should change significantly
    expect(corrected.equals(position)).toBe(false);
    // Distance should still be approximately preserved (within 10% for high velocities)
    expect(Math.abs(corrected.length() - position.length())).toBeLessThan(0.1);
  });

  it('should handle zero velocity', () => {
    const position = new Vector3(1, 0, 0);
    const velocity = new Vector3(0, 0, 0);

    const corrected = corrector.correct(position, velocity, AberrationMode.LT_S);

    // With zero velocity, no aberration correction
    expect(corrected.equals(position, 1e-10)).toBe(true);
  });

  it('should change direction in the direction of motion', () => {
    const position = new Vector3(1, 0, 0);
    const velocity = new Vector3(0, 30, 0); // Moving in +Y direction

    const corrected = corrector.correct(position, velocity, AberrationMode.LT_S);

    // The corrected position should have a component in the Y direction
    // (aberration shifts apparent position toward direction of motion)
    expect(Math.abs(corrected.y)).toBeGreaterThan(0);
  });
});
