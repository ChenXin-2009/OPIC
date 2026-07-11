/**
 * @module flight-dynamics/atmosphere
 * @description 指数大气模型
 *
 * 提供地球大气密度查询，使用简化的指数衰减模型。
 * 仅在海拔 < 大气截止高度时返回非零密度，高于截止高度返回 0。
 *
 * 模型：ρ(h) = ρ₀ · exp(-h / H)
 *
 * @unit SI 国际单位制
 * - 海拔：米 (m)
 * - 密度：kg/m³
 *
 * @references
 * - 美国标准大气 1976 (USSA-76) 简化版
 * - Vallado, Fundamentals of Astrodynamics, §8.3
 */

/** 地球海平面大气密度 (kg/m³) */
export const RHO_0_EARTH = 1.225;

/** 地球大气标高 (m) */
export const SCALE_HEIGHT_EARTH = 8_500;

/** 大气截止高度 (m) — 高于此值密度归零 */
export const ATMOSPHERE_CUTOFF_M = 100_000; // 100 km (Kármán 线)

// ---------------------------------------------------------------------------
// 火星大气参数（Phase 4 预留）
// ---------------------------------------------------------------------------

/** 火星海平面大气密度 (kg/m³) */
export const RHO_0_MARS = 0.020;

/** 火星大气标高 (m) */
export const SCALE_HEIGHT_MARS = 11_100;

// ---------------------------------------------------------------------------
// 密度计算
// ---------------------------------------------------------------------------

/**
 * 计算地球大气密度。
 *
 * @param altitude 海拔 (m)，地心距离 - 地球半径
 * @returns        密度 (kg/m³)，海拔 > 100km 时返回 0
 */
export function earthAtmosphereDensity(altitude: number): number {
  if (altitude >= ATMOSPHERE_CUTOFF_M || altitude < 0) {
    return 0;
  }
  return RHO_0_EARTH * Math.exp(-altitude / SCALE_HEIGHT_EARTH);
}

/**
 * 计算火星大气密度（Phase 4 预留）。
 *
 * @param altitude 海拔 (m)
 * @returns        密度 (kg/m³)
 */
export function marsAtmosphereDensity(altitude: number): number {
  const marsCutoff = 125_000; // 火星大气更稀薄但截止更高
  if (altitude >= marsCutoff || altitude < 0) {
    return 0;
  }
  return RHO_0_MARS * Math.exp(-altitude / SCALE_HEIGHT_MARS);
}

/**
 * 通用大气密度查询（按天体名称）。
 *
 * @param bodyName 天体名称（'earth' | 'mars'）
 * @param altitude 海拔 (m)
 * @returns        密度 (kg/m³)
 */
export function atmosphereDensity(bodyName: string, altitude: number): number {
  switch (bodyName.toLowerCase()) {
    case 'earth':
      return earthAtmosphereDensity(altitude);
    case 'mars':
      return marsAtmosphereDensity(altitude);
    default:
      return 0;
  }
}

/**
 * 计算动压 q = 0.5 · ρ · v²。
 * 用于结构过载判定（Phase 4 失败模式）。
 *
 * @param density  大气密度 (kg/m³)
 * @param speed    速度大小 (m/s)
 * @returns        动压 (Pa)
 */
export function dynamicPressure(density: number, speed: number): number {
  return 0.5 * density * speed * speed;
}
