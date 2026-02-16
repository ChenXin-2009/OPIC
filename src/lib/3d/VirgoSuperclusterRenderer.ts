import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { UniverseScaleRenderer, GalaxyCluster, SimpleGalaxy } from '../types/universeTypes';
import { VIRGO_SUPERCLUSTER_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { ProceduralGenerator } from './ProceduralGenerator';
import { getChineseName } from '../astronomy/universeNames';

export class VirgoSuperclusterRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private clusters: GalaxyCluster[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private proceduralGenerator: ProceduralGenerator;
  private opacity: number = 0;
  private isVisible: boolean = false;
  private connectionLines: THREE.LineSegments[] = [];
  private labels: Map<string, CSS2DObject> = new Map();
  private clusterCenters: Map<string, THREE.Object3D> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'VirgoSupercluster';
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

  async loadData(clusters: GalaxyCluster[], galaxies: SimpleGalaxy[]): Promise<void> {
    this.clusters = clusters;
    this.galaxies = galaxies;
    
    await this.enhanceWithProceduralGalaxies();
    this.createParticleSystem();
    
    if (VIRGO_SUPERCLUSTER_CONFIG.showConnections) {
      this.createConnectionLines();
    }

    // Create labels for galaxy clusters
    this.createClusterLabels();
  }

  private createClusterLabels(): void {
    // Clear existing labels
    this.labels.forEach(label => {
      if (label.parent) {
        label.parent.remove(label);
      }
    });
    this.labels.clear();
    this.clusterCenters.clear();

    // Create a label for each galaxy cluster
    this.clusters.forEach(cluster => {
      // Create an invisible object at the cluster center to attach the label
      const centerObject = new THREE.Object3D();
      centerObject.position.set(
        cluster.centerX * MEGAPARSEC_TO_AU,
        cluster.centerY * MEGAPARSEC_TO_AU,
        cluster.centerZ * MEGAPARSEC_TO_AU
      );
      this.group.add(centerObject);
      this.clusterCenters.set(cluster.name, centerObject);

      // Create label with Chinese name
      const labelDiv = document.createElement('div');
      labelDiv.className = 'galaxy-cluster-label';
      const chineseName = getChineseName(cluster.name, 'virgo-supercluster');
      labelDiv.textContent = chineseName;
      labelDiv.style.color = '#ff8844'; // Orange color for Virgo supercluster
      labelDiv.style.fontSize = '14px';
      labelDiv.style.fontWeight = '500';
      labelDiv.style.fontFamily = '"Novecento Wide", sans-serif';
      labelDiv.style.pointerEvents = 'none';
      labelDiv.style.userSelect = 'none';
      labelDiv.style.textShadow = '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)';
      labelDiv.style.whiteSpace = 'nowrap';
      labelDiv.style.opacity = '1';
      labelDiv.style.transition = 'opacity 0.3s, font-size 0.3s';

      const label = new CSS2DObject(labelDiv);
      label.position.set(0, 0, 0);
      
      labelDiv.style.position = 'absolute';
      labelDiv.style.left = '10px';
      labelDiv.style.top = '-5px';
      labelDiv.style.transform = 'translate(0, 0)';
      
      centerObject.add(label);
      this.labels.set(cluster.name, label);
    });
  }

  private async enhanceWithProceduralGalaxies(): Promise<void> {
    const enhancementFactor = VIRGO_SUPERCLUSTER_CONFIG.enhancementFactor;
    const allGalaxies: SimpleGalaxy[] = [...this.galaxies];

    for (const cluster of this.clusters) {
      const targetCount = Math.floor(cluster.memberCount * enhancementFactor);
      const needGenerate = targetCount - cluster.galaxies.length;

      if (needGenerate > 0) {
        const generated = await this.proceduralGenerator.generateGalaxies(
          {
            centerX: cluster.centerX,
            centerY: cluster.centerY,
            centerZ: cluster.centerZ,
            radius: cluster.radius,
            memberCount: needGenerate,
            richness: cluster.richness,
          },
          cluster.galaxies
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
      sizes[i] = VIRGO_SUPERCLUSTER_CONFIG.particleSize * MEGAPARSEC_TO_AU * (galaxy.brightness || 1);
    });

    this.particleSystem = new OptimizedParticleSystem(positions, colors, sizes);
    this.group.add(this.particleSystem.getPoints());
  }

  private createConnectionLines(): void {
    this.clusters.forEach(cluster => {
      if (cluster.galaxies.length < 2) return;

      const positions: number[] = [];
      
      cluster.galaxies.forEach((galaxy, i) => {
        const maxConnections = Math.min(2, cluster.galaxies.length - 1);
        let connections = 0;
        
        for (let j = i + 1; j < cluster.galaxies.length && connections < maxConnections; j++) {
          const other = cluster.galaxies[j];
          const dx = (galaxy.x - other.x) * MEGAPARSEC_TO_AU;
          const dy = (galaxy.y - other.y) * MEGAPARSEC_TO_AU;
          const dz = (galaxy.z - other.z) * MEGAPARSEC_TO_AU;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < cluster.radius * MEGAPARSEC_TO_AU) {
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

    // Update label font size based on camera distance
    this.updateLabelFontSize(cameraDistance);

    this.group.visible = this.isVisible;
  }

  private updateLabelFontSize(cameraDistance: number): void {
    // Scale font size more aggressively for better visibility at large scales
    const minDistance = 5000000 * 63241.077; // 5M light years in AU
    const maxDistance = 50000000 * 63241.077; // 50M light years in AU
    
    let fontSize = 14;
    if (cameraDistance > minDistance) {
      const ratio = Math.min((cameraDistance - minDistance) / (maxDistance - minDistance), 1);
      // Scale from 14px to 28px
      fontSize = 14 + ratio * 14;
    }

    this.labels.forEach(label => {
      const labelDiv = label.element as HTMLDivElement;
      labelDiv.style.fontSize = `${fontSize}px`;
      // Don't set opacity here - it's handled by overlap detection
    });
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

  /**
   * Get all labels for overlap detection
   * Returns array of label info with screen positions
   */
  getLabelsForOverlapDetection(camera: THREE.Camera, containerWidth: number, containerHeight: number): Array<{
    label: CSS2DObject;
    screenX: number;
    screenY: number;
    text: string;
    priority: number;
    centerObject: THREE.Object3D;
  }> {
    const labelInfos: Array<{
      label: CSS2DObject;
      screenX: number;
      screenY: number;
      text: string;
      priority: number;
      centerObject: THREE.Object3D;
    }> = [];

    if (!this.isVisible || this.opacity < 0.01) {
      return labelInfos;
    }

    this.clusterCenters.forEach((centerObject, clusterName) => {
      const label = this.labels.get(clusterName);
      
      if (!label) return;

      // Get world position and project to screen
      const worldPos = new THREE.Vector3();
      centerObject.getWorldPosition(worldPos);
      worldPos.project(camera);

      const screenX = (worldPos.x * 0.5 + 0.5) * containerWidth;
      const screenY = (worldPos.y * -0.5 + 0.5) * containerHeight;

      labelInfos.push({
        label,
        screenX,
        screenY,
        text: clusterName,
        priority: 4, // Virgo Supercluster has lowest priority
        centerObject,
      });
    });

    return labelInfos;
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
    
    // Dispose labels and center objects
    this.labels.forEach(label => {
      if (label.parent) {
        label.parent.remove(label);
      }
      if (label.element && label.element.parentNode) {
        label.element.parentNode.removeChild(label.element);
      }
    });
    this.labels.clear();
    
    this.clusterCenters.forEach(center => {
      this.group.remove(center);
    });
    this.clusterCenters.clear();
    
    this.proceduralGenerator.dispose();
  }
}
