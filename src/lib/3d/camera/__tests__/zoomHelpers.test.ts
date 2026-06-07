import {
  isValidDistance,
  calculateZoomFactor,
  applySafePenetrationDistance,
  clampDistance,
  calculateAdaptiveThreshold,
} from '../zoomHelpers';

describe('isValidDistance', () => {
  it('should return true for valid distances', () => {
    expect(isValidDistance(1)).toBe(true);
    expect(isValidDistance(0.001)).toBe(true);
    expect(isValidDistance(1000)).toBe(true);
  });

  it('should return false for NaN', () => {
    expect(isValidDistance(NaN)).toBe(false);
  });

  it('should return false for Infinity', () => {
    expect(isValidDistance(Infinity)).toBe(false);
    expect(isValidDistance(-Infinity)).toBe(false);
  });

  it('should return false for negative values', () => {
    expect(isValidDistance(-1)).toBe(false);
    expect(isValidDistance(0)).toBe(false);
  });
});

describe('calculateZoomFactor', () => {
  it('should return factor < 1 for zoom in', () => {
    expect(calculateZoomFactor(1, 0.1)).toBeLessThan(1);
    expect(calculateZoomFactor(0.5, 0.2)).toBeLessThan(1);
  });

  it('should return factor > 1 for zoom out', () => {
    expect(calculateZoomFactor(-1, 0.1)).toBeGreaterThan(1);
  });

  it('should cap scroll speed at 2', () => {
    const factor = calculateZoomFactor(5, 0.1);
    expect(factor).toBe(1 - 0.2);
  });
});

describe('applySafePenetrationDistance', () => {
  it('should return targetDistance when targetRadius is null', () => {
    expect(applySafePenetrationDistance(5, 10, null)).toBe(5);
  });

  it('should enforce minimum safe distance', () => {
    const result = applySafePenetrationDistance(0.00005, 0.0002, 0.0001);
    expect(result).toBeGreaterThanOrEqual(0.0001000001);
  });

  it('should force to safe distance if current is below', () => {
    const result = applySafePenetrationDistance(0.00001, 0.00005, 0.0001);
    expect(result).toBe(0.0001000001);
  });
});

describe('clampDistance', () => {
  it('should return distance when in range', () => {
    expect(clampDistance(5, 1, 10)).toBe(5);
  });

  it('should clamp to min', () => {
    expect(clampDistance(0.5, 1, 10)).toBe(1);
  });

  it('should clamp to max', () => {
    expect(clampDistance(15, 1, 10)).toBe(10);
  });
});

describe('calculateAdaptiveThreshold', () => {
  it('should return value based on distance', () => {
    expect(calculateAdaptiveThreshold(1000)).toBe(0.1);
  });

  it('should not go below 0.001', () => {
    expect(calculateAdaptiveThreshold(0.1)).toBe(0.001);
  });
});
