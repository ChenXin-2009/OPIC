import * as THREE from 'three';
import { ensureError } from '@/lib/utils/errors';
import type { SceneManager } from '../3d/SceneManager';
import type { CameraController } from '../3d/CameraController';
import { SceneMode } from '../3d/SceneModeManager';
import type { SolarSystemState } from '../state';
import type { IndexedCelestial } from './SearchIndex';
import { UniverseScale } from '../types/universeTypes';
import type { CelestialObject } from '../3d/FocusManager';

export class NavigationHandler {
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private store: SolarSystemState;

  constructor(
    sceneManager: SceneManager,
    cameraController: CameraController,
    store: SolarSystemState
  ) {
    this.sceneManager = sceneManager;
    this.cameraController = cameraController;
    this.store = store;
  }

  private prepareDeepSpaceNavigation(): void {
    this.cameraController.stopTracking();

    const sceneModeManager = this.sceneManager.getSceneModeManager();
    if (sceneModeManager.getCurrentMode() !== SceneMode.THREE_DOMINANT) {
      sceneModeManager.getTransitionProgress();
      sceneModeManager.switchMode(SceneMode.THREE_DOMINANT);
    }

    const earthPlanet = this.sceneManager.getEarthPlanet();
    if (earthPlanet && 'setCesiumNativeCameraMode' in earthPlanet) {
      (earthPlanet as any).setCesiumNativeCameraMode(false);
    }
    if (earthPlanet && 'getCesiumExtension' in earthPlanet) {
      const cesiumExt = (earthPlanet as any).getCesiumExtension();
      cesiumExt?.setNativeCameraEnabled?.(false);
    }

    const controls = this.cameraController.getControls();
    controls.enabled = true;
    (controls as any)._sphericalDelta?.set?.(0, 0, 0);
    (controls as any)._panOffset?.set?.(0, 0, 0);
    controls.update();
    this.cameraController.syncStateFromCamera();

    const renderer = this.sceneManager.getRenderer();
    renderer.domElement.style.pointerEvents = 'auto';
    renderer.domElement.style.zIndex = '1';
  }

  async navigateTo(result: IndexedCelestial): Promise<void> {
    try {
      switch (result.scale) {
        case UniverseScale.SolarSystem:
          this.navigateToSolarSystem(result);
          break;

        case UniverseScale.NearbyStars:
          this.navigateToExoplanet(result);
          break;

        case UniverseScale.LocalGroup:
        case UniverseScale.NearbyGroups:
        case UniverseScale.VirgoSupercluster:
        case UniverseScale.LaniakeaSupercluster:
          this.navigateToUniverse(result);
          break;

        default:
          this.navigateToSolarSystem(result);
      }

      this.store.selectPlanet(result.nameEn);

    } catch (error) {
      const err = ensureError(error);
      console.error('导航失败:', err);
      throw new Error(`无法导航到 ${result.nameZh || result.nameEn}: ${err.message}`, { cause: err });
    }
  }

  private navigateToExoplanet(celestial: IndexedCelestial): void {
    const raDeg = celestial.metadata?.raDeg;
    const decDeg = celestial.metadata?.decDeg;
    const distancePc = celestial.metadata?.distancePc;
    if (typeof raDeg !== 'number' || typeof decDeg !== 'number' || typeof distancePc !== 'number') {
      throw new Error(`系外恒星缺少位置数据`);
    }
    const raRad = THREE.MathUtils.degToRad(raDeg);
    const decRad = THREE.MathUtils.degToRad(decDeg);
    const dist = distancePc * 206264.806247;
    const x = dist * Math.cos(decRad) * Math.cos(raRad);
    const y = dist * Math.cos(decRad) * Math.sin(raRad);
    const z = dist * Math.sin(decRad);
    const pos = new THREE.Vector3(x, y, z);

    this.prepareDeepSpaceNavigation();
    this.cameraController.focusOnTarget(pos, undefined, undefined, {
      distance: dist * 0.15,
    });
  }

  private navigateToSolarSystem(celestial: IndexedCelestial): void {
    const body = this.store.celestialBodies.find(b => b.name === celestial.nameEn);

    if (!body) {
      throw new Error(`未找到太阳系天体: ${celestial.nameEn}`);
    }

    const celestialObject: CelestialObject = {
      name: body.name,
      radius: body.radius,
      isSun: body.name === 'Sun',
      isSatellite: body.parent !== undefined && body.parent !== 'Sun',
    };

    const targetPosition = new THREE.Vector3(body.x, body.y, body.z);

    const trackingTargetGetter = () => {
      const currentBody = this.store.celestialBodies.find(b => b.name === celestial.nameEn);
      if (currentBody) {
        return new THREE.Vector3(currentBody.x, currentBody.y, currentBody.z);
      }
      return targetPosition;
    };

    this.cameraController.focusOnTarget(
      targetPosition,
      celestialObject,
      trackingTargetGetter
    );
  }

  private navigateToUniverse(celestial: IndexedCelestial): void {
    let renderer: any = null;

    switch (celestial.scale) {
      case UniverseScale.LocalGroup:
        renderer = this.sceneManager.getLocalGroupRenderer();
        break;
      case UniverseScale.NearbyGroups:
        renderer = this.sceneManager.getNearbyGroupsRenderer();
        break;
      case UniverseScale.VirgoSupercluster:
        renderer = this.sceneManager.getVirgoSuperclusterRenderer();
        break;
      case UniverseScale.LaniakeaSupercluster:
        renderer = this.sceneManager.getLaniakeaSuperclusterRenderer();
        break;
    }

    if (!renderer) {
      throw new Error(`未找到 ${celestial.scale} 尺度的渲染器`);
    }

    this.prepareDeepSpaceNavigation();

    const targetPosition = celestial.position.clone();
    const distance = this.calculateUniverseViewDistance(celestial);

    this.cameraController.focusOnTarget(
      targetPosition,
      undefined,
      undefined,
      { distance }
    );
  }

  private calculateUniverseViewDistance(celestial: IndexedCelestial): number {
    const baseMultiplier = 2.5;
    let typeMultiplier = 1.0;
    switch (celestial.type) {
      case 'galaxy':
        typeMultiplier = 1.5;
        break;
      case 'group':
        typeMultiplier = 2.0;
        break;
      case 'cluster':
        typeMultiplier = 2.5;
        break;
      case 'supercluster':
        typeMultiplier = 3.0;
        break;
    }

    if (celestial.metadata?.radius) {
      const radius = celestial.metadata.radius;
      const MEGAPARSEC_TO_AU = 206264806.247;
      return radius * MEGAPARSEC_TO_AU * baseMultiplier * typeMultiplier;
    }

    if (celestial.distance) {
      return celestial.distance * 0.1 * typeMultiplier;
    }

    return 1000 * typeMultiplier;
  }
}
