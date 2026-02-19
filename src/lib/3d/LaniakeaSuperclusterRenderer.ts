import * as THREE from 'three';
import type { Supercluster, SimpleGalaxy } from '../types/universeTypes';
import { LANIAKEA_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { LODManager } from './LODManager';
import { BaseUniverseRenderer } from './BaseUniverseRenderer';
import { createParticleSystemFromGalaxies, createAdvancedConnectionLines, updateConnectionLinesOpacity } from './utils/universeRendererUtils';

export class LaniakeaSuperclusterRenderer extends BaseUniverseRenderer {
  private superclusters: Supercluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private lodManager: LODManager;
  private velocityArrows: THREE.ArrowHelper[] = [];
  private connectionLines: THREE.LineSegments[] = [];

  constructor() {
    super('LaniakeaSupercluster', {
      fadeStart: UNIVERSE_SCALE_CONFIG.laniakeaFadeStart,
      showStart: UNIVERSE_SCALE_CONFIG.laniakeaShowStart,
      showFull: UNIVERSE_SCALE_CONFIG.laniakeaShowFull,
    });
    this.lodManager = new LODManager();
  }

  async loadData(superclusters: Supercluster[], galaxies: SimpleGalaxy[]): Promise<void> {
    console.log(`[Laniakea] Loading data: ${superclusters.length} superclusters, ${galaxies.length} galaxies`);
    
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
    
    console.log(`[Laniakea] Loaded: ${this.galaxies.length} galaxies, ${this.connectionLines.length} connection groups`);
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

  update(cameraDistance: number, deltaTime: number): void {
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
  }

  private updateLOD(cameraDistance: number): void {
    const lod = this.lodManager.getCurrentLOD(cameraDistance);
    if (this.particleSystem) {
      this.particleSystem.setParticleRatio(lod.particleRatio);
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
    super.dispose();
  }
}
