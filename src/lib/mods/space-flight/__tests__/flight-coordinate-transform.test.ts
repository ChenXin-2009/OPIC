import { eciToEcef, eciDirectionToEcef, eciVelocityToEcef } from '../flight-coordinate-transform';

describe('flight-coordinate-transform', () => {
  it('eciToEcef rotates around Z axis by GMST angle', () => {
    const result = eciToEcef([1, 0, 0], 0);
    expect(result[2]).toBe(0);
    expect(result[0]).not.toBe(1);
    expect(Math.hypot(result[0], result[1])).toBeCloseTo(1, 10);
  });

  it('eciToEcef at different times gives different rotations', () => {
    const t0 = eciToEcef([1, 0, 0], 0);
    const t1 = eciToEcef([1, 0, 0], 3600 * 1000);
    expect(t0[0]).not.toBeCloseTo(t1[0], 5);
  });

  it('eciDirectionToEcef preserves magnitude', () => {
    const dir: [number, number, number] = [0.5, 0.5, Math.SQRT1_2];
    const result = eciDirectionToEcef(dir, 12345678);
    const mag = Math.hypot(result[0], result[1], result[2]);
    expect(mag).toBeCloseTo(1, 10);
  });

  it('eciVelocityToEcef couples rotation + coriolis for a stationary surface point', () => {
    const result = eciVelocityToEcef([0, 0, 0], [6371000, 0, 0], 0);
    expect(result[1]).toBeLessThan(0);
    expect(result[2]).toBeCloseTo(0, 3);
  });

  it('eciVelocityToEcef rotation-only part preserves magnitude when coriolis is zero', () => {
    const vel: [number, number, number] = [100, 200, 300];
    const result = eciVelocityToEcef(vel, [0, 0, 0], 0);
    const originalMag = Math.hypot(...vel);
    const resultMag = Math.hypot(result[0], result[1], result[2]);
    expect(resultMag).toBeCloseTo(originalMag, 8);
  });

  it('Z component of velocity is unchanged by rotation and coriolis', () => {
    const result = eciVelocityToEcef([10, 20, 30], [0, 0, 0], 0);
    expect(result[2]).toBe(30);
  });
});
