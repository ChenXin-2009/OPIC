/**
 * Geometry utility functions for 3D rendering.
 * 
 * This module provides reusable functions for creating and manipulating
 * geometric shapes, lines, and curves used in the 3D visualization.
 */

import * as THREE from 'three';

/**
 * Creates a line geometry from an array of points.
 * 
 * Generates a BufferGeometry suitable for rendering as a line.
 * 
 * @param points - Array of 3D points
 * @returns BufferGeometry for the line
 * 
 * @example
 * ```typescript
 * const points = [
 *   new THREE.Vector3(0, 0, 0),
 *   new THREE.Vector3(1, 1, 1),
 *   new THREE.Vector3(2, 0, 2)
 * ];
 * const geometry = createLineGeometry(points);
 * const line = new THREE.Line(geometry, material);
 * ```
 */
export function createLineGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints(points);
}

/**
 * Creates points on a circle in 3D space.
 * 
 * Generates evenly spaced points around a circle with specified radius,
 * center, and orientation.
 * 
 * @param radius - Circle radius
 * @param segments - Number of points to generate
 * @param center - Center point of circle (default: origin)
 * @param normal - Normal vector defining circle plane (default: Y-up)
 * @returns Array of points on the circle
 * 
 * @example
 * ```typescript
 * // Create a horizontal circle with 32 points
 * const points = createCirclePoints(10, 32);
 * 
 * // Create a vertical circle
 * const verticalPoints = createCirclePoints(
 *   10,
 *   32,
 *   new THREE.Vector3(0, 0, 0),
 *   new THREE.Vector3(1, 0, 0)
 * );
 * ```
 */
export function createCirclePoints(
  radius: number,
  segments: number,
  center: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  
  // Create circle in XZ plane
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, 0, z));
  }
  
  // Rotate to align with normal if needed
  const defaultNormal = new THREE.Vector3(0, 1, 0);
  if (!normal.equals(defaultNormal)) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(defaultNormal, normal.clone().normalize());
    
    points.forEach(point => {
      point.applyQuaternion(quaternion);
      point.add(center);
    });
  } else {
    points.forEach(point => point.add(center));
  }
  
  return points;
}

/**
 * Creates points on a latitude line of a sphere.
 * 
 * Generates points along a circle of constant latitude on a sphere.
 * Useful for creating grid lines on planets.
 * 
 * @param radius - Sphere radius
 * @param latitude - Latitude angle in radians (-π/2 to π/2)
 * @param segments - Number of points to generate
 * @returns Array of points on the latitude line
 * 
 * @example
 * ```typescript
 * // Create equator line
 * const equator = createLatitudeLine(1, 0, 64);
 * 
 * // Create tropic of cancer (23.5° N)
 * const tropic = createLatitudeLine(1, 23.5 * Math.PI / 180, 64);
 * ```
 */
export function createLatitudeLine(
  radius: number,
  latitude: number,
  segments: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const r = radius * Math.cos(latitude);
  const y = radius * Math.sin(latitude);
  
  for (let i = 0; i <= segments; i++) {
    const lon = (i / segments) * Math.PI * 2;
    const x = r * Math.cos(lon);
    const z = r * Math.sin(lon);
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}

/**
 * Creates points on a longitude line of a sphere.
 * 
 * Generates points along a meridian (circle of constant longitude) on a sphere.
 * Useful for creating grid lines on planets.
 * 
 * @param radius - Sphere radius
 * @param longitude - Longitude angle in radians (0 to 2π)
 * @param segments - Number of points to generate
 * @returns Array of points on the longitude line
 * 
 * @example
 * ```typescript
 * // Create prime meridian
 * const primeMeridian = createLongitudeLine(1, 0, 64);
 * 
 * // Create 90° E meridian
 * const meridian90E = createLongitudeLine(1, Math.PI / 2, 64);
 * ```
 */
export function createLongitudeLine(
  radius: number,
  longitude: number,
  segments: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const lat = (i / segments) * Math.PI - Math.PI / 2;
    const r = radius * Math.cos(lat);
    const x = r * Math.cos(longitude);
    const y = radius * Math.sin(lat);
    const z = r * Math.sin(longitude);
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}

/**
 * Creates a sphere with specified parameters.
 * 
 * Generates a sphere geometry with customizable detail level.
 * 
 * @param radius - Sphere radius
 * @param widthSegments - Number of horizontal segments (default: 32)
 * @param heightSegments - Number of vertical segments (default: 32)
 * @returns Sphere geometry
 * 
 * @example
 * ```typescript
 * const geometry = createSphere(1, 64, 64); // High detail sphere
 * const mesh = new THREE.Mesh(geometry, material);
 * ```
 */
export function createSphere(
  radius: number,
  widthSegments: number = 32,
  heightSegments: number = 32
): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
}

/**
 * Creates a ring geometry.
 * 
 * Generates a flat ring (annulus) with inner and outer radius.
 * Useful for planetary rings.
 * 
 * @param innerRadius - Inner radius of ring
 * @param outerRadius - Outer radius of ring
 * @param thetaSegments - Number of segments around the ring (default: 64)
 * @returns Ring geometry
 * 
 * @example
 * ```typescript
 * const ringGeometry = createRing(1.5, 2.5, 128);
 * const ring = new THREE.Mesh(ringGeometry, ringMaterial);
 * ```
 */
export function createRing(
  innerRadius: number,
  outerRadius: number,
  thetaSegments: number = 64
): THREE.RingGeometry {
  return new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments);
}

/**
 * Calculates the bounding sphere of a set of points.
 * 
 * Finds the center and radius of the smallest sphere that contains all points.
 * 
 * @param points - Array of 3D points
 * @returns Object with center and radius of bounding sphere
 * 
 * @example
 * ```typescript
 * const bounds = calculateBoundingSphere(orbitPoints);
 * camera.position.set(bounds.center.x, bounds.center.y, bounds.center.z + bounds.radius * 2);
 * ```
 */
export function calculateBoundingSphere(points: THREE.Vector3[]): {
  center: THREE.Vector3;
  radius: number;
} {
  if (points.length === 0) {
    return { center: new THREE.Vector3(), radius: 0 };
  }
  
  // Calculate center as average of all points
  const center = new THREE.Vector3();
  points.forEach(point => center.add(point));
  center.divideScalar(points.length);
  
  // Calculate radius as maximum distance from center
  let radius = 0;
  points.forEach(point => {
    const distance = point.distanceTo(center);
    if (distance > radius) {
      radius = distance;
    }
  });
  
  return { center, radius };
}

/**
 * Samples points along a curve at regular intervals.
 * 
 * Generates evenly spaced points along a curve defined by control points.
 * Uses linear interpolation between control points.
 * 
 * @param controlPoints - Array of control points defining the curve
 * @param numSamples - Number of points to sample
 * @returns Array of sampled points
 * 
 * @example
 * ```typescript
 * const curve = [point1, point2, point3, point4];
 * const smoothCurve = sampleCurve(curve, 100);
 * ```
 */
export function sampleCurve(
  controlPoints: THREE.Vector3[],
  numSamples: number
): THREE.Vector3[] {
  if (controlPoints.length < 2) {
    return [...controlPoints];
  }
  
  const samples: THREE.Vector3[] = [];
  const segmentCount = controlPoints.length - 1;
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    const segmentIndex = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
    const segmentT = (t * segmentCount) - segmentIndex;
    
    const p1 = controlPoints[segmentIndex];
    const p2 = controlPoints[segmentIndex + 1];
    
    const point = new THREE.Vector3().lerpVectors(p1, p2, segmentT);
    samples.push(point);
  }
  
  return samples;
}

/**
 * Finds the closest point on a curve to a given position.
 * 
 * Searches through curve points to find the one closest to the target position.
 * 
 * @param curvePoints - Array of points defining the curve
 * @param position - Target position
 * @returns Index of closest point and the distance to it
 * 
 * @example
 * ```typescript
 * const { index, distance } = findClosestPointOnCurve(orbitPoints, planetPosition);
 * const closestPoint = orbitPoints[index];
 * ```
 */
export function findClosestPointOnCurve(
  curvePoints: THREE.Vector3[],
  position: THREE.Vector3
): { index: number; distance: number } {
  let closestIndex = 0;
  let minDistance = Infinity;
  
  curvePoints.forEach((point, index) => {
    const distance = point.distanceTo(position);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  
  return { index: closestIndex, distance: minDistance };
}

/**
 * Creates a tube geometry along a path.
 * 
 * Generates a tube that follows a curve defined by points.
 * 
 * @param points - Array of points defining the path
 * @param radius - Tube radius
 * @param radialSegments - Number of segments around the tube (default: 8)
 * @param closed - Whether the tube should be closed (default: false)
 * @returns Tube geometry
 * 
 * @example
 * ```typescript
 * const tubeGeometry = createTubeAlongPath(orbitPoints, 0.1, 16);
 * const tube = new THREE.Mesh(tubeGeometry, material);
 * ```
 */
export function createTubeAlongPath(
  points: THREE.Vector3[],
  radius: number,
  radialSegments: number = 8,
  closed: boolean = false
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  return new THREE.TubeGeometry(curve, points.length, radius, radialSegments, closed);
}

/**
 * Calculates the normal vector of a plane defined by three points.
 * 
 * Computes the normal vector perpendicular to the plane containing the three points.
 * 
 * @param p1 - First point
 * @param p2 - Second point
 * @param p3 - Third point
 * @returns Normalized normal vector
 * 
 * @example
 * ```typescript
 * const normal = calculatePlaneNormal(point1, point2, point3);
 * ```
 */
export function calculatePlaneNormal(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
): THREE.Vector3 {
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p3, p1);
  return new THREE.Vector3().crossVectors(v1, v2).normalize();
}
