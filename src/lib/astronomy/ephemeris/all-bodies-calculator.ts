/**
 * All-Bodies Position Calculator
 * 
 * Unified position calculator for all 27 celestial bodies using polynomial ephemeris.
 * Integrates EphemerisManager, PolynomialEvaluator, and coordinate transformations.
 */

import { EphemerisManager } from './manager';
import { LightTimeCorrector, AberrationCorrector } from './corrections';
import { CoordinateTransformer } from './coordinates';
import { 
  Vector3, 
  PositionResult,
  ObserverMode,
  AberrationMode,
  BodyType
} from './types';

/**
 * Configuration for all-bodies calculator
 */
export interface AllBodiesCalculatorConfig {
  /**
   * Base URL for ephemeris data files
   */
  baseUrl?: string;

  /**
   * Initial observer mode
   */
  initialObserverMode?: ObserverMode;

  /**
   * Provider for Earth position (for geocentric mode)
   */
  earthPositionProvider?: (jd: number) => Vector3;

  /**
   * Provider for Earth velocity (for aberration correction)
   */
  earthVelocityProvider?: (jd: number) => Vector3;
}

/**
 * All-Bodies Position Calculator
 * 
 * Provides unified API for computing positions of all 27 celestial bodies
 * with automatic ephemeris loading, polynomial evaluation, and corrections.
 */
export class AllBodiesCalculator {
  private manager: EphemerisManager;
  private lightTimeCorrector: LightTimeCorrector;
  private aberrationCorrector: AberrationCorrector;
  private coordinateTransformer: CoordinateTransformer;
  private observerMode: ObserverMode;
  private config: AllBodiesCalculatorConfig;

  constructor(config: AllBodiesCalculatorConfig = {}) {
    this.config = config;
    this.manager = new EphemerisManager(config.baseUrl);
    this.lightTimeCorrector = new LightTimeCorrector();
    this.aberrationCorrector = new AberrationCorrector();
    this.coordinateTransformer = new CoordinateTransformer();
    this.observerMode = config.initialObserverMode || ObserverMode.HELIOCENTRIC;
  }

  /**
   * Calculate position of a celestial body
   * 
   * @param bodyId - Body NAIF ID
   * @param jd - Julian Date in TDB
   * @returns Position result with corrections applied
   */
  async calculatePosition(bodyId: number, jd: number): Promise<PositionResult> {
    try {
      // Get position from ephemeris manager
      const result = await this.manager.getPosition(bodyId, jd);

      if (!result.usingEphemeris) {
        // Using analytical fallback - return as-is
        return result;
      }

      let position = result.position;

      // Apply light-time correction
      position = await this.applyLightTimeCorrection(bodyId, jd, position);

      // Apply aberration correction if in geocentric mode
      if (this.observerMode === ObserverMode.GEOCENTRIC) {
        position = this.applyAberrationCorrection(jd, position);
      }

      // Transform coordinates based on observer mode
      position = this.transformCoordinates(bodyId, jd, position);

      return {
        ...result,
        position,
        errorEstimate: result.errorEstimate
      };
    } catch (error) {
      // Return fallback on any error
      console.warn(`Failed to calculate position for body ${bodyId}:`, error);
      return {
        position: new Vector3(0, 0, 0),
        usingEphemeris: false,
        source: 'analytical',
        accuracy: 'low',
        errorEstimate: 1.0
      };
    }
  }

  /**
   * Calculate positions for multiple bodies
   * 
   * @param bodyIds - Array of body NAIF IDs
   * @param jd - Julian Date in TDB
   * @returns Map of body ID to position result
   */
  async calculateMultiplePositions(
    bodyIds: number[],
    jd: number
  ): Promise<Map<number, PositionResult>> {
    const results = new Map<number, PositionResult>();

    // Calculate all positions in parallel
    const promises = bodyIds.map(async (bodyId) => {
      try {
        const result = await this.calculatePosition(bodyId, jd);
        results.set(bodyId, result);
      } catch (error) {
        console.error(`Failed to calculate position for body ${bodyId}:`, error);
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Apply light-time correction
   * 
   * Iteratively corrects for the finite speed of light between
   * the body and the observer.
   * 
   * @param bodyId - Body NAIF ID
   * @param jd - Julian Date
   * @param position - Initial position
   * @returns Corrected position
   */
  private async applyLightTimeCorrection(
    bodyId: number,
    jd: number,
    position: Vector3
  ): Promise<Vector3> {
    const observerPos = this.getObserverPosition(jd);
    const c = 173.144632674; // Speed of light in AU/day

    let correctedPos = position;
    let prevDistance = 0;

    // Iterate up to 5 times for convergence
    for (let i = 0; i < 5; i++) {
      const distance = correctedPos.sub(observerPos).length();
      
      if (Math.abs(distance - prevDistance) < 1e-10) {
        break; // Converged
      }

      const lightTime = distance / c;
      const correctedJD = jd - lightTime;

      // Recalculate position at light-time corrected time
      const result = await this.manager.getPosition(bodyId, correctedJD);
      correctedPos = result.position;
      prevDistance = distance;
    }

    return correctedPos;
  }

  /**
   * Apply aberration correction
   * 
   * Corrects for the relative motion between observer and target.
   * 
   * @param jd - Julian Date
   * @param position - Position to correct
   * @returns Corrected position
   */
  private applyAberrationCorrection(jd: number, position: Vector3): Vector3 {
    if (!this.config.earthVelocityProvider) {
      throw new Error('Earth velocity provider required for aberration correction');
    }

    const observerVel = this.config.earthVelocityProvider(jd);
    return this.aberrationCorrector.correct(
      position,
      observerVel,
      AberrationMode.LT_S
    );
  }

  /**
   * Transform coordinates based on observer mode
   * 
   * @param bodyId - Body NAIF ID
   * @param jd - Julian Date
   * @param position - Position in heliocentric frame
   * @returns Transformed position
   */
  private transformCoordinates(
    bodyId: number,
    jd: number,
    position: Vector3
  ): Vector3 {
    switch (this.observerMode) {
      case ObserverMode.GEOCENTRIC:
        // Transform to geocentric
        if (!this.config.earthPositionProvider) {
          throw new Error('Earth position provider required for geocentric mode');
        }
        const earthPos = this.config.earthPositionProvider(jd);
        return position.sub(earthPos);

      case ObserverMode.HELIOCENTRIC:
        // Already in heliocentric frame
        return position;

      default:
        return position;
    }
  }

  /**
   * Get observer position
   * 
   * @param jd - Julian Date
   * @returns Observer position
   */
  private getObserverPosition(jd: number): Vector3 {
    switch (this.observerMode) {
      case ObserverMode.GEOCENTRIC:
        if (!this.config.earthPositionProvider) {
          throw new Error('Earth position provider required for geocentric mode');
        }
        return this.config.earthPositionProvider(jd);

      case ObserverMode.HELIOCENTRIC:
        return new Vector3(0, 0, 0); // Sun at origin

      default:
        return new Vector3(0, 0, 0);
    }
  }

  /**
   * Preload ephemeris data for a time range
   * 
   * @param bodyIds - Array of body NAIF IDs
   * @param startJD - Start Julian Date
   * @param endJD - End Julian Date
   */
  async preloadRange(
    bodyIds: number[],
    startJD: number,
    endJD: number
  ): Promise<void> {
    const promises = bodyIds.map(bodyId =>
      this.manager.preloadRange(bodyId, startJD, endJD)
    );

    await Promise.all(promises);
  }

  /**
   * Check if data is loaded for a body at given time
   * 
   * @param bodyId - Body NAIF ID
   * @param jd - Julian Date
   * @returns True if data is loaded
   */
  isLoaded(bodyId: number, jd: number): boolean {
    return this.manager.isLoaded(bodyId, jd);
  }

  /**
   * Get ephemeris status for a body
   * 
   * @param bodyId - Body NAIF ID
   * @returns Ephemeris status
   */
  getStatus(bodyId: number) {
    return this.manager.getStatus(bodyId);
  }

  /**
   * Get all registered bodies
   * 
   * @returns Array of body configurations
   */
  getBodies() {
    return this.manager.getBodies();
  }

  /**
   * Set observer mode
   * 
   * @param mode - Observer mode
   */
  setObserverMode(mode: ObserverMode): void {
    this.observerMode = mode;
  }

  /**
   * Get current observer mode
   * 
   * @returns Observer mode
   */
  getObserverMode(): ObserverMode {
    return this.observerMode;
  }

  /**
   * Clear all loaded data
   */
  clear(): void {
    this.manager.clear();
  }
}
