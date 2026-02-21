/**
 * SatelliteRenderer.ts - 卫星点云渲染器
 * 
 * 功能：
 * - 使用Three.js Points对象渲染大量卫星(最多100,000颗)
 * - 根据轨道类型使用不同颜色编码(LEO蓝色、MEO绿色、GEO红色、其他白色)
 * - 根据相机距离动态调整点大小(LOD)
 * - 支持卫星选择和轨道轨迹显示
 * - 高性能批量更新位置、颜色和大小
 * 
 * 使用：
 * - 传入SceneManager创建渲染器
 * - 调用updatePositions()更新卫星状态
 * - 调用showOrbit()显示卫星轨道
 */

import * as THREE from 'three';
import { OrbitCurve } from './OrbitCurve';
import { satelliteConfig } from '../config/satelliteConfig';
import type { SatelliteState, OrbitType } from '../types/satellite';
import type { SceneManager } from './SceneManager';
import type { SGP4Calculator } from '../satellite/sgp4Calculator';

/**
 * 最大卫星数量
 */
const MAX_SATELLITES = satelliteConfig.rendering.maxSatellites;

/**
 * 轨道线对象(用于对象池)
 */
interface OrbitLine {
  line: THREE.Line;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  inUse: boolean;
}

/**
 * SatelliteRenderer - 卫星点云渲染器
 * 
 * 使用Three.js BufferGeometry和Points对象实现高性能卫星渲染。
 * 支持最多100,000颗卫星的实时渲染，保持60fps性能。
 * 
 * 核心功能：
 * - 点云渲染：使用BufferGeometry直接操作GPU缓冲区
 * - 颜色编码：根据轨道类型(LEO/MEO/GEO/HEO)使用不同颜色
 * - LOD优化：根据相机距离动态调整点大小
 * - 轨道显示：支持显示最多10条卫星轨道轨迹
 * - 射线投射：支持鼠标点击选择卫星
 * - 对象池：复用轨道线对象以减少GC压力
 * 
 * @example
 * ```typescript
 * const renderer = new SatelliteRenderer(sceneManager);
 * 
 * // 更新卫星位置
 * renderer.updatePositions(satelliteStates);
 * 
 * // 显示轨道
 * await renderer.showOrbit(noradId, calculator);
 * 
 * // 清理资源
 * renderer.dispose();
 * ```
 */
export class SatelliteRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pointCloud: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  
  // 缓冲区数组
  private positionBuffer: Float32Array;
  private colorBuffer: Float32Array;
  
  // 卫星数据
  private satellites: Map<number, SatelliteState>;
  private selectedSatellite: number | null;
  
  // 轨道曲线
  private orbitCurves: Map<number, OrbitLine>;
  
  // 对象池：复用轨道线对象
  private orbitLinePool: OrbitLine[];
  
  /**
   * 创建卫星渲染器实例
   * 
   * @param sceneManager - 场景管理器实例
   */
  constructor(sceneManager: SceneManager) {
    this.scene = sceneManager.getScene();
    this.camera = sceneManager.getCamera();
    this.satellites = new Map();
    this.selectedSatellite = null;
    this.orbitCurves = new Map();
    this.orbitLinePool = []; // 初始化对象池
    
    // 初始化缓冲区
    this.positionBuffer = new Float32Array(MAX_SATELLITES * 3);
    this.colorBuffer = new Float32Array(MAX_SATELLITES * 3);
    
    // 初始化点云
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial();
    this.pointCloud = new THREE.Points();
    
    this.initPointCloud();
  }
  
  /**
   * 初始化点云
   * 
   * 创建BufferGeometry和PointsMaterial，设置缓冲区属性。
   * 使用vertexColors启用顶点颜色，sizeAttenuation启用距离衰减。
   */
  private initPointCloud(): void {
    // 创建BufferGeometry
    this.geometry = new THREE.BufferGeometry();
    
    // 设置位置属性
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positionBuffer, 3)
    );
    
    // 设置颜色属性
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colorBuffer, 3)
    );
    
    // 创建材质
    this.material = new THREE.PointsMaterial({
      size: satelliteConfig.rendering.pointSize,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: satelliteConfig.rendering.opacity,
      depthWrite: false,
      depthTest: true,
    });
    
    // 创建点云对象
    this.pointCloud = new THREE.Points(this.geometry, this.material);
    this.pointCloud.name = 'SatellitePointCloud';
    this.pointCloud.frustumCulled = true; // 启用视锥剔除
    
    // 初始化时隐藏点云，直到有数据才显示
    this.pointCloud.visible = false;
    
    // 设置初始绘制范围为0（不绘制任何点）
    this.geometry.setDrawRange(0, 0);
    
    // 添加到场景
    this.scene.add(this.pointCloud);
  }
  
  /**
   * 更新卫星位置
   * 
   * 批量更新所有卫星的位置、颜色和大小。
   * 这是渲染器的核心方法，每帧调用一次。
   * 
   * @param satellites - 卫星状态Map，键为NORAD ID
   * 
   * @example
   * ```typescript
   * const satellites = new Map<number, SatelliteState>();
   * satellites.set(25544, {
   *   noradId: 25544,
   *   name: 'ISS',
   *   position: new THREE.Vector3(6.8, 0, 0),
   *   // ... 其他属性
   * });
   * renderer.updatePositions(satellites);
   * ```
   */
  updatePositions(satellites: Map<number, SatelliteState>): void {
    console.log('[SatelliteRenderer] updatePositions called with', satellites.size, 'satellites');
    
    this.satellites = satellites;
    let index = 0;
    
    // 如果没有卫星数据，隐藏点云
    if (satellites.size === 0) {
      console.log('[SatelliteRenderer] No satellites, hiding point cloud');
      this.pointCloud.visible = false;
      this.geometry.setDrawRange(0, 0);
      return;
    }
    
    satellites.forEach((sat) => {
      if (index >= MAX_SATELLITES) {
        console.warn(`[SatelliteRenderer] 卫星数量超过最大限制 ${MAX_SATELLITES}`);
        return;
      }
      
      // 更新位置
      this.positionBuffer[index * 3] = sat.position.x;
      this.positionBuffer[index * 3 + 1] = sat.position.y;
      this.positionBuffer[index * 3 + 2] = sat.position.z;
      
      // 更新颜色(根据轨道类型)
      const color = this.getColorByOrbitType(sat.orbitType);
      this.colorBuffer[index * 3] = color.r;
      this.colorBuffer[index * 3 + 1] = color.g;
      this.colorBuffer[index * 3 + 2] = color.b;
      
      index++;
    });
    
    console.log('[SatelliteRenderer] Updated', index, 'satellites, first position:', 
      this.positionBuffer[0], this.positionBuffer[1], this.positionBuffer[2]);
    
    // 设置实际绘制的点数量
    this.geometry.setDrawRange(0, index);
    
    // 标记需要更新
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    
    // 更新包围球(用于视锥剔除)
    this.geometry.computeBoundingSphere();
    
    // 显示点云
    this.pointCloud.visible = true;
    console.log('[SatelliteRenderer] Point cloud visible:', this.pointCloud.visible);
  }
  
  /**
   * 根据轨道类型获取颜色
   * 
   * 颜色映射：
   * - LEO(低轨): 蓝色 #00aaff
   * - MEO(中轨): 绿色 #00ff00
   * - GEO(高轨): 红色 #ff0000
   * - HEO(高椭圆轨道): 白色 #ffffff
   * 
   * @param orbitType - 轨道类型
   * @returns Three.js颜色对象
   */
  private getColorByOrbitType(orbitType: OrbitType): THREE.Color {
    const colorHex = satelliteConfig.rendering.colors[orbitType];
    return new THREE.Color(colorHex);
  }
  
  /**
   * 从对象池获取轨道线对象
   * 
   * 如果池中有可用对象则复用，否则创建新对象。
   * 这减少了GC压力并提高性能。
   * 
   * @returns 轨道线对象
   */
  private getOrbitLineFromPool(): OrbitLine {
    // 尝试从池中获取未使用的对象
    const available = this.orbitLinePool.find(item => !item.inUse);
    
    if (available) {
      available.inUse = true;
      return available;
    }
    
    // 池中没有可用对象，创建新对象
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      opacity: 0.6,
      transparent: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    
    const orbitLine: OrbitLine = {
      line,
      geometry,
      material,
      inUse: true,
    };
    
    // 添加到池中
    this.orbitLinePool.push(orbitLine);
    
    return orbitLine;
  }
  
  /**
   * 将轨道线对象归还到对象池
   * 
   * 标记对象为未使用状态，以便后续复用。
   * 
   * @param orbitLine - 轨道线对象
   */
  private returnOrbitLineToPool(orbitLine: OrbitLine): void {
    // 从场景中移除
    this.scene.remove(orbitLine.line);
    
    // 标记为未使用
    orbitLine.inUse = false;
    
    // 清空几何体数据(但不销毁对象)
    // 注意: setFromPoints需要至少一个点,所以使用原点
    orbitLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0)]);
  }
  
  /**
   * 射线投射检测点击
   * 
   * 使用Three.js Raycaster检测鼠标点击的卫星。
   * 返回被点击卫星的NORAD ID。
   * 
   * @param raycaster - Three.js射线投射器
   * @returns 被点击卫星的NORAD ID，如果没有点击到卫星则返回null
   * 
   * @example
   * ```typescript
   * const raycaster = new THREE.Raycaster();
   * raycaster.setFromCamera(mouse, camera);
   * const noradId = renderer.raycast(raycaster);
   * if (noradId) {
   *   console.log('点击了卫星:', noradId);
   * }
   * ```
   */
  raycast(raycaster: THREE.Raycaster): number | null {
    // 设置射线投射器的点阈值(增加点击容差)
    raycaster.params.Points = raycaster.params.Points || {};
    raycaster.params.Points.threshold = 0.1;
    
    const intersects = raycaster.intersectObject(this.pointCloud);
    
    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) {
        // 从索引获取NORAD ID
        const noradIds = Array.from(this.satellites.keys());
        if (index < noradIds.length) {
          return noradIds[index];
        }
      }
    }
    
    return null;
  }
  
  /**
   * 显示卫星轨道
   * 
   * 计算并显示指定卫星的轨道轨迹。
   * 轨道轨迹为一个完整轨道周期的路径。
   * 最多同时显示10条轨道，超过时自动移除最早的轨道。
   * 
   * @param noradId - 卫星NORAD ID
   * @param calculator - SGP4计算器实例
   * 
   * @example
   * ```typescript
   * await renderer.showOrbit(25544, calculator);
   * ```
   */
  async showOrbit(noradId: number, calculator: SGP4Calculator): Promise<void> {
    // 如果已经显示，直接返回
    if (this.orbitCurves.has(noradId)) {
      return;
    }
    
    // 限制最多10条轨道
    const maxOrbits = satelliteConfig.ui.maxOrbits;
    if (this.orbitCurves.size >= maxOrbits) {
      const firstKey = this.orbitCurves.keys().next().value;
      if (firstKey !== undefined) {
        this.hideOrbit(firstKey);
      }
    }
    
    const satellite = this.satellites.get(noradId);
    if (!satellite) {
      console.warn(`[SatelliteRenderer] 未找到卫星 ${noradId}`);
      return;
    }
    
    try {
      // 计算轨道轨迹
      const period = satellite.orbitalElements.period * 60; // 转换为秒
      const points = await calculator.calculateOrbit(
        noradId,
        Date.now(),
        period,
        100 // 100个点
      );
      
      if (points.length === 0) {
        console.warn(`[SatelliteRenderer] 轨道计算失败: ${noradId}`);
        return;
      }
      
      // 从对象池获取轨道线对象
      const orbitLine = this.getOrbitLineFromPool();
      
      // 更新几何体
      orbitLine.geometry.setFromPoints(points);
      
      // 更新颜色
      const color = this.getColorByOrbitType(satellite.orbitType);
      orbitLine.material.color = color;
      
      // 设置名称
      orbitLine.line.name = `SatelliteOrbit_${noradId}`;
      
      // 添加到场景
      this.scene.add(orbitLine.line);
      
      // 保存引用
      this.orbitCurves.set(noradId, orbitLine);
      
    } catch (error) {
      console.error(`[SatelliteRenderer] 显示轨道失败: ${noradId}`, error);
    }
  }
  
  /**
   * 隐藏卫星轨道
   * 
   * 移除指定卫星的轨道轨迹显示，并将对象归还到对象池。
   * 
   * @param noradId - 卫星NORAD ID
   * 
   * @example
   * ```typescript
   * renderer.hideOrbit(25544);
   * ```
   */
  hideOrbit(noradId: number): void {
    const orbitLine = this.orbitCurves.get(noradId);
    if (orbitLine) {
      // 归还到对象池
      this.returnOrbitLineToPool(orbitLine);
      
      // 从映射中删除
      this.orbitCurves.delete(noradId);
    }
  }
  
  /**
   * 清除所有轨道
   * 
   * 移除所有显示的轨道轨迹。
   * 
   * @example
   * ```typescript
   * renderer.clearAllOrbits();
   * ```
   */
  clearAllOrbits(): void {
    this.orbitCurves.forEach((_, noradId) => {
      this.hideOrbit(noradId);
    });
  }
  
  /**
   * 设置可见性
   * 
   * 控制卫星点云的显示/隐藏。
   * 
   * @param visible - 是否可见
   * 
   * @example
   * ```typescript
   * renderer.setVisible(false); // 隐藏所有卫星
   * ```
   */
  setVisible(visible: boolean): void {
    this.pointCloud.visible = visible;
  }
  
  /**
   * 获取卫星数量
   * 
   * 返回当前渲染的卫星数量。
   * 
   * @returns 卫星数量
   */
  getSatelliteCount(): number {
    return this.satellites.size;
  }
  
  /**
   * 获取选中的卫星
   * 
   * 返回当前选中卫星的NORAD ID。
   * 
   * @returns 选中卫星的NORAD ID，如果没有选中则返回null
   */
  getSelectedSatellite(): number | null {
    return this.selectedSatellite;
  }
  
  /**
   * 设置选中的卫星
   * 
   * 设置当前选中的卫星。
   * 
   * @param noradId - 卫星NORAD ID，null表示取消选中
   */
  setSelectedSatellite(noradId: number | null): void {
    this.selectedSatellite = noradId;
  }
  
  /**
   * 清理资源
   * 
   * 释放所有WebGL资源，包括几何体、材质、轨道曲线和对象池。
   * 应在渲染器不再使用时调用。
   * 
   * @example
   * ```typescript
   * // 组件卸载时
   * useEffect(() => {
   *   return () => {
   *     renderer.dispose();
   *   };
   * }, []);
   * ```
   */
  dispose(): void {
    // 清理所有轨道
    this.clearAllOrbits();
    
    // 清理对象池中的所有对象
    this.orbitLinePool.forEach(orbitLine => {
      // 从场景中移除(如果还在场景中)
      this.scene.remove(orbitLine.line);
      
      // 释放资源
      orbitLine.geometry.dispose();
      orbitLine.material.dispose();
    });
    this.orbitLinePool = [];
    
    // 清理点云
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.pointCloud);
    
    // 清空数据
    this.satellites.clear();
    this.orbitCurves.clear();
  }
}
