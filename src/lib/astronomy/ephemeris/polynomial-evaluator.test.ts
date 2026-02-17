/**
 * Tests for polynomial evaluator
 */

import { describe, it, expect } from '@jest/globals';
import { PolynomialEvaluator } from './polynomial-evaluator';
import { Vector3, ChebyshevSegment, HermiteSegment, PolynomialType } from './types';

describe('PolynomialEvaluator', () => {
  const evaluator = new PolynomialEvaluator();

  describe('Chebyshev evaluation', () => {
    it('should evaluate constant polynomial', () => {
      const result = evaluator.evaluateChebyshev(0.5, [42]);
      expect(result).toBe(42);
    });

    it('should evaluate linear polynomial T_0 + 2*T_1', () => {
      // T_0(x) = 1, T_1(x) = x
      // Result: 1 + 2*x
      const coeffs = [1, 2];
      expect(evaluator.evaluateChebyshev(0, coeffs)).toBeCloseTo(1, 10);
      expect(evaluator.evaluateChebyshev(0.5, coeffs)).toBeCloseTo(2, 10);
      expect(evaluator.evaluateChebyshev(1, coeffs)).toBeCloseTo(3, 10);
    });

    it('should evaluate quadratic polynomial', () => {
      // T_0 + T_1 + T_2 where T_2(x) = 2x^2 - 1
      // At x=0: T_0(0)=1, T_1(0)=0, T_2(0)=-1 => 1 + 0 - 1 = 0
      // At x=1: T_0(1)=1, T_1(1)=1, T_2(1)=1 => 1 + 1 + 1 = 3
      const coeffs = [1, 1, 1];
      expect(evaluator.evaluateChebyshev(0, coeffs)).toBeCloseTo(0, 10);
      expect(evaluator.evaluateChebyshev(1, coeffs)).toBeCloseTo(3, 10);
    });

    it('should handle boundary values', () => {
      const coeffs = [1, 2, 3];
      const result1 = evaluator.evaluateChebyshev(-1, coeffs);
      const result2 = evaluator.evaluateChebyshev(0, coeffs);
      const result3 = evaluator.evaluateChebyshev(1, coeffs);
      
      expect(isFinite(result1)).toBe(true);
      expect(isFinite(result2)).toBe(true);
      expect(isFinite(result3)).toBe(true);
    });

    it('should throw on non-finite input', () => {
      expect(() => evaluator.evaluateChebyshev(NaN, [1, 2, 3])).toThrow();
      expect(() => evaluator.evaluateChebyshev(Infinity, [1, 2, 3])).toThrow();
    });
  });

  describe('Time normalization', () => {
    it('should normalize time to [-1, 1]', () => {
      const startJD = 2451545.0;
      const endJD = 2451555.0;

      expect(evaluator.normalizeTime(startJD, startJD, endJD)).toBeCloseTo(-1, 10);
      expect(evaluator.normalizeTime(endJD, startJD, endJD)).toBeCloseTo(1, 10);
      expect(evaluator.normalizeTime(2451550.0, startJD, endJD)).toBeCloseTo(0, 10);
    });

    it('should be reversible (round-trip)', () => {
      const startJD = 2451545.0;
      const endJD = 2451555.0;
      const jd = 2451548.5;

      const t_norm = evaluator.normalizeTime(jd, startJD, endJD);
      const jd_back = evaluator.denormalizeTime(t_norm, startJD, endJD);

      expect(jd_back).toBeCloseTo(jd, 12);
    });
  });

  describe('Hermite evaluation', () => {
    it('should interpolate between endpoints', () => {
      const segment: HermiteSegment = {
        type: PolynomialType.HERMITE,
        bodyId: 501,
        startJD: 2451545.0,
        endJD: 2451545.5,
        order: 3,
        startPosition: new Vector3(0, 0, 0),
        startVelocity: new Vector3(1, 0, 0),
        endPosition: new Vector3(1, 0, 0),
        endVelocity: new Vector3(1, 0, 0)
      };

      const pos0 = evaluator.evaluateHermite(0, segment);
      const pos1 = evaluator.evaluateHermite(1, segment);

      expect(pos0.x).toBeCloseTo(0, 10);
      expect(pos1.x).toBeCloseTo(1, 10);
    });

    it('should ensure C1 continuity at boundaries', () => {
      const segment: HermiteSegment = {
        type: PolynomialType.HERMITE,
        bodyId: 501,
        startJD: 2451545.0,
        endJD: 2451546.0,
        order: 3,
        startPosition: new Vector3(1, 2, 3),
        startVelocity: new Vector3(0.1, 0.2, 0.3),
        endPosition: new Vector3(2, 3, 4),
        endVelocity: new Vector3(0.15, 0.25, 0.35)
      };

      const pos0 = evaluator.evaluateHermite(0, segment);
      const pos1 = evaluator.evaluateHermite(1, segment);

      expect(pos0.equals(segment.startPosition, 1e-10)).toBe(true);
      expect(pos1.equals(segment.endPosition, 1e-10)).toBe(true);
    });

    it('should throw on out-of-range time', () => {
      const segment: HermiteSegment = {
        type: PolynomialType.HERMITE,
        bodyId: 501,
        startJD: 2451545.0,
        endJD: 2451546.0,
        order: 3,
        startPosition: new Vector3(0, 0, 0),
        startVelocity: new Vector3(0, 0, 0),
        endPosition: new Vector3(1, 1, 1),
        endVelocity: new Vector3(0, 0, 0)
      };

      expect(() => evaluator.evaluateHermite(-0.1, segment)).toThrow();
      expect(() => evaluator.evaluateHermite(1.1, segment)).toThrow();
    });
  });

  describe('Segment finding', () => {
    const segments: ChebyshevSegment[] = [
      {
        type: PolynomialType.CHEBYSHEV,
        bodyId: 501,
        startJD: 2451545.0,
        endJD: 2451550.0,
        order: 6,
        coefficientsX: [1, 2, 3, 4, 5, 6, 7],
        coefficientsY: [1, 2, 3, 4, 5, 6, 7],
        coefficientsZ: [1, 2, 3, 4, 5, 6, 7]
      },
      {
        type: PolynomialType.CHEBYSHEV,
        bodyId: 501,
        startJD: 2451550.0,
        endJD: 2451555.0,
        order: 6,
        coefficientsX: [1, 2, 3, 4, 5, 6, 7],
        coefficientsY: [1, 2, 3, 4, 5, 6, 7],
        coefficientsZ: [1, 2, 3, 4, 5, 6, 7]
      },
      {
        type: PolynomialType.CHEBYSHEV,
        bodyId: 501,
        startJD: 2451555.0,
        endJD: 2451560.0,
        order: 6,
        coefficientsX: [1, 2, 3, 4, 5, 6, 7],
        coefficientsY: [1, 2, 3, 4, 5, 6, 7],
        coefficientsZ: [1, 2, 3, 4, 5, 6, 7]
      }
    ];

    it('should find segment containing time', () => {
      expect(evaluator.findSegment(2451547.5, segments)).toBe(0);
      expect(evaluator.findSegment(2451552.5, segments)).toBe(1);
      expect(evaluator.findSegment(2451557.5, segments)).toBe(2);
    });

    it('should find segment at boundaries', () => {
      expect(evaluator.findSegment(2451545.0, segments)).toBe(0);
      expect(evaluator.findSegment(2451550.0, segments)).toBe(1);
      expect(evaluator.findSegment(2451560.0, segments)).toBe(2);
    });

    it('should return -1 for time outside range', () => {
      expect(evaluator.findSegment(2451544.0, segments)).toBe(-1);
      expect(evaluator.findSegment(2451561.0, segments)).toBe(-1);
    });

    it('should return -1 for empty array', () => {
      expect(evaluator.findSegment(2451545.0, [])).toBe(-1);
    });
  });

  describe('Segment evaluation', () => {
    it('should evaluate Chebyshev segment', () => {
      const segment: ChebyshevSegment = {
        type: PolynomialType.CHEBYSHEV,
        bodyId: 501,
        startJD: 2451545.0,
        endJD: 2451550.0,
        order: 2,
        coefficientsX: [100, 10, 1],
        coefficientsY: [200, 20, 2],
        coefficientsZ: [300, 30, 3]
      };

      const pos = evaluator.evaluateChebyshevSegment(2451547.5, segment);
      expect(pos.isFinite()).toBe(true);
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.y).toBeGreaterThan(0);
      expect(pos.z).toBeGreaterThan(0);
    });

    it('should evaluate Hermite segment', () => {
      const segment: HermiteSegment = {
        type: PolynomialType.HERMITE,
        bodyId: 501,
        startJD: 2451545.0,
        endJD: 2451546.0,
        order: 3,
        startPosition: new Vector3(100, 200, 300),
        startVelocity: new Vector3(10, 20, 30),
        endPosition: new Vector3(110, 220, 330),
        endVelocity: new Vector3(10, 20, 30)
      };

      const pos = evaluator.evaluateHermiteSegment(2451545.5, segment);
      expect(pos.isFinite()).toBe(true);
      expect(pos.x).toBeGreaterThan(100);
      expect(pos.x).toBeLessThan(110);
    });
  });
});
