import * as THREE from 'three';
import { CesiumEarthExtension } from '../cesium/CesiumEarthExtension';
import { CesiumAdapterConfig } from '../cesium/CesiumAdapter';
import { Planet, PlanetConfig } from './Planet';

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
      }
      return;
    }

    if (!this.cesiumCanvasVisible) {
      this.cesiumExtension.setVisible(true);
      this.cesiumCanvasVisible = true;
    }

    if (!this.cesiumNativeCameraMode) {
      this.cesiumExtension.syncCamera(camera, bodyPosition);
    }

    this.cesiumExtension.render();
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
