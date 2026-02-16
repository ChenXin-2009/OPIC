/**
 * FrustumCullingOptimizer.ts - 视锥剔除优化器
 * 
 * 优化视锥剔除以提高渲染性能
 */

import * as THREE from 'three';

/**
 * 视锥剔除优化器
 * 测试对象是否在相机视锥内
 */
export class FrustumCullingOptimizer {
  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;

  constructor() {
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
  }

  /**
   * 更新视锥体
   * 
   * @param camera - 相机对象
   */
  updateFrustum(camera: THREE.Camera): void {
    // 计算投影屏幕矩阵
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    // 从矩阵设置视锥体
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  /**
   * 测试对象是否可见
   * 
   * @param object - 3D 对象
   * @returns 是否可见
   */
  isVisible(object: THREE.Object3D): boolean {
    // 确保几何体有包围球
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
      const geometry = object.geometry;
      
      if (!geometry.boundingSphere) {
        geometry.computeBoundingSphere();
      }

      const sphere = geometry.boundingSphere;
      if (!sphere) {
        return true; // 无法计算包围球，默认可见
      }

      // 转换到世界空间
      const worldSphere = sphere.clone();
      worldSphere.applyMatrix4(object.matrixWorld);

      // 测试与视锥体相交
      return this.frustum.intersectsSphere(worldSphere);
    }

    // 对于其他类型的对象，使用包围盒
    if (object instanceof THREE.Group) {
      const box = new THREE.Box3().setFromObject(object);
      return this.frustum.intersectsBox(box);
    }

    return true;
  }

  /**
   * 测试球体是否可见
   * 
   * @param center - 球心位置
   * @param radius - 半径
   * @returns 是否可见
   */
  isSphereVisible(center: THREE.Vector3, radius: number): boolean {
    const sphere = new THREE.Sphere(center, radius);
    return this.frustum.intersectsSphere(sphere);
  }

  /**
   * 测试包围盒是否可见
   * 
   * @param box - 包围盒
   * @returns 是否可见
   */
  isBoxVisible(box: THREE.Box3): boolean {
    return this.frustum.intersectsBox(box);
  }

  /**
   * 剔除对象数组，返回可见对象
   * 
   * @param objects - 对象数组
   * @returns 可见对象数组
   */
  cullObjects(objects: THREE.Object3D[]): THREE.Object3D[] {
    return objects.filter((obj) => this.isVisible(obj));
  }

  /**
   * 批量测试点是否可见
   * 
   * @param points - 点数组
   * @param radius - 点的半径（用于包围球测试）
   * @returns 可见性数组
   */
  cullPoints(points: THREE.Vector3[], radius: number = 1): boolean[] {
    return points.map((point) => this.isSphereVisible(point, radius));
  }

  /**
   * 获取视锥体平面
   * 
   * @returns 视锥体平面数组
   */
  getFrustumPlanes(): THREE.Plane[] {
    return this.frustum.planes;
  }

  /**
   * 测试点是否在视锥内
   * 
   * @param point - 点坐标
   * @returns 是否在视锥内
   */
  containsPoint(point: THREE.Vector3): boolean {
    return this.frustum.containsPoint(point);
  }
}
