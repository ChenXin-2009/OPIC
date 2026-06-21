'use client';

import { useEffect, useRef } from 'react';
import { useSearchStore } from '@/lib/store/useSearchStore';
import { useSceneStore } from '@/lib/state/SceneStore';
import { useSolarSystemStore } from '@/lib/state';
import { useExoplanetStore } from '@/lib/store/useExoplanetStore';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';

const exoplanetCache: { hosts: any[]; indexed: boolean } = { hosts: [], indexed: false };
const satelliteCache: { data: any[]; indexed: boolean } = { data: [], indexed: false };

export function SearchProvider() {
  const initializedRef = useRef(false);

  const { sceneManager, cameraController } = useSceneStore();
  const store = useSolarSystemStore();
  const exoplanetSystems = useExoplanetStore((s) => s.systems);
  const exoplanetFetchIndex = useExoplanetStore((s) => s.fetchIndex);
  const satelliteTleData = useSatelliteStore((s) => s.tleData);
  const searchEngine = useSearchStore((s) => s.searchEngine);

  // Initialize search when scene + celestial bodies are ready
  useEffect(() => {
    const bodies = store.celestialBodies;
    if (sceneManager && cameraController && Array.isArray(bodies) && bodies.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      useSearchStore.getState().initializeSearch(sceneManager, cameraController, store);

      // Replay cached data now that search engine exists
      if (exoplanetCache.hosts.length > 0 && !exoplanetCache.indexed) {
        useSearchStore.getState().indexExoplanets(exoplanetCache.hosts);
        exoplanetCache.indexed = true;
      }
      if (satelliteCache.data.length > 0 && !satelliteCache.indexed) {
        useSearchStore.getState().indexSatellites(satelliteCache.data);
        satelliteCache.indexed = true;
      }
    }
  }, [sceneManager, cameraController, store.celestialBodies]);

  // Index exoplanets when they load
  useEffect(() => {
    if (Array.isArray(exoplanetSystems) && exoplanetSystems.length > 0) {
      if (searchEngine) {
        useSearchStore.getState().indexExoplanets(exoplanetSystems);
      } else {
        exoplanetCache.hosts = exoplanetSystems;
      }
      return;
    }
    exoplanetFetchIndex().then((fetched) => {
      if (Array.isArray(fetched) && fetched.length > 0) {
        if (useSearchStore.getState().searchEngine) {
          useSearchStore.getState().indexExoplanets(fetched);
        } else {
          exoplanetCache.hosts = fetched;
        }
      }
    });
  }, [exoplanetSystems, exoplanetFetchIndex, searchEngine]);

  // Index satellites when they load
  useEffect(() => {
    if (satelliteTleData?.size > 0) {
      const satellites = Array.from(satelliteTleData.values());
      if (searchEngine) {
        useSearchStore.getState().indexSatellites(satellites);
      } else {
        satelliteCache.data = satellites;
      }
    }
  }, [satelliteTleData, searchEngine]);

  // Update index once when celestial bodies are first available
  useEffect(() => {
    const bodiesLength = store.celestialBodies?.length;
    if (bodiesLength > 0 && initializedRef.current) {
      const sceneMgr = useSceneStore.getState().sceneManager;
      const renderers = sceneMgr ? {
        localGroup: sceneMgr.getLocalGroupRenderer(),
        nearbyGroups: sceneMgr.getNearbyGroupsRenderer(),
        virgoSupercluster: sceneMgr.getVirgoSuperclusterRenderer(),
        laniakeaSupercluster: sceneMgr.getLaniakeaSuperclusterRenderer(),
      } : undefined;
      useSearchStore.getState().updateIndex(store, renderers);
    }
  }, [store.celestialBodies?.length]);

  return null;
}
