/**
 * Dock 窗口同步器 (Dock Window Sync)
 *
 * 同步 Dock 栏的运行指示器和窗口管理器状态，
 * 确保 Dock 图标的活跃状态与窗口的打开/关闭状态一致。
 */

'use client';

import { useEffect } from 'react';
import { useDockStore } from '@/lib/state/DockStore';
import { useWindowManagerStore } from '@/lib/state/WindowManagerStore';

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
