/**
 * EarthPlanet - 扩展 Planet 类的地球渲染器
 * 
 * 集成 Cesium 瓦片渲染，根据相机距离自动切换渲染模式
 */

import * as THREE from 'three';
import { Planet, PlanetConfig } from './Planet';
import { CesiumEarthExtension } from '../cesium/CesiumEarthExtension';
import { CesiumAdapterConfig } from '../cesium/CesiumAdapter';

/**
 * 地球行星配置接口
 */
export interface EarthPlanetConfig extends PlanetConfig {
  // Cesium 集成配置
  enableCesiumTiles?: boolean;
  cesiumConfig?: CesiumAdapterConfig;
  
  // 距离阈值配置（千米）
  cesiumVisibleDistance?: number; // Cesium 完全可见距离（默认 2000km）
  transitionStartDistance?: number; // 过渡开始距离（默认 1800km）
  transitionEndDistance?: number; // 过渡结束距离（默认 2500km）
}

/**
 * AU 到千米的转换常量
 */
const AU_TO_KM = 149597870.7;

/**
 * EarthPlanet - 地球行星类
 */
export class EarthPlanet extends Planet {
  private cesiumExtension: CesiumEarthExtension | null = null;
  private config: EarthPlanetConfig;
  private originalMaterial: THREE.Material | null = null;
  private cesiumEnabled: boolean = false;
  private cesiumCanvasVisible: boolean = false;
  
  constructor(config: EarthPlanetConfig) {
    super(config);
    
    this.config = {
      cesiumVisibleDistance: 2000, // km - 恢复设计规范
      transitionStartDistance: 1800, // km
      transitionEndDistance: 2500, // km
      ...config
    };

    
    // 初始化 Cesium 扩展
    if (config.enableCesiumTiles && config.cesiumConfig) {
      try {
        this.cesiumExtension = new CesiumEarthExtension(config.cesiumConfig);
        
        // 保存原始材质
        const mesh = this.getMesh();
        if (mesh instanceof THREE.Mesh) {
          this.originalMaterial = mesh.material as THREE.Material;
        }
        
        // 监听错误 — 只在初始化失败时 fallback，渲染错误不 fallback
        this.cesiumExtension.onError((error) => {
          console.error('Cesium extension error:', error);
          // 只有初始化错误才 fallback（渲染错误不销毁扩展）
          if (error.name === 'CesiumInitializationError' || error.name === 'WebGLContextLostError') {
            this.fallbackToPlanetRendering();
          }
        });
      } catch (error) {
        console.error('Failed to initialize Cesium extension:', error);
        this.fallbackToPlanetRendering();
      }
    }
  }
  
  /**
   * 重写 updateRotation - Cesium 启用时同步仿真时间到 Cesium clock（驱动地球自转）
   */
  override updateRotation(currentTimeInDays: number, timeSpeed: number = 1, isPlaying: boolean = true): void {
    if (this.cesiumEnabled) {
      // 把仿真时间同步给 Cesium clock，Cesium 用它驱动 ECEF 参考系（地球自转）
      if (this.cesiumExtension) {
        // currentTimeInDays 是 J2000.0 以来的天数，J2000.0 = 2000-01-01T12:00:00Z
        const J2000_MS = 946728000000; // 2000-01-01T12:00:00Z in ms since epoch
        const simDate = new Date(J2000_MS + currentTimeInDays * 86400000);
        this.cesiumExtension.syncTime(simDate);
      }
      // Cesium 模式下仍然更新 mesh.quaternion，供 earth-lock 计算旋转增量使用
      // mesh 本身不可见（depth-only 材质），所以视觉上没有影响
      super.updateRotation(currentTimeInDays, timeSpeed, isPlaying);
      return;
    }
    super.updateRotation(currentTimeInDays, timeSpeed, isPlaying);
  }

  /**
   * 更新地球渲染
   * 
   * @param camera - Three.js 相机
   * @param deltaTime - 时间增量（秒）
   */
  update(camera: THREE.Camera, deltaTime: number): void {
    if (this.cesiumExtension && this.cesiumEnabled) {
      if (camera instanceof THREE.PerspectiveCamera) {
        const earthPos = this.getMesh().position;
        const distAU = camera.position.distanceTo(earthPos);

        // 移除距离检查 - Cesium canvas 始终可见（只要 cesiumEnabled=true）
        // 这样无论远近，Cesium 地球都会显示
        
        // 确保 canvas 可见（只在状态变化时调用，避免每帧 resize）
        if (!this.cesiumCanvasVisible) {
          this.cesiumExtension.setVisible(true);
          this.cesiumCanvasVisible = true;
        }

        // 检查当前是否为 Cesium 主导模式
        const cesiumNativeEnabled = this.cesiumExtension.getNativeCameraEnabled();
        
        if (!cesiumNativeEnabled) {
          // Three.js 主导模式：Three.js OrbitControls 驱动，同步到 Cesium
          this.cesiumExtension.syncCamera(camera, earthPos);
        }
        // 如果是 Cesium 主导模式，不执行正向同步
        // 反向同步（Cesium → Three.js）在 SolarSystemCanvas3D 的渲染循环中处理
        
        // 无论哪种模式，都需要渲染 Cesium
        this.cesiumExtension.render();
      }
    }
  }
  
  /**
   * 同步时间到 Cesium
   */
  syncTime(date: Date): void {
    if (this.cesiumExtension) {
      this.cesiumExtension.syncTime(date);
    }
  }
  
  /**
   * 设置时间倍率
   */
  setTimeMultiplier(multiplier: number): void {
    if (this.cesiumExtension) {
      this.cesiumExtension.setTimeMultiplier(multiplier);
    }
  }
  
  /**
   * 同步相机到 Cesium
   */
  syncCamera(camera: THREE.PerspectiveCamera): void {
    if (this.cesiumExtension) {
      this.cesiumExtension.syncCamera(camera, this.getMesh().position);
    }
  }

  
  /**
   * 更新渲染模式（不再根据距离控制，完全由 setCesiumEnabled 控制）
   */
  private updateRenderMode(distanceKm: number): void {
    // 不再根据距离自动切换渲染模式
    // 渲染模式完全由用户通过 setCesiumEnabled() 控制
  }
  
  /**
   * 降级到 Planet 球体渲染
   */
  private fallbackToPlanetRendering(): void {
    console.warn('Falling back to Planet sphere rendering');
    
    // 清理 Cesium 扩展
    if (this.cesiumExtension) {
      this.cesiumExtension.dispose();
      this.cesiumExtension = null;
    }
    
    // 确保 Planet 球体可见
    const mesh = this.getMesh();
    if (mesh instanceof THREE.Mesh) {
      mesh.visible = true;
    }
  }
  
  /**
   * 获取 Cesium 扩展（用于测试）
   */
  getCesiumExtension(): CesiumEarthExtension | null {
    return this.cesiumExtension;
  }
  
  /**
   * 启用或禁用 Cesium 渲染
   * 当启用时，在任何距离都使用 Cesium 渲染
   * 当禁用时，使用 Planet 球体渲染
   * 
   * @param enabled - 是否启用 Cesium
   * @param initialCamera - 启用时用于初始同步的 Three.js 相机（可选）
   * @param cameraController - 相机控制器（用于恢复 OrbitControls 状态）
   */
  setCesiumEnabled(enabled: boolean, initialCamera?: THREE.PerspectiveCamera, cameraController?: any): void {
    console.log(`[EarthPlanet] setCesiumEnabled called with: ${enabled}`);
    
    if (!this.cesiumExtension) {
      console.warn('[EarthPlanet] No Cesium extension available — cannot enable Cesium');
      this.cesiumEnabled = false;
      return;
    }
    
    const mesh = this.getMesh();
    if (!(mesh instanceof THREE.Mesh)) {
      console.warn('[EarthPlanet] Mesh is not a THREE.Mesh');
      return;
    }
    
    this.cesiumEnabled = enabled;
    
    if (enabled) {
      // 启用 Cesium: 先同步相机（Three.js → Cesium），再显示 canvas
      if (initialCamera) {
        try {
          // ⚠️ 关键修复：启用时先同步相机状态，避免相机跳变
          // 使用当前 Three.js 相机的位置和朝向初始化 Cesium 相机
          this.cesiumExtension.syncCamera(initialCamera, mesh.position);
          console.log('[EarthPlanet] Initial camera synced Three.js → Cesium');
          
          // 等待一帧，确保 Cesium 相机状态已更新
          requestAnimationFrame(() => {
            // 再次同步，确保状态一致
            if (initialCamera && this.cesiumExtension) {
              this.cesiumExtension.syncCamera(initialCamera, mesh.position);
            }
          });
        } catch (e) {
          console.warn('[EarthPlanet] Initial camera sync failed:', e);
        }
      }
      this.cesiumExtension.setVisible(true);
      this.cesiumCanvasVisible = true;
      
      // 切换到 depth-only 材质
      this.switchToDepthOnlyMaterial();
      console.log('[EarthPlanet] Cesium enabled, mesh switched to depth-only');
    } else {
      // 禁用 Cesium: 隐藏 Cesium canvas，恢复 Planet 球体材质
      console.log('[EarthPlanet] Disabling Cesium canvas overlay');
      
      // ⚠️ 关键修复：如果正处于 Cesium 主导模式，需要先退出该模式
      // 这样可以确保 OrbitControls 被重新启用
      const wasInCesiumPrimaryMode = this.cesiumExtension.getNativeCameraEnabled();
      if (wasInCesiumPrimaryMode) {
        console.log('[EarthPlanet] Exiting Cesium primary mode before disabling Cesium');
        
        // 1. 禁用 Cesium 原生相机控制
        this.cesiumExtension.setNativeCameraEnabled(false);
        
        // 2. 如果提供了 cameraController，恢复 OrbitControls
        if (cameraController && typeof cameraController.setCesiumPrimaryMode === 'function') {
          cameraController.setCesiumPrimaryMode(false);
          console.log('[EarthPlanet] OrbitControls restored via CameraController');
        }
      }
      
      // 隐藏 Cesium canvas
      this.cesiumExtension.setVisible(false);
      this.cesiumCanvasVisible = false;
      
      // 恢复原始材质
      this.restoreOriginalMaterial();
      console.log('[EarthPlanet] Cesium disabled, planet mesh restored');
    }
  }
  
  /**
   * 切换到 depth-only 材质
   * 用于 Cesium 主导模式，让 Cesium 地球从下层透出
   */
  private switchToDepthOnlyMaterial(): void {
    const mesh = this.getMesh();
    if (!(mesh instanceof THREE.Mesh)) return;
    
    // 保存原始材质（如果还没保存）
    if (!this.originalMaterial) {
      this.originalMaterial = mesh.material as THREE.Material;
    }
    
    // 创建 depth-only 材质
    const depthOnlyMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 1,
      depthWrite: true,
      side: THREE.FrontSide,
      // 自定义混合：把地球区域的 RGBA 全部写为 0（完全透明）
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.ZeroFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.ZeroFactor,
    });
    
    mesh.material = depthOnlyMat;
    mesh.renderOrder = 0;
    mesh.visible = true;
  }
  
  /**
   * 恢复原始材质
   * 用于退出 Cesium 主导模式，恢复 Three.js 地球渲染
   */
  private restoreOriginalMaterial(): void {
    const mesh = this.getMesh();
    if (!(mesh instanceof THREE.Mesh) || !this.originalMaterial) return;
    
    mesh.material = this.originalMaterial;
    mesh.renderOrder = 0;
    mesh.visible = true;
  }
  
  /**
   * 启用或禁用 Cesium 原生相机控制
   * 
   * @param enabled - 是否启用 Cesium 原生相机控制
   */
  setCesiumNativeCameraEnabled(enabled: boolean): void {
    if (!this.cesiumExtension) {
      console.warn('[EarthPlanet] No Cesium extension available');
      return;
    }
    
    this.cesiumExtension.setNativeCameraEnabled(enabled);
    
    // 注意：材质切换由 setCesiumEnabled 控制，这里只切换相机控制权
    // 无论相机由谁控制，只要 cesiumEnabled=true，就应该显示 Cesium 地球
    if (this.cesiumEnabled) {
      // Cesium 已启用时，始终使用 depth-only 材质
      this.switchToDepthOnlyMaterial();
    }
  }
  
  /**
   * 获取当前 Cesium 模式状态
   * 
   * @returns 包含 cesiumEnabled 和 nativeCameraEnabled 的状态对象
   */
  getCesiumModeState(): {
    cesiumEnabled: boolean;
    nativeCameraEnabled: boolean;
  } {
    return {
      cesiumEnabled: this.cesiumEnabled,
      nativeCameraEnabled: this.cesiumExtension?.getNativeCameraEnabled() || false
    };
  }
  
  /**
   * 清理资源
   */
  override dispose(): void {
    if (this.cesiumExtension) {
      this.cesiumExtension.dispose();
      this.cesiumExtension = null;
    }
    
    super.dispose();
  }
  
  /**
   * 重写 applyTexture - 始终应用纹理到 Planet 球体
   * 无论 Cesium 是否存在，Planet 球体都需要纹理作为 fallback
   */
  override applyTexture(texture: THREE.Texture | null, bodyId: string): void {
    // 始终应用纹理到 Planet 球体（作为 fallback）
    super.applyTexture(texture, bodyId);
    
    // 应用纹理后，保存当前材质作为原始材质
    const mesh = this.getMesh();
    if (mesh instanceof THREE.Mesh && !this.cesiumEnabled) {
      this.originalMaterial = mesh.material as THREE.Material;
    }
  }
  
  /**
   * 重写 applyNightTexture - 始终应用夜间纹理到 Planet 球体
   * 无论 Cesium 是否存在，Planet 球体都需要夜间纹理作为 fallback
   */
  override applyNightTexture(texture: THREE.Texture | null): void {
    // 始终应用夜间纹理到 Planet 球体（作为 fallback）
    super.applyNightTexture(texture);
  }
}
