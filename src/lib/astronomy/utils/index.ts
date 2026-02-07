/**
 * Astronomy Utilities
 * 
 * This module exports all astronomy utility functions and constants
 * for orbital calculations and coordinate transformations.
 */

// Kepler equation solver
export {
  solveKeplerEquation,
  eccentricToTrueAnomaly,
  heliocentricDistance
} from './kepler';

// Coordinate transformations
export {
  orbitalToEcliptic,
  argumentOfPeriapsis,
  meanAnomaly,
  normalizeAngle,
  distance3D
} from './coordinates';

export type {
  Position3D,
  OrbitalOrientation
} from './coordinates';

// Astronomy constants
export {
  J2000_JD,
  DAYS_PER_CENTURY,
  AU_IN_KM,
  SPEED_OF_LIGHT_KM_S,
  GM_SUN,
  OBLIQUITY_J2000_RAD,
  OBLIQUITY_J2000_DEG,
  DEG_TO_RAD,
  RAD_TO_DEG,
  ARCSEC_TO_RAD,
  RAD_TO_ARCSEC,
  SECONDS_PER_DAY,
  MILLISECONDS_PER_DAY,
  KEPLER_TOLERANCE,
  KEPLER_MAX_ITERATIONS,
  TWO_PI,
  HALF_PI,
  julianCenturies,
  kmToAU,
  auToKM,
  degreesToRadians,
  radiansToDegrees
} from './constants';
