/**
 * Polynomial evaluator for Chebyshev and Hermite polynomials
 * 
 * This module provides efficient evaluation of polynomial segments
 * used in the all-bodies ephemeris system.
 */

import { Vector3, ChebyshevSegment, HermiteSegment, PolynomialSegment } from './types';

/**
 * Polynomial evaluator for ephemeris segments
 */
export class PolynomialEvaluator {
  /**
   * Evaluate Chebyshev polynomial using Clenshaw algorithm
   * 
   * @param t_norm Normalized time in [-1, 1]
   * @param coefficients Polynomial coefficients
   * @returns Evaluated value
   */
  evaluateChebyshev(t_norm: number, coefficients: number[]): number {
    if (!isFinite(t_norm)) {
      throw new Error(`Non-finite normalized time: ${t_norm}`);
    }

    const n = coefficients.length;
    if (n === 0) return 0;
    if (n === 1) return coefficients[0];

    // Clenshaw algorithm for Chebyshev polynomials
    let b_k1 = 0;  // b_{k+1}
    let b_k = 0;   // b_k

    // Recurse from highest order down
    for (let k = n - 1; k >= 1; k--) {
      const b_k_minus_1 = 2 * t_norm * b_k - b_k1 + coefficients[k];
      b_k1 = b_k;
      b_k = b_k_minus_1;
    }

    const result = t_norm * b_k - b_k1 + coefficients[0];

    if (!isFinite(result)) {
      console.error('Chebyshev evaluation produced non-finite result', {
        t_norm,
        coeffs: coefficients,
        result
      });
      throw new Error('Chebyshev evaluation failed: non-finite result');
    }

    return result;
  }

  /**
   * Normalize time to [-1, 1] interval for Chebyshev evaluation
   * 
   * @param jd Julian Date
   * @param startJD Segment start time
   * @param endJD Segment end time
   * @returns Normalized time in [-1, 1]
   */
  normalizeTime(jd: number, startJD: number, endJD: number): number {
    return 2 * (jd - startJD) / (endJD - startJD) - 1;
  }

  /**
   * Denormalize time from [-1, 1] back to Julian Date
   * 
   * @param t_norm Normalized time in [-1, 1]
   * @param startJD Segment start time
   * @param endJD Segment end time
   * @returns Julian Date
   */
  denormalizeTime(t_norm: number, startJD: number, endJD: number): number {
    return startJD + (t_norm + 1) * (endJD - startJD) / 2;
  }

  /**
   * Evaluate Hermite polynomial segment
   * 
   * Uses cubic Hermite interpolation with C1 continuity
   * 
   * @param t Normalized time in [0, 1]
   * @param segment Hermite segment data
   * @returns Interpolated position
   */
  evaluateHermite(t: number, segment: HermiteSegment): Vector3 {
    if (t < 0 || t > 1) {
      throw new Error(`Time parameter out of range [0, 1]: ${t}`);
    }

    // Hermite basis functions
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const dt = segment.endJD - segment.startJD;

    // Interpolate position
    const x = h00 * segment.startPosition.x + h10 * dt * segment.startVelocity.x +
              h01 * segment.endPosition.x + h11 * dt * segment.endVelocity.x;
    
    const y = h00 * segment.startPosition.y + h10 * dt * segment.startVelocity.y +
              h01 * segment.endPosition.y + h11 * dt * segment.endVelocity.y;
    
    const z = h00 * segment.startPosition.z + h10 * dt * segment.startVelocity.z +
              h01 * segment.endPosition.z + h11 * dt * segment.endVelocity.z;

    const result = new Vector3(x, y, z);

    if (!result.isFinite()) {
      throw new Error('Hermite evaluation produced non-finite result');
    }

    return result;
  }

  /**
   * Evaluate Chebyshev segment at given time
   * 
   * @param jd Julian Date
   * @param segment Chebyshev segment
   * @returns Position vector
   */
  evaluateChebyshevSegment(jd: number, segment: ChebyshevSegment): Vector3 {
    const t_norm = this.normalizeTime(jd, segment.startJD, segment.endJD);

    const x = this.evaluateChebyshev(t_norm, segment.coefficientsX);
    const y = this.evaluateChebyshev(t_norm, segment.coefficientsY);
    const z = this.evaluateChebyshev(t_norm, segment.coefficientsZ);

    return new Vector3(x, y, z);
  }

  /**
   * Evaluate Hermite segment at given time
   * 
   * @param jd Julian Date
   * @param segment Hermite segment
   * @returns Position vector
   */
  evaluateHermiteSegment(jd: number, segment: HermiteSegment): Vector3 {
    const t = (jd - segment.startJD) / (segment.endJD - segment.startJD);
    return this.evaluateHermite(t, segment);
  }

  /**
   * Find segment containing given time using binary search
   * 
   * @param jd Julian Date
   * @param segments Sorted array of segments
   * @returns Segment index, or -1 if not found
   */
  findSegment(jd: number, segments: PolynomialSegment[]): number {
    if (segments.length === 0) return -1;

    // Binary search
    let left = 0;
    let right = segments.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = segments[mid];

      if (jd < segment.startJD) {
        right = mid - 1;
      } else if (jd > segment.endJD) {
        left = mid + 1;
      } else {
        // Found: jd is within [startJD, endJD]
        return mid;
      }
    }

    return -1;
  }

  /**
   * Evaluate polynomial segment at given time
   * 
   * @param jd Julian Date
   * @param segment Polynomial segment (Chebyshev or Hermite)
   * @returns Position vector
   */
  evaluateSegment(jd: number, segment: PolynomialSegment): Vector3 {
    if (segment.type === 'chebyshev') {
      return this.evaluateChebyshevSegment(jd, segment);
    } else {
      return this.evaluateHermiteSegment(jd, segment);
    }
  }
}
