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
  private originalMaterial: THREE.Material | null = null; // 保存原始材质
  private cesiumEnabled: boolean = false; // 跟踪 Cesium 状态
  
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
   * 重写 updateRotation - Cesium 启用时跳过旋转（Cesium 直接渲染地球）
   */
  override updateRotation(currentTimeInDays: number, timeSpeed: number = 1, isPlaying: boolean = true): void {
    if (this.cesiumEnabled) {
      return; // Cesium 启用时不旋转 Planet mesh
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
        // 1. 将 Three.js 相机同步到 Cesium（OrbitControls 驱动，Cesium 跟随）
        this.cesiumExtension.syncCamera(camera, this.getMesh().position);
        
        // 2. 渲染 Cesium 场景
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
   */
  setCesiumEnabled(enabled: boolean, initialCamera?: THREE.PerspectiveCamera): void {
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
          this.cesiumExtension.syncCamera(initialCamera, mesh.position);
          console.log('[EarthPlanet] Initial camera synced Three.js → Cesium');
        } catch (e) {
          console.warn('[EarthPlanet] Initial camera sync failed:', e);
        }
      }
      this.cesiumExtension.setVisible(true);
      mesh.visible = false;
      console.log('[EarthPlanet] Cesium enabled, planet mesh hidden');
    } else {
      // 禁用 Cesium: 隐藏 Cesium canvas，显示 Planet 球体
      console.log('[EarthPlanet] Disabling Cesium canvas overlay');
      this.cesiumExtension.setVisible(false);
      mesh.visible = true;
      console.log('[EarthPlanet] Cesium disabled, planet mesh visible');
    }
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
