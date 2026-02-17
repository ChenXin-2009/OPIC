/**
 * Observer Mode Controller for Jupiter Moons Ephemeris
 * 
 * Manages different observation viewpoints and provides observer position
 * and velocity for accurate position calculations with proper corrections.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7
 */

import { Vector3, ObserverMode, AberrationMode } from './types';

/**
 * Interface for planetary position providers
 * This allows the controller to get positions from the existing orbit system
 */
export interface PlanetaryPositionProvider {
  /**
   * Get Earth's heliocentric position at a given time
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Earth's position in ICRF frame relative to Sun (AU)
   */
  getEarthPosition(jd_tdb: number): Vector3;

  /**
   * Get Jupiter's heliocentric position at a given time
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Jupiter's position in ICRF frame relative to Sun (AU)
   */
  getJupiterPosition(jd_tdb: number): Vector3;

  /**
   * Get Earth's heliocentric velocity at a given time
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Earth's velocity in ICRF frame relative to SSB (km/s)
   */
  getEarthVelocity(jd_tdb: number): Vector3;
}

/**
 * ObserverModeController manages different observation viewpoints
 * and provides the necessary information for position calculations.
 * 
 * The controller supports three modes:
 * - GEOCENTRIC: Observer at Earth's center (applies light-time + aberration)
 * - HELIOCENTRIC: Observer at Sun's center (applies light-time only)
 * - JOVICENTRIC: Observer at Jupiter's center (applies light-time only)
 */
export class ObserverModeController {
  private mode: ObserverMode = ObserverMode.GEOCENTRIC;
  private positionProvider: PlanetaryPositionProvider;

  /**
   * Create a new ObserverModeController
   * @param positionProvider - Provider for planetary positions and velocities
   */
  constructor(positionProvider: PlanetaryPositionProvider) {
    this.positionProvider = positionProvider;
  }

  /**
   * Set the current observer mode
   * @param mode - The observer mode to set
   */
  setMode(mode: ObserverMode): void {
    this.mode = mode;
  }

  /**
   * Get the current observer mode
   * @returns The current observer mode
   */
  getMode(): ObserverMode {
    return this.mode;
  }

  /**
   * Get the observer's position at a given time
   * 
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Observer position in ICRF frame (AU)
   * 
   * Returns:
   * - GEOCENTRIC: Earth's heliocentric position
   * - HELIOCENTRIC: Origin (0, 0, 0)
   * - JOVICENTRIC: Jupiter's heliocentric position
   */
  getObserverPosition(jd_tdb: number): Vector3 {
    switch (this.mode) {
      case ObserverMode.GEOCENTRIC:
        return this.positionProvider.getEarthPosition(jd_tdb);
      
      case ObserverMode.HELIOCENTRIC:
        return new Vector3(0, 0, 0);
      
      case ObserverMode.JOVICENTRIC:
        return this.positionProvider.getJupiterPosition(jd_tdb);
      
      default:
        return new Vector3(0, 0, 0);
    }
  }

  /**
   * Get the observer's velocity at a given time
   * 
   * CRITICAL: This MUST return velocity in ICRF frame relative to
   * Solar System Barycenter (SSB) for correct aberration calculation.
   * 
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Observer velocity in ICRF frame relative to SSB (km/s)
   * 
   * Returns:
   * - GEOCENTRIC: Earth's velocity relative to SSB
   * - HELIOCENTRIC: Zero velocity (Sun is essentially at SSB)
   * - JOVICENTRIC: Zero velocity (simplified - Jupiter's velocity is small)
   * 
   * Note: For JOVICENTRIC mode, we return zero velocity as a simplification.
   * Jupiter's velocity relative to SSB is ~13 km/s, which produces aberration
   * of ~0.009 degrees - negligible for our accuracy requirements.
   */
  getObserverVelocity(jd_tdb: number): Vector3 {
    switch (this.mode) {
      case ObserverMode.GEOCENTRIC:
        return this.positionProvider.getEarthVelocity(jd_tdb);
      
      case ObserverMode.HELIOCENTRIC:
        // Sun is essentially at the Solar System Barycenter
        return new Vector3(0, 0, 0);
      
      case ObserverMode.JOVICENTRIC:
        // Jupiter's velocity relative to SSB is ~13 km/s
        // This produces aberration of ~0.009 degrees, which is negligible
        // for our sub-degree accuracy requirements
        return new Vector3(0, 0, 0);
      
      default:
        return new Vector3(0, 0, 0);
    }
  }

  /**
   * Determine if aberration correction should be applied
   * 
   * @returns true if aberration should be applied, false otherwise
   * 
   * Aberration is only applied in GEOCENTRIC mode because:
   * - Earth has significant velocity (~30 km/s) relative to SSB
   * - This produces aberration of ~20 arcseconds
   * - In heliocentric/Jovicentric modes, observer velocity is negligible
   */
  shouldApplyAberration(): boolean {
    return this.mode === ObserverMode.GEOCENTRIC;
  }

  /**
   * Get the appropriate aberration mode for the current observer mode
   * 
   * @returns The aberration mode to use for corrections
   * 
   * Returns:
   * - GEOCENTRIC: LT_S (light-time + stellar aberration)
   * - HELIOCENTRIC: LT (light-time only)
   * - JOVICENTRIC: LT (light-time only)
   */
  getAberrationMode(): AberrationMode {
    switch (this.mode) {
      case ObserverMode.GEOCENTRIC:
        return AberrationMode.LT_S;
      
      case ObserverMode.HELIOCENTRIC:
      case ObserverMode.JOVICENTRIC:
        return AberrationMode.LT;
      
      default:
        return AberrationMode.LT;
    }
  }
}
