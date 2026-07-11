/**
 * @module mods/space-flight/FlightCameraController
 * @description 发射场聚焦与火箭焦点跟随。
 *
 * 近地阶段（< 80 km）由 Cesium 原生相机驱动；火箭离开大气层后自动切换到
 * Three.js 追踪模式，恢复宇宙天空盒与星空。火箭叠加层始终用惯性系→黄道系
 * 的同一变换路径，避免地球自转被重复应用。
 */

import type { LaunchSite } from '@/lib/data/launch-sites';
import { SceneMode } from '@/lib/3d/SceneModeManager';
import { useSceneStore } from '@/lib/state/SceneStore';
import { useSolarSystemStore } from '@/lib/state';
import * as THREE from 'three';
import { eciToEcef, eciVelocityToEcef } from './flight-coordinate-transform';
import type { FlightRenderSnapshot } from './flight-runtime-store';
import { createAscentCameraPlan, createGroundCameraPlan, smoothingFactor } from './flight-camera-policy';

const METERS_PER_AU = 149_597_870_700;
const OBLIQUITY_RAD = 23.43928 * Math.PI / 180;
const COS_EPS = Math.cos(OBLIQUITY_RAD);
const SIN_EPS = Math.sin(OBLIQUITY_RAD);

/** ECI（赤道惯性系，米）→ 黄道系（AU），与 icrfToRenderWorld 完全一致。 */
function eciToEclipticAU(eciMeters: readonly [number, number, number]): THREE.Vector3 {
  const x = eciMeters[0] / METERS_PER_AU;
  const y = eciMeters[1] / METERS_PER_AU;
  const z = eciMeters[2] / METERS_PER_AU;
  return new THREE.Vector3(x, y * COS_EPS + z * SIN_EPS, -y * SIN_EPS + z * COS_EPS);
}

type CartesianLike = import('cesium').Cartesian3;
type CesiumModule = typeof import('cesium');

type ViewerLike = {
  terrainProvider?: unknown;
  clock?: {
    currentTime: import('cesium').JulianDate;
  };
  camera: {
    flyTo: (options: Record<string, unknown>) => Promise<void> | void;
    setView: (options: Record<string, unknown>) => void;
    lookAtTransform?: (transform: unknown, offset?: unknown) => void;
    cancelFlight?: () => void;
    positionWC?: CartesianLike;
    directionWC?: CartesianLike;
    upWC?: CartesianLike;
    moveEnd?: {
      addEventListener: (listener: () => void) => void;
      removeEventListener: (listener: () => void) => void;
    };
  };
  scene: {
    terrainProvider: unknown;
    globe?: {
      getHeight?: (position: unknown) => number | undefined;
      maximumScreenSpaceError?: number;
      preloadAncestors?: boolean;
      preloadSiblings?: boolean;
      showGroundAtmosphere?: boolean;
    };
    skyAtmosphere?: { show: boolean };
    fog?: {
      enabled: boolean;
      density: number;
      visualDensityScalar?: number;
      screenSpaceErrorFactor?: number;
      minimumBrightness: number;
    };
    screenSpaceCameraController?: {
      enableInputs: boolean;
      rotateEventTypes?: unknown;
      zoomEventTypes?: unknown;
      minimumZoomDistance?: number;
      maximumZoomDistance?: number;
    };
  };
};

export interface LaunchCameraPreparation {
  /** 当前 TerrainProvider 返回的 WGS84 椭球高，单位米。 */
  surfaceHeightM: number;
  terrainResolved: boolean;
}

/** 跟随模式都允许环绕和缩放；区别仅为焦点是否作惯性平滑。 */
export type FlightCameraMode = 'fixed' | 'inertial' | 'free';

interface PreparedSite extends LaunchCameraPreparation {
  site: LaunchSite;
  groundCameraPosition: CartesianLike;
  groundTarget: CartesianLike;
}

interface FastTravelGlobeState {
  maximumScreenSpaceError?: number;
  preloadAncestors?: boolean;
  preloadSiblings?: boolean;
  terrainProvider?: unknown;
}

const VIEWER_READY_EVENT = 'cesium:viewer-ready';
const VIEWER_WAIT_MS = 5_000;
const CAMERA_TARGET_RESPONSE_PER_SECOND = 9;

function getViewer(): ViewerLike | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { __cesiumViewer?: ViewerLike }).__cesiumViewer ?? null;
}

function isFiniteHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > -10_000 && value < 100_000;
}

function vectorLength(vector: CartesianLike): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

/**
 * 跟随通过 `lookAtTransform(ENU@rocket, localOffset)` 实现：每帧只移动焦点坐标系，
 * 相机在局部 ENU 的偏移来自当前用户视角，因此右键环绕和滚轮缩放不会被跟随逻辑覆盖。
 */
/** 高空切换阈值：火箭海拔超过此值后从 Cesium 追踪切换到 Three.js 追踪。 */
const HIGH_ALTITUDE_THRESHOLD_M = 80_000;

export class FlightCameraController {
  private cesium: CesiumModule | null = null;
  private cesiumLoading: Promise<CesiumModule> | null = null;
  private preparedSites = new Map<string, PreparedSite>();
  private pendingPreparations = new Map<string, Promise<PreparedSite>>();
  private tracking = false;
  private mode: FlightCameraMode = 'inertial';
  private smoothedRocket: CartesianLike | null = null;
  private smoothedTarget: CartesianLike | null = null;
  private activeTarget: CartesianLike | null = null;
  private lastUpdateMs: number | null = null;
  private fastTravelGlobeState: FastTravelGlobeState | null = null;
  private highAltitudeMode = false;
  private latestSnapshot: FlightRenderSnapshot | null = null;
  private threeTrackingEngaged = false;

  async prepareLaunchSite(
    site: LaunchSite,
    options: { flyTo?: boolean; duration?: number } = {},
  ): Promise<LaunchCameraPreparation> {
    const prepared = await this.prepareSite(site);
    if (options.flyTo !== false) {
      await this.activateGroundView(prepared, options.duration ?? 3.0);
    }
    return { surfaceHeightM: prepared.surfaceHeightM, terrainResolved: prepared.terrainResolved };
  }

  async getLaunchSurfaceHeight(site: LaunchSite): Promise<LaunchCameraPreparation> {
    const cached = this.preparedSites.get(site.id);
    if (cached) return { surfaceHeightM: cached.surfaceHeightM, terrainResolved: cached.terrainResolved };
    try {
      return await this.prepareLaunchSite(site, { flyTo: false });
    } catch {
      return { surfaceHeightM: site.altitude, terrainResolved: false };
    }
  }

  startTracking(site: LaunchSite): void {
    this.tracking = true;
    this.mode = 'inertial';
    this.smoothedRocket = null;
    this.smoothedTarget = null;
    this.activeTarget = null;
    this.lastUpdateMs = null;
    this.highAltitudeMode = false;
    this.latestSnapshot = null;
    this.clearHighAltitudeFlag();
    this.disengageThreeTracking();
    this.setNativeInputs(true);
    this.applyPreparedGroundView(this.preparedSites.get(site.id));
  }

  setMode(mode: FlightCameraMode): void {
    this.mode = mode;
    this.setNativeInputs(true);
    if (mode === 'free') {
      this.detachTrackingFrame();
      this.releaseCesiumMode();
      this.disengageThreeTracking();
      return;
    }
    this.activeTarget = null;
    // 重新进入追踪模式时，如果已在高空模式，重新启动 Three.js 追踪
    if (this.highAltitudeMode && this.latestSnapshot) {
      this.engageThreeTracking(this.latestSnapshot);
    }
  }

  getMode(): FlightCameraMode {
    return this.mode;
  }

  stopTracking(): void {
    this.tracking = false;
    this.detachTrackingFrame();
    this.smoothedRocket = null;
    this.smoothedTarget = null;
    this.activeTarget = null;
    this.lastUpdateMs = null;
    this.mode = 'inertial';
    this.setNativeInputs(true);
    this.releaseCesiumMode();
    this.disengageThreeTracking();
    this.clearHighAltitudeFlag();
    this.latestSnapshot = null;
  }

  /**
   * 模拟自然终止时调用。释放相机锁定让用户自由操作，但保留高空标志
   * 使 Three.js 主导模式（天空盒可见）不会被动画循环切回 Cesium。
   * 用户开启新一次发射时 startTracking() 会清理所有标志。
   */
  releaseOnSimulationEnd(): void {
    this.tracking = false;
    this.detachTrackingFrame();
    this.smoothedRocket = null;
    this.smoothedTarget = null;
    this.activeTarget = null;
    this.lastUpdateMs = null;
    this.setNativeInputs(true);
    this.releaseCesiumMode();
    this.disengageThreeTracking();
    // 故意不清除 __spaceFlightHighAltitude：
    // 若火箭在高空终止，保留此标志使动画循环维持 THREE_DOMINANT，
    // 天空盒和星空保持可见，用户可自由缩放/环绕。
    // startTracking() 会在下次发射时清理它。
  }

  /** 由主动画循环在 Cesium → Three.js 同步之前每帧调用。 */
  // eslint-disable-next-line complexity -- 相机状态机需明确处理三种模式、缺失 viewer 与初始快照。
  update(snapshot: FlightRenderSnapshot | null): void {
    if (!this.tracking || !snapshot?.active || snapshot.ended) return;
    this.latestSnapshot = snapshot;
    if (this.mode === 'free') return;

    // 计算火箭海拔，判断是否需要切换到高空 Three.js 模式
    const altitudeM = this.computeAltitudeMeters(snapshot);
    if (!this.highAltitudeMode && altitudeM >= HIGH_ALTITUDE_THRESHOLD_M) {
      this.transitionToHighAltitude(snapshot);
    }

    // 高空模式下由 CameraController 的 trackingTargetGetter 驱动，无需此处操作
    if (this.highAltitudeMode) return;

    if (!this.cesium) {
      void this.loadCesium();
      return;
    }

    const viewer = getViewer();
    if (!viewer) return;
    this.maintainFog(viewer);

    const Cesium = this.cesium;
    // 使用 Cesium 原生 ICRF→Fixed 变换，确保与 Cesium 地球自转完全一致，
    // 避免简化 GMST 与 Cesium 精确矩阵之间的偏差导致火箭偏离发射架。
    const ecefPosition = this.eciToEcefViaCesium(snapshot.positionEci);
    const rocket = new Cesium.Cartesian3(ecefPosition.x, ecefPosition.y, ecefPosition.z);
    const nowMs = typeof performance === 'undefined' ? Date.now() : performance.now();
    const deltaSeconds = this.lastUpdateMs === null ? 1 / 60 : Math.min(0.25, (nowMs - this.lastUpdateMs) / 1000);
    this.lastUpdateMs = nowMs;

    const alpha = this.mode === 'fixed' ? 1 : smoothingFactor(deltaSeconds, CAMERA_TARGET_RESPONSE_PER_SECOND);
    this.smoothedRocket = this.lerpPosition(this.smoothedRocket, rocket, alpha);

    const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(this.smoothedRocket, new Cesium.Cartesian3());
    const profile = createAscentCameraPlan(altitudeM);
    const ecefVelocity = this.eciVelocityToEcefViaCesium(snapshot.velocityEci, ecefPosition);
    const flightDirection = this.resolveFlightDirection(ecefVelocity, up);
    const targetOffset = profile.phase === 'pad'
      ? Cesium.Cartesian3.multiplyByScalar(up, profile.lookAheadM, new Cesium.Cartesian3())
      : Cesium.Cartesian3.multiplyByScalar(flightDirection, profile.lookAheadM, new Cesium.Cartesian3());
    const desiredTarget = Cesium.Cartesian3.add(this.smoothedRocket, targetOffset, new Cesium.Cartesian3());
    this.smoothedTarget = this.lerpPosition(this.smoothedTarget, desiredTarget, alpha);

    this.attachTrackingFrame(viewer, this.smoothedTarget);
  }

  private attachTrackingFrame(viewer: ViewerLike, target: CartesianLike): void {
    const Cesium = this.cesium!;
    if (!viewer.camera.lookAtTransform) return;

    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(target);
    const worldCamera = viewer.camera.positionWC;
    let localOffset: CartesianLike;

    if (worldCamera) {
      const referenceTarget = this.activeTarget ?? target;
      const referenceTransform = Cesium.Transforms.eastNorthUpToFixedFrame(referenceTarget);
      const inverse = Cesium.Matrix4.inverseTransformation(referenceTransform, new Cesium.Matrix4());
      localOffset = Cesium.Matrix4.multiplyByPoint(inverse, worldCamera, new Cesium.Cartesian3());
    } else {
      localOffset = new Cesium.Cartesian3(0, -260, 3);
    }

    viewer.camera.lookAtTransform(transform, localOffset);
    this.activeTarget = Cesium.Cartesian3.clone(target, new Cesium.Cartesian3());
  }

  private detachTrackingFrame(): void {
    const viewer = getViewer();
    const Cesium = this.cesium;
    if (!viewer || !Cesium || !viewer.camera.positionWC) return;

    const destination = Cesium.Cartesian3.clone(viewer.camera.positionWC, new Cesium.Cartesian3());
    const direction = viewer.camera.directionWC && Cesium.Cartesian3.clone(viewer.camera.directionWC, new Cesium.Cartesian3());
    const up = viewer.camera.upWC && Cesium.Cartesian3.clone(viewer.camera.upWC, new Cesium.Cartesian3());
    viewer.camera.lookAtTransform?.(Cesium.Matrix4.IDENTITY);
    if (direction && up) {
      viewer.camera.setView({ destination, orientation: { direction, up } });
    }
  }

  /** 计算火箭相对地球表面的海拔（米）。 */
  private computeAltitudeMeters(snapshot: FlightRenderSnapshot): number {
    const posEci = snapshot.positionEci;
    const radiusM = Math.hypot(posEci[0], posEci[1], posEci[2]);
    return Math.max(0, radiusM - 6_371_000);
  }

  /**
   * 火箭离开大气层后从 Cesium 追踪切换到 Three.js 追踪。
   * 解除 Cesium 原生相机锁定，设置高空标志让动画循环切回 THREE_DOMINANT，
   * 然后用 CameraController.focusOnTarget 在 Three.js 场景中持续跟随火箭。
   */
  private transitionToHighAltitude(snapshot: FlightRenderSnapshot): void {
    this.highAltitudeMode = true;
    this.detachTrackingFrame();
    this.releaseCesiumMode();
    this.setHighAltitudeFlag();
    this.engageThreeTracking(snapshot);
  }

  /** 在 Three.js 场景中设置火箭追踪。 */
  private engageThreeTracking(snapshot: FlightRenderSnapshot): void {
    const { sceneManager, cameraController } = useSceneStore.getState();
    if (!sceneManager || !cameraController) return;

    const camera = sceneManager.getCamera();
    const controls = cameraController.getControls();
    const rocketWorldPos = this.computeRocketWorldPosition(snapshot);
    const altitudeM = this.computeAltitudeMeters(snapshot);
    const profile = createAscentCameraPlan(altitudeM);
    const distanceM = Math.max(profile.rangeM, 500);
    const distanceAU = distanceM / METERS_PER_AU;

    // ── 1. 直接定位相机，避免 focusOnTarget 过渡动画造成跳跃 ──
    // Cesium 期间 OrbitControls 内部球坐标已过时。如果先调 focusOnTarget 再让
    // 动画循环的 controls.update() 跑，update() 会用过时球坐标把相机拉回旧位置。
    // 解决：先直接设好 camera.position + controls.target，再调 syncStateFromCamera()
    // 刷新 OrbitControls 内部状态，最后用 focusOnTarget 仅注册 tracking getter。
    const currentOffset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const currentDir = currentOffset.lengthSq() > 1e-20
      ? currentOffset.normalize()
      : new THREE.Vector3(0, 0.3, 1).normalize();
    camera.position.copy(rocketWorldPos).addScaledVector(currentDir, distanceAU);
    controls.target.copy(rocketWorldPos);
    controls.update();
    cameraController.syncStateFromCamera();

    // ── 2. 注册追踪 getter（不传 celestialObject，直接用 distance） ──
    const trackingGetter = (): THREE.Vector3 => {
      return this.computeRocketWorldPosition(this.latestSnapshot);
    };
    cameraController.focusOnTarget(rocketWorldPos, undefined, trackingGetter, { distance: distanceAU });
    cameraController.syncStateFromCamera();
    controls.enabled = true;
    this.threeTrackingEngaged = true;

    // ── 3. 恢复 Three.js 场景 ──
    sceneManager.setCesiumCompositeMode(false);
    const renderer = sceneManager.getRenderer();
    renderer.domElement.style.pointerEvents = 'auto';

    // 恢复地球行星的非原生相机模式
    const earthPlanet = sceneManager.getEarthPlanet();
    if (earthPlanet) {
      // setCesiumNativeCameraMode(false) 现在会自动恢复地球网格材质
      earthPlanet.setCesiumNativeCameraMode(false);
      const extension = earthPlanet.getCesiumExtension();
      extension?.setNativeCameraEnabled(false);
    }
  }

  /** 解除 Three.js 追踪。 */
  private disengageThreeTracking(): void {
    if (!this.threeTrackingEngaged) return;
    const { cameraController } = useSceneStore.getState();
    cameraController?.stopTracking();
    this.threeTrackingEngaged = false;
  }

  /** 计算火箭在 Three.js 世界坐标系中的位置（AU，黄道系）。 */
  private computeRocketWorldPosition(snapshot: FlightRenderSnapshot | null): THREE.Vector3 {
    if (!snapshot) return new THREE.Vector3();
    const earthBody = useSolarSystemStore.getState().celestialBodies.find(
      (body) => body.name?.toLowerCase() === 'earth',
    );
    const earthPos = earthBody
      ? new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z)
      : new THREE.Vector3();
    return earthPos.add(eciToEclipticAU(snapshot.positionEci));
  }

  /**
   * 使用 Cesium 原生 ICRF→Fixed 矩阵将 ECI 位置转换为 ECEF，
   * 确保与 Cesium 地球自转完全一致。
   */
  private eciToEcefViaCesium(positionEci: readonly [number, number, number]): { x: number; y: number; z: number } {
    const viewer = getViewer();
    const Cesium = this.cesium;
    if (!viewer || !Cesium) {
      // 回退到简化 GMST
      const ecef = eciToEcef(positionEci, this.latestSnapshot?.absoluteTimeMs ?? Date.now());
      return { x: ecef[0], y: ecef[1], z: ecef[2] };
    }
    const icrfToFixed = new Cesium.Matrix3();
    const cesiumTime = viewer.clock?.currentTime;
    const result = cesiumTime ? Cesium.Transforms.computeIcrfToFixedMatrix(cesiumTime, icrfToFixed) : undefined;
    if (!result) {
      const ecef = eciToEcef(positionEci, this.latestSnapshot?.absoluteTimeMs ?? Date.now());
      return { x: ecef[0], y: ecef[1], z: ecef[2] };
    }
    const inertial = new Cesium.Cartesian3(positionEci[0], positionEci[1], positionEci[2]);
    const ecef = Cesium.Matrix3.multiplyByVector(icrfToFixed, inertial, new Cesium.Cartesian3());
    return { x: ecef.x, y: ecef.y, z: ecef.z };
  }

  /** ECI 速度 → ECEF 速度，使用 Cesium 原生变换。 */
  private eciVelocityToEcefViaCesium(
    velocityEci: readonly [number, number, number],
    positionEcef: { x: number; y: number; z: number },
  ): [number, number, number] {
    const viewer = getViewer();
    const Cesium = this.cesium;
    if (!viewer || !Cesium) {
      return eciVelocityToEcef(velocityEci, [positionEcef.x, positionEcef.y, positionEcef.z], this.latestSnapshot?.absoluteTimeMs ?? Date.now());
    }
    const icrfToFixed = new Cesium.Matrix3();
    const cesiumTime = viewer.clock?.currentTime;
    const result = cesiumTime ? Cesium.Transforms.computeIcrfToFixedMatrix(cesiumTime, icrfToFixed) : undefined;
    if (!result) {
      return eciVelocityToEcef(velocityEci, [positionEcef.x, positionEcef.y, positionEcef.z], this.latestSnapshot?.absoluteTimeMs ?? Date.now());
    }
    const inertial = new Cesium.Cartesian3(velocityEci[0], velocityEci[1], velocityEci[2]);
    const rotated = Cesium.Matrix3.multiplyByVector(icrfToFixed, inertial, new Cesium.Cartesian3());
    // 减去地球自转速度项 ω × r
    const earthAngularVelocity = 7.2921159e-5;
    return [
      rotated.x + earthAngularVelocity * positionEcef.y,
      rotated.y - earthAngularVelocity * positionEcef.x,
      rotated.z,
    ];
  }

  /** 每帧维持 Cesium 雾化效果，防止被其他代码重置。 */
  private maintainFog(viewer: ViewerLike): void {
    const fog = viewer.scene.fog;
    if (!fog) return;
    fog.enabled = true;
    fog.density = 0.0025;
    fog.visualDensityScalar = 0.8;
    fog.screenSpaceErrorFactor = 4;
    fog.minimumBrightness = 0.03;
  }

  private setHighAltitudeFlag(): void {
    if (typeof window !== 'undefined') {
      (window as Window & { __spaceFlightHighAltitude?: boolean }).__spaceFlightHighAltitude = true;
    }
  }

  private clearHighAltitudeFlag(): void {
    if (typeof window !== 'undefined') {
      delete (window as Window & { __spaceFlightHighAltitude?: boolean }).__spaceFlightHighAltitude;
    }
    this.highAltitudeMode = false;
  }

  private applyPreparedGroundView(prepared: PreparedSite | undefined): void {
    const viewer = getViewer();
    const Cesium = this.cesium;
    if (!viewer || !Cesium || !prepared) return;

    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(prepared.groundTarget, prepared.groundCameraPosition, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(prepared.groundCameraPosition, new Cesium.Cartesian3());
    viewer.camera.cancelFlight?.();
    viewer.camera.setView({ destination: prepared.groundCameraPosition, orientation: { direction, up } });
  }

  private async prepareSite(site: LaunchSite): Promise<PreparedSite> {
    const cached = this.preparedSites.get(site.id);
    if (cached) return cached;
    const pending = this.pendingPreparations.get(site.id);
    if (pending) return pending;

    const operation = this.createPreparedSite(site)
      .finally((): void => { this.pendingPreparations.delete(site.id); });
    this.pendingPreparations.set(site.id, operation);
    return operation;
  }

  private async createPreparedSite(site: LaunchSite): Promise<PreparedSite> {
    const viewer = await this.waitForViewer();
    const Cesium = await this.loadCesium();
    const [surfaceHeightM, terrainResolved] = await this.sampleSurfaceHeight(Cesium, viewer, site);
    const pad = Cesium.Cartesian3.fromDegrees(site.lon, site.lat, surfaceHeightM);
    const plan = createGroundCameraPlan();
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(pad);
    const groundCameraPosition = Cesium.Matrix4.multiplyByPoint(
      transform,
      new Cesium.Cartesian3(...plan.cameraOffsetEnu),
      new Cesium.Cartesian3(),
    );
    const groundTarget = Cesium.Matrix4.multiplyByPoint(
      transform,
      new Cesium.Cartesian3(...plan.targetOffsetEnu),
      new Cesium.Cartesian3(),
    );
    const prepared = { site, surfaceHeightM, terrainResolved, groundCameraPosition, groundTarget };
    this.preparedSites.set(site.id, prepared);
    return prepared;
  }

  private async activateGroundView(prepared: PreparedSite, duration: number): Promise<void> {
    const Cesium = await this.loadCesium();
    const viewer = await this.waitForViewer();
    await this.zoomThreeToCesiumThreshold();
    this.forceCesiumMode();
    this.engageCesiumNativeCamera();
    this.ensureGroundAtmosphere(viewer);
    this.setFastTravelMode(viewer, true);
    try {
      await this.waitForAnimationFrames(2);
      const direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(prepared.groundTarget, prepared.groundCameraPosition, new Cesium.Cartesian3()),
        new Cesium.Cartesian3(),
      );
      const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(prepared.groundCameraPosition, new Cesium.Cartesian3());
      viewer.camera.cancelFlight?.();
      const flightComplete = this.waitForFlightEnd(viewer, duration);
      viewer.camera.flyTo({
        destination: prepared.groundCameraPosition,
        orientation: { direction, up },
        duration,
      });
      await flightComplete;
    } finally {
      this.setFastTravelMode(viewer, false);
      // The override is only a hand-off guard.  Keeping it through ascent
      // prevents the normal distance hysteresis from restoring Three.js,
      // which also leaves the universe skybox in transparent-composite mode.
      this.releaseCesiumMode();
    }
  }

  /** 先在 Three.js 层缩放到 Cesium 切换阈值，再进入原生地球。 */
  private async zoomThreeToCesiumThreshold(): Promise<void> {
    const { sceneManager, cameraController } = useSceneStore.getState();
    if (!sceneManager || !cameraController) return;
    if (sceneManager.getSceneModeManager().getCurrentMode() !== SceneMode.THREE_DOMINANT) return;

    const earth = useSolarSystemStore.getState().celestialBodies.find(
      (body) => body.name?.toLowerCase() === 'earth',
    );
    if (!earth) return;

    const target = new THREE.Vector3(earth.x, earth.y, earth.z);
    const camera = sceneManager.getCamera();
    const controls = cameraController.getControls();
    cameraController.stopTracking();
    controls.enabled = true;

    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const direction = startPosition.clone().sub(target);
    if (direction.lengthSq() < 1e-18) direction.set(0, 0.35, 1);
    direction.normalize();
    const endPosition = target.clone().addScaledVector(direction, 0.00007);
    const durationMs = 900;
    const startedAt = performance.now();

    while (true) {
      const rawProgress = Math.min(1, (performance.now() - startedAt) / durationMs);
      const eased = 1 - (1 - rawProgress) ** 3;
      camera.position.lerpVectors(startPosition, endPosition, eased);
      controls.target.lerpVectors(startTarget, target, eased);
      controls.update();
      if (rawProgress >= 1) break;
      await this.waitForAnimationFrames(1);
    }
    cameraController.syncStateFromCamera();
  }

  /** 由聚焦流程主动完成渲染层交接，避免 Three.js 在下一帧覆写 Cesium 飞行。 */
  private engageCesiumNativeCamera(): void {
    const { sceneManager, cameraController } = useSceneStore.getState();
    if (!sceneManager) return;
    const modeManager = sceneManager.getSceneModeManager();
    modeManager.getTransitionProgress();
    if (modeManager.getCurrentMode() !== SceneMode.CESIUM_DOMINANT) {
      modeManager.switchMode(SceneMode.CESIUM_DOMINANT);
    }

    sceneManager.setCesiumCompositeMode(true);

    if (cameraController) cameraController.getControls().enabled = false;
    sceneManager.getRenderer().domElement.style.pointerEvents = 'none';
    const earthPlanet = sceneManager.getEarthPlanet();
    if (!earthPlanet) return;
    earthPlanet.setCesiumNativeCameraMode(true);
    const extension = earthPlanet.getCesiumExtension();
    extension?.syncCamera(sceneManager.getCamera(), earthPlanet.getMesh().position);
    extension?.setNativeCameraEnabled(true);
  }

  private ensureGroundAtmosphere(viewer: ViewerLike): void {
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
    if (viewer.scene.globe) viewer.scene.globe.showGroundAtmosphere = true;
    if (viewer.scene.fog) {
      // 加强雾化使近地能见度自然过渡——远处的地形和海面逐渐隐入雾中，
      // 而不是一眼看到地平线尽头。maintainFog() 会在每帧维持这些值。
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0025;
      viewer.scene.fog.visualDensityScalar = 0.8;
      viewer.scene.fog.screenSpaceErrorFactor = 4;
      viewer.scene.fog.minimumBrightness = 0.03;
    }
  }

  /** 跳转期间大幅降低 LOD 并关闭预取，避免高分瓦片抢占相机动画帧。 */
  private setFastTravelMode(viewer: ViewerLike, enabled: boolean): void {
    const globe = viewer.scene.globe;
    if (!globe) return;
    if (enabled) {
      if (!this.fastTravelGlobeState) {
        this.fastTravelGlobeState = {
          maximumScreenSpaceError: globe.maximumScreenSpaceError,
          preloadAncestors: globe.preloadAncestors,
          preloadSiblings: globe.preloadSiblings,
          terrainProvider: viewer.terrainProvider,
        };
      }
      // 直接切至椭球面以暂停真实地形请求；影像层同步降低 LOD，飞行结束后
      // 原 TerrainProvider 原样恢复，不会丢失已缓存瓦片。
      if (this.cesium && viewer.terrainProvider) {
        viewer.terrainProvider = new this.cesium.EllipsoidTerrainProvider();
      }
      globe.maximumScreenSpaceError = 64;
      globe.preloadAncestors = false;
      globe.preloadSiblings = false;
      return;
    }
    if (!this.fastTravelGlobeState) return;
    globe.maximumScreenSpaceError = this.fastTravelGlobeState.maximumScreenSpaceError;
    globe.preloadAncestors = this.fastTravelGlobeState.preloadAncestors;
    globe.preloadSiblings = this.fastTravelGlobeState.preloadSiblings;
    if (this.fastTravelGlobeState.terrainProvider) {
      viewer.terrainProvider = this.fastTravelGlobeState.terrainProvider;
    }
    this.fastTravelGlobeState = null;
  }

  private async sampleSurfaceHeight(
    Cesium: CesiumModule,
    viewer: ViewerLike,
    site: LaunchSite,
  ): Promise<readonly [number, boolean]> {
    const cartographic = Cesium.Cartographic.fromDegrees(site.lon, site.lat);
    try {
      const provider = viewer.terrainProvider ?? viewer.scene.terrainProvider;
      const [sample] = await Cesium.sampleTerrainMostDetailed(provider as never, [cartographic]);
      if (isFiniteHeight(sample?.height)) return [sample.height, true] as const;
    } catch {
      // Terrain 服务不可用时继续使用已加载瓦片或发射场数据库高度。
    }
    const sceneHeight = viewer.scene.globe?.getHeight?.(cartographic);
    if (isFiniteHeight(sceneHeight)) return [sceneHeight, true] as const;
    return [site.altitude, false] as const;
  }

  private resolveFlightDirection(velocityEcef: readonly [number, number, number], up: CartesianLike): CartesianLike {
    const Cesium = this.cesium!;
    const direction = new Cesium.Cartesian3(...velocityEcef);
    if (vectorLength(direction) < 1) return Cesium.Cartesian3.clone(up, new Cesium.Cartesian3());
    return Cesium.Cartesian3.normalize(direction, direction);
  }

  private lerpPosition(current: CartesianLike | null, target: CartesianLike, alpha: number): CartesianLike {
    const Cesium = this.cesium!;
    if (!current) return Cesium.Cartesian3.clone(target, new Cesium.Cartesian3());
    return Cesium.Cartesian3.lerp(current, target, alpha, new Cesium.Cartesian3());
  }

  private forceCesiumMode(): void {
    if (typeof window !== 'undefined') {
      (window as Window & { __spaceFlightCesiumCameraActive?: boolean }).__spaceFlightCesiumCameraActive = true;
    }
  }

  private releaseCesiumMode(): void {
    if (typeof window !== 'undefined') {
      delete (window as Window & { __spaceFlightCesiumCameraActive?: boolean }).__spaceFlightCesiumCameraActive;
    }
  }

  private setNativeInputs(enabled: boolean): void {
    const controller = getViewer()?.scene.screenSpaceCameraController;
    if (!controller) return;
    controller.enableInputs = enabled;
    if (!enabled || !this.cesium) return;
    // 相机绕当前火箭焦点环绕时，禁止把镜头推进到箭体内部或越过焦点。
    controller.minimumZoomDistance = 35;
    controller.maximumZoomDistance = 50_000_000;
    controller.rotateEventTypes = [this.cesium.CameraEventType.RIGHT_DRAG];
    controller.zoomEventTypes = [this.cesium.CameraEventType.WHEEL];
  }

  private async loadCesium(): Promise<CesiumModule> {
    if (this.cesium) return this.cesium;
    this.cesiumLoading ??= import('cesium').then((Cesium): CesiumModule => {
      this.cesium = Cesium;
      return Cesium;
    });
    return this.cesiumLoading;
  }

  private async waitForViewer(): Promise<ViewerLike> {
    const current = getViewer();
    if (current) return current;
    if (typeof window === 'undefined') throw new Error('Cesium viewer is only available in the browser');

    return new Promise<ViewerLike>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Cesium viewer did not become ready in time'));
      }, VIEWER_WAIT_MS);
      const onReady = (): void => {
        const viewer = getViewer();
        if (!viewer) return;
        cleanup();
        resolve(viewer);
      };
      const cleanup = (): void => {
        window.clearTimeout(timeout);
        window.removeEventListener(VIEWER_READY_EVENT, onReady);
      };
      window.addEventListener(VIEWER_READY_EVENT, onReady);
    });
  }

  private waitForFlightEnd(viewer: ViewerLike, durationSeconds: number): Promise<void> {
    const moveEnd = viewer.camera.moveEnd;
    if (!moveEnd || typeof window === 'undefined') {
      return new Promise((resolve) => window.setTimeout(resolve, durationSeconds * 1000));
    }
    return new Promise<void>((resolve) => {
      let timeout: number | null = null;
      const cleanup = (): void => {
        if (timeout !== null) window.clearTimeout(timeout);
        moveEnd.removeEventListener(onMoveEnd);
        resolve();
      };
      const onMoveEnd = (): void => cleanup();
      timeout = window.setTimeout(cleanup, durationSeconds * 1000 + 1_000);
      moveEnd.addEventListener(onMoveEnd);
    });
  }

  private async waitForAnimationFrames(count: number): Promise<void> {
    if (typeof requestAnimationFrame === 'undefined') return;
    for (let index = 0; index < count; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
}

const flightCameraController = new FlightCameraController();

export function getFlightCameraController(): FlightCameraController {
  return flightCameraController;
}
