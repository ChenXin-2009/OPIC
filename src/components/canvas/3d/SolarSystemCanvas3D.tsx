'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { useSceneStore } from '@/lib/state/SceneStore';
import { useExoplanetStore } from '@/lib/store/useExoplanetStore';
import { useEarthControlStore } from '@/lib/state/EarthControlStore';
import { SceneMode } from '@/lib/3d/SceneModeManager';
import { logger } from '@/utils/logger';
import ScaleRuler from './ScaleRuler';
import GridScaleRuler from './GridScaleRuler';
import DistanceDisplay from './DistanceDisplay';
import ZoomSlider from './ZoomSlider';
import SatelliteDetailModal from '@/components/satellite/SatelliteDetailModal';
import ExoplanetSystemPanel from '@/components/exoplanets/ExoplanetSystemPanel';
import type { SceneRefs, SceneCallbacks } from './hooks/sceneTypes';
import { useSolarSystemInit } from './hooks/useSolarSystemInit';
import { useSolarSystemAnimation } from './hooks/useSolarSystemAnimation';
import { useSolarSystemInteraction } from './hooks/useSolarSystemInteraction';
import * as THREE from 'three';
import { Raycaster } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { SceneManager } from '@/lib/3d/SceneManager';
import { CameraController } from '@/lib/3d/CameraController';
import { Planet } from '@/lib/3d/Planet';
import { OrbitCurve } from '@/lib/3d/OrbitCurve';
import { OrbitLabel } from '@/lib/3d/OrbitLabel';
import { SatelliteLayer } from '@/lib/3d/SatelliteLayer';
import { ExoplanetRenderer } from '@/lib/3d/ExoplanetRenderer';

/**
 * SolarSystemCanvas3D 组件属性
 */
interface SolarSystemCanvas3DProps {
  /** 相机距离变化回调（单位：AU） */
  onCameraDistanceChange?: (distance: number) => void;
  /** 是否启用 Cesium 地球渲染模式 */
  cesiumEnabled?: boolean;
  /** 地球行星对象就绪回调 */
  onEarthPlanetReady?: (earthPlanet: any) => void;
  /** 相机控制器就绪回调 */
  onCameraReady?: (camera: any) => void;
  /** 是否启用地球锁定模式 */
  earthLockEnabled?: boolean;
  /** 是否启用地球光照效果 */
  earthLightEnabled?: boolean;
  /** 初始化进度回调（阶段名称, 进度百分比, 是否完成） */
  onInitializationProgress?: (stage: string, progress: number, isComplete: boolean) => void;
}

/** Main 3D solar system canvas component. Orchestrates init, animation, and interaction hooks. */
export default function SolarSystemCanvas3D({
  onCameraDistanceChange,
  cesiumEnabled = false,
  onEarthPlanetReady,
  onCameraReady,
  earthLockEnabled = false,
  earthLightEnabled = true,
  onInitializationProgress,
}: SolarSystemCanvas3DProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const planetsRef = useRef<Map<string, Planet> | null>(null);
  const orbitsRef = useRef<Map<string, OrbitCurve> | null>(null);
  const labelsRef = useRef<Map<string, OrbitLabel> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const raycasterRef = useRef<Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const satelliteLayerRef = useRef<SatelliteLayer | null>(null);
  const exoplanetRendererRef = useRef<ExoplanetRenderer | null>(null);
  const cesiumEnabledRef = useRef<boolean>(cesiumEnabled);
  const earthLockEnabledRef = useRef<boolean>(earthLockEnabled);
  const earthLightEnabledRef = useRef<boolean>(earthLightEnabled);
  const isTrackingSatelliteRef = useRef<boolean>(false);
  const lastFollowTargetRef = useRef<number | null>(null);
  const labelUpdateFrameCounterRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const mouseDownPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseDownTimeRef = useRef<number>(0);

  const [isCameraControllerReady, setIsCameraControllerReady] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [distanceToEarth, setDistanceToEarth] = useState(0);
  const lang = useSolarSystemStore((state) => state.lang);
  const { setSceneManager, setCameraController } = useSceneStore();

  const refs: SceneRefs = useMemo(() => ({
    containerRef,
    sceneManagerRef,
    cameraControllerRef,
    labelRendererRef,
    planetsRef,
    orbitsRef,
    labelsRef,
    animationFrameRef,
    lastTimeRef,
    raycasterRef,
    mouseRef,
    cameraRef,
    satelliteLayerRef,
    exoplanetRendererRef,
    cesiumEnabledRef,
    earthLockEnabledRef,
    earthLightEnabledRef,
    isTrackingSatelliteRef,
    lastFollowTargetRef,
    labelUpdateFrameCounterRef,
    isDraggingRef,
    mouseDownPositionRef,
    mouseDownTimeRef,
  }), []);

  const callbacks: SceneCallbacks = useMemo(() => ({
    onCameraDistanceChange,
    onInitializationProgress,
    onDistanceToEarthChange: setDistanceToEarth,
  }), [onCameraDistanceChange, onInitializationProgress]);

  const { initScene, autoFocusEarth, handleResize, cleanupScene } = useSolarSystemInit(refs, {
    cesiumEnabled,
    earthLockEnabled,
    earthLightEnabled,
    onCameraReady,
    onEarthPlanetReady,
    onInitializationProgress,
  });

  const { startAnimation, stopAnimation } = useSolarSystemAnimation(refs, callbacks);

  const prepareDeepSpaceFocus = () => {
    useSolarSystemStore.getState().selectPlanet(null);
    useSatelliteStore.getState().setCameraFollowTarget(null);
    const cm = cameraControllerRef.current;
    const sm = sceneManagerRef.current;
    if (!cm || !sm) return;
    cm.stopTracking();
    const smm = sm.getSceneModeManager();
    if (smm.getCurrentMode() !== SceneMode.THREE_DOMINANT) {
      smm.getTransitionProgress();
      smm.switchMode(SceneMode.THREE_DOMINANT);
    }
    const earthPlanet = planetsRef.current?.get('earth');
    if (earthPlanet && 'setCesiumNativeCameraMode' in earthPlanet) {
      (earthPlanet as any).setCesiumNativeCameraMode(false);
    }
    if (earthPlanet && 'getCesiumExtension' in earthPlanet) {
      (earthPlanet as any).getCesiumExtension()?.setNativeCameraEnabled?.(false);
    }
    const controls = cm.getControls();
    controls.enabled = true;
    (controls as any)._sphericalDelta?.set?.(0, 0, 0);
    (controls as any)._panOffset?.set?.(0, 0, 0);
    controls.update();
    cm.syncStateFromCamera();
    const renderer = sm.getRenderer();
    renderer.domElement.style.pointerEvents = 'auto';
    renderer.domElement.style.zIndex = '1';
  };

  const focusOnExoplanetHost = async (hostname: string) => {
    const er = exoplanetRendererRef.current;
    const cm = cameraControllerRef.current;
    if (!er || !cm) return;
    prepareDeepSpaceFocus();
    const hostPosition = er.getHostWorldPosition(hostname);
    if (hostPosition) {
      cm.focusOnTarget(hostPosition, { name: hostname, radius: 0.08, isSun: true }, () => er.getHostWorldPosition(hostname) ?? hostPosition.clone(), { distance: 8 });
    }
    const system = await useExoplanetStore.getState().selectHost(hostname);
    if (!system || !exoplanetRendererRef.current || !cameraControllerRef.current) return;
    const currentRenderer = exoplanetRendererRef.current;
    currentRenderer.setSelectedSystem(system);
    currentRenderer.setSelectedBody({ type: 'star', hostname: system.hostname });
    const systemPosition = currentRenderer.getHostWorldPosition(system.hostname) ?? hostPosition;
    if (!systemPosition) return;
    cameraControllerRef.current.focusOnTarget(systemPosition, { name: system.hostname, radius: currentRenderer.getFocusRadiusForSelection({ type: 'star', hostname: system.hostname }), isSun: true }, () => currentRenderer.getHostWorldPosition(system.hostname) ?? systemPosition.clone(), { distance: currentRenderer.getFocusDistanceForSystem(system) });
  };

  const focusOnExoplanetPlanet = (hostname: string, planetName: string) => {
    const er = exoplanetRendererRef.current;
    const cm = cameraControllerRef.current;
    if (!er || !cm) return;
    prepareDeepSpaceFocus();
    useExoplanetStore.getState().selectPlanet(planetName);
    er.setSelectedBody({ type: 'planet', hostname, planetName });
    const planetPosition = er.getPlanetWorldPosition(planetName);
    if (!planetPosition) return;
    const radius = er.getFocusRadiusForSelection({ type: 'planet', hostname, planetName });
    cm.focusOnTarget(planetPosition, { name: planetName, radius }, () => er.getPlanetWorldPosition(planetName) ?? planetPosition.clone(), { distance: Math.max(radius * 12, 0.45) });
  };

  /* user interaction (click, drag, hover) */
  const { setupInteraction, cleanupInteraction } = useSolarSystemInteraction(refs, {
    focusOnExoplanetHost,
    focusOnExoplanetPlanet,
    prepareDeepSpaceFocus,
  });

  React.useEffect(() => {
    cesiumEnabledRef.current = cesiumEnabled;
    if (sceneManagerRef.current) {
      // 合成模式由动画循环根据实际场景模式 (THREE_DOMINANT / CESIUM_DOMINANT) 管理。
      // 初始场景模式为 THREE_DOMINANT，因此始终先设为 false 以保证天空盒可见。
      // 若此处用 setCesiumCompositeMode(cesiumEnabled)，页面加载时 cesiumEnabled=true
      // 会隐藏天空盒，而动画循环因模式未切换不会修正它。
      sceneManagerRef.current.setCesiumCompositeMode(false);
    }
    const earthPlanet = planetsRef.current?.get('earth');
    if (earthPlanet && 'setCesiumEnabled' in earthPlanet) {
      (earthPlanet as any).setCesiumEnabled(cesiumEnabled, cesiumEnabled ? cameraRef.current : undefined);
      if (cameraControllerRef.current) {
        cameraControllerRef.current.getControls().enabled = true;
      }
    }
    (planetsRef.current?.get('moon') as any)?.setCesiumEnabled?.(cesiumEnabled, cesiumEnabled ? cameraRef.current : undefined);
    (planetsRef.current?.get('mars') as any)?.setCesiumEnabled?.(cesiumEnabled, cesiumEnabled ? cameraRef.current : undefined);
  }, [cesiumEnabled]);

  React.useEffect(() => {
    earthLockEnabledRef.current = earthLockEnabled;
    if (cameraControllerRef.current) {
      cameraControllerRef.current.setEarthLockMode(earthLockEnabled);
    }
  }, [earthLockEnabled]);

  React.useEffect(() => {
    earthLightEnabledRef.current = earthLightEnabled;
  }, [earthLightEnabled]);

  React.useEffect(() => {
    const unsubscribe = useExoplanetStore.subscribe((state) => {
      const renderer = exoplanetRendererRef.current;
      if (!renderer) return;
      renderer.setIndex(state.systems);
      renderer.setSelectedSystem(state.selectedSystem);
      renderer.setSelectedBody(state.selectedBody);
    });
    return unsubscribe;
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    let checkAndInitFrameId: number | null = null;
    let isInitialized = false;
    let resizeHandler: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let autoFocusTimeout: ReturnType<typeof setTimeout> | null = null;

    const checkAndInit = () => {
      if (!containerRef.current || isInitialized) return;
      if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) {
        checkAndInitFrameId = requestAnimationFrame(checkAndInit);
        return;
      }
      const currentState = useSolarSystemStore.getState();
      if (currentState.celestialBodies.length === 0) {
        onInitializationProgress?.('idle', 0, false);
        checkAndInitFrameId = requestAnimationFrame(checkAndInit);
        return;
      }
      isInitialized = true;

      onInitializationProgress?.('scene', 10, false);
      initScene();
      onInitializationProgress?.('scene', 20, false);
      setIsCameraControllerReady(true);

      setTimeout(() => setOpacity(1), 100);

      setupInteraction();
      startAnimation();

      autoFocusTimeout = setTimeout(autoFocusEarth, 500);

      resizeHandler = () => handleResize();
      window.addEventListener('resize', resizeHandler);
      if (containerRef.current) {
        resizeObserver = new ResizeObserver(resizeHandler);
        resizeObserver.observe(containerRef.current);
      }

      onInitializationProgress?.('textures', 80, false);
      let textureProgress = 80;
      const textureInterval = setInterval(() => {
        textureProgress += 3;
        if (textureProgress >= 95) {
          textureProgress = 95;
          clearInterval(textureInterval);
          setTimeout(() => onInitializationProgress?.('complete', 100, true), 200);
        }
        onInitializationProgress?.('textures', textureProgress, false);
      }, 100);
    };

    checkAndInit();

    return () => {
      if (autoFocusTimeout) clearTimeout(autoFocusTimeout);
      if (checkAndInitFrameId !== null) cancelAnimationFrame(checkAndInitFrameId);
      stopAnimation();
      cleanupInteraction();
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (resizeObserver) resizeObserver.disconnect();
      cleanupScene();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    let prevShowOrbits = new Set(useSatelliteStore.getState().showOrbits);
    return useSatelliteStore.subscribe((state) => {
      const showOrbits = state.showOrbits;
      if (showOrbits === prevShowOrbits) return;
      const layer = satelliteLayerRef.current;
      if (!layer) {
        prevShowOrbits = new Set(showOrbits);
        return;
      }
      showOrbits.forEach((noradId) => {
        if (!prevShowOrbits.has(noradId)) {
          const tryShow = (attempts: number) => {
            layer.showOrbitWithOffset(noradId).catch(() => {
              if (attempts > 0) setTimeout(() => tryShow(attempts - 1), 600);
            });
          };
          tryShow(8);
        }
      });
      prevShowOrbits.forEach((noradId) => {
        if (!showOrbits.has(noradId)) {
          try { layer.hideOrbit(noradId); } catch { /* ignore */ }
        }
      });
      prevShowOrbits = new Set(showOrbits);
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        willChange: 'opacity',
        opacity: opacity,
        transition: 'opacity 1s ease-in-out',
      } as React.CSSProperties}
    >
      <div
        style={{
          position: 'absolute',
          left: '5px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '20px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <DistanceDisplay distanceAU={distanceToEarth} static />
        {isCameraControllerReady && cameraControllerRef.current && (
          <ZoomSlider cameraController={cameraControllerRef.current} />
        )}
      </div>

      <ScaleRuler
        camera={cameraRef.current}
        container={containerRef.current}
        controlsTarget={cameraControllerRef.current?.getControls()?.target || null}
      />

      <GridScaleRuler sceneManager={sceneManagerRef.current} />

      <SatelliteDetailModal lang={lang} />
      <ExoplanetSystemPanel lang={lang} />
    </div>
  );
}
