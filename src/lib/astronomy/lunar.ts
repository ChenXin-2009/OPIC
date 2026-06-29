/**
 * 月球天文计算模块 (Lunar Astronomy Module)
 *
 * 基于 astronomy-engine (cosinekitty) 提供纯函数的月球天文计算。
 * 所有输出均为纯数值，可被 AI 通过断言直接验证，无需人工视觉反馈。
 *
 * 核心设计原则：
 * 1. 零外部依赖（除 astronomy-engine）
 * 2. 所有输出可被程序化验证 (assertable)
 * 3. 与 OPIC 现有坐标系兼容 (J2000 mean equator)
 *
 * API 参考: https://github.com/cosinekitty/astronomy
 * 精度: ±1 角分（对比 JPL Horizons 验证）
 */

import {
  Body,
  GeoMoon,
  MoonPhase,
  Libration,
  Illumination,
  AstroTime,
  SearchLunarApsis,
  SearchLunarEclipse,
  type Vector,
  type LibrationInfo,
  type IlluminationInfo,
  type Apsis,
  type LunarEclipseInfo,
} from 'astronomy-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 月相计算结果 */
export interface MoonPhaseResult {
  /** 月相角 (0~360°)，0=新月, 90=上弦, 180=满月, 270=下弦 */
  angle: number;
  /** 被照亮的比例 (0~1)，1=满月, 0=新月 */
  illumination: number;
  /** 月相名称 (中文) */
  phaseName: string;
}

/** 月球天平动计算结果 */
export interface LunarLibrationResult {
  /** 经度天平动 (度) */
  elon: number;
  /** 纬度天平动 (度) */
  elat: number;
  /** 月球中心黄经 (度) */
  mlon: number;
  /** 月球中心黄纬 (度) */
  mlat: number;
  /** 地月距离 (km) */
  dist_km: number;
  /** 视直径 (度) */
  diam_deg: number;
}

/** 月球光照详细信息 */
export interface LunarIlluminationResult {
  /** 相位角 (度) */
  phase_angle: number;
  /** 被照亮的比例 (0~1) */
  phase_fraction: number;
  /** 视星等 */
  magnitude: number;
  /** 日心距离 (AU) */
  helio_dist: number;
  /** 地心距离 (AU) */
  geo_dist: number;
}

/** 月球近地点/远地点结果 */
export interface LunarApsisResult {
  /** 类型：perigee(近地点) 或 apogee(远地点) */
  kind: 'perigee' | 'apogee';
  /** 事件时间 (JS Date) */
  time: Date;
  /** 地月距离 (km) */
  dist_km: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 将 JS Date 转为 astronomy-engine 的 AstroTime。
 * 接收 Date 或 number (Julian Day UT)，内部由 astronomy-engine 处理 TT 转换。
 */
export function toAstroTime(date: Date | number): AstroTime {
  return new AstroTime(date);
}

/**
 * 月相角 → 中文名称映射。
 * 基于黄经差范围对月相进行分段命名。
 */
const PHASE_BOUNDARIES: { max: number; name: string }[] = [
  { max: 0, name: '新月' },
  { max: 45, name: '蛾眉月' },
  { max: 90, name: '上弦月' },
  { max: 135, name: '盈凸月' },
  { max: 180, name: '满月' },
  { max: 225, name: '亏凸月' },
  { max: 270, name: '下弦月' },
  { max: 315, name: '残月' },
  { max: 360, name: '新月' },
];

function phaseAngleToName(angle: number): string {
  const normalized = ((angle % 360) + 360) % 360;
  for (const boundary of PHASE_BOUNDARIES) {
    if (normalized <= boundary.max) return boundary.name;
  }
  return '新月';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 计算月球在指定时刻的地心位置 (J2000 平赤道坐标)。
 *
 * @param date - JS Date 或 AstroTime
 * @returns Vector { x, y, z } 单位 AU，原点为地球中心
 *
 * @example 验证方法
 * ```ts
 * const pos = getMoonPosition(new Date('2025-01-01T00:00:00Z'));
 * assert(Math.abs(pos.Length() * 149597870.7 - 384400) < 50000, '地月距离偏差过大');
 * ```
 */
export function getMoonPosition(date: Date | AstroTime): Vector {
  return GeoMoon(date instanceof AstroTime ? date : toAstroTime(date));
}

/**
 * 计算月相。
 * 月相角基于太阳-月球黄经差（地心视角）。
 *
 * @param date - JS Date 或 AstroTime
 * @returns MoonPhaseResult
 *
 * @example AI 验证断言
 * ```ts
 * const phase = getMoonPhase(new Date('2025-01-29T12:36:00Z')); // 约满月
 * assert(phase.angle > 170 && phase.angle < 190, `满月附近应为180°，实际：${phase.angle}`);
 * assert(phase.illumination > 0.95, '满月 illumination 应 > 0.95');
 * ```
 */
export function getMoonPhase(date: Date | AstroTime): MoonPhaseResult {
  const time = date instanceof AstroTime ? date : toAstroTime(date);
  const angle = MoonPhase(time);
  const illum = Illumination(Body.Moon, time);
  return {
    angle,
    illumination: illum.phase_fraction,
    phaseName: phaseAngleToName(angle),
  };
}

/**
 * 计算月球天平动和视几何参数。
 * 天平动是月球绕地球运动时的视晃动效应，由非完美潮汐锁定导致。
 *
 * @param date - JS Date 或 AstroTime
 * @returns LunarLibrationResult
 *
 * @example AI 验证断言
 * ```ts
 * const lib = getLunarLibration(new Date());
 * assert(lib.elon >= -10 && lib.elon <= 10, `经度天平动超范围：${lib.elon}`);
 * assert(lib.elat >= -7 && lib.elat <= 7, `纬度天平动超范围：${lib.elat}`);
 * assert(lib.dist_km > 356000 && lib.dist_km < 407000, `地月距离超范围：${lib.dist_km}`);
 * ```
 */
export function getLunarLibration(date: Date | AstroTime): LunarLibrationResult {
  const time = date instanceof AstroTime ? date : toAstroTime(date);
  const info = Libration(time);
  return {
    elon: info.elon,
    elat: info.elat,
    mlon: info.mlon,
    mlat: info.mlat,
    dist_km: info.dist_km,
    diam_deg: info.diam_deg,
  };
}

/**
 * 计算地月距离 (km)。
 * 便捷方法，等价于 getLunarLibration(date).dist_km。
 *
 * @param date - JS Date 或 AstroTime
 * @returns 地月距离 (km)，范围 356,000 ~ 407,000
 *
 * @example AI 验证断言
 * ```ts
 * const dist = getEarthMoonDistance(new Date());
 * assert(dist > 356000 && dist < 407000, `距离超范围：${dist} km`);
 * ```
 */
export function getEarthMoonDistance(date: Date | AstroTime): number {
  return getLunarLibration(date).dist_km;
}

/**
 * 计算月球详细光照信息。
 * 包括相位角、照亮比例、视星等、日心/地心距离。
 *
 * @param date - JS Date 或 AstroTime
 * @returns LunarIlluminationResult
 *
 * @example AI 验证断言
 * ```ts
 * const illum = getLunarIllumination(new Date());
 * assert(illum.phase_angle >= 0 && illum.phase_angle <= 180,
 *   `相位角范围 [0,180]，实际：${illum.phase_angle}`);
 * assert(illum.phase_fraction >= 0 && illum.phase_fraction <= 1,
 *   `照亮比例范围 [0,1]，实际：${illum.phase_fraction}`);
 * assert(illum.geo_dist > 0.0023 && illum.geo_dist < 0.0028,
 *   `地心距离范围 [0.0023,0.0028] AU，实际：${illum.geo_dist}`);
 * ```
 */
export function getLunarIllumination(date: Date | AstroTime): LunarIlluminationResult {
  const time = date instanceof AstroTime ? date : toAstroTime(date);
  const info = Illumination(Body.Moon, time);
  return {
    phase_angle: info.phase_angle,
    phase_fraction: info.phase_fraction,
    magnitude: info.mag,
    helio_dist: info.helio_dist,
    geo_dist: info.geo_dist,
  };
}

/**
 * 搜索下一次月球近地点或远地点。
 * 从指定时刻开始，搜索最近的近地点或远地点事件。
 *
 * @param startDate - 起始搜索时刻
 * @returns LunarApsisResult
 *
 * @example AI 验证断言
 * ```ts
 * const apsis = getNextLunarApsis(new Date());
 * assert(apsis.kind === 'perigee' || apsis.kind === 'apogee', '无效类型');
 * assert(apsis.dist_km > 350000 && apsis.dist_km < 410000, '距离超范围');
 * ```
 */
export function getNextLunarApsis(startDate: Date | AstroTime): LunarApsisResult {
  const time = startDate instanceof AstroTime ? startDate : toAstroTime(startDate);
  const apsis = SearchLunarApsis(time);
  return {
    kind: apsis.kind === 0 ? 'perigee' : 'apogee',
    time: apsis.time.date,
    dist_km: apsis.dist_au * 149597870.7, // AU → km
  };
}

/**
 * 搜索下一次月食。
 * 从指定时刻开始，搜索下一次月食事件。
 *
 * @param startDate - 起始搜索时刻
 * @returns LunarEclipseInfo (astronomy-engine 原始对象)
 *
 * @example AI 验证断言
 * ```ts
 * const eclipse = getNextLunarEclipse(new Date());
 * assert(eclipse.kind === 'penumbral' || eclipse.kind === 'partial' || eclipse.kind === 'total',
 *   `未知月食类型：${eclipse.kind}`);
 * assert(eclipse.peak !== null, '月食峰值为空');
 * ```
 */
export function getNextLunarEclipse(startDate: Date | AstroTime): LunarEclipseInfo {
  const time = startDate instanceof AstroTime ? startDate : toAstroTime(startDate);
  return SearchLunarEclipse(time);
}

/**
 * 获取日下点 (Sub-Solar Point) 的近似计算。
 * 日下点为月球表面太阳直射点，用于光照计算。
 *
 * 使用 Illumination API 的相位角和天平动信息估算。
 * lon=0 在月球正面中心，正东为正方向。
 * 简化算法：日下点经度 ≈ -phase_angle (光照来自太阳方向)
 *
 * @param date - JS Date 或 AstroTime
 * @returns { lon: number, lat: number } 经度和纬度（度）
 */
export function getSubSolarPoint(date: Date | AstroTime): { lon: number; lat: number } {
  const time = date instanceof AstroTime ? date : toAstroTime(date);
  const libration = Libration(time);
  const illumination = Illumination(Body.Moon, time);

  // 日下点经度：光照来自太阳方向，与观测者的相位角相反
  // 叠加光学天平动偏移
  const phaseRad = (illumination.phase_angle * Math.PI) / 180;
  const subSolarLon = -(illumination.phase_angle) + libration.elon;

  // 日下点纬度近似天平动的纬度分量
  const subSolarLat = libration.elat;

  // 归一化经度到 [-180, 180]
  const normalizedLon = ((subSolarLon % 360) + 540) % 360 - 180;

  return {
    lon: normalizedLon,
    lat: subSolarLat,
  };
}

/**
 * 计算月球正面面心点 (Sub-Earth Point) = 可见面中心。
 * 即从地球观察者视角下的月面中心点经纬度。
 * 受光学天平动影响，该点并非固定，会随时间在 ±8° 经纬度范围内晃动。
 *
 * @param date - JS Date 或 AstroTime
 * @returns { lon: number, lat: number } 经度和纬度（度）
 */
export function getSubEarthPoint(date: Date | AstroTime): { lon: number; lat: number } {
  const time = date instanceof AstroTime ? date : toAstroTime(date);
  const libration = Libration(time);
  return {
    lon: libration.elon,
    lat: libration.elat,
  };
}

/** 预计算的天平动合理范围（用于绝对值断言） */
export const LIBRATION_RANGE = {
  ELON_MIN: -10,
  ELON_MAX: 10,
  ELAT_MIN: -7,
  ELAT_MAX: 7,
  DIST_KM_MIN: 356000,
  DIST_KM_MAX: 407000,
  DIAM_DEG_MIN: 0.49,
  DIAM_DEG_MAX: 0.56,
} as const;
