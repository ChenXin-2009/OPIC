import { RefObject } from 'react';
import { SceneManager } from '@/lib/3d/SceneManager';
import { CameraController } from '@/lib/3d/CameraController';
import { Planet } from '@/lib/3d/Planet';
import { OrbitCurve } from '@/lib/3d/OrbitCurve';
import { OrbitLabel } from '@/lib/3d/OrbitLabel';
import { SatelliteLayer } from '@/lib/3d/SatelliteLayer';
import { ExoplanetRenderer } from '@/lib/3d/ExoplanetRenderer';
import { Raycaster } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as THREE from 'three';

/** Refs shared across 3D canvas hooks for scene objects and state. */
export interface SceneRefs {
  containerRef: RefObject<HTMLDivElement | null>; /* Three.js renderer DOM container */
  sceneManagerRef: RefObject<SceneManager | null>;
  cameraControllerRef: RefObject<CameraController | null>;
  labelRendererRef: RefObject<CSS2DRenderer | null>;
  planetsRef: RefObject<Map<string, Planet> | null>;
  orbitsRef: RefObject<Map<string, OrbitCurve> | null>;
  labelsRef: RefObject<Map<string, OrbitLabel> | null>;
  animationFrameRef: RefObject<number | null>; /* requestAnimationFrame handle */
  lastTimeRef: RefObject<number>;
  raycasterRef: RefObject<Raycaster | null>; /* Mouse raycasting for hover/click */
  mouseRef: RefObject<THREE.Vector2>;
  cameraRef: RefObject<THREE.PerspectiveCamera | null>;
  satelliteLayerRef: RefObject<SatelliteLayer | null>;
  exoplanetRendererRef: RefObject<ExoplanetRenderer | null>;
  cesiumEnabledRef: RefObject<boolean>; /* Cesium globe overlay toggle */
  earthLockEnabledRef: RefObject<boolean>; /* Camera locked to Earth */
  earthLightEnabledRef: RefObject<boolean>;
  isTrackingSatelliteRef: RefObject<boolean>; /* Camera following a satellite */
  lastFollowTargetRef: RefObject<number | null>;
  labelUpdateFrameCounterRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  mouseDownPositionRef: RefObject<{ x: number; y: number }>;
  mouseDownTimeRef: RefObject<number>;
}

/** Callbacks for scene lifecycle events. */
export interface SceneCallbacks {
  onCameraDistanceChange?: (distance: number) => void;
  onInitializationProgress?: (stage: string, progress: number, isComplete: boolean) => void;
  onDistanceToEarthChange?: (distanceAU: number) => void;
}
