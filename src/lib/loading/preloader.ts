/**
 * Resource Preloader
 * 
 * Manages preloading of critical and optional resources before initial render.
 * Tracks progress separately for critical and optional resources.
 * 
 * **Critical Resources** (blocking render):
 * - Star textures
 * - Planet textures
 * - UI icons
 * - Fonts (Inter, JetBrains Mono)
 * - Star catalog data
 * - Solar system ephemeris
 * 
 * **Optional Resources** (progressive enhancement):
 * - High-res planetary models
 * - Extended star catalogs
 * - Optional MODs
 * 
 * @example
 * ```typescript
 * const preloader = new ResourcePreloader();
 * 
 * // Preload critical resources (blocks render)
 * await preloader.preloadCritical();
 * 
 * // Preload optional resources (background)
 * preloader.preloadOptional();
 * 
 * // Track progress
 * const progress = preloader.getProgress();
 * console.log(`Overall: ${progress.overall}%`);
 * console.log(`Critical: ${progress.critical}%`);
 * console.log(`Optional: ${progress.optional}%`);
 * ```
 * 
 * @see Requirements 4.15, 4.16, 4.17
 */

import { ensureError } from '@/lib/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Resource type enum
 */
export enum ResourceType {
  TEXTURE = 'texture',
  FONT = 'font',
  DATA = 'data',
  MODEL = 'model',
  SCRIPT = 'script',
}

/**
 * Resource definition
 */
export interface Resource {
  /** Resource URL or path */
  url: string;
  
  /** Resource type */
  type: ResourceType;
  
  /** Display name for progress tracking */
  name: string;
  
  /** Is this a critical resource? */
  critical: boolean;
}

/**
 * Preload configuration
 */
export interface PreloadConfig {
  critical: {
    textures: string[];
    fonts: string[];
    data: string[];
  };
  optional: {
    textures: string[];
    models: string[];
    data: string[];
  };
}

/**
 * Progress information
 */
export interface PreloadProgress {
  /** Overall progress (0-100) */
  overall: number;
  
  /** Critical resources progress (0-100) */
  critical: number;
  
  /** Optional resources progress (0-100) */
  optional: number;
  
  /** Number of resources loaded */
  loaded: number;
  
  /** Total number of resources */
  total: number;
  
  /** Currently loading resource name */
  currentResource: string | null;
  
  /** Failed resources */
  failed: string[];
}

/**
 * Default preload configuration
 */
const DEFAULT_CONFIG: PreloadConfig = {
  critical: {
    textures: [
      '/textures/star.png',
      '/textures/planets/earth.jpg',
      '/textures/planets/mars.jpg',
      '/textures/planets/jupiter.jpg',
      '/textures/planets/saturn.jpg',
    ],
    fonts: [
      'Inter',
      'JetBrains Mono',
    ],
    data: [
      '/data/stars_100k.json',
      '/data/solar_system.json',
    ],
  },
  optional: {
    textures: [
      '/textures/planets/venus.jpg',
      '/textures/planets/mercury.jpg',
      '/textures/planets/uranus.jpg',
      '/textures/planets/neptune.jpg',
    ],
    models: [
      '/models/satellite.glb',
    ],
    data: [
      '/data/galaxy_catalog.json',
    ],
  },
};

/**
 * ResourcePreloader class
 */
export class ResourcePreloader {
  private config: PreloadConfig;
  private criticalResources: Resource[] = [];
  private optionalResources: Resource[] = [];
  private loadedCount = 0;
  private failedResources: string[] = [];
  private currentResource: string | null = null;
  private progressCallbacks: Set<(progress: PreloadProgress) => void> = new Set();

  constructor(config?: Partial<PreloadConfig>) {
    this.config = {
      critical: { ...DEFAULT_CONFIG.critical, ...config?.critical },
      optional: { ...DEFAULT_CONFIG.optional, ...config?.optional },
    };

    this.buildResourceLists();
  }

  /**
   * Build internal resource lists from config
   */
  private buildResourceLists(): void {
    // Critical textures
    this.criticalResources.push(
      ...this.config.critical.textures.map((url) => ({
        url,
        type: ResourceType.TEXTURE,
        name: this.getResourceName(url),
        critical: true,
      }))
    );

    // Critical fonts
    this.criticalResources.push(
      ...this.config.critical.fonts.map((name) => ({
        url: name,
        type: ResourceType.FONT,
        name,
        critical: true,
      }))
    );

    // Critical data
    this.criticalResources.push(
      ...this.config.critical.data.map((url) => ({
        url,
        type: ResourceType.DATA,
        name: this.getResourceName(url),
        critical: true,
      }))
    );

    // Optional textures
    this.optionalResources.push(
      ...this.config.optional.textures.map((url) => ({
        url,
        type: ResourceType.TEXTURE,
        name: this.getResourceName(url),
        critical: false,
      }))
    );

    // Optional models
    this.optionalResources.push(
      ...this.config.optional.models.map((url) => ({
        url,
        type: ResourceType.MODEL,
        name: this.getResourceName(url),
        critical: false,
      }))
    );

    // Optional data
    this.optionalResources.push(
      ...this.config.optional.data.map((url) => ({
        url,
        type: ResourceType.DATA,
        name: this.getResourceName(url),
        critical: false,
      }))
    );
  }

  /**
   * Extract resource name from URL
   */
  private getResourceName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  }

  /**
   * Preload a single resource
   */
  private async preloadResource(resource: Resource): Promise<void> {
    this.currentResource = resource.name;
    this.notifyProgress();

    try {
      switch (resource.type) {
        case ResourceType.TEXTURE:
          await this.preloadImage(resource.url);
          break;

        case ResourceType.FONT:
          await this.preloadFont(resource.url);
          break;

        case ResourceType.DATA:
          await this.preloadData(resource.url);
          break;

        case ResourceType.MODEL:
          await this.preloadModel(resource.url);
          break;

        default:
          console.warn(`[ResourcePreloader] Unknown resource type: ${resource.type}`);
      }

      this.loadedCount++;
      logger.debug(`[ResourcePreloader] Loaded ${resource.critical ? 'critical' : 'optional'}: ${resource.name}`);
    } catch (error) {
      const err = ensureError(error);
      console.error(`[ResourcePreloader] Failed to load ${resource.name}:`, err);
      this.failedResources.push(resource.name);

      if (resource.critical) {
        throw new Error(`Failed to load critical resource: ${resource.name}`, { cause: err });
      }
    } finally {
      this.currentResource = null;
      this.notifyProgress();
    }
  }

  /**
   * Preload an image
   */
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Preload a font
   */
  private async preloadFont(fontFamily: string): Promise<void> {
    if (typeof document === 'undefined') {
      return;
    }

    try {
      await document.fonts.load(`1em ${fontFamily}`);
    } catch (error) {
      const err = ensureError(error);
      throw new Error(`Failed to load font: ${fontFamily}`, { cause: err });
    }
  }

  /**
   * Preload data (JSON)
   */
  private async preloadData(url: string): Promise<void> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    await response.json();
  }

  /**
   * Preload a 3D model
   */
  private async preloadModel(url: string): Promise<void> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    await response.arrayBuffer();
  }

  /**
   * Preload critical resources (blocking)
   */
  public async preloadCritical(): Promise<void> {
    logger.debug(`[ResourcePreloader] Starting critical resource preload (${this.criticalResources.length} resources)`);

    for (const resource of this.criticalResources) {
      await this.preloadResource(resource);
    }

    logger.debug('[ResourcePreloader] Critical resources loaded successfully');
  }

  /**
   * Preload optional resources (non-blocking)
   */
  public async preloadOptional(): Promise<void> {
    logger.debug(`[ResourcePreloader] Starting optional resource preload (${this.optionalResources.length} resources)`);

    // Load optional resources in parallel (non-blocking)
    const promises = this.optionalResources.map((resource) =>
      this.preloadResource(resource).catch((error) => {
        console.warn(`[ResourcePreloader] Optional resource failed (non-critical): ${resource.name}`, error);
      })
    );

    await Promise.allSettled(promises);

    logger.debug('[ResourcePreloader] Optional resources preload complete');
  }

  /**
   * Get current progress
   */
  public getProgress(): PreloadProgress {
    const totalResources = this.criticalResources.length + this.optionalResources.length;
    const criticalTotal = this.criticalResources.length;
    const optionalTotal = this.optionalResources.length;

    const criticalLoaded = Math.min(this.loadedCount, criticalTotal);
    const optionalLoaded = Math.max(0, this.loadedCount - criticalTotal);

    return {
      overall: totalResources > 0 ? Math.round((this.loadedCount / totalResources) * 100) : 0,
      critical: criticalTotal > 0 ? Math.round((criticalLoaded / criticalTotal) * 100) : 100,
      optional: optionalTotal > 0 ? Math.round((optionalLoaded / optionalTotal) * 100) : 100,
      loaded: this.loadedCount,
      total: totalResources,
      currentResource: this.currentResource,
      failed: [...this.failedResources],
    };
  }

  /**
   * Get critical progress only
   */
  public getCriticalProgress(): number {
    const total = this.criticalResources.length;
    const loaded = Math.min(this.loadedCount, total);
    return total > 0 ? Math.round((loaded / total) * 100) : 100;
  }

  /**
   * Subscribe to progress updates
   */
  public onProgress(callback: (progress: PreloadProgress) => void): () => void {
    this.progressCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Notify all progress subscribers
   */
  private notifyProgress(): void {
    const progress = this.getProgress();
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error('[ResourcePreloader] Progress callback error:', error);
      }
    });
  }

  /**
   * Reset preloader state
   */
  public reset(): void {
    this.loadedCount = 0;
    this.failedResources = [];
    this.currentResource = null;
    this.notifyProgress();
  }

  /**
   * Check if critical resources are loaded
   */
  public isCriticalLoaded(): boolean {
    return this.loadedCount >= this.criticalResources.length;
  }

  /**
   * Check if all resources are loaded
   */
  public isComplete(): boolean {
    const total = this.criticalResources.length + this.optionalResources.length;
    return this.loadedCount >= total;
  }

  /**
   * Get failed resources list
   */
  public getFailedResources(): string[] {
    return [...this.failedResources];
  }
}

/**
 * Create a global preloader instance
 */
let globalPreloader: ResourcePreloader | null = null;

/**
 * Get or create global preloader instance
 */
export function getPreloader(config?: Partial<PreloadConfig>): ResourcePreloader {
  if (!globalPreloader) {
    globalPreloader = new ResourcePreloader(config);
  }
  return globalPreloader;
}

/**
 * Reset global preloader
 */
export function resetPreloader(): void {
  globalPreloader = null;
}
