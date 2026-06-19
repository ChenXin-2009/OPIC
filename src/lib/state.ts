/**
 * 太阳系全局状态管理 (Solar System Global Store)
 *
 * 基于 Zustand 的全局状态管理入口，组合时间切片和视图切片。
 *
 * 职责：
 * - 汇总所有子切片（TimeSlice + ViewSlice）的状态和操作
 * - 异步加载初始天体位置数据（基于当前时间的星历表）
 * - 通知外部系统天体数据就绪（CustomEvent: ephemeris:bodies:ready）
 */

import { create } from 'zustand';
import type { SolarSystemState } from './state-types';
import { createTimeSlice } from './timeSlice';
import { createViewSlice } from './viewSlice';
import { logger } from '@/utils/logger';
import { getCelestialBodies } from './astronomy/orbit';
import { dateToJulianDay } from './astronomy/time';

// Re-export types for backward compatibility
export type { ViewOffset, Language, SolarSystemState, CelestialBody } from './state-types';

/**
 * 太阳系全局状态 Store — 组合时间、视图、语言和天体数据。
 * 在客户端挂载时自动加载初始天体位置。
 */
export const useSolarSystemStore = create<SolarSystemState>()((...a) => {
  const [set, get] = a;
  const initialTime = new Date();
  const initialJD = dateToJulianDay(initialTime);

  const state = {
    ...createTimeSlice(...a),
    ...createViewSlice(...a),

    // ========== 语言 ==========
    lang: 'zh' as const,
    setLang: (lang: 'en' | 'zh') => set({ lang }),
  };

  // Load initial celestial bodies asynchronously
  if (typeof window !== 'undefined') {
    logger.debug('Initializing celestial bodies...');

    getCelestialBodies(initialJD).then(bodies => {
      logger.debug(`Loaded ${bodies.length} celestial bodies`);
      set({ celestialBodies: bodies });

      window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
        detail: { stage: 'bodies' }
      }));
    }).catch(error => {
      console.error('Failed to load initial celestial bodies:', error);

      window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
        detail: { stage: 'bodies', error: true }
      }));
    });
  }

  return state as SolarSystemState;
});
