/**
 * 轨道计算模块公共 API (Orbit Module Public API)
 *
 * 汇总导出轨道力学、天体数据和位置计算的公共接口。
 * 使用方通过此文件统一导入，无需关注内部子模块结构。
 */

export type { OrbitalElements, CelestialBody, PositionCache } from './orbit/types';

export { ORBITAL_ELEMENTS, SATELLITE_DEFINITIONS, CACHE_TOLERANCE, CACHE_MAX_AGE, ACCURACY_INFO } from './orbit/data';

export { calculatePosition, computeElementsAtTime, getParentAxisQuaternion, calculateSatellitePosition } from './orbit/mechanics';

export { OrbitSystemPositionProvider, getAllBodiesCalculator, initializeAllBodiesCalculator, shouldUseEphemeris, getSatelliteKey, getSatelliteId } from './orbit/ephemeris-integration';

export { getCelestialBodies, calculateBodiesNow, calculateBodiesInBackground, calculatePlanetPositions, calculateSatellitePositions } from './orbit/orchestrator';
