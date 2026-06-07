/**
 * @module astronomy/orbit-coordinator
 * @description Bridge module that integrates pure orbit calculations with Zustand store
 *
 * This module re-exports all pure exports from ./orbit and provides store-integrated
 * versions of functions that previously depended on useEphemerisStore directly.
 *
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层（桥接层）
 * - 职责边界：隔离 Zustand store 依赖，保持 orbit.ts 为纯计算模块
 */

export type { OrbitalElements, CelestialBody } from './orbit';

export {
  ORBITAL_ELEMENTS,
  SATELLITE_DEFINITIONS,
  calculatePosition,
  getAllBodiesCalculator,
} from './orbit';

import {
  initializeAllBodiesCalculator as pureInitializeAllBodiesCalculator,
  getCelestialBodies as pureGetCelestialBodies,
} from './orbit';
import type { CelestialBody } from './orbit';
import { useEphemerisStore, LoadingStatus } from '@/lib/store/useEphemerisStore';

export async function initializeAllBodiesCalculator(): Promise<void> {
  const store = useEphemerisStore.getState();
  return pureInitializeAllBodiesCalculator({
    setBodyStatus: (bodyKey, status, error) => {
      store.setBodyStatus(bodyKey as any, status as LoadingStatus, error);
    },
    setBodyTimeRange: (bodyKey, start, end) => {
      store.setBodyTimeRange(bodyKey as any, start, end);
    },
    setBodyAccuracy: (bodyKey, ephemeris, analytical) => {
      store.setBodyAccuracy(bodyKey as any, ephemeris, analytical);
    },
  });
}

export async function getCelestialBodies(julianDay: number): Promise<CelestialBody[]> {
  const store = useEphemerisStore.getState();
  return pureGetCelestialBodies(julianDay, (bodyKey, status, error) => {
    store.setBodyStatus(bodyKey as any, status as LoadingStatus, error);
  });
}
