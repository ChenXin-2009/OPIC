/**
 * SatelliteLayer.ts - 卫星图层管理器
 * 
 * 功能：
 * - 集成SceneManager和SatelliteRenderer
 * - 从Zustand Store获取当前时间
 * - 每帧更新卫星位置
 * - 控制卫星图层可见性
 * - 管理资源生命周期
 * 
 * 使用：
 * - 在SolarSystemCanvas3D中创建SatelliteLayer实例
 * - 在动画循环中调用update()方法
 * - 通过setVisible()控制可见性
 */

import type { SceneManager } from './SceneManager';
import { SatelliteRenderer } from './SatelliteRenderer';
import { SGP4Calculator } from '../satellite/sgp4Calculator';
import { useSolarSystemStore } from '../state';
import { useSatelliteStore } from '../store/useSatelliteStore';
import { satelliteConfig } from '../config/satelliteConfig';
import * as THREE from 'three';

/**
 * SatelliteLayer - 卫星图层管理器
 * 
 * 负责协调卫星渲染器和SGP4计算器，将卫星数据集成到3D场景中。
 * 从Zustand Store获取当前时间，并将其转换为Julian Date用于轨道计算。
 * 
 * 核心职责：
 * - 管理SatelliteRenderer和SGP4Calculator的生命周期
 * - 每帧从Store获取当前时间并更新卫星位置
 * - 提供可见性控制接口
 * - 清理Three.js资源
 * 
 * 时间转换：
 * - 从Store获取的时间是JavaScript Date对象（毫秒时间戳）
 * - 转换为Julian Date: JD = timestamp / 86400000 + 2440587.5
 * - 其中86400000是一天的毫秒数，2440587.5是Unix纪元的Julian Date
 * 
 * @example
 * ```typescript
 * const satelliteLayer = new SatelliteLayer(sceneManager);
 * 
 * // 在动画循环中
 * function animate() {
 *   satelliteLayer.update();
 *   requestAnimationFrame(animate);
 * }
 * 
 * // 控制可见性
 * satelliteLayer.setVisible(false);
 * 
 * // 清理资源
 * satelliteLayer.dispose();
 * ```
 */
export class SatelliteLayer {
  private sceneManager: SceneManager;
  private renderer: SatelliteRenderer;
  private calculator: SGP4Calculator;
  private visible: boolean = true;
  
  // 性能优化：节流计算
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000; // 每秒更新一次
  private isCalculating: boolean = false; // 防止重复计算
  
  /**
   * 创建卫星图层实例
   * 
   * @param sceneManager - 场景管理器实例
   */
  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.renderer = new SatelliteRenderer(sceneManager);
    this.calculator = new SGP4Calculator();
  }
  
  /**
   * 每帧更新卫星位置
   * 
   * 从Zustand Store获取当前时间，转换为Julian Date，
   * 然后使用SGP4Calculator计算所有卫星的位置，
   * 最后更新SatelliteRenderer的渲染缓冲区。
   * 
   * 时间转换公式：
   * - Julian Date = (timestamp_ms / 86400000) + 2440587.5
   * - 86400000 = 24 * 60 * 60 * 1000 (一天的毫秒数)
   * - 2440587.5 = Unix纪元(1970-01-01 00:00:00 UTC)的Julian Date
   * 
   * 坐标系转换：
   * - SGP4计算的是相对于地心的ECI坐标
   * - 需要加上地球在太阳系中的位置，转换为太阳系坐标
   * 
   * 性能优化：
   * - 节流：每秒最多更新一次，避免每帧都计算
   * - 防重复：如果上次计算还未完成，跳过本次更新
   * - 只在图层可见时更新
   * - SGP4Calculator内部实现批量计算和缓存
   * - 异步计算不会阻塞渲染线程
   * 
   * @example
   * ```typescript
   * // 在动画循环中调用
   * function animate() {
   *   satelliteLayer.update();
   *   sceneManager.render();
   *   requestAnimationFrame(animate);
   * }
   * ```
   */
  update(): void {
    if (!this.visible) {
      return;
    }
    
    // 节流：避免每帧都计算，减少性能开销
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    
    // 防止重复计算
    if (this.isCalculating) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    // 从Zustand Store获取当前时间
    const currentTime = useSolarSystemStore.getState().currentTime;
    
    // 转换为Julian Date
    // JD = (timestamp_ms / 86400000) + 2440587.5
    const timestamp = currentTime.getTime(); // 毫秒时间戳
    const julianDate = timestamp / 86400000 + 2440587.5;
    
    // 从useSatelliteStore获取可见卫星列表和TLE数据
    const satelliteState = useSatelliteStore.getState();
    const visibleSatellites = Array.from(satelliteState.visibleSatellites);
    const tleData = satelliteState.tleData;
    
    // 如果没有可见卫星，跳过计算
    if (visibleSatellites.length === 0) {
      return;
    }
    
    // 获取地球在太阳系中的位置
    const solarSystemState = useSolarSystemStore.getState();
    const earthBody = solarSystemState.celestialBodies.find((b: any) => b.name.toLowerCase() === 'earth');
    
    if (!earthBody) {
      console.warn('[SatelliteLayer] 未找到地球位置');
      return;
    }
    
    const earthPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
    
    // 更新SGP4Calculator的TLE缓存
    // 只传递可见卫星的TLE数据
    const visibleTLEs: any[] = [];
    visibleSatellites.forEach(noradId => {
      const tle = tleData.get(noradId);
      if (tle) {
        visibleTLEs.push(tle);
      }
    });
    
    // 如果没有有效的TLE数据，跳过计算
    if (visibleTLEs.length === 0) {
      return;
    }
    
    // 更新TLE缓存
    this.calculator.updateTLECache(visibleTLEs);
    
    // 标记正在计算
    this.isCalculating = true;
    
    // 使用SGP4Calculator计算所有卫星的位置
    // 这是一个异步操作，使用Web Worker进行计算
    this.calculator.calculatePositions(visibleSatellites, julianDate)
      .then((positions) => {
        console.log('[SatelliteLayer] SGP4 calculated', positions.size, 'positions');
        console.log('[SatelliteLayer] Earth position:', earthPosition.x, earthPosition.y, earthPosition.z);
        
        // 将卫星位置从地心坐标转换为太阳系坐标，并应用坐标系修正
        // 卫星位置 = 地球位置 + 旋转(相对于地心的位置)
        // 
        // 坐标系修正：X轴旋转66.56度
        // 原因：ECI坐标系的Z轴（北极）需要对齐到Three.js的赤道平面
        // 66.56° = 90° - 23.44°（地轴倾角）
        const adjustedPositions = new Map<number, any>();
        
        // 创建旋转矩阵：X轴旋转66.56度
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationX(THREE.MathUtils.degToRad(66.56));
        
        positions.forEach((state, noradId) => {
          // 应用旋转到相对位置
          const rotatedPosition = state.position.clone().applyMatrix4(rotationMatrix);
          
          // 将旋转后的相对位置加上地球在太阳系中的位置
          const adjustedPosition = rotatedPosition.add(earthPosition);
          
          console.log('[SatelliteLayer] Satellite', noradId, 
            'relative:', state.position.x, state.position.y, state.position.z,
            'adjusted:', adjustedPosition.x, adjustedPosition.y, adjustedPosition.z);
          
          adjustedPositions.set(noradId, {
            ...state,
            position: adjustedPosition
          });
        });
        
        console.log('[SatelliteLayer] Calling renderer.updatePositions with', adjustedPositions.size, 'satellites');
        
        // 计算相机到地球的距离，并根据距离调整透明度和大小
        const cameraPosition = this.sceneManager.getCamera().position;
        const distanceToEarth = cameraPosition.distanceTo(earthPosition);
        
        // 距离阈值转换为AU
        const threshold1 = 100000 / 149597870.7;   // 100千公里
        const threshold2 = 350000 / 149597870.7;   // 350千公里
        
        // 根据距离分三个阶段调整透明度和大小
        let opacity: number;
        let size: number;
        
        if (distanceToEarth < threshold1) {
          // 近距离：完全不透明，正常大小
          opacity = 1.0;
          size = satelliteConfig.rendering.pointSize;
        } else if (distanceToEarth < threshold2) {
          // 中距离：半透明，中等大小
          opacity = 1;
          size = 4;
        } else {
          // 远距离：半透明，小尺寸
          opacity = 0.2;
          size = 2;
        }
        
        // 更新渲染器的透明度和大小
        this.renderer.setOpacity(opacity);
        this.renderer.setSize(size);
        
        // 更新渲染器的位置缓冲区
        this.renderer.updatePositions(adjustedPositions);
        this.isCalculating = false;
      })
      .catch((error) => {
        console.error('[SatelliteLayer] 卫星位置计算失败:', error);
        this.isCalculating = false;
      });
  }
  
  /**
   * 设置图层可见性
   * 
   * 控制卫星点云的显示/隐藏。
   * 隐藏时不会进行位置计算，节省CPU资源。
   * 
   * @param visible - 是否可见
   * 
   * @example
   * ```typescript
   * // 隐藏卫星图层
   * satelliteLayer.setVisible(false);
   * 
   * // 显示卫星图层
   * satelliteLayer.setVisible(true);
   * ```
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.renderer.setVisible(visible);
  }
  
  /**
   * 获取渲染器实例
   * 
   * 返回SatelliteRenderer实例，用于外部访问渲染器的方法。
   * 例如显示轨道、射线投射等。
   * 
   * @returns SatelliteRenderer实例
   * 
   * @example
   * ```typescript
   * const renderer = satelliteLayer.getRenderer();
   * await renderer.showOrbit(25544, calculator);
   * ```
   */
  getRenderer(): SatelliteRenderer {
    return this.renderer;
  }
  
  /**
   * 获取计算器实例
   * 
   * 返回SGP4Calculator实例，用于外部访问计算器的方法。
   * 例如计算轨道轨迹。
   * 
   * @returns SGP4Calculator实例
   * 
   * @example
   * ```typescript
   * const calculator = satelliteLayer.getCalculator();
   * const orbit = await calculator.calculateOrbit(25544, Date.now(), 5400, 100);
   * ```
   */
  getCalculator(): SGP4Calculator {
    return this.calculator;
  }
  
  /**
   * 清理资源
   * 
   * 释放所有WebGL资源和Web Worker。
   * 应在组件卸载时调用，避免内存泄漏。
   * 
   * 清理内容：
   * - SatelliteRenderer的几何体、材质、轨道曲线
   * - SGP4Calculator的Web Worker和缓存
   * 
   * @example
   * ```typescript
   * // React组件卸载时
   * useEffect(() => {
   *   return () => {
   *     satelliteLayer.dispose();
   *   };
   * }, []);
   * ```
   */
  dispose(): void {
    this.renderer.dispose();
    this.calculator.dispose();
  }
}
