import * as THREE from 'three';
import type { GalaxyGroup, SimpleGalaxy } from '../types/universeTypes';
import { NEARBY_GROUPS_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { BaseUniverseRenderer } from './BaseUniverseRenderer';
import { createParticleSystemFromGalaxies, createConnectionLinesForGroup, updateConnectionLinesOpacity } from './utils/universeRendererUtils';

export class NearbyGroupsRenderer extends BaseUniverseRenderer {
  private groups: GalaxyGroup[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private connectionLines: THREE.LineSegments[] = [];

  constructor() {
    super('NearbyGroups', {
      fadeStart: UNIVERSE_SCALE_CONFIG.nearbyGroupsFadeStart,
      showStart: UNIVERSE_SCALE_CONFIG.nearbyGroupsShowStart,
      showFull: UNIVERSE_SCALE_CONFIG.nearbyGroupsShowFull,
    });
  }

  async loadData(groups: GalaxyGroup[], galaxies: SimpleGalaxy[]): Promise<void> {
    this.groups = groups;
    this.galaxies = galaxies;
    
    // 创建粒子系统
    this.particleSystem = createParticleSystemFromGalaxies(
      this.galaxies,
      NEARBY_GROUPS_CONFIG.particleSize
    );
    this.group.add(this.particleSystem.getPoints());
    
    // 创建连接线
    if (NEARBY_GROUPS_CONFIG.showConnections) {
      this.createConnectionLines();
    }
  }

  private createConnectionLines(): void {
    this.groups.forEach(group => {
      const line = createConnectionLinesForGroup(
        group.galaxies,
        group.radius * 1.3,
        5,
        0x4488ff
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
      NEARBY_GROUPS_CONFIG.connectionOpacity || 0.3
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
