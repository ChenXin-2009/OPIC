/**
 * 气象灾害监测 - 数据获取 Hook（通过 Next.js API 路由代理）
 *
 * 提供对 USGS、GDACS、NASA FIRMS、NOAA 等多源灾害数据的统一获取、
 * 自动轮询和状态管理。内部使用 useRef 维护定时器和数据缓存，
 * 避免不必要的重渲染。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ensureError } from '@/lib/utils/errors';
import type { DisasterPoint } from './DisasterRenderer';

/**
 * 气象灾害数据源标识
 *
 * 支持的数据源类型：
 * - usgs_earthquake: 美国地质调查局地震数据
 * - emsc_earthquake: 欧洲地中海地震中心数据
 * - gdacs: 全球灾害预警与协调系统
 * - nasa_firms: NASA 火灾信息与资源管理系统
 * - noaa_weather: 美国国家海洋和大气管理局气象数据
 * - noaa_tsunami: NOAA 海啸预警数据
 * - reliefweb: ReliefWeb 人道主义灾害报告
 */
export type DataSourceId =
  | 'usgs_earthquake'
  | 'emsc_earthquake'
  | 'gdacs'
  | 'nasa_firms'
  | 'noaa_weather'
  | 'noaa_tsunami'
  | 'reliefweb';

/**
 * 数据源运行时状态
 *
 * 跟踪单个灾害数据源的加载、错误和最近一次获取结果。
 */
export interface SourceState {
  /** 数据源 ID */
  id: DataSourceId;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息（无错误时为 null） */
  error: string | null;
  /** 最后成功更新时间戳（毫秒，未更新时为 null） */
  lastUpdated: number | null;
  /** 当前灾害事件数量 */
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

/**
 * 灾害数据获取 Hook
 *
 * 根据启用的数据源列表自动发起 fetch 请求，按各数据源的预定义间隔轮询，
 * 并合并所有来源的灾害事件点。支持动态增删数据源。
 *
 * @param enabledSources - 启用的数据源 ID 数组，变化时会自动重启对应定时器
 * @returns 包含以下属性的对象：
 *   - `states` - 各数据源的运行时状态映射
 *   - `allPoints` - 合并后的所有灾害事件点数组
 *   - `totalLoading` - 是否有任一数据源正在加载
 *   - `totalCount` - 灾害事件总数
 *   - `refetch` - 手动触发指定数据源重新获取
 */
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
