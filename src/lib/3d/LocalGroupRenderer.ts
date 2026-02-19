import * as THREE from 'three';
import type { UniverseScaleRenderer, LocalGroupGalaxy, GalaxyType } from '../types/universeTypes';
import { LOCAL_GROUP_CONFIG, UNIVERSE_SCALE_CONFIG, MEGAPARSEC_TO_AU } from '../config/universeConfig';
import { UniverseLabelManager, type LabelData } from './UniverseLabelManager';
import { LOCAL_GROUP_LABEL_CONFIG, getNamePriorityBonus } from '../config/universeLabelConfig';
import { getChineseName } from '../astronomy/universeNames';

export class LocalGroupRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private galaxies: LocalGroupGalaxy[] = [];
  private opacity: number = 0;
  private isVisible: boolean = false;
  private config: typeof LOCAL_GROUP_CONFIG;
  private galaxyMeshes: THREE.Mesh[] = [];
  private labelManager: UniverseLabelManager | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LocalGroup';
    this.config = LOCAL_GROUP_CONFIG;
  }

  /**
   * 初始化标签管理器
   */
  initLabelManager(camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    this.labelManager = new UniverseLabelManager(this.group, camera, canvas, {
      minShowDistance: UNIVERSE_SCALE_CONFIG.localGroupShowStart,
      maxShowDistance: UNIVERSE_SCALE_CONFIG.nearbyGroupsShowFull,
    });
    
    // 标签管理器创建后，立即创建标签
    this.createLabels();
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
    this.createLabels();
  }

  private createLabels(): void {
    if (!this.labelManager || !LOCAL_GROUP_LABEL_CONFIG.enabled) return;

    // 为主要星系创建标签
    const labelData: LabelData[] = this.galaxies
      .filter(galaxy => {
        // 排除银河系（已由其他渲染器处理）
        if (galaxy.name === 'Milky Way' || galaxy.name === '银河系') return false;
        
        // 只为重要星系创建标签（亮度阈值）
        return galaxy.brightness > LOCAL_GROUP_LABEL_CONFIG.minBrightness;
      })
      .map(galaxy => {
        // 计算基础优先级（基于亮度和大小）
        const basePriority = Math.min(10, Math.floor(galaxy.brightness * 10 + galaxy.radius / 10));
        
        // 添加名称优先级加成
        const namePriorityBonus = getNamePriorityBonus(galaxy.name, 'galaxy');
        const priority = Math.min(10, basePriority + namePriorityBonus);
        
        // 计算距离（Mpc）
        const distance = Math.sqrt(galaxy.x ** 2 + galaxy.y ** 2 + galaxy.z ** 2);
        
        // 获取中文名称
        const nameZh = getChineseName(galaxy.name, 'local-group');
        
        return {
          name: galaxy.name,
          nameZh: nameZh !== galaxy.name ? nameZh : undefined, // 只在有中文翻译时添加
          position: new THREE.Vector3(
            galaxy.x * MEGAPARSEC_TO_AU,
            galaxy.y * MEGAPARSEC_TO_AU,
            galaxy.z * MEGAPARSEC_TO_AU
          ),
          priority,
          type: 'galaxy' as const,
          metadata: {
            distance: `${distance.toFixed(2)} Mpc`,
            size: `${galaxy.radius.toFixed(1)} kpc`,
          },
        };
      });

    this.labelManager.createLabels(labelData);
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

    // Create galaxy meshes (exclude Milky Way as it's already rendered)
    this.galaxies.forEach(galaxy => {
      // Skip Milky Way - it's already rendered by GalaxyRenderer
      if (galaxy.name === 'Milky Way' || galaxy.name === '银河系') {
        return;
      }
      
      const mesh = this.createGalaxyMesh(galaxy);
      this.galaxyMeshes.push(mesh);
      this.group.add(mesh);
    });
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

    // Update visibility
    this.group.visible = this.isVisible;

    // 更新标签
    if (this.labelManager && this.isVisible) {
      this.labelManager.update(cameraDistance);
    }
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
    
    // 清理标签
    if (this.labelManager) {
      this.labelManager.clearAll();
      this.labelManager = null;
    }
  }
}
