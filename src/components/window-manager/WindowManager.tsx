'use client';

import React from 'react';
import { useWindowManagerStore } from '@/lib/state/windowManagerStore';
import { Window } from './Window';

/**
 * 窗口管理器主组件
 * 
 * 负责渲染所有活动窗口
 */
export function WindowManager() {
  const { windows } = useWindowManagerStore();

  // 将 Map 转换为数组并按 z-index 排序
  const windowArray = React.useMemo(() => {
    return Array.from(windows.values())
      .filter(window => window.isVisible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [windows]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1100]">
      {windowArray.map((window) => (
        <div key={window.id} className="pointer-events-auto">
          <Window window={window} />
        </div>
      ))}
    </div>
  );
}
