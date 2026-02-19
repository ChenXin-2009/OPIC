import * as THREE from 'three';
import type { Supercluster, SimpleGalaxy } from '../types/universeTypes';
import { LANIAKEA_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { LODManager } from './LODManager';
import { BaseUniverseRenderer } from './BaseUniverseRenderer';
import { createParticleSystemFromGalaxies, createAdvancedConnectionLines, updateConnectionLinesOpacity } from './utils/universeRendererUtils';
import { UniverseLabelManager, type LabelData } from './UniverseLabelManager';
import { LANIAKEA_SUPERCLUSTER_LABEL_CONFIG, getNamePriorityBonus } from '../config/universeLabelConfig';

export class LaniakeaSuperclusterRenderer extends BaseUniverseRenderer {
  private superclusters: Supercluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private lodManager: LODManager;
  private velocityArrows: THREE.ArrowHelper[] = [];
  private connectionLines: THREE.LineSegments[] = [];
  private labelManager: UniverseLabelManager | null = null;

  constructor() {
    super('LaniakeaSupercluster', {
      fadeStart: UNIVERSE_SCALE_CONFIG.laniakeaFadeStart,
      showStart: UNIVERSE_SCALE_CONFIG.laniakeaShowStart,
      showFull: UNIVERSE_SCALE_CONFIG.laniakeaShowFull,
    });
    this.lodManager = new LODManager();
  }

  initLabelManager(camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    this.labelManager = new UniverseLabelManager(this.group, camera, canvas, {
      minShowDistance: UNIVERSE_SCALE_CONFIG.laniakeaShowStart,
      maxShowDistance: UNIVERSE_SCALE_CONFIG.laniakeaShowStart * 100,
    });
    
    // 标签管理器创建后，立即创建标签
    this.createLabels();
  }

  async loadData(superclusters: Supercluster[], galaxies: SimpleGalaxy[]): Promise<void> {
    this.superclusters = superclusters;
    this.galaxies = galaxies;
    
    this.particleSystem = createParticleSystemFromGalaxies(
      this.galaxies,
      LANIAKEA_SUPERCLUSTER_CONFIG.particleSize
    );
    this.group.add(this.particleSystem.getPoints());
    
    if (LANIAKEA_SUPERCLUSTER_CONFIG.showConnections) {
      this.createConnectionLines();
    }
    
    if (LANIAKEA_SUPERCLUSTER_CONFIG.showVelocityFlow) {
      this.createVelocityArrows();
    }

    this.createLabels();
  }

  private createLabels(): void {
    if (!this.labelManager || !LANIAKEA_SUPERCLUSTER_LABEL_CONFIG.enabled) return;

    const labelData: LabelData[] = this.superclusters.map(supercluster => {
      const basePriority = Math.min(10, Math.floor(supercluster.richness * 2 + supercluster.memberCount / 50));
      const namePriorityBonus = getNamePriorityBonus(supercluster.name, 'supercluster');
      const priority = Math.min(10, basePriority + namePriorityBonus);
      
      const distance = Math.sqrt(
        supercluster.centerX ** 2 + 
        supercluster.centerY ** 2 + 
        supercluster.centerZ ** 2
      );
      
      return {
        name: supercluster.name,
        position: new THREE.Vector3(
          supercluster.centerX * MEGAPARSEC_TO_AU,
          supercluster.centerY * MEGAPARSEC_TO_AU,
          supercluster.centerZ * MEGAPARSEC_TO_AU
        ),
        priority,
        type: 'supercluster' as const,
        metadata: {
          distance: `${distance.toFixed(0)} Mpc`,
          members: supercluster.memberCount,
          size: `${supercluster.radius.toFixed(0)} Mpc`,
        },
      };
    });

    this.labelManager.createLabels(labelData);
  }

  private createConnectionLines(): void {
    // 为每个超星系团内部创建连接线
    this.superclusters.forEach(supercluster => {
      const sampleGalaxies = this.galaxies.filter(g => {
        const dx = g.x - supercluster.centerX;
        const dy = g.y - supercluster.centerY;
        const dz = g.z - supercluster.centerZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return dist < supercluster.radius;
      });

      const line = createAdvancedConnectionLines(
        sampleGalaxies,
        supercluster.radius * 0.4,
        5,
        0xff8844
      );
      
      if (line) {
        this.connectionLines.push(line);
        this.group.add(line);
      }
    });
    
    // 连接超星系团中心以显示纤维状结构
    if (this.superclusters.length > 1) {
      const centerGalaxies: SimpleGalaxy[] = this.superclusters.map(sc => ({
        x: sc.centerX,
        y: sc.centerY,
        z: sc.centerZ,
        brightness: 1,
      }));
      
      const line = createAdvancedConnectionLines(
        centerGalaxies,
        120,
        4,
        0xffaa44
      );
      
      if (line) {
        const material = line.material as THREE.LineBasicMaterial;
        material.linewidth = 2;
        this.connectionLines.push(line);
        this.group.add(line);
      }
    }
  }

  private createVelocityArrows(): void {
    this.superclusters.forEach(supercluster => {
      if (supercluster.velocityX !== undefined && 
          supercluster.velocityY !== undefined && 
          supercluster.velocityZ !== undefined) {
        const origin = new THREE.Vector3(
          supercluster.centerX * MEGAPARSEC_TO_AU,
          supercluster.centerY * MEGAPARSEC_TO_AU,
          supercluster.centerZ * MEGAPARSEC_TO_AU
        );
        const direction = new THREE.Vector3(
          supercluster.velocityX,
          supercluster.velocityY,
          supercluster.velocityZ
        ).normalize();
        const length = Math.sqrt(
          supercluster.velocityX ** 2 +
          supercluster.velocityY ** 2 +
          supercluster.velocityZ ** 2
        ) * LANIAKEA_SUPERCLUSTER_CONFIG.velocityArrowScale * MEGAPARSEC_TO_AU;

        const arrow = new THREE.ArrowHelper(
          direction,
          origin,
          length,
          0x00ff00,
          length * 0.2,
          length * 0.1
        );
        this.velocityArrows.push(arrow);
        this.group.add(arrow);
      }
    });
  }

  override update(cameraDistance: number, deltaTime: number): void {
    super.update(cameraDistance, deltaTime);

    if (this.particleSystem) {
      this.particleSystem.updateOpacity(this.opacity);
      
      if (LANIAKEA_SUPERCLUSTER_CONFIG.lodEnabled) {
        this.updateLOD(cameraDistance);
      }
    }

    this.velocityArrows.forEach(arrow => {
      arrow.visible = this.isVisible && LANIAKEA_SUPERCLUSTER_CONFIG.showVelocityFlow;
    });

    updateConnectionLinesOpacity(
      this.connectionLines,
      this.opacity,
      LANIAKEA_SUPERCLUSTER_CONFIG.connectionOpacity || 0.15
    );

    if (this.labelManager && this.isVisible) {
      this.labelManager.update(cameraDistance);
    }
  }

  private updateLOD(cameraDistance: number): void {
    const lod = this.lodManager.getCurrentLOD(cameraDistance);
    if (this.particleSystem) {
      this.particleSystem.setParticleRatio(lod.particleRatio);
    }
  }

  override setBrightness(brightness: number): void {
    if (this.particleSystem) {
      this.particleSystem.updateBrightness(brightness);
    }
  }

  override dispose(): void {
    if (this.particleSystem) {
      this.group.remove(this.particleSystem.getPoints());
      this.particleSystem.dispose();
      this.particleSystem = null;
    }
    this.velocityArrows.forEach(arrow => {
      this.group.remove(arrow);
      arrow.dispose();
    });
    this.velocityArrows = [];
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
