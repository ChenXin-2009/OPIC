import {
  orbitalToEcliptic,
  argumentOfPeriapsis,
  meanAnomaly,
  normalizeAngle,
  distance3D,
} from '../coordinates';

describe('orbitalToEcliptic', () => {
  it('should return identity for zero orientation angles', () => {
    const pos = orbitalToEcliptic(1.0, 0.0, { w: 0, Omega: 0, i: 0 });
    expect(pos.x).toBeCloseTo(1.0, 10);
    expect(pos.y).toBeCloseTo(0.0, 10);
    expect(pos.z).toBeCloseTo(0.0, 10);
  });

  it('should pass y_orb through for zero orientation', () => {
    const pos = orbitalToEcliptic(0.0, 1.0, { w: 0, Omega: 0, i: 0 });
    expect(pos.x).toBeCloseTo(0.0, 10);
    expect(pos.y).toBeCloseTo(1.0, 10);
    expect(pos.z).toBeCloseTo(0.0, 10);
  });

  it('should produce non-zero z for inclined orbit with non-zero w', () => {
    const pos = orbitalToEcliptic(1.0, 0.0, { w: Math.PI / 4, Omega: 0, i: Math.PI / 2 });
    expect(Math.abs(pos.z)).toBeGreaterThan(0.01);
  });

  it('should rotate by Omega around z-axis when i=0', () => {
    const Omega = Math.PI / 4;
    const pos = orbitalToEcliptic(1.0, 0.0, { w: 0, Omega, i: 0 });
    expect(pos.x).toBeCloseTo(Math.cos(Omega), 10);
    expect(pos.y).toBeCloseTo(Math.sin(Omega), 10);
    expect(pos.z).toBeCloseTo(0, 10);
  });

  it('should preserve distance through rotation', () => {
    const orientation = { w: 1.2, Omega: 0.8, i: 0.3 };
    const pos = orbitalToEcliptic(1.5, 0.7, orientation);
    const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    const inputDist = Math.sqrt(1.5 ** 2 + 0.7 ** 2);
    expect(dist).toBeCloseTo(inputDist, 10);
  });
});

describe('argumentOfPeriapsis', () => {
  it('should compute w = w_bar - Omega', () => {
    expect(argumentOfPeriapsis(1.5, 0.5)).toBeCloseTo(1.0, 10);
  });

  it('should return 0 when both are 0', () => {
    expect(argumentOfPeriapsis(0, 0)).toBe(0);
  });

  it('should handle negative results', () => {
    expect(argumentOfPeriapsis(0.5, 1.5)).toBeCloseTo(-1.0, 10);
  });
});

describe('meanAnomaly', () => {
  it('should compute M = L - w_bar', () => {
    expect(meanAnomaly(Math.PI, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('should normalize negative results to [0, 2π)', () => {
    const M = meanAnomaly(Math.PI / 4, Math.PI / 2);
    expect(M).toBeCloseTo(Math.PI * 1.75, 8);
    expect(M).toBeGreaterThanOrEqual(0);
    expect(M).toBeLessThan(2 * Math.PI);
  });

  it('should return 0 when L = w_bar', () => {
    expect(meanAnomaly(1.5, 1.5)).toBeCloseTo(0, 10);
  });

  it('should handle large angles', () => {
    const M = meanAnomaly(10 * Math.PI, 3 * Math.PI);
    expect(M).toBeGreaterThanOrEqual(0);
    expect(M).toBeLessThan(2 * Math.PI);
  });
});

describe('normalizeAngle', () => {
  it('should normalize 3π to π', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 10);
  });

  it('should normalize -π/2 to 3π/2', () => {
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(3 * Math.PI / 2, 10);
  });

  it('should return 0 for 0', () => {
    expect(normalizeAngle(0)).toBe(0);
  });

  it('should return 0 for 2π', () => {
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 10);
  });

  it('should normalize 5π/2 to π/2', () => {
    expect(normalizeAngle(5 * Math.PI / 2)).toBeCloseTo(Math.PI / 2, 10);
  });
});

describe('distance3D', () => {
  it('should return 1 for unit distance on x-axis', () => {
    expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBeCloseTo(1, 10);
  });

  it('should return √3 for (0,0,0) to (1,1,1)', () => {
    expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })).toBeCloseTo(Math.sqrt(3), 10);
  });

  it('should return 0 for same point', () => {
    expect(distance3D({ x: 5, y: 3, z: 7 }, { x: 5, y: 3, z: 7 })).toBe(0);
  });

  it('should return 2√3 for (-1,-1,-1) to (1,1,1)', () => {
    expect(distance3D({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 })).toBeCloseTo(2 * Math.sqrt(3), 10);
  });
});
