import { degreesToRadians, radiansToDegrees, clamp, lerp, normalize, mod, approxEqual, square, distance2D, distance3D, wrapAngle, wrapAngleSigned, smoothstep } from '../math';

describe('math utils', () => {
  describe('degreesToRadians', () => {
    it('should convert degrees to radians', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
      expect(degreesToRadians(0)).toBe(0);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('radiansToDegrees', () => {
    it('should convert radians to degrees', () => {
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
      expect(radiansToDegrees(0)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
    });
  });

  describe('normalize', () => {
    it('should normalize a value between ranges', () => {
      expect(normalize(50, 0, 100, 0, 1)).toBe(0.5);
      expect(normalize(5, 0, 10, 100, 200)).toBe(150);
    });
  });

  describe('mod', () => {
    it('should handle positive numbers', () => {
      expect(mod(5, 3)).toBe(2);
    });

    it('should handle negative numbers', () => {
      expect(mod(-1, 3)).toBe(2);
    });
  });

  describe('approxEqual', () => {
    it('should check approximate equality', () => {
      expect(approxEqual(0.1 + 0.2, 0.3)).toBe(true);
      expect(approxEqual(1.0, 1.1)).toBe(false);
    });
  });

  describe('square', () => {
    it('should square a number', () => {
      expect(square(5)).toBe(25);
      expect(square(-3)).toBe(9);
      expect(square(0)).toBe(0);
    });
  });

  describe('distance2D', () => {
    it('should compute 2D distance', () => {
      expect(distance2D(0, 0, 3, 4)).toBe(5);
    });
  });

  describe('distance3D', () => {
    it('should compute 3D distance', () => {
      expect(distance3D(0, 0, 0, 1, 1, 1)).toBeCloseTo(Math.sqrt(3));
    });
  });

  describe('wrapAngle', () => {
    it('should wrap angle to [0, 2π)', () => {
      expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
      expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI);
    });
  });

  describe('wrapAngleSigned', () => {
    it('should wrap angle to [-π, π)', () => {
      expect(wrapAngleSigned(3.5 * Math.PI)).toBeCloseTo(-0.5 * Math.PI);
      expect(wrapAngleSigned(-0.5 * Math.PI)).toBeCloseTo(-0.5 * Math.PI);
    });
  });

  describe('smoothstep', () => {
    it('should return 0 for edge0', () => {
      expect(smoothstep(0, 1, 0)).toBe(0);
    });

    it('should return 1 for edge1', () => {
      expect(smoothstep(0, 1, 1)).toBe(1);
    });
  });
});
