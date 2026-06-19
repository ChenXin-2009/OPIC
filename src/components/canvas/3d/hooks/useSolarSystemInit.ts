'use client';

import { useCallback } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { useSceneStore } from '@/lib/state/SceneStore';
import { useExoplanetStore } from '@/lib/store/useExoplanetStore';
import { SceneManager } from '@/lib/3d/SceneManager';
import { CameraController } from '@/lib/3d/CameraController';
import { Planet } from '@/lib/3d/Planet';
import { EarthPlanet } from '@/lib/3d/EarthPlanet';
import { CesiumMappedPlanet } from '@/lib/3d/CesiumMappedPlanet';
import { OrbitCurve } from '@/lib/3d/OrbitCurve';
import { OrbitLabel } from '@/lib/3d/OrbitLabel';
import { SatelliteOrbit } from '@/lib/3d/SatelliteOrbit';
import { SatelliteLayer } from '@/lib/3d/SatelliteLayer';
import { ExoplanetRenderer } from '@/lib/3d/ExoplanetRenderer';
import { TextureManager } from '@/lib/3d/TextureManager';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { dateToJulianDay } from '@/lib/astronomy/time';
import { planetNames } from '@/lib/astronomy/names';
import { SATELLITE_DEFINITIONS, ORBITAL_ELEMENTS } from '@/lib/astronomy/orbit';
import { CELESTIAL_BODIES } from '@/lib/types/celestialTypes';
import { IMAGERY_SOURCES, LUNAR_IMAGERY_SOURCES } from '@/lib/cesium/imageryProviders';
import { FAR_VIEW_CONFIG, ORBIT_COLORS, ORBIT_CURVE_POINTS, SATELLITE_CONFIG, SUN_LIGHT_CONFIG } from '@/lib/config/visualConfig';
import { CAMERA_ANGLE_CONFIG } from '@/lib/config/solarSystem3dConfig';
import { initializeUniverseRenderers } from '@/components/canvas/3d/universeRenderers';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Raycaster } from 'three';
import * as THREE from 'three';
import type { SceneRefs } from './sceneTypes';
import { logger } from '@/utils/logger';

export function useSolarSystemInit(
  refs: SceneRefs,
  props: {
    cesiumEnabled?: boolean;
    earthLockEnabled?: boolean;
    earthLightEnabled?: boolean;
    onCameraReady?: (camera: any) => void;
    onEarthPlanetReady?: (earthPlanet: any) => void;
    onInitializationProgress?: (stage: string, progress: number, isComplete: boolean) => void;
  }
) {
  const { setSceneManager, setCameraController } = useSceneStore();

  const initScene = useCallback(() => {
    const container = refs.containerRef.current;
    if (!container) return null;

    const sceneManager = new SceneManager(container);
    refs.sceneManagerRef.current = sceneManager;
    setSceneManager(sceneManager);

    const scene = sceneManager.getScene();
    const camera = sceneManager.getCamera();
    refs.cameraRef.current = camera;

    if (props.onCameraReady) props.onCameraReady(camera);

    const renderer = sceneManager.getRenderer();

    initializeUniverseRenderers(sceneManager).catch(error => {
      console.error('Failed to initialize universe renderers:', error);
    });

    const satelliteLayer = new SatelliteLayer(sceneManager);
    refs.satelliteLayerRef.current = satelliteLayer;

    const exoplanetRenderer = new ExoplanetRenderer();
    exoplanetRenderer.getGroup().quaternion.identity();
    exoplanetRenderer.setCamera(camera);
    scene.add(exoplanetRenderer.getGroup());
    refs.exoplanetRendererRef.current = exoplanetRenderer;

    const exoplanetState = useExoplanetStore.getState();
    exoplanetRenderer.setIndex(exoplanetState.systems);
    exoplanetRenderer.setSelectedSystem(exoplanetState.selectedSystem);
    exoplanetRenderer.setSelectedBody(exoplanetState.selectedBody);
    void exoplanetState.fetchIndex().then((systems) => {
      refs.exoplanetRendererRef.current?.setIndex(systems);
    }).catch((error) => {
      console.error('[ExoplanetRenderer] Failed to load NASA exoplanet index:', error);
    });

    getRenderAPI()._setThreeContext(scene, camera, renderer);

    if (!refs.labelRendererRef.current) {
      const labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(container.clientWidth, container.clientHeight);
      labelRenderer.domElement.style.position = 'absolute';
      labelRenderer.domElement.style.top = '0';
      labelRenderer.domElement.style.left = '0';
      labelRenderer.domElement.style.pointerEvents = 'none';
      labelRenderer.domElement.style.zIndex = '3';
      container.appendChild(labelRenderer.domElement);
      refs.labelRendererRef.current = labelRenderer;
    }

    const cameraController = new CameraController(camera, renderer.domElement);
    refs.cameraControllerRef.current = cameraController;
    setCameraController(cameraController);

    const controls = cameraController.getControls();
    controls.target.set(0, 0, 0);
    const initialDistance = 30;
    camera.position.set(0, initialDistance, 0);
    controls.update();

    cameraController.setPolarAngle(CAMERA_ANGLE_CONFIG.initialPolarAngle, false);
    cameraController.setAzimuthalAngle(CAMERA_ANGLE_CONFIG.initialAzimuthalAngle, false);
    controls.enabled = true;

    const sunLight = new THREE.PointLight(
      SUN_LIGHT_CONFIG.color, SUN_LIGHT_CONFIG.intensity, SUN_LIGHT_CONFIG.distance, SUN_LIGHT_CONFIG.decay
    );
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = !!SUN_LIGHT_CONFIG.castShadow;
    if (SUN_LIGHT_CONFIG.castShadow && sunLight.shadow) {
      sunLight.shadow.mapSize.width = SUN_LIGHT_CONFIG.shadowMapSize;
      sunLight.shadow.mapSize.height = SUN_LIGHT_CONFIG.shadowMapSize;
      sunLight.shadow.bias = -0.0001;
    }
    scene.add(sunLight);

    const initialState = useSolarSystemStore.getState();
    const julianDay = dateToJulianDay(initialState.currentTime);
    const elementsMap = ORBITAL_ELEMENTS;

    const sunBody = initialState.celestialBodies.find((b: any) => b.isSun);
    if (sunBody) {
      const sunConfig = CELESTIAL_BODIES.sun;
      const sunPlanet = new Planet({
        body: sunBody,
        ...(sunConfig && { config: sunConfig }),
        rotationSpeed: 0,
      });
      const sunMesh = sunPlanet.getMesh();
      sunMesh.position.set(0, 0, 0);
      sunMesh.userData.isSun = true;
      scene.add(sunMesh);
      if (!refs.planetsRef.current) refs.planetsRef.current = new Map();
      refs.planetsRef.current.set('sun', sunPlanet);
    }

    if (!refs.planetsRef.current) refs.planetsRef.current = new Map();
    if (!refs.orbitsRef.current) refs.orbitsRef.current = new Map();
    if (!refs.labelsRef.current) refs.labelsRef.current = new Map();

    initialState.celestialBodies.forEach((body: any) => {
      if (body.isSun) return;

      const isSatellite = !!body.parent;
      const bodyKey = body.name.toLowerCase();
      const celestialConfig = CELESTIAL_BODIES[bodyKey];

      let planet: Planet;
      if (bodyKey === 'earth') {
        planet = new EarthPlanet({
          body,
          ...(celestialConfig && { config: celestialConfig }),
          rotationSpeed: 0,
          enableCesiumTiles: true,
          cesiumConfig: {
            cesiumContainerId: 'cesium-earth-canvas',
            parentElement: container ?? undefined,
            canvasResolutionScale: 1.0,
            maximumScreenSpaceError: 2,
            maximumNumberOfLoadedTiles: 1000,
            enableTerrain: true,
            terrainProviderSource: 'arcgis-world-elevation',
            requestTerrainVertexNormals: true,
            requestTerrainWaterMask: true,
            terrainExaggeration: 1.5,
            terrainExaggerationRelativeHeight: 0,
          },
          cesiumVisibleDistance: 2000,
          transitionStartDistance: 1800,
          transitionEndDistance: 2500,
        });
      } else if (bodyKey === 'moon') {
        planet = new CesiumMappedPlanet({
          body,
          ...(celestialConfig && { config: celestialConfig }),
          rotationSpeed: 0,
          enableCesiumTiles: true,
          cesiumConfig: {
            cesiumContainerId: 'cesium-moon-canvas',
            parentElement: container ?? undefined,
            canvasResolutionScale: 0.85,
            maximumScreenSpaceError: 3.5,
            maximumNumberOfLoadedTiles: 350,
            enableTerrain: false,
            terrainProviderSource: 'none',
            requestTerrainVertexNormals: false,
            requestTerrainWaterMask: false,
            terrainExaggeration: 1,
            terrainExaggerationRelativeHeight: 0,
            ellipsoid: 'moon',
            bodyRadiusMeters: 1737400,
            exposeViewerToWindow: false,
          },
          cesiumVisibleDistanceAu: 0.0015,
          logLabel: 'MoonPlanet',
        });
      } else {
        planet = new Planet({
          body,
          ...(celestialConfig && { config: celestialConfig }),
          rotationSpeed: 0,
        });
      }

      planet.updatePosition(body.x, body.y, body.z);
      const planetMesh = planet.getMesh();
      scene.add(planetMesh);
      (planetMesh as any).userData = (planetMesh as any).userData || {};
      (planetMesh as any).userData.radius = planet.getRealRadius();
      planetMesh.name = body.name.toLowerCase();
      refs.planetsRef.current!.set(body.name.toLowerCase(), planet);

      if (bodyKey === 'earth') {
        sceneManager.setEarthPlanet(planet);
        if (props.onEarthPlanetReady) props.onEarthPlanetReady(planet);

        const esriSource = IMAGERY_SOURCES.find(s => s.id === 'esri-world-imagery');
        if (esriSource) {
          esriSource.create().then((provider) => {
            const cesiumExt = (planet as EarthPlanet).getCesiumExtension();
            if (cesiumExt && provider) cesiumExt.setImageryProvider(provider);
          }).catch((error) => {
            console.error('[SolarSystemCanvas3D] Failed to load default imagery provider:', error);
          });
        }

        if ('setCesiumEnabled' in planet) {
          (planet as any).setCesiumEnabled(!!props.cesiumEnabled);
        }
      }

      if (bodyKey === 'moon') {
        const lunarSource = LUNAR_IMAGERY_SOURCES.find(s => s.id === 'moon-trek-lro-wac-global');
        if (lunarSource) {
          lunarSource.create().then((provider) => {
            const cesiumExt = (planet as CesiumMappedPlanet).getCesiumExtension();
            if (cesiumExt && provider) cesiumExt.setImageryProvider(provider);
          }).catch((error) => {
            console.error('[SolarSystemCanvas3D] Failed to load lunar imagery provider:', error);
          });
        }
        if ('setCesiumEnabled' in planet) {
          (planet as any).setCesiumEnabled(!!props.cesiumEnabled);
        }
      }

      const textureManager = TextureManager.getInstance();
      textureManager.getTexture(bodyKey).then((texture) => {
        if (texture && !planet.getIsSun()) planet.applyTexture(texture, bodyKey);
      });
      textureManager.getNightTexture(bodyKey).then((nightTexture) => {
        if (nightTexture) planet.applyNightTexture(nightTexture);
      });

      planet.createMarkerCircle();

      if (isSatellite) {
        const parentKey = body.parent as string;
        const defs = SATELLITE_DEFINITIONS[parentKey];
        const def = defs ? defs.find((s: any) => s.name === body.name) : null;
        const orbitRadius = def ? def.a : 0.001;
        const orbitColor = def ? def.color : body.color;
        const inclination = def ? def.i : 0;
        const Omega = def ? def.Omega : 0;
        const eclipticOrbit = def ? def.eclipticOrbit || false : false;
        const orbit = new SatelliteOrbit(orbitRadius, orbitColor, 128, inclination, Omega, parentKey, eclipticOrbit);
        scene.add(orbit.getLine());
        refs.orbitsRef.current!.set(body.name.toLowerCase(), orbit as unknown as OrbitCurve);
      } else {
        const elements = elementsMap[body.name.toLowerCase() as keyof typeof elementsMap];
        if (elements) {
          const orbitColor = ORBIT_COLORS[body.name.toLowerCase()] || body.color;
          const planetPosition = new THREE.Vector3(body.x, body.y, body.z);
          const orbit = new OrbitCurve(elements, orbitColor, ORBIT_CURVE_POINTS, julianDay, planetPosition);
          scene.add(orbit.getLine());
          refs.orbitsRef.current!.set(body.name.toLowerCase(), orbit);
        }
      }

      if (!refs.labelsRef.current!.has(body.name.toLowerCase())) {
        const labelTextEn = planetNames.en?.[body.name] || body.name;
        const labelTextZh = planetNames.zh?.[body.name] || body.name;
        const baseColor = new THREE.Color(body.color);
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);
        hsl.l = Math.min(hsl.l + 0.3, 0.9);
        const brighterColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
        const colorString = '#' + brighterColor.getHexString();

        let orbitRadius = 1.0;
        if (body.isSatellite) {
          const parentKey = body.parent as string;
          const defs = SATELLITE_DEFINITIONS[parentKey];
          const def = defs ? defs.find((s: any) => s.name === body.name) : null;
          orbitRadius = def ? def.a : 0.01;
        } else {
          const elements = elementsMap[body.name.toLowerCase() as keyof typeof elementsMap];
          orbitRadius = elements ? elements.a : 1.0;
        }

        let orbitSpacing = orbitRadius * 0.3;
        if (!body.isSatellite) {
          const planetOrder = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
          const currentIndex = planetOrder.indexOf(body.name.toLowerCase());
          if (currentIndex > 0) {
            const prevPlanetName = planetOrder[currentIndex - 1];
            const prevElements = elementsMap[prevPlanetName as keyof typeof elementsMap];
            if (prevElements) orbitSpacing = orbitRadius - prevElements.a;
          } else if (currentIndex === 0) {
            orbitSpacing = orbitRadius;
          }
        } else {
          orbitSpacing = orbitRadius * 0.3;
        }

        const label = new OrbitLabel({
          textEn: labelTextEn, textZh: labelTextZh, color: colorString,
          orbitRadius: orbitRadius, orbitSpacing: orbitSpacing,
        });
        scene.add(label.getSprite());
        refs.labelsRef.current!.set(body.name.toLowerCase(), label);
      }
    });

    refs.raycasterRef.current = new Raycaster();

    return { sceneManager, cameraController };
  }, [refs, props, setSceneManager, setCameraController]);

  const autoFocusEarth = useCallback(() => {
    const cameraController = refs.cameraControllerRef.current;
    if (!cameraController) return;

    const state = useSolarSystemStore.getState();
    const earthBody = state.celestialBodies.find((b: any) => b.name.toLowerCase() === 'earth');
    if (!earthBody) return;

    useSolarSystemStore.getState().selectPlanet('Earth');
    const earthPlanet = refs.planetsRef.current?.get('earth');
    if (!earthPlanet) return;

    const targetPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
    const planetRadius = earthPlanet.getRealRadius();
    const celestialObject = { name: 'Earth', radius: planetRadius, type: 'planet' as const };
    const trackingTargetGetter = () => {
      const bodies = useSolarSystemStore.getState().celestialBodies;
      const currentBody = bodies.find((b: any) => b.name === 'Earth');
      if (currentBody) return new THREE.Vector3(currentBody.x, currentBody.y, currentBody.z);
      return targetPosition.clone();
    };
    cameraController.focusOnTarget(targetPosition, celestialObject, trackingTargetGetter);
    logger.debug('Auto-focused on Earth');
  }, [refs]);

  const handleResize = useCallback(() => {
    if (refs.sceneManagerRef.current) refs.sceneManagerRef.current.updateSize();
    if (refs.labelRendererRef.current && refs.containerRef.current) {
      refs.labelRendererRef.current.setSize(
        refs.containerRef.current.clientWidth, refs.containerRef.current.clientHeight
      );
    }
  }, [refs]);

  const cleanupScene = useCallback(() => {
    const textureManager = TextureManager.getInstance();
    refs.planetsRef.current?.forEach((planet) => {
      const bodyId = planet.getTextureBodyId();
      if (bodyId) textureManager.releaseTexture(bodyId);
      planet.dispose();
    });
    refs.orbitsRef.current?.forEach((orbit) => orbit.dispose());
    refs.labelsRef.current?.forEach((label) => {
      label.dispose();
      const sprite = label.getSprite();
      if (sprite.parent) sprite.parent.remove(sprite);
    });
    refs.labelsRef.current?.clear();

    if (refs.labelRendererRef.current && refs.containerRef.current) {
      const el = refs.labelRendererRef.current.domElement;
      if (refs.containerRef.current.contains(el)) {
        refs.containerRef.current.removeChild(el);
      }
    }
    refs.labelRendererRef.current = null;

    if (refs.satelliteLayerRef.current) {
      refs.satelliteLayerRef.current.dispose();
      refs.satelliteLayerRef.current = null;
    }
    if (refs.exoplanetRendererRef.current) {
      refs.exoplanetRendererRef.current.dispose();
      refs.exoplanetRendererRef.current = null;
    }
    if (refs.cameraControllerRef.current) refs.cameraControllerRef.current.dispose();
    if (refs.sceneManagerRef.current) refs.sceneManagerRef.current.dispose();
  }, [refs]);

  return { initScene, autoFocusEarth, handleResize, cleanupScene };
}
