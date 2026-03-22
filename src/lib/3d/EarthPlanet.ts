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
  private cesiumCanvasVisible: boolean = false; // 跟踪 canvas 可见状态，避免重复调用
  
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

        if (distAU > 0.1) {
          // 太远时隐藏 Cesium canvas（避免显示过时画面），但保持状态
          if (this.cesiumCanvasVisible) {
            this.cesiumExtension.setVisible(false);
            this.cesiumCanvasVisible = false;
          }
          return;
        }

        // 靠近时确保 canvas 可见（只在状态变化时调用，避免每帧 resize）
        if (!this.cesiumCanvasVisible) {
          this.cesiumExtension.setVisible(true);
          this.cesiumCanvasVisible = true;
        }

        // 1. 将 Three.js 相机同步到 Cesium（OrbitControls 驱动，Cesium 跟随）
        this.cesiumExtension.syncCamera(camera, earthPos);
        
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
      this.cesiumCanvasVisible = true;
      // 保留 mesh 可见但换成 depth-only 材质：
      // - 写入深度缓冲，让地球后面的卫星被正确遮挡
      // - 不写颜色（colorWrite=false），地球区域透明，Cesium 地球从下层透出来
      // renderOrder=-2000：比天空盒(-1000)更先渲染，确保深度值在天空盒渲染前已写入
      mesh.visible = true;
      if (this.originalMaterial) {
        const depthOnlyMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 1,
          depthWrite: true,
          side: THREE.FrontSide,
          // 自定义混合：把地球区域的 RGBA 全部写为 0（完全透明）
          // 这样 Cesium canvas 从下层透出，而不是被天空盒颜色覆盖
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.ZeroFactor,
          blendDst: THREE.ZeroFactor,
          blendSrcAlpha: THREE.ZeroFactor,
          blendDstAlpha: THREE.ZeroFactor,
        });
        mesh.renderOrder = 0;
        mesh.material = depthOnlyMat;
      }
      console.log('[EarthPlanet] Cesium enabled, mesh switched to depth-only');
    } else {
      // 禁用 Cesium: 隐藏 Cesium canvas，恢复 Planet 球体材质
      console.log('[EarthPlanet] Disabling Cesium canvas overlay');
      this.cesiumExtension.setVisible(false);
      this.cesiumCanvasVisible = false;
      if (this.originalMaterial) {
        mesh.material = this.originalMaterial;
      }
      mesh.renderOrder = 0; // 恢复默认渲染顺序
      mesh.visible = true;
      console.log('[EarthPlanet] Cesium disabled, planet mesh restored');
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
