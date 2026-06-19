import { Vector3 } from '@/lib/astronomy/ephemeris/types';
import { icrfToGalactic, galacticToIcrf, GALACTIC_CENTER_ICRS } from '../galactic';

describe('icrfToGalactic', () => {
  it('should return zero for zero vector', () => {
    const result = icrfToGalactic(new Vector3(0, 0, 0));
    expect(result.l_deg).toBe(0);
    expect(result.b_deg).toBe(0);
    expect(result.distance).toBe(0);
  });

  it('should preserve distance', () => {
    const v = new Vector3(1, 2, 3);
    const result = icrfToGalactic(v);
    const expectedDist = Math.sqrt(1 + 4 + 9);
    expect(result.distance).toBeCloseTo(expectedDist, 10);
  });

  it('should return finite values for arbitrary input', () => {
    const v = new Vector3(100, -50, 200);
    const result = icrfToGalactic(v);
    expect(Number.isFinite(result.l_deg)).toBe(true);
    expect(Number.isFinite(result.b_deg)).toBe(true);
  });

  it('should have l_deg in [0, 360)', () => {
    const v = new Vector3(1, -1, 0.5);
    const result = icrfToGalactic(v);
    expect(result.l_deg).toBeGreaterThanOrEqual(0);
    expect(result.l_deg).toBeLessThan(360);
  });

  it('should have b_deg in [-90, 90]', () => {
    const v = new Vector3(1, -1, 5);
    const result = icrfToGalactic(v);
    expect(result.b_deg).toBeGreaterThanOrEqual(-90);
    expect(result.b_deg).toBeLessThanOrEqual(90);
  });
});

describe('galacticToIcrf', () => {
  it('should return zero vector for zero distance', () => {
    const v = galacticToIcrf(0, 0, 0);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.y).toBeCloseTo(0, 10);
    expect(v.z).toBeCloseTo(0, 10);
  });

  it('should return unit vector for l=0, b=0, d=1', () => {
    const v = galacticToIcrf(0, 0, 1);
    const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
    expect(len).toBeCloseTo(1, 10);
  });

  it('should have significant z-component for b=90', () => {
    const v = galacticToIcrf(0, 90, 1);
    expect(Math.abs(v.z)).toBeGreaterThan(0.4);
  });
});

describe('round-trip ICRS ↔ Galactic', () => {
  it('should recover original vector within tolerance', () => {
    const original = new Vector3(10, -20, 5);
    const gal = icrfToGalactic(original);
    const recovered = galacticToIcrf(gal.l_deg, gal.b_deg, gal.distance);

    expect(recovered.x).toBeCloseTo(original.x, 8);
    expect(recovered.y).toBeCloseTo(original.y, 8);
    expect(recovered.z).toBeCloseTo(original.z, 8);
  });

  it('should round-trip for unit vector in arbitrary direction', () => {
    const original = new Vector3(0.5, 0.3, 0.8);
    const len = Math.sqrt(0.25 + 0.09 + 0.64);
    const gal = icrfToGalactic(original);
    const recovered = galacticToIcrf(gal.l_deg, gal.b_deg, gal.distance);

    expect(recovered.x / len).toBeCloseTo(original.x / len, 8);
    expect(recovered.y / len).toBeCloseTo(original.y / len, 8);
    expect(recovered.z / len).toBeCloseTo(original.z / len, 8);
  });
});

describe('GALACTIC_CENTER_ICRS', () => {
  it('should have valid coordinates', () => {
    expect(GALACTIC_CENTER_ICRS.ra_deg).toBeGreaterThan(0);
    expect(GALACTIC_CENTER_ICRS.ra_deg).toBeLessThanOrEqual(360);
    expect(GALACTIC_CENTER_ICRS.dec_deg).toBeGreaterThanOrEqual(-90);
    expect(GALACTIC_CENTER_ICRS.dec_deg).toBeLessThanOrEqual(90);
    expect(GALACTIC_CENTER_ICRS.distance_kpc).toBeGreaterThan(0);
  });
});
