'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useDockStore } from '@/lib/state/dockStore';
import { DockItem } from './DockItem';

/**
 * macOS 风格 Dock 任务栏组件
 */
export function Dock() {
  const {
    items,
    position,
    size,
    showLabels,
    showRunningIndicator,
  } = useDockStore();

  // 根据大小设置图标尺寸
  const sizeClasses = {
    small: 'gap-1.5',
    medium: 'gap-2',
    large: 'gap-3',
  };

  // 根据位置设置容器样式
  const positionClasses = {
    bottom: 'bottom-4 left-1/2 -translate-x-1/2 flex-row',
    left: 'left-4 top-1/2 -translate-y-1/2 flex-col',
    right: 'right-4 top-1/2 -translate-y-1/2 flex-col',
  };

  return (
    <motion.div
      className={`
        fixed z-[1200]
        ${positionClasses[position]}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Dock 容器 */}
      <div
        className={`
          flex ${position === 'bottom' ? 'flex-row' : 'flex-col'}
          ${sizeClasses[size]}
          px-3 py-2
          bg-white/10 backdrop-blur-md
          border border-white/20
          rounded-2xl
          shadow-2xl
        `}
      >
        {items.map((item) => (
          <DockItem
            key={item.id}
            item={item}
            showLabel={showLabels}
            showRunningIndicator={showRunningIndicator}
          />
        ))}
      </div>
    </motion.div>
  );
}
