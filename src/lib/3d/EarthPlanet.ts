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
/**
 * EarthPlanet - 地球行星类
 */
export class EarthPlanet extends Planet {
  private cesiumExtension: CesiumEarthExtension | null = null;
  private originalMaterial: THREE.Material | null = null;
  private cesiumEnabled: boolean = false;
  private cesiumCanvasVisible: boolean = false;
  private cesiumNativeCameraMode: boolean = false; // 是否使用 Cesium 原生相机模式
  private _lastSyncedCameraPos = new THREE.Vector3(); // 上次同步时的相机位置，用于检测快速移动
  
  constructor(config: EarthPlanetConfig) {
    super(config);

    
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
  update(camera: THREE.Camera, _deltaTime: number): void {
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

        // 只在 Three.js 主导模式下同步相机（Three.js → Cesium）
        // 在 Cesium 原生相机模式下，不要同步，让 Cesium 完全控制相机
        if (!this.cesiumNativeCameraMode) {
          this.cesiumExtension.syncCamera(camera, earthPos);
          
          // 消除黑边：检测相机快速移动，强制 Cesium 立即渲染
          // 避免 Cesium 30fps 节流导致的画面比 Three.js 延迟一帧
          const cameraPos = camera.position;
          const dx = cameraPos.x - this._lastSyncedCameraPos.x;
          const dy = cameraPos.y - this._lastSyncedCameraPos.y;
          const dz = cameraPos.z - this._lastSyncedCameraPos.z;
          const movedDistance = dx * dx + dy * dy + dz * dz;
          
          if (movedDistance > 1e-12) {
            this.cesiumExtension.forceRender();
            this._lastSyncedCameraPos.copy(cameraPos);
            return; // forceRender 已经 render 了，跳过下面的普通 render
          }
        }
        
        // 总是渲染 Cesium
        this.cesiumExtension.render();
      }
    }
  }
  
  /**
   * 设置是否使用 Cesium 原生相机模式
   * 
   * @param enabled - true: Cesium 控制相机，false: Three.js 控制相机
   */
  setCesiumNativeCameraMode(enabled: boolean): void {
    this.cesiumNativeCameraMode = enabled;
    // 进入 Cesium 主导时切到 depth-only 材质；退出时恢复原始纹理材质。
    // 这保证 Three.js 主导下地球网格有颜色可见，Cesium 主导下透明让 Cesium 透出。
    if (enabled) {
      this.applyDepthOnlyMaterial();
    } else {
      this.restorePlanetMaterial();
    }
  }

  /**
   * 恢复 Planet 球体原始材质（从 depth-only 切回纹理），不隐藏 Cesium canvas。
   * 用于从 Cesium 主导切换到 Three.js 主导时恢复地球可见性。
   */
  restorePlanetMaterial(): void {
    const mesh = this.getMesh();
    if (!(mesh instanceof THREE.Mesh)) return;
    if (this.originalMaterial) {
      mesh.material = this.originalMaterial;
    }
    mesh.renderOrder = 0;
    mesh.visible = true;
  }

  /**
   * 切换到 depth-only 材质（Cesium 主导时使用）。
   * 地球区域透明（colorWrite 为零），只写深度，让 Cesium canvas 从下层透出。
   */
  private applyDepthOnlyMaterial(): void {
    const mesh = this.getMesh();
    if (!(mesh instanceof THREE.Mesh)) return;
    // 保存原始材质（仅首次）
    if (!this.originalMaterial) {
      this.originalMaterial = mesh.material as THREE.Material;
    }
    // 如果已经是 depth-only 就不重复创建
    if (mesh.material !== this.originalMaterial) return;
    const depthOnlyMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide,
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
