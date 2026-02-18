import * as THREE from 'three';
import type { UniverseScaleRenderer, GalaxyCluster, SimpleGalaxy } from '../types/universeTypes';
import { VIRGO_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';

export class VirgoSuperclusterRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private clusters: GalaxyCluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private opacity: number = 0;
  private isVisible: boolean = false;
  private connectionLines: THREE.LineSegments[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'VirgoSupercluster';
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

  async loadData(clusters: GalaxyCluster[], galaxies: SimpleGalaxy[]): Promise<void> {
    this.clusters = clusters;
    this.galaxies = galaxies;
    
    // 只使用真实观测数据，不进行程序化增强
    this.createParticleSystem();
    
    if (VIRGO_SUPERCLUSTER_CONFIG.showConnections) {
      this.createConnectionLines();
    }
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
      sizes[i] = VIRGO_SUPERCLUSTER_CONFIG.particleSize * MEGAPARSEC_TO_AU * (galaxy.brightness || 1);
    });

    this.particleSystem = new OptimizedParticleSystem(positions, colors, sizes);
    this.group.add(this.particleSystem.getPoints());
  }

  private createConnectionLines(): void {
    this.clusters.forEach(cluster => {
      if (cluster.galaxies.length < 2) return;

      const positions: number[] = [];
      const maxDistance = cluster.radius * MEGAPARSEC_TO_AU * 1.3; // 增加30%的连接距离
      
      cluster.galaxies.forEach((galaxy, i) => {
        const maxConnections = Math.min(4, cluster.galaxies.length - 1); // 从2增加到4
        let connections = 0;
        
        for (let j = i + 1; j < cluster.galaxies.length && connections < maxConnections; j++) {
          const other = cluster.galaxies[j];
          const dx = (galaxy.x - other.x) * MEGAPARSEC_TO_AU;
          const dy = (galaxy.y - other.y) * MEGAPARSEC_TO_AU;
          const dz = (galaxy.z - other.z) * MEGAPARSEC_TO_AU;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < maxDistance) {
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
          color: 0x6699ff,
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

    this.connectionLines.forEach(line => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = this.opacity * (VIRGO_SUPERCLUSTER_CONFIG.connectionOpacity || 0.2);
    });

    this.group.visible = this.isVisible;
  }

  private calculateOpacity(cameraDistance: number): number {
    const { virgoFadeStart, virgoShowStart, virgoShowFull } = UNIVERSE_SCALE_CONFIG;

    if (cameraDistance < virgoFadeStart) {
      return 0;
    } else if (cameraDistance < virgoShowStart) {
      return (cameraDistance - virgoFadeStart) / (virgoShowStart - virgoFadeStart);
    } else if (cameraDistance < virgoShowFull) {
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
  }
}
