'use client';

import { useEffect } from 'react';
import { useDockStore } from '@/lib/state/dockStore';
import { useWindowManagerStore } from '@/lib/state/windowManagerStore';
import { defaultDockItems } from '@/lib/config/defaultDockItems';

/**
 * Dock 初始化组件
 * 
 * 负责初始化默认的 Dock 项目并设置点击事件
 */
export function DockInitializer() {
  const { addItem, hasItem } = useDockStore();
  const { openWindow } = useWindowManagerStore();

  useEffect(() => {
    // 初始化默认 Dock 项目
    defaultDockItems.forEach((config) => {
      if (!hasItem(config.id)) {
        addItem({
          ...config,
          type: 'app',
          isRunning: false,
          onClick: () => {
            // 点击 Dock 图标时打开对应窗口
            if (config.windowId) {
              openWindow({
                id: config.windowId,
                title: config.label,
                content: (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{config.icon}</div>
                      <h2 className="text-2xl font-bold mb-2">{config.label}</h2>
                      <p className="text-white/60">窗口内容将在后续阶段实现</p>
                    </div>
                  </div>
                ),
                defaultPosition: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
                defaultSize: { width: 600, height: 400 },
                icon: config.icon,
              });
            }
          },
        });
      }
    });
  }, [addItem, hasItem, openWindow]);

  return null;
}
