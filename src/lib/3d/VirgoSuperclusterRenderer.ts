/**
 * 室女座超星系团渲染器 (Virgo Supercluster Renderer)
 *
 * 渲染室女座超星系团（包含本星系群在内）的星系团和成员星系。
 * 在宇宙尺度缩放中，当相机距离大于本星系群时显示此层。
 *
 * 渲染技术：
 * - 使用 OptimizedParticleSystem 进行 GPU 加速粒子渲染
 * - 星系团间连线显示大尺度结构
 * - 支持 LOD（Level of Detail）远距离简化
 */

import * as THREE from 'three';
import type { GalaxyCluster, SimpleGalaxy } from '../types/universeTypes';
import { MEGAPARSEC_TO_AU, UNIVERSE_SCALE_CONFIG, VIRGO_SUPERCLUSTER_CONFIG } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { BaseUniverseRenderer } from './BaseUniverseRenderer';
import { createConnectionLinesForGroup, createParticleSystemFromGalaxies, updateConnectionLinesOpacity } from './utils/universeRendererUtils';
import { type LabelData, UniverseLabelManager } from './UniverseLabelManager';
import { getNamePriorityBonus, VIRGO_SUPERCLUSTER_LABEL_CONFIG } from '../config/universeLabelConfig';
import { getChineseName } from '../astronomy/universeNames';

/**
 * 室女座超星系团渲染器 — 使用粒子系统和连线渲染星系团大尺度结构。
 */
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

  override update(cameraDistance: number, deltaTime: number): void {
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

  override dispose(): void {
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
