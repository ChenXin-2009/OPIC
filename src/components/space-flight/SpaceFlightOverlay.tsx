'use client';

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useModStore } from '@/lib/mod-manager/store';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { FlightRendererLayer } from '@/lib/mods/flight-renderer';
import { getInterpolatedFlightRenderSnapshot } from '@/lib/mods/space-flight/flight-runtime-store';
import { useSolarSystemStore } from '@/lib/state';

interface Props {
  lang?: 'zh' | 'en';
}

function findEarthMesh(scene: THREE.Scene): THREE.Object3D | null {
  return scene.getObjectByName('earth') ?? null;
}

export const SpaceFlightOverlay: React.FC<Props> = ({ lang: _lang = 'zh' }) => {
  const modState = useModStore((s) => s.mods['space-flight']?.state);
  const [renderer, setRenderer] = useState<FlightRendererLayer | null>(null);

  useEffect(() => {
    if (modState !== 'enabled') {
      if (renderer) {
        try {
          const scene = getRenderAPI().getScene() as THREE.Scene;
          scene.remove(renderer.getGroup());
        } catch {
          // ignore scene teardown races
        }
        renderer.dispose();
        setRenderer(null);
      }
      return;
    }

    const layer = new FlightRendererLayer();

    try {
      const scene = getRenderAPI().getScene() as THREE.Scene;
      scene.add(layer.getGroup());
    } catch {
      console.warn('[SpaceFlightOverlay] 场景尚未就绪');
    }

    const earthBody = useSolarSystemStore.getState().celestialBodies.find(
      (body: any) => body.name.toLowerCase() === 'earth',
    );
    if (earthBody) {
      layer.getGroup().position.set(earthBody.x, earthBody.y, earthBody.z);
    }

    setRenderer(layer);

    let earthMeshCache: THREE.Object3D | null = null;
    const unsubscribe = getRenderAPI().onBeforeRender(() => {
      try {
        const scene = getRenderAPI().getScene() as THREE.Scene;
        if (!earthMeshCache) {
          earthMeshCache = findEarthMesh(scene);
        }

        if (earthMeshCache) {
          const worldPos = new THREE.Vector3();
          earthMeshCache.getWorldPosition(worldPos);
          layer.setEarthTransform(worldPos.x, worldPos.y, worldPos.z);
        }

        const snapshot = getInterpolatedFlightRenderSnapshot();
        const camera = getRenderAPI().getCamera() as THREE.Camera;
        layer.sync(snapshot, camera);
      } catch {
        // ignore transient scene lifecycle errors
      }
    });

    return () => {
      unsubscribe();
      earthMeshCache = null;
      try {
        const scene = getRenderAPI().getScene() as THREE.Scene;
        scene.remove(layer.getGroup());
      } catch {
        // ignore
      }
      layer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modState]);

  if (modState !== 'enabled') return null;
  return null;
};

export default SpaceFlightOverlay;
