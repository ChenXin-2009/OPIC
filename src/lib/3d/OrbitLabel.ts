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
    this.textMeshEn.anchorX = 'right'; // 右对齐，文字在左边
    this.textMeshEn.anchorY = 'middle';
    this.textMeshEn.font = '/fonts/Novecento-Wide-Bold-2.woff';
    this.textMeshEn.renderOrder = 1000;
    
    // 设置英文材质属性
    this.textMeshEn.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    
    // 英文位置（基准位置）
    this.textMeshEn.position.set(0, 0, 0);
    
    // 创建中文 Text 对象
    this.textMeshZh = new Text();
    this.textMeshZh.text = this.config.textZh;
    this.textMeshZh.fontSize = 0.5; // 中文字体大小为英文的一半
    this.textMeshZh.color = this.config.color;
    this.textMeshZh.anchorX = 'right'; // 右对齐
    this.textMeshZh.anchorY = 'middle';
    this.textMeshZh.renderOrder = 1000;
    
    // 设置中文材质属性
    this.textMeshZh.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
    
    // 中文位置（在英文左边）
    const estimatedEnWidth = this.config.textEn.length * 0.7;
    this.textMeshZh.position.set(-(estimatedEnWidth + 0.3), 0, 0);
    
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
      
      // 更新中文位置（在英文左边）
      const estimatedEnWidth = textEn.length * 0.7;
      this.textMeshZh.position.x = -(estimatedEnWidth + 0.3);
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

  updatePositionWithCamera(planetPosition: THREE.Vector3, orbitNormal: THREE.Vector3, camera: THREE.Camera): void {
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
    
    // 计算相机到标签的方向
    const cameraToLabel = new THREE.Vector3().subVectors(camera.position, this.group.position).normalize();
    
    // 检查相机是在轨道平面的哪一侧
    const dotProduct = cameraToLabel.dot(orbitNormal);
    
    // 根据相机位置决定法向量方向
    const effectiveNormal = dotProduct < 0 ? orbitNormal.clone() : orbitNormal.clone().negate();
    
    const targetPosition = this.group.position.clone().add(effectiveNormal);
    this.group.lookAt(targetPosition);
    
    // 计算up向量，并加上倾斜角度
    const upVector = radial.clone();
    
    // 应用倾斜：绕法向量旋转
    const rotationAxis = effectiveNormal.clone();
    const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, halfAngle);
    upVector.applyMatrix4(rotationMatrix);
    
    const matrix = new THREE.Matrix4();
    matrix.lookAt(this.group.position, targetPosition, upVector);
    this.group.quaternion.setFromRotationMatrix(matrix);
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
