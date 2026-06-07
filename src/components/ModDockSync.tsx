/**
 * ModDockSync.tsx - MOD 和 Dock 同步组件
 * 
 * 监听 MOD 状态变化，自动将启用的 MOD 添加到 Dock
 */

'use client';

import { useEffect } from 'react';
import { useDockStore } from '@/lib/state/DockStore';
import { useWindowManagerStore } from '@/lib/state/windowManagerStore';
import { useModStore } from '@/lib/mod-manager/store';
import { SatelliteWindow } from './windows/SatelliteWindow';
import { CesiumControlWindow } from './windows/CesiumControlWindow';
import { SpaceLaunchWindow } from './windows/SpaceLaunchWindow';
import { GlobalTrafficWindow } from './windows/GlobalTrafficWindow';
import { WeatherDisasterWindow } from './windows/WeatherDisasterWindow';

// MOD 窗口映射
const MOD_WINDOWS: Record<string, { component: React.ReactNode; size: { width: number; height: number } }> = {
  'satellite-tracking': {
    component: <SatelliteWindow lang="zh" />,
    size: { width: 450, height: 550 },
  },
  'cesium-integration': {
    component: <CesiumControlWindow lang="zh" />,
    size: { width: 400, height: 500 },
  },
  'space-launches': {
    component: <SpaceLaunchWindow lang="zh" />,
    size: { width: 500, height: 600 },
  },
  'global-traffic': {
    component: <GlobalTrafficWindow lang="zh" />,
    size: { width: 450, height: 550 },
  },
  'weather-disaster': {
    component: <WeatherDisasterWindow lang="zh" />,
    size: { width: 450, height: 550 },
  },
  // 其他 MOD 可以在这里添加窗口
};

export function ModDockSync() {
  const { addItem, removeItem, hasItem } = useDockStore();
  const { openWindow } = useWindowManagerStore();
  const mods = useModStore((state) => state.mods);

  useEffect(() => {
    // 遍历所有 MOD
    Object.entries(mods).forEach(([modId, modInstance]) => {
      const isEnabled = modInstance.state === 'enabled';
      const dockItemId = `mod-${modId}`;
      const itemExists = hasItem(dockItemId);

      if (isEnabled && !itemExists) {
        // MOD 启用且不在 Dock 中，添加到 Dock
        const manifest = modInstance.manifest;
        const windowConfig = MOD_WINDOWS[modId];
        
        addItem({
          id: dockItemId,
          label: manifest.nameZh || manifest.name,
          icon: manifest.icon || '📦',
          type: 'app',
          isRunning: false,
          isPinned: false,
          order: 100 + Object.keys(mods).indexOf(modId), // 放在固定图标后面
          windowId: `${modId}-window`,
          onClick: () => {
            if (windowConfig) {
              openWindow({
                id: `${modId}-window`,
                title: manifest.nameZh || manifest.name,
                content: windowConfig.component,
                defaultPosition: { x: 200 + Math.random() * 100, y: 100 + Math.random() * 50 },
                defaultSize: windowConfig.size,
                icon: manifest.icon || '📦',
              });
            } else {
              // 如果没有配置窗口，显示占位内容
              openWindow({
                id: `${modId}-window`,
                title: manifest.nameZh || manifest.name,
                content: (
                  <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{manifest.icon || '📦'}</div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {manifest.nameZh || manifest.name}
                      </h2>
                      <p className="text-white/60 mb-4">
                        {manifest.descriptionZh || manifest.description}
                      </p>
                      <p className="text-white/40 text-sm">
                        MOD 窗口界面开发中...
                      </p>
                    </div>
                  </div>
                ),
                defaultPosition: { x: 200 + Math.random() * 100, y: 100 + Math.random() * 50 },
                defaultSize: { width: 500, height: 400 },
                icon: manifest.icon || '📦',
              });
            }
          },
        });
      } else if (!isEnabled && itemExists) {
        // MOD 禁用且在 Dock 中，从 Dock 移除
        removeItem(dockItemId);
      }
    });
  }, [mods, addItem, removeItem, hasItem, openWindow]);

  return null;
}
