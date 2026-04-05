'use client';

/**
 * @module components/flight-tracking/FlightFilter
 * @description 航班筛选组件
 */

import React, { useState, useCallback } from 'react';
import { useFlightStore } from '@/lib/mods/flight-tracking/store/flightStore';
import { t, type Lang } from './i18n';

interface FlightFilterProps {
  lang?: Lang;
}

export function FlightFilter({ lang = 'zh' }: FlightFilterProps) {
  const { filter, setFilter } = useFlightStore();
  const [open, setOpen] = useState(false);

  const [altMin, setAltMin] = useState('');
  const [altMax, setAltMax] = useState('');

  const applyAltitude = useCallback(() => {
    const min = altMin ? parseInt(altMin) : undefined;
    const max = altMax ? parseInt(altMax) : undefined;
    if (min !== undefined && max !== undefined) {
      setFilter({ altitudeRange: [min, max] });
    } else {
      setFilter({ altitudeRange: undefined });
    }
  }, [altMin, altMax, setFilter]);

  const clearAll = useCallback(() => {
    setFilter({ altitudeRange: undefined, countries: undefined, onGroundOnly: undefined, inAirOnly: undefined });
    setAltMin('');
    setAltMax('');
  }, [setFilter]);

  const hasActiveFilter =
    filter.altitudeRange || filter.countries?.length || filter.onGroundOnly || filter.inAirOnly;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border
          ${hasActiveFilter
            ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
            : 'bg-white/10 border-white/10 text-white/70 hover:text-white'}`}
      >
        <span>⚙</span>
        <span>{t(lang, 'filter')}</span>
        {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 w-64 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-3 space-y-3">
          {/* 高度范围 */}
          <div>
            <label className="text-xs text-white/50 block mb-1">{t(lang, 'altitudeRange')}</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={altMin}
                onChange={e => setAltMin(e.target.value)}
                placeholder="0"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white/30"
              />
              <span className="text-white/30 text-xs">—</span>
              <input
                type="number"
                value={altMax}
                onChange={e => setAltMax(e.target.value)}
                placeholder="15000"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              onClick={applyAltitude}
              className="mt-1 w-full text-xs bg-white/10 hover:bg-white/20 rounded py-1 text-white/70 hover:text-white transition-colors"
            >
              应用
            </button>
          </div>

          {/* 飞行状态 */}
          <div>
            <label className="text-xs text-white/50 block mb-1">状态</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ inAirOnly: !filter.inAirOnly, onGroundOnly: false })}
                className={`flex-1 text-xs py-1 rounded transition-colors border
                  ${filter.inAirOnly ? 'bg-green-700/50 border-green-500/50 text-green-300' : 'bg-white/10 border-white/10 text-white/60 hover:text-white'}`}
              >
                ✈ {t(lang, 'inAir')}
              </button>
              <button
                onClick={() => setFilter({ onGroundOnly: !filter.onGroundOnly, inAirOnly: false })}
                className={`flex-1 text-xs py-1 rounded transition-colors border
                  ${filter.onGroundOnly ? 'bg-gray-600/50 border-gray-500/50 text-gray-300' : 'bg-white/10 border-white/10 text-white/60 hover:text-white'}`}
              >
                🛬 {t(lang, 'onGround')}
              </button>
            </div>
          </div>

          {/* 清除 */}
          {hasActiveFilter && (
            <button
              onClick={clearAll}
              className="w-full text-xs text-red-400 hover:text-red-300 transition-colors py-1"
            >
              {t(lang, 'clearFilter')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
