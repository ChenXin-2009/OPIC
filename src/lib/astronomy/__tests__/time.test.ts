import {
  dateToJulianDay,
  julianDayToDate,
  julianCenturies,
  nowJulianDay,
  formatJulianDay,
  J2000,
} from '../time';
import { ValidationError } from '@/lib/errors/base';

describe('J2000 constant', () => {
  it('should be 2451545.0', () => {
    expect(J2000).toBe(2451545.0);
  });
});

describe('dateToJulianDay', () => {
  it('should return J2000 for 2000-01-01T12:00:00Z', () => {
    const date = new Date('2000-01-01T12:00:00Z');
    expect(dateToJulianDay(date)).toBeCloseTo(2451545.0, 10);
  });

  it('should convert a known date correctly', () => {
    const date = new Date('2024-07-12T00:00:00Z');
    const jd = dateToJulianDay(date);
    expect(jd).toBeCloseTo(2460503.5, 10);
  });

  it('should handle pre-Gregorian dates (Julian calendar)', () => {
    const date = new Date('1500-03-01T00:00:00Z');
    const jd = dateToJulianDay(date);
    expect(jd).toBeGreaterThan(0);
    expect(typeof jd).toBe('number');
  });

  it('should throw ValidationError for invalid Date (NaN time)', () => {
    const invalidDate = new Date('not-a-date');
    expect(() => dateToJulianDay(invalidDate)).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-Date input', () => {
    expect(() => dateToJulianDay(null as unknown as Date)).toThrow(ValidationError);
    expect(() => dateToJulianDay(undefined as unknown as Date)).toThrow(ValidationError);
    expect(() => dateToJulianDay('2024-01-01' as unknown as Date)).toThrow(ValidationError);
    expect(() => dateToJulianDay(12345 as unknown as Date)).toThrow(ValidationError);
  });

  it('should handle dates at different times of day', () => {
    const midnight = dateToJulianDay(new Date('2024-01-01T00:00:00Z'));
    const noon = dateToJulianDay(new Date('2024-01-01T12:00:00Z'));
    expect(noon - midnight).toBeCloseTo(0.5, 10);
  });

  it('should handle leap year dates', () => {
    const date = new Date('2020-02-29T12:00:00Z');
    const jd = dateToJulianDay(date);
    expect(jd).toBeGreaterThan(0);
    expect(typeof jd).toBe('number');
  });

  it('should return a number for current time', () => {
    const jd = dateToJulianDay(new Date());
    expect(typeof jd).toBe('number');
    expect(jd).toBeGreaterThan(2450000);
  });
});

describe('julianDayToDate', () => {
  it('should convert J2000 back to 2000-01-01T12:00:00Z', () => {
    const date = julianDayToDate(2451545.0);
    expect(date.toISOString()).toBe('2000-01-01T12:00:00.000Z');
  });

  it('should round-trip dateToJulianDay -> julianDayToDate', () => {
    const original = new Date('2024-06-15T00:00:00Z');
    const jd = dateToJulianDay(original);
    const restored = julianDayToDate(jd);
    expect(restored.toISOString()).toBe(original.toISOString());
  });

  it('should round-trip with time component', () => {
    const original = new Date('2023-12-25T12:00:00Z');
    const jd = dateToJulianDay(original);
    const restored = julianDayToDate(jd);
    expect(restored.toISOString()).toBe(original.toISOString());
  });

  it('should handle a large JD (future date)', () => {
    const date = julianDayToDate(3000000.0);
    expect(date.getUTCFullYear()).toBeGreaterThan(3000);
    expect(date.getTime()).not.toBeNaN();
  });

  it('should throw ValidationError for NaN', () => {
    expect(() => julianDayToDate(NaN)).toThrow(ValidationError);
  });

  it('should throw ValidationError for out of range (too small)', () => {
    expect(() => julianDayToDate(-1)).toThrow(ValidationError);
  });

  it('should throw ValidationError for out of range (too large)', () => {
    expect(() => julianDayToDate(6000000.0)).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-number input', () => {
    expect(() => julianDayToDate('hello' as unknown as number)).toThrow(ValidationError);
    expect(() => julianDayToDate(null as unknown as number)).toThrow(ValidationError);
    expect(() => julianDayToDate(undefined as unknown as number)).toThrow(ValidationError);
  });
});

describe('julianCenturies', () => {
  it('should return 0 at J2000', () => {
    expect(julianCenturies(2451545.0)).toBe(0);
  });

  it('should return 1 one Julian century later', () => {
    expect(julianCenturies(2451545.0 + 36525)).toBeCloseTo(1.0, 10);
  });

  it('should return -1 one Julian century before J2000', () => {
    expect(julianCenturies(2451545.0 - 36525)).toBeCloseTo(-1.0, 10);
  });

  it('should return a positive value for current dates', () => {
    const now = nowJulianDay();
    const centuries = julianCenturies(now);
    expect(centuries).toBeGreaterThan(0);
    expect(centuries).toBeLessThan(1);
  });

  it('should throw ValidationError for NaN', () => {
    expect(() => julianCenturies(NaN)).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-number input', () => {
    expect(() => julianCenturies('invalid' as unknown as number)).toThrow(ValidationError);
  });
});

describe('nowJulianDay', () => {
  it('should return a number', () => {
    const jd = nowJulianDay();
    expect(typeof jd).toBe('number');
  });

  it('should return a value greater than J2000', () => {
    expect(nowJulianDay()).toBeGreaterThan(J2000);
  });

  it('should return consistent values within a short interval', () => {
    const jd1 = nowJulianDay();
    const jd2 = nowJulianDay();
    const diff = Math.abs(jd2 - jd1);
    expect(diff).toBeLessThan(0.01);
  });
});

describe('formatJulianDay', () => {
  it('should format J2000 as ISO string', () => {
    expect(formatJulianDay(2451545.0)).toBe('2000-01-01T12:00:00.000Z');
  });

  it('should format a modern date correctly', () => {
    const jd = dateToJulianDay(new Date('2024-12-25T00:00:00Z'));
    const formatted = formatJulianDay(jd);
    expect(formatted).toBe('2024-12-25T00:00:00.000Z');
  });

  it('should throw ValidationError for invalid JD (propagated)', () => {
    expect(() => formatJulianDay(NaN)).toThrow(ValidationError);
    expect(() => formatJulianDay(-1)).toThrow(ValidationError);
  });
});
