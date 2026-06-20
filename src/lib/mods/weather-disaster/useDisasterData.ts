/**
 * 气象灾害监测 - 数据获取 Hook（通过 Next.js API 路由代理）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ensureError } from '@/lib/utils/errors';
import type { DisasterPoint } from './DisasterRenderer';

export type DataSourceId =
  | 'usgs_earthquake'
  | 'emsc_earthquake'
  | 'gdacs'
  | 'nasa_firms'
  | 'noaa_weather'
  | 'noaa_tsunami'
  | 'reliefweb';

export interface SourceState {
  id: DataSourceId;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  count: number;
}

const UPDATE_INTERVALS: Record<DataSourceId, number> = {
  usgs_earthquake: 60_000,
  emsc_earthquake: 120_000,
  gdacs:           300_000,
  nasa_firms:      600_000,
  noaa_weather:    300_000,
  noaa_tsunami:    3600_000,
  reliefweb:       3600_000,
};

export function useDisasterData(enabledSources: DataSourceId[]) {
  const [states, setStates] = useState<Record<string, SourceState>>({});
  const [allPoints, setAllPoints] = useState<DisasterPoint[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pointsRef = useRef<Record<string, DisasterPoint[]>>({});

  const fetchSource = useCallback(async (id: DataSourceId) => {
    setStates(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { id, count: 0 }), loading: true, error: null },
    }));

    try {
      const res = await fetch(`/api/disasters?source=${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const events: DisasterPoint[] = (json.events || []).filter(
        (e: any) => e.lat != null && e.lon != null && !isNaN(e.lat) && !isNaN(e.lon)
      );

      pointsRef.current[id] = events;
      // Rebuild allPoints from all active sources
      const merged = Object.values(pointsRef.current).flat();
      setAllPoints(merged);

      setStates(prev => ({
        ...prev,
        [id]: { id, loading: false, error: null, lastUpdated: Date.now(), count: events.length },
      }));
    } catch (err: unknown) {
      const msg = ensureError(err).message;
      setStates(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { id, count: 0 }), loading: false, error: msg || '获取失败' },
      }));
    }
  }, []);

  useEffect(() => {
    const currentIds = new Set(enabledSources);

    // Remove disabled sources
    Object.keys(timersRef.current).forEach(id => {
      if (!currentIds.has(id as DataSourceId)) {
        clearInterval(timersRef.current[id]);
        delete timersRef.current[id];
        delete pointsRef.current[id];
        setStates(prev => { const n = { ...prev }; delete n[id]; return n; });
      }
    });
    // Rebuild after removal
    const merged = Object.values(pointsRef.current).flat();
    setAllPoints(merged);

    // Add new sources
    enabledSources.forEach(id => {
      if (!timersRef.current[id]) {
        fetchSource(id);
        const interval = UPDATE_INTERVALS[id] || 300_000;
        timersRef.current[id] = setInterval(() => fetchSource(id), interval);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledSources.join(',')]);

  useEffect(() => {
    return () => { Object.values(timersRef.current).forEach(clearInterval); };
  }, []);

  const totalLoading = Object.values(states).some(s => s.loading);
  const totalCount = allPoints.length;

  return { states, allPoints, totalLoading, totalCount, refetch: fetchSource };
}
