/**
 * Coordinate Transformations for Multi-Body Ephemeris System
 * 
 * This module provides coordinate transformations between different reference frames:
 * - ICRF (International Celestial Reference Frame / J2000 equatorial)
 * - Ecliptic (J2000 ecliptic coordinates)
 * - Planet-centric to Heliocentric transformations (for all major planets)
 * 
 * Reference frames:
 * - ICRF: Earth's equatorial plane at J2000.0 epoch
 * - Ecliptic: Earth's orbital plane at J2000.0 epoch
 * - Planet-centric: Coordinates relative to a planet's center
 * - Heliocentric: Coordinates relative to the Sun's center
 * 
 * Supported planetary systems:
 * - Earth (NAIF ID: 399)
 * - Mars (NAIF ID: 499)
 * - Jupiter (NAIF ID: 599)
 * - Saturn (NAIF ID: 699)
 * - Uranus (NAIF ID: 799)
 * - Neptune (NAIF ID: 899)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { Vector3 } from './types';

// 帧变换的权威实现已迁移到统一坐标层。
// 本文件 re-export 新实现，并让 CoordinateTransformer 委托给它，
// 以保持现有引用不破坏。新代码应直接 import from '@/lib/coordinates'。
// 详见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md。
export {
  icrfToEcliptic,
  eclipticToIcrf,
  icrfToRenderWorld,
  renderWorldToIcrf,
  OBLIQUITY_J2000_DEG,
  OBLIQUITY_J2000_RAD,
} from '@/lib/coordinates/frames/ecliptic';
import { icrfToEcliptic as icrfToEclipticFn, eclipticToIcrf as eclipticToIcrfFn } from '@/lib/coordinates/frames/ecliptic';

/**
 * CoordinateTransformer provides transformations between astronomical reference frames.
 * 
 * The class handles conversions between:
 * - ICRF (J2000 equatorial) and ecliptic coordinates
 * - Planet-centric (planet-centered) and heliocentric (Sun-centered) coordinates
 * 
 * Supports all major planetary systems: Earth, Mars, Jupiter, Saturn, Uranus, Neptune
 */
export class CoordinateTransformer {
  /**
   * Obliquity of the ecliptic at J2000.0 epoch (in radians)
   * This is the angle between Earth's equatorial plane and orbital plane.
   * Value: 23.43928° = 0.40909280422232897 radians
   *
   * @deprecated 权威常量已迁移至 `@/lib/coordinates/frames/ecliptic` 的 `OBLIQUITY_J2000_RAD`。
   *             本字段保留仅为向后兼容，值与新模块一致。
   */
  private static readonly OBLIQUITY_J2000 = 23.43928 * Math.PI / 180;

  /**
   * NAIF IDs for supported planets
   */
  private static readonly PLANET_IDS = {
    EARTH: 399,
    MARS: 499,
    JUPITER: 599,
    SATURN: 699,
    URANUS: 799,
    NEPTUNE: 899
  } as const;

  /**
   * Transforms a position vector from ICRF (J2000 equatorial) to ecliptic coordinates.
   * 
   * The transformation is a rotation around the X-axis by the obliquity angle.
   * This converts from the equatorial reference frame to the ecliptic reference frame.
   * 
   * Rotation matrix:
   * [ 1      0           0        ]
   * [ 0   cos(ε)     sin(ε)      ]
   * [ 0  -sin(ε)     cos(ε)      ]
   * 
   * Where ε is the obliquity of the ecliptic.
   * 
   * @param pos - Position vector in ICRF coordinates (AU)
   * @returns Position vector in ecliptic coordinates (AU)
   * 
   * @example
   * ```typescript
   * const transformer = new CoordinateTransformer();
   * const icrfPos = new Vector3(1, 0, 0);
   * const eclipticPos = transformer.icrfToEcliptic(icrfPos);
   * ```
   */
  icrfToEcliptic(pos: Vector3): Vector3 {
    // 委托给统一坐标层实现，确保全项目只有一个权威变换来源。
    return icrfToEclipticFn(pos);
  }

  /**
   * Transforms a position vector from ecliptic to ICRF (J2000 equatorial) coordinates.
   * 
   * This is the inverse transformation of icrfToEcliptic.
   * It's a rotation around the X-axis by -obliquity angle.
   * 
   * Rotation matrix:
   * [ 1      0           0        ]
   * [ 0   cos(ε)    -sin(ε)      ]
   * [ 0   sin(ε)     cos(ε)      ]
   * 
   * Where ε is the obliquity of the ecliptic.
   * 
   * @param pos - Position vector in ecliptic coordinates (AU)
   * @returns Position vector in ICRF coordinates (AU)
   * 
   * @example
   * ```typescript
   * const transformer = new CoordinateTransformer();
   * const eclipticPos = new Vector3(1, 0, 0);
   * const icrfPos = transformer.eclipticToICRF(eclipticPos);
   * ```
   */
  eclipticToICRF(pos: Vector3): Vector3 {
    // 委托给统一坐标层实现，确保全项目只有一个权威变换来源。
    return eclipticToIcrfFn(pos);
  }

  /**
   * Transforms a satellite position from Jovicentric to heliocentric coordinates.
   * 
   * Jovicentric coordinates are relative to Jupiter's center.
   * Heliocentric coordinates are relative to the Sun's center.
   * 
   * The transformation is a simple vector addition:
   * position_heliocentric = position_jovicentric + jupiter_position_heliocentric
   * 
   * Both input vectors must be in the same reference frame (typically ICRF).
   * 
   * @param satPos - Satellite position in Jovicentric coordinates (AU, ICRF frame)
   * @param jupiterPos - Jupiter's position in heliocentric coordinates (AU, ICRF frame)
   * @returns Satellite position in heliocentric coordinates (AU, ICRF frame)
   * 
   * @example
   * ```typescript
   * const transformer = new CoordinateTransformer();
   * const ioJovicentric = new Vector3(0.002819, 0, 0); // Io's position relative to Jupiter
   * const jupiterHeliocentric = new Vector3(5.2, 0, 0); // Jupiter's position relative to Sun
   * const ioHeliocentric = transformer.jovicentricToHeliocentric(ioJovicentric, jupiterHeliocentric);
   * // Result: (5.202819, 0, 0)
   * ```
   */
  jovicentricToHeliocentric(satPos: Vector3, jupiterPos: Vector3): Vector3 {
    return satPos.add(jupiterPos);
  }

  /**
   * Transforms a satellite position from heliocentric to Jovicentric coordinates.
   * 
   * This is the inverse of jovicentricToHeliocentric.
   * 
   * The transformation is a simple vector subtraction:
   * position_jovicentric = position_heliocentric - jupiter_position_heliocentric
   * 
   * Both input vectors must be in the same reference frame (typically ICRF).
   * 
   * @param satPos - Satellite position in heliocentric coordinates (AU, ICRF frame)
   * @param jupiterPos - Jupiter's position in heliocentric coordinates (AU, ICRF frame)
   * @returns Satellite position in Jovicentric coordinates (AU, ICRF frame)
   * 
   * @example
   * ```typescript
   * const transformer = new CoordinateTransformer();
   * const ioHeliocentric = new Vector3(5.202819, 0, 0);
   * const jupiterHeliocentric = new Vector3(5.2, 0, 0);
   * const ioJovicentric = transformer.heliocentricToJovicentric(ioHeliocentric, jupiterHeliocentric);
   * // Result: (0.002819, 0, 0)
   * ```
   */
  heliocentricToJovicentric(satPos: Vector3, jupiterPos: Vector3): Vector3 {
    return satPos.sub(jupiterPos);
  }

  /**
   * Transforms a satellite position from planet-centric to heliocentric coordinates.
   * 
   * Planet-centric coordinates are relative to a planet's center.
   * Heliocentric coordinates are relative to the Sun's center.
   * 
   * The transformation is a simple vector addition:
   * position_heliocentric = position_planetcentric + planet_position_heliocentric
   * 
   * Both input vectors must be in the same reference frame (typically ICRF).
   * 
   * This is a generic version that works for any planet (Earth, Mars, Jupiter, Saturn, Uranus, Neptune).
   * 
   * @param satPos - Satellite position in planet-centric coordinates (AU, ICRF frame)
   * @param planetPos - Planet's position in heliocentric coordinates (AU, ICRF frame)
   * @returns Satellite position in heliocentric coordinates (AU, ICRF frame)
   * 
   * Requirements: 9.1, 9.2, 9.5
   * 
   * @example
   * ```typescript
   * const transformer = new CoordinateTransformer();
   * const moonGeocentric = new Vector3(0.00257, 0, 0); // Moon's position relative to Earth
   * const earthHeliocentric = new Vector3(1.0, 0, 0); // Earth's position relative to Sun
   * const moonHeliocentric = transformer.planetcentricToHeliocentric(moonGeocentric, earthHeliocentric);
   * // Result: (1.00257, 0, 0)
   * ```
   */
  planetcentricToHeliocentric(satPos: Vector3, planetPos: Vector3): Vector3 {
    return satPos.add(planetPos);
  }

  /**
   * Transforms a satellite position from heliocentric to planet-centric coordinates.
   * 
   * This is the inverse of planetcentricToHeliocentric.
   * 
   * The transformation is a simple vector subtraction:
   * position_planetcentric = position_heliocentric - planet_position_heliocentric
   * 
   * Both input vectors must be in the same reference frame (typically ICRF).
   * 
   * This is a generic version that works for any planet (Earth, Mars, Jupiter, Saturn, Uranus, Neptune).
   * 
   * @param satPos - Satellite position in heliocentric coordinates (AU, ICRF frame)
   * @param planetPos - Planet's position in heliocentric coordinates (AU, ICRF frame)
   * @returns Satellite position in planet-centric coordinates (AU, ICRF frame)
   * 
   * Requirements: 9.1, 9.2, 9.5
   * 
   * @example
   * ```typescript
   * const transformer = new CoordinateTransformer();
   * const moonHeliocentric = new Vector3(1.00257, 0, 0);
   * const earthHeliocentric = new Vector3(1.0, 0, 0);
   * const moonGeocentric = transformer.heliocentricToplanetcentric(moonHeliocentric, earthHeliocentric);
   * // Result: (0.00257, 0, 0)
   * ```
   */
  heliocentricToplanetcentric(satPos: Vector3, planetPos: Vector3): Vector3 {
    return satPos.sub(planetPos);
  }

  /**
   * Checks if a given NAIF ID corresponds to a supported planet.
   * 
   * @param naifId - NAIF ID to check
   * @returns true if the ID corresponds to a supported planet
   * 
   * Requirements: 9.1, 9.2
   */
  isSupportedPlanet(naifId: number): boolean {
    return Object.values(CoordinateTransformer.PLANET_IDS).includes(naifId as any);
  }
}
