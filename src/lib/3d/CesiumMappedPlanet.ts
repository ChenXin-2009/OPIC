/**
 * Cesium 纹理映射行星渲染器 (Cesium-Mapped Planet Renderer)
 *
 * 通过深度遮罩球体将 Cesium 地球瓦片服务合成到 Three.js 场景中，
 * 用于渲染拥有高精度瓦片地图数据的非地球天体（如月球）。
 *
 * 工作原理：
 * 1. 创建一个仅写入深度的 Three.js 球体
 * 2. 将 Cesium Widget 渲染到隐藏 Canvas
 * 3. 根据相机位置同步 Cesium 相机姿态
 * 4. 将深度信息和纹理合成到最终渲染
 *
 * 使用场景：月球等有高精度地形/影像数据的天体
 */

import * as THREE from 'three';
import { CesiumEarthExtension } from '../cesium/CesiumEarthExtension';
import { CesiumAdapterConfig } from '../cesium/CesiumAdapter';
import { Planet, PlanetConfig } from './Planet';

/** Cesium 纹理映射行星配置，继承 PlanetConfig 并添加 Cesium 瓦片相关选项 */
export interface CesiumMappedPlanetConfig extends PlanetConfig {
  enableCesiumTiles?: boolean;
  cesiumConfig?: CesiumAdapterConfig;
  cesiumVisibleDistanceAu?: number;
  logLabel?: string;
}

const J2000_MS = 946728000000;

/**
 * Planet renderer that composites a Cesium globe through a depth-only Three.js sphere.
 * Used for non-Earth bodies that have tiled real-data map services, such as the Moon.
 */
export class CesiumMappedPlanet extends Planet {
  private cesiumExtension: CesiumEarthExtension | null = null;
  private originalMaterial: THREE.Material | null = null;
  private depthOnlyMaterial: THREE.Material | null = null;
  private cesiumEnabled = false;
  private cesiumCanvasVisible = false;
  private cesiumNativeCameraMode = false;
  private visibleDistanceAu: number;
  private logLabel: string;
  private _lastSyncedCameraPos = new THREE.Vector3(); // 消除黑边：追踪相机位置

  constructor(config: CesiumMappedPlanetConfig) {
    super(config);

    this.visibleDistanceAu = config.cesiumVisibleDistanceAu ?? 0.02;
    this.logLabel = config.logLabel ?? 'CesiumMappedPlanet';

    if (config.enableCesiumTiles && config.cesiumConfig) {
      try {
        this.cesiumExtension = new CesiumEarthExtension(config.cesiumConfig);

        const mesh = this.getMesh();
        if (mesh instanceof THREE.Mesh) {
          this.originalMaterial = mesh.material as THREE.Material;
        }

        this.cesiumExtension.onError((error) => {
          console.error(`[${this.logLabel}] Cesium extension error:`, error);
          if (error.name === 'CesiumInitializationError' || error.name === 'WebGLContextLostError') {
            this.fallbackToPlanetRendering();
          }
        });
      } catch (error) {
        console.error(`[${this.logLabel}] Failed to initialize Cesium extension:`, error);
        this.fallbackToPlanetRendering();
      }
    }
  }

  override updateRotation(currentTimeInDays: number, timeSpeed: number = 1, isPlaying: boolean = true): void {
    if (this.cesiumEnabled && this.cesiumExtension) {
      this.cesiumExtension.syncTime(new Date(J2000_MS + currentTimeInDays * 86400000));
    }
    super.updateRotation(currentTimeInDays, timeSpeed, isPlaying);
  }

  update(camera: THREE.Camera, _deltaTime: number): void {
    if (!this.cesiumExtension || !this.cesiumEnabled || !(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }

    const bodyPosition = this.getMesh().position;
    const distAU = camera.position.distanceTo(bodyPosition);

    if (distAU > this.visibleDistanceAu) {
      if (this.cesiumCanvasVisible) {
        this.cesiumExtension.setVisible(false);
        this.cesiumCanvasVisible = false;
        // 距离过远时恢复 Three.js 纹理材质，避免显示黑色圆
        this.restoreOriginalMaterial();
      }
      return;
    }

    if (!this.cesiumCanvasVisible) {
      this.cesiumExtension.setVisible(true);
      this.cesiumCanvasVisible = true;
      // 回到可见距离内，切换为深度-only 材质以合成 Cesium 画面
      this.applyDepthOnlyMaterial();
    }

    if (!this.cesiumNativeCameraMode) {
      this.cesiumExtension.syncCamera(camera, bodyPosition);

      // 消除黑边：检测相机快速移动，强制 Cesium 立即渲染
      const cameraPos = camera.position;
      const dx = cameraPos.x - this._lastSyncedCameraPos.x;
      const dy = cameraPos.y - this._lastSyncedCameraPos.y;
      const dz = cameraPos.z - this._lastSyncedCameraPos.z;
      const movedDistance = dx * dx + dy * dy + dz * dz;

      if (movedDistance > 1e-12) {
        this.cesiumExtension.forceRender();
        this._lastSyncedCameraPos.copy(cameraPos);
        return;
      }
    }

    this.cesiumExtension.render();
  }

  override updateSunPosition(sunPosition: THREE.Vector3): void {
    super.updateSunPosition(sunPosition);

    // 更新 3D Tiles CustomShader 的太阳方向
    // 太阳在原点 (0,0,0)，天体位置在 this.getMesh().position
    const bodyPos = this.getMesh().position;
    const sunDir = new THREE.Vector3(
      -bodyPos.x,
      -bodyPos.y,
      -bodyPos.z
    ).normalize();

    if (this.cesiumExtension) {
      this.cesiumExtension.setSunDirection(sunDir.x, sunDir.y, sunDir.z);
    }
  }

  setCesiumNativeCameraMode(enabled: boolean): void {
    this.cesiumNativeCameraMode = enabled;
  }

  syncTime(date: Date): void {
    this.cesiumExtension?.syncTime(date);
  }

  setTimeMultiplier(multiplier: number): void {
    this.cesiumExtension?.setTimeMultiplier(multiplier);
  }

  syncCamera(camera: THREE.PerspectiveCamera): void {
    this.cesiumExtension?.syncCamera(camera, this.getMesh().position);
  }

  getCesiumExtension(): CesiumEarthExtension | null {
    return this.cesiumExtension;
  }

  setCesiumEnabled(enabled: boolean, initialCamera?: THREE.PerspectiveCamera): void {
    if (!this.cesiumExtension) {
      this.cesiumEnabled = false;
      return;
    }

    const mesh = this.getMesh();
    if (!(mesh instanceof THREE.Mesh)) {
      return;
    }

    this.cesiumEnabled = enabled;

    if (enabled) {
      if (initialCamera) {
        try {
          this.cesiumExtension.syncCamera(initialCamera, mesh.position);
        } catch (error) {
          console.warn(`[${this.logLabel}] Initial camera sync failed:`, error);
        }
      }

      this.cesiumExtension.setVisible(true);
      this.cesiumCanvasVisible = true;
      mesh.visible = true;

      if (!this.depthOnlyMaterial) {
        this.depthOnlyMaterial = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 1,
          depthWrite: true,
          side: THREE.FrontSide,
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.ZeroFactor,
          blendDst: THREE.ZeroFactor,
          blendSrcAlpha: THREE.ZeroFactor,
          blendDstAlpha: THREE.ZeroFactor,
        });
      }

      mesh.renderOrder = 0;
      mesh.material = this.depthOnlyMaterial;
      return;
    }

    this.cesiumExtension.setVisible(false);
    this.cesiumCanvasVisible = false;
    if (this.originalMaterial) {
      mesh.material = this.originalMaterial;
    }
    mesh.renderOrder = 0;
    mesh.visible = true;
  }

  override applyTexture(texture: THREE.Texture | null, bodyId: string): void {
    super.applyTexture(texture, bodyId);

    const mesh = this.getMesh();
    if (mesh instanceof THREE.Mesh && !this.cesiumEnabled) {
      this.originalMaterial = mesh.material as THREE.Material;
    }
  }

  override dispose(): void {
    this.cesiumExtension?.dispose();
    this.cesiumExtension = null;

    if (this.depthOnlyMaterial) {
      this.depthOnlyMaterial.dispose();
      this.depthOnlyMaterial = null;
    }

    super.dispose();
  }

  private restoreOriginalMaterial(): void {
    const mesh = this.getMesh();
    if (mesh instanceof THREE.Mesh && this.originalMaterial) {
      mesh.material = this.originalMaterial;
    }
  }

  private applyDepthOnlyMaterial(): void {
    if (!this.depthOnlyMaterial) return;
    const mesh = this.getMesh();
    if (mesh instanceof THREE.Mesh) {
      mesh.material = this.depthOnlyMaterial;
    }
  }

  private fallbackToPlanetRendering(): void {
    this.cesiumExtension?.dispose();
    this.cesiumExtension = null;
    this.cesiumEnabled = false;

    const mesh = this.getMesh();
    if (mesh instanceof THREE.Mesh) {
      if (this.originalMaterial) {
        mesh.material = this.originalMaterial;
      }
      mesh.visible = true;
    }
  }
}
