/**
 * Ecliptic frame transformation: ICRF/ICRS (J2000 equatorial) ↔ RenderWorld (J2000 ecliptic).
 *
 * OPIC 的 RenderWorld 定义为 J2000 mean ecliptic：
 *   X = J2000 mean equinox / ecliptic longitude 0°
 *   Y = ecliptic longitude 90°, inside ecliptic plane
 *   Z = north ecliptic pole
 *   单位：AU
 *
 * ICRF/ICRS 是 J2000 mean equatorial 惯性系：
 *   X = J2000 mean equinox
 *   Y = equatorial plane, RA 6h
 *   Z = north celestial pole
 *
 * 两者只差一个绕 X 轴的旋转，角度为黄赤交角 ε (obliquity of the ecliptic)。
 * 为避免 R_x(+ε)/R_x(-ε) 符号歧义，本文件只使用显式分量公式，并配测试向量。
 *
 * 测试向量（见 __tests__/ecliptic.test.ts）：
 *   ICRF +X → RenderWorld +X
 *   ICRF +Z → RenderWorld (0, sin ε, cos ε)
 *   RenderWorld +Z → ICRF (0, -sin ε, cos ε)
 *
 * 参考：
 * - 现有实现 src/lib/astronomy/ephemeris/coordinates.ts:80-127（数学一致）
 * - IAU SOFA / astronomy-engine 约定
 */

import { Vector3 } from '@/lib/astronomy/ephemeris/types';

/**
 * J2000.0 mean obliquity of the ecliptic.
 *
 * 来源：IAU 1976 天文常数，ε(J2000) = 23°26′21.448″ = 23.43928°。
 * 弧度值 = 0.40909280422232897。
 * 该角度随岁差缓慢变化，对于可视化用途使用固定 J2000 值已足够。
 */
export const OBLIQUITY_J2000_DEG = 23.43928;
export const OBLIQUITY_J2000_RAD = OBLIQUITY_J2000_DEG * Math.PI / 180;

/** cos(ε_J2000)，预计算避免热路径重复调用 Math.cos。 */
const COS_EPS = Math.cos(OBLIQUITY_J2000_RAD);
/** sin(ε_J2000)，预计算避免热路径重复调用 Math.sin。 */
const SIN_EPS = Math.sin(OBLIQUITY_J2000_RAD);

/**
 * 将 ICRF/ICRS (J2000 赤道惯性系) 位置变换到 OPIC RenderWorld (J2000 黄道系)。
 *
 * 显式分量公式（不写 R_x 符号，避免符号歧义）：
 *   x_w =  x_i
 *   y_w =  y_i * cos(ε) + z_i * sin(ε)
 *   z_w = -y_i * sin(ε) + z_i * cos(ε)
 *
 * 输入输出单位均为 AU，输入向量不被修改。
 *
 * @param icrf - ICRF 位置向量（AU）
 * @returns RenderWorld 位置向量（AU，新实例）
 *
 * @example
 * ```ts
 * import { icrfToEcliptic } from '@/lib/coordinates/frames/ecliptic';
 * import { Vector3 } from '@/lib/astronomy/ephemeris/types';
 *
 * // 天球北极方向（ICRF +Z）应映射到黄道北极附近
 * const celestialPole = new Vector3(0, 0, 1);
 * const eclipticPole = icrfToEcliptic(celestialPole);
 * // 结果 ≈ (0, sin ε, cos ε) ≈ (0, 0.3978, 0.9175)
 * ```
 */
export function icrfToEcliptic(icrf: Vector3): Vector3 {
  return new Vector3(
    icrf.x,
    icrf.y * COS_EPS + icrf.z * SIN_EPS,
    -icrf.y * SIN_EPS + icrf.z * COS_EPS
  );
}

/**
 * 将 OPIC RenderWorld (J2000 黄道系) 位置变换回 ICRF/ICRS (J2000 赤道惯性系)。
 *
 * 这是 {@link icrfToEcliptic} 的严格逆变换：
 *   x_i =  x_w
 *   y_i =  y_w * cos(ε) - z_w * sin(ε)
 *   z_i =  y_w * sin(ε) + z_w * cos(ε)
 *
 * 输入输出单位均为 AU，输入向量不被修改。
 *
 * @param ecliptic - RenderWorld 位置向量（AU）
 * @returns ICRF 位置向量（AU，新实例）
 */
export function eclipticToIcrf(ecliptic: Vector3): Vector3 {
  return new Vector3(
    ecliptic.x,
    ecliptic.y * COS_EPS - ecliptic.z * SIN_EPS,
    ecliptic.y * SIN_EPS + ecliptic.z * COS_EPS
  );
}

/**
 * 兼容别名：RenderWorld 在 OPIC 上下文中即 J2000 黄道系。
 * `icrfToRenderWorld` 与 {@link icrfToEcliptic} 等价，命名上更贴近 OPIC 渲染层语义。
 */
export const icrfToRenderWorld = icrfToEcliptic;

/**
 * 兼容别名：{@link eclipticToIcrf} 的渲染层语义命名。
 */
export const renderWorldToIcrf = eclipticToIcrf;
