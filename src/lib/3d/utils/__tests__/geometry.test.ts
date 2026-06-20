import * as THREE from 'three';
import {
  createLineGeometry,
  createCirclePoints,
  createLatitudeLine,
  createLongitudeLine,
  calculateBoundingSphere,
  sampleCurve,
  findClosestPointOnCurve,
  calculatePlaneNormal,
} from '../geometry';

describe('createLineGeometry', () => {
  it('should create geometry from points', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(2, 0, 2),
    ];
    const geometry = createLineGeometry(points);
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    const position = geometry.getAttribute('position');
    expect(position.count).toBe(3);
  });

  it('should preserve vertex positions', () => {
    const points = [
      new THREE.Vector3(1, 2, 3),
      new THREE.Vector3(4, 5, 6),
    ];
    const geometry = createLineGeometry(points);
    const position = geometry.getAttribute('position');
    expect(position.getX(0)).toBeCloseTo(1);
    expect(position.getY(0)).toBeCloseTo(2);
    expect(position.getZ(0)).toBeCloseTo(3);
  });
});

describe('createCirclePoints', () => {
  it('should create points in XZ plane with default normal', () => {
    const points = createCirclePoints(1, 4);
    expect(points.length).toBe(5);
    points.forEach(p => {
      expect(Math.abs(p.y)).toBeCloseTo(0);
      const dist = Math.sqrt(p.x * p.x + p.z * p.z);
      expect(dist).toBeCloseTo(1);
    });
  });

  it('should create specified number of segments plus closing point', () => {
    const points = createCirclePoints(1, 8);
    expect(points.length).toBe(9);
  });

  it('should offset by center', () => {
    const center = new THREE.Vector3(5, 5, 5);
    const points = createCirclePoints(1, 4, center);
    points.forEach(p => {
      expect(p.y).toBeCloseTo(5);
    });
  });

  it('should rotate to custom normal', () => {
    const normal = new THREE.Vector3(1, 0, 0);
    const points = createCirclePoints(1, 4, new THREE.Vector3(), normal);
    points.forEach(p => {
      expect(Math.abs(p.x)).toBeCloseTo(0);
    });
  });

  it('should respect different radii', () => {
    const points = createCirclePoints(5, 8);
    points.forEach(p => {
      const dist = Math.sqrt(p.x * p.x + p.z * p.z);
      expect(dist).toBeCloseTo(5);
    });
  });
});

describe('createLatitudeLine', () => {
  it('should create equator at correct radius', () => {
    const points = createLatitudeLine(1, 0, 16);
    expect(points.length).toBe(17);
    points.forEach(p => {
      expect(p.y).toBeCloseTo(0);
      const dist = Math.sqrt(p.x * p.x + p.z * p.z);
      expect(dist).toBeCloseTo(1);
    });
  });

  it('should place north pole as single point', () => {
    const points = createLatitudeLine(1, Math.PI / 2, 16);
    expect(points.length).toBe(17);
    points.forEach(p => {
      expect(p.y).toBeCloseTo(1);
      expect(p.x).toBeCloseTo(0);
      expect(p.z).toBeCloseTo(0);
    });
  });

  it('should place south pole as single point', () => {
    const points = createLatitudeLine(1, -Math.PI / 2, 16);
    points.forEach(p => {
      expect(p.y).toBeCloseTo(-1);
      expect(p.x).toBeCloseTo(0);
      expect(p.z).toBeCloseTo(0);
    });
  });

  it('should scale with radius', () => {
    const points = createLatitudeLine(5, 0, 4);
    points.forEach(p => {
      const dist = Math.sqrt(p.x * p.x + p.z * p.z);
      expect(dist).toBeCloseTo(5);
    });
  });
});

describe('createLongitudeLine', () => {
  it('should create prime meridian in XZ plane', () => {
    const points = createLongitudeLine(1, 0, 16);
    expect(points.length).toBe(17);
    points.forEach(p => {
      expect(Math.abs(p.z)).toBeCloseTo(0);
    });
  });

  it('should pass through north and south poles', () => {
    const points = createLongitudeLine(1, 0, 16);
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    expect(firstPoint.y).toBeCloseTo(-1);
    expect(lastPoint.y).toBeCloseTo(1);
  });

  it('should rotate with longitude', () => {
    const points = createLongitudeLine(1, Math.PI / 2, 4);
    points.forEach(p => {
      expect(Math.abs(p.x)).toBeCloseTo(0);
    });
  });
});

describe('calculateBoundingSphere', () => {
  it('should return zero radius for empty array', () => {
    const result = calculateBoundingSphere([]);
    expect(result.radius).toBe(0);
    expect(result.center.x).toBe(0);
    expect(result.center.y).toBe(0);
    expect(result.center.z).toBe(0);
  });

  it('should return center and zero radius for single point', () => {
    const points = [new THREE.Vector3(1, 2, 3)];
    const result = calculateBoundingSphere(points);
    expect(result.center.x).toBeCloseTo(1);
    expect(result.center.y).toBeCloseTo(2);
    expect(result.center.z).toBeCloseTo(3);
    expect(result.radius).toBe(0);
  });

  it('should calculate correct center and radius for multiple points', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 0),
    ];
    const result = calculateBoundingSphere(points);
    expect(result.center.x).toBeCloseTo(1);
    expect(result.radius).toBeCloseTo(1);
  });

  it('should handle symmetric points', () => {
    const points = [
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ];
    const result = calculateBoundingSphere(points);
    expect(result.center.x).toBeCloseTo(0);
    expect(result.radius).toBeCloseTo(1);
  });
});

describe('sampleCurve', () => {
  it('should return original points for fewer than 2 control points', () => {
    const points = [new THREE.Vector3(1, 2, 3)];
    const result = sampleCurve(points, 10);
    expect(result.length).toBe(1);
    expect(result[0].x).toBeCloseTo(1);
  });

  it('should interpolate between two control points', () => {
    const controlPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
    ];
    const result = sampleCurve(controlPoints, 5);
    expect(result.length).toBe(5);
    expect(result[0].x).toBeCloseTo(0);
    expect(result[4].x).toBeCloseTo(10);
    expect(result[2].x).toBeCloseTo(5);
  });

  it('should sample across multiple segments', () => {
    const controlPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      new THREE.Vector3(10, 0, 0),
    ];
    const result = sampleCurve(controlPoints, 11);
    expect(result.length).toBe(11);
    expect(result[0].x).toBeCloseTo(0);
    expect(result[5].x).toBeCloseTo(5);
    expect(result[10].x).toBeCloseTo(10);
  });

  it('should return the single point for 1 control point', () => {
    const controlPoints = [new THREE.Vector3(3, 3, 3)];
    const result = sampleCurve(controlPoints, 5);
    expect(result.length).toBe(1);
  });
});

describe('findClosestPointOnCurve', () => {
  it('should find closest point in normal case', () => {
    const curve = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      new THREE.Vector3(10, 0, 0),
    ];
    const position = new THREE.Vector3(6, 0, 0);
    const result = findClosestPointOnCurve(curve, position);
    expect(result.index).toBe(1);
    expect(result.distance).toBeCloseTo(1);
  });

  it('should return first point when closest', () => {
    const curve = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
    ];
    const position = new THREE.Vector3(-1, 0, 0);
    const result = findClosestPointOnCurve(curve, position);
    expect(result.index).toBe(0);
  });

  it('should return last point when closest', () => {
    const curve = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
    ];
    const position = new THREE.Vector3(11, 0, 0);
    const result = findClosestPointOnCurve(curve, position);
    expect(result.index).toBe(1);
  });

  it('should return zero distance for exact match', () => {
    const curve = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 5, 5),
    ];
    const position = new THREE.Vector3(5, 5, 5);
    const result = findClosestPointOnCurve(curve, position);
    expect(result.index).toBe(1);
    expect(result.distance).toBeCloseTo(0);
  });
});

describe('calculatePlaneNormal', () => {
  it('should calculate known triangle normal', () => {
    const p1 = new THREE.Vector3(0, 0, 0);
    const p2 = new THREE.Vector3(1, 0, 0);
    const p3 = new THREE.Vector3(0, 1, 0);
    const normal = calculatePlaneNormal(p1, p2, p3);
    expect(normal.z).toBeCloseTo(1);
    expect(normal.x).toBeCloseTo(0);
    expect(normal.y).toBeCloseTo(0);
  });

  it('should return normalized vector', () => {
    const p1 = new THREE.Vector3(0, 0, 0);
    const p2 = new THREE.Vector3(10, 0, 0);
    const p3 = new THREE.Vector3(0, 20, 0);
    const normal = calculatePlaneNormal(p1, p2, p3);
    expect(normal.length()).toBeCloseTo(1);
  });

  it('should handle triangle in XZ plane', () => {
    const p1 = new THREE.Vector3(0, 0, 0);
    const p2 = new THREE.Vector3(1, 0, 0);
    const p3 = new THREE.Vector3(0, 0, 1);
    const normal = calculatePlaneNormal(p1, p2, p3);
    expect(normal.y).toBeCloseTo(-1);
    expect(normal.x).toBeCloseTo(0);
    expect(normal.z).toBeCloseTo(0);
  });
});
