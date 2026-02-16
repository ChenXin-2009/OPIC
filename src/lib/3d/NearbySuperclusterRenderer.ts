import * as THREE from 'three';
import type { UniverseScaleRenderer, Supercluster, SimpleGalaxy } from '../types/universeTypes';
import { NEARBY_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { ProceduralGenerator } from './ProceduralGenerator';

export class NearbySuperclusterRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private superclusters: Supercluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private proceduralGenerator: ProceduralGenerator;
  private opacity: number = 0;
  private isVisible: boolean = false;
  private connectionLines: THREE.LineSegments[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'NearbySupercluster';
    this.proceduralGenerator = new ProceduralGenerator();
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
    this.superclusters = superclusters;
    this.galaxies = galaxies;
    
    await this.enhanceWithProceduralGalaxies();
    this.createParticleSystem();
    
    if (NEARBY_SUPERCLUSTER_CONFIG.showConnections) {
      this.createConnectionLines();
    }
  }

  private async enhanceWithProceduralGalaxies(): Promise<void> {
    const allGalaxies: SimpleGalaxy[] = [...this.galaxies];

    for (const supercluster of this.superclusters) {
      const needGenerate = supercluster.memberCount;

      if (needGenerate > 0) {
        const generated = await this.proceduralGenerator.generateGalaxies(
          {
            centerX: supercluster.centerX,
            centerY: supercluster.centerY,
            centerZ: supercluster.centerZ,
            radius: supercluster.radius,
            memberCount: needGenerate,
            richness: supercluster.richness,
          },
          []
        );
        allGalaxies.push(...generated);
      }
    }

    this.galaxies = allGalaxies;
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
      sizes[i] = NEARBY_SUPERCLUSTER_CONFIG.particleSize * MEGAPARSEC_TO_AU * (galaxy.brightness || 1);
    });

    this.particleSystem = new OptimizedParticleSystem(positions, colors, sizes);
    this.group.add(this.particleSystem.getPoints());
  }

  private createConnectionLines(): void {
    // Create lines connecting galaxies within each supercluster
    this.superclusters.forEach(supercluster => {
      // Generate sample galaxies for this supercluster to connect
      const sampleGalaxies = this.galaxies.filter(g => {
        const dx = g.x - supercluster.centerX;
        const dy = g.y - supercluster.centerY;
        const dz = g.z - supercluster.centerZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return dist < supercluster.radius;
      });

      if (sampleGalaxies.length < 2) return;

      const positions: number[] = [];
      
      // Connect each galaxy to a few nearby galaxies
      sampleGalaxies.forEach((galaxy, i) => {
        const maxConnections = Math.min(2, sampleGalaxies.length - 1);
        let connections = 0;
        
        for (let j = i + 1; j < sampleGalaxies.length && connections < maxConnections; j++) {
          const other = sampleGalaxies[j];
          const dx = (galaxy.x - other.x) * MEGAPARSEC_TO_AU;
          const dy = (galaxy.y - other.y) * MEGAPARSEC_TO_AU;
          const dz = (galaxy.z - other.z) * MEGAPARSEC_TO_AU;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Only connect if within supercluster radius
          if (distance < supercluster.radius * MEGAPARSEC_TO_AU) {
            positions.push(
              galaxy.x * MEGAPARSEC_TO_AU,
              galaxy.y * MEGAPARSEC_TO_AU,
              galaxy.z * MEGAPARSEC_TO_AU,
              other.x * MEGAPARSEC_TO_AU,
              other.y * MEGAPARSEC_TO_AU,
              other.z * MEGAPARSEC_TO_AU
            );
            connections++;
          }
        }
      });

      if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
          color: 0xaa8866,
          transparent: true,
          opacity: 0,
          linewidth: 1,
        });

        const lines = new THREE.LineSegments(geometry, material);
        this.connectionLines.push(lines);
        this.group.add(lines);
      }
    });
  }

  update(cameraDistance: number, deltaTime: number): void {
    this.opacity = this.calculateOpacity(cameraDistance);
    this.isVisible = this.opacity > 0.01;

    if (this.particleSystem) {
      this.particleSystem.updateOpacity(this.opacity);
    }

    // Update connection lines opacity
    this.connectionLines.forEach(line => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = this.opacity * (NEARBY_SUPERCLUSTER_CONFIG.connectionOpacity || 0.1);
    });

    this.group.visible = this.isVisible;
  }

  private calculateOpacity(cameraDistance: number): number {
    const { nearbySuperclusterFadeStart, nearbySuperclusterShowStart, nearbySuperclusterShowFull } = UNIVERSE_SCALE_CONFIG;

    if (cameraDistance < nearbySuperclusterFadeStart) {
      return 0;
    } else if (cameraDistance < nearbySuperclusterShowStart) {
      return (cameraDistance - nearbySuperclusterFadeStart) / (nearbySuperclusterShowStart - nearbySuperclusterFadeStart);
    } else if (cameraDistance < nearbySuperclusterShowFull) {
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
    this.connectionLines.forEach(line => {
      this.group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.connectionLines = [];
    this.proceduralGenerator.dispose();
  }
}
