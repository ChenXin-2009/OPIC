'use client';

/**
 * @module components/flight-tracking/FlightTrackingPanel
 * @description 航班追踪主面板（整合搜索、列表、筛选）
 */

import React, { useState } from 'react';
import { useFlightStore } from '@/lib/mods/flight-tracking/store/flightStore';
import { FlightSearch } from './FlightSearch';
import { FlightFilter } from './FlightFilter';
import { FlightList } from './FlightList';
import { FlightPanel } from './FlightPanel';
import { FlightConfigPanel } from './FlightConfigPanel';
import { t, type Lang } from './i18n';

interface FlightTrackingPanelProps {
  lang?: Lang;
}

export function FlightTrackingPanel({ lang = 'zh' }: FlightTrackingPanelProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { selectedIcao24, selectFlight, fetchStatus } = useFlightStore();

  return (
    <>
      {/* 主面板 */}
      <div className="absolute top-4 right-4 z-40 w-80 flex flex-col gap-2">
        {/* 标题栏 */}
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2">
          <span className="text-white text-base">✈</span>
          <span className="text-white font-semibold text-sm flex-1">{t(lang, 'title')}</span>

          {fetchStatus.loading && (
            <span className="text-yellow-400 text-xs animate-pulse">●</span>
          )}
          {fetchStatus.lastUpdate && !fetchStatus.loading && (
            <span className="text-green-400 text-xs">●</span>
          )}
          {fetchStatus.error && (
            <span className="text-red-400 text-xs">●</span>
          )}

          <button
            onClick={() => setShowConfig(v => !v)}
            className="text-white/40 hover:text-white transition-colors text-sm"
            title={t(lang, 'settings')}
          >
            ⚙
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-white/40 hover:text-white transition-colors text-sm"
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>

        {/* 配置面板 */}
        {showConfig && (
          <FlightConfigPanel lang={lang} onClose={() => setShowConfig(false)} />
        )}

        {/* 搜索和筛选 */}
        {!collapsed && (
          <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="flex gap-2 p-2 border-b border-white/10">
              <div className="flex-1">
                <FlightSearch lang={lang} />
              </div>
              <FlightFilter lang={lang} />
            </div>

            {/* 航班列表 */}
            <FlightList lang={lang} maxHeight={320} />
          </div>
        )}
      </div>

      {/* 选中航班信息面板 */}
      {selectedIcao24 && (
        <FlightPanel
          lang={lang}
          onClose={() => selectFlight(null)}
        />
      )}
    </>
  );
}
