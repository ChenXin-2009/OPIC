'use client';

/**
 * 全球货运与贸易路线 - 场景集成组件
 *
 * 坐标系说明（与 WeatherDisasterOverlay 完全一致）：
 * - TrafficRenderer 的 group 挂在 scene 根节点
 * - 每帧从 scene 里找地球 mesh，把其 position + quaternion 同步给 group
 * - 这样 latLonToVec3 输出的局部坐标就自动跟随地球的位置和自转
 */

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useModStore } from '@/lib/mod-manager/store';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { TrafficRenderer } from '@/lib/mods/global-traffic/TrafficRenderer';
import { useSolarSystemStore } from '@/lib/state';
import { rendererStore } from '@/lib/mods/rendererStore';

interface Props {
  lang?: 'zh' | 'en';
}

/** 在 scene 里按名字找地球 mesh（与 WeatherDisasterOverlay 相同） */
function findEarthMesh(scene: THREE.Scene): THREE.Object3D | null {
  return scene.getObjectByName('earth') ?? null;
}

export const GlobalTrafficOverlay: React.FC<Props> = ({ lang: _lang = 'zh' }) => {
  const modState     = useModStore(s => s.mods['global-traffic']?.state);

  const [renderer, setRenderer] = useState<TrafficRenderer | null>(null);

  useEffect(() => {
    if (modState !== 'enabled') {
      if (renderer) {
        try {
          const scene = getRenderAPI().getScene() as THREE.Scene;
          scene.remove(renderer.getGroup());
        } catch { /* ignore */ }
        renderer.dispose();
        setRenderer(null);
        rendererStore.setGlobalTrafficRenderer(null);
      }
      return;
    }

    const r = new TrafficRenderer();

    // 初始位置：先用 store 里的地球坐标做一次粗定位
    const earthBody = useSolarSystemStore.getState().celestialBodies.find(
      (b: any) => b.name.toLowerCase() === 'earth'
    );
    if (earthBody) r.setEarthPosition(earthBody.x, earthBody.y, earthBody.z);

    try {
      const scene = getRenderAPI().getScene() as THREE.Scene;
      scene.add(r.getGroup());
    } catch {
      console.warn('[GlobalTrafficOverlay] 场景尚未就绪');
    }

    setRenderer(r);
    rendererStore.setGlobalTrafficRenderer(r); // 存储到全局store

    let earthMeshCache: THREE.Object3D | null = null;

    // 每帧同步地球 position + quaternion（与 WeatherDisasterOverlay 完全相同的模式）
    const unsubscribe = getRenderAPI().onBeforeRender(() => {
      try {
        const scene = getRenderAPI().getScene() as THREE.Scene;

        if (!earthMeshCache) {
          earthMeshCache = findEarthMesh(scene);
        }

        if (earthMeshCache) {
          const worldPos  = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          earthMeshCache.getWorldPosition(worldPos);
          earthMeshCache.getWorldQuaternion(worldQuat);
          // position 设给 group，quaternion 存入 renderer 供下次 update* 使用
          // group 本身不旋转，坐标在构建时已经应用了 quaternion
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

  // Overlay只负责管理3D渲染器,不显示UI
  // UI通过窗口系统显示
  return null;
};

export default GlobalTrafficOverlay;
