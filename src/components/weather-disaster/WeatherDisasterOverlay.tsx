'use client';

/**
 * 气象灾害监测 - 场景集成组件
 * 监听 MOD 状态，当 MOD 启用时挂载面板并连接渲染器
 *
 * 坐标系说明：
 * - DisasterRenderer 的 group 挂在 scene 根节点
 * - 每帧从 scene 里找地球 mesh，把其 position + quaternion 同步给 group
 * - 这样 latLonToVec3 输出的局部坐标就自动跟随地球的位置和自转
 */

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useModStore } from '@/lib/mod-manager/store';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { DisasterRenderer } from '@/lib/mods/weather-disaster/DisasterRenderer';
import { useSolarSystemStore } from '@/lib/state';
import { rendererStore } from '@/lib/mods/rendererStore';

interface Props {
  lang?: 'zh' | 'en';
}

/** 在 scene 里按名字找地球 mesh */
function findEarthMesh(scene: THREE.Scene): THREE.Object3D | null {
  return scene.getObjectByName('earth') ?? null;
}

export const WeatherDisasterOverlay: React.FC<Props> = ({ lang: _lang = 'zh' }) => {
  const modState     = useModStore(s => s.mods['weather-disaster']?.state);

  const [renderer, setRenderer] = useState<DisasterRenderer | null>(null);
  const [, setShowPanel] = useState(true);

  useEffect(() => {
    if (modState !== 'enabled') {
      if (renderer) {
        try {
          const scene = getRenderAPI().getScene() as THREE.Scene;
          scene.remove(renderer.getGroup());
        } catch { /* ignore */ }
        renderer.dispose();
        setRenderer(null);
        rendererStore.setWeatherDisasterRenderer(null);
      }
      return;
    }

    const r = new DisasterRenderer();

    // 初始位置：先用 store 里的地球坐标做一次粗定位
    const earthBody = useSolarSystemStore.getState().celestialBodies.find(
      (b: any) => b.name.toLowerCase() === 'earth'
    );
    if (earthBody) r.setEarthPosition(earthBody.x, earthBody.y, earthBody.z);

    try {
      const scene = getRenderAPI().getScene() as THREE.Scene;
      scene.add(r.getGroup());
    } catch {
      console.warn('[WeatherDisasterOverlay] 场景尚未就绪');
    }
    setRenderer(r);
    setShowPanel(true);
    rendererStore.setWeatherDisasterRenderer(r); // 存储到全局store

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
          // 同步地球的世界位置 + 旋转四元数
          // getWorldPosition / getWorldQuaternion 会考虑所有父节点变换
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

  // Overlay只负责管理3D渲染器,不显示UI
  // UI通过窗口系统显示
  return null;
};

export default WeatherDisasterOverlay;
