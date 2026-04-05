'use client';

/**
 * 商业航天发射追踪 - 场景集成组件
 *
 * 坐标系说明：
 * - LaunchRenderer 的 group 挂在 scene 根节点
 * - 每帧从 scene 里找地球 mesh，把其 position + quaternion 同步给 group
 * - 这样 latLonToVec3 输出的局部坐标就自动跟随地球的位置和自转
 */

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useModStore } from '@/lib/mod-manager/store';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { LaunchRenderer } from '@/lib/mods/space-launches/LaunchRenderer';
import SpaceLaunchPanel from './SpaceLaunchPanel';
import { useSolarSystemStore } from '@/lib/state';

interface Props {
  lang?: 'zh' | 'en';
  onClose?: () => void;
}

/** 在 scene 里按名字找地球 mesh */
function findEarthMesh(scene: THREE.Scene): THREE.Object3D | null {
  return scene.getObjectByName('earth') ?? null;
}

export const SpaceLaunchOverlay: React.FC<Props> = ({ lang = 'zh', onClose }) => {
  const modState  = useModStore(s => s.mods['space-launches']?.state);
  const modConfig = useModStore(s => s.mods['space-launches']?.config);
  const setModConfig = useModStore(s => s.setModConfig);

  const [renderer, setRenderer] = useState<LaunchRenderer | null>(null);

  useEffect(() => {
    if (modState !== 'enabled') {
      if (renderer) {
        try {
          const scene = getRenderAPI().getScene() as THREE.Scene;
          scene.remove(renderer.getGroup());
        } catch { /* ignore */ }
        renderer.dispose();
        setRenderer(null);
      }
      return;
    }

    const r = new LaunchRenderer();

    // 初始位置：先用 store 里的地球坐标做一次粗定位
    const earthBody = useSolarSystemStore.getState().celestialBodies.find(
      (b: any) => b.name.toLowerCase() === 'earth'
    );
    if (earthBody) r.setEarthPosition(earthBody.x, earthBody.y, earthBody.z);

    try {
      const scene = getRenderAPI().getScene() as THREE.Scene;
      scene.add(r.getGroup());
    } catch {
      console.warn('[SpaceLaunchOverlay] 场景尚未就绪');
    }
    setRenderer(r);

    let lastTime = Date.now();
    let earthMeshCache: THREE.Object3D | null = null;

    const unsubscribe = getRenderAPI().onBeforeRender(() => {
      const now = Date.now();
      r.tick((now - lastTime) / 1000);
      lastTime = now;

      try {
        const scene = getRenderAPI().getScene() as THREE.Scene;

        // 缓存地球 mesh 引用，避免每帧 traverse
        if (!earthMeshCache) {
          earthMeshCache = findEarthMesh(scene);
        }

        if (earthMeshCache) {
          // 同步地球的世界位置 + 旋转四元数（与 WeatherDisasterOverlay 完全一致）
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          earthMeshCache.getWorldPosition(worldPos);
          earthMeshCache.getWorldQuaternion(worldQuat);
          r.setEarthTransform(worldPos.x, worldPos.y, worldPos.z, worldQuat);
        } else {
          // 降级：只同步位置
          const eb = useSolarSystemStore.getState().celestialBodies.find(
            (b: any) => b.name.toLowerCase() === 'earth'
          );
          if (eb) r.setEarthPosition(eb.x, eb.y, eb.z);
        }
      } catch { /* scene not ready */ }
    });

    return () => {
      unsubscribe();
      earthMeshCache = null;
      try {
        const scene = getRenderAPI().getScene() as THREE.Scene;
        scene.remove(r.getGroup());
      } catch { /* ignore */ }
      r.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modState]);

  if (modState !== 'enabled') return null;

  return (
    <SpaceLaunchPanel
      renderer={renderer}
      lang={lang}
      initialConfig={modConfig as any}
      onConfigChange={cfg => setModConfig('space-launches', cfg as Record<string, unknown>)}
      onClose={onClose}
    />
  );
};

export default SpaceLaunchOverlay;
