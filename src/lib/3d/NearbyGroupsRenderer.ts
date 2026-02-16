import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { UniverseScaleRenderer, GalaxyGroup, SimpleGalaxy } from '../types/universeTypes';
import { NEARBY_GROUPS_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { OptimizedParticleSystem } from './OptimizedParticleSystem';
import { ProceduralGenerator } from './ProceduralGenerator';
import { getChineseName } from '../astronomy/universeNames';

export class NearbyGroupsRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private groups: GalaxyGroup[] = [];
  private galaxies: SimpleGalaxy[] = [];
  private particleSystem: OptimizedParticleSystem | null = null;
  private proceduralGenerator: ProceduralGenerator;
  private opacity: number = 0;
  private isVisible: boolean = false;
  private connectionLines: THREE.LineSegments[] = [];
  private labels: Map<string, CSS2DObject> = new Map();
  private groupCenters: Map<string, THREE.Object3D> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'NearbyGroups';
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

  async loadData(groups: GalaxyGroup[], galaxies: SimpleGalaxy[]): Promise<void> {
    this.groups = groups;
    this.galaxies = galaxies;
    
    // Enhance with procedural galaxies
    await this.enhanceWithProceduralGalaxies();
    
    // Create particle system
    this.createParticleSystem();
    
    // Create connection lines between galaxies in each group
    if (NEARBY_GROUPS_CONFIG.showConnections) {
      this.createConnectionLines();
    }

    // Create labels for galaxy groups
    this.createGroupLabels();
  }

  private createGroupLabels(): void {
    // Clear existing labels
    this.labels.forEach(label => {
      if (label.parent) {
        label.parent.remove(label);
      }
    });
    this.labels.clear();
    this.groupCenters.clear();

    // Create a label for each galaxy group
    this.groups.forEach(galaxyGroup => {
      // Create an invisible object at the group center to attach the label
      const centerObject = new THREE.Object3D();
      centerObject.position.set(
        galaxyGroup.centerX * MEGAPARSEC_TO_AU,
        galaxyGroup.centerY * MEGAPARSEC_TO_AU,
        galaxyGroup.centerZ * MEGAPARSEC_TO_AU
      );
      this.group.add(centerObject);
      this.groupCenters.set(galaxyGroup.name, centerObject);

      // Create label with Chinese name
      const labelDiv = document.createElement('div');
      labelDiv.className = 'galaxy-group-label';
      const chineseName = getChineseName(galaxyGroup.name, 'nearby-groups');
      labelDiv.textContent = chineseName;
      labelDiv.style.color = '#4488ff'; // Blue color for nearby groups
      labelDiv.style.fontSize = '13px';
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
      this.labels.set(galaxyGroup.name, label);
    });
  }

  private async enhanceWithProceduralGalaxies(): Promise<void> {
    const enhancementFactor = NEARBY_GROUPS_CONFIG.enhancementFactor;
    const allGalaxies: SimpleGalaxy[] = [...this.galaxies];

    for (const group of this.groups) {
      const targetCount = Math.floor(group.memberCount * enhancementFactor);
      const needGenerate = targetCount - group.galaxies.length;

      if (needGenerate > 0) {
        const generated = await this.proceduralGenerator.generateGalaxies(
          {
            centerX: group.centerX,
            centerY: group.centerY,
            centerZ: group.centerZ,
            radius: group.radius,
            memberCount: needGenerate,
            richness: group.richness,
          },
          group.galaxies
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
      sizes[i] = NEARBY_GROUPS_CONFIG.particleSize * MEGAPARSEC_TO_AU * (galaxy.brightness || 1);
    });

    this.particleSystem = new OptimizedParticleSystem(positions, colors, sizes);
    this.group.add(this.particleSystem.getPoints());
  }

  private createConnectionLines(): void {
    // Create lines connecting galaxies within each group
    this.groups.forEach(group => {
      if (group.galaxies.length < 2) return;

      const positions: number[] = [];
      
      // Connect each galaxy to a few nearby galaxies
      group.galaxies.forEach((galaxy, i) => {
        const maxConnections = Math.min(3, group.galaxies.length - 1);
        let connections = 0;
        
        for (let j = i + 1; j < group.galaxies.length && connections < maxConnections; j++) {
          const other = group.galaxies[j];
          const dx = (galaxy.x - other.x) * MEGAPARSEC_TO_AU;
          const dy = (galaxy.y - other.y) * MEGAPARSEC_TO_AU;
          const dz = (galaxy.z - other.z) * MEGAPARSEC_TO_AU;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Only connect if within group radius
          if (distance < group.radius * MEGAPARSEC_TO_AU) {
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
          color: 0x4488ff,
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
      material.opacity = this.opacity * (NEARBY_GROUPS_CONFIG.connectionOpacity || 0.3);
    });

    // Update label font size based on camera distance
    this.updateLabelFontSize(cameraDistance);

    this.group.visible = this.isVisible;
  }

  private updateLabelFontSize(cameraDistance: number): void {
    // Scale font size more aggressively for better visibility at large scales
    const minDistance = 1000000 * 63241.077; // 1M light years in AU
    const maxDistance = 20000000 * 63241.077; // 20M light years in AU
    
    let fontSize = 13;
    if (cameraDistance > minDistance) {
      const ratio = Math.min((cameraDistance - minDistance) / (maxDistance - minDistance), 1);
      // Scale from 13px to 26px
      fontSize = 13 + ratio * 13;
    }

    this.labels.forEach(label => {
      const labelDiv = label.element as HTMLDivElement;
      labelDiv.style.fontSize = `${fontSize}px`;
      // Don't set opacity here - it's handled by overlap detection
    });
  }

  private calculateOpacity(cameraDistance: number): number {
    const { nearbyGroupsFadeStart, nearbyGroupsShowStart, nearbyGroupsShowFull } = UNIVERSE_SCALE_CONFIG;

    if (cameraDistance < nearbyGroupsFadeStart) {
      return 0;
    } else if (cameraDistance < nearbyGroupsShowStart) {
      return (cameraDistance - nearbyGroupsFadeStart) / (nearbyGroupsShowStart - nearbyGroupsFadeStart);
    } else if (cameraDistance < nearbyGroupsShowFull) {
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

    this.groupCenters.forEach((centerObject, groupName) => {
      const label = this.labels.get(groupName);
      
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
        text: groupName,
        priority: 3, // Nearby Groups has lower priority than Local Group
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
    
    this.groupCenters.forEach(center => {
      this.group.remove(center);
    });
    this.groupCenters.clear();
    
    this.proceduralGenerator.dispose();
  }
}
