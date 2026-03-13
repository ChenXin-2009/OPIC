/**
 * @module astronomy/orbit
 * @description 天体轨道计算模块（第二版）
 * 
 * 本模块提供基于 VSOP87 简化模型的行星位置计算功能，支持时间演化的轨道参数。
 * 使用开普勒轨道力学和黄道坐标系统，计算太阳系八大行星和主要卫星的三维位置。
 * 
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层
 * - 职责边界：负责天体位置计算和轨道力学，不负责数据加载、渲染或用户交互
 * 
 * @dependencies
 * - 直接依赖：astronomy/utils, astronomy/ephemeris, types/celestialTypes, store/useEphemerisStore, three
 * - 被依赖：astronomy/index, 3d/celestial-objects
 * - 循环依赖：无
 * 
 * @coordinateSystem ICRS（国际天球参考系）和黄道坐标系
 * @unit 位置：AU（天文单位），时间：儒略日（Julian Day）
 * @precision 解析模型精度约 ±1000km，星历数据精度约 ±10m
 * 
 * 功能特性：
 * 1. VSOP87 简化模型轨道参数（接近 NASA JPL 数据）
 * 2. 时间相关的轨道元素（每世纪长期变化）
 * 3. 黄道到日心坐标变换
 * 4. 月球位置使用简化 ELP2000 模型
 * 5. 主要卫星位置计算
 * 6. 高精度星历数据支持（可选）
 * 
 * 参考文献：
 * - NASA JPL HORIZONS System
 * - Simon et al. (1994) - Numerical expressions for precession
 * - Meeus, Jean - Astronomical Algorithms (2nd Ed.)
 * 
 * @example
 * ```typescript
 * import { calculatePosition, ORBITAL_ELEMENTS, getCelestialBodies } from './orbit';
 * 
 * // 计算地球在 J2000.0 时刻的位置
 * const earthPos = calculatePosition(ORBITAL_ELEMENTS.earth, 2451545.0);
 * console.log(`地球位置: ${earthPos.x}, ${earthPos.y}, ${earthPos.z} AU`);
 * 
 * // 获取所有天体的当前位置
 * const bodies = await getCelestialBodies(2451545.0);
 * console.log(`共加载 ${bodies.length} 个天体`);
 * ```
 */

import * as THREE from 'three';
import {
  argumentOfPeriapsis,
  eccentricToTrueAnomaly,
  heliocentricDistance,
  julianCenturies,
  meanAnomaly,
  orbitalToEcliptic,
  solveKeplerEquation
} from './utils';
import { CELESTIAL_BODIES, calculateRotationAxis } from '@/lib/types/celestialTypes';
import { useEphemerisStore, LoadingStatus } from '@/lib/store/useEphemerisStore';

// 精度信息常量
const ACCURACY_INFO = {
  ephemeris: '±10m',      // 星历数据精度
  analytical: '±1000km',  // 解析模型精度
};
import { 
  SatellitePositionCalculator,
  type PlanetaryPositionProvider,
  SatelliteId,
  Vector3 as EphemerisVector3,
  ObserverMode
} from './ephemeris';
import { AllBodiesCalculator } from './ephemeris/all-bodies-calculator';
import { EphemerisManager } from './ephemeris/manager';

// Position cache to avoid recalculating the same positions
interface PositionCache {
  jd: number;
  bodies: CelestialBody[];
  timestamp: number;
}

let positionCache: PositionCache | null = null;
// Increase cache tolerance to reduce update frequency and avoid sampling aliasing
// For Enceladus (period 1.37 days = 118,368 seconds), we need at least 10-20 samples per orbit
// to avoid aliasing patterns (cloverleaf, etc.)
// 0.0001 JD = 8.6 seconds, which gives ~13,765 samples per orbit - plenty to avoid aliasing
const CACHE_TOLERANCE = 0.0001; // JD tolerance (about 8.6 seconds)
const CACHE_MAX_AGE = 2000; // milliseconds - allow longer cache lifetime for stability

/**
 * 轨道根数（Orbital Elements）
 * 
 * @description 描述天体椭圆轨道的六个基本参数及其时间演化率。
 * 基于 VSOP87 简化模型，参考历元为 J2000.0（JD 2451545.0）。
 * 
 * @unit
 * - a: AU（天文单位）
 * - e: 无量纲，范围 [0, 1)
 * - i, L, w_bar, O: 弧度（radians）
 * - a_dot: AU/世纪
 * - e_dot: 无量纲/世纪
 * - i_dot, L_dot, w_bar_dot, O_dot: 弧度/世纪
 * - radius: AU（用于渲染）
 * 
 * 轨道根数说明：
 * - a (semi-major axis): 半长轴，椭圆的长轴的一半
 * - e (eccentricity): 离心率，描述轨道的扁平程度，0 表示圆形
 * - i (inclination): 轨道倾角，轨道平面与黄道面的夹角
 * - L (mean longitude): 平黄经，天体的平均角位置
 * - w_bar (longitude of perihelion): 近日点黄经
 * - O (longitude of ascending node): 升交点黄经
 * 
 * 时间演化：
 * - 每个轨道根数都有对应的变化率（_dot 后缀）
 * - 变化率单位为"每儒略世纪"（36525 天）
 * - 用于计算任意时刻的轨道根数：element(t) = element_0 + element_dot * T
 * 
 * @example
 * ```typescript
 * const earthElements: OrbitalElements = {
 *   name: 'Earth',
 *   a: 1.00000261,           // 1 AU
 *   e: 0.01671123,           // 接近圆形
 *   i: -0.00001531 * Math.PI / 180,  // 几乎在黄道面上
 *   L: 100.46457166 * Math.PI / 180,
 *   w_bar: 102.93768193 * Math.PI / 180,
 *   O: 0.0,
 *   a_dot: 0.00000562,
 *   e_dot: -0.00004392,
 *   // ... 其他变化率
 *   radius: 0.008,           // 渲染半径
 *   color: '#4A90E2'
 * };
 * ```
 */
export interface OrbitalElements {
  /** 天体名称（英文） */
  name: string;
  
  // 轨道元素（J2000.0 历元）
  /** 半长轴（AU），椭圆长轴的一半 */
  a: number;
  
  /** 离心率（无量纲），范围 [0, 1)，0 表示圆形轨道 */
  e: number;
  
  /** 轨道倾角（弧度），轨道平面与黄道面的夹角 */
  i: number;
  
  /** 平黄经（弧度），天体的平均角位置 */
  L: number;
  
  /** 近日点黄经（弧度），从春分点到近日点的角度 */
  w_bar: number;
  
  /** 升交点黄经（弧度），从春分点到升交点的角度 */
  O: number;
  
  // 每世纪变化率（长期摄动）
  /** 半长轴变化率（AU/世纪） */
  a_dot: number;
  
  /** 离心率变化率（无量纲/世纪） */
  e_dot: number;
  
  /** 轨道倾角变化率（弧度/世纪） */
  i_dot: number;
  
  /** 平黄经变化率（弧度/世纪） */
  L_dot: number;
  
  /** 近日点黄经变化率（弧度/世纪） */
  w_bar_dot: number;
  
  /** 升交点黄经变化率（弧度/世纪） */
  O_dot: number;
  
  // 显示属性
  /** 渲染半径（AU），用于 3D 可视化 */
  radius: number;
  
  /** 显示颜色（十六进制） */
  color: string;
}

/**
 * 天体对象（Celestial Body）
 * 
 * @description 表示太阳系中的一个天体（行星、卫星或太阳）及其在特定时刻的位置。
 * 
 * @unit
 * - x, y, z: AU（天文单位），日心黄道坐标系
 * - r: AU，日心距离
 * - radius: AU，渲染半径
 * 
 * @coordinateSystem 日心黄道坐标系（J2000.0）
 * - 原点：太阳中心
 * - X 轴：指向春分点
 * - Z 轴：垂直于黄道面，指向北黄极
 * - Y 轴：完成右手坐标系
 * 
 * @example
 * ```typescript
 * const earth: CelestialBody = {
 *   name: 'Earth',
 *   x: -0.177,      // AU
 *   y: 0.967,       // AU
 *   z: 0.000,       // AU
 *   r: 0.983,       // AU，日心距离
 *   radius: 0.008,  // AU，渲染半径
 *   color: '#4A90E2',
 *   elements: ORBITAL_ELEMENTS.earth
 * };
 * ```
 */
export interface CelestialBody {
  /** 天体名称（英文） */
  name: string;
  
  /** X 坐标（AU），日心黄道坐标系 */
  x: number;
  
  /** Y 坐标（AU），日心黄道坐标系 */
  y: number;
  
  /** Z 坐标（AU），日心黄道坐标系 */
  z: number;
  
  /** 日心距离（AU） */
  r: number;
  
  /** 渲染半径（AU），用于 3D 可视化 */
  radius: number;
  
  /** 显示颜色（十六进制） */
  color: string;
  
  /** 是否为太阳（可选），用于特殊渲染处理 */
  isSun?: boolean;
  
  /** 父天体的 key（小写，可选），用于标识卫星的母行星，如 'jupiter' */
  parent?: string;
  
  /** 是否为卫星（可选），用于区分行星和卫星 */
  isSatellite?: boolean;
  
  /** 轨道根数（可选），用于重新计算位置或显示轨道信息 */
  elements?: OrbitalElements;
  
  /** 是否使用星历数据（可选），true 表示使用高精度星历，false 表示使用解析模型 */
  usingEphemeris?: boolean;
}

/**
 * 8大行星轨道参数
 * 
 * @description 太阳系八大行星的轨道根数及其长期变化率。
 * 这些参数用于计算行星在任意时刻的日心黄道坐标位置。
 * 
 * @source
 * - 主要数据源：NASA JPL DE440 星历表（2020年发布）
 * - 长期变化率：Simon et al. (1994) - "Numerical expressions for precession formulae and mean elements for the Moon and the planets"
 * - 参考文献：Meeus, Jean - "Astronomical Algorithms" (2nd Edition, 1998)
 * 
 * @epoch J2000.0（JD 2451545.0，公元 2000年1月1日 12:00 TT）
 * 
 * @precision
 * - 位置精度：±1000 km（相对于 NASA JPL HORIZONS）
 * - 适用时间范围：1800-2200 年（在此范围内精度较高）
 * - 超出范围：精度逐渐降低，不建议用于历史天文学或远期预测
 * 
 * @unit
 * - a: AU（天文单位，1 AU = 149,597,870.7 km）
 * - e: 无量纲（范围 [0, 1)）
 * - i, L, w_bar, O: 弧度（radians）
 * - 变化率：每儒略世纪（36525 天）
 * 
 * @note
 * - 这些参数基于 VSOP87 简化模型，忽略了短周期摄动
 * - 对于高精度应用（如航天器导航），应使用完整的星历数据
 * - 月球位置使用单独的 ELP2000 简化模型
 * 
 * @example
 * ```typescript
 * // 获取地球的轨道参数
 * const earthElements = ORBITAL_ELEMENTS.earth;
 * console.log(`地球半长轴: ${earthElements.a} AU`);
 * console.log(`地球离心率: ${earthElements.e}`);
 * 
 * // 计算地球在特定时刻的位置
 * const jd = 2451545.0; // J2000.0
 * const pos = calculatePosition(earthElements, jd);
 * ```
 */
export const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: {
    name: 'Mercury',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    a: 0.38709927,
    e: 0.20563593,
    i: 7.00497902 * Math.PI / 180,
    L: 252.25032350 * Math.PI / 180,
    w_bar: 77.45779628 * Math.PI / 180,
    O: 48.33076593 * Math.PI / 180,
    // 每儒略世纪变化率
    a_dot: 0.00000037,
    e_dot: 0.00001906,
    i_dot: -0.00594749 * Math.PI / 180,
    L_dot: 149472.67411175 * Math.PI / 180,
    w_bar_dot: 0.16047689 * Math.PI / 180,
    O_dot: -0.12534081 * Math.PI / 180,
    radius: 0.003,
    color: '#8C7853'
  },
  venus: {
    name: 'Venus',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    a: 0.72333566,
    e: 0.00677672,
    i: 3.39467605 * Math.PI / 180,
    L: 181.97909950 * Math.PI / 180,
    w_bar: 131.60246718 * Math.PI / 180,
    O: 76.67984255 * Math.PI / 180,
    a_dot: 0.00000390,
    e_dot: -0.00004107,
    i_dot: -0.00078890 * Math.PI / 180,
    L_dot: 58517.81538729 * Math.PI / 180,
    w_bar_dot: 0.00268329 * Math.PI / 180,
    O_dot: -0.27769418 * Math.PI / 180,
    radius: 0.008,
    color: '#FFC649'
  },
  earth: {
    name: 'Earth',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    // 注意：升交点黄经 O = 0（地球轨道定义了黄道面）
    a: 1.00000261,
    e: 0.01671123,
    i: -0.00001531 * Math.PI / 180,
    L: 100.46457166 * Math.PI / 180,
    w_bar: 102.93768193 * Math.PI / 180,
    O: 0.0,
    a_dot: 0.00000562,
    e_dot: -0.00004392,
    i_dot: -0.01294668 * Math.PI / 180,
    L_dot: 35999.37244981 * Math.PI / 180,
    w_bar_dot: 0.32327364 * Math.PI / 180,
    O_dot: 0.0,
    radius: 0.008,
    color: '#4A90E2'
  },
  mars: {
    name: 'Mars',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    a: 1.52371034,
    e: 0.09339410,
    i: 1.84969142 * Math.PI / 180,
    L: -4.55343205 * Math.PI / 180,
    w_bar: -23.94362959 * Math.PI / 180,
    O: 49.55953891 * Math.PI / 180,
    a_dot: 0.00001847,
    e_dot: 0.00007882,
    i_dot: -0.00813131 * Math.PI / 180,
    L_dot: 19140.30268499 * Math.PI / 180,
    w_bar_dot: 0.44441088 * Math.PI / 180,
    O_dot: -0.29257343 * Math.PI / 180,
    radius: 0.004,
    color: '#E27B58'
  },
  jupiter: {
    name: 'Jupiter',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    a: 5.20288700,
    e: 0.04838624,
    i: 1.30439695 * Math.PI / 180,
    L: 34.39644051 * Math.PI / 180,
    w_bar: 14.72847983 * Math.PI / 180,
    O: 100.47390909 * Math.PI / 180,
    a_dot: -0.00011607,
    e_dot: -0.00013253,
    i_dot: -0.00183714 * Math.PI / 180,
    L_dot: 3034.74612775 * Math.PI / 180,
    w_bar_dot: 0.21252668 * Math.PI / 180,
    O_dot: 0.20469106 * Math.PI / 180,
    radius: 0.09,
    color: '#C88B3A'
  },
  saturn: {
    name: 'Saturn',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    a: 9.53667594,
    e: 0.05386179,
    i: 2.48599187 * Math.PI / 180,
    L: 49.95424423 * Math.PI / 180,
    w_bar: 92.59887831 * Math.PI / 180,
    O: 113.66242448 * Math.PI / 180,
    a_dot: -0.00125060,
    e_dot: -0.00050991,
    i_dot: 0.00193609 * Math.PI / 180,
    L_dot: 1222.49362201 * Math.PI / 180,
    w_bar_dot: -0.41897216 * Math.PI / 180,
    O_dot: -0.28867794 * Math.PI / 180,
    radius: 0.075,
    color: '#FAD5A5'
  },
  uranus: {
    name: 'Uranus',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    a: 19.18916464,
    e: 0.04725744,
    i: 0.77263783 * Math.PI / 180,
    L: 313.23810451 * Math.PI / 180,
    w_bar: 170.95427630 * Math.PI / 180,
    O: 74.01692503 * Math.PI / 180,
    a_dot: -0.00196176,
    e_dot: -0.00004397,
    i_dot: -0.00242939 * Math.PI / 180,
    L_dot: 428.48202785 * Math.PI / 180,
    w_bar_dot: 0.40805281 * Math.PI / 180,
    O_dot: 0.04240589 * Math.PI / 180,
    radius: 0.032,
    color: '#4FD0E7'
  },
  neptune: {
    name: 'Neptune',
    // J2000.0 轨道元素
    // 数据源：NASA JPL DE440 + Simon et al. (1994)
    // 精度：±1000 km（1800-2200年）
    a: 30.06992276,
    e: 0.00859048,
    i: 1.77004347 * Math.PI / 180,
    L: -55.12002969 * Math.PI / 180,
    w_bar: 44.96476227 * Math.PI / 180,
    O: 131.78422574 * Math.PI / 180,
    a_dot: 0.00026291,
    e_dot: 0.00005105,
    i_dot: 0.00035372 * Math.PI / 180,
    L_dot: 218.45945325 * Math.PI / 180,
    w_bar_dot: -0.32241464 * Math.PI / 180,
    O_dot: -0.00508664 * Math.PI / 180,
    radius: 0.031,
    color: '#4166F5'
  }
};

/**
 * 卫星定义（含完整轨道参数）
 * 
 * @description 太阳系主要卫星的轨道参数定义。
 * 包括地球的月球、木星的伽利略卫星、土星的主要卫星、天王星和海王星的卫星。
 * 
 * @source
 * - 主要数据源：NASA JPL HORIZONS System（https://ssd.jpl.nasa.gov/horizons/）
 * - 轨道参数：IAU WGCCRE (Working Group on Cartographic Coordinates and Rotational Elements) 报告
 * - 物理参数：IAU Minor Planet Center 和各行星系统专题报告
 * - 参考时间：J2000.0 历元
 * 
 * @precision
 * - 轨道位置精度：±100 km（主要卫星）
 * - 适用时间范围：1900-2100 年
 * - 注意：使用简化圆轨道模型，忽略了摄动和轨道偏心率
 * 
 * @coordinateSystem
 * - 默认：母行星赤道坐标系（卫星轨道平面与母行星赤道面对齐）
 * - 特殊情况：月球使用黄道坐标系（eclipticOrbit: true）
 * 
 * @unit
 * - a: AU（天文单位），原始数据为 km，已转换
 * - periodDays: 天（地球日）
 * - i: 弧度（radians），原始数据为度，已转换
 * - Omega: 弧度（radians），升交点黄经
 * - radius: AU（天文单位），卫星物理半径，用于渲染
 * 
 * @dataQuality
 * - 高质量：月球、伽利略卫星（Io, Europa, Ganymede, Callisto）、土卫六（Titan）
 * - 中等质量：其他主要卫星
 * - 注意：小型不规则卫星未包含在此列表中
 * 
 * @note
 * - 卫星位置使用简化的圆轨道模型，适合可视化但不适合精密计算
 * - 对于高精度应用，应使用完整的星历数据（通过 AllBodiesCalculator）
 * - 月球轨道倾角相对于黄道面约 5.14°，而非相对于地球赤道面
 * - 天王星卫星的轨道倾角相对于天王星赤道面（天王星自转轴倾斜 97.8°）
 * 
 * @example
 * ```typescript
 * // 获取木星的卫星列表
 * const jupiterMoons = SATELLITE_DEFINITIONS.jupiter;
 * console.log(`木星有 ${jupiterMoons.length} 个主要卫星`);
 * 
 * // 获取 Io 的轨道参数
 * const io = jupiterMoons.find(sat => sat.name === 'Io');
 * console.log(`Io 半长轴: ${io.a} AU`);
 * console.log(`Io 公转周期: ${io.periodDays} 天`);
 * ```
 * 
 * 参数说明：
 * - parent: 母天体 key（小写，如 'jupiter'）
 * - name: 卫星名（英文）
 * - a: 半长轴（AU，已从 km 转换）
 * - periodDays: 公转周期（天）
 * - i: 轨道倾角（弧度，相对于母行星的赤道平面，除非 eclipticOrbit=true）
 * - Omega: 升交点黄经（弧度）
 * - radius: 卫星物理半径（AU，已从 km 转换，用于渲染）
 * - color: 显示颜色（十六进制）
 * - phase: 初始相位（0-1，可选）
 * - eclipticOrbit: 是否相对于黄道面（可选，仅月球为 true）
 */
export const SATELLITE_DEFINITIONS: Record<string, Array<{
  name: string;
  a: number;          // 半长轴（AU）
  periodDays: number;
  i: number;          // 轨道倾角（弧度）
  Omega: number;      // 升交点黄经（弧度）
  radius: number;     // 半径（AU）
  color: string;
  phase?: number;
  eclipticOrbit?: boolean;  // 是否相对于黄道面而非母行星赤道面
}>> = {
  earth: [
    // 地球唯一天然卫星
    // 数据源：NASA JPL HORIZONS（2024）+ IAU WGCCRE Report (2015)
    // 月球轨道倾角相对于黄道面 ~5.14°（不是相对于地球赤道面）
    // 精度：±100 km（1900-2100年）
    { name: 'Moon', a: 384400 / 149597870.7, periodDays: 27.322, i: 5.145 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1737.4 / 149597870.7, color: '#c0c0c0', phase: 0.0, eclipticOrbit: true },
  ],
  jupiter: [
    // 木星的四颗伽利略卫星（Galilean moons）
    // 数据源：NASA JPL HORIZONS（2024）+ IAU WGCCRE Report (2015)
    // 精度：±100 km（1900-2100年）
    // 为每个卫星设置不同的升交点黄经，使它们的轨道处于不同平面
    // 注意：这些卫星的轨道倾角相对于木星赤道面，非常接近 0°（潮汐锁定）
    { name: 'Io', a: 421700 / 149597870.7, periodDays: 1.769, i: 0.04 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1821.6 / 149597870.7, color: '#f5d6a0', phase: 0.02 },
    { name: 'Europa', a: 671034 / 149597870.7, periodDays: 3.551, i: 0.47 * Math.PI / 180, Omega: 90 * Math.PI / 180, radius: 1560.8 / 149597870.7, color: '#d9e8ff', phase: 0.25 },
    { name: 'Ganymede', a: 1070412 / 149597870.7, periodDays: 7.154, i: 0.18 * Math.PI / 180, Omega: 180 * Math.PI / 180, radius: 2634.1 / 149597870.7, color: '#cfae8b', phase: 0.5 },
    { name: 'Callisto', a: 1882700 / 149597870.7, periodDays: 16.689, i: 0.19 * Math.PI / 180, Omega: 270 * Math.PI / 180, radius: 2410.3 / 149597870.7, color: '#bba99b', phase: 0.75 },
  ],
  saturn: [
    // 土星主要卫星
    // 数据源：NASA JPL HORIZONS（2024）+ IAU WGCCRE Report (2015)
    // 精度：±100 km（1900-2100年）
    // 为卫星设置不同的升交点黄经
    // Titan（土卫六）是土星最大的卫星，也是太阳系第二大卫星
    // Enceladus（土卫二）以其南极的冰火山活动而闻名
    { name: 'Titan', a: 1221870 / 149597870.7, periodDays: 15.945, i: 0.34 * Math.PI / 180, Omega: 45 * Math.PI / 180, radius: 2574.73 / 149597870.7, color: '#ffd9a6', phase: 0.2 },
    { name: 'Enceladus', a: 238020 / 149597870.7, periodDays: 1.370, i: 0.01 * Math.PI / 180, Omega: 225 * Math.PI / 180, radius: 252.1 / 149597870.7, color: '#e6f7ff', phase: 0.6 },
  ],
  uranus: [
    // 天王星主要卫星
    // 天王星自转轴倾斜97.8°，卫星轨道倾角相对于天王星赤道平面
    // 数据源：NASA JPL HORIZONS（2024）+ IAU WGCCRE Report (2015)
    // 精度：±100 km（1900-2100年）
    // 为卫星设置不同的升交点黄经
    // 天王星的卫星以莎士比亚和亚历山大·蒲柏作品中的角色命名
    { name: 'Miranda', a: 129900 / 149597870.7, periodDays: 1.413, i: 4.338 * Math.PI / 180, Omega: 30 * Math.PI / 180, radius: 235.8 / 149597870.7, color: '#f0e9ff', phase: 0.1 },
    { name: 'Ariel', a: 191020 / 149597870.7, periodDays: 2.521, i: 0.260 * Math.PI / 180, Omega: 120 * Math.PI / 180, radius: 578.9 / 149597870.7, color: '#cfe7ff', phase: 0.35 },
    { name: 'Umbriel', a: 266000 / 149597870.7, periodDays: 4.144, i: 0.360 * Math.PI / 180, Omega: 210 * Math.PI / 180, radius: 584.7 / 149597870.7, color: '#bfc4d6', phase: 0.6 },
    { name: 'Titania', a: 436300 / 149597870.7, periodDays: 8.706, i: 0.100 * Math.PI / 180, Omega: 300 * Math.PI / 180, radius: 788.9 / 149597870.7, color: '#d6eaff', phase: 0.9 },
  ],
  neptune: [
    // 海王星主要卫星
    // 数据源：NASA JPL HORIZONS（2024）+ IAU WGCCRE Report (2015)
    // 精度：±100 km（1900-2100年）
    // Triton（海卫一）是太阳系中唯一一颗逆行轨道的大型卫星（轨道倾角 156.87°）
    // Triton 可能是被海王星捕获的柯伊伯带天体
    { name: 'Triton', a: 354800 / 149597870.7, periodDays: 5.877, i: 156.87 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1353.4 / 149597870.7, color: '#bde0ff', phase: 0.4 },
  ]
};

/**
 * Implementation of PlanetaryPositionProvider that wraps the existing orbit system
 */
class OrbitSystemPositionProvider implements PlanetaryPositionProvider {
  getEarthPosition(jd_tdb: number): EphemerisVector3 {
    const pos = calculatePosition(ORBITAL_ELEMENTS.earth, jd_tdb);
    return new EphemerisVector3(pos.x, pos.y, pos.z);
  }

  getJupiterPosition(jd_tdb: number): EphemerisVector3 {
    const pos = calculatePosition(ORBITAL_ELEMENTS.jupiter, jd_tdb);
    return new EphemerisVector3(pos.x, pos.y, pos.z);
  }

  getEarthVelocity(jd_tdb: number): EphemerisVector3 {
    // Compute Earth's velocity using finite differences
    // Use a small time step (1 second = 1/86400 days)
    const dt = 1.0 / 86400.0;
    const pos1 = calculatePosition(ORBITAL_ELEMENTS.earth, jd_tdb - dt / 2);
    const pos2 = calculatePosition(ORBITAL_ELEMENTS.earth, jd_tdb + dt / 2);
    
    // Velocity in AU/day
    const vx = (pos2.x - pos1.x) / dt;
    const vy = (pos2.y - pos1.y) / dt;
    const vz = (pos2.z - pos1.z) / dt;
    
    // Convert to km/s
    const AU_TO_KM = 149597870.7;
    const DAYS_TO_SECONDS = 86400.0;
    const scale = AU_TO_KM / DAYS_TO_SECONDS;
    
    return new EphemerisVector3(vx * scale, vy * scale, vz * scale);
  }
}

/**
 * Global satellite position calculator instance (DEPRECATED)
 * This is no longer used - all satellites are handled by AllBodiesCalculator
 * Kept for backward compatibility but not initialized
 */
let satelliteCalculator: SatellitePositionCalculator | null = null;
let calculatorInitPromise: Promise<void> | null = null;

/**
 * Global all-bodies ephemeris calculator instance
 * Provides high-precision positions for all planets and major satellites
 * 
 * NOTE: This is initialized lazily (on-demand) when user enables high-precision mode
 */
let allBodiesCalculator: AllBodiesCalculator | null = null;
let allBodiesInitPromise: Promise<void> | null = null;

/**
 * Check if ephemeris should be used for a given body
 * This checks the user's settings in localStorage
 * 
 * @param naifId - NAIF ID of the body
 * @returns true if user has enabled high-precision mode for this body
 */
function shouldUseEphemeris(naifId: number): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const stored = localStorage.getItem('ephemeris-settings');
    if (!stored) return false;
    
    const settings = JSON.parse(stored);
    if (!settings?.state?.bodies) return false;
    
    // Map NAIF ID to body key
    const bodyKeyMap: Record<number, string> = {
      199: 'mercury', 299: 'venus', 399: 'earth', 4: 'mars',
      5: 'jupiter', 6: 'saturn', 7: 'uranus', 8: 'neptune',
      301: 'moon',
      501: 'io', 502: 'europa', 503: 'ganymede', 504: 'callisto',
      601: 'mimas', 602: 'enceladus', 603: 'tethys', 604: 'dione',
      605: 'rhea', 606: 'titan', 607: 'hyperion', 608: 'iapetus',
      701: 'ariel', 702: 'umbriel', 703: 'titania', 704: 'oberon', 705: 'miranda',
      801: 'triton',
    };
    
    const bodyKey = bodyKeyMap[naifId];
    if (!bodyKey) return false;
    
    return settings.state.bodies[bodyKey]?.enabled === true;
  } catch (error) {
    console.warn('[Ephemeris] Failed to check user settings:', error);
    return false;
  }
}

/**
 * Get the all-bodies ephemeris calculator instance
 * Returns null if not initialized
 */
export function getAllBodiesCalculator(): AllBodiesCalculator | null {
  return allBodiesCalculator;
}

/**
 * Initialize the all-bodies ephemeris calculator (lazy initialization)
 * This provides high-precision positions for planets and satellites
 * 
 * NOTE: This is now called on-demand when user enables high-precision mode
 * for any celestial body, instead of automatic initialization on page load.
 * This prevents downloading 50MB+ of ephemeris data unnecessarily.
 */
export async function initializeAllBodiesCalculator(): Promise<void> {
  if (allBodiesInitPromise) {
    return allBodiesInitPromise;
  }

  allBodiesInitPromise = (async () => {
    try {
      console.log('[Ephemeris] Initializing all-bodies calculator (on-demand)...');
      allBodiesCalculator = new AllBodiesCalculator({
        baseUrl: '/data/ephemeris'
      });
      
      // 获取所有天体的时间范围并更新Store
      const bodies = allBodiesCalculator.getBodies();
      const store = useEphemerisStore.getState();
      
      bodies.forEach((bodyConfig: any) => {
        // 将NAIF ID映射到bodyKey
        const bodyKeyMap: Record<number, string> = {
          199: 'mercury', 299: 'venus', 399: 'earth', 4: 'mars',
          5: 'jupiter', 6: 'saturn', 7: 'uranus', 8: 'neptune',
          301: 'moon',
          501: 'io', 502: 'europa', 503: 'ganymede', 504: 'callisto',
          601: 'mimas', 602: 'enceladus', 603: 'tethys', 604: 'dione',
          605: 'rhea', 606: 'titan', 607: 'hyperion', 608: 'iapetus',
          701: 'ariel', 702: 'umbriel', 703: 'titania', 704: 'oberon', 705: 'miranda',
          801: 'triton'
        };
        
        const bodyKey = bodyKeyMap[bodyConfig.naifId];
        if (bodyKey && bodyConfig.timeRange) {
          store.setBodyTimeRange(
            bodyKey as any,
            bodyConfig.timeRange.start,
            bodyConfig.timeRange.end
          );
          store.setBodyAccuracy(
            bodyKey as any,
            ACCURACY_INFO.ephemeris,
            ACCURACY_INFO.analytical
          );
        }
      });
      
      console.log('[Ephemeris] All-bodies calculator initialized successfully');
    } catch (error) {
      console.warn('[Ephemeris] Failed to initialize all-bodies calculator:', error);
      allBodiesCalculator = null;
      // Reset promise so it can be retried
      allBodiesInitPromise = null;
      throw error;
    }
  })();

  return allBodiesInitPromise;
}

/**
 * Initialize the satellite position calculator (DEPRECATED)
 * This function is deprecated and does nothing.
 * All satellites are now handled by the AllBodiesCalculator.
 * 
 * @deprecated Use initializeAllBodiesCalculator() instead
 */
export async function initializeSatelliteCalculator(
  ephemerisDataUrl?: string
): Promise<void> {
  // No-op: This function is deprecated
  // All satellites are handled by AllBodiesCalculator now
  console.log('initializeSatelliteCalculator is deprecated, using AllBodiesCalculator instead');
  return Promise.resolve();
}

/**
 * Get satellite key from SatelliteId enum
 */
function getSatelliteKey(satelliteId: SatelliteId): string {
  switch (satelliteId) {
    case SatelliteId.IO: return 'Io';
    case SatelliteId.EUROPA: return 'Europa';
    case SatelliteId.GANYMEDE: return 'Ganymede';
    case SatelliteId.CALLISTO: return 'Callisto';
    default: return '';
  }
}

/**
 * Get SatelliteId from satellite name
 */
function getSatelliteId(name: string): SatelliteId | null {
  switch (name) {
    case 'Io': return SatelliteId.IO;
    case 'Europa': return SatelliteId.EUROPA;
    case 'Ganymede': return SatelliteId.GANYMEDE;
    case 'Callisto': return SatelliteId.CALLISTO;
    default: return null;
  }
}

/**
 * Computes orbital elements at a given time.
 * 
 * This function applies secular variations to the base orbital elements
 * to account for perturbations over time.
 * 
 * @param elements - Base orbital elements at J2000.0
 * @param T - Julian centuries since J2000.0
 * @returns Orbital elements at the specified time
 */
function computeElementsAtTime(elements: OrbitalElements, T: number): OrbitalElements {
  return {
    ...elements,
    a: elements.a + elements.a_dot * T,
    e: elements.e + elements.e_dot * T,
    i: elements.i + elements.i_dot * T,
    L: elements.L + elements.L_dot * T,
    w_bar: elements.w_bar + elements.w_bar_dot * T,
    O: elements.O + elements.O_dot * T
  };
}

/**
 * Calculates satellite position relative to its parent planet.
 * 
 * This function computes the position of a satellite using a simplified
 * circular orbit model. The orbit can be either in the planet's equatorial
 * plane or relative to the ecliptic plane (for the Moon).
 * 
 * @param sat - Satellite definition with orbital parameters
 * @param daysSinceJ2000 - Days since J2000.0 epoch
 * @param parentAxisQuaternion - Parent planet's axis orientation
 * @returns Satellite position relative to parent (AU)
 */
function calculateSatellitePosition(
  sat: {
    a: number;
    periodDays: number;
    i: number;
    Omega: number;
    phase?: number;
    eclipticOrbit?: boolean;
  },
  daysSinceJ2000: number,
  parentAxisQuaternion: THREE.Quaternion
): THREE.Vector3 {
  // Calculate mean angle based on orbital period
  const theta = (2 * Math.PI * (daysSinceJ2000 / sat.periodDays + (sat.phase || 0))) % (2 * Math.PI);

  // Satellite position in orbital plane
  const r_orb = sat.a;
  const x_orb = r_orb * Math.cos(theta);
  const y_orb = r_orb * Math.sin(theta);
  const z_orb = 0;

  let satellitePos: THREE.Vector3;

  if (sat.eclipticOrbit) {
    // Moon and similar: orbit relative to ecliptic plane
    // Apply orbital inclination directly in ecliptic coordinates
    const cos_Om = Math.cos(sat.Omega);
    const sin_Om = Math.sin(sat.Omega);
    const x_1 = x_orb * cos_Om - y_orb * sin_Om;
    const y_1 = x_orb * sin_Om + y_orb * cos_Om;
    const z_1 = z_orb;

    const cos_i = Math.cos(sat.i);
    const sin_i = Math.sin(sat.i);
    const x_final = x_1;
    const y_final = y_1 * cos_i - z_1 * sin_i;
    const z_final = y_1 * sin_i + z_1 * cos_i;

    satellitePos = new THREE.Vector3(x_final, y_final, z_final);
  } else {
    // Other satellites: orbit in parent planet's equatorial plane
    // Apply satellite orbital inclination and ascending node
    const cos_Om = Math.cos(sat.Omega);
    const sin_Om = Math.sin(sat.Omega);
    const x_1 = x_orb * cos_Om - y_orb * sin_Om;
    const y_1 = x_orb * sin_Om + y_orb * cos_Om;
    const z_1 = z_orb;

    const cos_i = Math.cos(sat.i);
    const sin_i = Math.sin(sat.i);
    const x_2 = x_1;
    const y_2 = y_1 * cos_i - z_1 * sin_i;
    const z_2 = y_1 * sin_i + z_1 * cos_i;

    // Apply parent planet's axis tilt transformation
    satellitePos = new THREE.Vector3(x_2, y_2, z_2);
    satellitePos.applyQuaternion(parentAxisQuaternion);
  }

  return satellitePos;
}

/**
 * Gets the parent planet's axis orientation quaternion.
 * 
 * This function retrieves the spin axis configuration from the celestial
 * bodies configuration and converts it to a quaternion for coordinate
 * transformations.
 * 
 * @param parentKey - Parent planet identifier (lowercase)
 * @returns Quaternion representing the planet's axis orientation
 */
function getParentAxisQuaternion(parentKey: string): THREE.Quaternion {
  const quaternion = new THREE.Quaternion(); // Default: no tilt

  const parentConfig = CELESTIAL_BODIES[parentKey];

  if (parentConfig && parentConfig.northPoleRA !== undefined && parentConfig.northPoleDec !== undefined) {
    // Calculate rotation axis from north pole coordinates
    const axis = calculateRotationAxis(parentConfig.northPoleRA, parentConfig.northPoleDec);

    // Convert to Three.js Vector3
    const spinAxisRender = new THREE.Vector3(axis.x, axis.y, axis.z);

    // Orbital plane is in equatorial plane, normal vector is spin axis
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const targetNormal = spinAxisRender.normalize();

    quaternion.setFromUnitVectors(defaultNormal, targetNormal);
  }

  return quaternion;
}

/**
 * Calculates the heliocentric position of a planet.
 * 
 * This function computes the 3D position of a celestial body in the
 * heliocentric ecliptic coordinate system at a given Julian Day.
 * 
 * Algorithm:
 * 1. Compute Julian centuries since J2000.0
 * 2. Apply secular variations to orbital elements
 * 3. Calculate mean anomaly from mean longitude
 * 4. Solve Kepler's equation for eccentric anomaly
 * 5. Compute true anomaly and heliocentric distance
 * 6. Transform from orbital plane to ecliptic coordinates
 * 
 * @param elements - Orbital elements of the body
 * @param julianDay - Julian Day Number
 * @returns Position in heliocentric ecliptic coordinates (AU) and distance
 * 
 * @example
 * ```typescript
 * const earthPos = calculatePosition(ORBITAL_ELEMENTS.earth, 2451545.0);
 * console.log(earthPos); // { x: ..., y: ..., z: ..., r: ... }
 * ```
 */
export function calculatePosition(
  elements: OrbitalElements,
  julianDay: number
): { x: number; y: number; z: number; r: number } {
  // Compute Julian centuries since J2000.0
  const T = julianCenturies(julianDay);
  
  // Apply secular variations to orbital elements
  const elem = computeElementsAtTime(elements, T);
  
  // Calculate argument of periapsis and mean anomaly
  const w = argumentOfPeriapsis(elem.w_bar, elem.O);
  const M = meanAnomaly(elem.L, elem.w_bar);
  
  // Solve Kepler's equation for eccentric anomaly
  const E = solveKeplerEquation(M, elem.e);
  
  // Calculate true anomaly
  const nu = eccentricToTrueAnomaly(E, elem.e);
  
  // Calculate heliocentric distance
  const r = heliocentricDistance(elem.a, elem.e, E);
  
  // Compute position in orbital plane
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);
  
  // Transform to ecliptic coordinates
  const pos = orbitalToEcliptic(x_orb, y_orb, {
    w,
    Omega: elem.O,
    i: elem.i
  });
  
  return { ...pos, r };
}

/**
 * Gets all celestial body positions at a given time.
 * 
 * This function computes the positions of the Sun, all 8 planets, and
 * their major satellites at the specified Julian Day.
 * 
 * Uses caching to avoid recalculating positions for the same time.
 * Returns cached data immediately if available, and updates cache in background.
 * 
 * @param julianDay - Julian Day Number
 * @returns Array of celestial bodies with positions and properties
 */
export async function getCelestialBodies(julianDay: number): Promise<CelestialBody[]> {
  // Check cache first
  const now = Date.now();
  if (positionCache) {
    const jdDiff = Math.abs(julianDay - positionCache.jd);
    const age = now - positionCache.timestamp;
    
    // Use cached data if:
    // 1. JD is very close (within tolerance)
    // 2. Cache is not too old
    if (jdDiff < CACHE_TOLERANCE && age < CACHE_MAX_AGE) {
      // Return cached data immediately
      return positionCache.bodies;
    }
    
    // If cache is slightly stale but not too old, return it anyway
    // and trigger a background update
    if (jdDiff < CACHE_TOLERANCE * 10 && age < CACHE_MAX_AGE * 2) {
      // Return cached data immediately
      const cachedBodies = positionCache.bodies;
      
      // Trigger background update (don't await)
      calculateBodiesInBackground(julianDay);
      
      return cachedBodies;
    }
  }
  
  // No valid cache, calculate now
  return await calculateBodiesNow(julianDay);
}

/**
 * Calculate bodies immediately and update cache
 */
async function calculateBodiesNow(julianDay: number): Promise<CelestialBody[]> {
  const bodies: CelestialBody[] = [];
  
  // Add the Sun at origin
  bodies.push({
    name: 'Sun',
    x: 0,
    y: 0,
    z: 0,
    r: 0,
    radius: 0.05,
    color: '#FDB813',
    isSun: true
  });
  
  // Calculate positions for all 8 planets
  const planetPositions = await calculatePlanetPositions(julianDay, bodies);
  
  // Calculate positions for all satellites
  await calculateSatellitePositions(julianDay, planetPositions, bodies);
  
  console.log(`getCelestialBodies: Loaded ${bodies.length} bodies for JD ${julianDay}`);
  
  // Update cache
  positionCache = {
    jd: julianDay,
    bodies: bodies,
    timestamp: Date.now()
  };
  
  // Emit bodies ready event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
      detail: { stage: 'bodies' }
    }));
  }
  
  return bodies;
}

/**
 * Calculate bodies in background and update cache
 * Used for non-blocking updates when cache is slightly stale
 */
function calculateBodiesInBackground(julianDay: number): void {
  calculateBodiesNow(julianDay).catch(error => {
    console.warn('Background body calculation failed:', error);
  });
}

/**
 * Calculates positions for all planets.
 * 
 * @param julianDay - Julian Day Number
 * @param bodies - Array to append planet bodies to
 * @returns Map of planet positions by lowercase name
 */
async function calculatePlanetPositions(
  julianDay: number,
  bodies: CelestialBody[]
): Promise<Record<string, { x: number; y: number; z: number }>> {
  const planetPosMap: Record<string, { x: number; y: number; z: number }> = {};
  
  // NAIF IDs for planets
  // Note: Mars and outer planets use barycenter IDs (4-8) because DE440 doesn't include
  // planet center IDs (499, 599, 699, 799, 899). The difference is negligible for visualization.
  const planetNaifIds: Record<string, number> = {
    'mercury': 199,
    'venus': 299,
    'earth': 399,
    'mars': 4,      // Mars Barycenter (not 499)
    'jupiter': 5,   // Jupiter Barycenter (not 599)
    'saturn': 6,    // Saturn Barycenter (not 699)
    'uranus': 7,    // Uranus Barycenter (not 799)
    'neptune': 8    // Neptune Barycenter (not 899)
  };
  
  for (const [key, elements] of Object.entries(ORBITAL_ELEMENTS)) {
    let pos: { x: number; y: number; z: number; r: number };
    let usingEphemeris = false;
    
    const naifId = planetNaifIds[key];
    
    // Check if user has enabled high-precision mode for this planet
    const shouldUseHighPrecision = naifId && shouldUseEphemeris(naifId);
    
    // Try to use high-precision ephemeris if user enabled it
    if (shouldUseHighPrecision) {
      // Initialize calculator if not already done
      if (!allBodiesCalculator) {
        try {
          // Update status to LOADING for this body
          const bodyKey = key as any; // mercury, venus, earth, etc.
          useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.LOADING);
          
          await initializeAllBodiesCalculator();
        } catch (error) {
          console.warn(`[Ephemeris] Failed to initialize calculator for ${key}, using analytical model:`, error);
          // Update status to ERROR
          const bodyKey = key as any;
          useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.ERROR, String(error));
        }
      }
      
      // Try to get ephemeris position
      if (allBodiesCalculator) {
        try {
          const result = await allBodiesCalculator.calculatePosition(naifId, julianDay);
          if (result.usingEphemeris) {
            pos = {
              x: result.position.x,
              y: result.position.y,
              z: result.position.z,
              r: Math.sqrt(result.position.x ** 2 + result.position.y ** 2 + result.position.z ** 2)
            };
            usingEphemeris = true;
            
            // Update status to LOADED
            const bodyKey = key as any;
            useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.LOADED);
          } else {
            // Ephemeris failed, fall back to analytical
            pos = calculatePosition(elements, julianDay);
          }
        } catch (error) {
          // Error getting ephemeris, fall back to analytical
          console.warn(`[Ephemeris] Error for ${key}, using analytical model:`, error);
          pos = calculatePosition(elements, julianDay);
          
          // Update status to ERROR
          const bodyKey = key as any;
          useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.ERROR, String(error));
        }
      } else {
        // Calculator not available, use analytical
        pos = calculatePosition(elements, julianDay);
      }
    } else {
      // User hasn't enabled high-precision mode, use analytical model
      pos = calculatePosition(elements, julianDay);
    }
    
    bodies.push({
      name: elements.name,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      r: pos.r,
      radius: elements.radius,
      color: elements.color,
      elements: elements
    });
    
    planetPosMap[key] = { x: pos.x, y: pos.y, z: pos.z };
  }
  
  return planetPosMap;
}

/**
 * Calculates positions for all satellites.
 * 
 * This function computes satellite positions using either:
 * - High-precision ephemeris data for major satellites (if available)
 * - Simplified circular orbit models for other satellites
 * 
 * Satellites orbit their parent planets, and their positions
 * are calculated relative to the parent's current position.
 * 
 * @param julianDay - Julian Day Number
 * @param planetPosMap - Map of planet positions by lowercase name
 * @param bodies - Array to append satellite bodies to
 */
async function calculateSatellitePositions(
  julianDay: number,
  planetPosMap: Record<string, { x: number; y: number; z: number }>,
  bodies: CelestialBody[]
): Promise<void> {
  const daysSinceJ2000 = julianDay - 2451545.0;
  
  // NAIF IDs for satellites
  const satelliteNaifIds: Record<string, number> = {
    // Earth
    'Moon': 301,
    // Jupiter
    'Io': 501,
    'Europa': 502,
    'Ganymede': 503,
    'Callisto': 504,
    // Saturn
    'Mimas': 601,
    'Enceladus': 602,
    'Tethys': 603,
    'Dione': 604,
    'Rhea': 605,
    'Titan': 606,
    'Hyperion': 607,
    'Iapetus': 608,
    // Uranus
    'Miranda': 705,
    'Ariel': 701,
    'Umbriel': 702,
    'Titania': 703,
    'Oberon': 704,
    // Neptune
    'Triton': 801
  };
  
  for (const [parentKey, sats] of Object.entries(SATELLITE_DEFINITIONS)) {
    const parentPos = planetPosMap[parentKey];
    if (!parentPos) {
      console.warn(`Parent planet not found: ${parentKey}`);
      continue;
    }

    // Check if user wants to use ephemeris for any satellite in this system
    const hasEphemerisEnabled = sats.some(sat => {
      const naifId = satelliteNaifIds[sat.name];
      return naifId && shouldUseEphemeris(naifId);
    });
    
    // Initialize calculator if needed and not already done
    if (hasEphemerisEnabled && !allBodiesCalculator) {
      try {
        // Update status to LOADING for enabled satellites in this system
        sats.forEach(sat => {
          const naifId = satelliteNaifIds[sat.name];
          if (naifId && shouldUseEphemeris(naifId)) {
            const bodyKey = sat.name.toLowerCase() as any;
            useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.LOADING);
          }
        });
        
        await initializeAllBodiesCalculator();
      } catch (error) {
        console.warn(`[Ephemeris] Failed to initialize calculator for ${parentKey} satellites:`, error);
        
        // Update status to ERROR for enabled satellites
        sats.forEach(sat => {
          const naifId = satelliteNaifIds[sat.name];
          if (naifId && shouldUseEphemeris(naifId)) {
            const bodyKey = sat.name.toLowerCase() as any;
            useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.ERROR, String(error));
          }
        });
      }
    }
    
    // Process each satellite
    for (const sat of sats) {
      const naifId = satelliteNaifIds[sat.name];
      let useEphemeris = false;
      let satellitePos: THREE.Vector3;
      
      // Check if user enabled high-precision for this satellite
      const shouldUseHighPrecision = naifId && shouldUseEphemeris(naifId);
      
      // Special case: Force Enceladus to use analytical model due to data quality issues
      if (sat.name === 'Enceladus') {
        const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
        satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
        useEphemeris = false;
      } else if (shouldUseHighPrecision && allBodiesCalculator && naifId) {
        // Try to use ephemeris
        try {
          const result = await allBodiesCalculator.calculatePosition(naifId, julianDay);
          if (result.usingEphemeris) {
            // Ephemeris returns planetcentric position
            satellitePos = new THREE.Vector3(
              result.position.x,
              result.position.y,
              result.position.z
            );
            useEphemeris = true;
            
            // Update status to LOADED
            const bodyKey = sat.name.toLowerCase() as any;
            useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.LOADED);
          } else {
            // Ephemeris failed, use analytical
            const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
            satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
          }
        } catch (error) {
          // Error, fall back to analytical
          console.warn(`[Ephemeris] Error for ${sat.name}, using analytical model:`, error);
          const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
          satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
          
          // Update status to ERROR
          const bodyKey = sat.name.toLowerCase() as any;
          useEphemerisStore.getState().setBodyStatus(bodyKey, LoadingStatus.ERROR, String(error));
        }
      } else {
        // User hasn't enabled high-precision, use analytical
        const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
        satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
      }
      
      // Add satellite to bodies array (convert to heliocentric)
      bodies.push({
        name: sat.name,
        x: parentPos.x + satellitePos.x,
        y: parentPos.y + satellitePos.y,
        z: parentPos.z + satellitePos.z,
        r: 0,
        radius: sat.radius,
        color: sat.color,
        parent: parentKey,
        isSatellite: true,
        usingEphemeris: useEphemeris,
      } as unknown as CelestialBody);
    }
  }
}