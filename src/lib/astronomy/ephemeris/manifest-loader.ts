/**
 * Manifest File Loader for Multi-Body Ephemeris System
 * 
 * This module provides functionality to load and query the manifest.json file
 * that lists all available ephemeris data chunks and their metadata.
 * 
 * The manifest file contains:
 * - Version information
 * - Generation date
 * - SPICE kernel sources
 * - List of data chunks with their time ranges, bodies, and checksums
 * 
 * Requirements: 3.12
 */

/**
 * Time range for a data chunk (Julian Day)
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Metadata for a single ephemeris data chunk
 */
export interface ChunkMetadata {
  /** Filename of the data chunk (e.g., "planets-2009.bin.gz") */
  file: string;
  /** NAIF IDs of bodies contained in this chunk */
  bodies: number[];
  /** Time range covered by this chunk (Julian Day) */
  timeRange: TimeRange;
  /** File size in bytes */
  size: number;
  /** Checksum for integrity verification (e.g., "sha256:...") */
  checksum: string;
}

/**
 * SPICE kernel sources used to generate the ephemeris data
 */
export interface SpiceKernels {
  planets: string;
  jupiter?: string;
  saturn?: string;
  uranus?: string;
  neptune?: string;
}

/**
 * Manifest file structure
 */
export interface Manifest {
  /** Format version number */
  version: number;
  /** ISO 8601 timestamp of when the manifest was generated */
  generationDate: string;
  /** SPICE kernel sources */
  spiceKernels: SpiceKernels;
  /** List of all available data chunks */
  chunks: ChunkMetadata[];
}

/**
 * ManifestLoader loads and provides query methods for the ephemeris manifest file.
 * 
 * The manifest file lists all available ephemeris data chunks, their time ranges,
 * and which bodies they contain. This allows the ephemeris system to determine
 * which files to load for a given body and time.
 * 
 * Requirements: 3.12
 */
export class ManifestLoader {
  private manifest: Manifest | null = null;
  private baseUrl: string;

  /**
   * Creates a new ManifestLoader.
   * 
   * @param baseUrl - Base URL where ephemeris data files are hosted
   */
  constructor(baseUrl: string = '/data/ephemeris') {
    this.baseUrl = baseUrl;
  }

  /**
   * Loads the manifest file from the server.
   * 
   * @returns Promise that resolves to the loaded manifest
   * @throws Error if the manifest cannot be loaded or parsed
   */
  async load(): Promise<Manifest> {
    const url = `${this.baseUrl}/manifest.json`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
      }
      
      this.manifest = await response.json();
      
      // Validate manifest structure
      if (!this.manifest || typeof this.manifest.version !== 'number') {
        throw new Error('Invalid manifest format: missing version');
      }
      
      if (!Array.isArray(this.manifest.chunks)) {
        throw new Error('Invalid manifest format: missing chunks array');
      }
      
      // Emit manifest loaded event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ephemeris:manifest:loaded', {
          detail: { stage: 'manifest' }
        }));
      }
      
      return this.manifest;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load manifest from ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Gets the loaded manifest.
   * 
   * @returns The loaded manifest, or null if not yet loaded
   */
  getManifest(): Manifest | null {
    return this.manifest;
  }

  /**
   * Finds all chunks that contain data for a specific body.
   * 
   * @param bodyId - NAIF ID of the body
   * @returns Array of chunk metadata for chunks containing this body
   * @throws Error if manifest is not loaded
   */
  getChunksForBody(bodyId: number): ChunkMetadata[] {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call load() first.');
    }
    
    return this.manifest.chunks.filter(chunk => chunk.bodies.includes(bodyId));
  }

  /**
   * Finds the chunk that contains data for a specific body at a specific time.
   * 
   * @param bodyId - NAIF ID of the body
   * @param jd - Julian Day
   * @returns Chunk metadata if found, null otherwise
   * @throws Error if manifest is not loaded
   */
  getChunkForBodyAtTime(bodyId: number, jd: number): ChunkMetadata | null {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call load() first.');
    }
    
    const chunks = this.manifest.chunks.filter(chunk => 
      chunk.bodies.includes(bodyId) &&
      jd >= chunk.timeRange.start &&
      jd <= chunk.timeRange.end
    );
    
    // Return the first matching chunk (there should only be one)
    return chunks.length > 0 ? chunks[0] : null;
  }

  /**
   * Finds all chunks that overlap with a given time range.
   * 
   * @param startJd - Start of time range (Julian Day)
   * @param endJd - End of time range (Julian Day)
   * @returns Array of chunk metadata for chunks overlapping this time range
   * @throws Error if manifest is not loaded
   */
  getChunksInTimeRange(startJd: number, endJd: number): ChunkMetadata[] {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call load() first.');
    }
    
    return this.manifest.chunks.filter(chunk =>
      // Chunk overlaps if: chunk.start <= endJd AND chunk.end >= startJd
      chunk.timeRange.start <= endJd && chunk.timeRange.end >= startJd
    );
  }

  /**
   * Finds all chunks for a specific body that overlap with a given time range.
   * 
   * @param bodyId - NAIF ID of the body
   * @param startJd - Start of time range (Julian Day)
   * @param endJd - End of time range (Julian Day)
   * @returns Array of chunk metadata
   * @throws Error if manifest is not loaded
   */
  getChunksForBodyInTimeRange(bodyId: number, startJd: number, endJd: number): ChunkMetadata[] {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call load() first.');
    }
    
    return this.manifest.chunks.filter(chunk =>
      chunk.bodies.includes(bodyId) &&
      chunk.timeRange.start <= endJd &&
      chunk.timeRange.end >= startJd
    );
  }

  /**
   * Gets the time range covered by all chunks for a specific body.
   * 
   * @param bodyId - NAIF ID of the body
   * @returns Time range, or null if no chunks found for this body
   * @throws Error if manifest is not loaded
   */
  getTimeRangeForBody(bodyId: number): TimeRange | null {
    const chunks = this.getChunksForBody(bodyId);
    
    if (chunks.length === 0) {
      return null;
    }
    
    const start = Math.min(...chunks.map(c => c.timeRange.start));
    const end = Math.max(...chunks.map(c => c.timeRange.end));
    
    return { start, end };
  }

  /**
   * Gets all unique body IDs listed in the manifest.
   * 
   * @returns Array of NAIF IDs
   * @throws Error if manifest is not loaded
   */
  getAllBodies(): number[] {
    if (!this.manifest) {
      throw new Error('Manifest not loaded. Call load() first.');
    }
    
    const bodySet = new Set<number>();
    for (const chunk of this.manifest.chunks) {
      for (const bodyId of chunk.bodies) {
        bodySet.add(bodyId);
      }
    }
    
    return Array.from(bodySet).sort((a, b) => a - b);
  }

  /**
   * Checks if data is available for a specific body at a specific time.
   * 
   * @param bodyId - NAIF ID of the body
   * @param jd - Julian Day
   * @returns true if data is available, false otherwise
   * @throws Error if manifest is not loaded
   */
  isDataAvailable(bodyId: number, jd: number): boolean {
    return this.getChunkForBodyAtTime(bodyId, jd) !== null;
  }
}
