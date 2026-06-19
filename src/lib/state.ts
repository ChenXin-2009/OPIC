import { create } from 'zustand';
import type { SolarSystemState } from './state-types';
import { createTimeSlice } from './timeSlice';
import { createViewSlice } from './viewSlice';
import { logger } from '@/utils/logger';
import { getCelestialBodies } from './astronomy/orbit';
import { dateToJulianDay } from './astronomy/time';

// Re-export types for backward compatibility
export type { ViewOffset, Language, SolarSystemState, CelestialBody } from './state-types';

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
