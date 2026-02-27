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
import { OrbitalInterpolator } from '../performance/OrbitalInterpolator';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { QualityController } from '../performance/QualityController';
import { logDebug, logError } from '../performance/performanceConfig';

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
  
  // 性能优化组件（使用轨道动力学插值器）
  private interpolator: OrbitalInterpolator;
  private performanceMonitor: PerformanceMonitor;
  private qualityController: QualityController;
  
  // 双缓冲：存储完整的卫星状态
  private satelliteStates: Map<number, any>;
  
  // 计算调度
  private nextCalculationTime: number = 0;
  private isCalculating: boolean = false;
  
  /**
   * 创建卫星图层实例
   * 
   * @param sceneManager - 场景管理器实例
   */
  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.renderer = new SatelliteRenderer(sceneManager);
    this.calculator = new SGP4Calculator();
    
    // 初始化性能优化组件（使用轨道动力学插值器）
    this.interpolator = new OrbitalInterpolator(true); // 启用轨道动力学
    this.performanceMonitor = new PerformanceMonitor();
    this.qualityController = new QualityController(this.performanceMonitor);
    
    // 初始化卫星状态存储
    this.satelliteStates = new Map();
    
    // 设置首次计算时间为当前模拟时间
    const currentSimulatedTime = useSolarSystemStore.getState().currentTime.getTime();
    this.nextCalculationTime = currentSimulatedTime;
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
    
    // 开始性能监控
    this.performanceMonitor.beginFrame();
    
    // 使用模拟时间而不是实际时间
    const solarSystemState = useSolarSystemStore.getState();
    const currentSimulatedTime = solarSystemState.currentTime.getTime();
    
    // 1. 检查是否需要触发新的 SGP4 计算
    if (currentSimulatedTime >= this.nextCalculationTime && !this.isCalculating) {
      this.scheduleCalculation();
    }
    
    // 2. 获取插值位置（使用模拟时间）
    const interpolationStart = performance.now();
    const interpolatedPositions = this.interpolator.getInterpolatedPositions(currentSimulatedTime);
    this.performanceMonitor.recordInterpolation(performance.now() - interpolationStart);
    
    // 3. 如果有插值位置，更新渲染器；否则隐藏
    if (interpolatedPositions.size > 0) {
      // 获取地球位置
      const solarSystemState = useSolarSystemStore.getState();
      const earthBody = solarSystemState.celestialBodies.find((b: any) => b.name.toLowerCase() === 'earth');
      
      if (earthBody) {
        const earthPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
        
        // 创建旋转矩阵：X轴旋转66.56度
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationX(THREE.MathUtils.degToRad(66.56));
        
        // 转换为太阳系坐标，并保留完整的卫星状态
        const adjustedPositions = new Map<number, any>();
        interpolatedPositions.forEach((position, noradId) => {
          const rotatedPosition = position.clone().applyMatrix4(rotationMatrix);
          const adjustedPosition = rotatedPosition.add(earthPosition);
          
          // 从保存的状态获取完整的卫星信息
          const savedState = this.satelliteStates.get(noradId);
          if (savedState) {
            adjustedPositions.set(noradId, {
              ...savedState,
              position: adjustedPosition,
            });
          } else {
            // 如果没有保存的状态，创建一个基本状态
            adjustedPositions.set(noradId, {
              noradId,
              position: adjustedPosition,
              orbitType: 'LEO' as any, // 默认轨道类型
            });
          }
        });
        
        // 更新渲染器
        const uploadStart = performance.now();
        this.renderer.updatePositions(adjustedPositions as any);
        this.performanceMonitor.recordGPUUpload(performance.now() - uploadStart);
        
        // 更新相机距离相关的透明度和大小
        const cameraPosition = this.sceneManager.getCamera().position;
        const distanceToEarth = cameraPosition.distanceTo(earthPosition);
        
        // 人造卫星可见性阈值
        const visibilityThreshold = 5000000 / 149597870.7; // 5,000,000 km in AU (完全不可见)
        const fadeThreshold = 1000000 / 149597870.7; // 1,000,000 km in AU (开始渐隐)
        
        // 计算可见性和透明度
        const isVisibleByDistance = distanceToEarth < visibilityThreshold;
        let opacity: number;
        let size: number;
        
        if (!isVisibleByDistance) {
          // 超出可见范围，完全隐藏
          opacity = 0;
          size = 0;
          this.renderer.setVisible(false);
        } else {
          // 在可见范围内，显示卫星
          this.renderer.setVisible(true);
          
          if (distanceToEarth < fadeThreshold) {
            // 近距离：完全不透明
            opacity = 1.0;
            size = satelliteConfig.rendering.pointSize;
          } else {
            // 渐隐区域：从 fadeThreshold 到 visibilityThreshold 线性渐隐
            const fadeRange = visibilityThreshold - fadeThreshold;
            const fadeDistance = distanceToEarth - fadeThreshold;
            opacity = 1.0 - (fadeDistance / fadeRange);
            size = satelliteConfig.rendering.pointSize * opacity;
          }
        }
        
        this.renderer.setOpacity(opacity);
        this.renderer.setSize(size);
      }
    } else {
      // 没有插值位置时，隐藏渲染器
      this.renderer.setVisible(false);
    }
    
    // 4. 自适应质量控制
    this.qualityController.adjustQuality();
    
    // 5. 更新性能监控器的卫星数量
    this.performanceMonitor.setSatelliteCount(interpolatedPositions.size);
    this.performanceMonitor.setVisibleSatelliteCount(interpolatedPositions.size);
    
    // 结束性能监控
    this.performanceMonitor.endFrame();
    
    // 输出性能指标（仅开发环境）
    const metrics = this.performanceMonitor.getMetrics();
    logDebug(
      `[SatelliteLayer] FPS: ${metrics.fps.toFixed(1)}, ` +
      `Frame: ${metrics.frameTime.toFixed(2)}ms, ` +
      `Interpolation: ${metrics.interpolationTime.toFixed(2)}ms, ` +
      `Satellites: ${metrics.satelliteCount}`
    );
  }
  
  /**
   * 触发 SGP4 计算
   * 
   * 根据质量设置的更新间隔触发计算。
   * 计算完成后更新插值器的目标位置。
   */
  private scheduleCalculation(): void {
    // 从 Zustand Store 获取当前模拟时间
    const solarSystemState = useSolarSystemStore.getState();
    const currentTime = solarSystemState.currentTime;
    
    // 转换为 Julian Date
    const timestamp = currentTime.getTime();
    const julianDate = timestamp / 86400000 + 2440587.5;
    
    // 从 useSatelliteStore 获取可见卫星列表和 TLE 数据
    const satelliteState = useSatelliteStore.getState();
    const visibleSatellites = Array.from(satelliteState.visibleSatellites);
    const tleData = satelliteState.tleData;
    
    // 如果没有可见卫星，跳过计算
    if (visibleSatellites.length === 0) {
      // 设置下次计算时间（使用模拟时间）
      const settings = this.qualityController.getSettings();
      this.nextCalculationTime = timestamp + settings.updateInterval;
      return;
    }
    
    // 收集可见卫星的 TLE 数据
    const visibleTLEs: any[] = [];
    visibleSatellites.forEach(noradId => {
      const tle = tleData.get(noradId);
      if (tle) {
        visibleTLEs.push(tle);
      }
    });
    
    // 如果没有有效的 TLE 数据，跳过计算
    if (visibleTLEs.length === 0) {
      const settings = this.qualityController.getSettings();
      this.nextCalculationTime = timestamp + settings.updateInterval;
      return;
    }
    
    // 更新 TLE 缓存
    this.calculator.updateTLECache(visibleTLEs);
    
    // 标记正在计算
    this.isCalculating = true;
    
    // 记录计算开始时间
    const calculationStart = performance.now();
    
    // 使用 SGP4Calculator 计算所有卫星的位置
    this.calculator.calculatePositions(visibleSatellites, julianDate)
      .then((positions) => {
        // 记录计算耗时
        this.performanceMonitor.recordSGP4Calculation(performance.now() - calculationStart);
        
        logDebug('[SatelliteLayer] SGP4 calculated', positions.size, 'positions');
        
        // 清除不在可见列表中的卫星数据
        const visibleSet = new Set(visibleSatellites);
        const toRemove: number[] = [];
        
        this.satelliteStates.forEach((_, noradId) => {
          if (!visibleSet.has(noradId)) {
            toRemove.push(noradId);
          }
        });
        
        toRemove.forEach(noradId => {
          this.satelliteStates.delete(noradId);
          this.interpolator.clear(noradId);
        });
        
        if (toRemove.length > 0) {
          logDebug('[SatelliteLayer] Removed', toRemove.length, 'invisible satellites');
        }
        
        // 获取质量设置
        const settings = this.qualityController.getSettings();
        // 下次计算时间 = 当前模拟时间 + 更新间隔
        const nextCalcTime = timestamp + settings.updateInterval;
        
        // 更新插值器的目标位置，并保存完整的卫星状态
        positions.forEach((state, noradId) => {
          // 保存完整的卫星状态（包括 orbitType 等信息）
          this.satelliteStates.set(noradId, {
            noradId: state.noradId,
            name: state.name,
            orbitType: state.orbitType,
            category: state.category,
            altitude: state.altitude,
            orbitalElements: state.orbitalElements,
            velocity: state.velocity,
            position: state.position,
          });
          
          // 设置插值目标（使用模拟时间，传入位置和速度）
          this.interpolator.setTarget(
            noradId,
            state.position.clone(),
            state.velocity.clone(),
            nextCalcTime
          );
        });
        
        // 同步到Store（供详情面板使用）
        const storeUpdate = new Map();
        this.satelliteStates.forEach((state, noradId) => {
          storeUpdate.set(noradId, state);
        });
        useSatelliteStore.getState().updateSatelliteStates(storeUpdate);
        
        // 设置下次计算时间
        this.nextCalculationTime = nextCalcTime;
        this.isCalculating = false;
      })
      .catch((error) => {
        logError('[SatelliteLayer] 卫星位置计算失败:', error);
        
        // 设置下次计算时间（即使失败也要继续尝试）
        const settings = this.qualityController.getSettings();
        this.nextCalculationTime = timestamp + settings.updateInterval;
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
    this.interpolator.clearAll();
    this.performanceMonitor.reset();
    this.qualityController.reset();
  }
}
