/**
 * MOD 窗口 (Mod Window)
 *
 * 为 MOD 插件提供标准化的浮动窗口容器。
 * 包含标题栏（支持拖拽、最小化、关闭）和内容区域。
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { WindowInstance } from '@/lib/mod-manager/contribution/WindowManager';
import { WindowTitleBar } from './window-manager/WindowTitleBar';

export interface ModWindowProps {
  /** 窗口实例 */
  instance: WindowInstance;
  /** 窗口管理器操作 */
  onClose: (instanceId: string) => void;
  onMinimize: (instanceId: string) => void;
  onFocus: (instanceId: string) => void;
  onMove: (instanceId: string, position: { x: number; y: number }) => void;
  onResize: (instanceId: string, size: { width: number; height: number }) => void;
  /** 窗口内容渲染函数 */
  renderContent: (instance: WindowInstance) => React.ReactNode;
}

/**
 * MOD 窗口容器组件
 * 
 * 根据窗口定义渲染窗口,支持拖动、调整大小、最小化。
 */
export function ModWindow({
  instance,
  onClose,
  onMinimize,
  onFocus,
  onMove,
  onResize,
  renderContent,
}: ModWindowProps) {
  const windowRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = React.useState({ x: 0, y: 0, width: 0, height: 0 });

  // 获取窗口标题(支持国际化)
  const getTitle = () => {
    if (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) {
      return instance.definition.titleZh || instance.definition.title;
    }
    return instance.definition.title;
  };

  // 处理窗口点击(聚焦)
  const handleWindowClick = () => {
    if (!instance.focused) {
      onFocus(instance.id);
    }
  };

  // 处理标题栏拖动开始
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - instance.position.x,
      y: e.clientY - instance.position.y,
    });
    onFocus(instance.id);
  };

  // 处理拖动
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 边界检查
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const maxX = viewportWidth - instance.size.width;
      const maxY = viewportHeight - instance.size.height;

      onMove(instance.id, {
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
  }, [isDragging, dragStart, instance.id, instance.size, onMove]);

  // 处理调整大小开始
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!instance.definition.resizable) return;

    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: instance.size.width,
      height: instance.size.height,
    });
    onFocus(instance.id);
  };

  // 处理调整大小
  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      // 最小尺寸限制
      const minWidth = 400;
      const minHeight = 300;

      const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
      const newHeight = Math.max(minHeight, resizeStart.height + deltaY);

      onResize(instance.id, {
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
  }, [isResizing, resizeStart, instance.id, onResize]);

  // 处理窗口控制按钮
  const handleClose = () => {
    onClose(instance.id);
  };

  const handleMinimize = () => {
    // 最小化动画: 缩小到 Dock
    if (windowRef.current) {
      // 获取窗口当前位置
      const windowRect = windowRef.current.getBoundingClientRect();

      // 获取 Dock 位置(屏幕底部中央)
      const dockX = typeof window !== 'undefined' ? window.innerWidth / 2 : 960;
      const dockY = typeof window !== 'undefined' ? window.innerHeight - 50 : 1030;

      // 计算动画目标位置
      const targetX = dockX - windowRect.width / 2;
      const targetY = dockY - windowRect.height / 2;

      // 应用动画
      windowRef.current.style.transition = 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
      windowRef.current.style.transform = `translate(${targetX - instance.position.x}px, ${targetY - instance.position.y}px) scale(0.1)`;
      windowRef.current.style.opacity = '0';

      // 动画完成后执行最小化
      setTimeout(() => {
        onMinimize(instance.id);
        if (windowRef.current) {
          windowRef.current.style.transition = '';
          windowRef.current.style.transform = '';
          windowRef.current.style.opacity = '';
        }
      }, 300);
    } else {
      onMinimize(instance.id);
    }
  };

  // 如果窗口已最小化,不渲染
  if (instance.minimized) {
    return null;
  }

  return (
    <motion.div
      ref={windowRef}
      className="absolute flex flex-col bg-gray-900/95 backdrop-blur-md shadow-2xl border border-white/10 overflow-hidden rounded-xl"
      style={{
        left: instance.position.x,
        top: instance.position.y,
        width: instance.size.width,
        height: instance.size.height,
        zIndex: instance.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0.0, 0.2, 1],
      }}
      onClick={handleWindowClick}
    >
      {/* 标题栏 */}
      <WindowTitleBar
        title={getTitle()}
        onClose={handleClose}
        onMinimize={instance.definition.minimizable ? handleMinimize : undefined}
        closable={true}
        minimizable={instance.definition.minimizable}
        maximizable={false}
        isMaximized={false}
        onMouseDown={handleDragStart}
      />

      {/* 窗口内容 */}
      <div className="flex-1 overflow-auto">
        {renderContent(instance)}
      </div>

      {/* 调整大小手柄(右下角) */}
      {instance.definition.resizable && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="w-full h-full text-white/30"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M14 14L14 10M14 14L10 14M14 14L9 9" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
