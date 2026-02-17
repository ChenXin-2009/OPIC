/**
 * Time Scale Converter
 * 
 * Converts between UTC, TAI, TT, and TDB time scales for astronomical calculations.
 * 
 * Conversion chain: UTC → TAI → TT → TDB
 * - UTC to TAI: Add leap seconds
 * - TAI to TT: Add 32.184 seconds
 * - TT to TDB: Apply periodic correction (Fairhead & Bretagnon 1990)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { LeapSecondTable } from './types';

/**
 * Default leap second table (1972-2024)
 * Source: IERS Bulletin C
 */
const DEFAULT_LEAP_SECONDS: LeapSecondTable = {
  entries: [
    { jd: 2441317.5, leapSeconds: 10 }, // 1972-01-01
    { jd: 2441499.5, leapSeconds: 11 }, // 1972-07-01
    { jd: 2441683.5, leapSeconds: 12 }, // 1973-01-01
    { jd: 2442048.5, leapSeconds: 13 }, // 1974-01-01
    { jd: 2442413.5, leapSeconds: 14 }, // 1975-01-01
    { jd: 2442778.5, leapSeconds: 15 }, // 1976-01-01
    { jd: 2443144.5, leapSeconds: 16 }, // 1977-01-01
    { jd: 2443509.5, leapSeconds: 17 }, // 1978-01-01
    { jd: 2443874.5, leapSeconds: 18 }, // 1979-01-01
    { jd: 2444239.5, leapSeconds: 19 }, // 1980-01-01
    { jd: 2444786.5, leapSeconds: 20 }, // 1981-07-01
    { jd: 2445151.5, leapSeconds: 21 }, // 1982-07-01
    { jd: 2445516.5, leapSeconds: 22 }, // 1983-07-01
    { jd: 2446247.5, leapSeconds: 23 }, // 1985-07-01
    { jd: 2447161.5, leapSeconds: 24 }, // 1988-01-01
    { jd: 2447892.5, leapSeconds: 25 }, // 1990-01-01
    { jd: 2448257.5, leapSeconds: 26 }, // 1991-01-01
    { jd: 2448804.5, leapSeconds: 27 }, // 1992-07-01
    { jd: 2449169.5, leapSeconds: 28 }, // 1993-07-01
    { jd: 2449534.5, leapSeconds: 29 }, // 1994-07-01
    { jd: 2450083.5, leapSeconds: 30 }, // 1996-01-01
    { jd: 2450630.5, leapSeconds: 31 }, // 1997-07-01
    { jd: 2451179.5, leapSeconds: 32 }, // 1999-01-01
    { jd: 2453736.5, leapSeconds: 33 }, // 2006-01-01
    { jd: 2454832.5, leapSeconds: 34 }, // 2009-01-01
    { jd: 2456109.5, leapSeconds: 35 }, // 2012-07-01
    { jd: 2457204.5, leapSeconds: 36 }, // 2015-07-01
    { jd: 2457754.5, leapSeconds: 37 }  // 2017-01-01
  ]
};

/**
 * TimeScaleConverter handles conversions between UTC, TAI, TT, and TDB time scales
 */
export class TimeScaleConverter {
  private leapSecondTable: LeapSecondTable;

  constructor(leapSecondTable?: LeapSecondTable) {
    this.leapSecondTable = leapSecondTable || DEFAULT_LEAP_SECONDS;
  }

  /**
   * Load a custom leap second table
   * @param table Leap second table to use
   */
  loadLeapSeconds(table: LeapSecondTable): void {
    this.leapSecondTable = table;
  }

  /**
   * Convert UTC Date to Julian Date in TDB time scale
   * @param utc UTC date
   * @returns Julian Date in TDB
   */
  utcToTDB(utc: Date): number {
    // Step 1: Convert UTC Date to Julian Date in UTC
    const jd_utc = this.dateToJulianDate(utc);

    // Step 2: UTC to TAI (add leap seconds)
    const jd_tai = this.utcToTAI(jd_utc);

    // Step 3: TAI to TT (add 32.184 seconds)
    const jd_tt = this.taiToTT(jd_tai);

    // Step 4: TT to TDB (apply periodic correction)
    const jd_tdb = this.ttToTDB(jd_tt);

    return jd_tdb;
  }

  /**
   * Convert Julian Date in TDB to UTC Date
   * @param jd_tdb Julian Date in TDB
   * @returns UTC date
   */
  tdbToUTC(jd_tdb: number): Date {
    // Step 1: TDB to TT (reverse periodic correction)
    const jd_tt = this.tdbToTT(jd_tdb);

    // Step 2: TT to TAI (subtract 32.184 seconds)
    const jd_tai = this.ttToTAI(jd_tt);

    // Step 3: TAI to UTC (subtract leap seconds)
    const jd_utc = this.taiToUTC(jd_tai);

    // Step 4: Convert Julian Date to Date object
    return this.julianDateToDate(jd_utc);
  }

  /**
   * Convert JavaScript Date to Julian Date (UTC)
   * @param date JavaScript Date object
   * @returns Julian Date in UTC
   */
  private dateToJulianDate(date: Date): number {
    // Get time in milliseconds since Unix epoch
    const unixTime = date.getTime();
    
    // Convert to Julian Date
    // Unix epoch (1970-01-01 00:00:00) = JD 2440587.5
    const jd = 2440587.5 + unixTime / 86400000;
    
    return jd;
  }

  /**
   * Convert Julian Date to JavaScript Date (UTC)
   * @param jd Julian Date
   * @returns JavaScript Date object
   */
  private julianDateToDate(jd: number): Date {
    // Convert Julian Date to Unix time
    const unixTime = (jd - 2440587.5) * 86400000;
    
    return new Date(unixTime);
  }

  /**
   * Convert UTC to TAI by adding leap seconds
   * @param jd_utc Julian Date in UTC
   * @returns Julian Date in TAI
   */
  private utcToTAI(jd_utc: number): number {
    const leapSeconds = this.getLeapSeconds(jd_utc);
    
    // Add leap seconds (convert to days)
    return jd_utc + leapSeconds / 86400;
  }

  /**
   * Convert TAI to UTC by subtracting leap seconds
   * @param jd_tai Julian Date in TAI
   * @returns Julian Date in UTC
   */
  private taiToUTC(jd_tai: number): number {
    // For reverse conversion, we need to find the leap seconds
    // at the approximate UTC time. Use iterative approach.
    let jd_utc = jd_tai;
    
    for (let i = 0; i < 3; i++) {
      const leapSeconds = this.getLeapSeconds(jd_utc);
      jd_utc = jd_tai - leapSeconds / 86400;
    }
    
    return jd_utc;
  }

  /**
   * Get leap seconds for a given Julian Date
   * @param jd Julian Date
   * @returns Number of leap seconds
   */
  private getLeapSeconds(jd: number): number {
    const entries = this.leapSecondTable.entries;
    
    // If before first entry (before 1972), no leap seconds
    if (jd < entries[0].jd) {
      return 0;
    }
    
    // Find the appropriate leap second value
    for (let i = entries.length - 1; i >= 0; i--) {
      if (jd >= entries[i].jd) {
        return entries[i].leapSeconds;
      }
    }
    
    // Should never reach here, but return 0 as fallback
    return 0;
  }

  /**
   * Convert TAI to TT by adding 32.184 seconds
   * @param jd_tai Julian Date in TAI
   * @returns Julian Date in TT
   */
  private taiToTT(jd_tai: number): number {
    // TT = TAI + 32.184 seconds
    return jd_tai + 32.184 / 86400;
  }

  /**
   * Convert TT to TAI by subtracting 32.184 seconds
   * @param jd_tt Julian Date in TT
   * @returns Julian Date in TAI
   */
  private ttToTAI(jd_tt: number): number {
    // TAI = TT - 32.184 seconds
    return jd_tt - 32.184 / 86400;
  }

  /**
   * Convert TT to TDB using simplified formula
   * Accuracy: ±2 ms relative to SPICE TDB
   * Formula: Fairhead & Bretagnon 1990
   * 
   * @param jd_tt Julian Date in TT
   * @returns Julian Date in TDB
   */
  private ttToTDB(jd_tt: number): number {
    // Number of Julian centuries since J2000.0
    const T = (jd_tt - 2451545.0) / 36525;
    
    // Mean anomaly of Earth (degrees)
    const M = 357.5277233 + 35999.05034 * T;
    
    // Convert to radians
    const M_rad = M * Math.PI / 180;
    
    // TDB - TT correction in seconds (simplified formula)
    const correction_sec = 0.001657 * Math.sin(M_rad) + 0.000022 * Math.sin(2 * M_rad);
    
    // Convert to days and add to TT
    return jd_tt + correction_sec / 86400;
  }

  /**
   * Convert TDB to TT using iterative approach
   * @param jd_tdb Julian Date in TDB
   * @returns Julian Date in TT
   */
  private tdbToTT(jd_tdb: number): number {
    // Use iterative approach since TT->TDB is not easily invertible
    let jd_tt = jd_tdb;
    
    // Iterate to converge (typically 1-2 iterations sufficient)
    for (let i = 0; i < 3; i++) {
      const jd_tdb_computed = this.ttToTDB(jd_tt);
      const error = jd_tdb - jd_tdb_computed;
      jd_tt += error;
    }
    
    return jd_tt;
  }
}
