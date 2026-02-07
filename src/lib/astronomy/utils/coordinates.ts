/**
 * Astronomy Coordinate Transformations
 * 
 * This module provides coordinate transformation utilities for astronomical
 * calculations, including conversions between orbital plane coordinates and
 * ecliptic coordinates.
 * 
 * Coordinate Systems:
 * - Orbital Plane: Coordinates in the plane of the orbit
 * - Ecliptic: Heliocentric ecliptic coordinates (J2000.0)
 * - Equatorial: Right ascension and declination (not implemented here)
 * 
 * Reference: Jean Meeus - Astronomical Algorithms (2nd Ed.)
 */

/**
 * Represents a 3D position in space.
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Orbital elements needed for coordinate transformations.
 */
export interface OrbitalOrientation {
  /** Argument of periapsis (ω) in radians */
  w: number;
  /** Longitude of ascending node (Ω) in radians */
  Omega: number;
  /** Orbital inclination (i) in radians */
  i: number;
}

/**
 * Transforms orbital plane coordinates to ecliptic coordinates.
 * 
 * This function converts coordinates from the orbital plane reference frame
 * to the heliocentric ecliptic coordinate system (J2000.0).
 * 
 * The transformation involves three rotations:
 * 1. Rotation by argument of periapsis (ω) in the orbital plane
 * 2. Rotation by inclination (i) about the line of nodes
 * 3. Rotation by longitude of ascending node (Ω) about the ecliptic pole
 * 
 * @param x_orb - X coordinate in orbital plane (AU)
 * @param y_orb - Y coordinate in orbital plane (AU)
 * @param orientation - Orbital orientation angles
 * @returns Position in ecliptic coordinates
 * 
 * @example
 * ```typescript
 * const pos = orbitalToEcliptic(1.0, 0.0, {
 *   w: 0,
 *   Omega: 0,
 *   i: 0
 * });
 * console.log(pos); // { x: 1, y: 0, z: 0 }
 * ```
 */
export function orbitalToEcliptic(
  x_orb: number,
  y_orb: number,
  orientation: OrbitalOrientation
): Position3D {
  const { w, Omega, i } = orientation;

  // Precompute trigonometric values
  const cos_w = Math.cos(w);
  const sin_w = Math.sin(w);
  const cos_O = Math.cos(Omega);
  const sin_O = Math.sin(Omega);
  const cos_i = Math.cos(i);
  const sin_i = Math.sin(i);

  // Transform from orbital plane to ecliptic coordinates
  // Using rotation matrices: R_z(Ω) * R_x(i) * R_z(ω)
  const x = (cos_w * cos_O - sin_w * sin_O * cos_i) * x_orb +
            (-sin_w * cos_O - cos_w * sin_O * cos_i) * y_orb;

  const y = (cos_w * sin_O + sin_w * cos_O * cos_i) * x_orb +
            (-sin_w * sin_O + cos_w * cos_O * cos_i) * y_orb;

  const z = (sin_w * sin_i) * x_orb +
            (cos_w * sin_i) * y_orb;

  return { x, y, z };
}

/**
 * Computes the argument of periapsis from perihelion longitude.
 * 
 * The argument of periapsis (ω) is the angle from the ascending node
 * to the periapsis, measured in the orbital plane.
 * 
 * Formula: ω = ϖ - Ω
 * Where:
 * - ϖ (w_bar) is the longitude of perihelion
 * - Ω (Omega) is the longitude of ascending node
 * 
 * @param w_bar - Longitude of perihelion in radians
 * @param Omega - Longitude of ascending node in radians
 * @returns Argument of periapsis in radians
 * 
 * @example
 * ```typescript
 * const w = argumentOfPeriapsis(1.5, 0.5);
 * console.log(w); // 1.0
 * ```
 */
export function argumentOfPeriapsis(w_bar: number, Omega: number): number {
  return w_bar - Omega;
}

/**
 * Computes the mean anomaly from mean longitude.
 * 
 * The mean anomaly (M) is the fraction of an orbit period that has
 * elapsed since the last periapsis passage, expressed as an angle.
 * 
 * Formula: M = L - ϖ
 * Where:
 * - L is the mean longitude
 * - ϖ (w_bar) is the longitude of perihelion
 * 
 * The result is normalized to the range [0, 2π).
 * 
 * @param L - Mean longitude in radians
 * @param w_bar - Longitude of perihelion in radians
 * @returns Mean anomaly in radians, normalized to [0, 2π)
 * 
 * @example
 * ```typescript
 * const M = meanAnomaly(Math.PI, Math.PI / 2);
 * console.log(M); // π/2
 * ```
 */
export function meanAnomaly(L: number, w_bar: number): number {
  const M = (L - w_bar) % (2 * Math.PI);
  // Ensure positive result
  return M < 0 ? M + 2 * Math.PI : M;
}

/**
 * Normalizes an angle to the range [0, 2π).
 * 
 * @param angle - Angle in radians
 * @returns Normalized angle in radians
 * 
 * @example
 * ```typescript
 * const normalized = normalizeAngle(3 * Math.PI);
 * console.log(normalized); // π
 * ```
 */
export function normalizeAngle(angle: number): number {
  const normalized = angle % (2 * Math.PI);
  return normalized < 0 ? normalized + 2 * Math.PI : normalized;
}

/**
 * Computes the distance between two 3D positions.
 * 
 * @param pos1 - First position
 * @param pos2 - Second position
 * @returns Distance in the same units as the input positions
 * 
 * @example
 * ```typescript
 * const d = distance3D(
 *   { x: 0, y: 0, z: 0 },
 *   { x: 1, y: 0, z: 0 }
 * );
 * console.log(d); // 1.0
 * ```
 */
export function distance3D(pos1: Position3D, pos2: Position3D): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
