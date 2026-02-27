import * as THREE from 'three';
import { Text } from 'troika-three-text';

export interface OrbitLabelConfig {
  textEn: string;
  textZh: string;
  color?: string;
  orbitRadius: number;
  orbitSpacing: number;
}

export class OrbitLabel {
  private textMeshEn: Text;
  private textMeshZh: Text;
  private group: THREE.Group;
  private config: Required<Omit<OrbitLabelConfig, 'color'>> & { 
    color: string;
    orbitRadius: number; 
    orbitSpacing: number;
  };
  private baseScale: number = 1.0;
  
  constructor(config: OrbitLabelConfig) {
    this.config = {
      textEn: config.textEn,
      textZh: config.textZh,
      color: config.color || '#ffffff',
      orbitRadius: config.orbitRadius,
      orbitSpacing: config.orbitSpacing,
    };

    // 计算标签高度
    const labelHeight = this.config.orbitSpacing / 5;
    this.baseScale = labelHeight;

    // 创建组来容纳两个文本
    this.group = new THREE.Group();

    // 创建英文 Text 对象（使用 Novecento Wide Bold）
    this.textMeshEn = new Text();
    this.textMeshEn.text = this.config.textEn;
    this.textMeshEn.fontSize = 1;
    this.textMeshEn.color = this.config.color;
    this.textMeshEn.anchorX = 'center'; // 居中对齐
    this.textMeshEn.anchorY = 'middle';
    this.textMeshEn.font = '/fonts/Novecento-Wide-Bold-2.woff';
    this.textMeshEn.renderOrder = 1000;
    
    // 设置英文材质属性
    this.textMeshEn.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    
    // 英文位置（上方）
    this.textMeshEn.position.set(0, 0.3, 0);
    
    // 创建中文 Text 对象
    this.textMeshZh = new Text();
    this.textMeshZh.text = this.config.textZh;
    this.textMeshZh.fontSize = 0.5; // 中文字体大小为英文的一半
    this.textMeshZh.color = this.config.color;
    this.textMeshZh.anchorX = 'center'; // 居中对齐
    this.textMeshZh.anchorY = 'middle';
    this.textMeshZh.renderOrder = 1000;
    
    // 设置中文材质属性
    this.textMeshZh.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    
    // 中文位置（在英文下方）
    this.textMeshZh.position.set(0, -0.3, 0);
    
    // 添加到组
    this.group.add(this.textMeshEn);
    this.group.add(this.textMeshZh);
    
    // 缩放到合适的大小
    this.group.scale.setScalar(this.baseScale);
    
    // 同步渲染（确保文字立即可用）
    this.textMeshEn.sync();
    this.textMeshZh.sync();
  }

  setText(textEn: string, textZh: string): void {
    if (this.config.textEn !== textEn) {
      this.config.textEn = textEn;
      this.textMeshEn.text = textEn;
      this.textMeshEn.sync();
    }
    if (this.config.textZh !== textZh) {
      this.config.textZh = textZh;
      this.textMeshZh.text = textZh;
      this.textMeshZh.sync();
    }
  }

  updatePosition(planetPosition: THREE.Vector3, orbitNormal: THREE.Vector3): void {
    const planetDir = planetPosition.clone().normalize();
    const tangent = new THREE.Vector3().crossVectors(orbitNormal, planetDir).normalize();
    
    if (tangent.length() < 0.1) {
      const fallback = new THREE.Vector3(0, 1, 0);
      tangent.crossVectors(orbitNormal, fallback).normalize();
    }
    
    const radial = new THREE.Vector3().crossVectors(tangent, orbitNormal).normalize();
    radial.negate();
    
    // 计算文字总长度（估算）
    const enWidth = this.config.textEn.length * 0.7;
    const zhWidth = this.config.textZh.length * 0.5 * 0.5;
    const gap = 0.3;
    const totalWidth = (enWidth + gap + zhWidth) * this.baseScale;
    
    // 弦长 = totalWidth
    // 圆半径 = orbitRadius
    // 计算圆心角：使用弦长公式 chord = 2 * R * sin(θ/2)
    const halfChord = totalWidth / 2;
    const R = this.config.orbitRadius;
    const sinHalfAngle = Math.min(halfChord / R, 1.0);
    const halfAngle = Math.asin(sinHalfAngle);
    
    // 弦心距（圆心到弦的垂直距离）= R * cos(θ/2)
    const chordDistance = R * Math.cos(halfAngle);
    
    // 文字应该向圆心方向内缩的距离 = R - chordDistance
    const inwardOffset = R - chordDistance;
    
    // 总偏移 = 基础偏移 + 内缩距离
    const baseOffset = this.baseScale * 0.8;
    const totalOffset = baseOffset + inwardOffset;
    
    this.group.position.copy(planetPosition);
    this.group.position.addScaledVector(radial, totalOffset);
    
    const targetPosition = this.group.position.clone().add(orbitNormal);
    this.group.lookAt(targetPosition);
    
    const upVector = radial.clone();
    const matrix = new THREE.Matrix4();
    matrix.lookAt(this.group.position, targetPosition, upVector);
    this.group.quaternion.setFromRotationMatrix(matrix);
  }

  updatePositionWithCamera(planetPosition: THREE.Vector3, orbitNormal: THREE.Vector3, camera: THREE.Camera, isSatellite: boolean = false): void {
    // 卫星使用跟随模式，行星使用固定在轨道下方模式
    if (isSatellite) {
      // 卫星跟随模式：标签跟随卫星位置
      const radial = planetPosition.clone().normalize();
      
      // 向轨道内侧偏移
      const baseOffset = this.baseScale * 0.8;
      this.group.position.copy(planetPosition).addScaledVector(radial, -baseOffset);
      
      // 计算相机到标签的方向
      const cameraToLabel = new THREE.Vector3().subVectors(camera.position, this.group.position).normalize();
      
      // 检查相机是在轨道平面的哪一侧
      const cameraDot = cameraToLabel.dot(orbitNormal);
      
      // 根据相机位置决定法向量方向
      const effectiveNormal = cameraDot < 0 ? orbitNormal.clone() : orbitNormal.clone().negate();
      
      // 设置标签朝向：垂直于轨道平面
      const targetPosition = this.group.position.clone().add(effectiveNormal);
      this.group.lookAt(targetPosition);
      
      // 设置up向量：指向轨道外侧（径向向外）
      const upVector = radial.clone();
      
      const matrix = new THREE.Matrix4();
      matrix.lookAt(this.group.position, targetPosition, upVector);
      this.group.quaternion.setFromRotationMatrix(matrix);
      
      // 绕法向量旋转180度
      const rotation180 = new THREE.Quaternion().setFromAxisAngle(effectiveNormal, Math.PI);
      this.group.quaternion.multiply(rotation180);
    } else {
      // 行星固定模式：标签固定在轨道下方
      // 1. 获取相机的向上方向在轨道平面上的投影
      const cameraUp = new THREE.Vector3(0, 1, 0); // 相机的向上方向
      
      // 2. 将相机向上方向投影到轨道平面上
      // 投影公式：v_proj = v - (v·n)n
      const dotProduct = cameraUp.dot(orbitNormal);
      const projectedUp = cameraUp.clone().sub(orbitNormal.clone().multiplyScalar(dotProduct));
      
      // 检查投影长度，如果太小则使用备用方向
      if (projectedUp.length() < 0.1) {
        // 使用轨道平面上的任意方向
        const fallback = new THREE.Vector3(1, 0, 0);
        const fallbackDot = fallback.dot(orbitNormal);
        projectedUp.copy(fallback).sub(orbitNormal.clone().multiplyScalar(fallbackDot));
      }
      
      projectedUp.normalize();
      
      // 3. 屏幕下方 = 投影向上方向的反方向
      const downDirection = projectedUp.clone().negate();
      
      // 4. 标签位置 = 太阳位置 + 下方向 * 轨道半径
      const orbitCenter = new THREE.Vector3(0, 0, 0);
      const labelPosition = orbitCenter.clone().add(downDirection.clone().multiplyScalar(this.config.orbitRadius));
      
      // 5. 计算径向方向（从中心指向标签位置）
      const radial = labelPosition.clone().sub(orbitCenter).normalize();
      
      // 6. 向轨道内侧偏移
      const baseOffset = this.baseScale * 0.8;
      this.group.position.copy(labelPosition).addScaledVector(radial, -baseOffset);
      
      // 7. 计算相机到标签的方向
      const cameraToLabel = new THREE.Vector3().subVectors(camera.position, this.group.position).normalize();
      
      // 8. 检查相机是在轨道平面的哪一侧
      const cameraDot = cameraToLabel.dot(orbitNormal);
      
      // 9. 根据相机位置决定法向量方向
      const effectiveNormal = cameraDot < 0 ? orbitNormal.clone() : orbitNormal.clone().negate();
      
      // 10. 设置标签朝向：垂直于轨道平面
      const targetPosition = this.group.position.clone().add(effectiveNormal);
      this.group.lookAt(targetPosition);
      
      // 11. 设置up向量：指向轨道外侧（径向向外）
      const upVector = radial.clone();
      
      const matrix = new THREE.Matrix4();
      matrix.lookAt(this.group.position, targetPosition, upVector);
      this.group.quaternion.setFromRotationMatrix(matrix);
      
      // 12. 绕法向量旋转180度
      const rotation180 = new THREE.Quaternion().setFromAxisAngle(effectiveNormal, Math.PI);
      this.group.quaternion.multiply(rotation180);
    }
  }

  setOpacity(opacity: number): void {
    if (this.textMeshEn.material) {
      (this.textMeshEn.material as THREE.MeshBasicMaterial).opacity = opacity;
      this.textMeshEn.visible = opacity > 0.01;
    }
    if (this.textMeshZh.material) {
      (this.textMeshZh.material as THREE.MeshBasicMaterial).opacity = opacity;
      this.textMeshZh.visible = opacity > 0.01;
    }
  }

  getSprite(): THREE.Group {
    return this.group;
  }

  getScreenBounds(camera: THREE.Camera, containerWidth: number, containerHeight: number): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null {
    const vector = this.group.position.clone();
    vector.project(camera);
    
    if (vector.z > 1) {
      return null;
    }
    
    const x = (vector.x + 1) * containerWidth / 2;
    const y = (-vector.y + 1) * containerHeight / 2;
    
    const scale = this.group.scale.x;
    const distance = camera.position.distanceTo(this.group.position);
    const screenScale = (scale / distance) * containerHeight * 0.5;
    
    const halfWidth = screenScale * 1.5;
    const halfHeight = screenScale * 0.5;
    
    return {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - halfHeight,
      bottom: y + halfHeight,
    };
  }

  isLabelReady(): boolean {
    return true;
  }

  dispose(): void {
    this.textMeshEn.dispose();
    this.textMeshZh.dispose();
  }
}
