/**
 * Universe Scale Types and Interfaces
 * 
 * This file contains all type definitions for the observable universe visualization feature.
 * All data is based on real astronomical observations, not simulated data.
 */

import * as THREE from 'three';

/**
 * Universe scale levels from solar system to observable universe
 */
export enum UniverseScale {
  SolarSystem = 'solar-system',
  NearbyStars = 'nearby-stars',
  Galaxy = 'galaxy',
  LocalGroup = 'local-group',
  NearbyGroups = 'nearby-groups',
  VirgoSupercluster = 'virgo-supercluster',
  LaniakeaSupercluster = 'laniakea-supercluster',
  NearbySupercluster = 'nearby-supercluster',
  ObservableUniverse = 'observable-universe',
}

/**
 * Galaxy types based on morphological classification
 */
export enum GalaxyType {
  Spiral = 0,
  Elliptical = 1,
  Irregular = 2,
  Dwarf = 3,
}

/**
 * Interface for universe scale renderers
 * All renderers must implement this interface for consistent behavior
 */
export interface UniverseScaleRenderer {
  /**
   * Get the THREE.Group containing all rendered objects
   */
  getGroup(): THREE.Group;

  /**
   * Update the renderer based on camera distance and time
   * @param cameraDistance - Distance from camera to origin in AU
   * @param deltaTime - Time elapsed since last frame in seconds
   */
  update(cameraDistance: number, deltaTime: number): void;

  /**
   * Get current opacity value (0-1)
   */
  getOpacity(): number;

  /**
   * Get visibility state
   */
  getIsVisible(): boolean;

  /**
   * Clean up resources
   */
  dispose(): void;

  /**
   * Set brightness multiplier (optional)
   * @param brightness - Brightness value (0-1)
   */
  setBrightness?(brightness: number): void;

  /**
   * Get object data for interaction (optional)
   * @returns Array of objects with position and metadata
   */
  getObjectData?(): any[];
}

/**
 * Local Group galaxy data from McConnachie (2012) catalog
 */
export interface LocalGroupGalaxy {
  name: string;
  x: number;  // Supergalactic X coordinate in Mpc
  y: number;  // Supergalactic Y coordinate in Mpc
  z: number;  // Supergalactic Z coordinate in Mpc
  type: GalaxyType;
  brightness: number;  // Apparent magnitude or luminosity
  color: string;  // Hex color code
  radius: number;  // Visual radius in kpc
}

/**
 * Simple galaxy representation for particle systems
 */
export interface SimpleGalaxy {
  x: number;  // Supergalactic X coordinate in Mpc
  y: number;  // Supergalactic Y coordinate in Mpc
  z: number;  // Supergalactic Z coordinate in Mpc
  brightness: number;  // Relative brightness (0-1)
}

/**
 * Galaxy group data from Karachentsev et al. (2013) catalog
 */
export interface GalaxyGroup {
  name: string;
  centerX: number;  // Group center X in Mpc
  centerY: number;  // Group center Y in Mpc
  centerZ: number;  // Group center Z in Mpc
  radius: number;  // Group radius in Mpc
  memberCount: number;  // Number of member galaxies
  richness: number;  // Group richness parameter
  galaxies: SimpleGalaxy[];  // Member galaxies
}

/**
 * Galaxy cluster data from 2MRS survey
 */
export interface GalaxyCluster {
  name: string;
  centerX: number;  // Cluster center X in Mpc
  centerY: number;  // Cluster center Y in Mpc
  centerZ: number;  // Cluster center Z in Mpc
  radius: number;  // Cluster radius in Mpc
  memberCount: number;  // Number of member galaxies
  richness: number;  // Cluster richness parameter
  galaxies: SimpleGalaxy[];  // Member galaxies
}

/**
 * Supercluster data from Cosmicflows-3 dataset
 */
export interface Supercluster {
  name: string;
  centerX: number;  // Supercluster center X in Mpc
  centerY: number;  // Supercluster center Y in Mpc
  centerZ: number;  // Supercluster center Z in Mpc
  radius: number;  // Supercluster radius in Mpc
  memberCount: number;  // Number of member galaxies/groups
  richness: number;  // Supercluster richness parameter
  velocityX?: number;  // Peculiar velocity X component in km/s
  velocityY?: number;  // Peculiar velocity Y component in km/s
  velocityZ?: number;  // Peculiar velocity Z component in km/s
}

/**
 * Cosmic structure types (walls, voids, filaments)
 */
export interface CosmicStructure {
  type: 'wall' | 'void' | 'filament';
  name: string;
  centerX: number;  // Structure center X in Mpc
  centerY: number;  // Structure center Y in Mpc
  centerZ: number;  // Structure center Z in Mpc
  sizeX: number;  // Structure size X in Mpc
  sizeY: number;  // Structure size Y in Mpc
  sizeZ: number;  // Structure size Z in Mpc
  redshift: number;  // Average redshift
}

/**
 * Filament generation parameters
 */
export interface FilamentParams {
  anchorPoints: THREE.Vector3[];  // Points to connect
  thickness: number;  // Filament thickness in Mpc
  density: number;  // Particle density along filament
}

/**
 * Level of Detail (LOD) configuration
 */
export interface LODLevel {
  distance: number;  // Camera distance threshold in AU
  particleRatio: number;  // Ratio of particles to render (0-1)
  textureSize: number;  // Texture resolution in pixels
}
