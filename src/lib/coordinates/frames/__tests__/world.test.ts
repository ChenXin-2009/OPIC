import * as THREE from 'three';
import {
  objectLocalToRenderWorld,
  renderWorldToObjectLocal,
  objectLocalToWorldQuat,
  worldToObjectLocalQuat,
} from '../world';

describe('objectLocalToRenderWorld', () => {
  it('should pass x unchanged', () => {
    const result = objectLocalToRenderWorld(new THREE.Vector3(1, 0, 0));
    expect(result.x).toBeCloseTo(1, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(0, 10);
  });

  it('should map Y-up to Z-up: (0,1,0) → (0,0,1)', () => {
    const result = objectLocalToRenderWorld(new THREE.Vector3(0, 1, 0));
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(1, 10);
  });

  it('should map Z to -Y: (0,0,1) → (0,-1,0)', () => {
    const result = objectLocalToRenderWorld(new THREE.Vector3(0, 0, 1));
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(-1, 10);
    expect(result.z).toBeCloseTo(0, 10);
  });

  it('should return a new Vector3 instance', () => {
    const input = new THREE.Vector3(1, 2, 3);
    const result = objectLocalToRenderWorld(input);
    expect(result).not.toBe(input);
  });
});

describe('renderWorldToObjectLocal', () => {
  it('should pass x unchanged', () => {
    const result = renderWorldToObjectLocal(new THREE.Vector3(1, 0, 0));
    expect(result.x).toBeCloseTo(1, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(0, 10);
  });

  it('should map Z-up to Y-up: (0,0,1) → (0,1,0)', () => {
    const result = renderWorldToObjectLocal(new THREE.Vector3(0, 0, 1));
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(1, 10);
    expect(result.z).toBeCloseTo(0, 10);
  });

  it('should map -Y to Z: (0,-1,0) → (0,0,1)', () => {
    const result = renderWorldToObjectLocal(new THREE.Vector3(0, -1, 0));
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(1, 10);
  });
});

describe('round-trip ObjectLocal ↔ RenderWorld', () => {
  it('should recover original vector', () => {
    const vectors = [
      new THREE.Vector3(1, 2, 3),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-5, 3, -7),
    ];

    for (const v of vectors) {
      const world = objectLocalToRenderWorld(v);
      const recovered = renderWorldToObjectLocal(world);
      expect(recovered.x).toBeCloseTo(v.x, 10);
      expect(recovered.y).toBeCloseTo(v.y, 10);
      expect(recovered.z).toBeCloseTo(v.z, 10);
    }
  });
});

describe('objectLocalToWorldQuat', () => {
  it('should return a Quaternion', () => {
    const q = objectLocalToWorldQuat();
    expect(q).toBeInstanceOf(THREE.Quaternion);
  });

  it('should rotate Y-up to Z-up', () => {
    const q = objectLocalToWorldQuat();
    const v = new THREE.Vector3(0, 1, 0);
    v.applyQuaternion(q);
    expect(v.x).toBeCloseTo(0, 8);
    expect(v.y).toBeCloseTo(0, 8);
    expect(v.z).toBeCloseTo(1, 8);
  });
});

describe('worldToObjectLocalQuat', () => {
  it('should return a Quaternion', () => {
    const q = worldToObjectLocalQuat();
    expect(q).toBeInstanceOf(THREE.Quaternion);
  });

  it('should rotate Z-up to Y-up', () => {
    const q = worldToObjectLocalQuat();
    const v = new THREE.Vector3(0, 0, 1);
    v.applyQuaternion(q);
    expect(v.x).toBeCloseTo(0, 8);
    expect(v.y).toBeCloseTo(1, 8);
    expect(v.z).toBeCloseTo(0, 8);
  });
});

describe('quaternion round-trip', () => {
  it('should compose to approximately identity', () => {
    const q1 = objectLocalToWorldQuat();
    const q2 = worldToObjectLocalQuat();
    const composed = q1.clone().multiply(q2);

    expect(composed.x).toBeCloseTo(0, 8);
    expect(composed.y).toBeCloseTo(0, 8);
    expect(composed.z).toBeCloseTo(0, 8);
    expect(composed.w).toBeCloseTo(1, 8);
  });
});
