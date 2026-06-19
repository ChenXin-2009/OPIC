import { solveKeplerEquation, eccentricToTrueAnomaly, heliocentricDistance } from '../kepler';
import { ConvergenceError } from '@/lib/errors/base';

describe('solveKeplerEquation', () => {
  it('should return M for circular orbit (e=0)', () => {
    const M = Math.PI / 4;
    expect(solveKeplerEquation(M, 0)).toBeCloseTo(M, 10);
  });

  it('should return π for M=π, e=0', () => {
    expect(solveKeplerEquation(Math.PI, 0)).toBeCloseTo(Math.PI, 10);
  });

  it('should converge for low eccentricity (e=0.1)', () => {
    const M = Math.PI / 2;
    const E = solveKeplerEquation(M, 0.1);
    expect(E).toBeGreaterThan(M);
    expect(E).toBeLessThan(Math.PI);
  });

  it('should converge for high eccentricity (e=0.9)', () => {
    const E = solveKeplerEquation(Math.PI / 2, 0.9);
    expect(E).toBeGreaterThan(0);
    expect(E).toBeLessThan(Math.PI);
  });

  it('should satisfy Kepler equation M = E - e*sin(E)', () => {
    const M = 1.5;
    const e = 0.3;
    const E = solveKeplerEquation(M, e);
    expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
  });

  it('should throw ConvergenceError for e < 0', () => {
    expect(() => solveKeplerEquation(1, -0.1)).toThrow(ConvergenceError);
  });

  it('should throw ConvergenceError for e >= 1', () => {
    expect(() => solveKeplerEquation(1, 1)).toThrow(ConvergenceError);
    expect(() => solveKeplerEquation(1, 1.5)).toThrow(ConvergenceError);
  });

  it('should throw ConvergenceError when maxIterations too small', () => {
    expect(() => solveKeplerEquation(Math.PI / 2, 0.5, 1e-8, 1)).toThrow(ConvergenceError);
  });
});

describe('eccentricToTrueAnomaly', () => {
  it('should return 0 at perihelion for circular orbit', () => {
    expect(eccentricToTrueAnomaly(0, 0)).toBeCloseTo(0, 10);
  });

  it('should return π at aphelion for circular orbit', () => {
    expect(eccentricToTrueAnomaly(Math.PI, 0)).toBeCloseTo(Math.PI, 10);
  });

  it('should equal E for circular orbit', () => {
    const E = Math.PI / 3;
    expect(eccentricToTrueAnomaly(E, 0)).toBeCloseTo(E, 10);
  });

  it('should give larger true anomaly than eccentric for e>0', () => {
    const E = Math.PI / 2;
    const e = 0.3;
    const nu = eccentricToTrueAnomaly(E, e);
    expect(nu).toBeGreaterThan(E);
  });
});

describe('heliocentricDistance', () => {
  it('should return a for circular orbit', () => {
    expect(heliocentricDistance(1.0, 0, 0)).toBeCloseTo(1.0, 10);
    expect(heliocentricDistance(5.2, 0, Math.PI)).toBeCloseTo(5.2, 10);
  });

  it('should return a(1-e) at perihelion (E=0)', () => {
    const a = 1.0;
    const e = 0.0167;
    expect(heliocentricDistance(a, e, 0)).toBeCloseTo(a * (1 - e), 10);
  });

  it('should return a(1+e) at aphelion (E=π)', () => {
    const a = 1.0;
    const e = 0.0167;
    expect(heliocentricDistance(a, e, Math.PI)).toBeCloseTo(a * (1 + e), 10);
  });

  it('should work for Jupiter-like orbit', () => {
    const a = 5.2;
    const e = 0.048;
    expect(heliocentricDistance(a, e, 0)).toBeCloseTo(a * (1 - e), 10);
  });
});

describe('kepler pipeline integration', () => {
  it('should compute correct Earth distance from orbital elements', () => {
    const M = 0;
    const e = 0.0167;
    const a = 1.0;

    const E = solveKeplerEquation(M, e);
    const r = heliocentricDistance(a, e, E);

    expect(r).toBeCloseTo(a * (1 - e), 6);
  });

  it('should round-trip: M → E → ν → r', () => {
    const M = Math.PI / 3;
    const e = 0.2;
    const a = 2.0;

    const E = solveKeplerEquation(M, e);
    const nu = eccentricToTrueAnomaly(E, e);
    const r = heliocentricDistance(a, e, E);

    expect(r).toBeGreaterThan(0);
    expect(nu).toBeGreaterThan(0);
    expect(nu).toBeLessThan(2 * Math.PI);
  });
});
