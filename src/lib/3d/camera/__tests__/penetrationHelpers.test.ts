import * as THREE from 'three';
import {
  calculatePenetrationDepth,
  isDeepPenetration,
  calculatePenetrationRatio,
  calculateSafeCameraPosition,
  calculateAdaptiveSmoothness,
  easeOutQuart,
  calculateMinSafeDistance,
} from '../penetrationHelpers';

describe('calculatePenetrationDepth', () => {
  it('should return 0 when not penetrating', () => {
    expect(calculatePenetrationDepth(1.5, 1.0)).toBe(0);
  });

  it('should return positive depth when penetrating', () => {
    expect(calculatePenetrationDepth(0.8, 1.0)).toBeCloseTo(0.2);
  });

  it('should return 0 for zero depth (camera on surface)', () => {
    expect(calculatePenetrationDepth(1.0, 1.0)).toBe(0);
  });

  it('should handle large penetration', () => {
    expect(calculatePenetrationDepth(0.1, 1.0)).toBeCloseTo(0.9);
  });
});

describe('isDeepPenetration', () => {
  it('should return true for deep penetration (>70%)', () => {
    expect(isDeepPenetration(0.8, 1.0)).toBe(true);
  });

  it('should return false for shallow penetration (<70%)', () => {
    expect(isDeepPenetration(0.5, 1.0)).toBe(false);
  });

  it('should return false at exact boundary (70%)', () => {
    expect(isDeepPenetration(0.7, 1.0)).toBe(false);
  });

  it('should return true for very deep penetration', () => {
    expect(isDeepPenetration(0.99, 1.0)).toBe(true);
  });
});

describe('calculatePenetrationRatio', () => {
  it('should return 0.5 for 50% penetration', () => {
    expect(calculatePenetrationRatio(0.5, 1.0)).toBe(0.5);
  });

  it('should return 0.8 for 80% penetration', () => {
    expect(calculatePenetrationRatio(0.8, 1.0)).toBe(0.8);
  });

  it('should return 0 for no penetration', () => {
    expect(calculatePenetrationRatio(0, 1.0)).toBe(0);
  });

  it('should return 1 for full penetration', () => {
    expect(calculatePenetrationRatio(1.0, 1.0)).toBe(1);
  });
});

describe('calculateSafeCameraPosition', () => {
  it('should calculate safe position in normal direction', () => {
    const center = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(1, 0, 0);
    const safeDistance = 5;

    const result = calculateSafeCameraPosition(center, direction, safeDistance);

    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });

  it('should use default direction when zero direction', () => {
    const center = new THREE.Vector3(1, 2, 3);
    const direction = new THREE.Vector3(0, 0, 0);
    const safeDistance = 5;

    const result = calculateSafeCameraPosition(center, direction, safeDistance);

    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(7);
    expect(result.z).toBeCloseTo(3);
  });

  it('should handle zero safe distance', () => {
    const center = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(1, 1, 0);
    const safeDistance = 0;

    const result = calculateSafeCameraPosition(center, direction, safeDistance);

    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });

  it('should normalize direction before scaling', () => {
    const center = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(3, 0, 0);
    const safeDistance = 6;

    const result = calculateSafeCameraPosition(center, direction, safeDistance);

    expect(result.x).toBeCloseTo(6);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });
});

describe('calculateAdaptiveSmoothness', () => {
  it('should return value within range for light penetration', () => {
    const result = calculateAdaptiveSmoothness(0.3, 0.016);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should return value within range for deep penetration', () => {
    const result = calculateAdaptiveSmoothness(0.8, 0.016);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should be capped at 1 for large deltaTime', () => {
    const result = calculateAdaptiveSmoothness(0.8, 100);
    expect(result).toBe(1);
  });

  it('should use minimum deltaTime of 0.0001', () => {
    const result = calculateAdaptiveSmoothness(0.5, 0);
    expect(result).toBeGreaterThan(0);
  });
});

describe('easeOutQuart', () => {
  it('should return 0 at t=0', () => {
    expect(easeOutQuart(0)).toBe(0);
  });

  it('should return 0.9375 at t=0.5', () => {
    expect(easeOutQuart(0.5)).toBeCloseTo(0.9375);
  });

  it('should return 1 at t=1', () => {
    expect(easeOutQuart(1)).toBe(1);
  });

  it('should return 0 at t=0 (boundary)', () => {
    expect(easeOutQuart(0)).toBe(0);
  });

  it('should be monotonically increasing', () => {
    const v1 = easeOutQuart(0.1);
    const v2 = easeOutQuart(0.5);
    const v3 = easeOutQuart(0.9);
    expect(v1).toBeLessThan(v2);
    expect(v2).toBeLessThan(v3);
  });
});

describe('calculateMinSafeDistance', () => {
  it('should return scaled distance for typical radius', () => {
    const result = calculateMinSafeDistance(1.0);
    expect(result).toBeCloseTo(1.000001);
  });

  it('should return scaled distance for small radius', () => {
    const result = calculateMinSafeDistance(0.0001);
    expect(result).toBeGreaterThan(0.0001);
  });

  it('should return scaled distance for large radius', () => {
    const result = calculateMinSafeDistance(6371000);
    expect(result).toBeGreaterThan(6371000);
  });
});
