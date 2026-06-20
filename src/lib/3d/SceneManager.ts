/**
 * 场景管理器 (Scene Manager)
 *
 * 核心职责：
 * - 持有并管理 Three.js 渲染器、场景和透视相机
 * - 协调所有宇宙尺度渲染器（星系、星系团、超星系团等）
 * - 管理天空盒（SkyboxManager）、参考网格（SolarSystemGrid）
 * - 控制 Three.js / Cesium 混合渲染模式切换
 * - 处理视锥体裁剪平面和内存管理
 *
 * 渲染层次：
 * 1. 天空盒 → 2. 星系团/超星系团 → 3. 邻近星系群 → 4. 本星系群
 * 5. 银河系 → 6. 太阳系网格 → 7. 行星/卫星
 */

import * as THREE from 'three';
import { VIEW_SETTINGS } from '../config/cameraConfig';
import { GalaxyRenderer } from './GalaxyRenderer';
import { GALAXY_CONFIG, SCALE_VIEW_CONFIG } from '../config/galaxyConfig';
import type { UniverseScaleRenderer } from '../types/universeTypes';
import { type GridInfo, SolarSystemGrid } from './SolarSystemGrid';
import { SceneModeManager } from './SceneModeManager';
import { SkyboxManager } from './scene-manager/SkyboxManager';
import { StarsAlignmentCalculator } from './scene-manager/StarsAlignmentCalculator';
import { UniverseGroupManager } from './scene-manager/UniverseGroupManager';

/**
 * 场景管理器 — 持有 Three.js 渲染器/场景/相机，协调所有宇宙尺度渲染器。
 */
/** Orchestrates the Three.js scene lifecycle: renderer, scene, camera setup,
 * renderer registration, resize handling, and mode switching (3D/Cesium).
 */
export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private cesiumCompositeMode: boolean = false;
  clippingLocked: boolean = false;

  private skyboxManager: SkyboxManager;
  private alignmentCalculator: StarsAlignmentCalculator;
  private universeGroupManager: UniverseGroupManager;

  private galaxyRenderer: GalaxyRenderer | null = null;

  private observableBoundarySphere: THREE.LineSegments | null = null;
  private solarSystemGrid: SolarSystemGrid | null = null;
  private earthPlanet: any | null = null;
  private sceneModeManager: SceneModeManager;

  constructor(container: HTMLElement) {
    this.container = container;

    this.universeGroupManager = new UniverseGroupManager();

    this.sceneModeManager = new SceneModeManager();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
      alpha: true,
    });

    if ('physicallyCorrectLights' in this.renderer) {
      (this.renderer as any).physicallyCorrectLights = true;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // 性能优化：降低 DPI 缩放上限（从 2.0 降到 1.5）
    // 在高 DPI 设备上减少约 25% 像素填充量，对视觉影响极小
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 1);

    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.zIndex = '1';

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.scene.add(this.universeGroupManager.getGroup());

    this.skyboxManager = new SkyboxManager(this.scene);
    this.alignmentCalculator = new StarsAlignmentCalculator();

    const aspect = container.clientWidth / container.clientHeight || 1;
    const fov = 75;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 1e12);
    this.camera.position.set(0, 0, 10);
    this.camera.layers.enable(1);

    this.updateSize();

    this.initializeMultiScaleView();
  }

  private initializeMultiScaleView(): void {
    this.initializeGalaxyRenderer();
    this.createObservableBoundarySphere();
    this.initializeSolarSystemGrid();
  }

  private initializeSolarSystemGrid(): void {
    this.solarSystemGrid = new SolarSystemGrid();
    this.scene.add(this.solarSystemGrid.getGroup());
  }

  private initializeGalaxyRenderer(): void {
    if (GALAXY_CONFIG.enabled) {
      this.galaxyRenderer = new GalaxyRenderer();
      this.scene.add(this.galaxyRenderer.getGroup());
      this.scene.add(this.galaxyRenderer.getSideViewGroup());
    }
  }

  private createObservableBoundarySphere(): void {
    const { OBSERVABLE_UNIVERSE_CONFIG } = require('../config/universeConfig');

    if (!OBSERVABLE_UNIVERSE_CONFIG.showObservableBoundary) return;

    const geometry = new THREE.SphereGeometry(OBSERVABLE_UNIVERSE_CONFIG.boundaryRadius, 64, 32);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(OBSERVABLE_UNIVERSE_CONFIG.boundaryColor),
      transparent: true,
      opacity: OBSERVABLE_UNIVERSE_CONFIG.boundaryOpacity,
      depthWrite: false,
      linewidth: 2,
    });

    this.observableBoundarySphere = new THREE.LineSegments(edges, material);
    this.observableBoundarySphere.name = 'ObservableBoundarySphere';
    this.observableBoundarySphere.renderOrder = -500;
    this.observableBoundarySphere.visible = false;

    this.scene.add(this.observableBoundarySphere);
    geometry.dispose();
  }

  getStarsAlignmentQuaternion(): THREE.Quaternion {
    return this.alignmentCalculator.getAlignmentQuaternion();
  }

  updateSkyboxPosition(cameraPosition: THREE.Vector3): void {
    this.skyboxManager.updatePosition(cameraPosition);
  }

  updateMultiScaleView(cameraDistance: number, deltaTime: number): void {
    if (this.galaxyRenderer) {
      this.galaxyRenderer.update(cameraDistance, deltaTime);
    }

    this.universeGroupManager.updateAll(cameraDistance, deltaTime);

    if (this.solarSystemGrid) {
      this.solarSystemGrid.update(this.camera, cameraDistance);
    }

    this.updateObservableBoundaryVisibility(cameraDistance);
    this.skyboxManager.updateOpacity(cameraDistance, this.cesiumCompositeMode);
  }

  getGridInfo(): GridInfo | null {
    return this.solarSystemGrid ? this.solarSystemGrid.getGridInfo() : null;
  }

  private updateObservableBoundaryVisibility(cameraDistance: number): void {
    if (!this.observableBoundarySphere) return;
    const config = SCALE_VIEW_CONFIG;
    const showDistance = config.galaxyShowFull || 100000 * 63241.077;
    this.observableBoundarySphere.visible = cameraDistance >= showDistance;
  }

  applyStarsAlignment(): void {
    const combinedRotation = this.alignmentCalculator.calculateCombinedRotation();
    this.skyboxManager.applyRotation(combinedRotation);
  }

  getGalaxyRenderer(): GalaxyRenderer | null {
    return this.galaxyRenderer;
  }

  setLocalGroupRenderer(renderer: UniverseScaleRenderer | null): void {
    this.universeGroupManager.setLocalGroupRenderer(renderer);
  }

  setNearbyGroupsRenderer(renderer: UniverseScaleRenderer | null): void {
    this.universeGroupManager.setNearbyGroupsRenderer(renderer);
  }

  setVirgoSuperclusterRenderer(renderer: UniverseScaleRenderer | null): void {
    this.universeGroupManager.setVirgoSuperclusterRenderer(renderer);
  }

  setLaniakeaSuperclusterRenderer(renderer: UniverseScaleRenderer | null): void {
    this.universeGroupManager.setLaniakeaSuperclusterRenderer(renderer);
  }

  getLocalGroupRenderer(): UniverseScaleRenderer | null {
    return this.universeGroupManager.getLocalGroupRenderer();
  }

  getNearbyGroupsRenderer(): UniverseScaleRenderer | null {
    return this.universeGroupManager.getNearbyGroupsRenderer();
  }

  getVirgoSuperclusterRenderer(): UniverseScaleRenderer | null {
    return this.universeGroupManager.getVirgoSuperclusterRenderer();
  }

  getLaniakeaSuperclusterRenderer(): UniverseScaleRenderer | null {
    return this.universeGroupManager.getLaniakeaSuperclusterRenderer();
  }

  setUniverseGroupRotationOffset(x: number, y: number, z: number): void {
    this.universeGroupManager.setRotationOffset(x, y, z);
  }

  setEarthPlanet(earthPlanet: any): void {
    this.earthPlanet = earthPlanet;
  }

  getEarthPlanet(): any | null {
    return this.earthPlanet;
  }

  getSceneModeManager(): SceneModeManager {
    return this.sceneModeManager;
  }

  updateSceneMode(distanceToEarth: number): boolean {
    return this.sceneModeManager.updateModeByDistance(distanceToEarth);
  }

  updateEarthPlanet(deltaTime: number): void {
    if (this.earthPlanet && typeof this.earthPlanet.update === 'function') {
      this.earthPlanet.update(this.camera, deltaTime);
    }
  }

  updateSize(): void {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(width, height);
  }

  updateFOV(fov: number): void {
    if (this.camera) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  setCesiumCompositeMode(enabled: boolean): void {
    this.cesiumCompositeMode = enabled;
    if (enabled) {
      this.renderer.setClearColor(0x000000, 0);
      this.scene.background = null;
      this.skyboxManager.setCesiumMode(true);
    } else {
      this.renderer.setClearColor(0x000000, 1);
      this.scene.background = new THREE.Color(0x000000);
      this.skyboxManager.setCesiumMode(false);
    }
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  render(): void {
    if (this.cesiumCompositeMode && this.skyboxManager.getSkybox()) {
      this.renderer.autoClear = false;
      this.renderer.clear(true, true, false);

      this.camera.layers.set(1);
      this.renderer.render(this.scene, this.camera);

      this.renderer.clearDepth();
      this.camera.layers.set(0);
      this.renderer.render(this.scene, this.camera);

      this.renderer.autoClear = true;
      this.camera.layers.enable(0);
      this.camera.layers.enable(1);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateCameraClipping(currentObjectRadius: number, distanceToSun: number): void {
    if (this.clippingLocked) return;

    const suggestedNear = Math.max(VIEW_SETTINGS.minNearPlane, Math.min(0.01, currentObjectRadius * 0.001));

    if (this.camera.near > suggestedNear) {
      this.camera.near = suggestedNear;
    }

    const minFar = 1e6;
    const far = Math.max(minFar, Math.min(VIEW_SETTINGS.maxFarPlane || 1e12, distanceToSun * 10));
    this.camera.far = far;

    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    if (this.galaxyRenderer) {
      this.galaxyRenderer.dispose();
      this.galaxyRenderer = null;
    }

    this.universeGroupManager.disposeAll();

    if (this.solarSystemGrid) {
      this.solarSystemGrid.dispose();
      this.solarSystemGrid = null;
    }

    if (this.earthPlanet && typeof this.earthPlanet.dispose === 'function') {
      this.earthPlanet.dispose();
      this.earthPlanet = null;
    }

    if (this.observableBoundarySphere) {
      this.scene.remove(this.observableBoundarySphere);
      this.observableBoundarySphere.geometry.dispose();
      (this.observableBoundarySphere.material as THREE.Material).dispose();
      this.observableBoundarySphere = null;
    }

    this.skyboxManager.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
