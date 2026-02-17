/**
 * EphemerisDataLoader - Loads and parses precomputed ephemeris data
 * 
 * This module handles fetching compressed ephemeris data files,
 * decompressing them, and parsing the binary format into usable
 * data structures.
 */

import pako from 'pako';
import { 
  EphemerisData, 
  EphemerisHeader, 
  SatelliteId, 
  Vector3,
  EphemerisChunk,
  PolynomialSegment,
  ChebyshevSegment,
  HermiteSegment,
  PolynomialType,
  ChunkMetadata
} from './types';

/**
 * Magic number for ephemeris file format validation
 * ASCII: "JUPM" (Jupiter Moons)
 */
const MAGIC_NUMBER = 0x4A55504D;

/**
 * Supported ephemeris data format version
 */
const SUPPORTED_VERSION = 2;

/**
 * Header size in bytes
 */
const HEADER_SIZE = 128;

/**
 * Loads and parses ephemeris data from compressed binary files
 */
export class EphemerisDataLoader {
  /**
   * Load ephemeris chunk (version 2 format with polynomial segments)
   * 
   * @param url - URL to the compressed ephemeris chunk file
   * @returns Promise resolving to parsed ephemeris chunk
   * @throws Error if loading, decompression, or parsing fails
   */
  async loadChunk(url: string): Promise<EphemerisChunk> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const compressed = await response.arrayBuffer();
      const decompressed = pako.ungzip(new Uint8Array(compressed));

      return this.parseChunk(decompressed);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load ephemeris chunk: ${error.message}`);
      }
      throw new Error('Failed to load ephemeris chunk: Unknown error');
    }
  }

  /**
   * Load ephemeris data from a URL
   * 
   * @param url - URL to the compressed ephemeris data file
   * @returns Promise resolving to parsed ephemeris data
   * @throws Error if loading, decompression, or parsing fails
   */
  async load(url: string): Promise<EphemerisData> {
    try {
      // Fetch compressed data with progress tracking
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get compressed data as ArrayBuffer
      const compressed = await response.arrayBuffer();

      // Decompress using pako
      const decompressed = pako.ungzip(new Uint8Array(compressed));

      // Parse binary format
      const data = this.parse(decompressed);

      // Validate data integrity
      this.validate(data);

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load ephemeris data: ${error.message}`);
      }
      throw new Error('Failed to load ephemeris data: Unknown error');
    }
  }

  /**
   * Load multiple ephemeris data files
   * 
   * @param urls - Array of URLs to ephemeris data files
   * @returns Promise resolving to array of parsed ephemeris data
   */
  async loadMultiple(urls: string[]): Promise<EphemerisData[]> {
    const promises = urls.map(url => this.load(url));
    return Promise.all(promises);
  }

  /**
   * Get the validity period of ephemeris data
   * 
   * @param data - Ephemeris data
   * @returns Object with start and end dates
   */
  getValidityPeriod(data: EphemerisData): { start: Date; end: Date } {
    // Convert Julian Date (TDB) to JavaScript Date (approximate)
    // JD 2451545.0 = 2000-01-01 12:00:00 TT
    const jdToDate = (jd: number): Date => {
      const millisSinceJ2000 = (jd - 2451545.0) * 86400 * 1000;
      const j2000 = new Date('2000-01-01T12:00:00Z');
      return new Date(j2000.getTime() + millisSinceJ2000);
    };

    return {
      start: jdToDate(data.header.startJD),
      end: jdToDate(data.header.endJD)
    };
  }

  /**
   * Parse binary ephemeris data
   * 
   * @param buffer - Decompressed binary data
   * @returns Parsed ephemeris data
   * @throws Error if parsing fails
   */
  private parse(buffer: Uint8Array): EphemerisData {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 0;

    // Parse header
    const header = this.parseHeader(view, offset);
    offset += HEADER_SIZE;

    // Parse satellite data
    const satellites: EphemerisData['satellites'] = {
      [SatelliteId.IO]: { positions: [] },
      [SatelliteId.EUROPA]: { positions: [] },
      [SatelliteId.GANYMEDE]: { positions: [] },
      [SatelliteId.CALLISTO]: { positions: [] }
    };

    // Read data for each satellite
    const numSatellites = (header as any).numSatellites ?? 0;
    for (let i = 0; i < numSatellites; i++) {
      // Read satellite ID (4 bytes)
      const satId = view.getInt32(offset, true);
      offset += 4;

      // Validate satellite ID
      if (!Object.values(SatelliteId).includes(satId)) {
        throw new Error(`Invalid satellite ID: ${satId}`);
      }

      // Read positions (N × 12 bytes: 3 float32 per position)
      const positions: Vector3[] = [];
      const numSamplesForSat = header.numSamples ?? 0;
      for (let j = 0; j < numSamplesForSat; j++) {
        const x = view.getFloat32(offset, true);
        offset += 4;
        const y = view.getFloat32(offset, true);
        offset += 4;
        const z = view.getFloat32(offset, true);
        offset += 4;

        positions.push(new Vector3(x, y, z));
      }

      satellites[satId as SatelliteId] = { positions };
    }

    return { header, satellites };
  }

  /**
   * Parse ephemeris data header
   * 
   * @param view - DataView of the binary data
   * @param offset - Starting offset in bytes
   * @returns Parsed header
   * @throws Error if header is invalid
   */
  private parseHeader(view: DataView, offset: number): EphemerisHeader {
    // Read magic number (4 bytes)
    const magic = view.getUint32(offset, true);
    if (magic !== MAGIC_NUMBER) {
      throw new Error(`Invalid magic number: 0x${magic.toString(16)}`);
    }
    offset += 4;

    // Read version (2 bytes)
    const version = view.getUint16(offset, true);
    if (version > SUPPORTED_VERSION) {
      throw new Error(`Unsupported version: ${version}`);
    }
    offset += 2;

    // Read number of satellites (2 bytes)
    const numSatellites = view.getUint16(offset, true);
    offset += 2;

    // Read number of samples (4 bytes)
    const numSamples = view.getUint32(offset, true);
    offset += 4;

    // Read start JD (8 bytes, double)
    const startJD = view.getFloat64(offset, true);
    offset += 8;

    // Read end JD (8 bytes, double)
    const endJD = view.getFloat64(offset, true);
    offset += 8;

    // Read step size (8 bytes, double)
    const stepDays = view.getFloat64(offset, true);
    offset += 8;

    // Read kernel versions (64 bytes, null-terminated string)
    const kernelVersionsBytes = new Uint8Array(view.buffer, view.byteOffset + offset, 64);
    const nullIndex = kernelVersionsBytes.indexOf(0);
    const kernelVersionsLength = nullIndex >= 0 ? nullIndex : 64;
    const kernelVersions = new TextDecoder().decode(
      kernelVersionsBytes.slice(0, kernelVersionsLength)
    );
    offset += 64;

    // Read generation timestamp (8 bytes, double)
    const generationTimestamp = view.getFloat64(offset, true);
    offset += 8;

    // Skip reserved bytes (20 bytes)
    // offset += 20;

    return {
      version,
      numBodies: numSatellites, // Map numSatellites to numBodies for consistency
      numSamples,
      startJD,
      endJD,
      stepDays,
      referenceFrame: 'heliocentric' as const,
      kernelVersions,
      generationTimestamp,
      bodyIds: [] // Will be populated when reading satellite data
    };
  }

  /**
   * Validate ephemeris data integrity
   * 
   * @param data - Ephemeris data to validate
   * @throws Error if validation fails
   */
  private validate(data: EphemerisData): void {
    const { header, satellites } = data;

    // Validate header values
    if (header.numBodies !== 4) {
      throw new Error(`Expected 4 satellites, got ${header.numBodies}`);
    }

    if (!header.numSamples || header.numSamples <= 0) {
      throw new Error(`Invalid number of samples: ${header.numSamples}`);
    }

    if (header.startJD >= header.endJD) {
      throw new Error(`Invalid time range: ${header.startJD} >= ${header.endJD}`);
    }

    if (!header.stepDays || header.stepDays <= 0) {
      throw new Error(`Invalid step size: ${header.stepDays}`);
    }

    // Validate satellite data
    const expectedSatellites = [
      SatelliteId.IO,
      SatelliteId.EUROPA,
      SatelliteId.GANYMEDE,
      SatelliteId.CALLISTO
    ];

    for (const satId of expectedSatellites) {
      const satData = satellites[satId];
      
      if (!satData) {
        throw new Error(`Missing data for satellite ${satId}`);
      }

      if (satData.positions.length !== header.numSamples) {
        throw new Error(
          `Satellite ${satId} has ${satData.positions.length} positions, expected ${header.numSamples}`
        );
      }

      // Validate that positions are finite
      for (let i = 0; i < satData.positions.length; i++) {
        const pos = satData.positions[i];
        if (!pos.isFinite()) {
          throw new Error(
            `Satellite ${satId} has non-finite position at index ${i}: (${pos.x}, ${pos.y}, ${pos.z})`
          );
        }
      }
    }
  }

  /**
   * Parse ephemeris chunk (version 2 format with polynomial segments)
   * 
   * @param buffer - Decompressed binary data
   * @returns Parsed ephemeris chunk
   * @throws Error if parsing fails
   */
  private parseChunk(buffer: Uint8Array): EphemerisChunk {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 0;

    // Parse header
    const header = this.parseHeaderV2(view, offset);
    offset += HEADER_SIZE;

    if (header.version !== 2) {
      throw new Error(`Expected version 2, got version ${header.version}`);
    }

    // Parse polynomial segments
    const segments: PolynomialSegment[] = [];
    const numSegments = header.numSegments || 0;

    for (let i = 0; i < numSegments; i++) {
      const segment = this.parseSegment(view, offset);
      segments.push(segment);
      offset += this.getSegmentSize(segment);
    }

    const metadata: ChunkMetadata = {
      version: header.version,
      bodyId: header.bodyIds[0] || 0,
      polynomialType: segments[0]?.type === 'chebyshev' ? PolynomialType.CHEBYSHEV : PolynomialType.HERMITE,
      segmentCount: segments.length,
      fileSize: buffer.length
    };

    return {
      bodyId: header.bodyIds[0] || 0,
      startJD: header.startJD,
      endJD: header.endJD,
      segments,
      metadata
    };
  }

  /**
   * Parse version 2 header
   * 
   * @param view - DataView of the binary data
   * @param offset - Starting offset in bytes
   * @returns Parsed header
   * @throws Error if header is invalid
   */
  private parseHeaderV2(view: DataView, offset: number): EphemerisHeader {
    // Read magic number (4 bytes)
    const magic = view.getUint32(offset, true);
    if (magic !== MAGIC_NUMBER) {
      throw new Error(
        `Invalid ephemeris file: magic number mismatch. ` +
        `Expected 0x${MAGIC_NUMBER.toString(16)}, got 0x${magic.toString(16)}`
      );
    }
    offset += 4;

    // Read version (2 bytes)
    const version = view.getUint16(offset, true);
    if (version > SUPPORTED_VERSION) {
      throw new Error(
        `Unsupported ephemeris file version: ${version}. ` +
        `This software supports version ${SUPPORTED_VERSION} or earlier. ` +
        `Please update the software.`
      );
    }
    offset += 2;

    // Read number of bodies (2 bytes)
    const numBodies = view.getUint16(offset, true);
    offset += 2;

    // Read number of segments (4 bytes) - version 2 only
    const numSegments = view.getUint32(offset, true);
    offset += 4;

    // Read start JD (8 bytes, double)
    const startJD = view.getFloat64(offset, true);
    offset += 8;

    // Read end JD (8 bytes, double)
    const endJD = view.getFloat64(offset, true);
    offset += 8;

    // Read reference frame (1 byte)
    const referenceFrameByte = view.getUint8(offset);
    const referenceFrame = referenceFrameByte === 0 ? 'heliocentric' : 'planetocentric';
    offset += 1;

    // Read kernel versions (64 bytes, null-terminated string)
    const kernelVersionsBytes = new Uint8Array(view.buffer, view.byteOffset + offset, 64);
    const nullIndex = kernelVersionsBytes.indexOf(0);
    const kernelVersionsLength = nullIndex >= 0 ? nullIndex : 64;
    const kernelVersions = new TextDecoder().decode(
      kernelVersionsBytes.slice(0, kernelVersionsLength)
    );
    offset += 64;

    // Read generation timestamp (8 bytes, double)
    const generationTimestamp = view.getFloat64(offset, true);
    offset += 8;

    // Read body IDs (remaining header space, up to 27 bodies)
    const bodyIds: number[] = [];
    const remainingHeaderBytes = HEADER_SIZE - (offset - 0);
    const maxBodyIds = Math.min(numBodies, Math.floor(remainingHeaderBytes / 4));
    
    for (let i = 0; i < maxBodyIds; i++) {
      if (offset + 4 <= HEADER_SIZE) {
        bodyIds.push(view.getInt32(offset, true));
        offset += 4;
      }
    }

    return {
      version,
      numBodies,
      numSegments,
      startJD,
      endJD,
      referenceFrame,
      kernelVersions,
      generationTimestamp,
      bodyIds
    };
  }

  /**
   * Parse a single polynomial segment
   * 
   * @param view - DataView of the binary data
   * @param offset - Starting offset in bytes
   * @returns Parsed segment
   * @throws Error if parsing fails
   */
  private parseSegment(view: DataView, offset: number): PolynomialSegment {
    // Read body NAIF ID (4 bytes)
    const bodyId = view.getInt32(offset, true);
    offset += 4;

    // Read segment type (1 byte): 1 = Chebyshev, 2 = Hermite
    const segmentType = view.getUint8(offset);
    offset += 1;

    // Read start JD (8 bytes)
    const startJD = view.getFloat64(offset, true);
    offset += 8;

    // Read end JD (8 bytes)
    const endJD = view.getFloat64(offset, true);
    offset += 8;

    if (segmentType === 1) {
      // Chebyshev segment
      const order = view.getUint8(offset);
      offset += 1;

      const numCoeffs = order + 1;
      const coefficientsX: number[] = [];
      const coefficientsY: number[] = [];
      const coefficientsZ: number[] = [];

      for (let i = 0; i < numCoeffs; i++) {
        coefficientsX.push(view.getFloat64(offset, true));
        offset += 8;
      }

      for (let i = 0; i < numCoeffs; i++) {
        coefficientsY.push(view.getFloat64(offset, true));
        offset += 8;
      }

      for (let i = 0; i < numCoeffs; i++) {
        coefficientsZ.push(view.getFloat64(offset, true));
        offset += 8;
      }

      return {
        type: PolynomialType.CHEBYSHEV,
        bodyId,
        startJD,
        endJD,
        order,
        coefficientsX,
        coefficientsY,
        coefficientsZ
      };
    } else if (segmentType === 2) {
      // Hermite segment
      const startPosition = new Vector3(
        view.getFloat64(offset, true),
        view.getFloat64(offset + 8, true),
        view.getFloat64(offset + 16, true)
      );
      offset += 24;

      const startVelocity = new Vector3(
        view.getFloat64(offset, true),
        view.getFloat64(offset + 8, true),
        view.getFloat64(offset + 16, true)
      );
      offset += 24;

      const endPosition = new Vector3(
        view.getFloat64(offset, true),
        view.getFloat64(offset + 8, true),
        view.getFloat64(offset + 16, true)
      );
      offset += 24;

      const endVelocity = new Vector3(
        view.getFloat64(offset, true),
        view.getFloat64(offset + 8, true),
        view.getFloat64(offset + 16, true)
      );
      offset += 24;

      return {
        type: PolynomialType.HERMITE,
        bodyId,
        startJD,
        endJD,
        order: 3,
        startPosition,
        startVelocity,
        endPosition,
        endVelocity
      };
    } else {
      throw new Error(`Unknown segment type: ${segmentType}`);
    }
  }

  /**
   * Get the size of a segment in bytes
   * 
   * @param segment - Polynomial segment
   * @returns Size in bytes
   */
  private getSegmentSize(segment: PolynomialSegment): number {
    // Body ID (4) + Type (1) + Start JD (8) + End JD (8) = 21 bytes base
    let size = 21;

    if (segment.type === PolynomialType.CHEBYSHEV) {
      // Order (1) + 3 * (order+1) * 8 bytes for coefficients
      size += 1 + 3 * (segment.order + 1) * 8;
    } else {
      // 4 vectors * 3 components * 8 bytes = 96 bytes
      size += 96;
    }

    return size;
  }
}
