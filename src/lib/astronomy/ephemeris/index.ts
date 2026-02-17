/**
 * Jupiter Moons Ephemeris System
 * 
 * This module provides high-precision positioning for Jupiter's Galilean moons
 * using precomputed JPL SPICE ephemeris data with proper astronomical corrections.
 * 
 * Main exports:
 * - SatellitePositionCalculator: High-level API for computing satellite positions
 * - Types and enums for working with ephemeris data
 * - Individual components for advanced use cases
 */

// High-level calculator (recommended for most use cases)
export { 
  SatellitePositionCalculator,
  type CalculatorConfig,
  type PositionResult
} from './calculator';

// Core types and enums
export {
  SatelliteId,
  AberrationMode,
  ObserverMode,
  Vector3,
  type EphemerisData,
  type EphemerisHeader,
  type SatelliteData,
  type LeapSecondEntry,
  type LeapSecondTable
} from './types';

// Individual components (for advanced use cases)
export { EphemerisDataLoader } from './loader';
export { PositionInterpolator } from './interpolator';
export { LightTimeCorrector, AberrationCorrector } from './corrections';
export { CoordinateTransformer } from './coordinates';
export { 
  ObserverModeController,
  type PlanetaryPositionProvider 
} from './observer';
