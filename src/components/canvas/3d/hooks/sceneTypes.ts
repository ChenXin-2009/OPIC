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

export interface SceneRefs {
  containerRef: RefObject<HTMLDivElement | null>;
  sceneManagerRef: RefObject<SceneManager | null>;
  cameraControllerRef: RefObject<CameraController | null>;
  labelRendererRef: RefObject<CSS2DRenderer | null>;
  planetsRef: RefObject<Map<string, Planet> | null>;
  orbitsRef: RefObject<Map<string, OrbitCurve> | null>;
  labelsRef: RefObject<Map<string, OrbitLabel> | null>;
  animationFrameRef: RefObject<number | null>;
  lastTimeRef: RefObject<number>;
  raycasterRef: RefObject<Raycaster | null>;
  mouseRef: RefObject<THREE.Vector2>;
  cameraRef: RefObject<THREE.PerspectiveCamera | null>;
  satelliteLayerRef: RefObject<SatelliteLayer | null>;
  exoplanetRendererRef: RefObject<ExoplanetRenderer | null>;
  cesiumEnabledRef: RefObject<boolean>;
  earthLockEnabledRef: RefObject<boolean>;
  earthLightEnabledRef: RefObject<boolean>;
  isTrackingSatelliteRef: RefObject<boolean>;
  lastFollowTargetRef: RefObject<number | null>;
  labelUpdateFrameCounterRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  mouseDownPositionRef: RefObject<{ x: number; y: number }>;
  mouseDownTimeRef: RefObject<number>;
}

export interface SceneCallbacks {
  onCameraDistanceChange?: (distance: number) => void;
  onInitializationProgress?: (stage: string, progress: number, isComplete: boolean) => void;
  onDistanceToEarthChange?: (distanceAU: number) => void;
}
