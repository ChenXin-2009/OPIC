/**
 * Astronomy Constants
 * 
 * This module defines fundamental astronomical constants used throughout
 * the orbital calculations and coordinate transformations.
 * 
 * All values are based on IAU (International Astronomical Union) standards
 * and NASA JPL ephemeris data.
 * 
 * Reference:
 * - IAU 2015 Resolution B3
 * - NASA JPL DE440 ephemeris
 * - Jean Meeus - Astronomical Algorithms (2nd Ed.)
 */

/**
 * J2000.0 epoch Julian Day Number.
 * 
 * This is the standard epoch for modern astronomical calculations,
 * corresponding to:
 * - Date: 2000 January 1.5 TT (Terrestrial Time)
 * - Calendar: 2000-01-01 12:00:00 TT
 * - Modified Julian Day: 51544.5
 */
export const J2000_JD = 2451545.0;

/**
 * Number of days in a Julian century.
 * 
 * A Julian century is exactly 36525 days, used for computing
 * time-dependent orbital elements.
 */
export const DAYS_PER_CENTURY = 36525.0;

/**
 * Astronomical Unit in kilometers.
 * 
 * The AU is the mean distance from Earth to the Sun, defined exactly
 * as 149,597,870.7 km by IAU 2012 Resolution B2.
 */
export const AU_IN_KM = 149597870.7;

/**
 * Speed of light in vacuum (km/s).
 * 
 * Exact value defined by the International System of Units (SI).
 */
export const SPEED_OF_LIGHT_KM_S = 299792.458;

/**
 * Gravitational constant times solar mass (km³/s²).
 * 
 * This is the heliocentric gravitational constant, used in
 * Kepler's third law and orbital mechanics calculations.
 * 
 * Value from IAU 2015 Resolution B3.
 */
export const GM_SUN = 1.32712440018e11;

/**
 * Obliquity of the ecliptic at J2000.0 (radians).
 * 
 * This is the angle between Earth's equatorial plane and the ecliptic
 * plane (the plane of Earth's orbit around the Sun).
 * 
 * Value: 23.43928° = 23°26'21.406"
 * Reference: IAU 2006 precession model
 */
export const OBLIQUITY_J2000_RAD = 23.43928 * Math.PI / 180;

/**
 * Obliquity of the ecliptic at J2000.0 (degrees).
 */
export const OBLIQUITY_J2000_DEG = 23.43928;

/**
 * Conversion factor: degrees to radians.
 */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Conversion factor: radians to degrees.
 */
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Conversion factor: arcseconds to radians.
 */
export const ARCSEC_TO_RAD = Math.PI / (180 * 3600);

/**
 * Conversion factor: radians to arcseconds.
 */
export const RAD_TO_ARCSEC = (180 * 3600) / Math.PI;

/**
 * Number of seconds in a day.
 */
export const SECONDS_PER_DAY = 86400;

/**
 * Number of milliseconds in a day.
 */
export const MILLISECONDS_PER_DAY = 86400000;

/**
 * Tolerance for Kepler equation solver (radians).
 * 
 * This is the default convergence tolerance for iterative
 * solutions of Kepler's equation.
 */
export const KEPLER_TOLERANCE = 1e-8;

/**
 * Maximum iterations for Kepler equation solver.
 * 
 * This prevents infinite loops in case of non-convergence.
 */
export const KEPLER_MAX_ITERATIONS = 50;

/**
 * Two PI constant for convenience.
 */
export const TWO_PI = 2 * Math.PI;

/**
 * Half PI constant for convenience.
 */
export const HALF_PI = Math.PI / 2;

/**
 * Converts Julian Day to Julian centuries since J2000.0.
 * 
 * @param julianDay - Julian Day Number
 * @returns Julian centuries since J2000.0
 * 
 * @example
 * ```typescript
 * const T = julianCenturies(2451545.0);
 * console.log(T); // 0.0 (at J2000.0)
 * ```
 */
export function julianCenturies(julianDay: number): number {
  return (julianDay - J2000_JD) / DAYS_PER_CENTURY;
}

/**
 * Converts kilometers to Astronomical Units.
 * 
 * @param km - Distance in kilometers
 * @returns Distance in AU
 * 
 * @example
 * ```typescript
 * const au = kmToAU(149597870.7);
 * console.log(au); // 1.0
 * ```
 */
export function kmToAU(km: number): number {
  return km / AU_IN_KM;
}

/**
 * Converts Astronomical Units to kilometers.
 * 
 * @param au - Distance in AU
 * @returns Distance in kilometers
 * 
 * @example
 * ```typescript
 * const km = auToKM(1.0);
 * console.log(km); // 149597870.7
 * ```
 */
export function auToKM(au: number): number {
  return au * AU_IN_KM;
}

/**
 * Converts degrees to radians.
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 * 
 * @example
 * ```typescript
 * const rad = degreesToRadians(180);
 * console.log(rad); // π
 * ```
 */
export function degreesToRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * Converts radians to degrees.
 * 
 * @param radians - Angle in radians
 * @returns Angle in degrees
 * 
 * @example
 * ```typescript
 * const deg = radiansToDegrees(Math.PI);
 * console.log(deg); // 180
 * ```
 */
export function radiansToDegrees(radians: number): number {
  return radians * RAD_TO_DEG;
}
