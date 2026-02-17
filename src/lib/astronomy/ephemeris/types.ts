/**
 * Core types for all-bodies ephemeris system
 * 
 * This module defines the data structures used for high-precision
 * positioning of planets and their major satellites using polynomial segments.
 */

/**
 * Satellite identifiers using NAIF ID codes
 */
export enum SatelliteId {
  IO = 501,
  EUROPA = 502,
  GANYMEDE = 503,
  CALLISTO = 504
}

/**
 * Planet identifiers using NAIF ID codes
 * Note: Mars and outer planets use barycenter IDs (4-8) because DE440 kernel
 * doesn't include planet center IDs (499, 599, 699, 799, 899).
 * The difference is negligible for visualization purposes.
 */
export enum PlanetId {
  MERCURY = 199,
  VENUS = 299,
  EARTH = 399,
  MARS = 4,      // Mars Barycenter (not 499)
  JUPITER = 5,   // Jupiter Barycenter (not 599)
  SATURN = 6,    // Saturn Barycenter (not 699)
  URANUS = 7,    // Uranus Barycenter (not 799)
  NEPTUNE = 8    // Neptune Barycenter (not 899)
}

/**
 * All celestial body identifiers (27 bodies total)
 */
export type CelestialBodyId = PlanetId | SatelliteId | 301 | 601 | 602 | 603 | 604 | 605 | 606 | 607 | 608 | 701 | 702 | 703 | 704 | 705 | 801;

/**
 * Polynomial type for ephemeris segments
 */
export enum PolynomialType {
  CHEBYSHEV = 'chebyshev',
  HERMITE = 'hermite'
}

/**
 * Body type classification
 */
export enum BodyType {
  PLANET = 'planet',
  SATELLITE = 'satellite'
}

/**
 * Aberration correction modes
 */
export enum AberrationMode {
  NONE = 'NONE',      // Geometric position (no corrections)
  LT = 'LT',          // Light-time only
  LT_S = 'LT_S'       // Light-time + Stellar aberration
}

/**
 * 3D vector for positions and velocities
 */
export class Vector3 {
  constructor(
    public x: number,
    public y: number,
    public z: number
  ) {}

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return this.scale(1 / len);
  }

  isFinite(): boolean {
    return isFinite(this.x) && isFinite(this.y) && isFinite(this.z);
  }

  equals(v: Vector3, epsilon: number = 1e-10): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }
}

/**
 * Ephemeris data header containing metadata
 * Version 1: Sampled ephemeris (legacy Jupiter moons)
 * Version 2: Polynomial segment ephemeris (all bodies)
 */
export interface EphemerisHeader {
  version: number;
  numBodies: number;    // Number of bodies in file
  numSegments?: number; // Number of polynomial segments (version 2 only)
  numSamples?: number;  // Number of samples (version 1 only)
  startJD: number;      // Julian Date in TDB
  endJD: number;        // Julian Date in TDB
  stepDays?: number;    // Sample step size (version 1 only)
  referenceFrame: 'heliocentric' | 'planetocentric';
  kernelVersions: string;
  generationTimestamp: number;
  bodyIds: number[];    // NAIF IDs of bodies in file
}

/**
 * Chebyshev polynomial segment
 */
export interface ChebyshevSegment {
  type: PolynomialType.CHEBYSHEV;
  bodyId: number;       // NAIF ID
  startJD: number;      // Segment start time (Julian Date)
  endJD: number;        // Segment end time (Julian Date)
  order: number;        // Polynomial order (6-12)
  coefficientsX: number[]; // X component coefficients (order+1 values)
  coefficientsY: number[]; // Y component coefficients (order+1 values)
  coefficientsZ: number[]; // Z component coefficients (order+1 values)
}

/**
 * Hermite polynomial segment
 */
export interface HermiteSegment {
  type: PolynomialType.HERMITE;
  bodyId: number;       // NAIF ID
  startJD: number;      // Segment start time (Julian Date)
  endJD: number;        // Segment end time (Julian Date)
  order: 3;             // Fixed at 3 (cubic)
  startPosition: Vector3; // Start point position
  startVelocity: Vector3; // Start point velocity
  endPosition: Vector3;   // End point position
  endVelocity: Vector3;   // End point velocity
}

/**
 * Union type for polynomial segments
 */
export type PolynomialSegment = ChebyshevSegment | HermiteSegment;

/**
 * Position data for a single satellite (legacy version 1)
 */
export interface SatelliteData {
  positions: Vector3[];  // ICRF frame, Jovicentric coordinates
}

/**
 * Complete ephemeris data structure (legacy version 1)
 */
export interface EphemerisData {
  header: EphemerisHeader;
  satellites: {
    [key in SatelliteId]: SatelliteData;
  };
}

/**
 * Body configuration for ephemeris system
 */
export interface BodyConfig {
  naifId: number;
  name: string;
  type: BodyType;
  parentId?: number;    // Parent planet ID for satellites
  filePattern: string;  // e.g., "jupiter-moons-{year}.bin.gz"
  timeRange: {
    start: number;      // Julian Date
    end: number;        // Julian Date
  };
  polynomialType: PolynomialType;
  segmentDuration: number; // Days
}

/**
 * Ephemeris chunk containing polynomial segments
 */
export interface EphemerisChunk {
  bodyId: number;
  startJD: number;
  endJD: number;
  segments: PolynomialSegment[];
  metadata: ChunkMetadata;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  version: number;
  bodyId: number;
  polynomialType: PolynomialType;
  segmentCount: number;
  fileSize: number;
  checksum?: string;
}

/**
 * Ephemeris status information
 */
export interface EphemerisStatus {
  bodyId: number;
  bodyName: string;
  bodyType: BodyType;
  usingEphemeris: boolean;
  dataSource: string;       // e.g., "JPL DE440 + JUP365" or "VSOP87 Analytical Model"
  accuracyLevel: string;    // e.g., "<0.01° (36 arcsec)" or "~1-5°"
  timeValidity?: {
    start: number;          // Julian Date
    end: number;            // Julian Date
  };
  lastUpdate?: number;      // Timestamp
  errorEstimate?: number;   // Current position error in degrees
  polynomialType?: PolynomialType;
  polynomialOrder?: number;
  segmentDuration?: number; // Days
  spiceKernelVersion?: string;
}

/**
 * Observer mode for different viewpoints
 */
export enum ObserverMode {
  GEOCENTRIC = 'GEOCENTRIC',
  HELIOCENTRIC = 'HELIOCENTRIC',
  JOVICENTRIC = 'JOVICENTRIC'
}

/**
 * Leap second table entry
 */
export interface LeapSecondEntry {
  jd: number;           // Julian Date when leap second was added
  leapSeconds: number;  // Total leap seconds at this date
}

/**
 * Leap second table
 */
export interface LeapSecondTable {
  entries: LeapSecondEntry[];
}

/**
 * Position calculation result with metadata
 */
export interface PositionResult {
  position: Vector3;
  usingEphemeris: boolean;
  source: 'ephemeris' | 'analytical';
  accuracy: 'high' | 'low';
  errorEstimate?: number; // Degrees
}
