'use client';

/**
 * MOD性能监控面板组件
 * 
 * 显示各MOD的性能指标和警告。
 */

import React, { useEffect, useState } from 'react';
import { getPerformanceMonitor } from '@/lib/mod-manager/performance';
import { useModStore } from '@/lib/mod-manager/store';

export interface ModPerformancePanelProps {
  /** 刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 语言 */
  lang?: 'zh' | 'en';
  /** 类名 */
  className?: string;
}

/**
 * 性能摘要类型
 */
interface PerformanceSummary {
  initCount: number;
  renderCount: number;
  avgInitTime: number;
  avgRenderTime: number;
  warningCount: number;
}

/**
 * 获取翻译
 */
function getT(lang: 'zh' | 'en') {
  return {
    title: lang === 'zh' ? '性能监控' : 'Performance Monitor',
    noData: lang === 'zh' ? '暂无MOD性能数据' : 'No performance data',
    init: lang === 'zh' ? '初始化' : 'Init',
    render: lang === 'zh' ? '渲染' : 'Render',
    warnings: lang === 'zh' ? '个警告' : 'warnings',
    times: lang === 'zh' ? '次' : 'times',
  };
}

/**
 * MOD性能监控面板组件
 */
export const ModPerformancePanel: React.FC<ModPerformancePanelProps> = ({
  refreshInterval = 5000,
  lang = 'zh',
  className = '',
}) => {
  const t = getT(lang);
  const mods = useModStore((state) => state.mods);
  const [summaries, setSummaries] = useState<Record<string, PerformanceSummary>>({});

  useEffect(() => {
    const monitor = getPerformanceMonitor();

    const updateSummaries = () => {
      const newSummaries: Record<string, PerformanceSummary> = {};
      Object.keys(mods).forEach((modId) => {
        newSummaries[modId] = monitor.getSummary(modId);
      });
      setSummaries(newSummaries);
    };

    updateSummaries();

    const interval = setInterval(updateSummaries, refreshInterval);
    return () => clearInterval(interval);
  }, [mods, refreshInterval]);

  const formatTime = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(1)}µs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={`mod-performance-panel ${className} p-6`}>
      <h3 className="text-lg font-semibold mb-4 text-white">{t.title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(mods).map(([modId, entry]) => {
          const summary = summaries[modId];
          if (!summary) return null;

          return (
            <div
              key={modId}
              className="border border-[#333] rounded-lg p-4 bg-[#0a0a0a]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-white">{entry.manifest.name}</span>
                {summary.warningCount > 0 && (
                  <span className="text-red-400 text-sm">
                    ⚠ {summary.warningCount} {t.warnings}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-400">
                  <span className="text-gray-500">{t.init}:</span>{' '}
                  <span className="text-white">{formatTime(summary.avgInitTime)}</span>
                  {summary.initCount > 0 && (
                    <span className="text-gray-500"> ({summary.initCount}{t.times})</span>
                  )}
                </div>
                <div className="text-gray-400">
                  <span className="text-gray-500">{t.render}:</span>{' '}
                  <span className="text-white">{formatTime(summary.avgRenderTime)}</span>
                  {summary.renderCount > 0 && (
                    <span className="text-gray-500"> ({summary.renderCount}{t.times})</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {Object.keys(mods).length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            {t.noData}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModPerformancePanel;