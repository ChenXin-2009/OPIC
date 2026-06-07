import {
  normalizeAngleDegrees,
  normalizeAngleRadians,
  normalizePolarAngleDegrees,
  calculateShortestAnglePath,
  degreesToRadians,
  radiansToDegrees,
} from '../angleHelpers';

describe('normalizeAngleDegrees', () => {
  it('should keep normal angles unchanged', () => {
    expect(normalizeAngleDegrees(0)).toBe(0);
    expect(normalizeAngleDegrees(90)).toBe(90);
    expect(normalizeAngleDegrees(-90)).toBe(-90);
  });

  it('should normalize angles > 180', () => {
    expect(normalizeAngleDegrees(270)).toBe(-90);
    expect(normalizeAngleDegrees(360)).toBe(0);
  });

  it('should normalize angles < -180', () => {
    expect(normalizeAngleDegrees(-200)).toBe(160);
  });

  it('should normalize large positive angles', () => {
    expect(normalizeAngleDegrees(540)).toBe(-180);
  });

  it('should normalize large negative angles', () => {
    expect(normalizeAngleDegrees(-540)).toBe(-180);
  });
});

describe('normalizeAngleRadians', () => {
  it('should keep normal angles unchanged', () => {
    expect(normalizeAngleRadians(0)).toBe(0);
    expect(normalizeAngleRadians(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });

  it('should normalize angles > PI', () => {
    expect(normalizeAngleRadians(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
  });

  it('should normalize angles < -PI', () => {
    expect(normalizeAngleRadians(-Math.PI * 1.2)).toBeCloseTo(Math.PI * 0.8);
  });
});

describe('normalizePolarAngleDegrees', () => {
  it('should keep valid polar angles', () => {
    expect(normalizePolarAngleDegrees(0)).toBe(0);
    expect(normalizePolarAngleDegrees(90)).toBe(90);
    expect(normalizePolarAngleDegrees(180)).toBe(180);
  });

  it('should convert negative angles', () => {
    expect(normalizePolarAngleDegrees(-45)).toBe(135);
  });

  it('should handle angles >= 360', () => {
    expect(normalizePolarAngleDegrees(270)).toBe(90);
    expect(normalizePolarAngleDegrees(450)).toBe(90);
  });

  it('should handle angles > 180', () => {
    expect(normalizePolarAngleDegrees(200)).toBe(160);
  });
});

describe('calculateShortestAnglePath', () => {
  it('should return positive diff for normal case', () => {
    expect(calculateShortestAnglePath(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });

  it('should return negative diff for reverse case', () => {
    expect(calculateShortestAnglePath(Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2);
  });

  it('should find shortest path across PI boundary', () => {
    const from = 170 * Math.PI / 180;
    const to = -170 * Math.PI / 180;
    const diff = calculateShortestAnglePath(from, to);
    expect(Math.abs(diff)).toBeLessThan(Math.PI);
  });
});

describe('degreesToRadians', () => {
  it('should convert 0 degrees', () => {
    expect(degreesToRadians(0)).toBe(0);
  });

  it('should convert 180 degrees to PI', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });

  it('should convert 90 degrees to PI/2', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('radiansToDegrees', () => {
  it('should convert 0 radians', () => {
    expect(radiansToDegrees(0)).toBe(0);
  });

  it('should convert PI to 180 degrees', () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
  });

  it('should convert PI/2 to 90 degrees', () => {
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
  });
});
