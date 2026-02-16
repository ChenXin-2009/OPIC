import * as THREE from 'three';
import type { UniverseScaleRenderer, CosmicStructure, FilamentParams } from '../types/universeTypes';
import { OBSERVABLE_UNIVERSE_CONFIG, UNIVERSE_SCALE_CONFIG } from '../config/universeConfig';

export class ObservableUniverseRenderer implements UniverseScaleRenderer {
  private group: THREE.Group;
  private filaments: THREE.Line[] = [];
  private voids: THREE.Mesh[] = [];
  private walls: THREE.Mesh[] = [];
  private redshiftMarkers: THREE.Sprite[] = [];
  private boundary: THREE.Mesh | null = null;
  private opacity: number = 0;
  private isVisible: boolean = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ObservableUniverse';
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

  async loadData(structures: CosmicStructure[], anchorPoints: THREE.Vector3[]): Promise<void> {
    if (OBSERVABLE_UNIVERSE_CONFIG.filamentEnabled) {
      this.generateFilaments(anchorPoints);
    }

    if (OBSERVABLE_UNIVERSE_CONFIG.voidEnabled) {
      this.identifyAndCreateVoids(anchorPoints);
    }

    if (OBSERVABLE_UNIVERSE_CONFIG.showRedshiftMarkers) {
      this.createRedshiftMarkers();
    }

    if (OBSERVABLE_UNIVERSE_CONFIG.showObservableBoundary) {
      this.createObservableBoundary();
    }
  }

  private generateFilaments(anchorPoints: THREE.Vector3[]): void {
    const material = new THREE.LineBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0,
      linewidth: 1,
    });

    for (let i = 0; i < anchorPoints.length; i++) {
      for (let j = i + 1; j < anchorPoints.length; j++) {
        if (this.shouldConnectPoints(anchorPoints[i], anchorPoints[j])) {
          const curve = new THREE.CatmullRomCurve3([
            anchorPoints[i],
            anchorPoints[i].clone().lerp(anchorPoints[j], 0.5),
            anchorPoints[j],
          ]);

          const points = curve.getPoints(50);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, material.clone());
          
          this.filaments.push(line);
          this.group.add(line);
        }
      }
    }
  }

  private shouldConnectPoints(p1: THREE.Vector3, p2: THREE.Vector3): boolean {
    const distance = p1.distanceTo(p2);
    const maxDistance = OBSERVABLE_UNIVERSE_CONFIG.filamentThickness * 10;
    return distance < maxDistance && Math.random() > 0.7;
  }

  private identifyAndCreateVoids(galaxyPositions: THREE.Vector3[]): void {
    // Simple void identification based on low-density regions
    const voidMaterial = new THREE.MeshBasicMaterial({
      color: 0x000033,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });

    // Create a few representative voids
    const voidCount = 5;
    for (let i = 0; i < voidCount; i++) {
      const angle = (i / voidCount) * Math.PI * 2;
      const radius = OBSERVABLE_UNIVERSE_CONFIG.voidMinSize;
      const distance = OBSERVABLE_UNIVERSE_CONFIG.boundaryRadius * 0.5;

      const geometry = new THREE.SphereGeometry(radius, 16, 16);
      const mesh = new THREE.Mesh(geometry, voidMaterial.clone());
      
      mesh.position.set(
        Math.cos(angle) * distance,
        Math.sin(angle * 0.5) * distance * 0.3,
        Math.sin(angle) * distance
      );

      this.voids.push(mesh);
      this.group.add(mesh);
    }
  }

  private createRedshiftMarkers(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;

    OBSERVABLE_UNIVERSE_CONFIG.redshiftLevels.forEach((z, index) => {
      context.clearRect(0, 0, 128, 128);
      context.fillStyle = 'white';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText(`z=${z}`, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
      });

      const sprite = new THREE.Sprite(material);
      const distance = this.redshiftToDistance(z);
      sprite.position.set(distance, 0, 0);
      sprite.scale.set(distance * 0.1, distance * 0.1, 1);

      this.redshiftMarkers.push(sprite);
      this.group.add(sprite);
    });
  }

  private redshiftToDistance(z: number): number {
    // Simplified distance calculation
    const c = 299792.458; // km/s
    const H0 = 70; // km/s/Mpc
    return (c * z) / H0 * 1e6; // Convert to appropriate units
  }

  private createObservableBoundary(): void {
    // 可观测宇宙半径约 465 亿光年 = 465e8 * 63241.077 AU
    const LIGHT_YEAR_TO_AU = 63241.077;
    const observableUniverseRadius = 465e8 * LIGHT_YEAR_TO_AU;
    
    const geometry = new THREE.SphereGeometry(
      observableUniverseRadius,
      64,
      64
    );
    
    // 使用网格状材质
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,  // 蓝色网格
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      wireframe: true,
      depthWrite: false,
      depthTest: true,
    });

    this.boundary = new THREE.Mesh(geometry, material);
    this.boundary.name = 'ObservableUniverseBoundary';
    this.group.add(this.boundary);
    
    console.log(`Observable Universe boundary created: radius = ${observableUniverseRadius.toExponential(2)} AU`);
  }

  update(cameraDistance: number, deltaTime: number): void {
    this.opacity = this.calculateOpacity(cameraDistance);
    this.isVisible = this.opacity > 0.01;

    // Update filament opacity
    this.filaments.forEach(filament => {
      const material = filament.material as THREE.LineBasicMaterial;
      material.opacity = this.opacity * 0.3;
    });

    // Update void opacity
    this.voids.forEach(void_ => {
      const material = void_.material as THREE.MeshBasicMaterial;
      material.opacity = this.opacity * 0.2;
    });

    // Update redshift markers
    this.redshiftMarkers.forEach(marker => {
      const material = marker.material as THREE.SpriteMaterial;
      material.opacity = this.opacity * 0.8;
    });

    // Update boundary - 在非常远的距离时显示
    if (this.boundary) {
      const material = this.boundary.material as THREE.MeshBasicMaterial;
      
      // 可观测宇宙半径
      const LIGHT_YEAR_TO_AU = 63241.077;
      const observableUniverseRadius = 465e8 * LIGHT_YEAR_TO_AU;
      
      // 当相机距离超过可观测宇宙半径的 20% 时开始显示（更早显示）
      const showStartDistance = observableUniverseRadius * 0.2;
      const showFullDistance = observableUniverseRadius * 1.0;
      
      let boundaryOpacity = 0;
      if (cameraDistance > showStartDistance) {
        if (cameraDistance < showFullDistance) {
          // 淡入
          boundaryOpacity = (cameraDistance - showStartDistance) / (showFullDistance - showStartDistance);
        } else {
          // 完全显示
          boundaryOpacity = 1.0;
        }
      }
      
      material.opacity = boundaryOpacity * 0.5;  // 增加最大透明度到 50%
      this.boundary.visible = boundaryOpacity > 0.01;
      
      // 调试日志（每 100 帧输出一次）
      if (Math.random() < 0.01 && boundaryOpacity > 0) {
        console.log(`Observable Universe Boundary: distance=${(cameraDistance/LIGHT_YEAR_TO_AU/1e6).toFixed(0)}M ly, opacity=${(boundaryOpacity*100).toFixed(1)}%`);
      }
    }

    this.group.visible = this.isVisible;
  }

  private calculateOpacity(cameraDistance: number): number {
    const { observableUniverseFadeStart, observableUniverseShowStart, observableUniverseShowFull } = UNIVERSE_SCALE_CONFIG;

    if (cameraDistance < observableUniverseFadeStart) {
      return 0;
    } else if (cameraDistance < observableUniverseShowStart) {
      return (cameraDistance - observableUniverseFadeStart) / (observableUniverseShowStart - observableUniverseFadeStart);
    } else if (cameraDistance < observableUniverseShowFull) {
      return 1;
    } else {
      return 1;
    }
  }

  dispose(): void {
    this.filaments.forEach(filament => {
      this.group.remove(filament);
      filament.geometry.dispose();
      (filament.material as THREE.Material).dispose();
    });
    this.filaments = [];

    this.voids.forEach(void_ => {
      this.group.remove(void_);
      void_.geometry.dispose();
      (void_.material as THREE.Material).dispose();
    });
    this.voids = [];

    this.redshiftMarkers.forEach(marker => {
      this.group.remove(marker);
      marker.material.dispose();
    });
    this.redshiftMarkers = [];

    if (this.boundary) {
      this.group.remove(this.boundary);
      this.boundary.geometry.dispose();
      (this.boundary.material as THREE.Material).dispose();
      this.boundary = null;
    }
  }
}
