/**
 * 天空盒管理器 (Skybox Manager)
 *
 * 管理 Three.js 场景中的天空盒（星空背景）。
 * 加载银河系全景贴图作为天空盒纹理，并在加载失败时回退到程序化星空。
 *
 * 特性：
 * - 加载 8K 银河系星空贴图（webp 格式）
 * - 内置贴图朝向校准（旋转角度经手工调整）
 * - 回退机制：贴图加载失败时使用点粒子星空
 * - 透明度控制：支持与其他渲染层的淡入淡出协调
 */

import * as THREE from 'three';
import { TextureLoadError } from '@/lib/errors/base';
import { logError } from '@/lib/utils/errors';
import { SCALE_VIEW_CONFIG } from '@/lib/config/galaxyConfig';

const MILKY_WAY_TEXTURE_PATH = '/textures/planets/8k_stars_milky_way.webp';

const MILKY_WAY_ORIENTATION = {
  rotationX: -141.5,
  rotationY: 8,
  rotationZ: 123.4,
};

/**
 * 天空盒管理器 — 加载银河系贴图作为星空背景，失败时回退到点粒子星空。
 */
export class SkyboxManager {
  private skybox: THREE.Mesh | null = null;
  private fallbackStarfield: THREE.Points | null = null;
  private scene: THREE.Scene;
  opacity: number = 1;


  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createMilkyWaySkybox();
  }

  private createMilkyWaySkybox(): void {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      MILKY_WAY_TEXTURE_PATH,
      (texture) => this.onSkyboxTextureLoaded(texture),
      undefined,
      (error) => this.onSkyboxTextureError(error)
    );
  }

  private onSkyboxTextureLoaded(texture: THREE.Texture): void {
    this.configureSkyboxTexture(texture);
    const geometry = this.createSkyboxGeometry();
    const material = this.createSkyboxMaterial(texture);
    this.skybox = new THREE.Mesh(geometry, material);
    this.configureSkyboxMesh(this.skybox);
    this.applySkyboxOrientation(this.skybox);
    this.scene.add(this.skybox);
  }

  private configureSkyboxTexture(texture: THREE.Texture): void {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
  }

  private createSkyboxGeometry(): THREE.SphereGeometry {
    return new THREE.SphereGeometry(5e5, 64, 32);
  }

  private createSkyboxMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
  }

  private configureSkyboxMesh(skybox: THREE.Mesh): void {
    skybox.renderOrder = -1000;
    skybox.userData.isSkybox = true;
    skybox.userData.fixedToCamera = true;
    skybox.layers.set(1);
  }

  private applySkyboxOrientation(skybox: THREE.Mesh): void {
    const degToRad = Math.PI / 180;
    skybox.rotation.x = MILKY_WAY_ORIENTATION.rotationX * degToRad;
    skybox.rotation.y = MILKY_WAY_ORIENTATION.rotationY * degToRad;
    skybox.rotation.z = MILKY_WAY_ORIENTATION.rotationZ * degToRad;
  }

  private onSkyboxTextureError(error: unknown): void {
    const textureError = new TextureLoadError(
      'Failed to load Milky Way skybox texture',
      { path: MILKY_WAY_TEXTURE_PATH, originalError: error }
    );
    logError(textureError, { component: 'SceneManager', operation: 'createMilkyWaySkybox' });
    this.createFallbackStarfield();
  }

  private createFallbackStarfield(): void {
    const starCount = 2000;
    const stars = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      stars[i * 3] = Math.sin(phi) * Math.cos(theta);
      stars[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      stars[i * 3 + 2] = Math.cos(phi);
      starSizes[i] = Math.random() * 1.5 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: false,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    });

    this.fallbackStarfield = new THREE.Points(geometry, material);
    this.fallbackStarfield.renderOrder = -1000;
    this.fallbackStarfield.userData.isStarfield = true;
    this.fallbackStarfield.userData.fixedToCamera = true;
    this.scene.add(this.fallbackStarfield);
  }

  updatePosition(cameraPosition: THREE.Vector3): void {
    if (this.skybox) {
      this.skybox.position.copy(cameraPosition);
    }
  }

  updateOpacity(cameraDistance: number, cesiumCompositeMode: boolean): void {
    // Cesium 主导时 Three.js canvas 必须完全透明，才能让底层地球、大气和雾
    // 正确透出；天空盒即使是黑色也会把 Cesium 画面整个盖住。
    if (cesiumCompositeMode) {
      if (this.skybox) this.skybox.visible = false;
      if (this.fallbackStarfield) this.fallbackStarfield.visible = false;
      return;
    }

    const fadeEnd = 0.7 * 63241.077;
    let targetOpacity = 1;
    if (cameraDistance < SCALE_VIEW_CONFIG.milkyWayBackgroundFadeStart) {
      targetOpacity = 1;
    } else if (cameraDistance < fadeEnd) {
      const range = fadeEnd - SCALE_VIEW_CONFIG.milkyWayBackgroundFadeStart;
      targetOpacity = 1 - (cameraDistance - SCALE_VIEW_CONFIG.milkyWayBackgroundFadeStart) / range;
    } else {
      targetOpacity = 0;
    }

    this.opacity = targetOpacity;

    if (this.skybox) {
      if (this.opacity > 0.01) {
        this.skybox.visible = true;
        const material = this.skybox.material as THREE.MeshBasicMaterial;
        material.opacity = this.opacity;
        if (!cesiumCompositeMode) {
          material.transparent = this.opacity < 1;
        }
      } else {
        this.skybox.visible = false;
      }
    }
  }

  setCesiumMode(enabled: boolean): void {
    if (this.skybox) {
      this.skybox.visible = !enabled;
      const mat = this.skybox.material as THREE.MeshBasicMaterial;
      mat.depthTest = false;
      mat.transparent = enabled;
      mat.opacity = 1.0;
    }
    if (this.fallbackStarfield) {
      this.fallbackStarfield.visible = !enabled;
    }
  }

  getSkybox(): THREE.Mesh | null {
    return this.skybox;
  }

  applyRotation(combinedRotation: THREE.Quaternion): void {
    if (!this.skybox) return;
    const degToRad = Math.PI / 180;
    const baseEuler = new THREE.Euler(
      MILKY_WAY_ORIENTATION.rotationX * degToRad,
      MILKY_WAY_ORIENTATION.rotationY * degToRad,
      MILKY_WAY_ORIENTATION.rotationZ * degToRad,
      'XYZ'
    );
    const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler);
    const finalQuat = combinedRotation.clone().multiply(baseQuat);
    this.skybox.quaternion.copy(finalQuat);
  }

  dispose(): void {
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();
      (this.skybox.material as THREE.Material).dispose();
      this.skybox = null;
    }
    if (this.fallbackStarfield) {
      this.scene.remove(this.fallbackStarfield);
      this.fallbackStarfield.geometry.dispose();
      (this.fallbackStarfield.material as THREE.Material).dispose();
      this.fallbackStarfield = null;
    }
  }
}
