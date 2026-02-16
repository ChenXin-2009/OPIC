/**
 * GalaxyPlaneDebugRenderer.ts - 银河系平面调试渲染器
 * 
 * 显示银河系平面的圆盘，用于验证坐标系是否正确
 */

import * as THREE from 'three';
import { GALAXY_CONFIG, LIGHT_YEAR_TO_AU } from '../config/galaxyConfig';

export class GalaxyPlaneDebugRenderer {
  private group: THREE.Group;
  private planeMesh: THREE.Mesh | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'GalaxyPlaneDebug';
    
    this.createPlane();
  }

  private createPlane(): void {
    const cfg = GALAXY_CONFIG;
    
    // 银河系半径：约 50,000 光年
    const radiusAU = 50000 * LIGHT_YEAR_TO_AU;
    
    // 创建圆盘几何体
    const geometry = new THREE.CircleGeometry(radiusAU, 64);
    
    // 创建半透明材质
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    
    this.planeMesh = new THREE.Mesh(geometry, material);
    
    // 应用与银河系相同的旋转
    this.group.rotation.order = 'YXZ';
    this.group.rotation.x = cfg.rotationX * (Math.PI / 180);
    this.group.rotation.y = cfg.rotationY * (Math.PI / 180);
    this.group.rotation.z = cfg.rotationZ * (Math.PI / 180);
    
    this.group.add(this.planeMesh);
    
    // 添加边缘线圈
    const edgeGeometry = new THREE.RingGeometry(radiusAU * 0.99, radiusAU, 64);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
    this.group.add(edgeMesh);
    
    console.log('[GalaxyPlaneDebugRenderer] 银河系平面圆盘已创建');
    console.log(`  半径: ${radiusAU.toExponential(2)} AU = 50,000 光年`);
    console.log(`  旋转: X=${cfg.rotationX}°, Y=${cfg.rotationY}°, Z=${cfg.rotationZ}°`);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  update(cameraDistance: number): void {
    // 根据相机距离调整透明度
    if (this.planeMesh) {
      const material = this.planeMesh.material as THREE.MeshBasicMaterial;
      
      // 在本星系群尺度显示（200k - 10M 光年）
      const minDistance = 200000 * 63241.077; // 200k 光年 in AU
      const maxDistance = 10000000 * 63241.077; // 10M 光年 in AU
      
      if (cameraDistance < minDistance) {
        material.opacity = 0;
        this.group.visible = false;
      } else if (cameraDistance < maxDistance) {
        const ratio = (cameraDistance - minDistance) / (maxDistance - minDistance);
        material.opacity = 0.2 * ratio;
        this.group.visible = true;
      } else {
        material.opacity = 0.2;
        this.group.visible = true;
      }
    }
  }

  dispose(): void {
    if (this.planeMesh) {
      this.planeMesh.geometry.dispose();
      (this.planeMesh.material as THREE.Material).dispose();
      this.group.remove(this.planeMesh);
      this.planeMesh = null;
    }
  }
}
