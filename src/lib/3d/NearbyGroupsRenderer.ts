import * as THREE from 'three';
import type { GalaxyGroup, SimpleGalaxy } from '../types/universeTypes';
import { NEARBY_GROUPS_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { BaseUniverseRenderer } from './BaseUniverseRenderer';
import { createParticleSystemFromGalaxies, createConnectionLinesForGroup, updateConnectionLinesOpacity } from './utils/universeRendererUtils';
import { UniverseLabelManager, type LabelData } from './UniverseLabelManager';
import { NEARBY_GROUPS_LABEL_CONFIG, getNamePriorityBonus } from '../config/universeLabelConfig';

export class NearbyGroupsRenderer extends BaseUniverseRenderer {
  private groups: GalaxyGroup[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private connectionLines: THREE.LineSegments[] = [];
  private labelManager: UniverseLabelManager | null = null;

  constructor() {
    super('NearbyGroups', {
      fadeStart: UNIVERSE_SCALE_CONFIG.nearbyGroupsFadeStart,
      showStart: UNIVERSE_SCALE_CONFIG.nearbyGroupsShowStart,
      showFull: UNIVERSE_SCALE_CONFIG.nearbyGroupsShowFull,
    });
  }

  initLabelManager(camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    this.labelManager = new UniverseLabelManager(this.group, camera, canvas, {
      minShowDistance: UNIVERSE_SCALE_CONFIG.nearbyGroupsShowStart,
      maxShowDistance: UNIVERSE_SCALE_CONFIG.virgoShowStart,
    });
    
    // 标签管理器创建后，立即创建标签
    this.createLabels();
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

    // 创建标签
    this.createLabels();
  }

  private createLabels(): void {
    if (!this.labelManager || !NEARBY_GROUPS_LABEL_CONFIG.enabled) return;

    // 为主要星系群创建标签
    const labelData: LabelData[] = this.groups
      .filter(group => group.memberCount > NEARBY_GROUPS_LABEL_CONFIG.minMembers)
      .map(group => {
        const basePriority = Math.min(10, Math.floor(group.richness * 5 + group.memberCount / 10));
        const namePriorityBonus = getNamePriorityBonus(group.name, 'group');
        const priority = Math.min(10, basePriority + namePriorityBonus);
        
        const distance = Math.sqrt(group.centerX ** 2 + group.centerY ** 2 + group.centerZ ** 2);
        
        return {
          name: group.name,
          position: new THREE.Vector3(
            group.centerX * MEGAPARSEC_TO_AU,
            group.centerY * MEGAPARSEC_TO_AU,
            group.centerZ * MEGAPARSEC_TO_AU
          ),
          priority,
          type: 'group' as const,
          metadata: {
            distance: `${distance.toFixed(1)} Mpc`,
            members: group.memberCount,
            size: `${group.radius.toFixed(1)} Mpc`,
          },
        };
      });

    this.labelManager.createLabels(labelData);
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

    // 更新标签
    if (this.labelManager && this.isVisible) {
      this.labelManager.update(cameraDistance);
    }
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
    
    if (this.labelManager) {
      this.labelManager.clearAll();
      this.labelManager = null;
    }
    
    super.dispose();
  }
}
