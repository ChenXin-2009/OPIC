/**
 * Ephemeris Manager - Coordinates loading and access to ephemeris data for all bodies
 * 
 * This module manages ephemeris data for 27 celestial bodies (8 planets + 19 satellites)
 * using polynomial segment architecture with automatic chunk loading.
 */

import { 
  BodyConfig, 
  EphemerisChunk, 
  EphemerisStatus, 
  PolynomialType,
  BodyType,
  PlanetId,
  Vector3,
  PositionResult
} from './types';
import { ChunkLoader } from './chunk-loader';
import { PolynomialEvaluator } from './polynomial-evaluator';
import { ManifestLoader } from './manifest-loader';

/**
 * Body configuration registry
 * Note: filePattern is deprecated - we now use manifest.json to determine file names
 */
const BODY_CONFIGS: BodyConfig[] = [
  // Inner planets
  {
    naifId: PlanetId.MERCURY,
    name: 'Mercury',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 }, // 2009-2059
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 1.0
  },
  {
    naifId: PlanetId.VENUS,
    name: 'Venus',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 1.0
  },
  {
    naifId: 399, // Earth
    name: 'Earth',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2491603.5 }, // 2009-2109 (100 years)
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 0.25 // 6 hours
  },
  // Mars and outer planets use barycenter IDs (4-8) because DE440 doesn't include planet centers (499, 599, 699, 799, 899)
  // The difference is negligible for visualization since these planets have very small moons
  {
    naifId: 4, // Mars Barycenter (not 499)
    name: 'Mars',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2491603.5 }, // 2009-2109 (100 years)
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 2.0
  },
  {
    naifId: 5, // Jupiter Barycenter (not 599)
    name: 'Jupiter',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 7.0
  },
  {
    naifId: 6, // Saturn Barycenter (not 699)
    name: 'Saturn',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 7.0
  },
  {
    naifId: 7, // Uranus Barycenter (not 799)
    name: 'Uranus',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 7.0
  },
  {
    naifId: 8, // Neptune Barycenter (not 899)
    name: 'Neptune',
    type: BodyType.PLANET,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.CHEBYSHEV,
    segmentDuration: 7.0
  },
  // Earth satellite
  {
    naifId: 301,
    name: 'Moon',
    type: BodyType.SATELLITE,
    parentId: PlanetId.EARTH,
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2491603.5 }, // 2009-2109 (100 years)
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  // Jupiter satellites (parent is Jupiter Barycenter = 5)
  {
    naifId: 501,
    name: 'Io',
    type: BodyType.SATELLITE,
    parentId: 5, // Jupiter Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.25
  },
  {
    naifId: 502,
    name: 'Europa',
    type: BodyType.SATELLITE,
    parentId: 5, // Jupiter Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.25
  },
  {
    naifId: 503,
    name: 'Ganymede',
    type: BodyType.SATELLITE,
    parentId: 5, // Jupiter Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.25
  },
  {
    naifId: 504,
    name: 'Callisto',
    type: BodyType.SATELLITE,
    parentId: 5, // Jupiter Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.25
  },
  // Saturn satellites (parent is Saturn Barycenter = 6)
  {
    naifId: 606,
    name: 'Titan',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  {
    naifId: 605,
    name: 'Rhea',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  {
    naifId: 608,
    name: 'Iapetus',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  {
    naifId: 604,
    name: 'Dione',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  {
    naifId: 603,
    name: 'Tethys',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  {
    naifId: 602,
    name: 'Enceladus',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  {
    naifId: 601,
    name: 'Mimas',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  {
    naifId: 607,
    name: 'Hyperion',
    type: BodyType.SATELLITE,
    parentId: 6, // Saturn Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 0.5
  },
  // Uranus satellites (parent is Uranus Barycenter = 7)
  {
    naifId: 705,
    name: 'Miranda',
    type: BodyType.SATELLITE,
    parentId: 7, // Uranus Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 1.0
  },
  {
    naifId: 701,
    name: 'Ariel',
    type: BodyType.SATELLITE,
    parentId: 7, // Uranus Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 1.0
  },
  {
    naifId: 702,
    name: 'Umbriel',
    type: BodyType.SATELLITE,
    parentId: 7, // Uranus Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 1.0
  },
  {
    naifId: 703,
    name: 'Titania',
    type: BodyType.SATELLITE,
    parentId: 7, // Uranus Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 1.0
  },
  {
    naifId: 704,
    name: 'Oberon',
    type: BodyType.SATELLITE,
    parentId: 7, // Uranus Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 1.0
  },
  // Neptune satellites (parent is Neptune Barycenter = 8)
  {
    naifId: 801,
    name: 'Triton',
    type: BodyType.SATELLITE,
    parentId: 8, // Neptune Barycenter
    filePattern: '', // Deprecated - use manifest
    timeRange: { start: 2454868.5, end: 2473113.5 },
    polynomialType: PolynomialType.HERMITE,
    segmentDuration: 1.0
  }
];

/**
 * Ephemeris Manager
 */
export class EphemerisManager {
  private bodies: Map<number, BodyConfig> = new Map();
  private loadedChunks: Map<string, EphemerisChunk> = new Map();
  private loadingPromises: Map<string, Promise<EphemerisChunk>> = new Map();
  private chunkLoader: ChunkLoader;
  private evaluator: PolynomialEvaluator;
  private manifestLoader: ManifestLoader;
  private baseUrl: string = '/data/ephemeris';
  private outOfRangeWarnings: Set<number> = new Set();
  private manifestLoaded: boolean = false;
  private manifestLoadPromise: Promise<void> | null = null;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    this.chunkLoader = new ChunkLoader();
    this.evaluator = new PolynomialEvaluator();
    this.manifestLoader = new ManifestLoader(this.baseUrl);

    // Register all bodies
    for (const config of BODY_CONFIGS) {
      this.registerBody(config);
    }
    
    // Emit initialization start event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ephemeris:init:start', {
        detail: { stage: 'start' }
      }));
    }
    
    // Try to load manifest (non-blocking)
    this.loadManifest();
  }
  
  /**
   * Load the manifest file
   * This is called automatically in constructor but can be called manually if needed
   */
  private async loadManifest(): Promise<void> {
    if (this.manifestLoadPromise) {
      return this.manifestLoadPromise;
    }
    
    this.manifestLoadPromise = (async () => {
      try {
        console.log('Loading ephemeris manifest...');
        await this.manifestLoader.load();
        this.manifestLoaded = true;
        console.log('Ephemeris manifest loaded successfully');
      } catch (error) {
        console.warn('Failed to load ephemeris manifest, ephemeris data will not be available:', error);
        this.manifestLoaded = false;
      }
    })();
    
    return this.manifestLoadPromise;
  }

  /**
   * Register a body configuration
   * 
   * @param config - Body configuration
   */
  registerBody(config: BodyConfig): void {
    this.bodies.set(config.naifId, config);
  }

  /**
   * Get body position at given time
   * 
   * @param naifId - Body NAIF ID
   * @param jd - Julian Date
   * @returns Position result with metadata
   */
  async getPosition(naifId: number, jd: number): Promise<PositionResult> {
    // Wait for manifest to load if it's still loading
    if (this.manifestLoadPromise && !this.manifestLoaded) {
      await this.manifestLoadPromise;
    }
    
    // If manifest failed to load, return fallback immediately
    if (!this.manifestLoaded) {
      return {
        position: new Vector3(0, 0, 0),
        usingEphemeris: false,
        source: 'analytical',
        accuracy: 'low',
        errorEstimate: 1.0
      };
    }
    
    // Check if data is available for this body at this time
    if (!this.manifestLoader.isDataAvailable(naifId, jd)) {
      if (!this.outOfRangeWarnings.has(naifId)) {
        const timeRange = this.manifestLoader.getTimeRangeForBody(naifId);
        if (timeRange) {
          console.warn(
            `Time ${jd} outside ephemeris range for body ${naifId}, ` +
            `range: [${timeRange.start}, ${timeRange.end}]. Using analytical fallback.`
          );
        } else {
          console.warn(`No ephemeris data available for body ${naifId}. Using analytical fallback.`);
        }
        this.outOfRangeWarnings.add(naifId);
      }

      // Return fallback result
      return {
        position: new Vector3(0, 0, 0),
        usingEphemeris: false,
        source: 'analytical',
        accuracy: 'low',
        errorEstimate: 1.0
      };
    }

    try {
      // Get chunk metadata from manifest
      const chunkMetadata = this.manifestLoader.getChunkForBodyAtTime(naifId, jd);
      
      if (!chunkMetadata) {
        // No chunk found, return fallback
        return {
          position: new Vector3(0, 0, 0),
          usingEphemeris: false,
          source: 'analytical',
          accuracy: 'low',
          errorEstimate: 1.0
        };
      }
      
      // Load chunk if needed
      const chunkKey = chunkMetadata.file;
      let chunk = this.loadedChunks.get(chunkKey);

      if (!chunk) {
        chunk = await this.loadChunkByKey(chunkKey);
      }

      // Find segment containing this time
      const segmentIndex = this.evaluator.findSegment(jd, chunk.segments);
      
      if (segmentIndex === -1) {
        console.warn(`No segment found for time ${jd} in chunk ${chunkKey}, using fallback`);
        return {
          position: new Vector3(0, 0, 0),
          usingEphemeris: false,
          source: 'analytical',
          accuracy: 'low',
          errorEstimate: 1.0
        };
      }

      const segment = chunk.segments[segmentIndex];
      const position = this.evaluator.evaluateSegment(jd, segment);

      // Determine accuracy based on body type
      const bodyType = naifId < 400 ? BodyType.PLANET : BodyType.SATELLITE;
      
      return {
        position,
        usingEphemeris: true,
        source: 'ephemeris',
        accuracy: 'high',
        errorEstimate: bodyType === BodyType.SATELLITE ? 0.01 : 0.1
      };
    } catch (error) {
      // Log error but don't crash - return fallback
      if (!this.outOfRangeWarnings.has(naifId)) {
        console.warn(`Failed to load ephemeris for body ${naifId}:`, error);
        this.outOfRangeWarnings.add(naifId);
      }
      
      return {
        position: new Vector3(0, 0, 0),
        usingEphemeris: false,
        source: 'analytical',
        accuracy: 'low',
        errorEstimate: 1.0
      };
    }
  }

  /**
   * Preload ephemeris data for a time range
   * 
   * @param naifId - Body NAIF ID
   * @param startJD - Start Julian Date
   * @param endJD - End Julian Date
   */
  async preloadRange(naifId: number, startJD: number, endJD: number): Promise<void> {
    // Wait for manifest to load
    if (this.manifestLoadPromise && !this.manifestLoaded) {
      await this.manifestLoadPromise;
    }
    
    if (!this.manifestLoaded) {
      console.warn('Manifest not loaded, cannot preload ephemeris data');
      return;
    }

    // Get chunks from manifest
    const chunks = this.manifestLoader.getChunksForBodyInTimeRange(naifId, startJD, endJD);

    // Load all chunks in parallel
    const loadPromises = chunks.map(chunk => this.loadChunkByKey(chunk.file));
    await Promise.all(loadPromises);
  }

  /**
   * Check if data is loaded for given time
   * 
   * @param naifId - Body NAIF ID
   * @param jd - Julian Date
   * @returns True if data is loaded
   */
  isLoaded(naifId: number, jd: number): boolean {
    if (!this.manifestLoaded) {
      return false;
    }
    
    const chunkMetadata = this.manifestLoader.getChunkForBodyAtTime(naifId, jd);
    if (!chunkMetadata) {
      return false;
    }

    return this.loadedChunks.has(chunkMetadata.file);
  }

  /**
   * Get ephemeris status for a body
   * 
   * @param naifId - Body NAIF ID
   * @returns Ephemeris status
   */
  getStatus(naifId: number): EphemerisStatus {
    const config = this.bodies.get(naifId);
    
    if (!config) {
      throw new Error(`Unknown body ID: ${naifId}`);
    }

    return {
      bodyId: naifId,
      bodyName: config.name,
      bodyType: config.type,
      usingEphemeris: true,
      dataSource: config.type === BodyType.PLANET ? 'JPL DE440' : 'JPL Satellite Kernels',
      accuracyLevel: config.type === BodyType.SATELLITE ? '<0.01° (36 arcsec)' : '<0.1° (360 arcsec)',
      timeValidity: config.timeRange,
      polynomialType: config.polynomialType,
      segmentDuration: config.segmentDuration
    };
  }

  /**
   * Load chunk by filename
   * 
   * @param filename - Chunk filename (from manifest)
   * @returns Loaded chunk
   */
  private async loadChunkByKey(filename: string): Promise<EphemerisChunk> {
    // Check if already loaded
    const existing = this.loadedChunks.get(filename);
    if (existing) {
      return existing;
    }

    // Check if already loading
    const loading = this.loadingPromises.get(filename);
    if (loading) {
      return loading;
    }

    // Start loading
    const url = `${this.baseUrl}/${filename}`;
    const promise = this.chunkLoader.loadChunk(url);

    this.loadingPromises.set(filename, promise);

    try {
      const chunk = await promise;
      this.loadedChunks.set(filename, chunk);
      this.loadingPromises.delete(filename);
      
      // Emit data loaded event (first chunk loaded)
      if (typeof window !== 'undefined' && this.loadedChunks.size === 1) {
        window.dispatchEvent(new CustomEvent('ephemeris:data:loaded', {
          detail: { stage: 'data' }
        }));
      }
      
      return chunk;
    } catch (error) {
      this.loadingPromises.delete(filename);
      throw error;
    }
  }

  /**
   * Get list of registered bodies
   * 
   * @returns Array of body configurations
   */
  getBodies(): BodyConfig[] {
    return Array.from(this.bodies.values());
  }

  /**
   * Clear all loaded data
   */
  clear(): void {
    this.loadedChunks.clear();
    this.loadingPromises.clear();
    this.chunkLoader.clear();
    this.outOfRangeWarnings.clear();
  }
}
