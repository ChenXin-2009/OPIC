/**
 * ICRS/ICRF ↔ Galactic 坐标变换。
 *
 * 银河系坐标 (l, b) 使用 IAU 1958 定义：
 *   l = 银经 (galactic longitude), 0° 指向银心
 *   b = 银纬 (galactic latitude), 银道面 = 0°
 *
 * 变换矩阵基于 Hipparcos / Gaia 对银河北极和银心的 ICRS 测定。
 *
 * 注意：以下矩阵为占位符（来自 Gaia DR2 文档的 ICRS→Galactic 矩阵）。
 * 正式值应使用 Astropy/ERFA 离线生成 fixture 替换（参见阶段 8）。
 *
 * 银河中心 (Sgr A*) 在 ICRS 中的位置：
 *   RA = 266.4168°, Dec = −29.0078°, d = 8.27 kpc
 *
 * 参见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.8
 */

import { Vector3 } from '@/lib/astronomy/ephemeris/types';

/**
 * ICRS → Galactic 变换矩阵（Astropy 8.0.0 验证）。
 *
 * 来源：scripts/generate_fixtures.py，Astropy 8.0.0 + pyerfa 2.0.1.5
 * 正交性：max|M·Mᵀ − I| < 3e-15
 *
 * 用法：v_galactic = ICRS_TO_GALACTIC × v_icrs（行向量点积）
 *
 * Astropy fixture: fixtures/astropy-frames.json (galactic_to_icrs 字段)
 * 注意：Astropy 输出的行表示目标帧中源基向量的分量，
 * 因此 galactic_to_icrs 字段实际上是 ICRS→Galactic 矩阵。
 */

const ICRS_TO_GALACTIC = [
  [-0.05487565771259165, -0.8734370519556158,  -0.48383507361671546],
  [ 0.49410943719272676, -0.4448297212232952,   0.7469821839866675 ],
  [-0.8676661375596576,  -0.19807633727300053,  0.4559838136873016 ],
];

const GALACTIC_TO_ICRS = [
  [-0.05487565771259165,  0.49410943719272676, -0.8676661375596576 ],
  [-0.8734370519556158,  -0.4448297212232952,  -0.19807633727300053],
  [-0.48383507361671546,  0.7469821839866675,   0.4559838136873016 ],
];

/**
 * 将 ICRS 笛卡尔位置变换到银河系坐标 (l, b, d)。
 *
 * @param icrf - ICRF/ICRS 笛卡尔位置 (AU, 或其他单位，仅方向有意义)
 * @returns { l_deg: 银经(度), b_deg: 银纬(度), distance: 原距离 }
 */
export function icrfToGalactic(icrf: Vector3): { l_deg: number; b_deg: number; distance: number } {
  const x = ICRS_TO_GALACTIC[0][0] * icrf.x + ICRS_TO_GALACTIC[0][1] * icrf.y + ICRS_TO_GALACTIC[0][2] * icrf.z;
  const y = ICRS_TO_GALACTIC[1][0] * icrf.x + ICRS_TO_GALACTIC[1][1] * icrf.y + ICRS_TO_GALACTIC[1][2] * icrf.z;
  const z = ICRS_TO_GALACTIC[2][0] * icrf.x + ICRS_TO_GALACTIC[2][1] * icrf.y + ICRS_TO_GALACTIC[2][2] * icrf.z;

  const distance = Math.sqrt(x * x + y * y + z * z);
  if (distance < 1e-15) return { l_deg: 0, b_deg: 0, distance: 0 };

  const l_rad = Math.atan2(y, x);
  const b_rad = Math.asin(z / distance);

  return {
    l_deg: (l_rad * 180 / Math.PI + 360) % 360,
    b_deg: b_rad * 180 / Math.PI,
    distance,
  };
}

/**
 * 将银河系坐标 (l_deg, b_deg, distance) 变换为 ICRS 笛卡尔。
 *
 * @param l_deg - 银经 (度)
 * @param b_deg - 银纬 (度)
 * @param distance - 距离 (与原单位一致)
 * @returns ICRF/ICRS 笛卡尔位置
 */
export function galacticToIcrf(l_deg: number, b_deg: number, distance: number): Vector3 {
  const l_rad = l_deg * Math.PI / 180;
  const b_rad = b_deg * Math.PI / 180;

  const cosB = Math.cos(b_rad);
  const x_gal = distance * cosB * Math.cos(l_rad);
  const y_gal = distance * cosB * Math.sin(l_rad);
  const z_gal = distance * Math.sin(b_rad);

  return new Vector3(
    GALACTIC_TO_ICRS[0][0] * x_gal + GALACTIC_TO_ICRS[0][1] * y_gal + GALACTIC_TO_ICRS[0][2] * z_gal,
    GALACTIC_TO_ICRS[1][0] * x_gal + GALACTIC_TO_ICRS[1][1] * y_gal + GALACTIC_TO_ICRS[1][2] * z_gal,
    GALACTIC_TO_ICRS[2][0] * x_gal + GALACTIC_TO_ICRS[2][1] * y_gal + GALACTIC_TO_ICRS[2][2] * z_gal
  );
}

/**
 * 银河中心 (Sgr A*) 在 ICRS 中的已知位置。
 *
 * 来源：Gravity Collaboration (2019), A&A 625, L10。
 * 距离：8.27 ± 0.03 kpc。
 */
export const GALACTIC_CENTER_ICRS = {
  ra_deg: 266.4168,
  dec_deg: -29.0078,
  distance_kpc: 8.27,
};
