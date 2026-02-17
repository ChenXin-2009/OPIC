/**
 * Astronomy Module Index
 * 
 * This module exports the public API for astronomical calculations,
 * including orbital mechanics, time conversions, and coordinate transformations.
 */

// Orbital calculations
export type {
  OrbitalElements,
  CelestialBody
} from './orbit';

export {
  ORBITAL_ELEMENTS,
  SATELLITE_DEFINITIONS,
  calculatePosition,
  getCelestialBodies,
  initializeSatelliteCalculator,
  initializeAllBodiesCalculator
} from './orbit';

// Time conversions
export {
  J2000,
  dateToJulianDay,
  julianDayToDate,
  julianCenturies,
  nowJulianDay,
  formatJulianDay
} from './time';

// Celestial body names
export {
  planetNames
} from './names';

// Utility functions
export * from './utils';
