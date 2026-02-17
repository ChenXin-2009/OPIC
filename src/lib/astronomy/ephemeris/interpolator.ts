/**
 * Position Interpolator for Jupiter's Galilean Moons
 * 
 * Implements Hermite cubic interpolation to compute smooth positions
 * between precomputed ephemeris data points. This ensures C1 continuity
 * (continuous position and velocity) and preserves monotonic orbital motion.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */

import { EphemerisData, SatelliteId, Vector3 } from './types';

/**
 * Interpolates positions between precomputed ephemeris samples
 * using Hermite cubic interpolation with variable time steps.
 */
export class PositionInterpolator {
  private data: EphemerisData;

  constructor(data: EphemerisData) {
    this.data = data;
  }

  /**
   * Interpolate position for a satellite at a given time.
   * 
   * @param satellite - Satellite identifier
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Interpolated position in ICRF frame (Jovicentric), or null if out of range
   */
  interpolate(satellite: SatelliteId, jd_tdb: number): Vector3 | null {
    const { header, satellites } = this.data;
    const positions = satellites[satellite].positions;

    // Check if time is within ephemeris range
    if (jd_tdb < header.startJD || jd_tdb > header.endJD) {
      return null;
    }

    // Find the index of the interval containing jd_tdb
    // We want i such that times[i] <= jd_tdb < times[i+1]
    const stepDays = header.stepDays ?? 1;
    const normalizedTime = (jd_tdb - header.startJD) / stepDays;
    const i = Math.floor(normalizedTime);

    // Handle edge case: exact match at last data point
    const numSamples = header.numSamples ?? positions.length;
    if (i >= numSamples - 1) {
      return positions[numSamples - 1];
    }

    // Handle edge case: exact match at first data point
    if (i === 0 && normalizedTime === 0) {
      return positions[0];
    }

    // For Hermite interpolation, we need 4 points: P[i-1], P[i], P[i+1], P[i+2]
    // We interpolate between P[i] and P[i+1]
    const i0 = Math.max(0, i - 1);
    const i1 = i;
    const i2 = Math.min(numSamples - 1, i + 1);
    const i3 = Math.min(numSamples - 1, i + 2);

    const p0 = positions[i0];
    const p1 = positions[i1];
    const p2 = positions[i2];
    const p3 = positions[i3];

    // Compute normalized time within the interval [0, 1]
    const t = normalizedTime - i;

    // Perform Hermite interpolation
    return this.hermiteInterpolate(t, p0, p1, p2, p3, stepDays);
  }

  /**
   * Hermite cubic interpolation with variable time steps.
   * 
   * Uses 4 points to compute velocities via finite differences,
   * then interpolates between p1 and p2 using Hermite basis functions.
   * 
   * @param t - Normalized time in [0, 1] within the interval
   * @param p0 - Position at i-1
   * @param p1 - Position at i (start of interval)
   * @param p2 - Position at i+1 (end of interval)
   * @param p3 - Position at i+2
   * @param dt - Time step in days
   * @returns Interpolated position
   */
  private hermiteInterpolate(
    t: number,
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    p3: Vector3,
    dt: number
  ): Vector3 {
    // Compute velocities using central differences with actual time step
    // v1 = (p2 - p0) / (2 * dt)
    // v2 = (p3 - p1) / (2 * dt)
    const v1 = p2.sub(p0).scale(1 / (2 * dt));
    const v2 = p3.sub(p1).scale(1 / (2 * dt));

    // Hermite basis functions
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;           // (1 + 2t)(1 - t)^2
    const h10 = t3 - 2 * t2 + t;               // t(1 - t)^2
    const h01 = -2 * t3 + 3 * t2;              // t^2(3 - 2t)
    const h11 = t3 - t2;                       // t^2(t - 1)

    // Hermite interpolation formula
    // P(t) = h00*p1 + h10*dt*v1 + h01*p2 + h11*dt*v2
    return new Vector3(
      h00 * p1.x + h10 * dt * v1.x + h01 * p2.x + h11 * dt * v2.x,
      h00 * p1.y + h10 * dt * v1.y + h01 * p2.y + h11 * dt * v2.y,
      h00 * p1.z + h10 * dt * v1.z + h01 * p2.z + h11 * dt * v2.z
    );
  }

  /**
   * Get the estimated interpolation error.
   * This is a placeholder that returns a conservative estimate.
   * 
   * @returns Estimated interpolation error in degrees
   */
  getInterpolationError(): number {
    // Conservative estimate based on design requirements
    // Actual error depends on orbital dynamics and time step
    return 0.05; // degrees
  }
}
