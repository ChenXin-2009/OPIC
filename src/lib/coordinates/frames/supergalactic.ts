/**
 * ICRS ↔ Supergalactic 变换矩阵（Astropy 8.0.0 验证）。
 *
 * 来源：scripts/generate_fixtures.py (运行于 2026-06-19)
 * Astropy 版本：8.0.0 + pyerfa 2.0.1.5
 * 正交性验证：max|M·Mᵀ − I| < 3e-15
 *
 * ICRS → Supergalactic 矩阵：
 *   [[ 0.3750155557030316, -0.8983204377276124,  0.22887490937543714],
 *    [ 0.3413588718562472, -0.09572710024885119,-0.9350456902649066 ],
 *    [ 0.861880185168319,   0.4287851600030194,  0.2707504994924459 ]]
 *
 * Supergalactic Cartesian: X = SGL=0° SGB=0°, Z = 超星系北极 (SGB=90°)
 */

import { Vector3 } from '@/lib/astronomy/ephemeris/types';

const ICRF_TO_SUPERGALACTIC = [
  [ 0.3750155557030316, -0.8983204377276124,  0.22887490937543714],
  [ 0.3413588718562472, -0.09572710024885119,-0.9350456902649066 ],
  [ 0.861880185168319,   0.4287851600030194,  0.2707504994924459 ],
];

const SUPERGALACTIC_TO_ICRF = [
  [ 0.3750155557030316,  0.3413588718562472,  0.861880185168319 ],
  [-0.8983204377276124, -0.09572710024885119, 0.4287851600030194],
  [ 0.22887490937543714,-0.9350456902649066,  0.2707504994924459 ],
];

/**
 * Supergalactic → ICRF 矩阵的原始数值导出。
 * 供 THREE.js 等外部库直接使用，无需创建 Vector3 实例。
 */
export const SUPERGALACTIC_TO_ICRF_RAW: ReadonlyArray<ReadonlyArray<number>> = SUPERGALACTIC_TO_ICRF;

/**
 * 将 ICRS 笛卡尔变换到 Supergalactic Cartesian。
 *
 * Supergalactic Cartesian: X = SGL=0°, SGB=0°; Z = 超星系北极
 * 输入输出使用同一距离单位。
 *
 * @param icrf - ICRF/ICRS 笛卡尔位置
 * @returns Supergalactic Cartesian 位置（新实例）
 */
export function icrfToSupergalactic(icrf: Vector3): Vector3 {
  const m = ICRF_TO_SUPERGALACTIC;
  return new Vector3(
    m[0][0] * icrf.x + m[0][1] * icrf.y + m[0][2] * icrf.z,
    m[1][0] * icrf.x + m[1][1] * icrf.y + m[1][2] * icrf.z,
    m[2][0] * icrf.x + m[2][1] * icrf.y + m[2][2] * icrf.z
  );
}

/**
 * 将 Supergalactic Cartesian 变换回 ICRS。
 *
 * @param sgl - Supergalactic Cartesian 位置
 * @returns ICRF/ICRS 笛卡尔位置（新实例）
 */
export function supergalacticToIcrf(sgl: Vector3): Vector3 {
  const m = SUPERGALACTIC_TO_ICRF;
  return new Vector3(
    m[0][0] * sgl.x + m[0][1] * sgl.y + m[0][2] * sgl.z,
    m[1][0] * sgl.x + m[1][1] * sgl.y + m[1][2] * sgl.z,
    m[2][0] * sgl.x + m[2][1] * sgl.y + m[2][2] * sgl.z
  );
}

/** supergalacticToRenderWorld = icrfToEcliptic ∘ supergalacticToIcrf */
export function supergalacticToRenderWorld(
  icrfToEclipticFn: (v: Vector3) => Vector3,
  sgl: Vector3
): Vector3 {
  return icrfToEclipticFn(supergalacticToIcrf(sgl));
}
