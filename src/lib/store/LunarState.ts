/**
 * 月球状态管理 (Lunar State Store)
 *
 * 基于 Zustand 管理月球天文计算状态。
 * 所有状态值均为纯数值，可被 AI 通过断言验证。
 *
 * 状态职责：
 * - 月球当前相位和光照状态
 * - 天平动角度
 * - 地月距离
 * - 日下点 / 面心点
 * - 远/近地点信息
 */

import { create } from 'zustand';
import { getMoonPhase, getLunarLibration, getEarthMoonDistance, getLunarIllumination, getSubSolarPoint, getSubEarthPoint, type MoonPhaseResult, type LunarLibrationResult, type LunarIlluminationResult } from '@/lib/astronomy/lunar';

/** 月球状态数据（可序列化） */
export interface LunarStateData {
  /** 月相 */
  phase: MoonPhaseResult;
  /** 天平动 */
  libration: LunarLibrationResult;
  /** 地月距离 (km) */
  distanceKm: number;
  /** 详细光照 */
  illumination: LunarIlluminationResult;
  /** 日下点 */
  subSolar: { lon: number; lat: number };
  /** 面心点 */
  subEarth: { lon: number; lat: number };
  /** 数据时间戳 (UTC epoch ms) */
  timestamp: number;
}

interface LunarStore {
  /** 当前月球状态 */
  data: LunarStateData | null;
  /** 是否需要更新（默认每 60 秒更新一次） */
  staleAt: number;
  /** 更新间隔 (ms)，默认 60000 */
  updateInterval: number;

  /** 更新时间到指定 Date */
  update: (date?: Date) => void;
  /** 检查是否需要更新 */
  isStale: () => boolean;
  /** 设置更新间隔 */
  setUpdateInterval: (ms: number) => void;
}

/** 月球全局状态 Store */
export const useLunarStore = create<LunarStore>((set, get) => ({
  data: null,
  staleAt: 0,
  updateInterval: 60000,

  update: (date?: Date) => {
    const now = date ?? new Date();
    set({
      data: {
        phase: getMoonPhase(now),
        libration: getLunarLibration(now),
        distanceKm: getEarthMoonDistance(now),
        illumination: getLunarIllumination(now),
        subSolar: getSubSolarPoint(now),
        subEarth: getSubEarthPoint(now),
        timestamp: now.getTime(),
      },
      staleAt: now.getTime() + get().updateInterval,
    });
  },

  isStale: () => {
    return Date.now() > get().staleAt;
  },

  setUpdateInterval: (ms: number) => {
    set({ updateInterval: ms });
  },
}));

/**
 * 获取首次计算好的月球状态。
 * 若尚未初始化则自动触发一次更新。
 */
export function ensureLunarState(): LunarStateData {
  const store = useLunarStore.getState();
  if (!store.data || store.isStale()) {
    store.update();
  }
  return useLunarStore.getState().data!;
}

// 注入全局调试接口：AI 可通过 window.__opic_lunar_debug() 直接获取月球状态
// 输出纯 JSON 数值，无需视觉验证
if (typeof window !== 'undefined') {
  (window as any).__opic_lunar_debug = (): LunarStateData | null => {
    const data = useLunarStore.getState().data;
    if (!data) {
      console.warn('[OPIC Lunar] Not initialized yet. Call ensureLunarState() first.');
      return null;
    }
    console.log('[OPIC Lunar Debug]', JSON.stringify({
      phase: { angle: data.phase.angle.toFixed(2), illumination: data.illumination.phase_fraction.toFixed(4), name: data.phase.phaseName },
      libration: { elon: data.libration.elon.toFixed(4), elat: data.libration.elat.toFixed(4) },
      distance_km: data.distanceKm.toFixed(0),
      subSolar: { lon: data.subSolar.lon.toFixed(4), lat: data.subSolar.lat.toFixed(4) },
      subEarth: { lon: data.subEarth.lon.toFixed(4), lat: data.subEarth.lat.toFixed(4) },
      timestamp: new Date(data.timestamp).toISOString(),
    }, null, 2));
    return data;
  };

  // 快捷断言：验证月球状态数值范围
  (window as any).__opic_lunar_assert = (): string[] => {
    const data = useLunarStore.getState().data;
    if (!data) return ['ERROR: Not initialized'];
    const errors: string[] = [];
    const p = data.phase;
    const l = data.libration;
    const i = data.illumination;
    if (p.angle < 0 || p.angle >= 360) errors.push(`phase.angle out of range: ${p.angle}`);
    if (i.phase_fraction < 0 || i.phase_fraction > 1) errors.push(`phase_fraction out of range: ${i.phase_fraction}`);
    if (l.elon < -10 || l.elon > 10) errors.push(`libration.elon out of range: ${l.elon}`);
    if (l.elat < -7 || l.elat > 7) errors.push(`libration.elat out of range: ${l.elat}`);
    if (data.distanceKm < 356000 || data.distanceKm > 407000) errors.push(`distance_km out of range: ${data.distanceKm}`);
    if (data.subSolar.lat < -90 || data.subSolar.lat > 90) errors.push(`subSolar.lat out of range: ${data.subSolar.lat}`);
    if (errors.length === 0) {
      console.log('[OPIC Lunar Assert] All checks passed ✓');
      return [];
    }
    console.error('[OPIC Lunar Assert] Failures:', errors.join('; '));
    return errors;
  };
}
