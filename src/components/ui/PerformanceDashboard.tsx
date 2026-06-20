/**
 * Performance Dashboard
 *
 * 实时性能监控浮动面板，显示：
 * - FPS (帧率) 实时图表
 * - 内存使用 (JS Heap)
 * - 帧时间分布
 * - 域特定指标 (天体计算、纹理加载、星历解析)
 * - 渲染统计 (Draw Calls, Triangles)
 *
 * 仅在开发环境显示，按 `Ctrl+Shift+P` 切换。
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { performanceMonitor } from '@/lib/performance/PerformanceMonitor';
import type { PerformanceMetrics } from '@/lib/performance/performance-types';

interface FpsHistory {
  timestamps: number[];
  values: number[];
}

const MAX_HISTORY = 120; // 保留最近 120 个采样点 (约 2 分钟)

export function PerformanceDashboard() {
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [fpsHistory, setFpsHistory] = useState<FpsHistory>({ timestamps: [], values: [] });
  const [frameTimeHistory, setFrameTimeHistory] = useState<FpsHistory>({ timestamps: [], values: [] });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameTimeCanvasRef = useRef<HTMLCanvasElement>(null);

  // 切换面板
  const toggle = useCallback(() => {
    setVisible(v => !v);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  // 性能数据订阅
  useEffect(() => {
    if (!visible) return;

    const unsubscribe = performanceMonitor.subscribe((m: PerformanceMetrics) => {
      setMetrics(m);

      const now = Date.now();
      setFpsHistory(prev => {
        const timestamps = [...prev.timestamps, now].slice(-MAX_HISTORY);
        const values = [...prev.values, m.fps].slice(-MAX_HISTORY);
        return { timestamps, values };
      });

      setFrameTimeHistory(prev => {
        const timestamps = [...prev.timestamps, now].slice(-MAX_HISTORY);
        const values = [...prev.values, m.frameTime].slice(-MAX_HISTORY);
        return { timestamps, values };
      });
    });

    return unsubscribe;
  }, [visible]);

  // 绘制 FPS 图表
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { width, height } = rect;
    const { values, timestamps } = fpsHistory;

    // 清除
    ctx.clearRect(0, 0, width, height);

    if (values.length < 2) return;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // 60fps 参考线
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.2);
    ctx.lineTo(width, height * 0.2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 30fps 参考线
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.55);
    ctx.lineTo(width, height * 0.55);
    ctx.stroke();
    ctx.setLineDash([]);

    // FPS 折线
    const maxFps = Math.max(60, ...values);
    const timeRange = timestamps[timestamps.length - 1] - timestamps[0] || 1;

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    values.forEach((fps, i) => {
      const x = ((timestamps[i] - timestamps[0]) / timeRange) * width;
      const y = height - (fps / maxFps) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // FPS 数值
    const currentFps = values[values.length - 1];
    ctx.fillStyle = currentFps >= 55 ? '#00ff88' : currentFps >= 30 ? '#ffff00' : '#ff4444';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${Math.round(currentFps)}`, 8, 24);
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.fillText('FPS', 8, 36);
  }, [fpsHistory, visible]);

  // 绘制帧时间图表
  useEffect(() => {
    const canvas = frameTimeCanvasRef.current;
    if (!canvas || !visible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { width, height } = rect;
    const { values, timestamps } = frameTimeHistory;

    ctx.clearRect(0, 0, width, height);

    if (values.length < 2) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // 16.67ms 参考线 (60fps)
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.setLineDash([4, 4]);
    const y16 = height - (16.67 / 50) * height;
    ctx.beginPath();
    ctx.moveTo(0, y16);
    ctx.lineTo(width, y16);
    ctx.stroke();
    ctx.setLineDash([]);

    const maxTime = Math.max(50, ...values);
    const timeRange = timestamps[timestamps.length - 1] - timestamps[0] || 1;

    ctx.strokeStyle = '#ff8844';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    values.forEach((ft, i) => {
      const x = ((timestamps[i] - timestamps[0]) / timeRange) * width;
      const y = height - (ft / maxTime) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const currentFt = values[values.length - 1];
    ctx.fillStyle = '#ff8844';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${currentFt.toFixed(1)}`, 8, 24);
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.fillText('ms', 8, 36);
  }, [frameTimeHistory, visible]);

  if (!visible) return null;

  const m = metrics;
  const memUsedMB = m ? (m.usedHeapSize / 1048576).toFixed(1) : '--';
  const memLimitMB = m ? (m.heapLimit / 1048576).toFixed(0) : '--';

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] rounded-lg overflow-hidden shadow-2xl"
      style={{
        width: '320px',
        backgroundColor: 'rgba(15, 15, 25, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ccc',
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      >
        <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '12px' }}>
          Performance Monitor
        </span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* 图表区 */}
      <div className="flex gap-1 p-2">
        <canvas
          ref={canvasRef}
          style={{ width: '50%', height: '80px', borderRadius: '4px' }}
        />
        <canvas
          ref={frameTimeCanvasRef}
          style={{ width: '50%', height: '80px', borderRadius: '4px' }}
        />
      </div>

      {/* 指标区 */}
      <div className="px-3 pb-2 space-y-1">
        {/* 内存 */}
        <div className="flex justify-between">
          <span>内存</span>
          <span className={m && m.usedHeapSize / m.heapLimit > 0.8 ? 'text-red-400' : 'text-green-400'}>
            {memUsedMB} / {memLimitMB} MB
          </span>
        </div>

        {/* Draw Calls */}
        <div className="flex justify-between">
          <span>Draw Calls</span>
          <span className="text-blue-400">{m?.drawCalls ?? '--'}</span>
        </div>

        {/* Triangles */}
        <div className="flex justify-between">
          <span>Triangles</span>
          <span className="text-blue-400">{m ? (m.trianglesRendered || 0).toLocaleString() : '--'}</span>
        </div>

        {/* 天体计算 */}
        <div className="flex justify-between">
          <span>天体计算</span>
          <span className={m && m.celestialCalculationTime > 16 ? 'text-red-400' : 'text-yellow-400'}>
            {m ? `${m.celestialCalculationTime.toFixed(1)}ms` : '--'}
          </span>
        </div>

        {/* 星历解析 */}
        <div className="flex justify-between">
          <span>星历解析</span>
          <span className="text-yellow-400">
            {m ? `${m.ephemerisParseTime.toFixed(1)}ms` : '--'}
          </span>
        </div>

        {/* MOD 加载 */}
        <div className="flex justify-between">
          <span>MOD 加载</span>
          <span className="text-purple-400">
            {m ? `${m.modLoadTime.toFixed(1)}ms` : '--'}
          </span>
        </div>
      </div>

      {/* Web Vitals */}
      {m?.webVitals && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="pt-1 mb-1" style={{ color: '#888', fontSize: '10px' }}>Web Vitals</div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            <MetricBadge label="FCP" value={m.webVitals.FCP} unit="ms" />
            <MetricBadge label="LCP" value={m.webVitals.LCP} unit="ms" />
            <MetricBadge label="INP" value={m.webVitals.INP} unit="ms" />
            <MetricBadge label="CLS" value={m.webVitals.CLS} unit="" />
            <MetricBadge label="TTFB" value={m.webVitals.TTFB} unit="ms" />
          </div>
        </div>
      )}

      {/* 快捷键提示 */}
      <div
        className="px-3 py-1 text-center"
        style={{ color: '#555', fontSize: '9px', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        Ctrl+Shift+P 切换面板
      </div>
    </div>
  );
}

function MetricBadge({ label, value, unit }: { label: string; value?: number; unit: string }) {
  if (value === undefined) return null;
  return (
    <div className="flex justify-between">
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: getMetricColor(label, value) }}>
        {value.toFixed(label === 'CLS' ? 4 : 0)}{unit}
      </span>
    </div>
  );
}

function getMetricColor(label: string, value: number): string {
  switch (label) {
    case 'FCP': return value < 1800 ? '#00ff88' : value < 3000 ? '#ffff00' : '#ff4444';
    case 'LCP': return value < 2500 ? '#00ff88' : value < 4000 ? '#ffff00' : '#ff4444';
    case 'INP': return value < 200 ? '#00ff88' : value < 500 ? '#ffff00' : '#ff4444';
    case 'CLS': return value < 0.1 ? '#00ff88' : value < 0.25 ? '#ffff00' : '#ff4444';
    case 'TTFB': return value < 800 ? '#00ff88' : value < 1800 ? '#ffff00' : '#ff4444';
    default: return '#888';
  }
}

export default PerformanceDashboard;
