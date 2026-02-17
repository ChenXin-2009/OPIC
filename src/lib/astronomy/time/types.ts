/**
 * Time scale conversion types
 * 
 * This module defines types for time scale conversions between
 * UTC, TAI, TT, and TDB time standards.
 */

/**
 * Leap second table entry
 */
export interface LeapSecondEntry {
  jd: number;           // Julian Date when leap second was added
  leapSeconds: number;  // Total leap seconds at this date
}

/**
 * Leap second table
 */
export interface LeapSecondTable {
  entries: LeapSecondEntry[];
}

/**
 * Time scale identifiers
 */
export enum TimeScale {
  UTC = 'UTC',
  TAI = 'TAI',
  TT = 'TT',
  TDB = 'TDB'
}
