'use client';

import { useEffect } from 'react';
import { useDockStore } from '@/lib/state/dockStore';
import { useWindowManagerStore } from '@/lib/state/windowManagerStore';

/**
 * Dock 和窗口管理器同步组件
 * 
 * 负责同步 Dock 运行指示器和窗口状态
 */
export function DockWindowSync() {
  const { items, setRunning } = useDockStore();
  const { windows } = useWindowManagerStore();

  useEffect(() => {
    // 同步运行状态
    items.forEach((item) => {
      if (item.windowId) {
        const isWindowOpen = windows.has(item.windowId);
        if (item.isRunning !== isWindowOpen) {
          setRunning(item.id, isWindowOpen);
        }
      }
    });
  }, [windows, items, setRunning]);

  return null;
}
