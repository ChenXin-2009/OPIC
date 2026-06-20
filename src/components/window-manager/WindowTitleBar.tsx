/**
 * 窗口标题栏 (Window Title Bar)
 *
 * 浮动窗口的标题栏组件，包含标题文本和窗口控制按钮（关闭、最小化、最大化）。
 * 支持拖拽移动窗口。
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';

/** 窗口标题栏属性 */
export interface WindowTitleBarProps {
  /** 窗口标题 */
  title: string;
  /** 关闭按钮回调 */
  onClose?: () => void;
  /** 最小化按钮回调 */
  onMinimize?: () => void;
  /** 最大化按钮回调 */
  onMaximize?: () => void;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 是否显示最小化按钮 */
  minimizable?: boolean;
  /** 是否显示最大化按钮 */
  maximizable?: boolean;
  /** 当前是否处于最大化状态 */
  isMaximized?: boolean;
  /** 标题栏鼠标按下回调（用于拖拽） */
  onMouseDown?: (e: React.MouseEvent) => void;
  /** 标题栏触摸开始回调（用于拖拽） */
  onTouchStart?: (e: React.TouchEvent) => void;
}

/**
 * Windows 11 风格窗口标题栏
 */
export function WindowTitleBar({
  title,
  onClose,
  onMinimize,
  onMaximize,
  closable = true,
  minimizable = true,
  maximizable = true,
  isMaximized = false,
  onMouseDown,
  onTouchStart,
}: WindowTitleBarProps) {
  return (
    <div
      className="relative flex items-center h-12 bg-white/5 backdrop-blur-md border-b border-white/10 rounded-t-xl cursor-move select-none"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* 窗口标题 (左侧) */}
      <div className="flex-1 min-w-0 px-4 text-sm font-medium text-white/90 truncate">
        {title}
      </div>

      {/* Windows 窗口控制按钮 (右侧) */}
      <div className="flex h-full">
        {/* 最小化按钮 */}
        {minimizable && (
          <motion.button
            aria-label="Minimize"
            className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-100"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10">
              <path d="M1 5h8"/>
            </svg>
          </motion.button>
        )}

        {/* 最大化/还原按钮 */}
        {maximizable && (
          <motion.button
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-100"
            onClick={(e) => {
              e.stopPropagation();
              onMaximize?.();
            }}
            whileTap={{ scale: 0.9 }}
          >
            {isMaximized ? (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10">
                <rect x="1.5" y="3.5" width="5" height="5" rx="0.5"/>
                <path d="M3.5 3.5V2a0.5 0.5 0 0 1 0.5-0.5H8a0.5 0.5 0 0 1 0.5 0.5v4A0.5 0.5 0 0 1 8 6.5H7.5"/>
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10">
                <rect x="1.5" y="1.5" width="7" height="7" rx="0.5"/>
              </svg>
            )}
          </motion.button>
        )}

        {/* 关闭按钮 */}
        {closable && (
          <motion.button
            aria-label="Close"
            className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-[#E81123] active:bg-[#BF0F1D] transition-colors duration-100"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 10 10">
              <path d="M1.5 1.5l7 7m0-7l-7 7"/>
            </svg>
          </motion.button>
        )}
      </div>
    </div>
  );
}
