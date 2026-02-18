import * as THREE from 'three';
import type { UniverseScaleRenderer, Supercluster, SimpleGalaxy } from '../types/universeTypes';
import { LANIAKEA_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { LODManager } from './LODManager';

export class LaniakeaSuperclusterRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private superclusters: Supercluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private lodManager: LODManager;
  private opacity: number = 0;
  private isVisible: boolean = false;
  private velocityArrows: THREE.ArrowHelper[] = [];
  private connectionLines: THREE.LineSegments[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LaniakeaSupercluster';
    this.lodManager = new LODManager();
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getOpacity(): number {
    return this.opacity;
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  async loadData(superclusters: Supercluster[], galaxies: SimpleGalaxy[]): Promise<void> {
    console.log(`[Laniakea] Loading data: ${superclusters.length} superclusters, ${galaxies.length} galaxies`);
    console.log(`[Laniakea] First 3 superclusters:`, superclusters.slice(0, 3).map(sc => ({
      name: sc.name,
      center: [sc.centerX.toFixed(1), sc.centerY.toFixed(1), sc.centerZ.toFixed(1)],
      members: sc.memberCount
    })));
    
    this.superclusters = superclusters;
    this.galaxies = galaxies;
    
    // 不使用程序化生成，直接使用真实数据
    // await this.enhanceWithProceduralGalaxies();
    
    this.createParticleSystem();
    
    if (LANIAKEA_SUPERCLUSTER_CONFIG.showConnections) {
      this.createConnectionLines();
    }
    
    if (LANIAKEA_SUPERCLUSTER_CONFIG.showVelocityFlow) {
      this.createVelocityArrows();
    }
    
    console.log(`[Laniakea] Loaded: ${this.galaxies.length} galaxies, ${this.connectionLines.length} connection groups`);
  }

  private createParticleSystem(): void {
    const count = this.galaxies.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    this.galaxies.forEach((galaxy, i) => {
      // Convert positions from Mpc to AU
      positions[i * 3] = galaxy.x * MEGAPARSEC_TO_AU;
      positions[i * 3 + 1] = galaxy.y * MEGAPARSEC_TO_AU;
      positions[i * 3 + 2] = galaxy.z * MEGAPARSEC_TO_AU;

      const color = new THREE.Color(0xffffff);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Convert particle size from Mpc to AU
      sizes[i] = LANIAKEA_SUPERCLUSTER_CONFIG.particleSize * MEGAPARSEC_TO_AU * (galaxy.brightness || 1);
    });

    this.particleSystem = new OptimizedParticleSystem(positions, colors, sizes);
    this.group.add(this.particleSystem.getPoints());
  }

  private createConnectionLines(): void {
    // Create lines connecting superclusters to show large-scale structure
    // Use a more sophisticated approach based on proximity and density
    
    // First, connect galaxies within each supercluster
    this.superclusters.forEach(supercluster => {
      const sampleGalaxies = this.galaxies.filter(g => {
        const dx = g.x - supercluster.centerX;
        const dy = g.y - supercluster.centerY;
        const dz = g.z - supercluster.centerZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return dist < supercluster.radius;
      });

      if (sampleGalaxies.length < 2) return;

      const positions: number[] = [];
      
      // Build a spatial index for efficient nearest neighbor search
      const sortedByX = [...sampleGalaxies].sort((a, b) => a.x - b.x);
      
      // Connect each galaxy to its nearest neighbors
      sampleGalaxies.forEach((galaxy, i) => {
        // Find nearest neighbors within linking length
        const linkingLength = supercluster.radius * 0.4; // 增加到40%的星团半径
        const neighbors: Array<{galaxy: typeof galaxy, distance: number}> = [];
        
        for (const other of sortedByX) {
          if (other === galaxy) continue;
          
          const dx = galaxy.x - other.x;
          if (Math.abs(dx) > linkingLength) continue; // Skip if too far in x
          
          const dy = galaxy.y - other.y;
          const dz = galaxy.z - other.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < linkingLength) {
            neighbors.push({ galaxy: other, distance });
          }
        }
        
        // Sort by distance and connect to closest 4-5 neighbors
        neighbors.sort((a, b) => a.distance - b.distance);
        const maxConnections = Math.min(5, neighbors.length); // 从3增加到5
        
        for (let k = 0; k < maxConnections; k++) {
          const other = neighbors[k].galaxy;
          positions.push(
            galaxy.x * MEGAPARSEC_TO_AU,
            galaxy.y * MEGAPARSEC_TO_AU,
            galaxy.z * MEGAPARSEC_TO_AU,
            other.x * MEGAPARSEC_TO_AU,
            other.y * MEGAPARSEC_TO_AU,
            other.z * MEGAPARSEC_TO_AU
          );
        }
      });

      if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
          color: 0xff8844, // Orange color for Laniakea
          transparent: true,
          opacity: 0,
          linewidth: 1,
          depthWrite: true,  // 启用深度写入
          depthTest: true,   // 启用深度测试
        });

        const lines = new THREE.LineSegments(geometry, material);
        this.connectionLines.push(lines);
        this.group.add(lines);
      }
    });
    
    // Second, connect supercluster centers to show filamentary structure
    if (this.superclusters.length > 1) {
      const positions: number[] = [];
      
      // Connect each supercluster to its nearest neighbors
      this.superclusters.forEach((sc1, i) => {
        const neighbors: Array<{sc: typeof sc1, distance: number}> = [];
        
        for (let j = 0; j < this.superclusters.length; j++) {
          if (i === j) continue;
          const sc2 = this.superclusters[j];
          
          const dx = sc1.centerX - sc2.centerX;
          const dy = sc1.centerY - sc2.centerY;
          const dz = sc1.centerZ - sc2.centerZ;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Connect if within filamentary structure distance (< 120 Mpc)
          if (distance < 120) {
            neighbors.push({ sc: sc2, distance });
          }
        }
        
        // Sort by distance and connect to closest 3-4 neighbors
        neighbors.sort((a, b) => a.distance - b.distance);
        const maxConnections = Math.min(4, neighbors.length); // 从2增加到4
        
        for (let k = 0; k < maxConnections; k++) {
          const sc2 = neighbors[k].sc;
          positions.push(
            sc1.centerX * MEGAPARSEC_TO_AU,
            sc1.centerY * MEGAPARSEC_TO_AU,
            sc1.centerZ * MEGAPARSEC_TO_AU,
            sc2.centerX * MEGAPARSEC_TO_AU,
            sc2.centerY * MEGAPARSEC_TO_AU,
            sc2.centerZ * MEGAPARSEC_TO_AU
          );
        }
      });
      
      if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
          color: 0xffaa44, // Brighter orange for inter-cluster connections
          transparent: true,
          opacity: 0,
          linewidth: 2,
          depthWrite: true,  // 启用深度写入
          depthTest: true,   // 启用深度测试
        });

        const lines = new THREE.LineSegments(geometry, material);
        this.connectionLines.push(lines);
        this.group.add(lines);
      }
    }
  }

  private createVelocityArrows(): void {
    this.superclusters.forEach(supercluster => {
      if (supercluster.velocityX !== undefined && 
          supercluster.velocityY !== undefined && 
          supercluster.velocityZ !== undefined) {
        // Convert positions from Mpc to AU
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
    this.opacity = this.calculateOpacity(cameraDistance);
    this.isVisible = this.opacity > 0.01;

    if (this.particleSystem) {
      this.particleSystem.updateOpacity(this.opacity);
      
      if (LANIAKEA_SUPERCLUSTER_CONFIG.lodEnabled) {
        this.updateLOD(cameraDistance);
      }
    }

    this.velocityArrows.forEach(arrow => {
      arrow.visible = this.isVisible && LANIAKEA_SUPERCLUSTER_CONFIG.showVelocityFlow;
    });

    // Update connection lines opacity
    this.connectionLines.forEach(line => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = this.opacity * (LANIAKEA_SUPERCLUSTER_CONFIG.connectionOpacity || 0.15);
    });

    this.group.visible = this.isVisible;
  }

  private updateLOD(cameraDistance: number): void {
    const lod = this.lodManager.getCurrentLOD(cameraDistance);
    if (this.particleSystem) {
      this.particleSystem.setParticleRatio(lod.particleRatio);
    }
  }

  private calculateOpacity(cameraDistance: number): number {
    const { laniakeaFadeStart, laniakeaShowStart, laniakeaShowFull } = UNIVERSE_SCALE_CONFIG;

    if (cameraDistance < laniakeaFadeStart) {
      return 0;
    } else if (cameraDistance < laniakeaShowStart) {
      return (cameraDistance - laniakeaFadeStart) / (laniakeaShowStart - laniakeaFadeStart);
    } else if (cameraDistance < laniakeaShowFull) {
      return 1;
    } else {
      return 1;
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
  }
}
