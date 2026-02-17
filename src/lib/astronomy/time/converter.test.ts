/**
 * Unit tests for TimeScaleConverter
 * 
 * Tests UTC to TDB conversion chain and edge cases.
 */

import { TimeScaleConverter } from './converter';
import { LeapSecondTable } from './types';

describe('TimeScaleConverter', () => {
  const converter = new TimeScaleConverter();

  describe('UTC to TDB conversion', () => {
    it('should convert J2000.0 epoch correctly', () => {
      // J2000.0 = 2000-01-01 12:00:00 UTC
      const utc = new Date('2000-01-01T12:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // J2000.0 in TDB should be close to 2451545.0
      // With leap seconds (32) and TT-TDB correction (~32.184 seconds)
      // Total offset is about 64 seconds = 0.00074 days
      expect(jd_tdb).toBeCloseTo(2451545.0, 2);
    });

    it('should handle leap second transitions', () => {
      // Test date after 2017-01-01 leap second (37 leap seconds)
      const utc = new Date('2020-01-01T00:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // Should be a valid Julian Date
      expect(jd_tdb).toBeGreaterThan(2451545.0);
      expect(jd_tdb).toBeLessThan(2500000.0);
    });

    it('should handle dates before 1972 (no leap seconds)', () => {
      // Before leap seconds were introduced
      const utc = new Date('1970-01-01T00:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // Unix epoch = JD 2440587.5
      expect(jd_tdb).toBeCloseTo(2440587.5, 2);
    });

    it('should handle far future dates', () => {
      // Test year 2100
      const utc = new Date('2100-01-01T00:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // Should be a valid Julian Date
      expect(jd_tdb).toBeGreaterThan(2451545.0);
      expect(jd_tdb).toBeLessThan(2500000.0);
    });
  });

  describe('TDB to UTC conversion', () => {
    it('should convert J2000.0 epoch back to UTC', () => {
      const jd_tdb = 2451545.0;
      const utc = converter.tdbToUTC(jd_tdb);
      
      // Should be close to 2000-01-01 12:00:00 UTC
      // But JD 2451545.0 in TDB is actually before noon in UTC due to leap seconds
      const expected = new Date('2000-01-01T11:58:55.816Z'); // Approximately
      const diff = Math.abs(utc.getTime() - expected.getTime());
      
      // Allow 2 seconds difference due to approximations
      expect(diff).toBeLessThan(2000);
    });

    it('should handle modern dates', () => {
      const jd_tdb = 2459580.5; // Approximately 2022-01-01
      const utc = converter.tdbToUTC(jd_tdb);
      
      // Should be in 2022
      expect(utc.getFullYear()).toBe(2022);
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve UTC time within 1 millisecond', () => {
      const original = new Date('2020-06-15T14:30:45.123Z');
      const jd_tdb = converter.utcToTDB(original);
      const roundtrip = converter.tdbToUTC(jd_tdb);
      
      const diff = Math.abs(roundtrip.getTime() - original.getTime());
      expect(diff).toBeLessThan(1);
    });

    it('should handle multiple round-trips', () => {
      const original = new Date('2015-07-01T00:00:00.000Z');
      
      let current = original;
      for (let i = 0; i < 5; i++) {
        const jd_tdb = converter.utcToTDB(current);
        current = converter.tdbToUTC(jd_tdb);
      }
      
      const diff = Math.abs(current.getTime() - original.getTime());
      expect(diff).toBeLessThan(5);
    });
  });

  describe('Custom leap second table', () => {
    it('should accept custom leap second table', () => {
      const customTable: LeapSecondTable = {
        entries: [
          { jd: 2441317.5, leapSeconds: 10 }, // 1972-01-01
          { jd: 2441499.5, leapSeconds: 11 }  // 1972-07-01
        ]
      };
      
      const customConverter = new TimeScaleConverter(customTable);
      const utc = new Date('1972-08-01T00:00:00.000Z');
      const jd_tdb = customConverter.utcToTDB(utc);
      
      expect(jd_tdb).toBeGreaterThan(0);
    });

    it('should allow loading leap seconds after construction', () => {
      const newConverter = new TimeScaleConverter();
      
      const customTable: LeapSecondTable = {
        entries: [
          { jd: 2441317.5, leapSeconds: 10 }
        ]
      };
      
      newConverter.loadLeapSeconds(customTable);
      
      const utc = new Date('1972-01-01T00:00:00.000Z');
      const jd_tdb = newConverter.utcToTDB(utc);
      
      expect(jd_tdb).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle midnight times', () => {
      const utc = new Date('2020-01-01T00:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      const roundtrip = converter.tdbToUTC(jd_tdb);
      
      const diff = Math.abs(roundtrip.getTime() - utc.getTime());
      expect(diff).toBeLessThan(1);
    });

    it('should handle noon times', () => {
      const utc = new Date('2020-01-01T12:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      const roundtrip = converter.tdbToUTC(jd_tdb);
      
      const diff = Math.abs(roundtrip.getTime() - utc.getTime());
      expect(diff).toBeLessThan(1);
    });

    it('should handle millisecond precision', () => {
      const utc = new Date('2020-01-01T12:34:56.789Z');
      const jd_tdb = converter.utcToTDB(utc);
      const roundtrip = converter.tdbToUTC(jd_tdb);
      
      const diff = Math.abs(roundtrip.getTime() - utc.getTime());
      // Allow up to 2ms due to floating point precision
      expect(diff).toBeLessThan(2);
    });
  });

  describe('Known UTC/TDB pairs', () => {
    it('should match known conversion for 2020-01-01', () => {
      // 2020-01-01 00:00:00 UTC
      const utc = new Date('2020-01-01T00:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // Expected JD (UTC) = 2458849.5
      // With leap seconds (37) and TT-TDB correction, should be close to:
      // 2458849.5 + 37/86400 + 32.184/86400 + ~0.001657/86400
      const expected = 2458849.5 + (37 + 32.184) / 86400;
      
      expect(jd_tdb).toBeCloseTo(expected, 4);
    });

    it('should match known conversion for 2000-01-01 12:00:00', () => {
      // J2000.0 epoch
      const utc = new Date('2000-01-01T12:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // At J2000.0, there were 32 leap seconds
      // JD (UTC) = 2451545.0
      // JD (TDB) ≈ 2451545.0 + (32 + 32.184)/86400
      const expected = 2451545.0 + (32 + 32.184) / 86400;
      
      expect(jd_tdb).toBeCloseTo(expected, 4);
    });
  });

  describe('Time scale differences', () => {
    it('should show correct TAI-UTC difference (leap seconds)', () => {
      // After 2017-01-01, there are 37 leap seconds
      const utc = new Date('2020-01-01T00:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // The difference should include 37 leap seconds
      const jd_utc = 2458849.5;
      const diff_seconds = (jd_tdb - jd_utc) * 86400;
      
      // Should be approximately 37 + 32.184 = 69.184 seconds
      expect(diff_seconds).toBeGreaterThan(69);
      expect(diff_seconds).toBeLessThan(70);
    });

    it('should show TT-TDB correction is small', () => {
      const utc = new Date('2020-01-01T00:00:00.000Z');
      const jd_tdb = converter.utcToTDB(utc);
      
      // TT-TDB correction should be < 2 milliseconds
      // Total difference is leap seconds + 32.184 + TT-TDB
      const jd_utc = 2458849.5;
      const diff_seconds = (jd_tdb - jd_utc) * 86400;
      const tt_tdb_correction = diff_seconds - 37 - 32.184;
      
      expect(Math.abs(tt_tdb_correction)).toBeLessThan(0.002);
    });
  });
});
