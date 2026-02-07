/**
 * Mathematical utility functions for common operations.
 * 
 * This module provides reusable math functions to eliminate code duplication
 * and ensure consistent mathematical operations across the application.
 */

/**
 * Converts degrees to radians.
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 * 
 * @example
 * ```typescript
 * const radians = degreesToRadians(180); // π
 * const radians = degreesToRadians(90);  // π/2
 * ```
 */
export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 * 
 * @param radians - Angle in radians
 * @returns Angle in degrees
 * 
 * @example
 * ```typescript
 * const degrees = radiansToDegrees(Math.PI);     // 180
 * const degrees = radiansToDegrees(Math.PI / 2); // 90
 * ```
 */
export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Clamps a value between a minimum and maximum.
 * 
 * Ensures the value stays within the specified range.
 * If value < min, returns min. If value > max, returns max.
 * Otherwise returns the value unchanged.
 * 
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped value
 * 
 * @example
 * ```typescript
 * clamp(5, 0, 10);   // 5
 * clamp(-5, 0, 10);  // 0
 * clamp(15, 0, 10);  // 10
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Performs linear interpolation between two values.
 * 
 * Calculates a value between start and end based on the interpolation factor t.
 * When t = 0, returns start. When t = 1, returns end.
 * Values of t outside [0, 1] will extrapolate beyond the range.
 * 
 * @param start - Starting value
 * @param end - Ending value
 * @param t - Interpolation factor (typically 0-1)
 * @returns Interpolated value
 * 
 * @example
 * ```typescript
 * lerp(0, 10, 0.5);  // 5
 * lerp(0, 10, 0);    // 0
 * lerp(0, 10, 1);    // 10
 * lerp(0, 10, 0.25); // 2.5
 * ```
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Normalizes a value from one range to another.
 * 
 * Maps a value from the input range [inMin, inMax] to the output range [outMin, outMax].
 * Useful for scaling values between different coordinate systems or ranges.
 * 
 * @param value - The value to normalize
 * @param inMin - Minimum of input range
 * @param inMax - Maximum of input range
 * @param outMin - Minimum of output range
 * @param outMax - Maximum of output range
 * @returns The normalized value in the output range
 * 
 * @example
 * ```typescript
 * // Map 50 from range [0, 100] to range [0, 1]
 * normalize(50, 0, 100, 0, 1); // 0.5
 * 
 * // Map 5 from range [0, 10] to range [100, 200]
 * normalize(5, 0, 10, 100, 200); // 150
 * ```
 */
export function normalize(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Calculates the modulo operation with proper handling of negative numbers.
 * 
 * Unlike JavaScript's % operator, this always returns a positive result
 * in the range [0, divisor), which is useful for wrapping angles and indices.
 * 
 * @param value - The dividend
 * @param divisor - The divisor
 * @returns The modulo result (always positive)
 * 
 * @example
 * ```typescript
 * mod(5, 3);    // 2
 * mod(-1, 3);   // 2 (not -1 like % operator)
 * mod(7, 3);    // 1
 * mod(-7, 3);   // 2
 * ```
 */
export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/**
 * Checks if two numbers are approximately equal within a tolerance.
 * 
 * Useful for comparing floating-point numbers where exact equality
 * is unreliable due to precision errors.
 * 
 * @param a - First number
 * @param b - Second number
 * @param epsilon - Maximum allowed difference (default: 1e-10)
 * @returns True if numbers are approximately equal
 * 
 * @example
 * ```typescript
 * approxEqual(0.1 + 0.2, 0.3);           // true
 * approxEqual(1.0000001, 1.0000002);     // true
 * approxEqual(1.0, 1.1);                 // false
 * approxEqual(1.0, 1.01, 0.1);           // true (with larger epsilon)
 * ```
 */
export function approxEqual(a: number, b: number, epsilon: number = 1e-10): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Calculates the square of a number.
 * 
 * More readable than x * x and can be optimized by the compiler.
 * 
 * @param x - The number to square
 * @returns The square of x
 * 
 * @example
 * ```typescript
 * square(5);   // 25
 * square(-3);  // 9
 * square(0);   // 0
 * ```
 */
export function square(x: number): number {
  return x * x;
}

/**
 * Calculates the distance between two 2D points.
 * 
 * Uses the Pythagorean theorem: sqrt((x2-x1)² + (y2-y1)²)
 * 
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns The Euclidean distance between the points
 * 
 * @example
 * ```typescript
 * distance2D(0, 0, 3, 4);  // 5
 * distance2D(1, 1, 4, 5);  // 5
 * ```
 */
export function distance2D(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(square(x2 - x1) + square(y2 - y1));
}

/**
 * Calculates the distance between two 3D points.
 * 
 * Uses the 3D Pythagorean theorem: sqrt((x2-x1)² + (y2-y1)² + (z2-z1)²)
 * 
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param z1 - Z coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @param z2 - Z coordinate of second point
 * @returns The Euclidean distance between the points
 * 
 * @example
 * ```typescript
 * distance3D(0, 0, 0, 1, 1, 1);  // ~1.732
 * distance3D(0, 0, 0, 3, 4, 0);  // 5
 * ```
 */
export function distance3D(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number {
  return Math.sqrt(square(x2 - x1) + square(y2 - y1) + square(z2 - z1));
}

/**
 * Wraps an angle to the range [0, 2π).
 * 
 * Ensures an angle in radians is within the standard range.
 * Useful for normalizing angles in orbital calculations.
 * 
 * @param angle - Angle in radians
 * @returns Wrapped angle in range [0, 2π)
 * 
 * @example
 * ```typescript
 * wrapAngle(Math.PI);      // π
 * wrapAngle(3 * Math.PI);  // π
 * wrapAngle(-Math.PI);     // π
 * ```
 */
export function wrapAngle(angle: number): number {
  return mod(angle, 2 * Math.PI);
}

/**
 * Wraps an angle to the range [-π, π).
 * 
 * Ensures an angle in radians is within the signed range.
 * Useful for calculating angular differences.
 * 
 * @param angle - Angle in radians
 * @returns Wrapped angle in range [-π, π)
 * 
 * @example
 * ```typescript
 * wrapAngleSigned(Math.PI);      // π
 * wrapAngleSigned(3 * Math.PI);  // -π
 * wrapAngleSigned(-Math.PI);     // -π
 * ```
 */
export function wrapAngleSigned(angle: number): number {
  const wrapped = wrapAngle(angle);
  return wrapped > Math.PI ? wrapped - 2 * Math.PI : wrapped;
}

/**
 * Smoothly interpolates between two values using smoothstep function.
 * 
 * Provides smooth acceleration and deceleration, unlike linear interpolation.
 * The result is clamped to [0, 1] range.
 * 
 * @param edge0 - Lower edge of the interpolation range
 * @param edge1 - Upper edge of the interpolation range
 * @param x - Value to interpolate
 * @returns Smoothly interpolated value in range [0, 1]
 * 
 * @example
 * ```typescript
 * smoothstep(0, 1, 0.5);  // 0.5 (but with smooth curve)
 * smoothstep(0, 1, 0);    // 0
 * smoothstep(0, 1, 1);    // 1
 * ```
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
