'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WindowState } from '@/types/window';
import { useWindowManagerStore } from '@/lib/state/windowManagerStore';
import { WindowTitleBar } from './WindowTitleBar';

export interface WindowProps {
  window: WindowState;
}

/**
 * macOS 风格窗口组件
 */
export function Window({ window }: WindowProps) {
  const {
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
  } = useWindowManagerStore();

  const windowRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = React.useState({ x: 0, y: 0, width: 0, height: 0 });

  // 处理窗口点击 (聚焦)
  const handleWindowClick = () => {
    focusWindow(window.id);
  };

  // 处理标题栏拖动开始
  const handleDragStart = (e: React.MouseEvent) => {
    if (!window.draggable || window.isMaximized) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y,
    });
    focusWindow(window.id);
  };

  // 处理拖动
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 边界检查
      const viewportWidth = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1920;
      const viewportHeight = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 1080;
      const maxX = viewportWidth - window.size.width;
      const maxY = viewportHeight - window.size.height;

      updateWindowPosition(window.id, {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, window.id, window.size, updateWindowPosition]);

  // 处理调整大小开始
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    if (!window.resizable) return;

    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: window.size.width,
      height: window.size.height,
    });
    focusWindow(window.id);
  };

  // 处理调整大小
  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(window.minSize.width, resizeStart.width + deltaX);
      const newHeight = Math.max(window.minSize.height, resizeStart.height + deltaY);

      updateWindowSize(window.id, {
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, window.id, window.minSize, updateWindowSize]);

  // 处理窗口控制按钮
  const handleClose = () => closeWindow(window.id);
  const handleMinimize = () => minimizeWindow(window.id);
  const handleMaximize = () => {
    if (window.isMaximized) {
      restoreWindow(window.id);
    } else {
      maximizeWindow(window.id);
    }
  };

  if (!window.isVisible) {
    return null;
  }

  return (
    <motion.div
      ref={windowRef}
      className="absolute flex flex-col bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden"
      style={{
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={handleWindowClick}
    >
      {/* 标题栏 */}
      <WindowTitleBar
        title={window.title}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        closable={window.closable}
        minimizable={window.minimizable}
        maximizable={window.maximizable}
        isMaximized={window.isMaximized}
        onMouseDown={handleDragStart}
      />

      {/* 窗口内容 */}
      <div className="flex-1 overflow-auto p-4">
        {window.content}
      </div>

      {/* 调整大小手柄 (右下角) */}
      {window.resizable && !window.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        >
          <svg className="w-full h-full text-white/30" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 14L14 10M14 14L10 14M14 14L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </motion.div>
  );
}
