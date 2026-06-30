import * as THREE from 'three';
import {
  calcPotential,
  normalizePotentials,
  potentialToColor,
  DEFAULT_GRID_CONFIG,
  ALL_BODY_IDS,
} from '../GravityFieldCalculator';

describe('calcPotential', () => {
  it('should return 0 for no bodies', () => {
    const point = new THREE.Vector3(0, 0, 0);
    expect(calcPotential(point, [])).toBe(0);
  });

  it('should calculate negative potential for a single body', () => {
    const point = new THREE.Vector3(0, 0, 0);
    const bodies = [{ name: 'earth', gm: 1, x: 1, y: 0, z: 0 }];
    const result = calcPotential(point, bodies);
    expect(result).toBeLessThan(0);
  });

  it('should clamp distance at MIN_DISTANCE_AU', () => {
    const point = new THREE.Vector3(0, 0, 0);
    const bodies = [{ name: 'earth', gm: 100, x: 0, y: 0, z: 0 }];
    const result = calcPotential(point, bodies);
    expect(result).toBeLessThan(0);
    expect(result).toBe(-100 / 1e-8);
  });

  it('should sum potentials from multiple bodies', () => {
    const point = new THREE.Vector3(0, 0, 0);
    const bodies = [
      { name: 'earth', gm: 1, x: 1, y: 0, z: 0 },
      { name: 'moon', gm: 0.5, x: -1, y: 0, z: 0 },
    ];
    const result = calcPotential(point, bodies);
    expect(result).toBe(-1 - 0.5);
  });
});

describe('normalizePotentials', () => {
  it('should return empty for count 0', () => {
    expect(normalizePotentials(new Float64Array(0), 0)).toEqual(new Float32Array(0));
  });

  it('should normalize values to [0, 1]', () => {
    const input = new Float64Array([-10, 0, 10]);
    const result = normalizePotentials(input, 3);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(0.5);
    expect(result[2]).toBeCloseTo(1);
  });

  it('should handle all same values', () => {
    const input = new Float64Array([5, 5, 5]);
    const result = normalizePotentials(input, 3);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(0);
  });

  it('should handle count less than array length', () => {
    const input = new Float64Array([0, 10, 20]);
    const result = normalizePotentials(input, 2);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(1);
    expect(result.length).toBe(2);
  });
});

describe('potentialToColor', () => {
  it('should return color for t < 0.15', () => {
    const [r, g, b] = potentialToColor(0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBeCloseTo(0.2);
  });

  it('should return color for t = 0.3', () => {
    const [r, g, b] = potentialToColor(0.3);
    expect(r).toBe(0);
    expect(g).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
  });

  it('should return color for t = 0.5', () => {
    const [r, g, b] = potentialToColor(0.5);
    expect(g).toBeGreaterThan(0);
  });

  it('should return color for t = 0.7', () => {
    const [r, g, b] = potentialToColor(0.7);
    expect(g).toBeLessThan(1);
  });

  it('should return color for t = 0.95', () => {
    const [r, g, b] = potentialToColor(0.95);
    expect(r).toBeCloseTo(1);
  });

  it('should return final color for t = 1', () => {
    const [r, g, b] = potentialToColor(1);
    expect(r).toBe(1);
  });
});

describe('DEFAULT_GRID_CONFIG', () => {
  it('should have all required properties', () => {
    expect(DEFAULT_GRID_CONFIG.segments).toBe(48);
    expect(DEFAULT_GRID_CONFIG.anchorBody).toBe('earth');
    expect(DEFAULT_GRID_CONFIG.gizmoMode).toBe('none');
  });
});

describe('ALL_BODY_IDS', () => {
  it('should contain solar system bodies', () => {
    expect(ALL_BODY_IDS).toContain('sun');
    expect(ALL_BODY_IDS).toContain('earth');
    expect(ALL_BODY_IDS).toContain('mars');
    expect(ALL_BODY_IDS).toContain('jupiter');
  });
});
