import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { UniverseScaleRenderer, LocalGroupGalaxy, GalaxyType } from '../types/universeTypes';
import { LOCAL_GROUP_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { getChineseName } from '../astronomy/universeNames';

export class LocalGroupRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private galaxies: LocalGroupGalaxy[] = [];
  private opacity: number = 0;
  private isVisible: boolean = false;
  private config: typeof LOCAL_GROUP_CONFIG;
  private galaxyMeshes: THREE.Mesh[] = [];
  private labels: Map<string, CSS2DObject> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LocalGroup';
    this.config = LOCAL_GROUP_CONFIG;
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

  async loadData(galaxies: LocalGroupGalaxy[]): Promise<void> {
    this.galaxies = galaxies;
    this.createGalaxies();
  }

  private createGalaxies(): void {
    // Clear existing meshes
    this.galaxyMeshes.forEach(mesh => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.galaxyMeshes = [];

    // Clear existing labels
    this.labels.forEach(label => {
      if (label.parent) {
        label.parent.remove(label);
      }
    });
    this.labels.clear();

    // Create galaxy meshes (exclude Milky Way as it's already rendered)
    this.galaxies.forEach(galaxy => {
      // Skip Milky Way - it's already rendered by GalaxyRenderer
      if (galaxy.name === 'Milky Way' || galaxy.name === '银河系') {
        return;
      }
      
      const mesh = this.createGalaxyMesh(galaxy);
      this.galaxyMeshes.push(mesh);
      this.group.add(mesh);

      // Create label for this galaxy
      this.createLabel(galaxy, mesh);
    });
  }

  private createLabel(galaxy: LocalGroupGalaxy, mesh: THREE.Mesh): void {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'galaxy-label';
    // 使用中文名称
    const chineseName = getChineseName(galaxy.name, 'local-group');
    labelDiv.textContent = chineseName;
    labelDiv.style.color = '#ffffff';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.fontWeight = '400';
    labelDiv.style.fontFamily = '"Novecento Wide", sans-serif';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.userSelect = 'none';
    labelDiv.style.textShadow = '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)';
    labelDiv.style.whiteSpace = 'nowrap';
    labelDiv.style.opacity = '1'; // 始终显示
    labelDiv.style.transition = 'opacity 0.3s, font-size 0.3s';

    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 0, 0);
    
    // Position label relative to galaxy
    labelDiv.style.position = 'absolute';
    labelDiv.style.left = '10px';
    labelDiv.style.top = '-5px';
    labelDiv.style.transform = 'translate(0, 0)';
    
    mesh.add(label);
    this.labels.set(galaxy.name, label);
  }

  private createGalaxyMesh(galaxy: LocalGroupGalaxy): THREE.Mesh {
    // Convert radius from Mpc to AU
    const radiusInAU = galaxy.radius * MEGAPARSEC_TO_AU;

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    // Create geometry based on galaxy type
    switch (galaxy.type) {
      case 0: // Spiral - use circular disc
        geometry = new THREE.CircleGeometry(radiusInAU, 32);
        material = new THREE.MeshBasicMaterial({
          color: galaxy.color,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        });
        break;
      case 1: // Elliptical - use sphere
        geometry = new THREE.SphereGeometry(radiusInAU, 16, 16);
        material = new THREE.MeshBasicMaterial({
          color: galaxy.color,
          transparent: true,
          opacity: 0,
        });
        break;
      case 2: // Irregular - use slightly irregular disc
        geometry = new THREE.CircleGeometry(radiusInAU * 0.8, 24);
        material = new THREE.MeshBasicMaterial({
          color: galaxy.color,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        });
        break;
      case 3: // Dwarf - use small sphere
      default:
        geometry = new THREE.SphereGeometry(radiusInAU, 8, 8);
        material = new THREE.MeshBasicMaterial({
          color: galaxy.color,
          transparent: true,
          opacity: 0,
        });
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    
    // Convert position from Mpc to AU
    mesh.position.set(
      galaxy.x * MEGAPARSEC_TO_AU,
      galaxy.y * MEGAPARSEC_TO_AU,
      galaxy.z * MEGAPARSEC_TO_AU
    );
    
    // Random rotation for spiral galaxies to make them look more natural
    if (galaxy.type === 0 || galaxy.type === 2) {
      mesh.rotation.x = Math.random() * Math.PI * 2;
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = Math.random() * Math.PI * 2;
    }
    
    mesh.userData = { galaxy };

    return mesh;
  }

  update(cameraDistance: number, deltaTime: number): void {
    const newOpacity = this.calculateOpacity(cameraDistance);
    const opacityChanged = Math.abs(newOpacity - this.opacity) > 0.01;
    this.opacity = newOpacity;
    this.isVisible = this.opacity > 0.01;

    // 只在透明度变化时更新材质，避免每帧都更新
    if (opacityChanged) {
      this.galaxyMeshes.forEach(mesh => {
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = this.opacity * (mesh.userData.galaxy as LocalGroupGalaxy).brightness;
      });
    }

    // 降低标签更新频率：只在相机距离变化较大时更新
    // 使用静态变量跟踪上次更新的距离
    if (!this.lastUpdateDistance || Math.abs(cameraDistance - this.lastUpdateDistance) > cameraDistance * 0.1) {
      this.updateLabels(cameraDistance);
      this.lastUpdateDistance = cameraDistance;
      // 相机距离变化时，标签位置也会变化，需要使缓存失效
      this.labelCacheValid = false;
    }

    // Update visibility
    this.group.visible = this.isVisible;
  }

  private lastUpdateDistance: number = 0;
  private labelInfoCache: Array<{
    label: CSS2DObject;
    screenX: number;
    screenY: number;
    text: string;
    priority: number;
    mesh: THREE.Mesh;
  }> = [];
  private labelCacheValid: boolean = false;

  private updateLabels(cameraDistance: number): void {
    // Calculate font size based on camera distance to maintain readability
    // Scale more aggressively to ensure labels remain visible at all scales
    const minDistance = 200000 * 63241.077; // 200k light years in AU
    const maxDistance = 10000000 * 63241.077; // 10M light years in AU
    
    let fontSize = 12;
    if (cameraDistance > minDistance) {
      const ratio = Math.min((cameraDistance - minDistance) / (maxDistance - minDistance), 1);
      // Scale from 12px to 24px for better visibility at large scales
      fontSize = 12 + ratio * 12;
    }

    this.labels.forEach(label => {
      const labelDiv = label.element as HTMLDivElement;
      labelDiv.style.fontSize = `${fontSize}px`;
      // Don't set opacity here - it's handled by overlap detection
    });
  }

  private calculateOpacity(cameraDistance: number): number {
    const { localGroupFadeStart, localGroupShowStart, localGroupShowFull } = UNIVERSE_SCALE_CONFIG;

    if (cameraDistance < localGroupFadeStart) {
      return 0;
    } else if (cameraDistance < localGroupShowStart) {
      // Fade in
      return (cameraDistance - localGroupFadeStart) / (localGroupShowStart - localGroupFadeStart);
    } else if (cameraDistance < localGroupShowFull) {
      // Fully visible
      return 1;
    } else {
      // Stay visible
      return 1;
    }
  }

  setBrightness(brightness: number): void {
    this.galaxyMeshes.forEach(mesh => {
      const material = mesh.material as THREE.MeshBasicMaterial;
      const galaxy = mesh.userData.galaxy as LocalGroupGalaxy;
      material.opacity = this.opacity * galaxy.brightness * brightness;
    });
  }

  getObjectData(): LocalGroupGalaxy[] {
    return this.galaxies;
  }

  /**
   * Get all labels for overlap detection
   * Returns array of label info with screen positions
   * 优化：使用缓存减少每帧的计算量
   */
  getLabelsForOverlapDetection(camera: THREE.Camera, containerWidth: number, containerHeight: number): Array<{
    label: CSS2DObject;
    screenX: number;
    screenY: number;
    text: string;
    priority: number;
    mesh: THREE.Mesh;
  }> {
    if (!this.isVisible || this.opacity < 0.01) {
      this.labelCacheValid = false;
      return [];
    }

    // 使用缓存的结果，避免每帧都重新计算
    // 注意：这个方法会被Canvas组件的节流机制控制，所以这里的缓存主要是防止同一帧内多次调用
    if (this.labelCacheValid) {
      return this.labelInfoCache;
    }

    this.labelInfoCache = [];

    this.galaxyMeshes.forEach(mesh => {
      const galaxy = mesh.userData.galaxy as LocalGroupGalaxy;
      const label = this.labels.get(galaxy.name);
      
      if (!label) return;

      // Get world position and project to screen
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      worldPos.project(camera);

      const screenX = (worldPos.x * 0.5 + 0.5) * containerWidth;
      const screenY = (worldPos.y * -0.5 + 0.5) * containerHeight;

      this.labelInfoCache.push({
        label,
        screenX,
        screenY,
        text: galaxy.name,
        priority: 2, // Local Group has medium priority
        mesh,
      });
    });

    this.labelCacheValid = true;
    return this.labelInfoCache;
  }

  dispose(): void {
    this.galaxyMeshes.forEach(mesh => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.galaxyMeshes = [];
    
    // Dispose labels
    this.labels.forEach(label => {
      if (label.parent) {
        label.parent.remove(label);
      }
      if (label.element && label.element.parentNode) {
        label.element.parentNode.removeChild(label.element);
      }
    });
    this.labels.clear();
  }
}
