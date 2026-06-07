import {
  calculateTimeControlOpacity,
  formatTime,
  formatDate,
  formatTimeDiff,
  calculateTimeDiff,
  shouldShowPrecisionWarning,
  createDateWithPreservedTime,
} from '../TimeControl.helpers';

describe('calculateTimeControlOpacity', () => {
  it('should return 1 when exoplanet is selected', () => {
    expect(calculateTimeControlOpacity(999999, true)).toBe(1);
  });

  it('should return 1 for close distances', () => {
    expect(calculateTimeControlOpacity(0)).toBe(1);
    expect(calculateTimeControlOpacity(2999)).toBe(1);
  });

  it('should return 0 for distances beyond fade end', () => {
    expect(calculateTimeControlOpacity(5001)).toBe(0);
    expect(calculateTimeControlOpacity(10000)).toBe(0);
  });

  it('should interpolate in fade range', () => {
    const mid = calculateTimeControlOpacity(4000);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(calculateTimeControlOpacity(3000)).toBe(1);
    expect(calculateTimeControlOpacity(5000)).toBe(0);
  });
});

describe('formatTime', () => {
  it('should format time as HH:MM:SS', () => {
    const date = new Date(2024, 0, 1, 9, 5, 3);
    expect(formatTime(date)).toBe('09:05:03');
  });

  it('should pad single digits with zero', () => {
    const date = new Date(2024, 0, 1, 1, 2, 4);
    expect(formatTime(date)).toBe('01:02:04');
  });
});

describe('formatDate', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 5);
    expect(formatDate(date)).toBe('2024-01-05');
  });

  it('should pad month and day', () => {
    const date = new Date(2024, 11, 3);
    expect(formatDate(date)).toBe('2024-12-03');
  });
});

describe('formatTimeDiff', () => {
  it('should format minutes in Chinese', () => {
    expect(formatTimeDiff(0.01, 'zh')).toContain('分钟');
  });

  it('should format minutes in English', () => {
    expect(formatTimeDiff(0.01, 'en')).toMatch(/m$/);
  });

  it('should format hours in Chinese', () => {
    expect(formatTimeDiff(0.1, 'zh')).toContain('小时');
  });

  it('should format days in Chinese', () => {
    expect(formatTimeDiff(5, 'zh')).toContain('天');
  });

  it('should format days in English', () => {
    expect(formatTimeDiff(5, 'en')).toContain('days');
  });

  it('should format years in Chinese', () => {
    expect(formatTimeDiff(500, 'zh')).toContain('年');
  });

  it('should format years with remaining days in Chinese', () => {
    const result = formatTimeDiff(400, 'zh');
    expect(result).toContain('年');
    expect(result).toContain('天');
  });

  it('should format years in English', () => {
    expect(formatTimeDiff(730.5, 'en')).toContain('years');
  });

  it('should use absolute value', () => {
    expect(formatTimeDiff(-5, 'zh')).toBe(formatTimeDiff(5, 'zh'));
  });
});

describe('calculateTimeDiff', () => {
  it('should return 0 when realTime is null', () => {
    expect(calculateTimeDiff(new Date(), null)).toBe(0);
  });

  it('should return positive for future dates', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const future = new Date('2024-01-11T00:00:00Z');
    expect(calculateTimeDiff(future, now)).toBeCloseTo(10, 0);
  });

  it('should return negative for past dates', () => {
    const now = new Date('2024-01-11T00:00:00Z');
    const past = new Date('2024-01-01T00:00:00Z');
    expect(calculateTimeDiff(past, now)).toBeCloseTo(-10, 0);
  });
});

describe('shouldShowPrecisionWarning', () => {
  it('should return false for small differences', () => {
    expect(shouldShowPrecisionWarning(1)).toBe(false);
    expect(shouldShowPrecisionWarning(36524)).toBe(false);
  });

  it('should return true for differences over 100 years', () => {
    expect(shouldShowPrecisionWarning(36526)).toBe(true);
  });

  it('should handle negative values', () => {
    expect(shouldShowPrecisionWarning(-36526)).toBe(true);
  });
});

describe('createDateWithPreservedTime', () => {
  it('should create date with preserved time', () => {
    const current = new Date(2024, 5, 15, 10, 30, 45);
    const result = createDateWithPreservedTime('2024-12-25', current);
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2024);
    expect(result!.getMonth()).toBe(11);
    expect(result!.getDate()).toBe(25);
    expect(result!.getHours()).toBe(10);
    expect(result!.getMinutes()).toBe(30);
    expect(result!.getSeconds()).toBe(45);
  });

  it('should return null for invalid date string', () => {
    const result = createDateWithPreservedTime('not-a-date', new Date());
    expect(result).toBeNull();
  });
});
