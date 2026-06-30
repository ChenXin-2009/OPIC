/**
 * @module 3d/Planet
 * @description 3D 行星渲染类
 *
 * 本模块负责创建和管理单个行星的 3D 网格对象,包括几何体、材质、纹理、光照效果和自转动画。
 * 支持真实的太阳光照、昼夜贴图渐变、土星环、太阳光晕等特殊效果。
 *
 * @architecture
 * - 所属子系统：3D 渲染
 * - 架构层级：核心层
 * - 职责边界：负责单个行星的视觉表现,不负责轨道计算、位置更新或用户交互
 *
 * @dependencies
 * - 直接依赖：three, three/examples/jsm/renderers/CSS2DRenderer, astronomy/orbit, types/celestialTypes, config/visualConfig
 * - 被依赖：3d/SceneManager, components/UniverseVisualization
 * - 循环依赖：无
 *
 * @renderPipeline
 * 渲染管线阶段：
 * 1. 几何体创建：SphereGeometry（动态 LOD 分段数）
 * 2. 材质创建：自定义 Shader 材质（太阳光照、昼夜贴图）
 * 3. 纹理加载：通过 TextureManager 加载行星表面贴图
 * 4. 特殊效果：太阳光晕、土星环、标记圈（小行星）
 * 5. 自转动画：基于真实自转周期的旋转更新
 * 6. LOD 优化：根据相机距离动态调整几何体分段数
 *
 * @performance
 * - 使用 LOD 系统动态调整球体分段数（16-64 segments）
 * - 使用自定义 Shader 实现高效的光照计算
 * - 使用纹理管理器避免重复加载贴图
 * - 小行星使用 CSS2D 标记圈代替 3D 网格
 *
 * @coordinateSystem
 * - 位置坐标：日心黄道坐标系（AU）
 * - 自转轴：黄道坐标系中的单位向量
 * - 纹理坐标：经纬度映射（0° 经度对应 J2000.0 本初子午线）
 *
 * @unit
 * - 位置：AU（天文单位）
 * - 半径：AU（天文单位）
 * - 自转速度：弧度/秒
 * - 自转周期：小时
 *
 * @note
 * - 太阳使用特殊的自发光材质和光晕效果
 * - 地球支持昼夜贴图渐变（nightmap）
 * - 土星支持半透明环系统
 * - 自转轴倾角基于 IAU WGCCRE 报告
 *
 * @example
 * ```typescript
 * import { Planet } from '@/lib/3d';
 *
 * const earth = new Planet({
 *   name: 'Earth',
 *   radius: 0.008,
 *   color: '#4A90E2',
 *   rotationPeriod: 23.9345
 * });
 *
 * earth.updatePosition(x, y, z);
 * earth.updateRotation(deltaTime);
 *
 * scene.add(earth.getMesh());
 * ```
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { calculateRotationAxis, CELESTIAL_BODIES, type CelestialBodyConfig, rotationPeriodToSpeed } from '@/lib/types/celestialTypes';
import { MARKER_CONFIG, PLANET_GRID_CONFIG, PLANET_LOD_CONFIG, SATURN_RING_CONFIG, SUN_GLOW_CONFIG, SUN_SHADER_CONFIG } from '@/lib/config/visualConfig';
import { type PlanetConfig, REAL_PLANET_RADII } from './planet/PlanetTypes';
import { createSunShaderMaterial, createPlanetShaderMaterial } from './planet/planetShaders';
import { PlanetRingRenderer } from './planet/PlanetRing';
import { PlanetGrid } from './planet/PlanetGrid';
import { SunVisualEnhancer } from './planet/SunVisualEnhancer';

export type { PlanetConfig } from './planet/PlanetTypes';

/**
 * 3D 行星渲染类
 *
 * 创建和管理单个行星的 3D 网格对象，包括几何体、材质、纹理、光照效果和自转动画。
 * 支持太阳光照、昼夜贴图渐变、土星环、太阳光晕等特殊效果。
 */
export class Planet {
  private mesh: THREE.Mesh | THREE.Object3D;
  private geometry: THREE.SphereGeometry | null;
  private material: THREE.ShaderMaterial | THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | null;
  private rotationSpeed: number;
  private realRadius: number;
  private markerDiv: HTMLDivElement | null = null;
  private markerObject: any = null;
  private currentOpacity: number = 0;
  private targetOpacity: number = 0;
  private isSun: boolean = false;
  private currentSegments: number = 32;
  private targetSegments: number = 32;

  private rotationAxis: THREE.Vector3;
  private axialTilt: number = 0;
  private axialTiltApplied: boolean = false;
  private primeMeridianAtJ2000: number = 0;

  private textureLoaded: boolean = false;
  private textureBodyId: string | null = null;
  private planetName: string = '';
  private nightTexture: THREE.Texture | null = null;

  private originalColor: THREE.Color;

  private ringRenderer: PlanetRingRenderer | null = null;
  private grid: PlanetGrid | null = null;
  private sunGlow: SunVisualEnhancer | null = null;

  /**
   * 创建行星实例
   *
   * @param config - 行星配置参数，包含名称、半径、颜色、自转周期等
   */
  constructor(config: PlanetConfig) {
    let celestialConfig: CelestialBodyConfig | undefined;
    let bodyInfo: { name: string; color: string; radius: number; isSun?: boolean };

    if (config.body) {
      celestialConfig = config.config;
      bodyInfo = {
        name: config.body.name,
        color: config.body.color,
        radius: config.body.radius,
        isSun: config.body.isSun
      };
    } else {
      celestialConfig = config as CelestialBodyConfig;
      bodyInfo = {
        name: config.name || 'Unknown',
        color: config.color || '#FFFFFF',
        radius: config.radius || 0.01,
        isSun: false
      };
    }

    this.originalColor = new THREE.Color(bodyInfo.color || 0xffffff);

    if (celestialConfig?.rotationPeriod) {
      this.rotationSpeed = rotationPeriodToSpeed(celestialConfig.rotationPeriod);
    } else if (config.rotationPeriod) {
      this.rotationSpeed = rotationPeriodToSpeed(config.rotationPeriod);
    } else {
      this.rotationSpeed = config.rotationSpeed || 0;
    }

    this.isSun = bodyInfo.isSun || false;
    this.planetName = bodyInfo.name.toLowerCase();

    const planetName = bodyInfo.name.toLowerCase();
    this.realRadius = REAL_PLANET_RADII[planetName] || bodyInfo.radius;

    this.rotationAxis = new THREE.Vector3(0, 1, 0);
    this.axialTilt = 0;

    const bodyData = CELESTIAL_BODIES[planetName];
    if (bodyData && bodyData.northPoleRA !== undefined && bodyData.northPoleDec !== undefined) {
      const axis = calculateRotationAxis(bodyData.northPoleRA, bodyData.northPoleDec);
      this.rotationAxis = new THREE.Vector3(axis.x, axis.y, axis.z).normalize();
      this.axialTilt = bodyData.axialTilt || 0;
      this.primeMeridianAtJ2000 = bodyData.primeMeridianAtJ2000 || 0;
    } else if (celestialConfig?.northPoleRA !== undefined && celestialConfig?.northPoleDec !== undefined) {
      const axis = calculateRotationAxis(celestialConfig.northPoleRA, celestialConfig.northPoleDec);
      this.rotationAxis = new THREE.Vector3(axis.x, axis.y, axis.z).normalize();
      this.axialTilt = celestialConfig.axialTilt || 0;
      this.primeMeridianAtJ2000 = celestialConfig.primeMeridianAtJ2000 || 0;
    }

    const radius = this.realRadius;

    if (this.isSun) {
      this.targetSegments = 64;
      this.currentSegments = 64;
      this.geometry = new THREE.SphereGeometry(radius, this.currentSegments, this.currentSegments);
      this.material = createSunShaderMaterial();
      this.mesh = new THREE.Mesh(this.geometry, this.material);
    } else {
      this.targetSegments = PLANET_LOD_CONFIG.baseSegments;
      this.currentSegments = PLANET_LOD_CONFIG.baseSegments;
      this.geometry = new THREE.SphereGeometry(radius, this.currentSegments, this.currentSegments);
      this.material = createPlanetShaderMaterial(this.planetName, bodyInfo.color || '#ffffff');
      this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    this.mesh.renderOrder = 0;

    this.applyAxialTilt();

    if (this.isSun && SUN_GLOW_CONFIG.enabled) {
      this.sunGlow = new SunVisualEnhancer(this.mesh, this.realRadius);
      this.sunGlow.create();
    }

    if (PLANET_GRID_CONFIG.enabled && !this.isSun) {
      this.grid = new PlanetGrid(this.mesh, this.realRadius);
      this.grid.create();
    }

    if (this.planetName === 'saturn' && SATURN_RING_CONFIG.enabled) {
      this.ringRenderer = new PlanetRingRenderer(this.mesh, this.realRadius);
      this.ringRenderer.create();
    }
  }

  private applyAxialTilt(): void {
    if (this.axialTiltApplied) return;

    const defaultAxis = new THREE.Vector3(0, 1, 0);
    const targetAxis = this.rotationAxis.clone().normalize();

    if (targetAxis.distanceTo(defaultAxis) < 0.001) {
      this.axialTiltApplied = true;
      return;
    }

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(defaultAxis, targetAxis);
    this.mesh.quaternion.copy(quaternion);
    this.axialTiltApplied = true;
  }

  /**
   * 更新太阳位置（用于光照计算）
   *
   * @param sunPosition - 太阳在世界空间中的位置
   */
  updateSunPosition(sunPosition: THREE.Vector3): void {
    if (this.isSun) return;

    if (this.material instanceof THREE.ShaderMaterial) {
      this.material.uniforms.uSunPosition.value.copy(sunPosition);
    }
  }

  /**
   * 创建标记圈（用于小行星等小型天体的 CSS2D 标记）
   */
  createMarkerCircle(): void {
    if (this.markerDiv) return;

    this.markerDiv = document.createElement('div');
    this.markerDiv.style.width = `${MARKER_CONFIG.size}px`;
    this.markerDiv.style.height = `${MARKER_CONFIG.size}px`;
    const colorHex = this.originalColor.getHexString();
    this.markerDiv.style.border = `${MARKER_CONFIG.strokeWidth}px solid #${colorHex}`;
    this.markerDiv.style.borderRadius = '50%';
    this.markerDiv.style.pointerEvents = 'auto';
    this.markerDiv.style.cursor = 'pointer';
    this.markerDiv.style.userSelect = 'none';
    this.markerDiv.style.opacity = '1';
    this.markerDiv.style.transition = 'opacity 0.2s ease-out';
    this.markerDiv.style.position = 'absolute';
    this.markerDiv.style.transform = 'translate(-50%, -50%)';
    this.markerDiv.style.display = 'block';
    this.markerDiv.style.visibility = 'visible';
    this.markerDiv.style.backgroundColor = 'transparent';
    this.markerDiv.style.boxSizing = 'border-box';

    this.currentOpacity = 1.0;
    this.targetOpacity = 1.0;

    this.markerObject = new CSS2DObject(this.markerDiv);
    this.markerObject.position.set(0, 0, 0);
    this.mesh.add(this.markerObject);
  }

  /**
   * 获取标记圈的 CSS2DObject 实例
   *
   * @returns 标记圈对象，未创建时返回 null
   */
  getMarkerObject(): any {
    return this.markerObject;
  }

  /**
   * 更新标记圈透明度（平滑过渡动画）
   */
  updateMarkerOpacity(): void {
    if (!this.markerDiv) return;

    const diff = this.targetOpacity - this.currentOpacity;
    if (Math.abs(diff) > 0.001) {
      this.currentOpacity += diff * MARKER_CONFIG.fadeSpeed;
      this.currentOpacity = Math.max(0, Math.min(1, this.currentOpacity));
    } else {
      this.currentOpacity = this.targetOpacity;
    }

    if (this.markerDiv) {
      this.markerDiv.style.opacity = this.currentOpacity.toString();
      this.markerDiv.style.display = this.currentOpacity > MARKER_CONFIG.minOpacity ? 'block' : 'none';
    }
  }

  /**
   * 设置标记圈目标透明度
   *
   * @param opacity - 目标透明度值（0-1）
   */
  setMarkerTargetOpacity(opacity: number): void {
    this.targetOpacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * 获取当前标记圈透明度
   *
   * @returns 当前透明度值（0-1）
   */
  getMarkerOpacity(): number {
    return this.currentOpacity;
  }

  /**
   * 更新行星在世界空间中的位置
   *
   * @param x - X 坐标（AU）
   * @param y - Y 坐标（AU）
   * @param z - Z 坐标（AU）
   */
  updatePosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }

  /**
   * 更新行星自转角度
   *
   * @param currentTimeInDays - 当前时间（自 J2000.0 起的天数）
   * @param _timeSpeed - 时间速度倍率（未使用，保留接口兼容）
   * @param _isPlaying - 是否正在播放（未使用，保留接口兼容）
   */
  updateRotation(currentTimeInDays: number, _timeSpeed: number = 1, _isPlaying: boolean = true): void {
    if (this.isSun && this.material instanceof THREE.ShaderMaterial) {
      this.material.uniforms.uTime.value = currentTimeInDays * SUN_SHADER_CONFIG.animationSpeed;
    }

    if (this.rotationSpeed === 0) return;

    const rotationRateDegreesPerDay = this.rotationSpeed * 86400 * (180 / Math.PI);
    const W = this.primeMeridianAtJ2000 + rotationRateDegreesPerDay * currentTimeInDays;

    const textureOffset = 180.0;
    const calibrationOffset = -90.0;
    const totalRotationDegrees = W + textureOffset + calibrationOffset;
    const totalRotation = totalRotationDegrees * (Math.PI / 180);

    const defaultAxis = new THREE.Vector3(0, 1, 0);
    const tiltQuaternion = new THREE.Quaternion();
    tiltQuaternion.setFromUnitVectors(defaultAxis, this.rotationAxis);

    const rotationQuaternion = new THREE.Quaternion();
    rotationQuaternion.setFromAxisAngle(defaultAxis, totalRotation);

    const finalQuaternion = new THREE.Quaternion();
    finalQuaternion.multiplyQuaternions(tiltQuaternion, rotationQuaternion);

    this.mesh.quaternion.copy(finalQuaternion);
  }

  /**
   * 检查是否处于潮汐锁定状态
   *
   * @returns 始终返回 false（当前未实现潮汐锁定检测）
   */
  getIsTidallyLocked(): boolean {
    return false;
  }

  /**
   * 获取父天体名称
   *
   * @returns 父天体名称，当前始终返回 null
   */
  getParentBodyName(): string | null {
    return null;
  }

  /**
   * 获取自转轴方向
   *
   * @returns 自转轴单位向量（克隆）
   */
  getRotationAxis(): THREE.Vector3 {
    return this.rotationAxis.clone();
  }

  /**
   * 获取当前自转四元数
   *
   * @returns 自转四元数（克隆）
   */
  getRotationQuaternion(): THREE.Quaternion {
    return this.mesh.quaternion.clone();
  }

  /**
   * 获取轴倾角
   *
   * @returns 轴倾角（度）
   */
  getAxialTilt(): number {
    return this.axialTilt;
  }

  /**
   * 设置经纬网格可见性
   *
   * @param visible - 是否可见
   */
  setGridVisible(visible: boolean): void {
    if (this.grid) this.grid.setVisible(visible);
  }

  /**
   * 获取经纬网格可见性
   *
   * @returns 是否可见
   */
  getGridVisible(): boolean {
    return this.grid ? this.grid.getVisible() : false;
  }

  /**
   * 根据相机距离更新经纬网格可见性
   *
   * @param distance - 相机距离（AU）
   */
  updateGridVisibility(distance: number): void {
    if (this.grid) this.grid.updateVisibility(distance);
  }

  /**
   * 设置光晕遮挡体（用于太阳光晕效果）
   *
   * @param occluders - 遮挡体对象数组
   */
  setGlowOccluders(occluders: THREE.Object3D[]): void {
    if (this.sunGlow) this.sunGlow.setOccluders(occluders);
  }

  /**
   * 更新太阳光晕效果
   *
   * @param camera - 当前摄像机
   */
  updateGlow(camera: THREE.Camera): void {
    if (this.sunGlow) {
      this.sunGlow.mount();
      this.sunGlow.update(camera);
    }
  }

  /**
   * 根据相机距离更新 LOD（细节层次）分段数
   *
   * @param distance - 相机距离（AU）
   */
  updateLOD(distance: number): void {
    const normalizedDistance = Math.max(0.1, distance / PLANET_LOD_CONFIG.transitionDistance);
    const targetSegmentsRaw = PLANET_LOD_CONFIG.baseSegments * (1 + 1 / Math.max(0.5, normalizedDistance));
    this.targetSegments = Math.round(
      Math.max(PLANET_LOD_CONFIG.minSegments,
               Math.min(PLANET_LOD_CONFIG.maxSegments, targetSegmentsRaw))
    );

    const segmentDiff = this.targetSegments - this.currentSegments;
    if (Math.abs(segmentDiff) > 0) {
      const smoothedChange = Math.round(segmentDiff * PLANET_LOD_CONFIG.smoothness);
      const newSegments = this.currentSegments + smoothedChange;

      if (newSegments !== this.currentSegments) {
        this.currentSegments = newSegments;
        this.rebuildGeometry();
      }
    }
  }

  private rebuildGeometry(): void {
    if (!this.geometry) return;

    const radius = this.geometry.parameters.radius;
    this.geometry.dispose();
    this.geometry = new THREE.SphereGeometry(radius, this.currentSegments, this.currentSegments);

    if (this.mesh instanceof THREE.Mesh) {
      this.mesh.geometry = this.geometry;
    }
  }

  /**
   * 获取行星的 Three.js 网格对象
   *
   * @returns 行星网格对象
   */
  getMesh(): THREE.Mesh | THREE.Object3D {
    return this.mesh;
  }

  /**
   * 获取行星真实半径
   *
   * @returns 半径（AU）
   */
  getRealRadius(): number {
    return this.realRadius;
  }

  /**
   * 获取行星名称
   *
   * @returns 小写行星名称
   */
  getPlanetName(): string {
    return this.planetName;
  }

  /**
   * 检查是否为太阳
   *
   * @returns 是否为太阳
   */
  getIsSun(): boolean {
    return this.isSun;
  }

  /**
   * 应用白天纹理
   *
   * @param texture - 纹理对象，传 null 清除纹理
   * @param bodyId - 天体 ID（用于缓存管理）
   */
  applyTexture(texture: THREE.Texture | null, bodyId: string): void {
    if (this.isSun) return;

    if (texture) {
      if (this.material instanceof THREE.ShaderMaterial) {
        this.material.uniforms.uDayTexture.value = texture;
        this.material.uniforms.uHasTexture.value = 1.0;
        this.material.needsUpdate = true;
      } else if (this.material instanceof THREE.MeshStandardMaterial) {
        this.material.map = texture;
        this.material.color.setHex(0xffffff);
        this.material.needsUpdate = true;
      }
      this.textureLoaded = true;
      this.textureBodyId = bodyId;

      if (this.grid) this.grid.setVisible(false);
    }
  }

  /**
   * 应用夜晚纹理（用于昼夜贴图渐变效果）
   *
   * @param texture - 夜晚纹理对象
   */
  applyNightTexture(texture: THREE.Texture | null): void {
    if (this.isSun || !texture) return;

    if (this.material instanceof THREE.ShaderMaterial) {
      this.material.uniforms.uNightTexture.value = texture;
      this.material.uniforms.uHasNightTexture.value = 1.0;
      this.material.needsUpdate = true;
      this.nightTexture = texture;
    }
  }

  /**
   * 检查是否已应用纹理
   *
   * @returns 是否已加载纹理
   */
  hasTextureApplied(): boolean {
    return this.textureLoaded;
  }

  /**
   * 获取已应用纹理的天体 ID
   *
   * @returns 天体 ID，未应用纹理时返回 null
   */
  getTextureBodyId(): string | null {
    return this.textureBodyId;
  }

  /**
   * 释放所有资源（纹理、几何体、材质、标记圈、网格、光晕等）
   */
  dispose(): void {
    if (this.textureBodyId) {
      if (this.material instanceof THREE.ShaderMaterial) {
        this.material.uniforms.uDayTexture.value = null;
        this.material.uniforms.uNightTexture.value = null;
      } else if (this.material instanceof THREE.MeshStandardMaterial) {
        this.material.map = null;
      }
      this.textureBodyId = null;
      this.textureLoaded = false;
    }

    if (this.nightTexture) {
      this.nightTexture = null;
    }

    if (this.markerObject && this.markerObject.parent) {
      this.markerObject.parent.remove(this.markerObject);
    }
    if (this.markerDiv && this.markerDiv.parentNode) {
      this.markerDiv.parentNode.removeChild(this.markerDiv);
    }

    if (this.grid) this.grid.dispose();
    if (this.ringRenderer) this.ringRenderer.dispose();
    if (this.sunGlow) this.sunGlow.dispose();

    this.geometry?.dispose();
    this.material?.dispose();
  }
}
