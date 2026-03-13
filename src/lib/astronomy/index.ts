/**
 * @module astronomy/index
 * @description 天文计算模块的公共 API 入口
 * 
 * 本模块导出天文计算的公共接口，包括轨道力学、时间转换和坐标变换功能。
 * 提供行星位置计算、卫星轨道计算、儒略日转换等核心天文计算能力。
 * 
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层（公共 API 层）
 * - 职责边界：负责导出天文计算模块的公共接口，不包含具体实现逻辑
 * 
 * @dependencies
 * - 直接依赖：astronomy/orbit, astronomy/time, astronomy/names, astronomy/utils
 * - 被依赖：3d/celestial-objects, components/solar-system, app/page
 * - 循环依赖：无
 * 
 * @example
 * ```typescript
 * import { calculatePosition, dateToJulianDay, ORBITAL_ELEMENTS } from '@/lib/astronomy';
 * 
 * // 计算当前时刻地球的位置
 * const jd = dateToJulianDay(new Date());
 * const earthPos = calculatePosition(ORBITAL_ELEMENTS.earth, jd);
 * console.log(`地球位置: x=${earthPos.x} AU, y=${earthPos.y} AU, z=${earthPos.z} AU`);
 * ```
 */

// Orbital calculations
export type {
  OrbitalElements,
  CelestialBody
} from './orbit';

export {
  ORBITAL_ELEMENTS,
  SATELLITE_DEFINITIONS,
  calculatePosition,
  getCelestialBodies,
  initializeSatelliteCalculator,
  initializeAllBodiesCalculator
} from './orbit';

// Time conversions
export {
  J2000,
  dateToJulianDay,
  julianDayToDate,
  julianCenturies,
  nowJulianDay,
  formatJulianDay
} from './time';

// Celestial body names
export {
  planetNames
} from './names';

// Utility functions
export * from './utils';
