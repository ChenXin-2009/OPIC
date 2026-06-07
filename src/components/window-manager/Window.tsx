'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WindowState, ResizeDirection } from '@/types/window';
import { useWindowManagerStore } from '@/lib/state/WindowManagerStore';
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
  const [resizeStart, setResizeStart] = React.useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const [resizeDirection, setResizeDirection] = React.useState<ResizeDirection>('se');

  // 提取 clientX/Y 兼容鼠标和触摸事件
  const getClientXY = (e: React.MouseEvent | React.TouchEvent): { clientX: number; clientY: number } => {
    if ('touches' in e) {
      const touch = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
      return { clientX: touch.clientX, clientY: touch.clientY };
    }
    return { clientX: (e as React.MouseEvent).clientX, clientY: (e as React.MouseEvent).clientY };
  };

  // 处理窗口点击 (聚焦)
  const handleWindowClick = () => {
    focusWindow(window.id);
  };

  // 处理标题栏拖动开始 (鼠标 + 触摸)
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!window.draggable || window.isMaximized) return;
    const { clientX, clientY } = getClientXY(e);

    setIsDragging(true);
    setDragStart({
      x: clientX - window.position.x,
      y: clientY - window.position.y,
    });
    focusWindow(window.id);
  };

  // 处理拖动 (鼠标 + 触摸)
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const newX = clientX - dragStart.x;
      const newY = clientY - dragStart.y;

      const viewportWidth = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1920;
      const viewportHeight = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 1080;
      const maxX = viewportWidth - window.size.width;
      const maxY = viewportHeight - window.size.height;

      updateWindowPosition(window.id, {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, dragStart, window.id, window.size, updateWindowPosition]);

  // 处理调整大小开始 (鼠标 + 触摸)
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, direction: ResizeDirection) => {
    if (!window.resizable) return;
    e.stopPropagation();
    const { clientX, clientY } = getClientXY(e);
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: clientX,
      y: clientY,
      width: window.size.width,
      height: window.size.height,
      posX: window.position.x,
      posY: window.position.y,
    });
    focusWindow(window.id);
  };

  // 处理调整大小 (鼠标 + 触摸, 支持四角)
  React.useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaX = clientX - resizeStart.x;
      const deltaY = clientY - resizeStart.y;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.posX;
      let newY = resizeStart.posY;

      switch (resizeDirection) {
        case 'se':
          newWidth = resizeStart.width + deltaX;
          newHeight = resizeStart.height + deltaY;
          break;
        case 'sw':
          newWidth = resizeStart.width - deltaX;
          newHeight = resizeStart.height + deltaY;
          newX = resizeStart.posX + deltaX;
          break;
        case 'ne':
          newWidth = resizeStart.width + deltaX;
          newHeight = resizeStart.height - deltaY;
          newY = resizeStart.posY + deltaY;
          break;
        case 'nw':
          newWidth = resizeStart.width - deltaX;
          newHeight = resizeStart.height - deltaY;
          newX = resizeStart.posX + deltaX;
          newY = resizeStart.posY + deltaY;
          break;
      }

      // 约束最小尺寸，防止窗口翻转
      const clampedWidth = Math.max(window.minSize.width, newWidth);
      const clampedHeight = Math.max(window.minSize.height, newHeight);

      // 当宽度被 clamp 时，修正位置偏移
      if (resizeDirection === 'sw' || resizeDirection === 'nw') {
        const actualDeltaX = clampedWidth - resizeStart.width;
        newX = resizeStart.posX - actualDeltaX;
      }
      if (resizeDirection === 'ne' || resizeDirection === 'nw') {
        const actualDeltaY = clampedHeight - resizeStart.height;
        newY = resizeStart.posY - actualDeltaY;
      }

      const viewportWidth = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1920;
      const viewportHeight = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 1080;

      // 约束位置不超出视口
      newX = Math.max(0, Math.min(newX, viewportWidth - clampedWidth));
      newY = Math.max(0, Math.min(newY, viewportHeight - clampedHeight));

      if (newX !== resizeStart.posX || newY !== resizeStart.posY) {
        updateWindowPosition(window.id, { x: newX, y: newY });
      }
      updateWindowSize(window.id, { width: clampedWidth, height: clampedHeight });
    };

    const handleUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, [isResizing, resizeStart, resizeDirection, window.id, window.minSize, window.size, updateWindowPosition, updateWindowSize]);

  // 处理窗口控制按钮
  const handleClose = () => closeWindow(window.id);
  
  const handleMinimize = () => {
    // 最小化动画: 缩小到 Dock
    if (windowRef.current) {
      // 获取窗口当前位置
      const windowRect = windowRef.current.getBoundingClientRect();
      
      // 获取 Dock 位置 (屏幕底部中央)
      const dockX = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth / 2 : 960;
      const dockY = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight - 50 : 1030;
      
      // 计算动画目标位置
      const targetX = dockX - windowRect.width / 2;
      const targetY = dockY - windowRect.height / 2;
      
      // 应用动画
      windowRef.current.style.transition = 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
      windowRef.current.style.transform = `translate(${targetX - window.position.x}px, ${targetY - window.position.y}px) scale(0.1)`;
      windowRef.current.style.opacity = '0';
      
      // 动画完成后执行最小化
      setTimeout(() => {
        minimizeWindow(window.id);
        if (windowRef.current) {
          windowRef.current.style.transition = '';
          windowRef.current.style.transform = '';
          windowRef.current.style.opacity = '';
        }
      }, 300);
    } else {
      minimizeWindow(window.id);
    }
  };
  
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

  // 最大化动画变体
  const windowVariants = {
    normal: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: [0.4, 0.0, 0.2, 1] as const,
      },
    },
    maximized: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1] as const,
      },
    },
  };

  return (
    <motion.div
      ref={windowRef}
      className={`absolute flex flex-col bg-gray-900/95 backdrop-blur-md shadow-2xl border border-white/10 overflow-hidden ${
        window.isMaximized ? 'rounded-none' : 'rounded-xl'
      }`}
      style={{
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        maxWidth: 'calc(100vw - 20px)',
        maxHeight: 'calc(100vh - 20px)',
        zIndex: window.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={window.isMaximized ? 'maximized' : 'normal'}
      variants={windowVariants}
      exit={{ opacity: 0, scale: 0.9 }}
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
        onTouchStart={handleDragStart}
      />

      {/* 窗口内容 */}
      <div className="flex-1 overflow-auto p-4">
        {window.content}
      </div>

      {/* 调整大小手柄 (四角) */}
      {window.resizable && !window.isMaximized && (
        <>
          {/* 右上角 */}
          <div
            className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            onTouchStart={(e) => handleResizeStart(e, 'ne')}
          />
          {/* 左上角 */}
          <div
            className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            onTouchStart={(e) => handleResizeStart(e, 'nw')}
          />
          {/* 右下角 */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-10 flex items-end justify-end"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            onTouchStart={(e) => handleResizeStart(e, 'se')}
          >
            <svg className="w-4 h-4 text-white/30" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 14L14 10M14 14L10 14M14 14L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {/* 左下角 */}
          <div
            className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            onTouchStart={(e) => handleResizeStart(e, 'sw')}
          />
        </>
      )}
    </motion.div>
  );
}
