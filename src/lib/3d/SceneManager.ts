/**
 * @module 3d/SceneManager
 * @description Three.js 场景管理器核心模块
 * 
 * 本模块负责整个 3D 可视化系统的场景初始化、渲染循环和资源管理。
 * 是 3D 渲染系统的核心入口,协调相机、渲染器、场景对象和多尺度宇宙视图。
 * 
 * @architecture
 * - 所属子系统：3D 渲染
 * - 架构层级：核心层
 * - 职责边界：负责 Three.js 场景生命周期管理,不负责具体天体的渲染逻辑
 * 
 * @dependencies
 * - 直接依赖：three, 3d/NearbyStars, 3d/GalaxyRenderer, 3d/GaiaStars, config/cameraConfig, config/galaxyConfig
 * - 被依赖：components/UniverseVisualization
 * - 循环依赖：无
 * 
 * @renderPipeline
 * 渲染管线阶段：
 * 1. 初始化阶段：创建 WebGLRenderer、Scene、Camera
 * 2. 场景构建：加载银河系天空盒、初始化多尺度组件
 * 3. 渲染循环：更新多尺度视图、调整相机裁剪面、执行渲染
 * 4. 清理阶段：释放 WebGL 资源、移除事件监听器
 * 
 * @performance
 * - 使用对数深度缓冲处理巨大的尺度差异（从行星表面到星际距离）
 * - 动态调整相机近远裁剪面,避免 Z-fighting 和裁剪问题
 * - 根据相机距离动态显示/隐藏多尺度组件
 * - 使用 WebGL 2.0 和硬件抗锯齿提升渲染质量
 * 
 * @coordinateSystem
 * - 场景坐标系：右手坐标系（Three.js 默认）
 * - 天空盒：赤道坐标系转换到黄道坐标系
 * - 星空对齐：赤道坐标系对齐到太阳系黄道坐标系
 * 
 * @note
 * - 银河系天空盒使用 equirectangular 投影
 * - 坐标系转换参数基于 IAU 2006 岁差章动模型
 * - 多尺度视图切换使用平滑过渡避免视觉跳跃
 * 
 * @example
 * ```typescript
 * const container = document.getElementById('canvas-container');
 * const sceneManager = new SceneManager(container);
 * 
 * // 在动画循环中
 * function animate() {
 *   sceneManager.updateMultiScaleView(cameraDistance, deltaTime);
 *   sceneManager.render();
 *   requestAnimationFrame(animate);
 * }
 * 
 * // 清理资源
 * sceneManager.dispose();
 * ```
 */

import * as THREE from 'three';
import { VIEW_SETTINGS } from '../config/cameraConfig';
import { NearbyStars } from './NearbyStars';
import { GalaxyRenderer } from './GalaxyRenderer';
import { GaiaStars } from './GaiaStars';
import { SCALE_VIEW_CONFIG, NEARBY_STARS_CONFIG, GALAXY_CONFIG } from '../config/galaxyConfig';
import { TextureLoadError, RenderError } from '../errors/base';
import { logError, tryCatch } from '../utils/errors';

// 银河系背景图片路径（圆柱投影/equirectangular）
const MILKY_WAY_TEXTURE_PATH = '/textures/planets/8k_stars_milky_way.webp';

// 🔧 银河系天空盒方位配置（度）
// 将银道坐标系的 equirectangular 图片转换到赤道坐标系
// 银道面与天球赤道面夹角约 62.87°
// 银河系中心在赤道坐标系中：RA ≈ 266.4°, Dec ≈ -28.9°
// 北银极在赤道坐标系中：RA ≈ 192.9°, Dec ≈ 27.1°
const MILKY_WAY_ORIENTATION = {
  // X轴旋转（俯仰）：银道面倾角
  rotationX: -141.5,
  
  // Y轴旋转（偏航）：调整银河系中心水平方向
  rotationY: 8,
  
  // Z轴旋转（滚转）：调整银道面滚转
  rotationZ: 123.4,
};

// 🔧 星空对齐配置（度）
// 将赤道坐标系的星空（Gaia/NearbyStars）旋转到与太阳系黄道坐标系对齐
const STARS_ALIGNMENT = {
  rotationX: -163.5,
  rotationY: -114.3,
  rotationZ: -252.0,
  eclipticRotation: -98.1,  // 黄道面内旋转（对齐夏至点）
};

/**
 * SceneManager - Three.js scene management system
 * 
 * Manages the Three.js scene, renderer, camera, and multi-scale universe view.
 * Handles initialization, rendering, and cleanup of 3D visualization components.
 * 
 * Key responsibilities:
 * - Initialize and configure Three.js renderer with optimal settings
 * - Create and manage the scene with Milky Way skybox background
 * - Handle camera setup and dynamic clipping plane adjustments
 * - Manage multi-scale universe components (nearby stars, Gaia stars, galaxy)
 * - Coordinate alignment between different coordinate systems
 * - Handle window resizing and viewport updates
 * 
 * The scene uses a logarithmic depth buffer to handle the vast scale differences
 * in the solar system (from planet surfaces to interstellar distances).
 * 
 * @example
 * ```typescript
 * const container = document.getElementById('canvas-container');
 * const sceneManager = new SceneManager(container);
 * 
 * // In animation loop
 * function animate() {
 *   sceneManager.updateMultiScaleView(cameraDistance, deltaTime);
 *   sceneManager.render();
 *   requestAnimationFrame(animate);
 * }
 * 
 * // Cleanup
 * sceneManager.dispose();
 * ```
 */
export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private skybox: THREE.Mesh | null = null;
  
  // 多尺度宇宙视图组件
  private nearbyStars: NearbyStars | null = null;
  private gaiaStars: GaiaStars | null = null;
  private galaxyRenderer: GalaxyRenderer | null = null;
  private skyboxOpacity: number = 1;
  private skyboxTargetOpacity: number = 1;
  
  // 宇宙尺度渲染器
  private universeGroup: THREE.Group; // 外部星团和蓝色圆圈的父容器
  private localGroupRenderer: any | null = null;
  private nearbyGroupsRenderer: any | null = null;
  private virgoSuperclusterRenderer: any | null = null;
  private laniakeaSuperclusterRenderer: any | null = null;
  private observableBoundarySphere: THREE.LineSegments | null = null;
  
  // Cesium 地球集成（可选）
  private earthPlanet: any | null = null; // 使用 any 避免强制依赖 EarthPlanet

  /**
   * Creates a new SceneManager instance.
   * 
   * Initializes the Three.js renderer, scene, and camera with optimal settings
   * for solar system visualization. Sets up the Milky Way skybox background
   * and multi-scale universe view components.
   * 
   * @param container - HTML element to attach the renderer canvas to
   * @throws {RenderError} If WebGL initialization fails
   * 
   * @example
   * ```typescript
   * const container = document.getElementById('canvas-container');
   * const sceneManager = new SceneManager(container);
   * ```
   */
  constructor(container: HTMLElement) {
    this.container = container;
    
    // 创建宇宙尺度组（包含外部星团和蓝色圆圈）
    this.universeGroup = new THREE.Group();
    this.universeGroup.name = 'UniverseGroup';
    
    // 应用旋转偏移以对齐银河系和外部星团坐标系
    // 这些值通过 GalaxyReferenceDebugger 调试得出
    const degToRad = Math.PI / 180;
    this.universeGroup.rotation.order = 'YXZ';
    this.universeGroup.rotation.x = 58.0 * degToRad;
    this.universeGroup.rotation.y = -21.0 * degToRad;
    this.universeGroup.rotation.z = 59.5 * degToRad;

    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true, // 防止深度闪烁（太阳系尺度很大）
      alpha: true, // 启用 alpha 通道，支持 Cesium 模式下透明背景合成
    });

    // 物理光照（某些版本可能不支持，使用可选链）
    if ('physicallyCorrectLights' in this.renderer) {
      (this.renderer as any).physicallyCorrectLights = true;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大像素比
    this.renderer.setClearColor(0x000000, 1); // 默认不透明黑色背景
    
    // ⚠️ 修复：在 Canvas 元素上设置 touchAction，允许自定义触摸处理
    // 这样可以避免影响 fixed 定位的按钮（Firefox 特别敏感）
    this.renderer.domElement.style.touchAction = 'none';
    
    // 设置 Three.js canvas z-index（宇宙场景层在后）
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.zIndex = '1';
    
    container.appendChild(this.renderer.domElement);

    // 初始化场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // 黑色背景（图片加载前显示）
    
    // 添加宇宙尺度组到场景
    this.scene.add(this.universeGroup);
    
    // 添加银河系天空盒背景
    this.createMilkyWaySkybox();

    // 初始化相机（必须在 updateSize 之前）
    // 使用更小的 near 值（0.01）和更大的 far 值（1e12）以适应太阳系的大尺度
    // FOV 从 CameraController 配置中读取（如果可用），否则使用默认值 75
    const aspect = container.clientWidth / container.clientHeight || 1;
    const fov = 75; // 默认 FOV，实际值由 CameraController 管理
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 1e12);
    this.camera.position.set(0, 0, 10);

    // 设置渲染器尺寸（在相机初始化之后）
    this.updateSize();
    
    // 初始化多尺度宇宙视图组件
    this.initializeMultiScaleView();

    // 光照将在 SolarSystemCanvas3D 中添加，这里不添加
    // 注意：窗口大小变化监听器由 SolarSystemCanvas3D 统一管理，避免重复绑定
  }
  
  /**
   * 初始化多尺度宇宙视图组件
   * 
   * Creates and adds nearby stars, Gaia stars, and galaxy renderer
   * components to the scene based on configuration settings.
   */
  private initializeMultiScaleView(): void {
    this.initializeNearbyStars();
    this.initializeGaiaStars();
    this.initializeGalaxyRenderer();
    this.createObservableBoundarySphere();
    // Note: Universe scale renderers will be initialized lazily when data is loaded
  }
  
  /**
   * 初始化近邻恒星组件
   * 
   * Creates the nearby stars renderer if enabled in configuration
   * and adds it to the scene.
   */
  private initializeNearbyStars(): void {
    if (NEARBY_STARS_CONFIG.enabled) {
      this.nearbyStars = new NearbyStars();
      this.scene.add(this.nearbyStars.getGroup());
    }
  }
  
  /**
   * 初始化 Gaia 恒星组件
   * 
   * Creates the Gaia stars renderer and adds it to the scene.
   */
  private initializeGaiaStars(): void {
    this.gaiaStars = new GaiaStars();
    this.scene.add(this.gaiaStars.getGroup());
  }
  
  /**
   * 初始化银河系渲染器组件
   * 
   * Creates the galaxy renderer if enabled in configuration
   * and adds it to the scene.
   */
  private initializeGalaxyRenderer(): void {
    if (GALAXY_CONFIG.enabled) {
      this.galaxyRenderer = new GalaxyRenderer();
      this.scene.add(this.galaxyRenderer.getGroup());
      this.scene.add(this.galaxyRenderer.getSideViewGroup()); // 添加独立的侧视图组
    }
  }

  /**
   * 创建可观测宇宙边界球体
   * 
   * Creates a wireframe sphere representing the observable universe boundary.
   * The sphere has a radius of 46.5 billion light years.
   */
  private createObservableBoundarySphere(): void {
    const { OBSERVABLE_UNIVERSE_CONFIG } = require('../config/universeConfig');
    
    if (!OBSERVABLE_UNIVERSE_CONFIG.showObservableBoundary) return;

    // 创建球体几何体
    const geometry = new THREE.SphereGeometry(OBSERVABLE_UNIVERSE_CONFIG.boundaryRadius, 64, 32);
    
    // 创建边缘几何体（网格线）
    const edges = new THREE.EdgesGeometry(geometry);
    
    // 创建线段材质（加粗线条）
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(OBSERVABLE_UNIVERSE_CONFIG.boundaryColor),
      transparent: true,
      opacity: OBSERVABLE_UNIVERSE_CONFIG.boundaryOpacity,
      depthWrite: false,
      linewidth: 2, // 加粗线条（注意：在某些平台上可能不生效）
    });
    
    // 创建线段网格
    this.observableBoundarySphere = new THREE.LineSegments(edges, material);
    this.observableBoundarySphere.name = 'ObservableBoundarySphere';
    this.observableBoundarySphere.renderOrder = -500;
    this.observableBoundarySphere.visible = false; // 初始隐藏
    
    // 添加到场景
    this.scene.add(this.observableBoundarySphere);
    
    // 清理临时几何体
    geometry.dispose();
  }

  /**
   * 创建银河系天空盒背景（使用圆柱投影图片）
   * 
   * Loads the Milky Way texture and creates a skybox sphere.
   * Falls back to a simple starfield if texture loading fails.
   * 
   * Uses an inverted sphere with equirectangular mapping to create
   * an immersive background that follows the camera.
   */
  private createMilkyWaySkybox(): void {
    const textureLoader = new THREE.TextureLoader();
    
    textureLoader.load(
      MILKY_WAY_TEXTURE_PATH,
      (texture) => this.onSkyboxTextureLoaded(texture),
      undefined,
      (error) => this.onSkyboxTextureError(error)
    );
  }
  
  /**
   * 处理天空盒纹理加载成功
   * 
   * Creates the skybox mesh with the loaded texture and applies
   * the Milky Way orientation.
   * 
   * @param texture - Loaded texture for the skybox
   */
  private onSkyboxTextureLoaded(texture: THREE.Texture): void {
    this.configureSkyboxTexture(texture);
    const geometry = this.createSkyboxGeometry();
    const material = this.createSkyboxMaterial(texture);
    
    this.skybox = new THREE.Mesh(geometry, material);
    this.configureSkyboxMesh(this.skybox);
    this.applySkyboxOrientation(this.skybox);
    
    this.scene.add(this.skybox);
    this.applyStarsAlignment();
  }
  
  /**
   * 配置天空盒纹理参数
   * 
   * Sets up texture color space and mapping for equirectangular projection.
   * 
   * @param texture - Texture to configure
   */
  private configureSkyboxTexture(texture: THREE.Texture): void {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
  }
  
  /**
   * 创建天空盒几何体
   * 
   * Creates a large sphere geometry for the skybox.
   * Uses a fixed size to avoid dynamic scaling artifacts.
   * 
   * @returns Sphere geometry for skybox
   */
  private createSkyboxGeometry(): THREE.SphereGeometry {
    const radius = 5e5;
    const widthSegments = 64;
    const heightSegments = 32;
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  }
  
  /**
   * 创建天空盒材质
   * 
   * Creates a material for the skybox with inverted rendering
   * (visible from inside the sphere).
   * 
   * @param texture - Texture to apply to the material
   * @returns Configured material for skybox
   */
  private createSkyboxMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide, // 从内部渲染
      depthWrite: false,
      depthTest: false,
    });
  }
  
  /**
   * 配置天空盒网格属性
   * 
   * Sets render order and user data for the skybox mesh.
   * 
   * @param skybox - Skybox mesh to configure
   */
  private configureSkyboxMesh(skybox: THREE.Mesh): void {
    skybox.renderOrder = -1000; // 最先渲染（在最后面）
    skybox.userData.isSkybox = true;
    skybox.userData.fixedToCamera = true; // 标记为跟随相机
  }
  
  /**
   * 应用银河系方位旋转
   * 
   * Applies the configured Milky Way orientation to the skybox.
   * Converts degrees to radians for rotation.
   * 
   * @param skybox - Skybox mesh to rotate
   */
  private applySkyboxOrientation(skybox: THREE.Mesh): void {
    const degToRad = Math.PI / 180;
    skybox.rotation.x = MILKY_WAY_ORIENTATION.rotationX * degToRad;
    skybox.rotation.y = MILKY_WAY_ORIENTATION.rotationY * degToRad;
    skybox.rotation.z = MILKY_WAY_ORIENTATION.rotationZ * degToRad;
  }
  
  /**
   * 处理天空盒纹理加载失败
   * 
   * Logs a warning and creates a fallback starfield when texture loading fails.
   * 
   * @param error - Error that occurred during texture loading
   * @throws {TextureLoadError} Wrapped error with context
   */
  private onSkyboxTextureError(error: unknown): void {
    const textureError = new TextureLoadError(
      'Failed to load Milky Way skybox texture',
      { path: MILKY_WAY_TEXTURE_PATH, originalError: error }
    );
    
    logError(textureError, { component: 'SceneManager', operation: 'createMilkyWaySkybox' });
    
    // Create fallback starfield to ensure user still has a background
    this.createFallbackStarfield();
  }

  /**
   * 应用星空对齐旋转
   * 
   * Aligns the skybox, Gaia stars, and nearby stars with the solar system's
   * ecliptic coordinate system. This ensures that the background stars match
   * the orientation of the solar system.
   * 
   * The alignment involves:
   * 1. Converting from equatorial to ecliptic coordinates
   * 2. Applying additional rotation to match the solar system orientation
   * 3. Rotating within the ecliptic plane to align with the vernal equinox
   */
  private applyStarsAlignment(): void {
    const combinedRotation = this.calculateCombinedRotation();
    
    this.applySkyboxRotation(combinedRotation);
    this.applyGaiaRotation(combinedRotation);
    this.applyNearbyStarsRotation(combinedRotation);
  }
  
  /**
   * 计算组合旋转四元数
   * 
   * Calculates the combined rotation quaternion that includes:
   * - Extra rotation to align coordinate systems
   * - Rotation within the ecliptic plane
   * 
   * @returns Combined rotation quaternion
   */
  private calculateCombinedRotation(): THREE.Quaternion {
    const degToRad = Math.PI / 180;
    const obliquity = 23.44 * degToRad; // 黄赤交角
    
    const extraQuat = this.createExtraRotationQuaternion(degToRad);
    const eclipticNormal = this.calculateEclipticNormal(obliquity);
    const eclipticQuat = this.createEclipticRotationQuaternion(
      eclipticNormal,
      extraQuat,
      degToRad
    );
    
    // 组合：先 extraRotation，再黄道面内旋转
    return eclipticQuat.multiply(extraQuat);
  }
  
  /**
   * 创建额外旋转四元数
   * 
   * Creates a quaternion from the extra rotation angles defined in STARS_ALIGNMENT.
   * 
   * @param degToRad - Conversion factor from degrees to radians
   * @returns Quaternion representing the extra rotation
   */
  private createExtraRotationQuaternion(degToRad: number): THREE.Quaternion {
    const extraEuler = new THREE.Euler(
      STARS_ALIGNMENT.rotationX * degToRad,
      STARS_ALIGNMENT.rotationY * degToRad,
      STARS_ALIGNMENT.rotationZ * degToRad,
      'XYZ'
    );
    return new THREE.Quaternion().setFromEuler(extraEuler);
  }
  
  /**
   * 计算黄道法线向量
   * 
   * Calculates the ecliptic normal vector in equatorial coordinates.
   * 
   * @param obliquity - Obliquity of the ecliptic (radians)
   * @returns Normalized ecliptic normal vector
   */
  private calculateEclipticNormal(obliquity: number): THREE.Vector3 {
    return new THREE.Vector3(0, Math.cos(obliquity), Math.sin(obliquity)).normalize();
  }
  
  /**
   * 创建黄道面内旋转四元数
   * 
   * Creates a quaternion for rotation within the ecliptic plane.
   * 
   * @param eclipticNormal - Ecliptic normal vector
   * @param extraQuat - Extra rotation quaternion to apply first
   * @param degToRad - Conversion factor from degrees to radians
   * @returns Quaternion representing rotation within ecliptic plane
   */
  private createEclipticRotationQuaternion(
    eclipticNormal: THREE.Vector3,
    extraQuat: THREE.Quaternion,
    degToRad: number
  ): THREE.Quaternion {
    const transformedNormal = eclipticNormal.clone().applyQuaternion(extraQuat);
    return new THREE.Quaternion().setFromAxisAngle(
      transformedNormal,
      STARS_ALIGNMENT.eclipticRotation * degToRad
    );
  }
  
  /**
   * 应用天空盒旋转
   * 
   * Applies the combined rotation to the skybox, including its base orientation.
   * 
   * @param combinedRotation - Combined rotation quaternion
   */
  private applySkyboxRotation(combinedRotation: THREE.Quaternion): void {
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
  
  /**
   * 应用 Gaia 恒星旋转
   * 
   * Applies the combined rotation to the Gaia stars group.
   * 
   * @param combinedRotation - Combined rotation quaternion
   */
  private applyGaiaRotation(combinedRotation: THREE.Quaternion): void {
    if (this.gaiaStars) {
      this.gaiaStars.getGroup().quaternion.copy(combinedRotation);
    }
  }
  
  /**
   * 应用近邻恒星旋转
   * 
   * Applies the combined rotation to the nearby stars group.
   * 
   * @param combinedRotation - Combined rotation quaternion
   */
  private applyNearbyStarsRotation(combinedRotation: THREE.Quaternion): void {
    if (this.nearbyStars) {
      this.nearbyStars.getGroup().quaternion.copy(combinedRotation);
    }
  }

  /**
   * 创建备用星空背景（当银河系图片加载失败时使用）
   */
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
    
    const starfield = new THREE.Points(geometry, material);
    starfield.renderOrder = -1000;
    starfield.userData.isStarfield = true;
    starfield.userData.fixedToCamera = true;
    
    this.scene.add(starfield);
  }

  /**
   * 更新天空盒位置（跟随相机）
   * 
   * Updates the skybox position to follow the camera, ensuring it's always
   * centered on the camera regardless of camera movement.
   * 
   * @param cameraPosition - Current camera position
   * 
   * @example
   * ```typescript
   * sceneManager.updateSkyboxPosition(camera.position);
   * ```
   */
  updateSkyboxPosition(cameraPosition: THREE.Vector3): void {
    if (this.skybox) {
      this.skybox.position.copy(cameraPosition);
    }
  }
  
  /**
   * 更新多尺度宇宙视图（每帧调用）
   * 
   * Updates all multi-scale universe components based on camera distance.
   * Handles visibility transitions, opacity fading, and component updates
   * for nearby stars, Gaia stars, and galaxy renderer.
   * 
   * @param cameraDistance - Distance from camera to solar system center (AU)
   * @param deltaTime - Time elapsed since last frame (seconds)
   * @param starBrightness - Star brightness multiplier (0-2, default: 1.0)
   * 
   * @example
   * ```typescript
   * const distance = camera.position.length() / AU_TO_METERS;
   * sceneManager.updateMultiScaleView(distance, deltaTime, 1.5);
   * ```
   */
  /**
   * 更新多尺度宇宙视图
   * 
   * @description 根据相机距离动态更新多尺度宇宙组件的可见性和透明度。
   * 实现从太阳系到宇宙尺度的平滑过渡,避免视觉跳跃。
   * 
   * @renderPipeline 渲染管线阶段
   * 1. 距离计算：获取相机到场景中心的距离
   * 2. 组件更新：更新近邻恒星、Gaia 恒星、银河系渲染器
   * 3. 透明度计算：基于距离计算淡入淡出效果
   * 4. 可见性判断：动态显示/隐藏组件
   * 5. 背景更新：调整银河系天空盒透明度
   * 6. 边界更新：更新可观测宇宙边界球体
   * 
   * @performance
   * - 执行频率：每帧一次
   * - 性能影响：中等（主要是透明度计算和可见性判断）
   * - 优化策略：使用阈值避免频繁切换
   * 
   * @param cameraDistance - 相机距离（AU）
   * @param deltaTime - 帧时间间隔（秒）
   * 
   * @coordinateSystem
   * - 距离单位：AU（天文单位）
   * - 距离阈值：
   *   - 近邻恒星：100-10000 AU
   *   - Gaia 恒星：1000-100000 AU
   *   - 银河系：10000-1000000 AU
   *   - 本星系群：> 1000000 AU
   * 
   * @note
   * - 使用平滑过渡避免突兀的显示/隐藏
   * - 多个组件可以同时可见（叠加效果）
   * - 透明度计算使用线性插值
   * 
   * @example
   * ```typescript
   * const cameraDistance = camera.position.length();
   * const deltaTime = clock.getDelta();
   * sceneManager.updateMultiScaleView(cameraDistance, deltaTime);
   * ```
   */
  updateMultiScaleView(cameraDistance: number, deltaTime: number): void {
    // 更新近邻恒星
    if (this.nearbyStars) {
      this.nearbyStars.update(cameraDistance, deltaTime);
    }
    
    // 更新 Gaia 恒星
    if (this.gaiaStars) {
      this.gaiaStars.update(cameraDistance, deltaTime);
    }
    
    // 更新银河系
    if (this.galaxyRenderer) {
      this.galaxyRenderer.update(cameraDistance, deltaTime);
    }
    
    // 更新宇宙尺度渲染器
    if (this.localGroupRenderer) {
      this.localGroupRenderer.update(cameraDistance, deltaTime);
    }
    if (this.nearbyGroupsRenderer) {
      this.nearbyGroupsRenderer.update(cameraDistance, deltaTime);
    }
    if (this.virgoSuperclusterRenderer) {
      this.virgoSuperclusterRenderer.update(cameraDistance, deltaTime);
    }
    if (this.laniakeaSuperclusterRenderer) {
      this.laniakeaSuperclusterRenderer.update(cameraDistance, deltaTime);
    }
    
    // 更新可观测宇宙边界球体可见性（只在银河系尺度外显示）
    this.updateObservableBoundaryVisibility(cameraDistance);
    
    // 更新银河系背景透明度（当显示银河系粒子时淡出背景）
    this.updateSkyboxOpacity(cameraDistance, deltaTime);
  }
  
  /**
   * 更新可观测宇宙边界球体可见性
   * 只在银河系尺度外显示
   */
  private updateObservableBoundaryVisibility(cameraDistance: number): void {
    if (!this.observableBoundarySphere) return;
    
    const config = SCALE_VIEW_CONFIG;
    
    // 在银河系完全显示后才显示边界球体
    // galaxyShowFull 是银河系完全显示的距离
    const showDistance = config.galaxyShowFull || 100000 * 63241.077; // 默认 10 万光年
    
    this.observableBoundarySphere.visible = cameraDistance >= showDistance;
  }
  
  /**
   * 更新银河系背景透明度
   */
  private updateSkyboxOpacity(cameraDistance: number, deltaTime: number): void {
    const config = SCALE_VIEW_CONFIG;
    
    // 0.7 光年 = 0.7 * LIGHT_YEAR_TO_AU
    const fadeEnd = 0.7 * 63241.077; // 约 44269 AU
    
    // 直接根据距离计算，不使用平滑过渡
    let targetOpacity = 1;
    if (cameraDistance < config.milkyWayBackgroundFadeStart) {
      targetOpacity = 1;
    } else if (cameraDistance < fadeEnd) {
      const range = fadeEnd - config.milkyWayBackgroundFadeStart;
      targetOpacity = 1 - (cameraDistance - config.milkyWayBackgroundFadeStart) / range;
    } else {
      targetOpacity = 0;
    }
    
    // 直接设置透明度，不使用平滑过渡
    this.skyboxOpacity = targetOpacity;
    
    // 应用透明度到天空盒
    if (this.skybox) {
      if (this.skyboxOpacity > 0.01) {
        this.skybox.visible = true;
        const material = this.skybox.material as THREE.MeshBasicMaterial;
        material.opacity = this.skyboxOpacity;
        material.transparent = this.skyboxOpacity < 1;
      } else {
        // 完全隐藏
        this.skybox.visible = false;
      }
    }
  }
  
  /**
   * 获取近邻恒星渲染器
   * 
   * Returns the nearby stars renderer instance, or null if not initialized.
   * 
   * @returns NearbyStars instance or null
   * 
   * @example
   * ```typescript
   * const nearbyStars = sceneManager.getNearbyStars();
   * if (nearbyStars) {
   *   nearbyStars.setVisibility(true);
   * }
   * ```
   */
  getNearbyStars(): NearbyStars | null {
    return this.nearbyStars;
  }
  
  /**
   * 获取银河系渲染器
   * 
   * Returns the galaxy renderer instance, or null if not initialized.
   * 
   * @returns GalaxyRenderer instance or null
   * 
   * @example
   * ```typescript
   * const galaxy = sceneManager.getGalaxyRenderer();
   * if (galaxy) {
   *   galaxy.setVisibility(false);
   * }
   * ```
   */
  getGalaxyRenderer(): GalaxyRenderer | null {
    return this.galaxyRenderer;
  }
  
  /**
   * 设置本星系群渲染器
   */
  setLocalGroupRenderer(renderer: any): void {
    if (this.localGroupRenderer) {
      this.universeGroup.remove(this.localGroupRenderer.getGroup());
      this.localGroupRenderer.dispose();
    }
    this.localGroupRenderer = renderer;
    if (renderer) {
      // 添加到宇宙组，而不是直接添加到场景
      this.universeGroup.add(renderer.getGroup());
    }
  }
  
  /**
   * 设置近邻星系群渲染器
   */
  setNearbyGroupsRenderer(renderer: any): void {
    if (this.nearbyGroupsRenderer) {
      this.universeGroup.remove(this.nearbyGroupsRenderer.getGroup());
      this.nearbyGroupsRenderer.dispose();
    }
    this.nearbyGroupsRenderer = renderer;
    if (renderer) {
      // 添加到宇宙组，而不是直接添加到场景
      this.universeGroup.add(renderer.getGroup());
    }
  }
  
  /**
   * 设置室女座超星系团渲染器
   */
  setVirgoSuperclusterRenderer(renderer: any): void {
    if (this.virgoSuperclusterRenderer) {
      this.universeGroup.remove(this.virgoSuperclusterRenderer.getGroup());
      this.virgoSuperclusterRenderer.dispose();
    }
    this.virgoSuperclusterRenderer = renderer;
    if (renderer) {
      // 添加到宇宙组，而不是直接添加到场景
      this.universeGroup.add(renderer.getGroup());
    }
  }
  
  /**
   * 设置拉尼亚凯亚超星系团渲染器
   */
  setLaniakeaSuperclusterRenderer(renderer: any): void {
    if (this.laniakeaSuperclusterRenderer) {
      this.universeGroup.remove(this.laniakeaSuperclusterRenderer.getGroup());
      this.laniakeaSuperclusterRenderer.dispose();
    }
    this.laniakeaSuperclusterRenderer = renderer;
    if (renderer) {
      // 添加到宇宙组，而不是直接添加到场景
      this.universeGroup.add(renderer.getGroup());
    }
  }

  /**
   * 获取本星系群渲染器
   */
  getLocalGroupRenderer(): any | null {
    return this.localGroupRenderer;
  }

  /**
   * 获取近邻星系群渲染器
   */
  getNearbyGroupsRenderer(): any | null {
    return this.nearbyGroupsRenderer;
  }

  /**
   * 获取室女座超星系团渲染器
   */
  getVirgoSuperclusterRenderer(): any | null {
    return this.virgoSuperclusterRenderer;
  }

  /**
   * 获取拉尼亚凯亚超星系团渲染器
   */
  getLaniakeaSuperclusterRenderer(): any | null {
    return this.laniakeaSuperclusterRenderer;
  }
  
  /**
   * 设置宇宙组旋转偏移（用于调试对齐）
   * 这会同时旋转蓝色圆圈和所有外部星团
   */
  setUniverseGroupRotationOffset(x: number, y: number, z: number): void {
    const degToRad = Math.PI / 180;
    this.universeGroup.rotation.order = 'YXZ';
    this.universeGroup.rotation.x = x * degToRad;
    this.universeGroup.rotation.y = y * degToRad;
    this.universeGroup.rotation.z = z * degToRad;
    console.log('[SceneManager] 宇宙组旋转偏移已更新:', { x, y, z });
  }
  
  /**
   * 设置 EarthPlanet 实例（可选的 Cesium 地球集成）
   * 
   * @param earthPlanet - EarthPlanet 实例
   */
  setEarthPlanet(earthPlanet: any): void {
    this.earthPlanet = earthPlanet;
  }
  
  /**
   * 获取 EarthPlanet 实例
   * 
   * @returns EarthPlanet 实例或 null
   */
  getEarthPlanet(): any | null {
    return this.earthPlanet;
  }
  
  /**
   * 更新 EarthPlanet（如果存在）
   * 
   * 应在渲染循环中调用，用于更新 Cesium 地球渲染
   * 
   * @param deltaTime - 时间增量（秒）
   */
  updateEarthPlanet(deltaTime: number): void {
    if (this.earthPlanet && typeof this.earthPlanet.update === 'function') {
      this.earthPlanet.update(this.camera, deltaTime);
    }
  }

  /**
   * 更新渲染器和相机尺寸
   * 
   * Updates the renderer size and camera aspect ratio to match the container dimensions.
   * Should be called when the container is resized.
   * 
   * @example
   * ```typescript
   * window.addEventListener('resize', () => {
   *   sceneManager.updateSize();
   * });
   * ```
   */
  updateSize(): void {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    if (this.camera) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(width, height);
  }
  
  /**
   * 更新相机 FOV（视野角度）
   * 
   * Updates the camera field of view and recalculates the projection matrix.
   * 
   * @param fov - Field of view in degrees (typically 30-120)
   * 
   * @example
   * ```typescript
   * sceneManager.updateFOV(60); // Set to 60 degrees
   * ```
   */
  updateFOV(fov: number): void {
    if (this.camera) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * 获取 WebGL 渲染器实例
   * 
   * Returns the Three.js WebGLRenderer for direct access if needed.
   * 
   * @returns WebGLRenderer instance
   * 
   * @example
   * ```typescript
   * const renderer = sceneManager.getRenderer();
   * renderer.setPixelRatio(window.devicePixelRatio);
   * ```
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 切换 Cesium 合成模式
   * Cesium 模式下：Three.js canvas 透明背景，Cesium 在下层显示地球
   * 普通模式下：Three.js canvas 不透明黑色背景
   */
  setCesiumCompositeMode(enabled: boolean): void {
    if (enabled) {
      this.renderer.setClearColor(0x000000, 0); // 透明背景
      this.scene.background = null;
    } else {
      this.renderer.setClearColor(0x000000, 1); // 不透明黑色
      this.scene.background = new THREE.Color(0x000000);
    }
  }

  /**
   * 获取 Three.js 场景实例
   * 
   * Returns the Three.js Scene for adding/removing objects.
   * 
   * @returns Scene instance
   * 
   * @example
   * ```typescript
   * const scene = sceneManager.getScene();
   * scene.add(myMesh);
   * ```
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 获取透视相机实例
   * 
   * Returns the Three.js PerspectiveCamera for direct manipulation.
   * 
   * @returns PerspectiveCamera instance
   * 
   * @example
   * ```typescript
   * const camera = sceneManager.getCamera();
   * camera.position.set(0, 100, 200);
   * ```
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 渲染场景
   * 
   * Renders the scene using the current camera. Should be called in the animation loop.
   * 
   * @example
   * ```typescript
   * function animate() {
   *   sceneManager.render();
   *   requestAnimationFrame(animate);
   * }
   * ```
   */
  /**
   * 渲染场景
   * 
   * @description 执行 Three.js 渲染管线,将场景渲染到 WebGL 画布。
   * 这是渲染循环的最后一步,应该在所有更新完成后调用。
   * 
   * @renderPipeline 渲染管线阶段
   * 1. 视锥剔除：Three.js 自动剔除视锥外的对象
   * 2. 深度排序：根据渲染顺序和深度值排序对象
   * 3. 着色器编译：首次渲染时编译 GLSL 着色器
   * 4. 绘制调用：执行 WebGL drawArrays/drawElements
   * 5. 后处理：应用抗锯齿和色调映射
   * 
   * @performance
   * - 执行频率：每帧一次（通常 60 FPS）
   * - 性能瓶颈：GPU 绘制调用数量、着色器复杂度
   * - 优化策略：视锥剔除、LOD、实例化渲染
   * 
   * @note
   * - 使用对数深度缓冲处理大尺度范围
   * - 启用硬件抗锯齿（MSAA）
   * - 使用 sRGB 色彩空间确保颜色准确
   * 
   * @example
   * ```typescript
   * function animate() {
   *   sceneManager.updateMultiScaleView(cameraDistance, deltaTime);
   *   sceneManager.render(); // 渲染场景
   *   requestAnimationFrame(animate);
   * }
   * ```
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 动态调整相机视距裁剪
   * 
   * Dynamically adjusts camera near and far clipping planes based on the current
   * viewing context. Prevents z-fighting and clipping issues when viewing objects
   * at vastly different scales.
   * 
   * The near plane is adjusted to avoid clipping nearby objects, while the far
   * plane ensures distant objects remain visible. Works in conjunction with
   * CameraController's dynamic near plane adjustments.
   * 
   * @param currentObjectRadius - Radius of the currently focused object (meters)
   * @param distanceToSun - Distance from camera to the Sun (meters)
   * 
   * @example
   * ```typescript
   * sceneManager.updateCameraClipping(
   *   planetRadius,
   *   camera.position.distanceTo(sunPosition)
   * );
   * ```
   */
  updateCameraClipping(currentObjectRadius: number, distanceToSun: number): void {
    // 兼容 CameraController 的动态 near 调整：
    // - 不强行覆盖更小的 near（例如 CameraController 为避免剔除而设置的值）
    // - 建议 near 基于配置的最小值
    const suggestedNear = Math.max(VIEW_SETTINGS.minNearPlane, Math.min(0.01, currentObjectRadius * 0.001));

    // 仅当当前 camera.near 比建议值大时，才将其缩小到建议值；否则保持当前（以保留动态调整）
    if (this.camera.near > suggestedNear) {
      this.camera.near = suggestedNear;
    }

    // 使用固定的大值（100万AU）确保远处物体不被裁剪
    const minFar = 1e6;
    const far = Math.max(minFar, Math.min(VIEW_SETTINGS.maxFarPlane || 1e12, distanceToSun * 10));
    this.camera.far = far;

    this.camera.updateProjectionMatrix();
  }

  /**
   * 清理资源
   * 
   * Disposes of all WebGL resources, removes event listeners, and cleans up
   * multi-scale universe components. Should be called when the scene is no longer needed.
   * 
   * Properly disposes of:
   * - Nearby stars renderer
   * - Gaia stars renderer
   * - Galaxy renderer
   * - WebGL renderer and context
   * - Canvas element from DOM
   * 
   * @example
   * ```typescript
   * // Component unmount
   * useEffect(() => {
   *   return () => {
   *     sceneManager.dispose();
   *   };
   * }, []);
   * ```
   */
  dispose(): void {
    // 注意：resize 监听器由 SolarSystemCanvas3D 统一管理，这里不需要移除
    
    // 清理多尺度宇宙视图组件
    if (this.nearbyStars) {
      this.nearbyStars.dispose();
      this.nearbyStars = null;
    }
    
    if (this.gaiaStars) {
      this.gaiaStars.dispose();
      this.gaiaStars = null;
    }
    
    if (this.galaxyRenderer) {
      this.galaxyRenderer.dispose();
      this.galaxyRenderer = null;
    }
    
    // 清理宇宙尺度渲染器
    if (this.localGroupRenderer) {
      this.localGroupRenderer.dispose();
      this.localGroupRenderer = null;
    }
    if (this.nearbyGroupsRenderer) {
      this.nearbyGroupsRenderer.dispose();
      this.nearbyGroupsRenderer = null;
    }
    if (this.virgoSuperclusterRenderer) {
      this.virgoSuperclusterRenderer.dispose();
      this.virgoSuperclusterRenderer = null;
    }
    if (this.laniakeaSuperclusterRenderer) {
      this.laniakeaSuperclusterRenderer.dispose();
      this.laniakeaSuperclusterRenderer = null;
    }
    
    // 清理 EarthPlanet（如果存在）
    if (this.earthPlanet && typeof this.earthPlanet.dispose === 'function') {
      this.earthPlanet.dispose();
      this.earthPlanet = null;
    }
    
    // 清理可观测宇宙边界球体
    if (this.observableBoundarySphere) {
      this.scene.remove(this.observableBoundarySphere);
      this.observableBoundarySphere.geometry.dispose();
      (this.observableBoundarySphere.material as THREE.Material).dispose();
      this.observableBoundarySphere = null;
    }
    
    // 清理 WebGL 资源
    this.renderer.dispose();
    // 从 DOM 中移除 canvas
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
