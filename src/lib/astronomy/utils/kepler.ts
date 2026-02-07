/**
 * Kepler Equation Solver
 * 
 * This module provides utilities for solving Kepler's equation, which is
 * fundamental to calculating planetary positions from orbital elements.
 * 
 * Kepler's Equation: M = E - e * sin(E)
 * Where:
 * - M is the mean anomaly
 * - E is the eccentric anomaly (what we solve for)
 * - e is the orbital eccentricity
 * 
 * Reference: Jean Meeus - Astronomical Algorithms (2nd Ed.)
 */

import { ConvergenceError } from '@/lib/errors/base';

/**
 * Solves Kepler's equation using Newton-Raphson iteration.
 * 
 * This function finds the eccentric anomaly (E) given the mean anomaly (M)
 * and eccentricity (e). The solution uses iterative refinement until the
 * result converges within the specified tolerance.
 * 
 * Algorithm:
 * 1. Start with initial guess E = M
 * 2. Compute delta = (E - e*sin(E) - M) / (1 - e*cos(E))
 * 3. Update E = E - delta
 * 4. Repeat until |delta| < tolerance or max iterations reached
 * 
 * @param M - Mean anomaly in radians
 * @param e - Orbital eccentricity (0 <= e < 1)
 * @param tolerance - Convergence tolerance (default: 1e-8)
 * @param maxIterations - Maximum number of iterations (default: 50)
 * @returns Eccentric anomaly in radians
 * @throws {ConvergenceError} If the solution fails to converge within maxIterations
 * 
 * @example
 * ```typescript
 * // Solve for a circular orbit (e = 0)
 * const E = solveKeplerEquation(Math.PI / 4, 0);
 * console.log(E); // π/4 (for circular orbits, E = M)
 * 
 * // Solve for an elliptical orbit
 * const E2 = solveKeplerEquation(Math.PI / 2, 0.1);
 * ```
 */
export function solveKeplerEquation(
  M: number,
  e: number,
  tolerance: number = 1e-8,
  maxIterations: number = 50
): number {
  // Validate inputs
  if (e < 0 || e >= 1) {
    throw new ConvergenceError(
      `Invalid eccentricity: ${e}. Must be in range [0, 1)`,
      { M, e, tolerance, maxIterations }
    );
  }

  // Initial guess: E = M
  let E = M;
  let delta = 1;
  let iterations = 0;

  // Newton-Raphson iteration
  while (Math.abs(delta) > tolerance && iterations < maxIterations) {
    // Compute the function value and its derivative
    // f(E) = E - e*sin(E) - M
    // f'(E) = 1 - e*cos(E)
    delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= delta;
    iterations++;
  }

  // Check convergence
  if (Math.abs(delta) > tolerance) {
    throw new ConvergenceError(
      `Kepler equation failed to converge after ${iterations} iterations`,
      {
        M,
        e,
        tolerance,
        maxIterations,
        finalDelta: delta,
        finalE: E
      }
    );
  }

  return E;
}

/**
 * Computes the true anomaly from the eccentric anomaly.
 * 
 * The true anomaly (ν) is the angle between the direction of periapsis
 * and the current position of the body, as seen from the main focus.
 * 
 * Formula: ν = 2 * atan2(√(1+e) * sin(E/2), √(1-e) * cos(E/2))
 * 
 * @param E - Eccentric anomaly in radians
 * @param e - Orbital eccentricity (0 <= e < 1)
 * @returns True anomaly in radians
 * 
 * @example
 * ```typescript
 * const E = Math.PI / 2;
 * const e = 0.1;
 * const nu = eccentricToTrueAnomaly(E, e);
 * ```
 */
export function eccentricToTrueAnomaly(E: number, e: number): number {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}

/**
 * Computes the heliocentric distance from the eccentric anomaly.
 * 
 * Formula: r = a * (1 - e * cos(E))
 * Where:
 * - r is the heliocentric distance
 * - a is the semi-major axis
 * - e is the eccentricity
 * - E is the eccentric anomaly
 * 
 * @param a - Semi-major axis in AU
 * @param e - Orbital eccentricity
 * @param E - Eccentric anomaly in radians
 * @returns Heliocentric distance in AU
 * 
 * @example
 * ```typescript
 * const r = heliocentricDistance(1.0, 0.0167, Math.PI);
 * console.log(r); // ~1.0167 AU (Earth at aphelion)
 * ```
 */
export function heliocentricDistance(a: number, e: number, E: number): number {
  return a * (1 - e * Math.cos(E));
}
