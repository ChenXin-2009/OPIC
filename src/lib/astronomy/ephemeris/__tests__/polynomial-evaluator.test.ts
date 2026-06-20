import { PolynomialEvaluator } from '../polynomial-evaluator';
import { PolynomialType, Vector3, type ChebyshevSegment, type HermiteSegment, type PolynomialSegment } from '../types';

describe('PolynomialEvaluator', () => {
  const evaluator = new PolynomialEvaluator();

  describe('evaluateChebyshev', () => {
    it('should return constant for single coefficient', () => {
      expect(evaluator.evaluateChebyshev(0, [5])).toBe(5);
      expect(evaluator.evaluateChebyshev(0.5, [5])).toBe(5);
      expect(evaluator.evaluateChebyshev(-1, [5])).toBe(5);
    });

    it('should evaluate linear polynomial [0, 1] at t=0 → 0', () => {
      expect(evaluator.evaluateChebyshev(0, [0, 1])).toBeCloseTo(0, 10);
    });

    it('should evaluate linear polynomial [0, 1] at t=1 → 1', () => {
      expect(evaluator.evaluateChebyshev(1, [0, 1])).toBeCloseTo(1, 10);
    });

    it('should evaluate linear polynomial [0, 1] at t=-1 → -1', () => {
      expect(evaluator.evaluateChebyshev(-1, [0, 1])).toBeCloseTo(-1, 10);
    });

    it('should return 0 for empty coefficients', () => {
      expect(evaluator.evaluateChebyshev(0, [])).toBe(0);
    });

    it('should throw for non-finite t', () => {
      expect(() => evaluator.evaluateChebyshev(NaN, [1])).toThrow('Non-finite');
      expect(() => evaluator.evaluateChebyshev(Infinity, [1])).toThrow('Non-finite');
    });
  });

  describe('normalizeTime', () => {
    it('should return -1 at startJD', () => {
      expect(evaluator.normalizeTime(100, 100, 200)).toBe(-1);
    });

    it('should return 1 at endJD', () => {
      expect(evaluator.normalizeTime(200, 100, 200)).toBe(1);
    });

    it('should return 0 at midpoint', () => {
      expect(evaluator.normalizeTime(150, 100, 200)).toBe(0);
    });
  });

  describe('denormalizeTime', () => {
    it('should return startJD at t=-1', () => {
      expect(evaluator.denormalizeTime(-1, 100, 200)).toBeCloseTo(100, 10);
    });

    it('should return endJD at t=1', () => {
      expect(evaluator.denormalizeTime(1, 100, 200)).toBeCloseTo(200, 10);
    });

    it('should be inverse of normalizeTime', () => {
      const jd = 137;
      const t_norm = evaluator.normalizeTime(jd, 100, 200);
      expect(evaluator.denormalizeTime(t_norm, 100, 200)).toBeCloseTo(jd, 10);
    });
  });

  describe('evaluateHermite', () => {
    const segment: HermiteSegment = {
      type: PolynomialType.HERMITE,
      bodyId: 399,
      startJD: 100,
      endJD: 200,
      order: 3,
      startPosition: new Vector3(1, 0, 0),
      startVelocity: new Vector3(0, 1, 0),
      endPosition: new Vector3(0, 1, 0),
      endVelocity: new Vector3(-1, 0, 0),
    };

    it('should return startPosition at t=0', () => {
      const result = evaluator.evaluateHermite(0, segment);
      expect(result.x).toBeCloseTo(1, 8);
      expect(result.y).toBeCloseTo(0, 8);
      expect(result.z).toBeCloseTo(0, 8);
    });

    it('should return endPosition at t=1', () => {
      const result = evaluator.evaluateHermite(1, segment);
      expect(result.x).toBeCloseTo(0, 8);
      expect(result.y).toBeCloseTo(1, 8);
      expect(result.z).toBeCloseTo(0, 8);
    });

    it('should throw for t < 0', () => {
      expect(() => evaluator.evaluateHermite(-0.1, segment)).toThrow('out of range');
    });

    it('should throw for t > 1', () => {
      expect(() => evaluator.evaluateHermite(1.1, segment)).toThrow('out of range');
    });
  });

  describe('findSegment', () => {
    it('should return -1 for empty array', () => {
      expect(evaluator.findSegment(100, [])).toBe(-1);
    });

    it('should find segment containing jd', () => {
      const segments: PolynomialSegment[] = [
        { type: PolynomialType.CHEBYSHEV, bodyId: 1, startJD: 100, endJD: 200, order: 6, coefficientsX: [0], coefficientsY: [0], coefficientsZ: [0] },
        { type: PolynomialType.CHEBYSHEV, bodyId: 1, startJD: 200, endJD: 300, order: 6, coefficientsX: [0], coefficientsY: [0], coefficientsZ: [0] },
      ];
      expect(evaluator.findSegment(150, segments)).toBe(0);
      expect(evaluator.findSegment(250, segments)).toBe(1);
    });

    it('should return -1 for jd before all segments', () => {
      const segments: PolynomialSegment[] = [
        { type: PolynomialType.CHEBYSHEV, bodyId: 1, startJD: 100, endJD: 200, order: 6, coefficientsX: [0], coefficientsY: [0], coefficientsZ: [0] },
      ];
      expect(evaluator.findSegment(50, segments)).toBe(-1);
    });

    it('should return -1 for jd after all segments', () => {
      const segments: PolynomialSegment[] = [
        { type: PolynomialType.CHEBYSHEV, bodyId: 1, startJD: 100, endJD: 200, order: 6, coefficientsX: [0], coefficientsY: [0], coefficientsZ: [0] },
      ];
      expect(evaluator.findSegment(300, segments)).toBe(-1);
    });
  });

  describe('evaluateChebyshevSegment', () => {
    it('should evaluate at midpoint of segment', () => {
      const segment: ChebyshevSegment = {
        type: PolynomialType.CHEBYSHEV,
        bodyId: 1,
        startJD: 100,
        endJD: 200,
        order: 2,
        coefficientsX: [1, 0, 0],
        coefficientsY: [2, 0, 0],
        coefficientsZ: [3, 0, 0],
      };
      const result = evaluator.evaluateChebyshevSegment(150, segment);
      expect(result.x).toBeCloseTo(1, 8);
      expect(result.y).toBeCloseTo(2, 8);
      expect(result.z).toBeCloseTo(3, 8);
    });
  });

  describe('evaluateSegment', () => {
    it('should delegate to chebyshev for chebyshev segments', () => {
      const segment: ChebyshevSegment = {
        type: PolynomialType.CHEBYSHEV,
        bodyId: 1,
        startJD: 100,
        endJD: 200,
        order: 1,
        coefficientsX: [5, 0],
        coefficientsY: [5, 0],
        coefficientsZ: [5, 0],
      };
      const result = evaluator.evaluateSegment(150, segment);
      expect(result.x).toBeCloseTo(5, 8);
    });

    it('should delegate to hermite for hermite segments', () => {
      const segment: HermiteSegment = {
        type: PolynomialType.HERMITE,
        bodyId: 1,
        startJD: 100,
        endJD: 200,
        order: 3,
        startPosition: new Vector3(10, 0, 0),
        startVelocity: new Vector3(0, 0, 0),
        endPosition: new Vector3(10, 0, 0),
        endVelocity: new Vector3(0, 0, 0),
      };
      const result = evaluator.evaluateSegment(150, segment);
      expect(result.x).toBeCloseTo(10, 8);
    });
  });
});
