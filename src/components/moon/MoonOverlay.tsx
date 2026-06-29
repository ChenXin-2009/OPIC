/**
 * MoonOverlay.tsx — 月球探索 MOD 场景集成层
 *
 * 不可见组件，负责：
 * - 监听 MOD 状态 (enable/disable)
 * - 确保 useLunarStore 在 MOD 启用时开始计算
 * - MOD 禁用时无需清理（数据计算由动画循环驱动，持续可用）
 *
 * 由主页面渲染，类似于 WeatherDisasterOverlay / SpaceLaunchOverlay。
 */

'use client';

import { useEffect } from 'react';
import { useModStore } from '@/lib/mod-manager/store';
import { useLunarStore } from '@/lib/store/LunarState';

interface MoonOverlayProps {
  lang?: 'zh' | 'en';
}

export function MoonOverlay({ lang = 'zh' }: MoonOverlayProps) {
  const modState = useModStore(s => s.mods['moon']?.state);

  useEffect(() => {
    if (modState === 'enabled') {
      // 确保 LunarStore 至少初始化一次
      const store = useLunarStore.getState();
      if (!store.data) {
        store.update(new Date());
      }
    }
  }, [modState]);

  return null; // 不可见
}
