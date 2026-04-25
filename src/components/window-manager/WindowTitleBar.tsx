'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface WindowTitleBarProps {
  title: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  isMaximized?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
}

/**
 * macOS 风格窗口标题栏
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
}: WindowTitleBarProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className="relative flex items-center justify-between h-12 px-4 bg-white/5 backdrop-blur-md border-b border-white/10 rounded-t-xl cursor-move select-none"
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* macOS 窗口控制按钮 (左侧) */}
      <div className="flex items-center gap-2">
        {/* 关闭按钮 */}
        {closable && (
          <motion.button
            className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF4136] flex items-center justify-center group"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isHovered && (
              <svg className="w-2 h-2 text-[#4D0000] opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 12 12">
                <path d="M10.707 1.293a1 1 0 0 0-1.414 0L6 4.586 2.707 1.293a1 1 0 0 0-1.414 1.414L4.586 6 1.293 9.293a1 1 0 1 0 1.414 1.414L6 7.414l3.293 3.293a1 1 0 0 0 1.414-1.414L7.414 6l3.293-3.293a1 1 0 0 0 0-1.414z"/>
              </svg>
            )}
          </motion.button>
        )}

        {/* 最小化按钮 */}
        {minimizable && (
          <motion.button
            className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FFB700] flex items-center justify-center group"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isHovered && (
              <svg className="w-2 h-2 text-[#995700] opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 12 12">
                <rect x="2" y="5.5" width="8" height="1" rx="0.5"/>
              </svg>
            )}
          </motion.button>
        )}

        {/* 最大化按钮 */}
        {maximizable && (
          <motion.button
            className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#20A030] flex items-center justify-center group"
            onClick={(e) => {
              e.stopPropagation();
              onMaximize?.();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isHovered && (
              <svg className="w-2 h-2 text-[#006400] opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 12 12">
                {isMaximized ? (
                  // 恢复图标
                  <>
                    <rect x="3" y="3" width="6" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1"/>
                    <path d="M4 3V2.5A0.5 0.5 0 0 1 4.5 2H9.5A0.5 0.5 0 0 1 10 2.5V7.5A0.5 0.5 0 0 1 9.5 8H9"/>
                  </>
                ) : (
                  // 最大化图标
                  <>
                    <rect x="2" y="4" width="4" height="4" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1"/>
                    <rect x="6" y="4" width="4" height="4" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </>
                )}
              </svg>
            )}
          </motion.button>
        )}
      </div>

      {/* 窗口标题 (居中) */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-white/90 truncate max-w-[60%]">
        {title}
      </div>

      {/* 占位符 (保持布局平衡) */}
      <div className="w-[60px]" />
    </div>
  );
}
