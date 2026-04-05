'use client';

/**
 * @module components/flight-tracking/FlightList
 * @description 航班列表组件
 */

import React, { useCallback } from 'react';
import { useFlightStore } from '@/lib/mods/flight-tracking/store/flightStore';
import { msToKmh, metersToFeet } from '@/lib/mods/flight-tracking/utils/dataParser';
import { t, type Lang } from './i18n';
import type { FlightSort } from '@/lib/mods/flight-tracking/types';

interface FlightListProps {
  lang?: Lang;
  maxHeight?: number;
}

export function FlightList({ lang = 'zh', maxHeight = 400 }: FlightListProps) {
  const { flights, filteredIds, selectedIcao24, stats, fetchStatus, sort, selectFlight, setSort } = useFlightStore();

  const handleSort = useCallback((field: FlightSort['field']) => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  }, [sort, setSort]);

  const sortIcon = (field: FlightSort['field']) => {
    if (sort.field !== field) return '↕';
    return sort.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="flex flex-col text-white text-sm">
      {/* 统计栏 */}
      <div className="flex gap-3 px-3 py-2 bg-white/5 text-xs text-white/60 border-b border-white/10">
        <span>{t(lang, 'total')}: <b className="text-white">{stats.total}</b></span>
        <span>{t(lang, 'inAirCount')}: <b className="text-green-400">{stats.inAir}</b></span>
        <span>{t(lang, 'onGroundCount')}: <b className="text-gray-400">{stats.onGround}</b></span>
        {fetchStatus.loading && <span className="text-yellow-400 ml-auto">{t(lang, 'loading')}</span>}
      </div>

      {/* 表头 */}
      <div className="grid grid-cols-4 gap-1 px-3 py-1.5 text-xs text-white/40 border-b border-white/10">
        <button onClick={() => handleSort('callsign')} className="text-left hover:text-white/70 transition-colors">
          {t(lang, 'callsign')} {sortIcon('callsign')}
        </button>
        <button onClick={() => handleSort('altitude')} className="text-right hover:text-white/70 transition-colors">
          {t(lang, 'altitude_sort')} {sortIcon('altitude')}
        </button>
        <button onClick={() => handleSort('velocity')} className="text-right hover:text-white/70 transition-colors">
          {t(lang, 'speed_sort')} {sortIcon('velocity')}
        </button>
        <span className="text-right">{t(lang, 'country')}</span>
      </div>

      {/* 列表 */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {filteredIds.length === 0 ? (
          <div className="text-center text-white/30 py-6">{t(lang, 'noResults')}</div>
        ) : (
          filteredIds.map(id => {
            const f = flights.get(id);
            if (!f) return null;
            const isSelected = id === selectedIcao24;

            return (
              <button
                key={id}
                onClick={() => selectFlight(isSelected ? null : id)}
                className={`w-full grid grid-cols-4 gap-1 px-3 py-1.5 text-xs text-left transition-colors border-b border-white/5
                  ${isSelected ? 'bg-blue-600/30 text-white' : 'hover:bg-white/5 text-white/70'}`}
              >
                <span className="truncate font-mono">
                  {f.callsign ?? f.icao24.toUpperCase()}
                </span>
                <span className="text-right font-mono">
                  {f.position ? `${metersToFeet(f.position.altitude).toLocaleString()}ft` : '-'}
                </span>
                <span className="text-right font-mono">
                  {f.velocity ? `${msToKmh(f.velocity)}` : '-'}
                </span>
                <span className="text-right truncate text-white/40">
                  {f.originCountry.slice(0, 3).toUpperCase()}
                </span>
              </button>
            );
          })
        )}
      </div>

      {fetchStatus.error && (
        <div className="px-3 py-2 text-xs text-red-400 border-t border-white/10">
          {t(lang, 'error')}: {fetchStatus.error}
        </div>
      )}
    </div>
  );
}
