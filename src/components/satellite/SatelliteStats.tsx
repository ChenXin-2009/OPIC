/**
 * SatelliteStats - 卫星统计信息组件（明日方舟风格）
 * 
 * 显示卫星数量统计和性能指标
 */

'use client';

import { useState, useEffect } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { SatelliteCategory } from '@/lib/types/satellite';

// 明日方舟风格配置
const ARKNIGHTS_CONFIG = {
  colors: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    accent: '#f0f0f0',
    dark: '#0a0a0a',
    darkLight: '#1a1a1a',
    border: '#333333',
    text: '#ffffff',
    textDim: '#999999',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#ef4444',
  },
};

interface SatelliteStatsProps {
  lang?: 'zh' | 'en';
}

export function SatelliteStats({ lang = 'zh' }: SatelliteStatsProps) {
  const { tleData, visibleSatellites, selectedCategories } = useSatelliteStore();
  
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);

  // 性能监控
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measurePerformance = () => {
      const currentTime = performance.now();
      frameCount++;

      // 每秒更新一次FPS
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      // 测量渲染时间（简化版）
      const renderStart = performance.now();
      // 这里实际应该测量Three.js渲染时间，暂时使用简化版
      const renderEnd = performance.now();
      setRenderTime(renderEnd - renderStart);

      animationId = requestAnimationFrame(measurePerformance);
    };

    animationId = requestAnimationFrame(measurePerformance);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // 按类别统计
  const categoryStats = new Map<SatelliteCategory, number>();
  tleData.forEach((tle) => {
    if (visibleSatellites.has(tle.noradId)) {
      const count = categoryStats.get(tle.category) || 0;
      categoryStats.set(tle.category, count + 1);
    }
  });

  // 类别标签
  const getCategoryLabel = (category: SatelliteCategory): string => {
    const labels: Record<SatelliteCategory, { zh: string; en: string }> = {
      [SatelliteCategory.ACTIVE]: { zh: '活跃', en: 'Active' },
      [SatelliteCategory.ISS]: { zh: '空间站', en: 'ISS' },
      [SatelliteCategory.GPS]: { zh: 'GPS', en: 'GPS' },
      [SatelliteCategory.COMMUNICATION]: { zh: '通信', en: 'Comm' },
      [SatelliteCategory.WEATHER]: { zh: '气象', en: 'Weather' },
      [SatelliteCategory.SCIENCE]: { zh: '科学', en: 'Science' },
      [SatelliteCategory.OTHER]: { zh: '其他', en: 'Other' },
    };
    return labels[category]?.[lang] || category;
  };

  // FPS颜色
  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return ARKNIGHTS_CONFIG.colors.success;
    if (fps >= 30) return ARKNIGHTS_CONFIG.colors.warning;
    return ARKNIGHTS_CONFIG.colors.error;
  };

  return (
    <div
      className="fixed z-40"
      style={{
        bottom: '2rem',
        left: '1rem',
        width: '16rem',
        background: ARKNIGHTS_CONFIG.colors.dark,
        border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
        clipPath:
          'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      {/* 左上角装饰 */}
      <div
        className="absolute"
        style={{
          top: '-1px',
          left: '-1px',
          width: '12px',
          height: '12px',
          background: ARKNIGHTS_CONFIG.colors.primary,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />

      {/* 右下角装饰 */}
      <div
        className="absolute"
        style={{
          bottom: '-1px',
          right: '-1px',
          width: '12px',
          height: '12px',
          background: ARKNIGHTS_CONFIG.colors.primary,
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        }}
      />

      <div className="p-3">
        {/* 标题 */}
        <div
          className="flex items-center gap-2 pb-2 mb-3"
          style={{
            borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          }}
        >
          <div
            style={{
              width: '4px',
              height: '16px',
              background: ARKNIGHTS_CONFIG.colors.primary,
            }}
          />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: ARKNIGHTS_CONFIG.colors.text }}
          >
            {lang === 'zh' ? '统计信息' : 'STATISTICS'}
          </span>
        </div>

        {/* 总数 */}
        <div
          className="mb-3 p-2"
          style={{
            background: ARKNIGHTS_CONFIG.colors.darkLight,
            border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          }}
        >
          <div className="flex justify-between items-center">
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
            >
              {lang === 'zh' ? '可见卫星' : 'VISIBLE'}
            </span>
            <span
              className="text-lg font-bold font-mono"
              style={{ color: ARKNIGHTS_CONFIG.colors.primary }}
            >
              {visibleSatellites.size}
            </span>
          </div>
        </div>

        {/* 按类别统计 */}
        {categoryStats.size > 0 && (
          <div className="mb-3">
            <h4
              className="text-xs uppercase tracking-wide mb-2"
              style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
            >
              {lang === 'zh' ? '类别分布' : 'BY CATEGORY'}
            </h4>
            <div className="space-y-1">
              {Array.from(categoryStats.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <div
                    key={category}
                    className="flex justify-between items-center text-xs"
                  >
                    <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                      {getCategoryLabel(category)}
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 性能指标 */}
        <div>
          <h4
            className="text-xs uppercase tracking-wide mb-2"
            style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
          >
            {lang === 'zh' ? '性能' : 'PERFORMANCE'}
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                FPS
              </span>
              <span
                className="font-mono font-bold"
                style={{ color: getFpsColor(fps) }}
              >
                {fps}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                {lang === 'zh' ? '渲染时间' : 'RENDER TIME'}
              </span>
              <span
                className="font-mono"
                style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
              >
                {renderTime.toFixed(2)} ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
