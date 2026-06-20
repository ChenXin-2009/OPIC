/**
 * 全球货运与贸易路线 - 数据获取 Hook
 * - 通过 /api/traffic 服务端代理，避免 CORS
 * - 指数退避：失败后 30s → 60s → 120s → 最多 300s，不再无限重试
 * - 成功后按正常间隔刷新
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ensureError } from '@/lib/utils/errors';
import type { DataSourceId, DataSourceState, VesselPosition, FlightPosition } from './types';

// 静态数据源（无需 API 请求，直接标记已加载）
const STATIC_SOURCES = new Set<DataSourceId>([
  'natural_earth_routes',
  'cargo_tracker_demo',
  'ourairports',
  'marinetraffic_free',
  'vesselfinder_free',
  'aisstream',
  'ihs_sea_routes',
]);

// 正常刷新间隔（毫秒）
const REFRESH_MS: Partial<Record<DataSourceId, number>> = {
  opensky:            30_000,
  adsbexchange:       30_000,
  flightradar24_free: 30_000,
  worldports:         600_000,
};

// 退避序列（毫秒）
const BACKOFF = [30_000, 60_000, 120_000, 300_000];

async function fetchFromProxy(source: DataSourceId): Promise<{ flights?: FlightPosition[]; vessels?: VesselPosition[] }> {
  const res = await fetch(`/api/traffic?source=${source}`);
  const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

  const items: any[] = json.data || [];
  if (source === 'opensky' || source === 'adsbexchange' || source === 'flightradar24_free') {
    return { flights: items as FlightPosition[] };
  }
  if (source === 'worldports') {
    return { vessels: items as VesselPosition[] };
  }
  return {};
}

export function useTrafficData(enabledSources: DataSourceId[]) {
  const [states,  setStates]  = useState<Record<string, DataSourceState>>({});
  const [vessels, setVessels] = useState<VesselPosition[]>([]);
  const [flights, setFlights] = useState<FlightPosition[]>([]);

  // timers: source → current setTimeout handle
  const timers      = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // failCount: source → consecutive failure count (for backoff)
  const failCount   = useRef<Record<string, number>>({});
  const mounted     = useRef(true);
  const activeIds   = useRef<Set<DataSourceId>>(new Set());

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const scheduleNext = useCallback((id: DataSourceId, failed: boolean) => {
    if (!mounted.current || !activeIds.current.has(id)) return;
    clearTimeout(timers.current[id]);

    let delay: number;
    if (failed) {
      const n = failCount.current[id] ?? 0;
      delay = BACKOFF[Math.min(n, BACKOFF.length - 1)];
    } else {
      failCount.current[id] = 0;
      delay = REFRESH_MS[id] ?? 60_000;
    }

    timers.current[id] = setTimeout(() => doFetch(id), delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doFetch = useCallback(async (id: DataSourceId) => {
    if (!mounted.current || !activeIds.current.has(id)) return;
    if (STATIC_SOURCES.has(id)) {
      setStates(prev => ({ ...prev, [id]: { id, enabled: true, loading: false, error: null, lastUpdated: Date.now(), count: 0 } }));
      return;
    }

    setStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? { id, enabled: true, count: 0 }), loading: true, error: null } }));

    try {
      const result = await fetchFromProxy(id);
      if (!mounted.current) return;

      const count = (result.flights?.length ?? 0) + (result.vessels?.length ?? 0);
      if (result.flights?.length) setFlights(prev => [...prev.filter(f => f.sourceId !== id), ...result.flights!]);
      if (result.vessels?.length) setVessels(prev => [...prev.filter(v => v.sourceId !== id), ...result.vessels!]);

      setStates(prev => ({ ...prev, [id]: { id, enabled: true, loading: false, error: null, lastUpdated: Date.now(), count } }));
      scheduleNext(id, false);
    } catch (err: unknown) {
      if (!mounted.current) return;
      const errMsg = ensureError(err).message;
      failCount.current[id] = (failCount.current[id] ?? 0) + 1;
      const n = failCount.current[id];
      const nextDelay = BACKOFF[Math.min(n - 1, BACKOFF.length - 1)];
      const nextIn = Math.round(nextDelay / 1000);
      setStates(prev => ({
        ...prev,
        [id]: { ...(prev[id] ?? { id, enabled: true, count: 0 }), loading: false,
          error: `${errMsg}（${nextIn}s 后重试）` },
      }));
      scheduleNext(id, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleNext]);

  // 手动刷新（重置退避）
  const refetch = useCallback((id: DataSourceId) => {
    failCount.current[id] = 0;
    clearTimeout(timers.current[id]);
    doFetch(id);
  }, [doFetch]);

  useEffect(() => {
    const next = new Set(enabledSources);

    // 停止已移除的数据源
    activeIds.current.forEach(id => {
      if (!next.has(id)) {
        activeIds.current.delete(id);
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        delete failCount.current[id];
        setFlights(prev => prev.filter(f => f.sourceId !== id));
        setVessels(prev => prev.filter(v => v.sourceId !== id));
        setStates(prev => { const n = { ...prev }; delete n[id]; return n; });
      }
    });

    // 启动新数据源
    next.forEach(id => {
      if (!activeIds.current.has(id)) {
        activeIds.current.add(id);
        failCount.current[id] = 0;
        doFetch(id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledSources.join(',')]);

  useEffect(() => {
    return () => { Object.values(timers.current).forEach(clearTimeout); };
  }, []);

  const totalLoading = Object.values(states).some(s => s.loading);
  return { states, vessels, flights, totalLoading, refetch };
}
