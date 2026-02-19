import * as THREE from 'three';
import type { GalaxyCluster, SimpleGalaxy } from '../types/universeTypes';
import { VIRGO_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { BaseUniverseRenderer } from './BaseUniverseRenderer';
import { createParticleSystemFromGalaxies, createConnectionLinesForGroup, updateConnectionLinesOpacity } from './utils/universeRendererUtils';
import { UniverseLabelManager, type LabelData } from './UniverseLabelManager';
import { VIRGO_SUPERCLUSTER_LABEL_CONFIG, getNamePriorityBonus } from '../config/universeLabelConfig';
import { getChineseName } from '../astronomy/universeNames';

export class VirgoSuperclusterRenderer extends BaseUniverseRenderer {
  private clusters: GalaxyCluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private connectionLines: THREE.LineSegments[] = [];
  private labelManager: UniverseLabelManager | null = null;

  constructor() {
    super('VirgoSupercluster', {
      fadeStart: UNIVERSE_SCALE_CONFIG.virgoFadeStart,
      showStart: UNIVERSE_SCALE_CONFIG.virgoShowStart,
      showFull: UNIVERSE_SCALE_CONFIG.virgoShowFull,
    });
  }

  initLabelManager(camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    this.labelManager = new UniverseLabelManager(this.group, camera, canvas, {
      minShowDistance: UNIVERSE_SCALE_CONFIG.nearbyGroupsShowFull,
      maxShowDistance: UNIVERSE_SCALE_CONFIG.laniakeaShowFull,
    });
    
    // 标签管理器创建后，立即创建标签
    this.createLabels();
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

    this.createLabels();
  }

  private createLabels(): void {
    if (!this.labelManager || !VIRGO_SUPERCLUSTER_LABEL_CONFIG.enabled) return;

    const labelData: LabelData[] = this.clusters
      .filter(cluster => cluster.memberCount > VIRGO_SUPERCLUSTER_LABEL_CONFIG.minMembers)
      .map(cluster => {
        const basePriority = Math.min(10, Math.floor(cluster.richness * 3 + cluster.memberCount / 20));
        const namePriorityBonus = getNamePriorityBonus(cluster.name, 'cluster');
        const priority = Math.min(10, basePriority + namePriorityBonus);
        
        const distance = Math.sqrt(cluster.centerX ** 2 + cluster.centerY ** 2 + cluster.centerZ ** 2);
        
        // 获取中文名称
        const nameZh = getChineseName(cluster.name, 'virgo-supercluster');
        
        return {
          name: cluster.name,
          nameZh: nameZh !== cluster.name ? nameZh : undefined,
          position: new THREE.Vector3(
            cluster.centerX * MEGAPARSEC_TO_AU,
            cluster.centerY * MEGAPARSEC_TO_AU,
            cluster.centerZ * MEGAPARSEC_TO_AU
          ),
          priority,
          type: 'cluster' as const,
          metadata: {
            distance: `${distance.toFixed(0)} Mpc`,
            members: cluster.memberCount,
            size: `${cluster.radius.toFixed(1)} Mpc`,
          },
        };
      });

    this.labelManager.createLabels(labelData);
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

    if (this.labelManager && this.isVisible) {
      this.labelManager.update(cameraDistance);
    }
  }

  setBrightness(brightness: number): void {
    if (this.particleSystem) {
      this.particleSystem.updateBrightness(brightness);
    }
  }

  getObjectData(): { clusters: GalaxyCluster[]; galaxies: SimpleGalaxy[] } {
    return {
      clusters: this.clusters,
      galaxies: this.galaxies,
    };
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
