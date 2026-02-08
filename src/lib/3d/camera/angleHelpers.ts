/**
 * angleHelpers.ts - Camera angle calculation and normalization utilities
 * 
 * Provides helper functions for camera angle operations including:
 * - Angle normalization
 * - Shortest path calculation
 * - Degree/radian conversions
 */

/**
 * Normalizes angle to -180 to 180 degree range
 * 
 * @param angle - Angle in degrees
 * @returns Normalized angle in degrees
 * 
 * @example
 * ```typescript
 * normalizeAngleDegrees(270);  // Returns -90
 * normalizeAngleDegrees(-200); // Returns 160
 * ```
 */
export function normalizeAngleDegrees(angle: number): number {
  let normalized = angle;
  while (normalized < -180) normalized += 360;
  while (normalized >= 180) normalized -= 360;
  return normalized;
}

/**
 * Normalizes angle to -π to π range
 * 
 * @param angle - Angle in radians
 * @returns Normalized angle in radians
 * 
 * @example
 * ```typescript
 * normalizeAngleRadians(Math.PI * 1.5);  // Returns -Math.PI / 2
 * normalizeAngleRadians(-Math.PI * 1.2); // Returns Math.PI * 0.8
 * ```
 */
export function normalizeAngleRadians(angle: number): number {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= 2 * Math.PI;
  while (normalized < -Math.PI) normalized += 2 * Math.PI;
  return normalized;
}

/**
 * Normalizes polar angle to 0-180 degree range
 * 
 * Polar angles represent vertical rotation where:
 * - 0° = top-down view
 * - 90° = horizontal view
 * - 180° = bottom-up view
 * 
 * @param angle - Angle in degrees
 * @returns Normalized angle in degrees (0-180)
 * 
 * @example
 * ```typescript
 * normalizePolarAngleDegrees(-45);  // Returns 135 (view from below)
 * normalizePolarAngleDegrees(270);  // Returns 90
 * ```
 */
export function normalizePolarAngleDegrees(angle: number): number {
  let normalized = angle;
  
  // Convert negative angles: -45° becomes 135° (view from below)
  if (normalized < 0) {
    normalized = 180 + normalized;
  }
  
  // Handle angles >= 360
  if (normalized >= 360) {
    normalized = normalized % 360;
  }
  
  // Handle angles > 180
  if (normalized > 180) {
    normalized = 360 - normalized;
  }
  
  return normalized;
}

/**
 * Calculates shortest path between two angles
 * 
 * When rotating from one angle to another, there are two possible paths.
 * This function calculates the difference that results in the shortest rotation.
 * 
 * @param from - Starting angle in radians
 * @param to - Target angle in radians
 * @returns Angle difference choosing shortest path
 * 
 * @example
 * ```typescript
 * // Rotating from 170° to -170° (or 190°)
 * calculateShortestAnglePath(
 *   170 * Math.PI / 180,
 *   -170 * Math.PI / 180
 * ); // Returns small negative value (rotate left)
 * ```
 */
export function calculateShortestAnglePath(from: number, to: number): number {
  let diff = to - from;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

// Re-export from shared utils to avoid duplication
export { degreesToRadians, radiansToDegrees } from '@/lib/utils/math';
