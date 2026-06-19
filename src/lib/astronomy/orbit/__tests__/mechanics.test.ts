import { calculatePosition, computeElementsAtTime } from '../mechanics';
import type { OrbitalElements } from '../types';
import { J2000_JD } from '@/lib/astronomy/utils/constants';

const EARTH_ELEMENTS: OrbitalElements = {
  name: 'Earth',
  a: 1.000001018,
  e: 0.01671123,
  i: -0.00005 * Math.PI / 180,
  L: 100.46457166 * Math.PI / 180,
  w_bar: 102.93768193 * Math.PI / 180,
  O: 0.0,
  a_dot: -0.00000562,
  e_dot: -0.00004392,
  i_dot: -0.01294668,
  L_dot: 35999.37244981 * Math.PI / 180,
  w_bar_dot: 0.32327364,
  O_dot: 0.0,
  radius: 0.0000426,
  color: '#22a2c3',
};

describe('computeElementsAtTime', () => {
  it('should return original elements at T=0', () => {
    const result = computeElementsAtTime(EARTH_ELEMENTS, 0);
    expect(result.a).toBeCloseTo(EARTH_ELEMENTS.a, 10);
    expect(result.e).toBeCloseTo(EARTH_ELEMENTS.e, 10);
  });

  it('should apply linear time interpolation', () => {
    const T = 1;
    const result = computeElementsAtTime(EARTH_ELEMENTS, T);
    expect(result.a).toBeCloseTo(EARTH_ELEMENTS.a + EARTH_ELEMENTS.a_dot * T, 10);
    expect(result.e).toBeCloseTo(EARTH_ELEMENTS.e + EARTH_ELEMENTS.e_dot * T, 10);
    expect(result.i).toBeCloseTo(EARTH_ELEMENTS.i + EARTH_ELEMENTS.i_dot * T, 10);
  });

  it('should handle negative T', () => {
    const T = -1;
    const result = computeElementsAtTime(EARTH_ELEMENTS, T);
    expect(result.a).toBeCloseTo(EARTH_ELEMENTS.a + EARTH_ELEMENTS.a_dot * T, 10);
  });
});

describe('calculatePosition', () => {
  it('should return finite values at J2000.0', () => {
    const pos = calculatePosition(EARTH_ELEMENTS, J2000_JD);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
    expect(Number.isFinite(pos.z)).toBe(true);
    expect(Number.isFinite(pos.r)).toBe(true);
  });

  it('should return positive distance', () => {
    const pos = calculatePosition(EARTH_ELEMENTS, J2000_JD);
    expect(pos.r).toBeGreaterThan(0);
  });

  it('should compute r consistent with x,y,z', () => {
    const pos = calculatePosition(EARTH_ELEMENTS, J2000_JD);
    const computedR = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    expect(pos.r).toBeCloseTo(computedR, 8);
  });

  it('should give Earth-like distance (~1 AU) at J2000.0', () => {
    const pos = calculatePosition(EARTH_ELEMENTS, J2000_JD);
    expect(pos.r).toBeGreaterThan(0.9);
    expect(pos.r).toBeLessThan(1.1);
  });

  it('should give different positions at different times', () => {
    const pos1 = calculatePosition(EARTH_ELEMENTS, J2000_JD);
    const pos2 = calculatePosition(EARTH_ELEMENTS, J2000_JD + 182.625);
    const dist = Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2 + (pos1.z - pos2.z) ** 2);
    expect(dist).toBeGreaterThan(0.01);
  });

  it('should work for circular orbit (e=0)', () => {
    const circularElements: OrbitalElements = {
      ...EARTH_ELEMENTS,
      e: 0,
      e_dot: 0,
    };
    const pos = calculatePosition(circularElements, J2000_JD);
    expect(pos.r).toBeCloseTo(circularElements.a, 6);
  });
});
