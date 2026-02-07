/**
 * Time Conversion Module
 * 
 * This module provides utilities for converting between JavaScript Date
 * objects and Julian Day Numbers (JD), which are the standard time
 * representation in astronomical calculations.
 * 
 * Julian Day Number:
 * - Continuous count of days since the beginning of the Julian Period
 * - Starts at noon (12:00 TT) on January 1, 4713 BC (proleptic Julian calendar)
 * - Used to simplify date calculations in astronomy
 * 
 * Reference: Jean Meeus - Astronomical Algorithms (2nd Ed.)
 */

import { ValidationError } from '@/lib/errors/base';

/**
 * J2000.0 epoch Julian Day Number.
 * 
 * This is the standard epoch for modern astronomical calculations:
 * - Date: 2000-01-01 12:00:00 TT (Terrestrial Time)
 * - JD: 2451545.0
 */
export const J2000 = 2451545.0;

/**
 * Minimum valid Julian Day (4713 BC January 1).
 * Used for input validation.
 */
const MIN_JULIAN_DAY = 0;

/**
 * Maximum reasonable Julian Day (year 10000 AD).
 * Used for input validation.
 */
const MAX_JULIAN_DAY = 5373484.5;

/**
 * Converts a JavaScript Date object to Julian Day Number (JD).
 * 
 * The Julian Day Number is a continuous count of days since the beginning
 * of the Julian Period (4713 BC). It's used in astronomy to simplify
 * date calculations and avoid calendar system complications.
 * 
 * Algorithm:
 * 1. Extract UTC date and time components
 * 2. Adjust for January/February (treat as months 13/14 of previous year)
 * 3. Apply Gregorian calendar correction for dates after 1582-10-15
 * 4. Calculate integer day number using Meeus formula
 * 5. Add fractional day from time components
 * 
 * @param date - JavaScript Date object (UTC)
 * @returns Julian Day Number
 * @throws {ValidationError} If date is invalid
 * 
 * @example
 * ```typescript
 * // J2000.0 epoch
 * const jd = dateToJulianDay(new Date('2000-01-01T12:00:00Z'));
 * console.log(jd); // 2451545.0
 * 
 * // Current time
 * const now = dateToJulianDay(new Date());
 * ```
 */
export function dateToJulianDay(date: Date): number {
  // Validate input
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new ValidationError('Invalid date object', { date });
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const millisecond = date.getUTCMilliseconds();
  
  // Meeus algorithm: treat January and February as months 13 and 14
  // of the previous year for calculation purposes
  let y = year;
  let m = month;
  if (month <= 2) {
    y -= 1;
    m += 12;
  }
  
  // Determine if Gregorian calendar applies (after 1582-10-15)
  const isGregorian = (year > 1582) || 
                      (year === 1582 && month > 10) ||
                      (year === 1582 && month === 10 && day >= 15);
  
  // Gregorian calendar correction
  let A = 0;
  let B = 0;
  
  if (isGregorian) {
    A = Math.floor(y / 100);
    B = 2 - A + Math.floor(A / 4);
  }
  
  // Calculate Julian Day Number (integer part)
  const JD = Math.floor(365.25 * (y + 4716)) +
             Math.floor(30.6001 * (m + 1)) +
             day + B - 1524.5;
  
  // Add fractional day from time components
  const dayFraction = (hour + minute / 60 + second / 3600 + millisecond / 3600000) / 24;
  
  return JD + dayFraction;
}

/**
 * Converts Julian Day Number (JD) to a JavaScript Date object.
 * 
 * This function performs the inverse operation of dateToJulianDay,
 * converting a Julian Day Number back to a calendar date and time.
 * 
 * Algorithm:
 * 1. Split JD into integer and fractional parts
 * 2. Apply Gregorian calendar correction if applicable
 * 3. Calculate year, month, and day using Meeus formula
 * 4. Extract time components from fractional day
 * 5. Construct JavaScript Date object in UTC
 * 
 * @param julianDay - Julian Day Number
 * @returns JavaScript Date object (UTC)
 * @throws {ValidationError} If Julian Day is out of valid range
 * 
 * @example
 * ```typescript
 * // J2000.0 epoch
 * const date = julianDayToDate(2451545.0);
 * console.log(date.toISOString()); // '2000-01-01T12:00:00.000Z'
 * 
 * // Convert back and forth
 * const jd = dateToJulianDay(new Date());
 * const date2 = julianDayToDate(jd);
 * ```
 */
export function julianDayToDate(julianDay: number): Date {
  // Validate input
  if (typeof julianDay !== 'number' || isNaN(julianDay)) {
    throw new ValidationError('Invalid Julian Day: must be a number', { julianDay });
  }
  
  if (julianDay < MIN_JULIAN_DAY || julianDay > MAX_JULIAN_DAY) {
    throw new ValidationError(
      `Julian Day out of valid range [${MIN_JULIAN_DAY}, ${MAX_JULIAN_DAY}]`,
      { julianDay, min: MIN_JULIAN_DAY, max: MAX_JULIAN_DAY }
    );
  }

  // Split into integer and fractional parts
  const jd = julianDay + 0.5;
  const Z = Math.floor(jd);
  const F = jd - Z;
  
  let A = Z;
  
  // Apply Gregorian calendar correction for dates after 1582-10-15
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  
  // Calculate day (with fractional part)
  const day = B - D - Math.floor(30.6001 * E) + F;
  const dayInt = Math.floor(day);
  const dayFrac = day - dayInt;
  
  // Calculate month
  const month = E < 14 ? E - 1 : E - 13;
  
  // Calculate year
  const year = month > 2 ? C - 4716 : C - 4715;
  
  // Extract time components from fractional day
  const hours = dayFrac * 24;
  const hour = Math.floor(hours);
  const minutes = (hours - hour) * 60;
  const minute = Math.floor(minutes);
  const seconds = (minutes - minute) * 60;
  const second = Math.floor(seconds);
  const millisecond = Math.floor((seconds - second) * 1000);
  
  return new Date(Date.UTC(year, month - 1, dayInt, hour, minute, second, millisecond));
}

/**
 * Calculates Julian centuries since J2000.0 epoch.
 * 
 * A Julian century is exactly 36525 days. This unit is commonly used
 * in astronomical calculations for time-dependent orbital elements.
 * 
 * @param julianDay - Julian Day Number
 * @returns Julian centuries since J2000.0
 * @throws {ValidationError} If Julian Day is invalid
 * 
 * @example
 * ```typescript
 * // At J2000.0 epoch
 * const T = julianCenturies(2451545.0);
 * console.log(T); // 0.0
 * 
 * // One century after J2000.0
 * const T2 = julianCenturies(2451545.0 + 36525);
 * console.log(T2); // 1.0
 * ```
 */
export function julianCenturies(julianDay: number): number {
  if (typeof julianDay !== 'number' || isNaN(julianDay)) {
    throw new ValidationError('Invalid Julian Day: must be a number', { julianDay });
  }
  
  return (julianDay - J2000) / 36525.0;
}

/**
 * Gets the current time as Julian Day Number.
 * 
 * This is a convenience function that converts the current system time
 * to Julian Day format.
 * 
 * @returns Current Julian Day Number
 * 
 * @example
 * ```typescript
 * const jd = nowJulianDay();
 * console.log(`Current JD: ${jd}`);
 * ```
 */
export function nowJulianDay(): number {
  return dateToJulianDay(new Date());
}

/**
 * Formats a Julian Day Number as an ISO 8601 string.
 * 
 * This function converts a Julian Day to a human-readable date string
 * in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).
 * 
 * @param julianDay - Julian Day Number
 * @returns ISO 8601 formatted date string
 * @throws {ValidationError} If Julian Day is invalid
 * 
 * @example
 * ```typescript
 * const formatted = formatJulianDay(2451545.0);
 * console.log(formatted); // '2000-01-01T12:00:00.000Z'
 * ```
 */
export function formatJulianDay(julianDay: number): string {
  const date = julianDayToDate(julianDay);
  return date.toISOString();
}