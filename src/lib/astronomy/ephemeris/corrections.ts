/**
 * Corrections for Jupiter's Galilean Moons
 * 
 * Implements light-time correction and stellar aberration correction
 * to account for light travel delay and observer motion.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 7.1, 7.2, 7.3, 7.4
 */

import { SatelliteId, Vector3, AberrationMode } from './types';
import { PositionInterpolator } from './interpolator';

/**
 * Speed of light in km/s
 */
const SPEED_OF_LIGHT = 299792.458;

/**
 * Astronomical Unit in kilometers
 */
const AU_TO_KM = 149597870.7;

/**
 * Convergence threshold for light-time iteration (days)
 * Corresponds to ~0.1 milliseconds
 */
const CONVERGENCE_THRESHOLD = 1e-9;

/**
 * Maximum iterations for light-time correction
 */
const MAX_ITERATIONS = 5;

/**
 * Applies light-time correction to account for light travel delay
 * from satellite to observer.
 * 
 * The correction is iterative because the satellite moves during the
 * light travel time. We iterate until the light-time converges.
 */
export class LightTimeCorrector {
  /**
   * Apply light-time correction to a satellite position.
   * 
   * @param observerPos - Observer position in ICRF frame (AU)
   * @param satelliteId - Satellite identifier
   * @param jd_tdb - Julian Date in TDB time scale
   * @param interpolator - Position interpolator for ephemeris data
   * @returns Corrected position accounting for light travel time
   */
  correct(
    observerPos: Vector3,
    satelliteId: SatelliteId,
    jd_tdb: number,
    interpolator: PositionInterpolator
  ): Vector3 | null {
    // Get initial position at current time
    let pos = interpolator.interpolate(satelliteId, jd_tdb);
    if (!pos) {
      return null;
    }

    let prevLightTime = 0;

    // Iterate to converge on the correct light-time
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Calculate observer-to-satellite distance in kilometers
      const distance = pos.sub(observerPos).length() * AU_TO_KM;

      // Calculate light travel time in days
      const lightTime = distance / SPEED_OF_LIGHT / 86400;

      // Check convergence
      if (Math.abs(lightTime - prevLightTime) < CONVERGENCE_THRESHOLD) {
        break;
      }

      // Update for next iteration
      prevLightTime = lightTime;

      // Get position at retarded time (current time minus light travel time)
      const retardedPos = interpolator.interpolate(satelliteId, jd_tdb - lightTime);
      if (!retardedPos) {
        // If interpolation fails, return last valid position
        return pos;
      }

      pos = retardedPos;
    }

    return pos;
  }
}

/**
 * Applies stellar aberration correction due to observer motion.
 * 
 * Aberration changes the apparent direction of celestial objects
 * due to the finite speed of light and observer velocity.
 */
export class AberrationCorrector {
  /**
   * Apply stellar aberration correction.
   * 
   * @param position - Position vector in ICRF frame (AU)
   * @param observerVelocity - Observer velocity in ICRF frame relative to SSB (km/s)
   * @param mode - Aberration correction mode
   * @returns Corrected position with aberration applied
   */
  correct(
    position: Vector3,
    observerVelocity: Vector3,
    mode: AberrationMode
  ): Vector3 {
    if (mode === AberrationMode.NONE || mode === AberrationMode.LT) {
      return position;
    }

    const beta = observerVelocity.length() / SPEED_OF_LIGHT;

    if (beta < 0.001) {
      // Classical approximation for low velocities
      // Aberration changes direction, not distance
      const n = position.normalize();
      const vOverC = observerVelocity.scale(1 / SPEED_OF_LIGHT);

      // Correct formula: n' = n + v/c - (n·v/c)n
      const correction = vOverC.sub(n.scale(n.dot(vOverC)));
      const nPrime = n.add(correction).normalize();

      return nPrime.scale(position.length());
    } else {
      // Relativistic formula for high velocities
      const gamma = 1 / Math.sqrt(1 - beta * beta);
      const direction = position.normalize();
      const vNorm = observerVelocity.normalize();
      const cosTheta = direction.dot(vNorm);

      // Relativistic aberration
      const cosThetaPrime = (cosTheta + beta) / (1 + beta * cosTheta);
      const sinThetaPrime = Math.sqrt(1 - cosThetaPrime * cosThetaPrime) / gamma;

      // Reconstruct direction (simplified for small angles)
      const factor = Math.sqrt(cosThetaPrime * cosThetaPrime + sinThetaPrime * sinThetaPrime);
      return direction.scale(position.length() * factor);
    }
  }
}
