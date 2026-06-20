'use client';

import { useCallback, useEffect } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { useExoplanetStore } from '@/lib/store/useExoplanetStore';
import { logger } from '@/utils/logger';
import type { SceneRefs } from './sceneTypes';
import * as THREE from 'three';

/** Minimum drag distance (px) to distinguish click from drag. */
const dragThreshold = 5;
/** Max click duration (ms) to register as a click vs hold. */
const clickTimeThreshold = 300;

/** Hook managing mouse interaction (click/drag/hover) on the 3D canvas.
 * Handles: satellite picking, exoplanet picking, celestial body focusing,
 * marker/label hit-testing, and drag-vs-click disambiguation.
 */
export function useSolarSystemInteraction(
  refs: SceneRefs,
  focusCallbacks: {
    focusOnExoplanetHost: (hostname: string) => Promise<void>;
    focusOnExoplanetPlanet: (hostname: string, planetName: string) => void;
    prepareDeepSpaceFocus: () => void;
  }
) {
  /** Update exoplanet hover state and cursor based on raycasting. */
  const handleExoplanetHover = useCallback((event: MouseEvent, camera: THREE.PerspectiveCamera) => {
    if (!refs.exoplanetRendererRef.current || !refs.containerRef.current) return;
    const cameraController = refs.cameraControllerRef.current;
    const target = refs.exoplanetRendererRef.current.pick(event.clientX, event.clientY, camera, refs.containerRef.current);
    refs.exoplanetRendererRef.current.setHoveredTarget(target);
    useExoplanetStore.getState().setHoveredHost(target?.type === 'host' ? target.hostname : null);
    useExoplanetStore.getState().setHoveredPlanet(target?.type === 'planet' ? target.planetName : null);
    const sceneManager = refs.sceneManagerRef.current;
    if (sceneManager) {
      sceneManager.getRenderer().domElement.style.cursor = target ? 'pointer' : '';
    }
  }, [refs]);

  /** Record initial mouse position/time for drag detection. */
  const handleMouseDown = useCallback((event: MouseEvent) => {
    refs.isDraggingRef.current = false;
    refs.mouseDownPositionRef.current = { x: event.clientX, y: event.clientY };
    refs.mouseDownTimeRef.current = Date.now();
  }, [refs]);

  /** Handle mouse move: detect drag, hover over satellites/exoplanets. */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (refs.mouseDownTimeRef.current > 0) {
      const deltaX = event.clientX - refs.mouseDownPositionRef.current.x;
      const deltaY = event.clientY - refs.mouseDownPositionRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > dragThreshold) refs.isDraggingRef.current = true; /* mark as drag */
    }

    const container = refs.containerRef.current;
    const raycaster = refs.raycasterRef.current;
    const sceneManager = refs.sceneManagerRef.current;
    const satelliteLayer = refs.satelliteLayerRef.current;
    const cameraController = refs.cameraControllerRef.current;
    if (!container || !raycaster || !sceneManager) return;

    const camera = sceneManager.getCamera();
    const currentBodies = useSolarSystemStore.getState().celestialBodies;
    const earthBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'earth');

    if (earthBody) {
      const earthPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
      const cameraToEarthDistance = camera.position.distanceTo(earthPosition);
      const earthViewThreshold = 0.01;

      if (cameraToEarthDistance < earthViewThreshold && satelliteLayer) {
        const rect = container.getBoundingClientRect();
        refs.mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        refs.mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(refs.mouseRef.current, camera);
        const satelliteRenderer = satelliteLayer.getRenderer();
        const hoveredSatelliteId = satelliteRenderer.raycast(raycaster, cameraToEarthDistance);
        useSatelliteStore.getState().setHoveredSatellite(hoveredSatelliteId);
        satelliteRenderer.setHoveredSatellite(hoveredSatelliteId);
        satelliteLayer.setHoveredOrbit(hoveredSatelliteId);
      } else {
        useSatelliteStore.getState().setHoveredSatellite(null);
        if (satelliteLayer) {
          satelliteLayer.getRenderer().setHoveredSatellite(null);
          satelliteLayer.setHoveredOrbit(null);
        }
      }
    } else {
      useSatelliteStore.getState().setHoveredSatellite(null);
      if (satelliteLayer) {
        satelliteLayer.getRenderer().setHoveredSatellite(null);
        satelliteLayer.setHoveredOrbit(null);
      }
    }
    handleExoplanetHover(event, camera);
  }, [refs, handleExoplanetHover]);

  const handleMouseUp = useCallback(() => {
    // handled by click
  }, []);

  /** Handle click: prioritize satellite > exoplanet > celestial body, skip if dragging. */
  const handleClick = useCallback((event: MouseEvent) => {
    const container = refs.containerRef.current;
    const raycaster = refs.raycasterRef.current;
    const sceneManager = refs.sceneManagerRef.current;
    const cameraController = refs.cameraControllerRef.current;
    const exoplanetRenderer = refs.exoplanetRendererRef.current;
    const satelliteLayer = refs.satelliteLayerRef.current;

    if (!container || !raycaster || !sceneManager || !cameraController) return;

    if (refs.isDraggingRef.current) {
      refs.isDraggingRef.current = false;
      refs.mouseDownTimeRef.current = 0;
      return;
    }

    const clickDuration = Date.now() - refs.mouseDownTimeRef.current;
    if (clickDuration > clickTimeThreshold) {
      refs.isDraggingRef.current = false;
      refs.mouseDownTimeRef.current = 0;
      return;
    }

    const rect = container.getBoundingClientRect();
    refs.mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    refs.mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = sceneManager.getCamera();
    raycaster.setFromCamera(refs.mouseRef.current, camera);
    const currentBodies = useSolarSystemStore.getState().celestialBodies;

    const earthBody = currentBodies.find((b: any) => b.name.toLowerCase() === 'earth');

    if (earthBody) {
      const earthPosition = new THREE.Vector3(earthBody.x, earthBody.y, earthBody.z);
      const cameraToEarthDistance = camera.position.distanceTo(earthPosition);
      const earthViewThreshold = 0.01;

      if (cameraToEarthDistance < earthViewThreshold && satelliteLayer) {
        const satelliteRenderer = satelliteLayer.getRenderer();
        const clickedSatelliteId = satelliteRenderer.raycast(raycaster, cameraToEarthDistance);
        if (clickedSatelliteId !== null) {
          useSatelliteStore.getState().selectSatellite(clickedSatelliteId);
          refs.isDraggingRef.current = false;
          refs.mouseDownTimeRef.current = 0;
          return;
        }
      }
    }

    if (exoplanetRenderer && container) {
      const exoplanetTarget = exoplanetRenderer.pick(event.clientX, event.clientY, camera, container);
      if (exoplanetTarget?.type === 'host' || exoplanetTarget?.type === 'system-star') {
        void focusCallbacks.focusOnExoplanetHost(exoplanetTarget.hostname);
        refs.isDraggingRef.current = false;
        refs.mouseDownTimeRef.current = 0;
        return;
      }
      if (exoplanetTarget?.type === 'planet') {
        focusCallbacks.focusOnExoplanetPlanet(exoplanetTarget.hostname, exoplanetTarget.planetName);
        refs.isDraggingRef.current = false;
        refs.mouseDownTimeRef.current = 0;
        return;
      }

      const systemRenderer = exoplanetRenderer.systemRenderer;
      if (systemRenderer) {
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const markerSize = 20;
        const planetPositions = systemRenderer.getPlanetScreenPositions(
          camera, container.clientWidth, container.clientHeight
        );
        for (const pos of planetPositions) {
          const distance = Math.sqrt((clickX - pos.screenX) * (clickX - pos.screenX) + (clickY - pos.screenY) * (clickY - pos.screenY));
          if (distance <= markerSize / 2) {
            const selectedSystem = useExoplanetStore.getState().selectedSystem;
            if (selectedSystem) {
              focusCallbacks.focusOnExoplanetPlanet(selectedSystem.hostname, pos.name);
              refs.isDraggingRef.current = false;
              refs.mouseDownTimeRef.current = 0;
              return;
            }
          }
        }
      }
    }

    const intersects: Array<{ planet: any; body: any; distance: number; type: 'mesh' | 'marker' | 'label'; isSatellite: boolean }> = [];

    currentBodies.forEach((body: any) => {
      const isSatellite = !!body.parent;
      const key = body.name.toLowerCase();
      const planet = refs.planetsRef.current?.get(key);
      if (planet) {
        const mesh = planet.getMesh();
        const meshIntersect = raycaster.intersectObject(mesh);
        if (meshIntersect.length > 0 && meshIntersect[0]) {
          intersects.push({ planet, body, distance: meshIntersect[0].distance, type: 'mesh', isSatellite });
        }

        const markerObject = planet.getMarkerObject();
        if (markerObject && container) {
          const worldPos = new THREE.Vector3(body.x, body.y, body.z);
          worldPos.project(camera);
          const screenX = (worldPos.x * 0.5 + 0.5) * container.clientWidth;
          const screenY = (worldPos.y * -0.5 + 0.5) * container.clientHeight;
          const clickX = event.clientX - rect.left;
          const clickY = event.clientY - rect.top;
          const markerSize = 20;
          const dist = Math.sqrt((clickX - screenX) * (clickX - screenX) + (clickY - screenY) * (clickY - screenY));
          if (dist <= markerSize / 2) {
            intersects.push({ planet, body, distance: 0, type: 'marker', isSatellite });
          }
        }

        const label = refs.labelsRef.current?.get(key);
        if (label && container) {
          const bounds = label.getScreenBounds(camera, container.clientWidth, container.clientHeight);
          if (bounds) {
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;
            if (clickX >= bounds.left && clickX <= bounds.right && clickY >= bounds.top && clickY <= bounds.bottom) {
              intersects.push({ planet, body, distance: 0, type: 'label', isSatellite });
            }
          }
        }
      }
    });

    if (intersects.length > 0) {
      const markerOrLabelClick = intersects.find(i => i.type === 'marker' || i.type === 'label');
      let meshClick = intersects.find(i => i.type === 'mesh');

      if (meshClick && !markerOrLabelClick && container) {
        const planetWorldPos = new THREE.Vector3(meshClick.body.x, meshClick.body.y, meshClick.body.z);
        const distanceToCamera = camera.position.distanceTo(planetWorldPos);
        const planetRadius = meshClick.planet.getRealRadius();
        const angularSize = 2 * Math.atan(planetRadius / distanceToCamera);
        const fov = camera.fov * (Math.PI / 180);
        const screenHeight = container.clientHeight;
        const pixelSize = (angularSize / fov) * screenHeight;
        const minPixelSize = 30;
        if (pixelSize < minPixelSize) meshClick = undefined;
      }

      const target = markerOrLabelClick || meshClick;
      if (target) {
        const selectedPlanetName = target.body.name;
        useSolarSystemStore.getState().selectPlanet(selectedPlanetName);
        const objectType = target.isSatellite ? 'satellite' : 'planet';
        logger.debug(`Focusing on ${objectType}: ${selectedPlanetName} (clicked ${target.type})`);
        const targetPosition = new THREE.Vector3(target.body.x, target.body.y, target.body.z);
        const planetRadius = target.planet.getRealRadius();
        const celestialObject = {
          name: selectedPlanetName,
          radius: planetRadius,
          type: selectedPlanetName.toLowerCase() === 'sun' ? 'star' as const : 'planet' as const
        };
        const trackingTargetGetter = () => {
          const bodies = useSolarSystemStore.getState().celestialBodies;
          const currentBody = bodies.find((b: any) => b.name === selectedPlanetName);
          if (currentBody) return new THREE.Vector3(currentBody.x, currentBody.y, currentBody.z);
          return targetPosition.clone();
        };
        cameraController.focusOnTarget(targetPosition, celestialObject, trackingTargetGetter);
      }
    }

    refs.isDraggingRef.current = false;
    refs.mouseDownTimeRef.current = 0;
  }, [refs, focusCallbacks]);

  /** Attach mouse event listeners to the WebGL and label renderers. */
  const setupInteraction = useCallback(() => {
    const sceneManager = refs.sceneManagerRef.current;
    const labelRenderer = refs.labelRendererRef.current;
    if (!sceneManager) return;

    const renderer = sceneManager.getRenderer();
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('click', handleClick);

    if (labelRenderer) {
      labelRenderer.domElement.addEventListener('mousedown', handleMouseDown);
      labelRenderer.domElement.addEventListener('mousemove', handleMouseMove);
      labelRenderer.domElement.addEventListener('mouseup', handleMouseUp);
      labelRenderer.domElement.addEventListener('click', handleClick);
    }
  }, [refs, handleMouseDown, handleMouseMove, handleMouseUp, handleClick]);

  /** Remove mouse event listeners. */
  const cleanupInteraction = useCallback(() => {
    const sceneManager = refs.sceneManagerRef.current;
    const labelRenderer = refs.labelRendererRef.current;
    if (!sceneManager) return;

    const renderer = sceneManager.getRenderer();
    renderer.domElement.removeEventListener('mousedown', handleMouseDown);
    renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    renderer.domElement.removeEventListener('mouseup', handleMouseUp);
    renderer.domElement.removeEventListener('click', handleClick);

    if (labelRenderer) {
      labelRenderer.domElement.removeEventListener('mousedown', handleMouseDown);
      labelRenderer.domElement.removeEventListener('mousemove', handleMouseMove);
      labelRenderer.domElement.removeEventListener('mouseup', handleMouseUp);
      labelRenderer.domElement.removeEventListener('click', handleClick);
    }
  }, [refs, handleMouseDown, handleMouseMove, handleMouseUp, handleClick]);

  return { setupInteraction, cleanupInteraction };
}
