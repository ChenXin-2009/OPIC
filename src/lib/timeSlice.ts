/**
 * 时间状态切片 (Time Slice)
 *
 * 管理太阳系模拟的时间状态，包括：
 * - 当前模拟时间
 * - 播放/暂停状态
 * - 时间流速倍率
 * - 播放方向（前进/倒退）
 *
 * 时间推进逻辑：
 * 每帧调用 tick(deltaSeconds) → 计算新时间 → 查询星历表 → 更新天体位置
 */

import { StateCreator } from 'zustand';
import { ensureError } from '@/lib/utils/errors';
import { logger } from '@/utils/logger';
import type { SolarSystemState, CelestialBody } from './state-types';
import { getCelestialBodies } from './astronomy/orbit';
import { dateToJulianDay } from './astronomy/time';

/** 时间状态切片接口 — 管理模拟时间和播放控制 */
export interface TimeSlice {
  currentTime: Date;
  isPlaying: boolean;
  timeSpeed: number;
  playDirection: 'forward' | 'backward';
  setCurrentTime: (date: Date) => void;
  togglePlayPause: () => void;
  setTimeSpeed: (speed: number) => void;
  setPlayDirection: (direction: 'forward' | 'backward') => void;
  startPlaying: (speed: number, direction: 'forward' | 'backward') => void;
  tick: (deltaSeconds: number) => void;
  resetToNow: () => void;
}

export const createTimeSlice: StateCreator<SolarSystemState, [], [], TimeSlice> = (set, get) => {
  const initialTime = new Date();

  return {
    currentTime: initialTime,
    isPlaying: true,
    timeSpeed: 1 / 86400,
    playDirection: 'forward',

    setCurrentTime: (date: Date) => {
      const jd = dateToJulianDay(date);

      getCelestialBodies(jd).then(bodies => {
        set({ currentTime: date, celestialBodies: bodies as CelestialBody[] });
      }).catch(error => {
        const err = ensureError(error);
        logger.error('Failed to get celestial bodies on time set:', err);
        set({ currentTime: date });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
            detail: { stage: 'bodies', error: err.message }
          }));
        }
      });
    },

    togglePlayPause: () => {
      set((state) => ({ isPlaying: !state.isPlaying }));
    },

    setTimeSpeed: (speed: number) => {
      const clampedSpeed = Math.max(0.1, Math.min(365, speed));
      set({ timeSpeed: clampedSpeed });
    },

    setPlayDirection: (direction: 'forward' | 'backward') => {
      set({ playDirection: direction });
    },

    startPlaying: (speed: number, direction: 'forward' | 'backward') => {
      const clampedSpeed = Math.max(1 / 86400, Math.min(1095, speed));
      set({ timeSpeed: clampedSpeed, playDirection: direction, isPlaying: true });
    },

    tick: (deltaSeconds: number) => {
      const state = get();

      if (!state.isPlaying) return;

      const direction = state.playDirection === 'forward' ? 1 : -1;
      const deltaTimeDays = deltaSeconds * state.timeSpeed * direction;
      const deltaTimeMs = deltaTimeDays * 24 * 60 * 60 * 1000;
      const newTime = new Date(state.currentTime.getTime() + deltaTimeMs);
      const jd = dateToJulianDay(newTime);

      set({ currentTime: newTime });

      getCelestialBodies(jd).then(bodies => {
        set({ celestialBodies: bodies as CelestialBody[] });
      }).catch(error => {
        const err = ensureError(error);
        logger.error('Failed to get celestial bodies on tick:', err);
      });
    },

    resetToNow: () => {
      const now = new Date();
      get().setCurrentTime(now);
      set({ isPlaying: false });
    },
  };
};
