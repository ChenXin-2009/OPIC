/**
 * 性能调试面板组件
 * 
 * 仅在开发环境显示，提供实时性能监控和可视化
 * 
 * 功能：
 * - 实时 FPS 图表（最近 60 秒）
 * - 内存使用图表（最近 60 个样本）
 * - 对象计数（Three.js, Cesium）
 * - 渲染统计（三角形数、绘制调用）
 * - 自定义域指标（天体计算、瓦片加载等）
 * - Web Vitals 摘要
 * - 导出 JSON 功能
 * - 键盘快捷键（Ctrl+Shift+P）
 * - 可拖动和折叠
 * - 位置持久化到 localStorage
 * 
 * @example
 * ```tsx
 * // 仅在开发模式使用
 * {process.env.NODE_ENV === 'development' && <PerformancePanel />}
 * ```
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { performanceMonitor, PerformanceMetrics } from '@/lib/performance/PerformanceMonitor';

/**
 * 性能面板位置
 */
export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * 性能面板 Props
 */
export interface PerformancePanelProps {
  /** 初始位置 */
  position?: PanelPosition;
  
  /** 初始折叠状态 */
  collapsed?: boolean;
  
  /** 是否显示键盘快捷键提示 */
  showShortcutHint?: boolean;
}

/**
 * FPS 历史数据点
 */
interface FPSDataPoint {
  time: number;
  fps: number;
}

/**
 * 内存历史数据点
 */
interface MemoryDataPoint {
  time: number;
  used: number;
  total: number;
}

/**
 * 位置映射到 CSS 类
 */
const POSITION_CLASSES: Record<PanelPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

/**
 * localStorage 键
 */
const STORAGE_KEYS = {
  POSITION: 'opic_performance_panel_position',
  COLLAPSED: 'opic_performance_panel_collapsed',
};

/**
 * 性能调试面板组件
 */
export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  position: initialPosition = 'top-right',
  collapsed: initialCollapsed = false,
  showShortcutHint = true,
}) => {
  // 仅在开发模式渲染
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'development') {
    return null;
  }

  // 状态
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [position, setPosition] = useState<PanelPosition>(initialPosition);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [fpsHistory, setFpsHistory] = useState<FPSDataPoint[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<MemoryDataPoint[]>([]);
  
  // 引用
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsCanvasRef = useRef<HTMLCanvasElement>(null);
  const memoryCanvasRef = useRef<HTMLCanvasElement>(null);

  // 从 localStorage 加载位置和折叠状态
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPosition = localStorage.getItem(STORAGE_KEYS.POSITION) as PanelPosition | null;
    const savedCollapsed = localStorage.getItem(STORAGE_KEYS.COLLAPSED);

    if (savedPosition && savedPosition in POSITION_CLASSES) {
      setPosition(savedPosition);
    }

    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }
  }, []);

  // 保存位置和折叠状态到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(STORAGE_KEYS.POSITION, position);
    localStorage.setItem(STORAGE_KEYS.COLLAPSED, String(isCollapsed));
  }, [position, isCollapsed]);

  // 启动性能监控并订阅更新
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 启动性能监控
    performanceMonitor.start();

    // 定期更新指标（每秒）
    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getMetrics();
      setMetrics(currentMetrics);

      // 更新 FPS 历史
      setFpsHistory((prev) => {
        const newHistory = [...prev, { time: Date.now(), fps: currentMetrics.fps }];
        // 只保留最近 60 秒的数据
        const cutoff = Date.now() - 60000;
        return newHistory.filter((point) => point.time > cutoff);
      });

      // 更新内存历史
      setMemoryHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            time: Date.now(),
            used: currentMetrics.usedHeapSize,
            total: currentMetrics.heapSize,
          },
        ];
        // 只保留最近 60 个样本
        return newHistory.slice(-60);
      });
    };

    updateMetrics(); // 立即更新一次
    updateIntervalRef.current = setInterval(updateMetrics, 1000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // 绘制 FPS 图表
  useEffect(() => {
    if (!fpsCanvasRef.current || fpsHistory.length === 0 || isCollapsed) return;

    const canvas = fpsCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格线
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // 水平网格线（30fps, 60fps）
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 绘制 FPS 曲线
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    fpsHistory.forEach((point, index) => {
      const x = (index / (fpsHistory.length - 1)) * width;
      const y = height - (point.fps / 60) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 绘制标签
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px monospace';
    ctx.fillText('60', 2, 12);
    ctx.fillText('30', 2, height / 2 + 12);
    ctx.fillText('0', 2, height - 2);
  }, [fpsHistory, isCollapsed]);

  // 绘制内存图表
  useEffect(() => {
    if (!memoryCanvasRef.current || memoryHistory.length === 0 || isCollapsed) return;

    const canvas = memoryCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // 找到最大内存值用于缩放
    const maxMemory = Math.max(...memoryHistory.map((p) => p.total));

    // 绘制已用内存曲线
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    memoryHistory.forEach((point, index) => {
      const x = (index / (memoryHistory.length - 1)) * width;
      const y = height - (point.used / maxMemory) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 绘制总内存曲线
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    memoryHistory.forEach((point, index) => {
      const x = (index / (memoryHistory.length - 1)) * width;
      const y = height - (point.total / maxMemory) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);

    // 绘制标签
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px monospace';
    ctx.fillText(`${(maxMemory / 1048576).toFixed(0)}MB`, 2, 12);
  }, [memoryHistory, isCollapsed]);

  // 键盘快捷键（Ctrl+Shift+P）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 导出指标为 JSON
  const handleExport = () => {
    const json = performanceMonitor.exportMetrics();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 切换位置
  const cyclePosition = () => {
    const positions: PanelPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const currentIndex = positions.indexOf(position);
    const nextIndex = (currentIndex + 1) % positions.length;
    setPosition(positions[nextIndex]);
  };

  if (!metrics) {
    return null;
  }

  return (
    <div
      className={`fixed ${POSITION_CLASSES[position]} z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl text-white font-mono text-xs overflow-hidden transition-all duration-300`}
      style={{
        width: isCollapsed ? '200px' : '320px',
        maxHeight: isCollapsed ? '40px' : '600px',
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-semibold">Performance</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 移动位置按钮 */}
          <button
            onClick={cyclePosition}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Change position"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          
          {/* 折叠/展开按钮 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {!isCollapsed && (
        <div className="p-3 space-y-3 overflow-auto" style={{ maxHeight: '550px' }}>
          {/* FPS 图表 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400">FPS</span>
              <span className={`font-semibold ${metrics.fps < 30 ? 'text-red-500' : metrics.fps < 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                {metrics.fps.toFixed(1)}
              </span>
            </div>
            <canvas ref={fpsCanvasRef} width={280} height={80} className="w-full bg-gray-800 rounded" />
            <div className="flex items-center justify-between mt-1 text-gray-500">
              <span>Avg: {metrics.avgFPS}</span>
              <span>Min: {metrics.minFPS}</span>
              <span>Max: {metrics.maxFPS}</span>
            </div>
          </div>

          {/* 内存图表 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400">Memory</span>
              <span className="font-semibold text-blue-500">
                {(metrics.usedHeapSize / 1048576).toFixed(1)}MB
              </span>
            </div>
            <canvas ref={memoryCanvasRef} width={280} height={60} className="w-full bg-gray-800 rounded" />
            <div className="flex items-center justify-between mt-1 text-gray-500">
              <span>Total: {(metrics.heapSize / 1048576).toFixed(1)}MB</span>
              <span>Limit: {(metrics.heapLimit / 1048576).toFixed(1)}MB</span>
            </div>
          </div>

          {/* 对象计数 */}
          <div className="space-y-1">
            <div className="text-gray-400 mb-1">Object Counts</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-500">Three.js</div>
                <div className="font-semibold">{metrics.threeActiveObjects.toLocaleString()}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-500">Cesium</div>
                <div className="font-semibold">{metrics.cesiumActiveObjects.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* 渲染统计 */}
          <div className="space-y-1">
            <div className="text-gray-400 mb-1">Render Stats</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-500">Triangles</div>
                <div className="font-semibold">{metrics.trianglesRendered.toLocaleString()}</div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-500">Draw Calls</div>
                <div className="font-semibold">{metrics.drawCalls}</div>
              </div>
            </div>
          </div>

          {/* 自定义域指标 */}
          <div className="space-y-1">
            <div className="text-gray-400 mb-1">Domain Metrics (avg ms)</div>
            <div className="space-y-1">
              {metrics.celestialCalculationTime > 0 && (
                <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
                  <span className="text-gray-500">Celestial Calc</span>
                  <span className="font-semibold">{metrics.celestialCalculationTime.toFixed(2)}</span>
                </div>
              )}
              {metrics.cesiumTileLoadTime > 0 && (
                <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
                  <span className="text-gray-500">Tile Load</span>
                  <span className="font-semibold">{metrics.cesiumTileLoadTime.toFixed(2)}</span>
                </div>
              )}
              {metrics.ephemerisParseTime > 0 && (
                <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
                  <span className="text-gray-500">Ephemeris Parse</span>
                  <span className="font-semibold">{metrics.ephemerisParseTime.toFixed(2)}</span>
                </div>
              )}
              {metrics.modLoadTime > 0 && (
                <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
                  <span className="text-gray-500">MOD Load</span>
                  <span className="font-semibold">{metrics.modLoadTime.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Web Vitals */}
          <div className="space-y-1">
            <div className="text-gray-400 mb-1">Web Vitals</div>
            <div className="grid grid-cols-2 gap-2">
              {metrics.webVitals.FCP !== undefined && (
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">FCP</div>
                  <div className="font-semibold">{metrics.webVitals.FCP.toFixed(0)}ms</div>
                </div>
              )}
              {metrics.webVitals.LCP !== undefined && (
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">LCP</div>
                  <div className="font-semibold">{metrics.webVitals.LCP.toFixed(0)}ms</div>
                </div>
              )}
              {metrics.webVitals.INP !== undefined && (
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">INP</div>
                  <div className="font-semibold">{metrics.webVitals.INP.toFixed(0)}ms</div>
                </div>
              )}
              {metrics.webVitals.CLS !== undefined && (
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">CLS</div>
                  <div className="font-semibold">{metrics.webVitals.CLS.toFixed(3)}</div>
                </div>
              )}
            </div>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            Export JSON
          </button>

          {/* 快捷键提示 */}
          {showShortcutHint && (
            <div className="text-center text-gray-500 text-xs pt-2 border-t border-gray-700">
              Press <kbd className="px-1 bg-gray-800 rounded">Ctrl+Shift+P</kbd> to toggle
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 懒加载包装器
export const LazyPerformancePanel = React.lazy(() =>
  Promise.resolve({ default: PerformancePanel })
);

export default PerformancePanel;
