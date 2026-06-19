/**
 * 系外行星坐标变换 (Exoplanet Coordinate Transforms)
 *
 * 将系外行星宿主星从 ICRS/ICRF 天球坐标系转换到 OPIC RenderWorld 笛卡尔坐标系。
 * 提供恒星/行星半径的 AU 换算、颜色映射等辅助功能。
 */

import * as THREE from 'three';
import { PARSEC_TO_AU } from '@/lib/constants/units';

const SOLAR_RADIUS_TO_AU = 0.00465047;

/**
 * 将系外行星宿主星的 ICRS/ICRF 球面坐标（RA, Dec, distance）转换为 OPIC RenderWorld 笛卡尔坐标。
 *
 * 变换链（参见 COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.7）：
 *   1. ICRS 球面 (RA, Dec, d_pc) → ICRF 笛卡尔 (AU)
 *      x_i = d_au * cos(δ) * cos(α)
 *      y_i = d_au * cos(δ) * sin(α)
 *      z_i = d_au * sin(δ)
 *   2. ICRF 笛卡尔 → RenderWorld 笛卡尔 (J2000 mean ecliptic)
 *      绕 X 轴旋转 -ε（黄赤交角 ε = 23.43928°）
 *
 * 旧版直接将 RA/Dec 映射到 Three.js Y-up（x=cosδ·cosα, y=sinδ），
 * 导致与黄道面差 23.4°。此修正使系外行星宿主星方向与太阳系黄道面一致。
 *
 * @param raDeg - 赤经 (度)
 * @param decDeg - 赤纬 (度)
 * @param distancePc - 距离 (秒差距)
 * @returns RenderWorld 坐标 (AU)，X 春分点 · Z 黄道北极
 */
export function exoplanetEquatorialToCartesian(
  raDeg: number,
  decDeg: number,
  distancePc: number
): THREE.Vector3 {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  const distanceAU = distancePc * PARSEC_TO_AU;

  // 步骤 1: ICRS 球面 → ICRF 笛卡尔
  const cosDec = Math.cos(dec);
  const xi = distanceAU * cosDec * Math.cos(ra);
  const yi = distanceAU * cosDec * Math.sin(ra);
  const zi = distanceAU * Math.sin(dec);

  // 步骤 2: ICRF → RenderWorld (J2000 mean ecliptic)
  const epsilon = 23.43928 * Math.PI / 180;
  const cosEps = Math.cos(epsilon);
  const sinEps = Math.sin(epsilon);

  return new THREE.Vector3(
    xi,
    yi * cosEps + zi * sinEps,
    -yi * sinEps + zi * cosEps
  );
}

/** 将恒星半径从太阳半径转换为 AU，最小值为太阳半径的 15% */
export function stellarRadiusSolarToAU(radiusSolar?: number): number {
  return Math.max((radiusSolar ?? 1) * SOLAR_RADIUS_TO_AU, SOLAR_RADIUS_TO_AU * 0.15);
}

/** 根据恒星表面温度 (K) 返回对应的 Three.js 颜色（O/B/A/F/G/K/M 光谱色） */
export function stellarColorFromTemperature(temperatureK?: number): THREE.Color {
  if (!temperatureK || !Number.isFinite(temperatureK)) {
    return new THREE.Color(0xfff4ea);
  }

  const t = Math.max(1800, Math.min(40000, temperatureK));
  if (t >= 30000) return new THREE.Color(0x9bb0ff);
  if (t >= 10000) return new THREE.Color(0xb8c8ff);
  if (t >= 7500) return new THREE.Color(0xd9e4ff);
  if (t >= 6000) return new THREE.Color(0xfff7e8);
  if (t >= 5200) return new THREE.Color(0xffe1b5);
  if (t >= 3700) return new THREE.Color(0xffb56b);
  return new THREE.Color(0xff7a45);
}

/** 根据行星半径和平衡温度返回渲染颜色（类地/类木/热木星区分） */
export function planetColorFromRadius(radiusEarth?: number, equilibriumTemperatureK?: number): THREE.Color {
  if (equilibriumTemperatureK && equilibriumTemperatureK > 1000) {
    return new THREE.Color(0xff9a55);
  }

  const radius = radiusEarth ?? 1;
  if (radius < 1.4) return new THREE.Color(0x7fc6ff);
  if (radius < 2.5) return new THREE.Color(0x8fe0b2);
  if (radius < 6) return new THREE.Color(0xd8c690);
  return new THREE.Color(0xe0a36f);
}

/** 根据开普勒第三定律估算行星半半轴 (AU)：a³ = M * P² */
export function estimateSemiMajorAxisAU(periodDays?: number, stellarMassSolar?: number): number | undefined {
  if (!periodDays || !Number.isFinite(periodDays) || periodDays <= 0) {
    return undefined;
  }

  const periodYears = periodDays / 365.25;
  const mass = stellarMassSolar && stellarMassSolar > 0 ? stellarMassSolar : 1;
  return Math.cbrt(mass * periodYears * periodYears);
}

/** 安全格式化数值，undefined/null/NaN 返回 "-" */
export function formatMaybe(value: number | undefined, digits = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }
  return value.toFixed(digits);
}

/**
 * 判断系外行星轨道是否为示意性（缺少真实三维朝向数据）。
 *
 * NASA Exoplanet Archive 的 pscomppars 表只提供 inclination，不提供
 * Omega（升交点经度）。缺少 Omega 时无法确定轨道平面在空间中的真实朝向，
 * 轨道只能显示为示意性，不应声称物理朝向正确。
 *
 * 参见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.7
 *
 * @param omegaDeg - 升交点经度 (度)，来自 ExoplanetPlanet.omegaDeg
 * @returns true 如果轨道缺少 Omega（为示意性）
 */
export function isSchematicOrbit(omegaDeg?: number): boolean {
  return omegaDeg === undefined || omegaDeg === null || !Number.isFinite(omegaDeg);
}
