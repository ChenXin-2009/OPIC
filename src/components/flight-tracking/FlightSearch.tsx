'use client';

/**
 * @module components/flight-tracking/FlightSearch
 * @description 航班搜索组件
 */

import React, { useCallback, useRef } from 'react';
import { useFlightStore } from '@/lib/mods/flight-tracking/store/flightStore';
import { t, type Lang } from './i18n';

interface FlightSearchProps {
  lang?: Lang;
}

export function FlightSearch({ lang = 'zh' }: FlightSearchProps) {
  const { filter, setFilter } = useFlightStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilter({ callsign: e.target.value || undefined });
    },
    [setFilter]
  );

  const handleClear = useCallback(() => {
    setFilter({ callsign: undefined });
    if (inputRef.current) inputRef.current.value = '';
  }, [setFilter]);

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-white/30 text-sm pointer-events-none">🔍</span>
      <input
        ref={inputRef}
        type="text"
        defaultValue={filter.callsign ?? ''}
        onChange={handleChange}
        placeholder={t(lang, 'search')}
        className="w-full bg-white/10 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
      />
      {filter.callsign && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-white/30 hover:text-white transition-colors text-base leading-none"
          aria-label={t(lang, 'clearFilter')}
        >
          ×
        </button>
      )}
    </div>
  );
}
