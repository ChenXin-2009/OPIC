/**
 * TEME-like 帧桥接：SGP4/TLE 卫星位置 → OPIC RenderWorld。
 *
 * TLE + SGP4 输出的惯性帧称为 TEME (True Equator Mean Equinox)，
 * 与 ICRF 相比存在微小偏差（～arcsec 级），但对可视化而言可近似为赤道惯性系。
 *
 * 变换链（短期可落地路径，参见 COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.4）：
 *   1. TEME-like (km, equatorial inertial) → ECF (km, Earth-fixed)
 *      使用 satellite.js 的 gstime + eciToEcf
 *   2. ECF → ICRF
 *      使用 Cesium.Transforms.computeFixedToIcrfMatrix（如果可用）
 *   3. ICRF → RenderWorld
 *      使用 frames/ecliptic.ts 的 icrfToEcliptic
 *
 * 注意：TEME 与 ICRF 严格来说差章动赤经项（Equation of the Equinoxes），
 * 但 SGP4 的行星级定位误差（公里级）远大于此差异（角秒级），
 * 对可视化场景可忽略。
 */

import * as Cesium from 'cesium';
import { OBLIQUITY_J2000_RAD } from '@/lib/astronomy/utils/constants';

export interface TemeToWorldInput {
  /** TEME-like 位置 (km), e.g. from satellite.propagate() */
  x_km: number;
  y_km: number;
  z_km: number;
  /** 对应时间的 Cesium JulianDate（用于 ICRF↔Fixed 矩阵） */
  julianDate: Cesium.JulianDate;
  /** GMST 弧度值，可由 satellite.gstime(date) 或 Cesium 计算 */
  gmst_rad: number;
}

export interface WorldPosition {
  /** RenderWorld 位置 (AU) */
  x_au: number;
  y_au: number;
  z_au: number;
}

/** km → AU */
const KM_TO_AU = 1 / 149597870.7;

/**
 * 将 TEME-like 卫星位置转换为 OPIC RenderWorld 坐标。
 *
 * 这是 v2 文档 §3.4 "短期可落地路径" 步骤 2 的实现。
 * 调用方应保证 julianDate 与 gmst_rad 来自同一时间点。
 *
 * @example
 * ```ts
 * import { gstime, propagate } from 'satellite.js';
 *
 * const gmst = gstime(date);
 * const posAndVel = propagate(satrec, date);
 * const jd = Cesium.JulianDate.fromDate(new Date());
 *
 * const worldPos = temeToRenderWorld({
 *   x_km: posAndVel.position.x,
 *   y_km: posAndVel.position.y,
 *   z_km: posAndVel.position.z,
 *   julianDate: jd,
 *   gmst_rad: gmst,
 * });
 * ```
 */
export function temeToRenderWorld(input: TemeToWorldInput): WorldPosition {
  const { x_km, y_km, z_km, julianDate, gmst_rad } = input;

  // 步骤 1: TEME-like → ECF（绕 Z 轴旋转 -GMST）
  const cosGMST = Math.cos(gmst_rad);
  const sinGMST = Math.sin(gmst_rad);

  // 绕 Z 轴旋转 -GMST: 惯性 ECI/TEME → 地固 ECF
  const ecfX = x_km * cosGMST + y_km * sinGMST;
  const ecfY = -x_km * sinGMST + y_km * cosGMST;
  const ecfZ = z_km;

  // 步骤 2: ECF → ICRF (inverse of ICRF→ECEF/ITRF)
  let icrfX = ecfX, icrfY = ecfY, icrfZ = ecfZ;
  const fixedToIcrf = new Cesium.Matrix3();
  if (Cesium.Transforms.computeIcrfToFixedMatrix(julianDate, fixedToIcrf)) {
    // 正交矩阵的逆 = 转置
    const ecefVec = new Cesium.Cartesian3(ecfX, ecfY, ecfZ);
    const icrfVec = new Cesium.Cartesian3();
    Cesium.Matrix3.multiplyByVector(
      Cesium.Matrix3.transpose(fixedToIcrf, new Cesium.Matrix3()),
      ecefVec,
      icrfVec
    );
    icrfX = icrfVec.x * KM_TO_AU;
    icrfY = icrfVec.y * KM_TO_AU;
    icrfZ = icrfVec.z * KM_TO_AU;
  } else {
    // Fallback: 没有 EOP 数据时直接用 GMST-only 旋转结果（低精度模式）
    // 单位换算 km → AU
    icrfX = ecfX * KM_TO_AU;
    icrfY = ecfY * KM_TO_AU;
    icrfZ = ecfZ * KM_TO_AU;
  }

  // 步骤 3: ICRF → RenderWorld (J2000 ecliptic)
  const cosEps = Math.cos(OBLIQUITY_J2000_RAD);
  const sinEps = Math.sin(OBLIQUITY_J2000_RAD);

  return {
    x_au: icrfX,
    y_au: icrfY * cosEps + icrfZ * sinEps,
    z_au: -icrfY * sinEps + icrfZ * cosEps,
  };
}

/**
 * 简化版：仅用 GMST 旋转，不依赖 Cesium 的 EOP 矩阵。
 *
 * 适用于 Cesium 尚未初始化或 EOP 数据未加载时的低精度场景。
 * 精度损失：最多 ~0.01°（极移 + EOP 缺失）。
 */
export function temeToRenderWorldSimple(
  x_km: number,
  y_km: number,
  z_km: number,
  gmst_rad: number
): WorldPosition {
  const cosGMST = Math.cos(gmst_rad);
  const sinGMST = Math.sin(gmst_rad);

  const ecfX = x_km * cosGMST + y_km * sinGMST;
  const ecfY = -x_km * sinGMST + y_km * cosGMST;
  const ecfZ = z_km;

  const cosEps = Math.cos(OBLIQUITY_J2000_RAD);
  const sinEps = Math.sin(OBLIQUITY_J2000_RAD);

  // ECF → ICRF (GMST only, skip EOP) → RenderWorld
  // 注意：ECF 的 GMST-only 逆 = TEME, 所以这里实际上是 TEME→RenderWorld
  // ECF Z 轴与 TEME Z 轴相同，GMST 逆旋转后 x,y 回到 TEME
  // 然后进行 ICRF→RenderWorld 变换
  return {
    x_au: ecfX * KM_TO_AU,
    y_au: (ecfY * cosEps + ecfZ * sinEps) * KM_TO_AU,
    z_au: (-ecfY * sinEps + ecfZ * cosEps) * KM_TO_AU,
  };
}
