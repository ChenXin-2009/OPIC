/**
 * Dock 栏单项 (Dock Item)
 *
 * 渲染 Dock 栏中的单个图标项，支持悬停缩放动画和运行状态指示器。
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DockItem as DockItemType } from '@/types/dock';

/** Dock 栏单项属性 */
export interface DockItemProps {
  /** Dock 项数据 */
  item: DockItemType;
  /** 是否显示标签文字 */
  showLabel?: boolean;
  /** 是否显示运行状态指示器 */
  showRunningIndicator?: boolean;
}

/**
 * Dock 项目组件
 */
export function DockItem({
  item,
  showLabel = true,
  showRunningIndicator = true,
}: DockItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = () => {
    if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* 图标容器 */}
      <motion.button
        aria-label={item.label}
        className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg cursor-pointer overflow-hidden"
        style={{ backgroundColor: item.color }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.1, y: -4 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {/* 图标 */}
        {typeof item.icon === 'string' ? (
          // 检查是否是 emoji（单个字符或短字符串）或 URL
          item.icon.startsWith('http') || item.icon.startsWith('/') || item.icon.startsWith('data:') ? (
            <img src={item.icon} alt={item.label} loading="lazy" className="w-7 h-7 object-contain" />
          ) : (
            <div className="text-2xl">{item.icon}</div>
          )
        ) : (
          <div className="w-7 h-7 flex items-center justify-center text-white">
            {item.icon}
          </div>
        )}
        
        {/* 徽章 */}
        {item.badge !== undefined && item.badge > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </motion.div>
        )}
      </motion.button>

      {/* 运行指示器 */}
      {showRunningIndicator && item.isRunning && (
        <motion.div
          className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        />
      )}

      {/* 标签提示 */}
      {showLabel && isHovered && (
        <motion.div
          className="absolute -top-10 px-3 py-1.5 bg-gray-900/90 backdrop-blur-md text-white text-sm rounded-lg shadow-lg whitespace-nowrap"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
        >
          {item.label}
          {/* 小箭头 */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/90 rotate-45" />
        </motion.div>
      )}
    </div>
  );
}
