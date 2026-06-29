/**
 * MoonOverlay.tsx — 月球探索 MOD 场景集成层
 *
 * 不可见组件，负责：
 * - 监听 MOD 状态 (enabled/disabled)
 * - 启用时：初始化 LunarStore + 创建 CSS2D 着陆点标记
 * - 禁用时：销毁标记，停止更新
 *
 * 标记位置更新由 useSolarSystemAnimation 在有 MOD 启用时驱动（节流每 3 帧）。
 */

'use client';

import { useEffect, useRef } from 'react';
import { useModStore } from '@/lib/mod-manager/store';
import { useLunarStore } from '@/lib/store/LunarState';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { createMoonSiteMarkers, disposeMoonSiteMarkers } from '@/lib/3d/MoonSiteMarkers';
import * as THREE from 'three';

interface MoonOverlayProps {
  lang?: 'zh' | 'en';
}

export function MoonOverlay({ lang = 'zh' }: MoonOverlayProps) {
  const modState = useModStore(s => s.mods['moon']?.state);
  const markersCreatedRef = useRef(false);

  useEffect(() => {
    if (modState === 'enabled') {
      // 初始化 LunarStore
      const store = useLunarStore.getState();
      if (!store.data) {
        store.update(new Date());
      }

      // 等待场景就绪后创建标记
      let attempt = 0;
      const tryCreate = () => {
        if (markersCreatedRef.current) return;
        try {
          const scene = getRenderAPI().getScene() as THREE.Scene | null;
          if (scene) {
            createMoonSiteMarkers(scene);
            markersCreatedRef.current = true;
            return;
          }
        } catch { /* scene not ready */ }
        if (++attempt < 30) setTimeout(tryCreate, 200); // 最多等 6s
      };
      tryCreate();
    } else {
      // MOD 禁用：清理
      if (markersCreatedRef.current) {
        try {
          const scene = getRenderAPI().getScene() as THREE.Scene | null;
          if (scene) disposeMoonSiteMarkers(scene);
        } catch { /* already disposed */ }
        markersCreatedRef.current = false;
      }
    }
  }, [modState]);

  return null;
}
