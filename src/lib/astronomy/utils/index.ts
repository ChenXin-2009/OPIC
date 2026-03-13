/**
 * @module astronomy/utils/index
 * @description 天文计算工具函数集合
 * 
 * 本模块导出所有天文计算相关的工具函数和常量，包括开普勒方程求解器、
 * 坐标变换函数和天文常数。
 * 
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层（工具层）
 * - 职责边界：提供底层数学和物理计算工具，不包含业务逻辑或状态管理
 * 
 * @dependencies
 * - 直接依赖：astronomy/utils/kepler, astronomy/utils/coordinates, astronomy/utils/constants, utils/math
 * - 被依赖：astronomy/orbit, astronomy/time
 * - 循环依赖：无
 * 
 * @example
 * ```typescript
 * import { solveKeplerEquation, orbitalToEcliptic, J2000_JD } from './utils';
 * 
 * // 求解开普勒方程
 * const E = solveKeplerEquation(Math.PI / 4, 0.1);
 * 
 * // 坐标变换
 * const pos = orbitalToEcliptic(1.0, 0.0, { w: 0, Omega: 0, i: 0 });
 * ```
 */

// Kepler equation solver
export {
  solveKeplerEquation,
  eccentricToTrueAnomaly,
  heliocentricDistance
} from './kepler';

// Coordinate transformations
export {
  orbitalToEcliptic,
  argumentOfPeriapsis,
  meanAnomaly,
  normalizeAngle,
  distance3D
} from './coordinates';

export type {
  Position3D,
  OrbitalOrientation
} from './coordinates';

// Astronomy constants
export {
  J2000_JD,
  DAYS_PER_CENTURY,
  AU_IN_KM,
  SPEED_OF_LIGHT_KM_S,
  GM_SUN,
  OBLIQUITY_J2000_RAD,
  OBLIQUITY_J2000_DEG,
  DEG_TO_RAD,
  RAD_TO_DEG,
  ARCSEC_TO_RAD,
  RAD_TO_ARCSEC,
  SECONDS_PER_DAY,
  MILLISECONDS_PER_DAY,
  KEPLER_TOLERANCE,
  KEPLER_MAX_ITERATIONS,
  TWO_PI,
  HALF_PI,
  julianCenturies,
  kmToAU,
  auToKM
} from './constants';

// Re-export angle conversion functions from shared utils
export { degreesToRadians, radiansToDegrees } from '@/lib/utils/math';
