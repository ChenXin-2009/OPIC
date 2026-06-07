import {
  validateSpeedZoneConfig,
  calculateSpeed,
  formatSpeedLabel,
  normalizePosition,
} from '../TimeSlider.helpers';

const mockZones = [
  { name: 'second', start: 0.05, end: 0.15, maxSpeed: 60 / 86400, exponent: 1.8, unit: { zh: '秒/秒', en: 's/s' } },
  { name: 'minute', start: 0.15, end: 0.3, maxSpeed: 60 / 1440, exponent: 1.8, unit: { zh: '分/秒', en: 'min/s' } },
  { name: 'hour', start: 0.3, end: 0.5, maxSpeed: 1, exponent: 2.0, unit: { zh: '时/秒', en: 'h/s' } },
  { name: 'day', start: 0.5, end: 0.7, maxSpeed: 30, exponent: 2.0, unit: { zh: '天/秒', en: 'd/s' } },
  { name: 'month', start: 0.7, end: 0.85, maxSpeed: 365, exponent: 2.2, unit: { zh: '月/秒', en: 'm/s' } },
  { name: 'year', start: 0.85, end: 1.0, maxSpeed: 1095, exponent: 2.5, unit: { zh: '年/秒', en: 'y/s' } },
];

describe('validateSpeedZoneConfig', () => {
  it('should return valid for correct config', () => {
    const result = validateSpeedZoneConfig(mockZones, 0.05);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return error for invalid deadZone', () => {
    const result = validateSpeedZoneConfig(mockZones, 0.6);
    expect(result.errors.some(e => e.includes('死区'))).toBe(true);
  });

  it('should return error for empty zones', () => {
    const result = validateSpeedZoneConfig([], 0.05);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('为空'))).toBe(true);
  });

  it('should error when first zone start != deadZone', () => {
    const result = validateSpeedZoneConfig([{ ...mockZones[0], start: 0.1 }], 0.05);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should error when zone boundaries exceed [0,1]', () => {
    const result = validateSpeedZoneConfig([{ ...mockZones[0], start: -0.1 }], 0.05);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should error when start >= end', () => {
    const result = validateSpeedZoneConfig([{ ...mockZones[0], start: 0.2, end: 0.1 }], 0.05);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should error when maxSpeed is negative', () => {
    const result = validateSpeedZoneConfig([{ ...mockZones[0], maxSpeed: -1 }], 0.05);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should error when exponent <= 0', () => {
    const result = validateSpeedZoneConfig([{ ...mockZones[0], exponent: 0 }], 0.05);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should error on adjacent zone discontinuity', () => {
    const badZones = [
      { ...mockZones[0] },
      { ...mockZones[1], start: 0.2 },
    ];
    const result = validateSpeedZoneConfig(badZones, 0.05);
    expect(result.errors.some(e => e.includes('不连续'))).toBe(true);
  });

  it('should error when last zone end != 1', () => {
    const result = validateSpeedZoneConfig([{ ...mockZones[0], end: 0.5 }], 0.05);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('calculateSpeed', () => {
  beforeEach(() => {
    calculateSpeed.configValidated = false;
  });

  it('should return speed 0 in dead zone', () => {
    const result = calculateSpeed(0.5);
    expect(result.speed).toBe(0);
    expect(result.direction).toBe('forward');
  });

  it('should return forward direction for position > 0.5', () => {
    const result = calculateSpeed(0.8);
    expect(result.direction).toBe('forward');
    expect(result.speed).toBeGreaterThan(0);
  });

  it('should return backward direction for position < 0.5', () => {
    const result = calculateSpeed(0.2);
    expect(result.direction).toBe('backward');
    expect(result.speed).toBeGreaterThan(0);
  });

  it('should clamp position to [0, 1]', () => {
    const below = calculateSpeed(-1);
    const above = calculateSpeed(2);
    expect(below.speed).toBeGreaterThanOrEqual(0);
    expect(above.speed).toBeGreaterThan(0);
  });
});

describe('formatSpeedLabel', () => {
  it('should return empty string for speed <= 0', () => {
    expect(formatSpeedLabel(0, 'zh')).toBe('');
    expect(formatSpeedLabel(-1, 'zh')).toBe('');
  });

  it('should return -- for NaN', () => {
    expect(formatSpeedLabel(NaN, 'zh')).toBe('--');
  });

  it('should return -- for Infinity', () => {
    expect(formatSpeedLabel(Infinity, 'zh')).toBe('--');
  });

  it('should format years per second', () => {
    const label = formatSpeedLabel(400, 'zh');
    expect(label).toContain('年/秒');
  });

  it('should format months per second', () => {
    const label = formatSpeedLabel(50, 'zh');
    expect(label).toContain('月/秒');
  });

  it('should format days per second', () => {
    const label = formatSpeedLabel(5, 'zh');
    expect(label).toContain('天/秒');
  });

  it('should format hours per second', () => {
    const label = formatSpeedLabel(1 / 24, 'zh');
    expect(label).toContain('时/秒');
  });

  it('should format minutes per second', () => {
    const label = formatSpeedLabel(1 / 1440, 'zh');
    expect(label).toContain('分/秒');
  });

  it('should format seconds per second', () => {
    const label = formatSpeedLabel(1 / 86400, 'zh');
    expect(label).toContain('秒/秒');
  });

  it('should support English labels', () => {
    expect(formatSpeedLabel(400, 'en')).toContain('y/s');
    expect(formatSpeedLabel(5, 'en')).toContain('d/s');
  });

  it('should fallback to en for invalid lang', () => {
    const label = formatSpeedLabel(5, 'ja' as 'zh');
    expect(label).toContain('d/s');
  });
});

describe('normalizePosition', () => {
  it('should normalize clientX to position', () => {
    const rect = { left: 100 } as DOMRect;
    const result = normalizePosition(200, rect, 4, 200);
    expect(result).toBeCloseTo(0.48, 2);
  });

  it('should clamp position to [0, 1]', () => {
    const rect = { left: 0 } as DOMRect;
    expect(normalizePosition(-10, rect, 0, 100)).toBe(0);
    expect(normalizePosition(200, rect, 0, 100)).toBe(1);
  });
});
