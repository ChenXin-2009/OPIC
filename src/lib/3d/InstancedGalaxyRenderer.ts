/**
 * InstancedGalaxyRenderer.ts - 实例化星系渲染器
 * 
 * 使用实例化渲染技术高效渲染大量星系
 */

import * as THREE from 'three';
import type { LocalGroupGalaxy } from '../types/universeTypes';

/**
 * 实例化星系渲染器
 * 使用 InstancedMesh 减少绘制调用
 */
export class InstancedGalaxyRenderer {
  private instancedMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D;
  private count: number;

  /**
   * 创建实例化星系渲染器
   * 
   * @param galaxies - 星系数据数组
   * @param geometry - 共享的几何体
   * @param material - 共享的材质
   */
  constructor(
    galaxies: LocalGroupGalaxy[],
    geometry: THREE.BufferGeometry,
    material: THREE.Material
  ) {
    this.count = galaxies.length;
    this.dummy = new THREE.Object3D();

    // 创建实例化网格
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.count);

    // 设置每个实例的变换矩阵和颜色
    galaxies.forEach((galaxy, i) => {
      // 设置位置
      this.dummy.position.set(galaxy.x, galaxy.y, galaxy.z);
      
      // 设置缩放
      this.dummy.scale.setScalar(galaxy.radius);
      
      // 更新矩阵
      this.dummy.updateMatrix();
      
      // 设置实例矩阵
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      
      // 设置实例颜色
      const color = new THREE.Color(galaxy.color);
      this.instancedMesh.setColorAt(i, color);
    });

    // 标记需要更新
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    // 启用视锥剔除
    this.instancedMesh.frustumCulled = true;
  }

  /**
   * 获取实例化网格对象
   * 
   * @returns THREE.InstancedMesh 对象
   */
  getInstancedMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  /**
   * 更新指定实例的变换和颜色
   * 
   * @param index - 实例索引
   * @param position - 新位置
   * @param scale - 新缩放
   * @param color - 新颜色
   */
  updateInstance(
    index: number,
    position: THREE.Vector3,
    scale: number,
    color: THREE.Color
  ): void {
    if (index < 0 || index >= this.count) {
      console.warn(`Invalid instance index: ${index}`);
      return;
    }

    // 更新变换
    this.dummy.position.copy(position);
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    this.instancedMesh.setMatrixAt(index, this.dummy.matrix);

    // 更新颜色
    this.instancedMesh.setColorAt(index, color);

    // 标记需要更新
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * 批量更新实例
   * 
   * @param updates - 更新数据数组
   */
  batchUpdateInstances(
    updates: Array<{
      index: number;
      position?: THREE.Vector3;
      scale?: number;
      color?: THREE.Color;
    }>
  ): void {
    updates.forEach(({ index, position, scale, color }) => {
      if (index < 0 || index >= this.count) {
        return;
      }

      // 获取当前矩阵
      this.instancedMesh.getMatrixAt(index, this.dummy.matrix);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

      // 更新位置
      if (position) {
        this.dummy.position.copy(position);
      }

      // 更新缩放
      if (scale !== undefined) {
        this.dummy.scale.setScalar(scale);
      }

      // 更新矩阵
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(index, this.dummy.matrix);

      // 更新颜色
      if (color) {
        this.instancedMesh.setColorAt(index, color);
      }
    });

    // 标记需要更新
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * 设置实例可见性（通过缩放为0实现）
   * 
   * @param index - 实例索引
   * @param visible - 是否可见
   */
  setInstanceVisible(index: number, visible: boolean): void {
    if (index < 0 || index >= this.count) {
      return;
    }

    this.instancedMesh.getMatrixAt(index, this.dummy.matrix);
    this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

    if (!visible) {
      this.dummy.scale.setScalar(0);
    }

    this.dummy.updateMatrix();
    this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 设置渲染顺序
   * 
   * @param order - 渲染顺序
   */
  setRenderOrder(order: number): void {
    this.instancedMesh.renderOrder = order;
  }

  /**
   * 设置整体可见性
   * 
   * @param visible - 是否可见
   */
  setVisible(visible: boolean): void {
    this.instancedMesh.visible = visible;
  }

  /**
   * 获取实例数量
   * 
   * @returns 实例数量
   */
  getCount(): number {
    return this.count;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.instancedMesh.dispose();
  }
}
