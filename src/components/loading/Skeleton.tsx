/**
 * Skeleton 骨架屏组件系统
 * 
 * 用于在内容加载时显示占位符 UI，提升用户体验
 * 
 * 功能：
 * - 多种变体：text, rect, circle, custom
 * - 动画效果：pulse（脉冲）, wave（波浪）, none（无动画）
 * - 预定义骨架布局
 * - 快速显示（<100ms）
 * - 平滑过渡动画（300ms）
 * 
 * @example
 * ```tsx
 * // 基础使用
 * <Skeleton variant="text" width={200} height={20} />
 * <Skeleton variant="circle" width={40} height={40} />
 * 
 * // 使用预定义骨架
 * <CesiumViewerSkeleton />
 * <TimelineControlsSkeleton />
 * ```
 */

'use client';

import React from 'react';

/**
 * Skeleton Props 接口
 */
export interface SkeletonProps {
  /** 骨架变体类型 */
  variant?: 'text' | 'rect' | 'circle' | 'custom';
  
  /** 宽度（支持数字或字符串，如 '100%', '200px', 200） */
  width?: string | number;
  
  /** 高度（支持数字或字符串） */
  height?: string | number;
  
  /** 自定义类名 */
  className?: string;
  
  /** 动画类型 */
  animation?: 'pulse' | 'wave' | 'none';
  
  /** 是否显示（用于控制淡入淡出） */
  visible?: boolean;
}

/**
 * 将数字或字符串转换为 CSS 值
 */
const formatSize = (size: string | number | undefined): string => {
  if (size === undefined) return 'auto';
  if (typeof size === 'number') return `${size}px`;
  return size;
};

/**
 * Skeleton 基础组件
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className = '',
  animation = 'pulse',
  visible = true,
}) => {
  // 根据变体设置默认尺寸
  const defaultWidth = variant === 'text' ? '100%' : variant === 'circle' ? 40 : width;
  const defaultHeight = variant === 'text' ? 16 : variant === 'circle' ? 40 : height;
  
  // 计算样式
  const style: React.CSSProperties = {
    width: formatSize(defaultWidth),
    height: formatSize(defaultHeight),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: variant === 'circle' ? '50%' : variant === 'text' ? '4px' : '8px',
    display: 'inline-block',
    opacity: visible ? 1 : 0,
    transition: 'opacity 300ms ease-in-out',
  };
  
  // 动画类名
  const animationClass = animation === 'pulse' 
    ? 'animate-skeleton-pulse' 
    : animation === 'wave' 
    ? 'animate-skeleton-wave' 
    : '';
  
  return (
    <div 
      className={`skeleton ${animationClass} ${className}`.trim()}
      style={style}
      role="presentation"
      aria-hidden="true"
    />
  );
};

/**
 * CesiumViewer 骨架屏
 * 
 * 用于 Cesium 3D 地球视图加载时的占位符
 */
export const CesiumViewerSkeleton: React.FC = () => {
  return (
    <div className="cesium-viewer-skeleton w-full h-full relative bg-gray-900">
      {/* 主视图区域 */}
      <Skeleton 
        variant="rect" 
        width="100%" 
        height="100%" 
        animation="wave"
        className="absolute inset-0"
      />
      
      {/* 顶部工具栏 */}
      <div className="absolute top-4 left-4 right-4 flex gap-2">
        <Skeleton variant="rect" width={120} height={36} animation="pulse" />
        <Skeleton variant="rect" width={120} height={36} animation="pulse" />
        <Skeleton variant="rect" width={120} height={36} animation="pulse" />
      </div>
      
      {/* 右上角控制按钮 */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Skeleton variant="circle" width={40} height={40} animation="pulse" />
        <Skeleton variant="circle" width={40} height={40} animation="pulse" />
        <Skeleton variant="circle" width={40} height={40} animation="pulse" />
      </div>
      
      {/* 左下角图例 */}
      <div className="absolute bottom-4 left-4 space-y-2">
        <Skeleton variant="rect" width={200} height={24} animation="pulse" />
        <Skeleton variant="rect" width={180} height={20} animation="pulse" />
        <Skeleton variant="rect" width={160} height={20} animation="pulse" />
      </div>
      
      {/* 右下角缩放控制 */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Skeleton variant="circle" width={48} height={48} animation="pulse" />
        <Skeleton variant="circle" width={48} height={48} animation="pulse" />
      </div>
    </div>
  );
};

/**
 * TimelineControls 骨架屏
 * 
 * 用于时间轴控制组件加载时的占位符
 */
export const TimelineControlsSkeleton: React.FC = () => {
  return (
    <div className="timeline-controls-skeleton p-4 bg-gray-800 rounded-lg">
      {/* 时间显示 */}
      <div className="flex items-center justify-center mb-4">
        <Skeleton variant="text" width={200} height={32} animation="pulse" />
      </div>
      
      {/* 时间轴滑块 */}
      <div className="mb-4">
        <Skeleton variant="rect" width="100%" height={8} animation="wave" />
      </div>
      
      {/* 播放控制按钮 */}
      <div className="flex items-center justify-center gap-4">
        <Skeleton variant="circle" width={40} height={40} animation="pulse" />
        <Skeleton variant="circle" width={56} height={56} animation="pulse" />
        <Skeleton variant="circle" width={40} height={40} animation="pulse" />
      </div>
      
      {/* 速度和日期选择 */}
      <div className="flex items-center justify-between mt-4">
        <Skeleton variant="rect" width={100} height={32} animation="pulse" />
        <Skeleton variant="rect" width={100} height={32} animation="pulse" />
      </div>
    </div>
  );
};

/**
 * DataPanel 骨架屏
 * 
 * 用于数据面板加载时的占位符
 */
export const DataPanelSkeleton: React.FC = () => {
  return (
    <div className="data-panel-skeleton p-4 bg-gray-800 rounded-lg space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={150} height={24} animation="pulse" />
        <Skeleton variant="circle" width={32} height={32} animation="pulse" />
      </div>
      
      {/* 数据行 */}
      {[...Array(6)].map((_, index) => (
        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700">
          <Skeleton variant="text" width={120} height={16} animation="pulse" />
          <Skeleton variant="text" width={80} height={16} animation="pulse" />
        </div>
      ))}
      
      {/* 图表区域 */}
      <div className="mt-4">
        <Skeleton variant="rect" width="100%" height={200} animation="wave" />
      </div>
      
      {/* 操作按钮 */}
      <div className="flex gap-2 mt-4">
        <Skeleton variant="rect" width="100%" height={40} animation="pulse" />
        <Skeleton variant="rect" width="100%" height={40} animation="pulse" />
      </div>
    </div>
  );
};

/**
 * SearchResults 骨架屏
 * 
 * 用于搜索结果加载时的占位符
 */
export const SearchResultsSkeleton: React.FC = () => {
  return (
    <div className="search-results-skeleton p-4 bg-gray-800 rounded-lg">
      {/* 搜索框 */}
      <div className="mb-4">
        <Skeleton variant="rect" width="100%" height={48} animation="pulse" />
      </div>
      
      {/* 搜索结果列表 */}
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-gray-700 rounded">
            {/* 图标 */}
            <Skeleton variant="circle" width={48} height={48} animation="pulse" />
            
            {/* 文本内容 */}
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="80%" height={20} animation="pulse" />
              <Skeleton variant="text" width="100%" height={16} animation="pulse" />
              <Skeleton variant="text" width="60%" height={16} animation="pulse" />
            </div>
          </div>
        ))}
      </div>
      
      {/* 加载更多 */}
      <div className="mt-4 text-center">
        <Skeleton variant="rect" width={120} height={36} animation="pulse" className="mx-auto" />
      </div>
    </div>
  );
};

/**
 * 骨架屏组容器
 * 
 * 用于包装多个骨架元素，提供统一的淡入淡出控制
 */
export interface SkeletonGroupProps {
  /** 是否显示骨架屏 */
  loading: boolean;
  
  /** 骨架屏内容 */
  skeleton: React.ReactNode;
  
  /** 实际内容 */
  children: React.ReactNode;
  
  /** 淡入淡出持续时间（ms） */
  duration?: number;
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  loading,
  skeleton,
  children,
  duration = 300,
}) => {
  const [shouldShowSkeleton, setShouldShowSkeleton] = React.useState(loading);
  
  React.useEffect(() => {
    if (loading) {
      // 立即显示骨架屏
      setShouldShowSkeleton(true);
      return;
    } else {
      // 延迟隐藏骨架屏，等待淡出动画完成
      const timer = setTimeout(() => {
        setShouldShowSkeleton(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [loading, duration]);
  
  return (
    <div className="skeleton-group relative">
      {/* 骨架屏层 */}
      {shouldShowSkeleton && (
        <div 
          className="skeleton-layer absolute inset-0 z-10"
          style={{
            opacity: loading ? 1 : 0,
            transition: `opacity ${duration}ms ease-in-out`,
            pointerEvents: loading ? 'auto' : 'none',
          }}
        >
          {skeleton}
        </div>
      )}
      
      {/* 实际内容层 */}
      <div
        className="content-layer"
        style={{
          opacity: loading ? 0 : 1,
          transition: `opacity ${duration}ms ease-in-out`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// 导出默认组件
export default Skeleton;
