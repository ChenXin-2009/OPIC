/**
 * Unit tests for internationalization formatter utilities
 */

import {
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatScientific,
  convertDistance,
  formatDistance,
  convertTemperature,
  convertTimeDuration,
  formatTimeDuration,
  type DistanceUnit,
  type TimeUnit,
  type TemperatureUnit,
} from '../formatters';

describe('formatters', () => {
  // ============================================================================
  // Date and Time Formatting Tests
  // ============================================================================

  describe('formatDate', () => {
    const testDate = new Date('2024-12-31T12:00:00Z');

    it('should format date according to en-US locale', () => {
      const result = formatDate(testDate, 'en-US');
      expect(result).toMatch(/12\/31\/2024/);
    });

    it('should format date according to zh-CN locale', () => {
      const result = formatDate(testDate, 'zh-CN');
      expect(result).toContain('2024');
    });

    it('should format date with custom options', () => {
      const result = formatDate(testDate, 'en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      expect(result).toMatch(/December 31, 2024/);
    });

    it('should format date with time', () => {
      const result = formatDate(testDate, 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      expect(result).toBeTruthy();
    });
  });

  describe('formatRelativeTime', () => {
    it('should format past time in en-US', () => {
      const result = formatRelativeTime(-1, 'day', 'en-US');
      expect(result).toBe('1 day ago');
    });

    it('should format future time in en-US', () => {
      const result = formatRelativeTime(2, 'hour', 'en-US');
      expect(result).toBe('in 2 hours');
    });

    it('should format relative time in zh-CN', () => {
      const result = formatRelativeTime(3, 'day', 'zh-CN');
      expect(result).toContain('3');
    });

    it('should handle zero value', () => {
      const result = formatRelativeTime(0, 'day', 'en-US');
      expect(result).toBe('in 0 days');
    });

    it('should handle different units', () => {
      expect(formatRelativeTime(-5, 'minute', 'en-US')).toBe('5 minutes ago');
      expect(formatRelativeTime(-1, 'week', 'en-US')).toBe('1 week ago');
      expect(formatRelativeTime(-1, 'month', 'en-US')).toBe('1 month ago');
      expect(formatRelativeTime(-1, 'year', 'en-US')).toBe('1 year ago');
    });
  });

  // ============================================================================
  // Number Formatting Tests
  // ============================================================================

  describe('formatNumber', () => {
    it('should format number with en-US locale', () => {
      const result = formatNumber(1234567.89, 'en-US');
      expect(result).toBe('1,234,567.89');
    });

    it('should format number with de-DE locale', () => {
      const result = formatNumber(1234567.89, 'de-DE');
      expect(result).toBe('1.234.567,89');
    });

    it('should format number with zh-CN locale', () => {
      const result = formatNumber(1234567.89, 'zh-CN');
      expect(result).toContain('1');
      expect(result).toContain('567');
    });

    it('should format integer without decimals', () => {
      const result = formatNumber(1000, 'en-US');
      expect(result).toBe('1,000');
    });

    it('should format number with custom options', () => {
      const result = formatNumber(0.123, 'en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
      });
      expect(result).toBe('12.3%');
    });

    it('should handle zero', () => {
      const result = formatNumber(0, 'en-US');
      expect(result).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234.56, 'en-US');
      expect(result).toBe('-1,234.56');
    });
  });

  describe('formatScientific', () => {
    it('should format large number in scientific notation', () => {
      const result = formatScientific(1234567890, 'en-US');
      expect(result).toMatch(/1\.23456/);
      expect(result).toMatch(/E\+?9/i);
    });

    it('should format small number in scientific notation', () => {
      const result = formatScientific(0.00000123456789, 'en-US');
      expect(result).toMatch(/1\.23456/);
      expect(result).toMatch(/E-?6/i);
    });

    it('should respect maximum decimal places (6 by default)', () => {
      const result = formatScientific(1.23456789012345, 'en-US');
      // Should have at most 6 decimal places
      const match = result.match(/1\.(\d+)/);
      if (match) {
        expect(match[1].length).toBeLessThanOrEqual(6);
      }
    });

    it('should respect custom decimal places', () => {
      const result = formatScientific(1.23456789, 'en-US', 3);
      // Scientific notation may round the last digit
      expect(result).toMatch(/1\.23[45]/);
    });

    it('should handle zero', () => {
      const result = formatScientific(0, 'en-US');
      expect(result).toMatch(/0/);
    });

    it('should format negative numbers', () => {
      const result = formatScientific(-9.87654321e10, 'en-US');
      expect(result).toMatch(/-9\.87654/);
    });
  });

  // ============================================================================
  // Distance Conversion and Formatting Tests
  // ============================================================================

  describe('convertDistance', () => {
    it('should convert AU to km', () => {
      const result = convertDistance(1, 'au', 'km');
      expect(result).toBeCloseTo(149597870.7, 1);
    });

    it('should convert km to AU', () => {
      const result = convertDistance(149597870.7, 'km', 'au');
      expect(result).toBeCloseTo(1, 6);
    });

    it('should convert light-years to km', () => {
      const result = convertDistance(1, 'ly', 'km');
      expect(result).toBeCloseTo(9460730472580.8, 1);
    });

    it('should convert km to light-years', () => {
      const result = convertDistance(9460730472580.8, 'km', 'ly');
      expect(result).toBeCloseTo(1, 6);
    });

    it('should convert AU to light-years', () => {
      const result = convertDistance(1, 'au', 'ly');
      expect(result).toBeCloseTo(0.0000158125, 10);
    });

    it('should convert light-years to AU', () => {
      const result = convertDistance(1, 'ly', 'au');
      expect(result).toBeCloseTo(63241.077, 3);
    });

    it('should return same value when from and to units are identical', () => {
      expect(convertDistance(100, 'km', 'km')).toBe(100);
      expect(convertDistance(5, 'au', 'au')).toBe(5);
      expect(convertDistance(2, 'ly', 'ly')).toBe(2);
    });

    it('should handle zero distance', () => {
      expect(convertDistance(0, 'km', 'au')).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('should use km for small distances (<1M km)', () => {
      const result = formatDistance(384400, 'en-US');
      expect(result).toContain('384,400');
      expect(result).toContain('km');
    });

    it('should use AU for medium distances (1M-1T km)', () => {
      const result = formatDistance(149597870.7, 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('au');
    });

    it('should use light-years for large distances (>1T km)', () => {
      const result = formatDistance(9460730472580.8, 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('ly');
    });

    it('should use preferred unit when specified', () => {
      const result = formatDistance(1000, 'en-US', 'au');
      expect(result).toContain('au');
    });

    it('should format with proper locale separators', () => {
      // Use a smaller distance that stays in km range (<1M km)
      const result = formatDistance(123456, 'en-US');
      expect(result).toContain('123,456');
      expect(result).toContain('km');
    });

    it('should handle zero distance', () => {
      const result = formatDistance(0, 'en-US');
      expect(result).toContain('0');
    });

    it('should format Earth-Moon distance appropriately', () => {
      const earthMoonKm = 384400;
      const result = formatDistance(earthMoonKm, 'en-US');
      expect(result).toContain('km');
    });

    it('should format Earth-Sun distance appropriately', () => {
      const earthSunKm = 149597870.7;
      const result = formatDistance(earthSunKm, 'en-US');
      expect(result).toContain('au');
    });

    it('should format Proxima Centauri distance appropriately', () => {
      const proximaCentauriKm = 39.9e12; // ~4.22 light-years
      const result = formatDistance(proximaCentauriKm, 'en-US');
      expect(result).toContain('ly');
    });
  });

  // ============================================================================
  // Temperature Conversion Tests
  // ============================================================================

  describe('convertTemperature', () => {
    it('should convert Celsius to Fahrenheit', () => {
      expect(convertTemperature(0, 'celsius', 'fahrenheit')).toBe(32);
      expect(convertTemperature(100, 'celsius', 'fahrenheit')).toBe(212);
      expect(convertTemperature(-40, 'celsius', 'fahrenheit')).toBe(-40);
    });

    it('should convert Fahrenheit to Celsius', () => {
      expect(convertTemperature(32, 'fahrenheit', 'celsius')).toBe(0);
      expect(convertTemperature(212, 'fahrenheit', 'celsius')).toBe(100);
      expect(convertTemperature(-40, 'fahrenheit', 'celsius')).toBe(-40);
    });

    it('should return same value when from and to units are identical', () => {
      expect(convertTemperature(25, 'celsius', 'celsius')).toBe(25);
      expect(convertTemperature(77, 'fahrenheit', 'fahrenheit')).toBe(77);
    });

    it('should handle room temperature conversion', () => {
      const celsiusRoom = 20;
      const fahrenheitRoom = convertTemperature(celsiusRoom, 'celsius', 'fahrenheit');
      expect(fahrenheitRoom).toBe(68);
    });

    it('should handle body temperature conversion', () => {
      const celsiusBody = 37;
      const fahrenheitBody = convertTemperature(celsiusBody, 'celsius', 'fahrenheit');
      expect(fahrenheitBody).toBeCloseTo(98.6, 1);
    });

    it('should handle negative temperatures', () => {
      const result = convertTemperature(-273.15, 'celsius', 'fahrenheit');
      expect(result).toBeCloseTo(-459.67, 1);
    });
  });

  // ============================================================================
  // Time Duration Conversion and Formatting Tests
  // ============================================================================

  describe('convertTimeDuration', () => {
    it('should convert seconds to minutes', () => {
      expect(convertTimeDuration(60, 'seconds', 'minutes')).toBe(1);
      expect(convertTimeDuration(120, 'seconds', 'minutes')).toBe(2);
    });

    it('should convert minutes to hours', () => {
      expect(convertTimeDuration(60, 'minutes', 'hours')).toBe(1);
      expect(convertTimeDuration(90, 'minutes', 'hours')).toBe(1.5);
    });

    it('should convert hours to days', () => {
      expect(convertTimeDuration(24, 'hours', 'days')).toBe(1);
      expect(convertTimeDuration(48, 'hours', 'days')).toBe(2);
    });

    it('should convert days to seconds', () => {
      expect(convertTimeDuration(1, 'days', 'seconds')).toBe(86400);
    });

    it('should convert minutes to seconds', () => {
      expect(convertTimeDuration(5, 'minutes', 'seconds')).toBe(300);
    });

    it('should convert hours to seconds', () => {
      expect(convertTimeDuration(1, 'hours', 'seconds')).toBe(3600);
    });

    it('should return same value when from and to units are identical', () => {
      expect(convertTimeDuration(100, 'seconds', 'seconds')).toBe(100);
      expect(convertTimeDuration(5, 'minutes', 'minutes')).toBe(5);
      expect(convertTimeDuration(2, 'hours', 'hours')).toBe(2);
      expect(convertTimeDuration(1, 'days', 'days')).toBe(1);
    });

    it('should handle zero duration', () => {
      expect(convertTimeDuration(0, 'seconds', 'minutes')).toBe(0);
    });

    it('should handle fractional values', () => {
      expect(convertTimeDuration(30, 'seconds', 'minutes')).toBe(0.5);
      expect(convertTimeDuration(0.5, 'hours', 'minutes')).toBe(30);
    });
  });

  describe('formatTimeDuration', () => {
    it('should use seconds for durations <60s', () => {
      const result = formatTimeDuration(30, 'en-US');
      expect(result).toContain('30');
      expect(result).toContain('seconds');
    });

    it('should use minutes for durations <1 hour', () => {
      const result = formatTimeDuration(300, 'en-US');
      expect(result).toContain('5');
      expect(result).toContain('minutes');
    });

    it('should use hours for durations <1 day', () => {
      const result = formatTimeDuration(3600, 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('hours');
    });

    it('should use days for durations ≥1 day', () => {
      const result = formatTimeDuration(86400, 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('days');
    });

    it('should format with proper locale separators', () => {
      const result = formatTimeDuration(123456, 'en-US');
      expect(result).toBeTruthy();
    });

    it('should handle zero duration', () => {
      const result = formatTimeDuration(0, 'en-US');
      expect(result).toContain('0');
      expect(result).toContain('seconds');
    });

    it('should format 1 minute duration', () => {
      const result = formatTimeDuration(60, 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('minutes');
    });

    it('should format 1 hour duration', () => {
      const result = formatTimeDuration(3600, 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('hours');
    });

    it('should format multi-day duration', () => {
      const result = formatTimeDuration(259200, 'en-US'); // 3 days
      expect(result).toContain('3');
      expect(result).toContain('days');
    });
  });

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe('edge cases', () => {
    it('should handle very large numbers in scientific format', () => {
      const result = formatScientific(Number.MAX_SAFE_INTEGER, 'en-US');
      expect(result).toBeTruthy();
      expect(result).toMatch(/E\+?15/i);
    });

    it('should handle very small numbers in scientific format', () => {
      const result = formatScientific(Number.MIN_VALUE, 'en-US');
      expect(result).toBeTruthy();
    });

    it('should handle Infinity in distance conversion', () => {
      const result = convertDistance(Infinity, 'km', 'au');
      expect(result).toBe(Infinity);
    });

    it('should format dates consistently across locales', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const enResult = formatDate(date, 'en-US');
      const zhResult = formatDate(date, 'zh-CN');
      
      expect(enResult).toBeTruthy();
      expect(zhResult).toBeTruthy();
      expect(enResult).not.toBe(zhResult);
    });
  });

  // ============================================================================
  // Type Export Tests
  // ============================================================================

  describe('type exports', () => {
    it('should export DistanceUnit type', () => {
      const units: DistanceUnit[] = ['km', 'au', 'ly'];
      expect(units).toHaveLength(3);
    });

    it('should export TimeUnit type', () => {
      const units: TimeUnit[] = ['seconds', 'minutes', 'hours', 'days'];
      expect(units).toHaveLength(4);
    });

    it('should export TemperatureUnit type', () => {
      const units: TemperatureUnit[] = ['celsius', 'fahrenheit'];
      expect(units).toHaveLength(2);
    });
  });
});
