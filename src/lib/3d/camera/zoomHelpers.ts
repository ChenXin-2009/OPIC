/**
 * zoomHelpers.ts - Camera zoom calculation utilities
 * 
 * Provides helper functions for zoom operations including:
 * - Zoom factor calculation
 * - Distance validation
 * - Penetration prevention
 */

import { CAMERA_PENETRATION_CONFIG } from '@/lib/config/cameraConfig';

/**
 * Validates distance value
 * 
 * @param distance - Distance to validate
 * @returns True if distance is valid (finite and positive)
 * 
 * @example
 * ```typescript
 * isValidDistance(5.0);    // Returns true
 * isValidDistance(NaN);    // Returns false
 * isValidDistance(-1);     // Returns false
 * isValidDistance(Infinity); // Returns false
 * ```
 */
export function isValidDistance(distance: number): boolean {
  return isFinite(distance) && distance > 0;
}

/**
 * Calculates zoom factor from delta
 * 
 * @param delta - Zoom delta (positive = zoom in, negative = zoom out)
 * @param baseFactor - Base zoom factor from configuration
 * @returns Zoom factor to apply to current distance
 * 
 * @example
 * ```typescript
 * // Zoom in with delta 1.0 and baseFactor 0.1
 * calculateZoomFactor(1.0, 0.1);  // Returns 0.9 (10% closer)
 * 
 * // Zoom out with delta -1.0 and baseFactor 0.1
 * calculateZoomFactor(-1.0, 0.1); // Returns 1.1 (10% farther)
 * ```
 */
export function calculateZoomFactor(delta: number, baseFactor: number): number {
  const scrollSpeed = Math.min(Math.abs(delta), 2);
  
  // delta > 0 means zoom in (decrease distance), delta < 0 means zoom out (increase distance)
  return delta > 0 
    ? 1 - (baseFactor * scrollSpeed)  // Decrease distance (zoom in)
    : 1 + (baseFactor * scrollSpeed);  // Increase distance (zoom out)
}

/**
 * Applies penetration prevention to target distance
 * 
 * Ensures camera doesn't get too close to celestial bodies by enforcing
 * a minimum safe distance based on the body's radius.
 * 
 * @param targetDistance - Proposed target distance
 * @param currentDistance - Current distance from target
 * @param targetRadius - Radius of target body (null if no constraint)
 * @returns Safe target distance
 * 
 * @example
 * ```typescript
 * // Planet with radius 0.0001 AU, safety multiplier 1.5
 * applySafePenetrationDistance(
 *   0.00005,  // Trying to get very close
 *   0.0002,   // Current distance
 *   0.0001    // Planet radius
 * ); // Returns 0.00015 (1.5 * radius)
 * ```
 */
export function applySafePenetrationDistance(
  targetDistance: number,
  currentDistance: number,
  targetRadius: number | null
): number {
  if (!targetRadius) return targetDistance;
  
  const minSafeDistance = targetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;
  
  // Ensure distance doesn't go below minimum safe distance
  let safeDistance = Math.max(targetDistance, minSafeDistance);
  
  // If current distance is already below safe distance, force to safe distance
  if (currentDistance < minSafeDistance) {
    safeDistance = minSafeDistance;
  }
  
  return safeDistance;
}

/**
 * Clamps distance to valid range
 * 
 * @param distance - Distance to clamp
 * @param minDistance - Minimum allowed distance
 * @param maxDistance - Maximum allowed distance
 * @returns Clamped distance
 * 
 * @example
 * ```typescript
 * clampDistance(5, 1, 10);   // Returns 5
 * clampDistance(0.5, 1, 10); // Returns 1
 * clampDistance(15, 1, 10);  // Returns 10
 * ```
 */
export function clampDistance(
  distance: number,
  minDistance: number,
  maxDistance: number
): number {
  return Math.max(minDistance, Math.min(maxDistance, distance));
}

/**
 * Calculates adaptive threshold for zoom completion
 * 
 * Uses larger thresholds for larger distances to improve performance
 * while maintaining precision for close-up views.
 * 
 * @param currentDistance - Current camera distance
 * @returns Adaptive threshold value
 * 
 * @example
 * ```typescript
 * calculateAdaptiveThreshold(1000); // Returns 1.0 (0.1% of distance)
 * calculateAdaptiveThreshold(10);   // Returns 0.01 (0.1% of distance)
 * calculateAdaptiveThreshold(0.1);  // Returns 0.001 (minimum threshold)
 * ```
 */
export function calculateAdaptiveThreshold(currentDistance: number): number {
  return Math.max(0.001, Math.min(0.1, currentDistance * 0.001));
}
