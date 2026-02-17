/**
 * High-Level Satellite Position Calculator
 * 
 * This module provides a unified API for computing Jupiter moon positions
 * by integrating all ephemeris components:
 * - Data loading and interpolation
 * - Light-time correction
 * - Aberration correction
 * - Coordinate transformations
 * - Fallback to analytical model
 * 
 * Requirements: 1.4, 3.1, 3.2, 6.5, 10.3, 10.4
 */

import { EphemerisDataLoader } from './loader';
import { PositionInterpolator } from './interpolator';
import { LightTimeCorrector, AberrationCorrector } from './corrections';
import { CoordinateTransformer } from './coordinates';
import { ObserverModeController, PlanetaryPositionProvider } from './observer';
import { 
  EphemerisData, 
  SatelliteId, 
  Vector3, 
  ObserverMode,
  AberrationMode 
} from './types';

/**
 * Configuration options for the satellite position calculator
 */
export interface CalculatorConfig {
  /**
   * URL to the ephemeris data file
   */
  ephemerisDataUrl?: string;

  /**
   * Provider for planetary positions and velocities
   */
  positionProvider: PlanetaryPositionProvider;

  /**
   * Initial observer mode
   */
  initialObserverMode?: ObserverMode;

  /**
   * Fallback function to compute analytical positions when ephemeris data unavailable
   * @param satelliteId - Satellite identifier
   * @param jd_tdb - Julian Date in TDB
   * @param jupiterPos - Jupiter's heliocentric position
   * @returns Satellite position in heliocentric coordinates (ICRF frame)
   */
  analyticalFallback?: (
    satelliteId: SatelliteId,
    jd_tdb: number,
    jupiterPos: Vector3
  ) => Vector3;
}

/**
 * Result of a position calculation
 */
export interface PositionResult {
  /**
   * Satellite position in heliocentric coordinates (ICRF frame)
   */
  position: Vector3;

  /**
   * Whether the position was computed using ephemeris data (true) or fallback (false)
   */
  usingEphemeris: boolean;

  /**
   * Whether light-time correction was applied
   */
  lightTimeCorrected: boolean;

  /**
   * Whether aberration correction was applied
   */
  aberrationCorrected: boolean;
}

/**
 * High-level satellite position calculator that integrates all ephemeris components.
 * 
 * This class provides a simple API for computing accurate Jupiter moon positions
 * with automatic handling of:
 * - Ephemeris data loading
 * - Position interpolation
 * - Light-time correction
 * - Aberration correction
 * - Coordinate transformations
 * - Fallback to analytical model when data unavailable
 * 
 * @example
 * ```typescript
 * const calculator = new SatellitePositionCalculator({
 *   ephemerisDataUrl: '/data/jupiter-moons-ephemeris.bin.gz',
 *   positionProvider: myPositionProvider,
 *   initialObserverMode: ObserverMode.GEOCENTRIC
 * });
 * 
 * await calculator.initialize();
 * 
 * const result = calculator.calculatePosition(
 *   SatelliteId.IO,
 *   2451545.0  // J2000.0
 * );
 * 
 * console.log(result.position);  // Heliocentric position in ICRF frame
 * console.log(result.usingEphemeris);  // true if ephemeris data was used
 * ```
 */
export class SatellitePositionCalculator {
  private config: CalculatorConfig;
  private loader: EphemerisDataLoader;
  private interpolator: PositionInterpolator | null = null;
  private lightTimeCorrector: LightTimeCorrector;
  private aberrationCorrector: AberrationCorrector;
  private coordinateTransformer: CoordinateTransformer;
  private observerController: ObserverModeController;
  private ephemerisData: EphemerisData | null = null;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;
  private outOfRangeWarningShown: boolean = false;

  constructor(config: CalculatorConfig) {
    this.config = config;
    this.loader = new EphemerisDataLoader();
    this.lightTimeCorrector = new LightTimeCorrector();
    this.aberrationCorrector = new AberrationCorrector();
    this.coordinateTransformer = new CoordinateTransformer();
    this.observerController = new ObserverModeController(config.positionProvider);

    if (config.initialObserverMode) {
      this.observerController.setMode(config.initialObserverMode);
    }
  }

  /**
   * Initialize the calculator by loading ephemeris data.
   * 
   * This method should be called once before using the calculator.
   * If loading fails, the calculator will fall back to analytical model.
   * 
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.config.ephemerisDataUrl) {
        this.ephemerisData = await this.loader.load(this.config.ephemerisDataUrl);
        this.interpolator = new PositionInterpolator(this.ephemerisData);
        console.log('Ephemeris data loaded successfully');
      } else {
        console.warn('No ephemeris data URL provided, using analytical fallback');
      }
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to load ephemeris data:', this.initializationError.message);
      console.warn('High-precision moon data unavailable. Using simplified model.');
    } finally {
      this.isInitialized = true;
    }
  }

  /**
   * Calculate the position of a Jupiter moon at a given time.
   * 
   * This method applies all necessary corrections based on the current observer mode:
   * - Interpolates position from ephemeris data (or uses analytical fallback)
   * - Applies light-time correction
   * - Applies aberration correction (if in geocentric mode)
   * - Transforms coordinates to heliocentric frame
   * 
   * @param satelliteId - Satellite identifier (IO, EUROPA, GANYMEDE, or CALLISTO)
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Position result with heliocentric coordinates and metadata
   * 
   * @throws Error if calculator is not initialized
   */
  calculatePosition(satelliteId: SatelliteId, jd_tdb: number): PositionResult {
    if (!this.isInitialized) {
      throw new Error('Calculator not initialized. Call initialize() first.');
    }

    // Get Jupiter's heliocentric position
    const jupiterPos = this.config.positionProvider.getJupiterPosition(jd_tdb);

    // Get observer position and velocity
    const observerPos = this.observerController.getObserverPosition(jd_tdb);
    const observerVel = this.observerController.getObserverVelocity(jd_tdb);
    const aberrationMode = this.observerController.getAberrationMode();

    // Try to get position from ephemeris data
    let jovicentricPos: Vector3 | null = null;
    let usingEphemeris = false;

    if (this.interpolator && this.ephemerisData) {
      // Check if time is within ephemeris range
      if (jd_tdb >= this.ephemerisData.header.startJD && 
          jd_tdb <= this.ephemerisData.header.endJD) {
        
        // Apply light-time correction
        jovicentricPos = this.lightTimeCorrector.correct(
          observerPos,
          satelliteId,
          jd_tdb,
          this.interpolator
        );

        if (jovicentricPos) {
          usingEphemeris = true;
        }
      } else {
        // Out of range - use fallback
        if (!this.outOfRangeWarningShown) {
          console.warn(
            `Time ${jd_tdb} outside ephemeris range ` +
            `[${this.ephemerisData.header.startJD}, ${this.ephemerisData.header.endJD}], ` +
            `using analytical fallback`
          );
          this.outOfRangeWarningShown = true;
        }
      }
    }

    // Fall back to analytical model if ephemeris data unavailable
    if (!jovicentricPos) {
      if (this.config.analyticalFallback) {
        // Use provided fallback function
        const heliocentricPos = this.config.analyticalFallback(
          satelliteId,
          jd_tdb,
          jupiterPos
        );
        
        // Convert to Jovicentric for consistent processing
        jovicentricPos = this.coordinateTransformer.heliocentricToJovicentric(
          heliocentricPos,
          jupiterPos
        );
      } else {
        // No fallback available - return Jupiter's position as a last resort
        console.error('No analytical fallback available for satellite position');
        return {
          position: jupiterPos,
          usingEphemeris: false,
          lightTimeCorrected: false,
          aberrationCorrected: false
        };
      }
    }

    // Convert to heliocentric coordinates
    let heliocentricPos = this.coordinateTransformer.jovicentricToHeliocentric(
      jovicentricPos,
      jupiterPos
    );

    // Apply aberration correction if needed
    let aberrationCorrected = false;
    if (aberrationMode === AberrationMode.LT_S) {
      heliocentricPos = this.aberrationCorrector.correct(
        heliocentricPos,
        observerVel,
        aberrationMode
      );
      aberrationCorrected = true;
    }

    return {
      position: heliocentricPos,
      usingEphemeris,
      lightTimeCorrected: true,
      aberrationCorrected
    };
  }

  /**
   * Calculate positions for all Galilean moons at a given time.
   * 
   * @param jd_tdb - Julian Date in TDB time scale
   * @returns Map of satellite positions by satellite ID
   */
  calculateAllPositions(jd_tdb: number): Map<SatelliteId, PositionResult> {
    const results = new Map<SatelliteId, PositionResult>();

    for (const satId of [SatelliteId.IO, SatelliteId.EUROPA, SatelliteId.GANYMEDE, SatelliteId.CALLISTO]) {
      results.set(satId, this.calculatePosition(satId, jd_tdb));
    }

    return results;
  }

  /**
   * Set the observer mode.
   * 
   * @param mode - Observer mode to set
   */
  setObserverMode(mode: ObserverMode): void {
    this.observerController.setMode(mode);
  }

  /**
   * Get the current observer mode.
   * 
   * @returns Current observer mode
   */
  getObserverMode(): ObserverMode {
    return this.observerController.getMode();
  }

  /**
   * Check if ephemeris data is loaded and available.
   * 
   * @returns true if ephemeris data is available, false otherwise
   */
  hasEphemerisData(): boolean {
    return this.ephemerisData !== null && this.interpolator !== null;
  }

  /**
   * Get the validity period of loaded ephemeris data.
   * 
   * @returns Validity period or null if no data loaded
   */
  getValidityPeriod(): { start: Date; end: Date } | null {
    if (!this.ephemerisData) {
      return null;
    }
    return this.loader.getValidityPeriod(this.ephemerisData);
  }

  /**
   * Get metadata about the loaded ephemeris data.
   * 
   * @returns Ephemeris metadata or null if no data loaded
   */
  getMetadata(): {
    kernelVersions: string;
    generationTimestamp: number;
    numSamples: number;
    stepDays: number;
  } | null {
    if (!this.ephemerisData) {
      return null;
    }

    return {
      kernelVersions: this.ephemerisData.header.kernelVersions,
      generationTimestamp: this.ephemerisData.header.generationTimestamp,
      numSamples: this.ephemerisData.header.numSamples ?? 0,
      stepDays: this.ephemerisData.header.stepDays ?? 0
    };
  }

  /**
   * Get the initialization error if loading failed.
   * 
   * @returns Error object or null if no error
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Check if the calculator is initialized.
   * 
   * @returns true if initialized, false otherwise
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
