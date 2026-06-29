'use client';

import { useCallback, useRef } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { useExoplanetStore } from '@/lib/store/useExoplanetStore';
import { useEarthControlStore } from '@/lib/state/EarthControlStore';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { SceneMode } from '@/lib/3d/SceneModeManager';
import { dateToJulianDay } from '@/lib/astronomy/time';
import { FAR_VIEW_CONFIG, ORBIT_FADE_CONFIG, SATELLITE_CONFIG } from '@/lib/config/visualConfig';
import { CAMERA_CONFIG } from '@/lib/config/cameraConfig';
import { planetNames } from '@/lib/astronomy/names';
import { useLunarStore } from '@/lib/store/LunarState';
import { updateMoonSiteMarkers } from '@/lib/3d/MoonSiteMarkers';
import type { SceneRefs, SceneCallbacks } from './sceneTypes';
import * as THREE from 'three';

const LABEL_UPDATE_INTERVAL = 3;
// 性能优化：分层更新间隔
const LOD_UPDATE_INTERVAL = 3;       // LOD/网格每 3 帧更新
const CESIUM_CHECK_INTERVAL = 1;     // Cesium 模式每帧检测（保持即时切换响应）
const LABEL_OVERLAP_INTERVAL = 10;   // 标签重叠检测每 10 帧（从 3 帧改为 10 帧）
const FAR_VIEW_INTERVAL = 30;        // 远景检查每 30 帧
const LUNAR_UPDATE_INTERVAL = 60;     // 月球状态更新每 60 帧 (~1s@60fps)

// 标签空间哈希网格 - 用于 O(n) 重叠检测替换 O(n²)
const HASH_CELL_SIZE = 80; // 每个网格单元 80px

const _v3 = {
  sun: new THREE.Vector3(),
  planetWorld: new THREE.Vector3(),
  cameraPos: new THREE.Vector3(),
  target: new THREE.Vector3(),
  offset: new THREE.Vector3(),
  parentPos: new THREE.Vector3(),
  parentPos2: new THREE.Vector3(),
};

/** Main animation loop hook: drives render, LOD updates, label management,
 * Cesium sync, satellite/exoplanet updates, and far-view fading.
 * Uses requestAnimationFrame with delta-time-based throttling for expensive operations.
 */
export function useSolarSystemAnimation(
  refs: SceneRefs,
  callbacks: SceneCallbacks
) {
  const animateRef = useRef<(() => void) | null>(null);
  const activeCesiumBodyRef = useRef<'earth' | 'moon' | 'mars' | null>(null);
  // 帧计数器 - 用于分层更新
  const frameCountRef = useRef(0);

  const stopAnimation = useCallback(() => {
    if (refs.animationFrameRef.current !== null) {
      cancelAnimationFrame(refs.animationFrameRef.current);
      refs.animationFrameRef.current = null;
    }
  }, [refs.animationFrameRef]);

  const animate = useCallback(() => {
    const now = Date.now();
    const deltaTime = Math.min((now - refs.lastTimeRef.current) / 1000, 0.1);
    refs.lastTimeRef.current = now;

    const state = useSolarSystemStore.getState();

    if (state.isPlaying && deltaTime > 0) {
      state.tick(deltaTime);
    }

    const exoplanetState = useExoplanetStore.getState();
    const hasExoplanetSelection = !!exoplanetState.selectedHostName;
    const shouldPauseSolarSystem = hasExoplanetSelection;

    const currentState = useSolarSystemStore.getState();
    const currentBodies = currentState.celestialBodies;

    const camera = refs.cameraRef.current;
    const sceneManager = refs.sceneManagerRef.current;
    const cameraController = refs.cameraControllerRef.current;
    const satelliteLayer = refs.satelliteLayerRef.current;
    const exoplanetRenderer = refs.exoplanetRendererRef.current;
    const labelRenderer = refs.labelRendererRef.current;

    if (!camera || !sceneManager) {
      refs.animationFrameRef.current = requestAnimationFrame(animateRef.current!);
      return;
    }

    const sunPosition = _v3.sun.set(0, 0, 0);
    if (!refs.earthLightEnabledRef.current) sunPosition.set(1000000, 1000000, 1000000);

    // 帧计数器 - 分层更新
    frameCountRef.current++;
    const fc = frameCountRef.current;

    if (!shouldPauseSolarSystem) {
      currentBodies.forEach((body: any) => {
        const key = body.name.toLowerCase();
        const planet = refs.planetsRef.current?.get(key);
        if (planet) {
          planet.updatePosition(body.x, body.y, body.z);
          planet.updateSunPosition(sunPosition);

          const currentTimeInDays = dateToJulianDay(currentState.currentTime) - 2451545.0;

          if (key === 'earth' && refs.earthLockEnabledRef.current && cameraController) {
            const quatBefore = planet.getRotationQuaternion();
            planet.updateRotation(currentTimeInDays, currentState.timeSpeed);
            const quatAfter = planet.getRotationQuaternion();
            const deltaQ = quatAfter.clone().multiply(quatBefore.clone().invert());
            const earthPos = planet.getMesh().position.clone();
            cameraController.applyEarthLockDelta(deltaQ, earthPos);
          } else {
            planet.updateRotation(currentTimeInDays, currentState.timeSpeed);
          }

          // LOD 和网格可见性：每 LOD_UPDATE_INTERVAL 帧更新一次
          if (fc % LOD_UPDATE_INTERVAL === 0) {
            const planetWorldPos = _v3.planetWorld.set(body.x, body.y, body.z);
            const cameraPos = _v3.cameraPos.set(camera.position.x, camera.position.y, camera.position.z);
            const distance = planetWorldPos.distanceTo(cameraPos);
            planet.updateLOD(distance);
            planet.updateGridVisibility(distance);
          }

          const orbit = refs.orbitsRef.current?.get(key);
          if (orbit) {
            const planetPosition = new THREE.Vector3(body.x, body.y, body.z);
            orbit.updatePlanetPosition(planetPosition);
            // 轨道曲线分辨率：每 LOD_UPDATE_INTERVAL 帧更新
            if (fc % LOD_UPDATE_INTERVAL === 0) {
              const cameraPos = _v3.cameraPos.set(camera.position.x, camera.position.y, camera.position.z);
              const orbitCenterDistance = cameraPos.distanceTo(planetPosition);
              if (orbit.updateCurveResolution) {
                orbit.updateCurveResolution(orbitCenterDistance);
              }
            }
          }
        }
      });
    }

    if (state.isPlaying && state.selectedPlanet) {
      const selectedBody = currentBodies.find((b: any) => b.name === state.selectedPlanet);
      if (selectedBody && cameraController) {
        const controls = cameraController.getControls();
        const targetPos = _v3.target.set(selectedBody.x, selectedBody.y, selectedBody.z);
        const cameraOffset = _v3.offset.subVectors(camera.position, controls.target);
        controls.target.copy(targetPos);
        camera.position.copy(targetPos).add(cameraOffset);
        controls.update();
      }
    }

    if (cameraController) {
      const controls = cameraController.getControls();
      controls.dampingFactor = state.isPlaying ? 0.02 : CAMERA_CONFIG.dampingFactor;
    }

    const satelliteStore = useSatelliteStore.getState();
    const followTarget = satelliteStore.cameraFollowTarget;

    if (followTarget && cameraController && satelliteLayer) {
      const satelliteState = satelliteStore.satellites.get(followTarget);
      if (satelliteState) {
        const isNewTarget = refs.lastFollowTargetRef.current !== followTarget;
        if (isNewTarget) {
          const trackingTargetGetter = () => {
            const cs = useSatelliteStore.getState().satellites.get(followTarget);
            if (cs) return new THREE.Vector3(cs.position.x, cs.position.y, cs.position.z);
            return new THREE.Vector3(satelliteState.position.x, satelliteState.position.y, satelliteState.position.z);
          };
          const tleData = satelliteStore.tleData.get(followTarget);
          const satelliteRadius = 0.0001;
          const celestialObject = {
            name: tleData?.name || `Satellite ${followTarget}`,
            radius: satelliteRadius,
            type: 'satellite' as const
          };
          const targetPosition = new THREE.Vector3(
            satelliteState.position.x, satelliteState.position.y, satelliteState.position.z
          );
          cameraController.focusOnTarget(targetPosition, celestialObject, trackingTargetGetter, { distance: 0.001 });
          refs.isTrackingSatelliteRef.current = true;
          refs.lastFollowTargetRef.current = followTarget;
        }
      }
    } else {
      if (refs.isTrackingSatelliteRef.current) {
        refs.isTrackingSatelliteRef.current = false;
        refs.lastFollowTargetRef.current = null;
      }
    }

    let minDistanceToAnyPlanet = Infinity;
    currentBodies.forEach((body: any) => {
      if (body.isSun) return;
      const planetPos = new THREE.Vector3(body.x, body.y, body.z);
      const dist = camera.position.distanceTo(planetPos);
      if (dist < minDistanceToAnyPlanet) minDistanceToAnyPlanet = dist;
    });

    let discOpacity = 1.0;
    let lineOpacity = 1.0;
    if (ORBIT_FADE_CONFIG.enabled) {
      const cfg = ORBIT_FADE_CONFIG;
      let t = 1.0;
      if (minDistanceToAnyPlanet <= cfg.fadeEndDistance) t = 0;
      else if (minDistanceToAnyPlanet < cfg.fadeStartDistance) {
        const range = cfg.fadeStartDistance - cfg.fadeEndDistance;
        t = (minDistanceToAnyPlanet - cfg.fadeEndDistance) / range;
      }
      const discMin = (cfg as any).discMinOpacity ?? 0;
      const lineMin = (cfg as any).lineMinOpacity ?? 0;
      discOpacity = discMin + t * (1.0 - discMin);
      lineOpacity = lineMin + t * (1.0 - lineMin);
    }

    const distanceToSun = camera.position.length();
    useSolarSystemStore.getState().setCameraDistance(distanceToSun);

    const SOLAR_SYSTEM_BOUNDARY = 5000;
    const earthControlState = useEarthControlStore.getState();
    const shouldDisableEarthLock = distanceToSun > SOLAR_SYSTEM_BOUNDARY || hasExoplanetSelection;

    if (shouldDisableEarthLock && earthControlState.earthLockEnabled) {
      earthControlState.setEarthLockEnabledAuto(false);
      if (cameraController) cameraController.setEarthLockMode(false);
    } else if (!shouldDisableEarthLock && !earthControlState.earthLockEnabled && earthControlState.userEarthLockPreference) {
      earthControlState.setEarthLockEnabledAuto(true);
      if (cameraController) cameraController.setEarthLockMode(true);
    }

    let farViewPlanetOpacity = 1.0;
    let farViewOrbitOpacity = 1.0;

    if (FAR_VIEW_CONFIG.enabled) {
      if (distanceToSun >= FAR_VIEW_CONFIG.planetFadeEndDistance) farViewPlanetOpacity = 0;
      else if (distanceToSun > FAR_VIEW_CONFIG.planetFadeStartDistance) {
        const range = FAR_VIEW_CONFIG.planetFadeEndDistance - FAR_VIEW_CONFIG.planetFadeStartDistance;
        farViewPlanetOpacity = 1 - (distanceToSun - FAR_VIEW_CONFIG.planetFadeStartDistance) / range;
      }
      if (distanceToSun >= FAR_VIEW_CONFIG.orbitFadeEndDistance) farViewOrbitOpacity = 0;
      else if (distanceToSun > FAR_VIEW_CONFIG.orbitFadeStartDistance) {
        const range = FAR_VIEW_CONFIG.orbitFadeEndDistance - FAR_VIEW_CONFIG.orbitFadeStartDistance;
        farViewOrbitOpacity = 1 - (distanceToSun - FAR_VIEW_CONFIG.orbitFadeStartDistance) / range;
      }
    }

    discOpacity *= farViewOrbitOpacity;
    lineOpacity *= farViewOrbitOpacity;

    // 轨道透明度应用：每 LOD_UPDATE_INTERVAL 帧
    if (fc % LOD_UPDATE_INTERVAL === 0) {
      refs.orbitsRef.current?.forEach((orbit) => {
        if (orbit && orbit.setOpacity) orbit.setOpacity(discOpacity, lineOpacity);
      });
    }

    // 远景行星可见性：每 FAR_VIEW_INTERVAL 帧
    if (fc % FAR_VIEW_INTERVAL === 0) {
      if (FAR_VIEW_CONFIG.enabled && farViewPlanetOpacity < 1) {
      currentBodies.forEach((body: any) => {
        if (body.isSun) return;
        const key = body.name.toLowerCase();
        const planet = refs.planetsRef.current?.get(key);
        if (planet) {
          const mesh = planet.getMesh();
          mesh.visible = farViewPlanetOpacity > 0.01;
          if ('material' in mesh && mesh.material && 'opacity' in mesh.material) {
            (mesh.material as any).opacity = farViewPlanetOpacity;
            (mesh.material as any).transparent = farViewPlanetOpacity < 1;
          }
        }
      });
    } else {
      currentBodies.forEach((body: any) => {
        if (body.isSun) return;
        const key = body.name.toLowerCase();
        const planet = refs.planetsRef.current?.get(key);
        if (planet) {
          if (refs.cesiumEnabledRef.current && 'getCesiumExtension' in planet) return;
          planet.getMesh().visible = true;
        }
      });
    }
    } {/* 关闭 fc % FAR_VIEW_INTERVAL === 0 */}

    const sunPlanet = refs.planetsRef.current?.get('sun');
    if (sunPlanet) {
      const sunMesh = sunPlanet.getMesh();
      sunMesh.visible = true;
      if ('material' in sunMesh && sunMesh.material) {
        const material = sunMesh.material as any;
        material.transparent = false;
        material.opacity = 1.0;
        material.depthWrite = true;
        material.depthTest = true;
      }
    }

    if (sunPlanet) {
      sunPlanet.updatePosition(0, 0, 0);
      sunPlanet.updateRotation(deltaTime);
      const sunWorldPos = new THREE.Vector3(0, 0, 0);
      const cameraPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
      const sunDistance = sunWorldPos.distanceTo(cameraPos);
      sunPlanet.updateLOD(sunDistance);
      sunPlanet.updateGridVisibility(sunDistance);
      const sunLabel = refs.labelsRef.current?.get('sun');
      if (sunLabel) sunLabel.setOpacity(1);

      // 每帧收集非太阳行星 mesh 作为镜头光晕遮挡检测目标
      const occluderMeshes: THREE.Object3D[] = [];
      refs.planetsRef.current?.forEach((planet, key) => {
        if (key !== 'sun') occluderMeshes.push(planet.getMesh());
      });
      sunPlanet.setGlowOccluders(occluderMeshes);

      try { sunPlanet.updateGlow(camera); } catch { /* ignore */ }
    }

    if (sceneManager) sceneManager.updateEarthPlanet(deltaTime);
    refs.planetsRef.current?.forEach((planet, key) => {
      if (key !== 'earth' && typeof (planet as any).update === 'function') {
        (planet as any).update(camera, deltaTime);
      }
    });

    if (sceneManager) sceneManager.updateSkyboxPosition(camera.position);

    if (cameraController) cameraController.update(deltaTime);

    // 月球天文状态更新：每 LUNAR_UPDATE_INTERVAL 帧，基于模拟时间更新月球计算状态
    if (fc % LUNAR_UPDATE_INTERVAL === 0) {
      const simTime = currentState.currentTime;
      if (simTime) {
        useLunarStore.getState().update(simTime);
      }
    }

    // 更新月球着陆点标记位置
    const moonPlanetForMarkers = refs.planetsRef.current?.get('moon');
    if (moonPlanetForMarkers) {
      const moonWorldPos = moonPlanetForMarkers.getMesh().position;
      updateMoonSiteMarkers(moonWorldPos, camera.position);
    }

    const earthBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'earth');
    const moonBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'moon');
    const marsBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'mars');

    if (earthBody) {
      const earthPos = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
      const cameraPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
      const distToEarth = cameraPos.distanceTo(earthPos);

      let moonPos: THREE.Vector3 | null = null;
      let distToMoon = Infinity;
      if (moonBody) {
        moonPos = new THREE.Vector3(moonBody.x, moonBody.y, moonBody.z);
        distToMoon = cameraPos.distanceTo(moonPos);
      }
      let marsPos: THREE.Vector3 | null = null;
      let distToMars = Infinity;
      if (marsBody) {
        marsPos = new THREE.Vector3(marsBody.x, marsBody.y, marsBody.z);
        distToMars = cameraPos.distanceTo(marsPos);
      }
      callbacks.onDistanceToEarthChange?.(distToEarth);

      // Cesium 模式检查：每 CESIUM_CHECK_INTERVAL 帧执行一次
      if (fc % CESIUM_CHECK_INTERVAL === 0) {

      // 阈值定义
      const moonCamEntryAU = 0.000025; // 月球 CESIUM 相机模式进入（~3,737 km）
      const moonCamExitAU  = 0.000035; // 月球 CESIUM 相机模式退出（滞回）
      const marsCamEntryAU = 0.00005;  // 火星 CESIUM 相机模式进入（~7,480 km）
      const marsCamExitAU  = 0.00007;  // 火星 CESIUM 相机模式退出（滞回）
      const earthEntryAU = 0.000076;  // 地球 CESIUM 进入
      const earthExitAU  = 0.000096;  // 地球 CESIUM 退出（滞回）

      const activeBody = activeCesiumBodyRef.current;

      // Moon 是否需要 CESIUM 相机
      let moonNeedsCam = false;
      if (moonPos) {
        if (activeBody === 'moon') {
          moonNeedsCam = distToMoon < moonCamExitAU;
        } else {
          moonNeedsCam = distToMoon < moonCamEntryAU && distToMoon < distToEarth;
        }
      }

      // Mars 是否需要 CESIUM 相机
      let marsNeedsCam = false;
      if (marsPos) {
        if (activeBody === 'mars') {
          marsNeedsCam = distToMars < marsCamExitAU;
        } else {
          marsNeedsCam = distToMars < marsCamEntryAU && distToMars < distToEarth;
        }
      }

      // Earth 是否需要 CESIUM（使用 SceneModeManager 滞回）
      const earthNeedsCam = distToEarth < (activeBody === 'earth' ? earthExitAU : earthEntryAU);

      // CESIUM 模式激活条件：Earth、Moon 或 Mars 任意一者需要
      const wantsCesium = earthNeedsCam || moonNeedsCam || marsNeedsCam;

      // Search navigation override: force Earth Cesium mode when flying to a place
      const cesiumOverride = !!(window as any).__cesiumModeOverride;

      if (sceneManager) {
        const sceneModeManager = sceneManager.getSceneModeManager();
        sceneModeManager.getTransitionProgress();
        const earthPlanet = refs.planetsRef.current?.get('earth');
        const moonPlanet = refs.planetsRef.current?.get('moon');
        const marsPlanet = refs.planetsRef.current?.get('mars');
        const cesiumActive = sceneModeManager.getCurrentMode() === SceneMode.CESIUM_DOMINANT;

        // 确定目标天体（优先级：earth > moon > mars）
        let newTargetBody: typeof activeBody = null;
        if (wantsCesium) {
          if (moonNeedsCam) {
            newTargetBody = 'moon';
          } else if (earthNeedsCam) {
            newTargetBody = 'earth';
          } else if (marsNeedsCam) {
            newTargetBody = 'mars';
          }
        }

        // If search navigation override is active, force Earth Cesium mode
        if (cesiumOverride) {
          newTargetBody = 'earth';
        }

        const modeChanged = wantsCesium !== cesiumActive;
        if (newTargetBody !== activeBody || modeChanged) {
          if (activeBody === 'moon' && moonPlanet) {
            if ('setCesiumNativeCameraMode' in moonPlanet) (moonPlanet as any).setCesiumNativeCameraMode(false);
            if ('getCesiumExtension' in moonPlanet) (moonPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(false);
          }
          if (activeBody === 'mars' && marsPlanet) {
            if ('setCesiumNativeCameraMode' in marsPlanet) (marsPlanet as any).setCesiumNativeCameraMode(false);
            if ('getCesiumExtension' in marsPlanet) (marsPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(false);
          }
          if (activeBody === 'earth' && earthPlanet) {
            if ('setCesiumNativeCameraMode' in earthPlanet) (earthPlanet as any).setCesiumNativeCameraMode(false);
            if ('getCesiumExtension' in earthPlanet) (earthPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(false);
          }

          if (newTargetBody === null) {
            // 退出 CESIUM 模式
            sceneModeManager.switchMode(SceneMode.THREE_DOMINANT);
            activeCesiumBodyRef.current = null;
            if (cameraController) {
              const controls = cameraController.getControls();
              controls.enabled = true;
              const ctrlAny = controls as any;
              if (ctrlAny._sphericalDelta) ctrlAny._sphericalDelta.set(0, 0, 0);
              if (ctrlAny._panOffset) ctrlAny._panOffset.set(0, 0, 0);
              controls.update();
              cameraController.syncStateFromCamera();
            }
            const renderer = sceneManager.getRenderer();
            renderer.domElement.style.pointerEvents = 'auto';
          } else if (activeBody === null) {
            // 首次进入 CESIUM 模式
            activeCesiumBodyRef.current = newTargetBody;
            sceneModeManager.switchMode(SceneMode.CESIUM_DOMINANT);
            if (cameraController) cameraController.getControls().enabled = false;
            const renderer = sceneManager.getRenderer();
            renderer.domElement.style.pointerEvents = 'none';

            if (newTargetBody === 'moon' && moonPos) {
              if (cameraController) cameraController.getControls().target.copy(moonPos);
              if (moonPlanet && 'setCesiumNativeCameraMode' in moonPlanet) (moonPlanet as any).setCesiumNativeCameraMode(true);
              if (moonPlanet && 'getCesiumExtension' in moonPlanet) {
                (moonPlanet as any).getCesiumExtension()?.syncCamera(camera, moonPos);
                (moonPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(true);
              }
            } else if (newTargetBody === 'mars' && marsPos) {
              if (cameraController) cameraController.getControls().target.copy(marsPos);
              if (marsPlanet && 'setCesiumNativeCameraMode' in marsPlanet) (marsPlanet as any).setCesiumNativeCameraMode(true);
              if (marsPlanet && 'getCesiumExtension' in marsPlanet) {
                (marsPlanet as any).getCesiumExtension()?.syncCamera(camera, marsPos);
                (marsPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(true);
              }
            } else {
              if (cameraController) cameraController.getControls().target.copy(earthPos);
              if (earthPlanet && 'setCesiumNativeCameraMode' in earthPlanet) (earthPlanet as any).setCesiumNativeCameraMode(true);
              if (earthPlanet && 'getCesiumExtension' in earthPlanet) {
                (earthPlanet as any).getCesiumExtension()?.syncCamera(camera, earthPos);
                (earthPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(true);
              }
            }
          } else if (newTargetBody !== activeBody) {
            // CESIUM 模式中切换主体
            activeCesiumBodyRef.current = newTargetBody;
            if (newTargetBody === 'moon' && moonPos) {
              if (cameraController) cameraController.getControls().target.copy(moonPos);
              if (moonPlanet && 'setCesiumNativeCameraMode' in moonPlanet) (moonPlanet as any).setCesiumNativeCameraMode(true);
              if (moonPlanet && 'getCesiumExtension' in moonPlanet) {
                (moonPlanet as any).getCesiumExtension()?.syncCamera(camera, moonPos);
                (moonPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(true);
              }
            } else if (newTargetBody === 'mars' && marsPos) {
              if (cameraController) cameraController.getControls().target.copy(marsPos);
              if (marsPlanet && 'setCesiumNativeCameraMode' in marsPlanet) (marsPlanet as any).setCesiumNativeCameraMode(true);
              if (marsPlanet && 'getCesiumExtension' in marsPlanet) {
                (marsPlanet as any).getCesiumExtension()?.syncCamera(camera, marsPos);
                (marsPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(true);
              }
            } else {
              if (cameraController) cameraController.getControls().target.copy(earthPos);
              if (earthPlanet && 'setCesiumNativeCameraMode' in earthPlanet) (earthPlanet as any).setCesiumNativeCameraMode(true);
              if (earthPlanet && 'getCesiumExtension' in earthPlanet) {
                (earthPlanet as any).getCesiumExtension()?.syncCamera(camera, earthPos);
                (earthPlanet as any).getCesiumExtension()?.setNativeCameraEnabled(true);
              }
            }
          }
        } else if (cesiumActive && activeBody !== null) {
          // 每帧从 CESIUM 原生相机同步回 Three.js
          if (activeBody === 'moon' && moonPos && moonPlanet && 'getCesiumExtension' in moonPlanet) {
            (moonPlanet as any).getCesiumExtension()?.syncCameraFromCesium(camera, moonPos);
          } else if (activeBody === 'mars' && marsPos && marsPlanet && 'getCesiumExtension' in marsPlanet) {
            (marsPlanet as any).getCesiumExtension()?.syncCameraFromCesium(camera, marsPos);
          } else if (earthPlanet && 'getCesiumExtension' in earthPlanet) {
            (earthPlanet as any).getCesiumExtension()?.syncCameraFromCesium(camera, earthPos);
          }
        }
      }
      } {/* 关闭 fc % CESIUM_CHECK_INTERVAL === 0 */}
    }

    const cameraDistance = Math.sqrt(
      camera.position.x * camera.position.x + camera.position.y * camera.position.y + camera.position.z * camera.position.z
    );
    const maxDistance = Math.max(cameraDistance * 3, 50);
    const trackingInfo = cameraController?.getTrackingInfo();

    if (trackingInfo && cameraController) {
      const { position: targetPos, radius: targetRadius } = trackingInfo;
      const distToCenter = camera.position.distanceTo(targetPos);
      const near = Math.max(distToCenter * 0.0001, 1e-9);
      const far = Math.max(maxDistance, targetRadius * 100, 1e6);
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    } else if (earthBody) {
      const earthPos = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
      const EARTH_RADIUS_AU = 0.0000426;
      const distToCenter = camera.position.distanceTo(earthPos);
      const distToSurface = Math.max(distToCenter - EARTH_RADIUS_AU, 1e-12);
      let near: number;
      let far: number;
      if (distToSurface < 0.1) {
        near = Math.max(distToCenter * 0.0001, 1e-9);
        far = Math.max(maxDistance, EARTH_RADIUS_AU * 100, 1e6);
      } else {
        near = 0.01;
        far = Math.max(maxDistance, 1e6);
      }
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    } else {
      sceneManager.updateCameraClipping(0.01, maxDistance);
    }

    currentBodies.forEach((body: any) => {
      const key = body.name.toLowerCase();
      const label = refs.labelsRef.current?.get(key);
      if (label) {
        const centerPosition = new THREE.Vector3(body.x, body.y, body.z);
        const orbit = refs.orbitsRef.current?.get(key);
        let orbitNormal = new THREE.Vector3(0, 0, 1);
        if (orbit && typeof orbit.getOrbitNormal === 'function') {
          orbitNormal = orbit.getOrbitNormal();
        }
        label.updatePositionWithCamera(centerPosition, orbitNormal, camera, body.isSatellite || false);
      }
    });

    refs.labelUpdateFrameCounterRef.current++;
    const shouldUpdateLabels = refs.labelUpdateFrameCounterRef.current >= LABEL_UPDATE_INTERVAL;
    if (shouldUpdateLabels) refs.labelUpdateFrameCounterRef.current = 0;

    if (shouldUpdateLabels) {
      const labelInfos: Array<{
        body: any; planet: any; label: any;
        screenX: number; screenY: number; text: string;
        isSelected: boolean; priority: number;
      }> = [];

      currentBodies.forEach((body: any) => {
        const key = body.name.toLowerCase();
        const planet = refs.planetsRef.current?.get(key);
        const label = refs.labelsRef.current?.get(key);

        if (body.isSatellite) {
          const parentKey = body.parent as string;
          const parentPlanet = refs.planetsRef.current?.get(parentKey.toLowerCase());
          if (!parentPlanet) return;
          const parentPos = _v3.parentPos;
          parentPlanet.getMesh().getWorldPosition(parentPos);
          const cameraPosVec = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
          const distanceToParent = cameraPosVec.distanceTo(parentPos);
          if (distanceToParent >= SATELLITE_CONFIG.visibilityThreshold) return;
        }

        if (planet) {
          const worldPos = new THREE.Vector3(body.x, body.y, body.z);
          worldPos.project(camera);
          const container = refs.containerRef.current;
          if (!container) return;
          const screenX = (worldPos.x * 0.5 + 0.5) * container.clientWidth;
          const screenY = (worldPos.y * -0.5 + 0.5) * container.clientHeight;
          const selectedPlanetName = useSolarSystemStore.getState().selectedPlanet;
          const isSelected = body.name === selectedPlanetName;
          const lang = useSolarSystemStore.getState().lang;
          const displayName = planetNames[lang]?.[body.name] || body.name;
          labelInfos.push({ body, planet, label: label || null, screenX, screenY, text: displayName, isSelected, priority: 1 });
        }
      });

      const selectedPlanetName = useSolarSystemStore.getState().selectedPlanet;

      // 性能优化：重叠检测使用空间哈希网格 (O(n) 替代 O(n²))
      // 仅在 LABEL_OVERLAP_INTERVAL 帧执行
      const shouldCheckOverlap = fc % LABEL_OVERLAP_INTERVAL === 0;

      if (shouldCheckOverlap) {
        // 空间哈希：将标签分配到网格单元
        const grid = new Map<string, number[]>(); // cellKey -> [indices]
        
        for (let i = 0; i < labelInfos.length; i++) {
          const info = labelInfos[i];
          if (!info || info.body.isSun) continue;
          const cellX = Math.floor(info.screenX / HASH_CELL_SIZE);
          const cellY = Math.floor(info.screenY / HASH_CELL_SIZE);
          // 每个标签可能属于多个相邻单元格（扩大检测范围）
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const key = `${cellX + dx},${cellY + dy}`;
              const arr = grid.get(key) || [];
              arr.push(i);
              grid.set(key, arr);
            }
          }
        }

        for (let i = 0; i < labelInfos.length; i++) {
          const info1 = labelInfos[i];
          if (!info1) continue;
          const isSelected = info1.body.name === selectedPlanetName;
          if (info1.body.isSun) {
            if (info1.planet) info1.planet.setMarkerTargetOpacity(1.0);
            continue;
          }
          if (isSelected) {
            info1.planet.setMarkerTargetOpacity(1.0);
            continue;
          }

          let hasOverlap = false;
          // 仅在同一个网格单元内检查重叠
          const cellX = Math.floor(info1.screenX / HASH_CELL_SIZE);
          const cellY = Math.floor(info1.screenY / HASH_CELL_SIZE);
          const cellKey = `${cellX},${cellY}`;
          const cellIndices = grid.get(cellKey);

          if (cellIndices) {
            for (const j of cellIndices) {
              if (i === j) continue;
              const info2 = labelInfos[j];
              if (!info2) continue;
              const labelWidth = info1.text.length * 10;
              const labelHeight = 20;
              const markerSize = 20;
              const totalWidth = labelWidth + markerSize;
              const distanceX = Math.abs(info1.screenX - info2.screenX);
              const distanceY = Math.abs(info1.screenY - info2.screenY);
              if (distanceX < totalWidth && distanceY < labelHeight) {
                const isInfo2Selected = info2.body.name === selectedPlanetName;
                if (isInfo2Selected) { hasOverlap = true; break; }
                const container = refs.containerRef.current;
                if (!container) continue;
                const centerX = container.clientWidth / 2;
                const centerY = container.clientHeight / 2;
                const dist1 = Math.sqrt((info1.screenX - centerX) * (info1.screenX - centerX) + (info1.screenY - centerY) * (info1.screenY - centerY));
                const dist2 = Math.sqrt((info2.screenX - centerX) * (info2.screenX - centerX) + (info2.screenY - centerY) * (info2.screenY - centerY));
                if (dist1 > dist2 || (Math.abs(dist1 - dist2) < 1 && i > j)) { hasOverlap = true; break; }
              }
            }
          }
          info1.planet.setMarkerTargetOpacity(hasOverlap ? 0.0 : 1.0);
        }
      }

      labelInfos.forEach((info) => {
        if (info.body.isSun) {
          if (info.label) info.label.setOpacity(1.0);
          return;
        }
        info.planet.updateMarkerOpacity();
        const opacity = info.planet.getMarkerOpacity();
        if (info.label) info.label.setOpacity(opacity);
      });

      currentBodies.forEach((body: any) => {
        if (body.isSun) return;
        const key = body.name.toLowerCase();
        const planet = refs.planetsRef.current?.get(key);
        if (planet) {
          const inLabelInfos = labelInfos.some(info => info.body.name === body.name);
          if (!inLabelInfos) planet.setMarkerTargetOpacity(1.0);
          planet.updateMarkerOpacity();
        }
      });

      // 外行星标签重叠检测 - 同样使用空间哈希
      if (shouldCheckOverlap && exoplanetRenderer?.systemRenderer && refs.containerRef.current) {
        const systemRenderer = exoplanetRenderer.systemRenderer;
        const planetPositions = systemRenderer.getPlanetScreenPositions(
          camera, refs.containerRef.current.clientWidth, refs.containerRef.current.clientHeight
        );
        
        // 空间哈希网格
        const exoGrid = new Map<string, number[]>();
        for (let i = 0; i < planetPositions.length; i++) {
          const pos = planetPositions[i];
          if (!pos) continue;
          const cellX = Math.floor(pos.screenX / HASH_CELL_SIZE);
          const cellY = Math.floor(pos.screenY / HASH_CELL_SIZE);
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const key = `${cellX + dx},${cellY + dy}`;
              const arr = exoGrid.get(key) || [];
              arr.push(i);
              exoGrid.set(key, arr);
            }
          }
        }
        
        for (let i = 0; i < planetPositions.length; i++) {
          const pos1 = planetPositions[i];
          if (!pos1) continue;
          let hasOverlap = false;
          const cellX = Math.floor(pos1.screenX / HASH_CELL_SIZE);
          const cellY = Math.floor(pos1.screenY / HASH_CELL_SIZE);
          const cellKey = `${cellX},${cellY}`;
          const cellIndices = exoGrid.get(cellKey);
          
          if (cellIndices) {
            for (const j of cellIndices) {
              if (i === j) continue;
              const pos2 = planetPositions[j];
              if (!pos2) continue;
              const distanceX = Math.abs(pos1.screenX - pos2.screenX);
              const distanceY = Math.abs(pos1.screenY - pos2.screenY);
              const markerSize = pos1.markerSize;
              if (distanceX < markerSize && distanceY < markerSize) {
                const container = refs.containerRef.current;
                if (!container) continue;
                const centerX = container.clientWidth / 2;
                const centerY = container.clientHeight / 2;
                const dist1 = Math.sqrt((pos1.screenX - centerX) * (pos1.screenX - centerX) + (pos1.screenY - centerY) * (pos1.screenY - centerY));
                const dist2 = Math.sqrt((pos2.screenX - centerX) * (pos2.screenX - centerX) + (pos2.screenY - centerY) * (pos2.screenY - centerY));
                if (dist1 > dist2 || (Math.abs(dist1 - dist2) < 1 && i > j)) { hasOverlap = true; break; }
              }
            }
          }
          systemRenderer.setMarkerTargetOpacity(pos1.name, hasOverlap ? 0.0 : 1.0);
        }
      }
    }

    currentBodies.forEach((body: any) => {
      if (!body.isSatellite) return;
      const satelliteKey = body.name.toLowerCase();
      const orbit = refs.orbitsRef.current?.get(satelliteKey);
      if (!orbit) return;
      const parentKey = body.parent as string;
      const parentPlanet = refs.planetsRef.current?.get(parentKey.toLowerCase());
      if (!parentPlanet) return;
      const parentPos = _v3.parentPos2;
      parentPlanet.getMesh().getWorldPosition(parentPos);
      const cameraPosVec = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
      const distanceToParent = cameraPosVec.distanceTo(parentPos);
      const isVisible = distanceToParent < SATELLITE_CONFIG.visibilityThreshold;
      const fadeThreshold = SATELLITE_CONFIG.fadeOutDistance;
      let satelliteOpacity = 1.0;
      if (distanceToParent > SATELLITE_CONFIG.visibilityThreshold) satelliteOpacity = 0;
      else if (distanceToParent > (SATELLITE_CONFIG.visibilityThreshold - (fadeThreshold - SATELLITE_CONFIG.visibilityThreshold))) {
        const fadeRange = fadeThreshold - SATELLITE_CONFIG.visibilityThreshold;
        const fadeDistance = Math.max(0, distanceToParent - (SATELLITE_CONFIG.visibilityThreshold - fadeRange));
        satelliteOpacity = 1 - (fadeDistance / fadeRange);
      }
      const satelliteMesh = refs.planetsRef.current?.get(satelliteKey)?.getMesh();
      if (satelliteMesh) satelliteMesh.visible = isVisible;
      orbit.getLine().visible = isVisible;
      const satellite = refs.planetsRef.current?.get(satelliteKey);
      if (satellite) satellite.setMarkerTargetOpacity(isVisible ? satelliteOpacity : 0);
      const satelliteLabel = refs.labelsRef.current?.get(satelliteKey);
      if (satelliteLabel) satelliteLabel.setOpacity(isVisible ? satelliteOpacity : 0);
      try { orbit.updatePlanetPosition(parentPos); } catch { /* ignore */ }
    });

    if (sceneManager) sceneManager.updateMultiScaleView(distanceToSun, deltaTime);

    if (exoplanetRenderer) {
      exoplanetRenderer.update(distanceToSun, deltaTime);
      if (hasExoplanetSelection) {
        exoplanetRenderer.setTime(currentState.currentTime);
        exoplanetRenderer.setTimeSpeed(currentState.timeSpeed);
      }
    }

    if (satelliteLayer) satelliteLayer.update();

    if (callbacks.onCameraDistanceChange) callbacks.onCameraDistanceChange(distanceToSun);

    getRenderAPI()._executeBeforeRender();

    if (sceneManager) {
      sceneManager.render();
      if (labelRenderer) labelRenderer.render(sceneManager.getScene(), camera);
    }

    refs.animationFrameRef.current = requestAnimationFrame(animateRef.current!);
  }, [refs, callbacks]);

  animateRef.current = animate;

  const startAnimation = useCallback(() => {
    stopAnimation();
    refs.lastTimeRef.current = Date.now();
    refs.animationFrameRef.current = requestAnimationFrame(animateRef.current!);
  }, [refs, stopAnimation]);

  return { startAnimation, stopAnimation };
}
