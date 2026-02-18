/**
 * Loading System Types
 * 
 * Type definitions for the resource loading monitoring system.
 * This module defines interfaces and types for resource monitors,
 * loading progress tracking, and custom events.
 * 
 * Requirements: 9.1, 9.2, 9.4
 */

/**
 * Resource Monitor Interface
 * 
 * All resource monitors must implement this interface to be compatible
 * with the ResourceMonitorRegistry.
 * 
 * Requirements: 9.1, 9.2
 */
export interface ResourceMonitor {
  /**
   * Monitor name (used for debugging and identification)
   */
  readonly name: string;
  
  /**
   * Monitor weight (used for calculating overall progress)
   * Higher weight = greater impact on overall progress
   * 
   * Recommended weights:
   * - Browser resources: 1 (fast, baseline)
   * - Ephemeris data: 2 (critical, blocks scene)
   * - Scene initialization: 2 (critical, blocks rendering)
   * - Textures: 3 (large files, visible impact)
   * - Universe data: 2 (large files, optional)
   */
  readonly weight: number;
  
  /**
   * Check if the resource is ready
   * 
   * @returns true if the resource has finished loading
   */
  isReady(): boolean;
  
  /**
   * Get the loading progress
   * 
   * @returns Progress value between 0 and 1 (0 = not started, 1 = complete)
   */
  getProgress(): number;
  
  /**
   * Register a callback to be called when the resource is ready
   * 
   * @param callback - Function to call when ready
   * @returns Unsubscribe function to remove the callback
   */
  onReady(callback: () => void): () => void;
  
  /**
   * Clean up resources and event listeners
   * Should be called when the monitor is no longer needed
   */
  dispose(): void;
}

/**
 * Loading Progress Data
 * 
 * Represents the overall loading progress and individual stage progress.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
export interface LoadingProgress {
  /**
   * Overall progress (0-1)
   * Calculated as weighted average of all monitor progress
   */
  overall: number;
  
  /**
   * Progress for each loading stage
   */
  stages: {
    browser: number;
    scene: number;
    ephemeris: number;
    textures: number;
    universe: number;
  };
  
  /**
   * Human-readable description of current loading stage
   */
  currentStage: string;
  
  /**
   * Whether all resources have finished loading
   */
  isComplete: boolean;
}

/**
 * Monitor State
 * 
 * Represents the current state of a resource monitor.
 */
export interface MonitorState {
  /**
   * Monitor name
   */
  name: string;
  
  /**
   * Whether the monitor reports ready
   */
  ready: boolean;
  
  /**
   * Current progress (0-1)
   */
  progress: number;
  
  /**
   * Monitor weight
   */
  weight: number;
}

/**
 * Extended Resource Loader Result
 * 
 * Extended version of the original ResourceLoaderResult with progress tracking.
 * Maintains backward compatibility with the original interface.
 * 
 * Requirements: 5.1, 5.2, 5.3, 7.1
 */
export interface ExtendedResourceLoaderResult {
  /**
   * Whether all resources are ready
   */
  isReady: boolean;
  
  /**
   * Whether resources were loaded from cache
   * Used to optimize fade-out timing
   */
  wasCached: boolean;
  
  /**
   * Overall loading progress (0-1)
   */
  progress: number;
  
  /**
   * Human-readable description of current loading stage
   */
  currentStage: string;
}

/**
 * Original Resource Loader Result (for backward compatibility)
 */
export interface ResourceLoaderResult {
  isReady: boolean;
  wasCached: boolean;
}

// ==================== Custom Event Types ====================

/**
 * Scene Initialization Event Detail
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export interface SceneInitEventDetail {
  /**
   * Initialization stage
   * - start: Scene initialization started
   * - webgl: WebGL context created
   * - shaders: Shaders compiled
   * - complete: Scene initialization complete
   */
  stage: 'start' | 'webgl' | 'shaders' | 'complete';
}

/**
 * Scene Initialization Event
 */
export interface SceneInitEvent extends CustomEvent<SceneInitEventDetail> {
  type: 'scene:init:start' | 'scene:init:webgl' | 'scene:init:shaders' | 'scene:init:complete';
}

/**
 * Texture Load Event Detail
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
export interface TextureLoadEventDetail {
  /**
   * Total number of textures to load
   */
  total: number;
  
  /**
   * Number of textures loaded so far
   */
  loaded: number;
  
  /**
   * ID of the texture that was just loaded (for progress events)
   */
  textureId?: string;
}

/**
 * Texture Load Event
 */
export interface TextureLoadEvent extends CustomEvent<TextureLoadEventDetail> {
  type: 'texture:load:start' | 'texture:load:progress' | 'texture:load:complete';
}

/**
 * Ephemeris Load Event Detail
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
export interface EphemerisLoadEventDetail {
  /**
   * Loading stage
   * - start: Ephemeris initialization started
   * - manifest: Manifest file loaded
   * - data: Ephemeris data loaded
   * - bodies: Celestial bodies calculated and ready
   */
  stage: 'start' | 'manifest' | 'data' | 'bodies';
}

/**
 * Ephemeris Load Event
 */
export interface EphemerisLoadEvent extends CustomEvent<EphemerisLoadEventDetail> {
  type: 'ephemeris:init:start' | 'ephemeris:manifest:loaded' | 'ephemeris:data:loaded' | 'ephemeris:bodies:ready';
}

/**
 * Universe Data Load Event Detail
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export interface UniverseLoadEventDetail {
  /**
   * Universe scale that was loaded
   */
  scale?: 'LocalGroup' | 'NearbyGroups' | 'VirgoSupercluster' | 'LaniakeaSupercluster';
  
  /**
   * Total number of scales to load
   */
  total?: number;
  
  /**
   * Number of scales loaded so far
   */
  loaded?: number;
}

/**
 * Universe Data Load Event
 */
export interface UniverseLoadEvent extends CustomEvent<UniverseLoadEventDetail> {
  type: 'universe:scale:loaded' | 'universe:load:complete';
}

// ==================== Helper Types ====================

/**
 * Monitor callback function type
 */
export type MonitorCallback = () => void;

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Unsubscribe function type
 */
export type UnsubscribeFunction = () => void;

/**
 * Monitor name type (for type safety)
 */
export type MonitorName = 'browser' | 'scene' | 'ephemeris' | 'textures' | 'universe';

/**
 * Loading stage description type
 */
export type LoadingStage = 
  | '初始化...'
  | '加载浏览器资源...'
  | '初始化 3D 场景...'
  | '加载星历数据...'
  | '加载纹理...'
  | '加载宇宙数据...'
  | '完成';
