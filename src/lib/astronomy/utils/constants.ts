/**
 * @module astronomy/utils/constants
 * @description 天文常数定义模块
 * 
 * 本模块定义了轨道计算和坐标变换中使用的基本天文常数。
 * 所有数值基于 IAU（国际天文学联合会）标准和 NASA JPL 星历数据。
 * 
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层（常量层）
 * - 职责边界：提供标准天文常数和单位转换函数，不包含计算逻辑
 * 
 * @dependencies
 * - 直接依赖：无
 * - 被依赖：astronomy/orbit, astronomy/time, astronomy/utils
 * - 循环依赖：无
 * 
 * @unit 
 * - 距离：AU（天文单位）、km（千米）
 * - 时间：儒略日（Julian Day）、儒略世纪（Julian Century）
 * - 角度：弧度（radians）、度（degrees）、角秒（arcseconds）
 * 
 * @precision 常数精度基于 IAU 和 JPL 标准，通常为 10-15 位有效数字
 * 
 * 参考文献：
 * - IAU 2015 Resolution B3
 * - NASA JPL DE440 ephemeris
 * - Jean Meeus - Astronomical Algorithms (2nd Ed.)
 * 
 * @example
 * ```typescript
 * import { J2000_JD, AU_IN_KM, julianCenturies } from './constants';
 * 
 * // 计算自 J2000.0 以来的儒略世纪数
 * const T = julianCenturies(2451545.0);
 * console.log(T); // 0.0
 * 
 * // 单位转换
 * const distanceKm = 1.5 * AU_IN_KM;
 * console.log(distanceKm); // 224396806.05 km
 * ```
 */

/**
 * J2000.0 历元儒略日数
 * 
 * @description 现代天文计算的标准历元，对应时刻：
 * - 日期：2000 年 1 月 1.5 日 TT（地球时）
 * - 历法：2000-01-01 12:00:00 TT
 * - 修正儒略日：51544.5
 * 
 * @unit 儒略日（Julian Day）
 * @precision 精确值（定义值）
 * 
 * 来源：IAU 标准定义
 */
export const J2000_JD = 2451545.0;

/**
 * 儒略世纪的天数
 * 
 * @description 一个儒略世纪精确等于 36525 天，用于计算时间相关的轨道根数。
 * 
 * @unit 天（days）
 * @precision 精确值（定义值）
 * 
 * 来源：IAU 标准定义
 */
export const DAYS_PER_CENTURY = 36525.0;

/**
 * 天文单位（千米）
 * 
 * @description AU 是地球到太阳的平均距离，由 IAU 2012 Resolution B2 精确定义为
 * 149,597,870.7 千米。
 * 
 * @unit km（千米）
 * @precision 精确值（定义值）
 * 
 * 来源：IAU 2012 Resolution B2
 */
export const AU_IN_KM = 149597870.7;

/**
 * 真空中的光速（千米/秒）
 * 
 * @description 由国际单位制（SI）精确定义的物理常数。
 * 
 * @unit km/s（千米每秒）
 * @precision 精确值（定义值）
 * 
 * 来源：国际单位制（SI）定义
 */
export const SPEED_OF_LIGHT_KM_S = 299792.458;

/**
 * 日心引力常数（千米³/秒²）
 * 
 * @description 引力常数 G 与太阳质量 M☉ 的乘积，用于开普勒第三定律和轨道力学计算。
 * 
 * @unit km³/s²（立方千米每平方秒）
 * @precision 不确定度约 ±8×10³ km³/s²
 * 
 * 来源：IAU 2015 Resolution B3
 */
export const GM_SUN = 1.32712440018e11;

/**
 * J2000.0 时刻的黄赤交角（弧度）
 * 
 * @description 地球赤道平面与黄道平面之间的夹角。
 * 
 * 数值：23.43928° = 23°26'21.406"
 * 
 * @unit 弧度（radians）
 * @precision 不确定度约 ±0.00001°
 * 
 * 来源：IAU 2006 岁差模型
 */
export const OBLIQUITY_J2000_RAD = 23.43928 * Math.PI / 180;

/**
 * J2000.0 时刻的黄赤交角（度）
 * 
 * @unit 度（degrees）
 * @precision 不确定度约 ±0.00001°
 * 
 * 来源：IAU 2006 岁差模型
 */
export const OBLIQUITY_J2000_DEG = 23.43928;

/**
 * Conversion factor: degrees to radians.
 */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Conversion factor: radians to degrees.
 */
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Conversion factor: arcseconds to radians.
 */
export const ARCSEC_TO_RAD = Math.PI / (180 * 3600);

/**
 * Conversion factor: radians to arcseconds.
 */
export const RAD_TO_ARCSEC = (180 * 3600) / Math.PI;

/**
 * Number of seconds in a day.
 */
export const SECONDS_PER_DAY = 86400;

/**
 * Number of milliseconds in a day.
 */
export const MILLISECONDS_PER_DAY = 86400000;

/**
 * Tolerance for Kepler equation solver (radians).
 * 
 * This is the default convergence tolerance for iterative
 * solutions of Kepler's equation.
 */
export const KEPLER_TOLERANCE = 1e-8;

/**
 * Maximum iterations for Kepler equation solver.
 * 
 * This prevents infinite loops in case of non-convergence.
 */
export const KEPLER_MAX_ITERATIONS = 50;

/**
 * Two PI constant for convenience.
 */
export const TWO_PI = 2 * Math.PI;

/**
 * Half PI constant for convenience.
 */
export const HALF_PI = Math.PI / 2;

/**
 * 将儒略日转换为自 J2000.0 以来的儒略世纪数
 * 
 * @description 儒略世纪是天文学中常用的时间单位，用于计算时间相关的轨道根数变化。
 * 
 * @unit 输入：儒略日，输出：儒略世纪
 * @precision 精度取决于输入的儒略日精度
 * 
 * @param {number} julianDay - 儒略日数
 * @returns {number} 自 J2000.0 以来的儒略世纪数
 * 
 * @complexity 时间复杂度 O(1)
 * 
 * @example
 * ```typescript
 * // 在 J2000.0 历元
 * const T = julianCenturies(2451545.0);
 * console.log(T); // 0.0
 * 
 * // 一个世纪后
 * const T2 = julianCenturies(2451545.0 + 36525);
 * console.log(T2); // 1.0
 * ```
 */
export function julianCenturies(julianDay: number): number {
  return (julianDay - J2000_JD) / DAYS_PER_CENTURY;
}

/**
 * 将千米转换为天文单位
 * 
 * @description 天文单位（AU）是天文学中常用的距离单位，等于地球到太阳的平均距离。
 * 
 * @unit 输入：km（千米），输出：AU（天文单位）
 * @precision 精度约 15 位有效数字
 * 
 * @param {number} km - 距离（千米）
 * @returns {number} 距离（天文单位）
 * 
 * @complexity 时间复杂度 O(1)
 * 
 * @example
 * ```typescript
 * const au = kmToAU(149597870.7);
 * console.log(au); // 1.0
 * 
 * // 月球到地球的平均距离
 * const moonDistAU = kmToAU(384400);
 * console.log(moonDistAU); // 约 0.00257 AU
 * ```
 */
export function kmToAU(km: number): number {
  return km / AU_IN_KM;
}

/**
 * 将天文单位转换为千米
 * 
 * @description 将天文单位转换为国际单位制的千米。
 * 
 * @unit 输入：AU（天文单位），输出：km（千米）
 * @precision 精度约 15 位有效数字
 * 
 * @param {number} au - 距离（天文单位）
 * @returns {number} 距离（千米）
 * 
 * @complexity 时间复杂度 O(1)
 * 
 * @example
 * ```typescript
 * const km = auToKM(1.0);
 * console.log(km); // 149597870.7
 * 
 * // 火星到太阳的平均距离
 * const marsDistKm = auToKM(1.524);
 * console.log(marsDistKm); // 约 228,000,000 km
 * ```
 */
export function auToKM(au: number): number {
  return au * AU_IN_KM;
}

// Note: degreesToRadians and radiansToDegrees are now imported from @/lib/utils/math
// to avoid duplication. Use the shared implementation instead.
