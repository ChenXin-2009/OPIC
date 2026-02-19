import * as THREE from 'three';
import type { GalaxyCluster, SimpleGalaxy } from '../types/universeTypes';
import { VIRGO_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { BaseUniverseRenderer } from './BaseUniverseRenderer';
import { createParticleSystemFromGalaxies, createConnectionLinesForGroup, updateConnectionLinesOpacity } from './utils/universeRendererUtils';

export class VirgoSuperclusterRenderer extends BaseUniverseRenderer {
  private clusters: GalaxyCluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private connectionLines: THREE.LineSegments[] = [];

  constructor() {
    super('VirgoSupercluster', {
      fadeStart: UNIVERSE_SCALE_CONFIG.virgoFadeStart,
      showStart: UNIVERSE_SCALE_CONFIG.virgoShowStart,
      showFull: UNIVERSE_SCALE_CONFIG.virgoShowFull,
    });
  }

  async loadData(clusters: GalaxyCluster[], galaxies: SimpleGalaxy[]): Promise<void> {
    this.clusters = clusters;
    this.galaxies = galaxies;
    
    this.particleSystem = createParticleSystemFromGalaxies(
      this.galaxies,
      VIRGO_SUPERCLUSTER_CONFIG.particleSize
    );
    this.group.add(this.particleSystem.getPoints());
    
    if (VIRGO_SUPERCLUSTER_CONFIG.showConnections) {
      this.createConnectionLines();
    }
  }

  private createConnectionLines(): void {
    this.clusters.forEach(cluster => {
      const line = createConnectionLinesForGroup(
        cluster.galaxies,
        cluster.radius * 1.3,
        4,
        0x6699ff
      );
      
      if (line) {
        this.connectionLines.push(line);
        this.group.add(line);
      }
    });
  }

  update(cameraDistance: number, deltaTime: number): void {
    super.update(cameraDistance, deltaTime);

    if (this.particleSystem) {
      this.particleSystem.updateOpacity(this.opacity);
    }

    updateConnectionLinesOpacity(
      this.connectionLines,
      this.opacity,
      VIRGO_SUPERCLUSTER_CONFIG.connectionOpacity || 0.2
    );
  }

  setBrightness(brightness: number): void {
    if (this.particleSystem) {
      this.particleSystem.updateBrightness(brightness);
    }
  }

  dispose(): void {
    if (this.particleSystem) {
      this.group.remove(this.particleSystem.getPoints());
      this.particleSystem.dispose();
      this.particleSystem = null;
    }
    this.connectionLines.forEach(line => {
      this.group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.connectionLines = [];
    super.dispose();
  }
}
