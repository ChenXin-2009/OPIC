/**
 * penetrationHelpers.ts - Camera penetration prevention utilities
 * 
 * Provides helper functions for preventing camera from entering celestial bodies:
 * - Penetration depth calculation
 * - Penetration severity assessment
 * - Safe position calculation
 */

import * as THREE from 'three';
import { CAMERA_PENETRATION_CONFIG } from '@/lib/config/cameraConfig';

/**
 * Calculates penetration depth
 * 
 * @param distToCenter - Current distance from camera to center
 * @param minAllowedDistance - Minimum allowed distance
 * @returns Penetration depth (0 if not penetrating)
 * 
 * @example
 * ```typescript
 * calculatePenetrationDepth(0.8, 1.0); // Returns 0.2 (penetrating)
 * calculatePenetrationDepth(1.5, 1.0); // Returns 0 (safe)
 * ```
 */
export function calculatePenetrationDepth(
  distToCenter: number,
  minAllowedDistance: number
): number {
  return Math.max(0, minAllowedDistance - distToCenter);
}

/**
 * Checks if penetration is deep (requires immediate correction)
 * 
 * @param penetrationDepth - Depth of penetration
 * @param minAllowedDistance - Minimum allowed distance
 * @returns True if penetration is deep (>70% of minimum distance)
 * 
 * @example
 * ```typescript
 * isDeepPenetration(0.8, 1.0); // Returns true (80% penetration)
 * isDeepPenetration(0.5, 1.0); // Returns false (50% penetration)
 * ```
 */
export function isDeepPenetration(
  penetrationDepth: number,
  minAllowedDistance: number
): boolean {
  const penetrationRatio = penetrationDepth / minAllowedDistance;
  return penetrationRatio > 0.7;
}

/**
 * Calculates penetration ratio
 * 
 * @param penetrationDepth - Depth of penetration
 * @param minAllowedDistance - Minimum allowed distance
 * @returns Ratio of penetration (0-1+)
 * 
 * @example
 * ```typescript
 * calculatePenetrationRatio(0.5, 1.0); // Returns 0.5 (50% penetration)
 * calculatePenetrationRatio(0.8, 1.0); // Returns 0.8 (80% penetration)
 * ```
 */
export function calculatePenetrationRatio(
  penetrationDepth: number,
  minAllowedDistance: number
): number {
  return penetrationDepth / minAllowedDistance;
}

/**
 * Calculates safe camera position maintaining direction
 * 
 * @param center - Center position of celestial body
 * @param direction - Direction from center to camera (will be normalized)
 * @param safeDistance - Safe distance to maintain
 * @returns Safe camera position
 * 
 * @example
 * ```typescript
 * const center = new THREE.Vector3(0, 0, 0);
 * const direction = new THREE.Vector3(1, 0, 0);
 * const safePos = calculateSafeCameraPosition(center, direction, 5);
 * // Returns Vector3(5, 0, 0)
 * ```
 */
export function calculateSafeCameraPosition(
  center: THREE.Vector3,
  direction: THREE.Vector3,
  safeDistance: number
): THREE.Vector3 {
  const dirNorm = direction.length() > 1e-6 
    ? direction.clone().normalize() 
    : new THREE.Vector3(0, 1, 0);
  
  return center.clone().add(dirNorm.multiplyScalar(safeDistance));
}

/**
 * Calculates adaptive smoothness factor for penetration correction
 * 
 * Higher penetration ratios result in faster correction.
 * 
 * @param penetrationRatio - Ratio of penetration (0-1+)
 * @param deltaTime - Time delta in seconds
 * @returns Smoothness factor for lerp (0-1)
 * 
 * @example
 * ```typescript
 * // Light penetration, slow correction
 * calculateAdaptiveSmoothness(0.3, 0.016); // Returns ~0.02
 * 
 * // Deep penetration, fast correction
 * calculateAdaptiveSmoothness(0.8, 0.016); // Returns ~0.04
 * ```
 */
export function calculateAdaptiveSmoothness(
  penetrationRatio: number,
  deltaTime: number
): number {
  const baseSmoothness = CAMERA_PENETRATION_CONFIG.constraintSmoothness;
  const adaptiveSmoothness = baseSmoothness * (1 + penetrationRatio);
  return Math.min(1, adaptiveSmoothness * Math.max(0.0001, deltaTime * 60));
}

/**
 * Easing function for smooth constraint application
 * 
 * Uses ease-out-quart for natural deceleration.
 * 
 * @param t - Progress value (0-1)
 * @returns Eased value (0-1)
 * 
 * @example
 * ```typescript
 * easeOutQuart(0);    // Returns 0
 * easeOutQuart(0.5);  // Returns ~0.9375
 * easeOutQuart(1);    // Returns 1
 * ```
 */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Calculates minimum safe distance from target radius
 * 
 * @param targetRadius - Radius of celestial body
 * @returns Minimum safe distance
 * 
 * @example
 * ```typescript
 * calculateMinSafeDistance(0.0001); // Returns 0.00015 (with 1.5x multiplier)
 * ```
 */
export function calculateMinSafeDistance(targetRadius: number): number {
  return targetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;
}
