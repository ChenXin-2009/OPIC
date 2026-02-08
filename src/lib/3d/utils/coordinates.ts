/**
 * Coordinate transformation utilities for 3D rendering.
 * 
 * This module provides reusable functions for common coordinate transformations,
 * vector operations, and rotation calculations used throughout the 3D rendering system.
 */

import * as THREE from 'three';

/**
 * Creates a normalized direction vector from two points.
 * 
 * Calculates the direction from point A to point B and normalizes it.
 * Returns a default direction if the points are too close together.
 * 
 * @param from - Starting point
 * @param to - Ending point
 * @param defaultDirection - Default direction if points are too close (default: [0, 0.5, 1])
 * @returns Normalized direction vector
 * 
 * @example
 * ```typescript
 * const dir = getDirectionVector(cameraPos, targetPos);
 * const newPos = targetPos.clone().add(dir.multiplyScalar(distance));
 * ```
 */
export function getDirectionVector(
  from: THREE.Vector3,
  to: THREE.Vector3,
  defaultDirection: THREE.Vector3 = new THREE.Vector3(0, 0.5, 1)
): THREE.Vector3 {
  const direction = new THREE.Vector3().subVectors(to, from);
  
  if (direction.length() < 0.001) {
    return defaultDirection.clone().normalize();
  }
  
  return direction.normalize();
}

/**
 * Creates a quaternion that rotates from one axis to another.
 * 
 * Calculates the rotation needed to align the source axis with the target axis.
 * Commonly used for aligning planet rotation axes or orbital planes.
 * 
 * @param fromAxis - Source axis (will be normalized)
 * @param toAxis - Target axis (will be normalized)
 * @returns Quaternion representing the rotation
 * 
 * @example
 * ```typescript
 * const defaultAxis = new THREE.Vector3(0, 1, 0);
 * const planetAxis = new THREE.Vector3(0, 0.5, 0.866); // 30° tilt
 * const rotation = createAxisRotation(defaultAxis, planetAxis);
 * mesh.quaternion.copy(rotation);
 * ```
 */
export function createAxisRotation(
  fromAxis: THREE.Vector3,
  toAxis: THREE.Vector3
): THREE.Quaternion {
  const quaternion = new THREE.Quaternion();
  const normalizedFrom = fromAxis.clone().normalize();
  const normalizedTo = toAxis.clone().normalize();
  quaternion.setFromUnitVectors(normalizedFrom, normalizedTo);
  return quaternion;
}

/**
 * Creates a quaternion from Euler angles.
 * 
 * Converts rotation angles (in radians) to a quaternion.
 * Uses XYZ rotation order by default.
 * 
 * @param x - Rotation around X axis (radians)
 * @param y - Rotation around Y axis (radians)
 * @param z - Rotation around Z axis (radians)
 * @param order - Rotation order (default: 'XYZ')
 * @returns Quaternion representing the rotation
 * 
 * @example
 * ```typescript
 * const rotation = createQuaternionFromEuler(0, Math.PI / 4, 0);
 * object.quaternion.copy(rotation);
 * ```
 */
export function createQuaternionFromEuler(
  x: number,
  y: number,
  z: number,
  order: THREE.EulerOrder = 'XYZ'
): THREE.Quaternion {
  const euler = new THREE.Euler(x, y, z, order);
  return new THREE.Quaternion().setFromEuler(euler);
}

/**
 * Creates a quaternion for rotation around an axis.
 * 
 * Generates a quaternion that rotates by the specified angle around the given axis.
 * The axis will be normalized automatically.
 * 
 * @param axis - Rotation axis (will be normalized)
 * @param angle - Rotation angle in radians
 * @returns Quaternion representing the rotation
 * 
 * @example
 * ```typescript
 * const axis = new THREE.Vector3(0, 1, 0); // Y axis
 * const rotation = createAxisAngleRotation(axis, Math.PI / 2); // 90° rotation
 * object.quaternion.copy(rotation);
 * ```
 */
export function createAxisAngleRotation(
  axis: THREE.Vector3,
  angle: number
): THREE.Quaternion {
  const quaternion = new THREE.Quaternion();
  const normalizedAxis = axis.clone().normalize();
  quaternion.setFromAxisAngle(normalizedAxis, angle);
  return quaternion;
}

/**
 * Calculates a position on a sphere using spherical coordinates.
 * 
 * Converts spherical coordinates (radius, latitude, longitude) to Cartesian coordinates.
 * Useful for positioning objects on planetary surfaces or creating orbital paths.
 * 
 * @param radius - Distance from origin
 * @param latitude - Latitude angle in radians (-π/2 to π/2)
 * @param longitude - Longitude angle in radians (0 to 2π)
 * @returns Position vector in Cartesian coordinates
 * 
 * @example
 * ```typescript
 * // Position at equator, 0° longitude
 * const pos = sphericalToCartesian(1, 0, 0);
 * 
 * // Position at north pole
 * const northPole = sphericalToCartesian(1, Math.PI / 2, 0);
 * ```
 */
export function sphericalToCartesian(
  radius: number,
  latitude: number,
  longitude: number
): THREE.Vector3 {
  const x = radius * Math.cos(latitude) * Math.cos(longitude);
  const y = radius * Math.sin(latitude);
  const z = radius * Math.cos(latitude) * Math.sin(longitude);
  return new THREE.Vector3(x, y, z);
}

/**
 * Calculates the safe position for a camera or object outside a minimum distance.
 * 
 * Ensures a position is at least minDistance away from a center point.
 * If the proposed position is too close, it's pushed out along the direction vector.
 * 
 * @param center - Center point to maintain distance from
 * @param proposedPosition - Desired position
 * @param minDistance - Minimum allowed distance from center
 * @param defaultDirection - Direction to use if proposed position equals center
 * @returns Safe position at least minDistance from center
 * 
 * @example
 * ```typescript
 * const safePos = ensureMinimumDistance(
 *   planetCenter,
 *   cameraPosition,
 *   planetRadius * 2,
 *   new THREE.Vector3(0, 1, 0)
 * );
 * camera.position.copy(safePos);
 * ```
 */
export function ensureMinimumDistance(
  center: THREE.Vector3,
  proposedPosition: THREE.Vector3,
  minDistance: number,
  defaultDirection: THREE.Vector3 = new THREE.Vector3(0, 0.5, 1)
): THREE.Vector3 {
  const direction = getDirectionVector(center, proposedPosition, defaultDirection);
  const currentDistance = proposedPosition.distanceTo(center);
  
  if (currentDistance < minDistance) {
    return center.clone().add(direction.multiplyScalar(minDistance));
  }
  
  return proposedPosition.clone();
}

/**
 * Calculates the velocity direction vector for orbital motion.
 * 
 * Estimates the velocity direction at a point on an orbit by looking at
 * the direction to the next point in the orbit path.
 * 
 * @param points - Array of orbit points
 * @param currentIndex - Index of current position
 * @returns Normalized velocity direction vector
 * 
 * @example
 * ```typescript
 * const velocity = getOrbitalVelocityDirection(orbitPoints, closestIndex);
 * const tangent = velocity.cross(normal); // Calculate tangent for effects
 * ```
 */
export function getOrbitalVelocityDirection(
  points: THREE.Vector3[],
  currentIndex: number
): THREE.Vector3 {
  const nextIndex = (currentIndex + 1) % points.length;
  return new THREE.Vector3()
    .subVectors(points[nextIndex], points[currentIndex])
    .normalize();
}

/**
 * Applies a rotation quaternion to a vector and returns the result.
 * 
 * Rotates a vector by a quaternion without modifying the original vector.
 * 
 * @param vector - Vector to rotate
 * @param quaternion - Rotation to apply
 * @returns Rotated vector (new instance)
 * 
 * @example
 * ```typescript
 * const rotated = applyQuaternionToVector(originalVector, rotationQuat);
 * ```
 */
export function applyQuaternionToVector(
  vector: THREE.Vector3,
  quaternion: THREE.Quaternion
): THREE.Vector3 {
  return vector.clone().applyQuaternion(quaternion);
}

/**
 * Combines multiple quaternions into a single rotation.
 * 
 * Multiplies quaternions in order to create a combined rotation.
 * The rotations are applied in the order they appear in the array.
 * 
 * @param quaternions - Array of quaternions to combine
 * @returns Combined quaternion
 * 
 * @example
 * ```typescript
 * const combined = combineQuaternions([tiltRotation, spinRotation, orbitRotation]);
 * object.quaternion.copy(combined);
 * ```
 */
export function combineQuaternions(quaternions: THREE.Quaternion[]): THREE.Quaternion {
  if (quaternions.length === 0) {
    return new THREE.Quaternion();
  }
  
  const result = quaternions[0].clone();
  for (let i = 1; i < quaternions.length; i++) {
    result.multiply(quaternions[i]);
  }
  
  return result;
}

/**
 * Calculates the distance from a point to a line segment.
 * 
 * Finds the shortest distance between a point and a line segment defined by two points.
 * 
 * @param point - Point to measure from
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @returns Distance from point to nearest point on line segment
 * 
 * @example
 * ```typescript
 * const dist = distanceToLineSegment(mousePos, lineStart, lineEnd);
 * if (dist < threshold) {
 *   // Point is close to line
 * }
 * ```
 */
export function distanceToLineSegment(
  point: THREE.Vector3,
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3
): number {
  const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
  const lineLength = line.length();
  
  if (lineLength < 0.0001) {
    return point.distanceTo(lineStart);
  }
  
  const t = Math.max(0, Math.min(1, 
    new THREE.Vector3().subVectors(point, lineStart).dot(line) / (lineLength * lineLength)
  ));
  
  const projection = lineStart.clone().add(line.multiplyScalar(t));
  return point.distanceTo(projection);
}
