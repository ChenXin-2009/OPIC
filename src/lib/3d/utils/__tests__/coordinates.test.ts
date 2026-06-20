import * as THREE from 'three';
import {
  getDirectionVector,
  createAxisRotation,
  createQuaternionFromEuler,
  createAxisAngleRotation,
  sphericalToCartesian,
  ensureMinimumDistance,
  getOrbitalVelocityDirection,
  applyQuaternionToVector,
  combineQuaternions,
  distanceToLineSegment,
} from '../coordinates';

describe('getDirectionVector', () => {
  it('should return normalized direction from one point to another', () => {
    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(0, 0, 5);
    const dir = getDirectionVector(from, to);
    expect(dir.x).toBeCloseTo(0);
    expect(dir.y).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(1);
    expect(dir.length()).toBeCloseTo(1);
  });

  it('should return default direction when points are nearly identical', () => {
    const from = new THREE.Vector3(1, 1, 1);
    const to = new THREE.Vector3(1, 1, 1);
    const dir = getDirectionVector(from, to);
    expect(dir.length()).toBeCloseTo(1);
  });

  it('should return custom default direction when points are close', () => {
    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(0.0001, 0, 0);
    const customDefault = new THREE.Vector3(1, 0, 0);
    const dir = getDirectionVector(from, to, customDefault);
    expect(dir.x).toBeCloseTo(1);
    expect(dir.y).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(0);
  });

  it('should handle single-axis direction', () => {
    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(0, 3, 0);
    const dir = getDirectionVector(from, to);
    expect(dir.x).toBeCloseTo(0);
    expect(dir.y).toBeCloseTo(1);
    expect(dir.z).toBeCloseTo(0);
  });

  it('should normalize diagonal directions', () => {
    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(1, 1, 1);
    const dir = getDirectionVector(from, to);
    expect(dir.length()).toBeCloseTo(1);
    expect(dir.x).toBeCloseTo(1 / Math.sqrt(3));
  });
});

describe('createAxisRotation', () => {
  it('should return identity quaternion for same axes', () => {
    const from = new THREE.Vector3(0, 1, 0);
    const to = new THREE.Vector3(0, 1, 0);
    const quat = createAxisRotation(from, to);
    const identity = new THREE.Quaternion();
    expect(quat.x).toBeCloseTo(identity.x);
    expect(quat.y).toBeCloseTo(identity.y);
    expect(quat.z).toBeCloseTo(identity.z);
    expect(quat.w).toBeCloseTo(identity.w);
  });

  it('should create 90 degree rotation between perpendicular axes', () => {
    const from = new THREE.Vector3(0, 1, 0);
    const to = new THREE.Vector3(1, 0, 0);
    const quat = createAxisRotation(from, to);
    const rotated = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    expect(rotated.x).toBeCloseTo(1);
    expect(rotated.y).toBeCloseTo(0);
    expect(rotated.z).toBeCloseTo(0);
  });

  it('should normalize unnormalized input axes', () => {
    const from = new THREE.Vector3(0, 5, 0);
    const to = new THREE.Vector3(0, 0, 3);
    const quat = createAxisRotation(from, to);
    const rotated = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    expect(rotated.z).toBeCloseTo(1);
  });
});

describe('createQuaternionFromEuler', () => {
  it('should return identity quaternion for zero rotation', () => {
    const quat = createQuaternionFromEuler(0, 0, 0);
    const identity = new THREE.Quaternion();
    expect(quat.x).toBeCloseTo(identity.x);
    expect(quat.y).toBeCloseTo(identity.y);
    expect(quat.z).toBeCloseTo(identity.z);
    expect(quat.w).toBeCloseTo(identity.w);
  });

  it('should create correct rotation for Y axis', () => {
    const quat = createQuaternionFromEuler(0, Math.PI / 2, 0);
    const v = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });

  it('should respect rotation order', () => {
    const quatXYZ = createQuaternionFromEuler(Math.PI / 4, Math.PI / 4, Math.PI / 4, 'XYZ');
    const quatZXY = createQuaternionFromEuler(Math.PI / 4, Math.PI / 4, Math.PI / 4, 'ZXY');
    const v1 = new THREE.Vector3(1, 0, 0).applyQuaternion(quatXYZ);
    const v2 = new THREE.Vector3(1, 0, 0).applyQuaternion(quatZXY);
    expect(v1.distanceTo(v2)).toBeGreaterThan(0.001);
  });
});

describe('createAxisAngleRotation', () => {
  it('should create 90 degree rotation around Y axis', () => {
    const axis = new THREE.Vector3(0, 1, 0);
    const quat = createAxisAngleRotation(axis, Math.PI / 2);
    const v = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(-1);
  });

  it('should return identity quaternion for zero angle', () => {
    const axis = new THREE.Vector3(0, 1, 0);
    const quat = createAxisAngleRotation(axis, 0);
    const identity = new THREE.Quaternion();
    expect(quat.w).toBeCloseTo(identity.w);
    expect(quat.x).toBeCloseTo(identity.x);
    expect(quat.y).toBeCloseTo(identity.y);
    expect(quat.z).toBeCloseTo(identity.z);
  });

  it('should normalize unnormalized axis', () => {
    const axis = new THREE.Vector3(0, 10, 0);
    const quat = createAxisAngleRotation(axis, Math.PI);
    const v = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    expect(v.x).toBeCloseTo(-1);
  });
});

describe('sphericalToCartesian', () => {
  it('should place point at north pole', () => {
    const pos = sphericalToCartesian(1, Math.PI / 2, 0);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(1);
    expect(pos.z).toBeCloseTo(0);
  });

  it('should place point at south pole', () => {
    const pos = sphericalToCartesian(1, -Math.PI / 2, 0);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(-1);
    expect(pos.z).toBeCloseTo(0);
  });

  it('should place point at equator (0 longitude)', () => {
    const pos = sphericalToCartesian(1, 0, 0);
    expect(pos.x).toBeCloseTo(1);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(0);
  });

  it('should place point at equator (π/2 longitude)', () => {
    const pos = sphericalToCartesian(1, 0, Math.PI / 2);
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(1);
  });

  it('should scale with radius', () => {
    const pos = sphericalToCartesian(5, 0, 0);
    expect(pos.x).toBeCloseTo(5);
  });

  it('should maintain distance from origin equal to radius', () => {
    const pos = sphericalToCartesian(3, 0.5, 1.2);
    expect(pos.length()).toBeCloseTo(3);
  });
});

describe('ensureMinimumDistance', () => {
  it('should return position unchanged when already far enough', () => {
    const center = new THREE.Vector3(0, 0, 0);
    const proposed = new THREE.Vector3(10, 0, 0);
    const result = ensureMinimumDistance(center, proposed, 1);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });

  it('should push position out when too close', () => {
    const center = new THREE.Vector3(0, 0, 0);
    const proposed = new THREE.Vector3(1, 0, 0);
    const result = ensureMinimumDistance(center, proposed, 5);
    const dist = result.distanceTo(center);
    expect(dist).toBeCloseTo(5);
  });

  it('should handle position equal to center using default direction', () => {
    const center = new THREE.Vector3(0, 0, 0);
    const proposed = new THREE.Vector3(0, 0, 0);
    const result = ensureMinimumDistance(center, proposed, 5);
    const dist = result.distanceTo(center);
    expect(dist).toBeCloseTo(5);
  });

  it('should not modify original proposed position', () => {
    const center = new THREE.Vector3(0, 0, 0);
    const proposed = new THREE.Vector3(1, 0, 0);
    ensureMinimumDistance(center, proposed, 5);
    expect(proposed.x).toBeCloseTo(1);
  });
});

describe('getOrbitalVelocityDirection', () => {
  it('should return direction toward next point', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 0, 0),
    ];
    const dir = getOrbitalVelocityDirection(points, 0);
    expect(dir.x).toBeCloseTo(1);
    expect(dir.y).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(0);
  });

  it('should wrap around at end of array', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 0, 0),
    ];
    const dir = getOrbitalVelocityDirection(points, 2);
    expect(dir.x).toBeCloseTo(-1);
    expect(dir.y).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(0);
    expect(dir.length()).toBeCloseTo(1);
  });

  it('should return normalized vector', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3, 4, 0),
    ];
    const dir = getOrbitalVelocityDirection(points, 0);
    expect(dir.length()).toBeCloseTo(1);
  });
});

describe('applyQuaternionToVector', () => {
  it('should not modify original vector', () => {
    const v = new THREE.Vector3(1, 0, 0);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    applyQuaternionToVector(v, q);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });

  it('should return vector rotated by identity quaternion unchanged', () => {
    const v = new THREE.Vector3(1, 2, 3);
    const q = new THREE.Quaternion();
    const result = applyQuaternionToVector(v, q);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
    expect(result.z).toBeCloseTo(3);
  });

  it('should correctly apply 90 degree rotation around Y', () => {
    const v = new THREE.Vector3(1, 0, 0);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const result = applyQuaternionToVector(v, q);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(-1);
  });
});

describe('combineQuaternions', () => {
  it('should return identity for empty array', () => {
    const result = combineQuaternions([]);
    const identity = new THREE.Quaternion();
    expect(result.w).toBeCloseTo(identity.w);
    expect(result.x).toBeCloseTo(identity.x);
    expect(result.y).toBeCloseTo(identity.y);
    expect(result.z).toBeCloseTo(identity.z);
  });

  it('should return the same quaternion for single element', () => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
    const result = combineQuaternions([q]);
    expect(result.x).toBeCloseTo(q.x);
    expect(result.y).toBeCloseTo(q.y);
    expect(result.z).toBeCloseTo(q.z);
    expect(result.w).toBeCloseTo(q.w);
  });

  it('should combine multiple quaternions in order', () => {
    const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const result = combineQuaternions([q1, q2]);
    const v = new THREE.Vector3(1, 0, 0).applyQuaternion(result);
    expect(v.x).toBeCloseTo(-1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });
});

describe('distanceToLineSegment', () => {
  it('should return distance to nearest point on line', () => {
    const point = new THREE.Vector3(0, 1, 0);
    const lineStart = new THREE.Vector3(0, 0, 0);
    const lineEnd = new THREE.Vector3(1, 0, 0);
    const dist = distanceToLineSegment(point, lineStart, lineEnd);
    expect(dist).toBeCloseTo(1);
  });

  it('should return distance to start of segment when projection is before start', () => {
    const point = new THREE.Vector3(-5, 1, 0);
    const lineStart = new THREE.Vector3(0, 0, 0);
    const lineEnd = new THREE.Vector3(1, 0, 0);
    const dist = distanceToLineSegment(point, lineStart, lineEnd);
    expect(dist).toBeCloseTo(Math.sqrt(26));
  });

  it('should return distance to end of segment when projection is beyond end', () => {
    const point = new THREE.Vector3(5, 1, 0);
    const lineStart = new THREE.Vector3(0, 0, 0);
    const lineEnd = new THREE.Vector3(1, 0, 0);
    const dist = distanceToLineSegment(point, lineStart, lineEnd);
    expect(dist).toBeCloseTo(Math.sqrt(17));
  });

  it('should return distance to start for zero-length segment', () => {
    const point = new THREE.Vector3(3, 4, 0);
    const lineStart = new THREE.Vector3(0, 0, 0);
    const lineEnd = new THREE.Vector3(0, 0, 0);
    const dist = distanceToLineSegment(point, lineStart, lineEnd);
    expect(dist).toBeCloseTo(5);
  });

  it('should return 0 when point is on the segment', () => {
    const point = new THREE.Vector3(0.5, 0, 0);
    const lineStart = new THREE.Vector3(0, 0, 0);
    const lineEnd = new THREE.Vector3(1, 0, 0);
    const dist = distanceToLineSegment(point, lineStart, lineEnd);
    expect(dist).toBeCloseTo(0);
  });
});
