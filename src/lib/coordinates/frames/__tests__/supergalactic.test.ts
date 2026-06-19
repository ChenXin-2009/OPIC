import { Vector3 } from '@/lib/astronomy/ephemeris/types';
import {
  icrfToSupergalactic,
  supergalacticToIcrf,
  supergalacticToRenderWorld,
  SUPERGALACTIC_TO_ICRF_RAW,
} from '../supergalactic';

describe('icrfToSupergalactic', () => {
  it('should return zero for zero vector', () => {
    const result = icrfToSupergalactic(new Vector3(0, 0, 0));
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(0, 10);
  });

  it('should preserve vector length (orthogonal matrix)', () => {
    const v = new Vector3(3, 4, 5);
    const result = icrfToSupergalactic(v);
    const inputLen = Math.sqrt(9 + 16 + 25);
    const outputLen = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2);
    expect(outputLen).toBeCloseTo(inputLen, 10);
  });

  it('should return a new Vector3 instance', () => {
    const v = new Vector3(1, 2, 3);
    const result = icrfToSupergalactic(v);
    expect(result).not.toBe(v);
  });
});

describe('supergalacticToIcrf', () => {
  it('should return zero for zero vector', () => {
    const result = supergalacticToIcrf(new Vector3(0, 0, 0));
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(0, 10);
  });

  it('should preserve vector length', () => {
    const v = new Vector3(1, 1, 1);
    const result = supergalacticToIcrf(v);
    const outputLen = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2);
    expect(outputLen).toBeCloseTo(Math.sqrt(3), 10);
  });
});

describe('round-trip ICRS ↔ Supergalactic', () => {
  it('should recover original vector within tolerance', () => {
    const original = new Vector3(10, -20, 30);
    const sgl = icrfToSupergalactic(original);
    const recovered = supergalacticToIcrf(sgl);

    expect(recovered.x).toBeCloseTo(original.x, 8);
    expect(recovered.y).toBeCloseTo(original.y, 8);
    expect(recovered.z).toBeCloseTo(original.z, 8);
  });

  it('should round-trip for unit vector', () => {
    const original = new Vector3(0.6, -0.3, 0.7);
    const sgl = icrfToSupergalactic(original);
    const recovered = supergalacticToIcrf(sgl);

    const len = Math.sqrt(0.36 + 0.09 + 0.49);
    expect(recovered.x / len).toBeCloseTo(original.x / len, 8);
    expect(recovered.y / len).toBeCloseTo(original.y / len, 8);
    expect(recovered.z / len).toBeCloseTo(original.z / len, 8);
  });
});

describe('supergalacticToRenderWorld', () => {
  it('should compose supergalacticToIcrf with provided function', () => {
    const mockFn = (v: Vector3) => new Vector3(v.x * 2, v.y * 2, v.z * 2);
    const input = new Vector3(1, 0, 0);
    const result = supergalacticToRenderWorld(mockFn, input);

    const icrf = supergalacticToIcrf(input);
    expect(result.x).toBeCloseTo(icrf.x * 2, 10);
    expect(result.y).toBeCloseTo(icrf.y * 2, 10);
    expect(result.z).toBeCloseTo(icrf.z * 2, 10);
  });

  it('should return zero for zero input', () => {
    const mockFn = (v: Vector3) => v;
    const result = supergalacticToRenderWorld(mockFn, new Vector3(0, 0, 0));
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(0, 10);
  });
});

describe('SUPERGALACTIC_TO_ICRF_RAW', () => {
  it('should be a 3x3 matrix', () => {
    expect(SUPERGALACTIC_TO_ICRF_RAW.length).toBe(3);
    for (const row of SUPERGALACTIC_TO_ICRF_RAW) {
      expect(row.length).toBe(3);
    }
  });

  it('should have finite numeric values', () => {
    for (const row of SUPERGALACTIC_TO_ICRF_RAW) {
      for (const val of row) {
        expect(Number.isFinite(val as number)).toBe(true);
      }
    }
  });
});
