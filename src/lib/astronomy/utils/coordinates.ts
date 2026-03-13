/**
 * @module astronomy/utils/coordinates
 * @description 天文坐标变换模块
 * 
 * 本模块提供天文计算中的坐标变换工具，包括轨道平面坐标到黄道坐标的转换。
 * 
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层（算法层）
 * - 职责边界：负责坐标系统之间的数学变换，不涉及物理计算或数据管理
 * 
 * @dependencies
 * - 直接依赖：无
 * - 被依赖：astronomy/orbit, astronomy/utils/index
 * - 循环依赖：无
 * 
 * @coordinateSystem 支持轨道平面坐标系和黄道坐标系（J2000.0）
 * @unit 位置：AU（天文单位），角度：弧度（radians）
 * @precision 数值精度约 1e-10 AU（约 15 米）
 * 
 * 坐标系统说明：
 * - 轨道平面坐标：以轨道平面为基准，x 轴指向近日点
 * - 黄道坐标：日心黄道坐标系（J2000.0），x 轴指向春分点
 * - 赤道坐标：赤经赤纬系统（本模块未实现）
 * 
 * 参考文献：Jean Meeus - Astronomical Algorithms (2nd Ed.)
 * 
 * @example
 * ```typescript
 * import { orbitalToEcliptic, argumentOfPeriapsis } from './coordinates';
 * 
 * // 轨道平面到黄道坐标的转换
 * const pos = orbitalToEcliptic(1.0, 0.0, {
 *   w: 0,
 *   Omega: 0,
 *   i: 0
 * });
 * console.log(pos); // { x: 1, y: 0, z: 0 }
 * ```
 */

/**
 * Represents a 3D position in space.
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Orbital elements needed for coordinate transformations.
 */
export interface OrbitalOrientation {
  /** Argument of periapsis (ω) in radians */
  w: number;
  /** Longitude of ascending node (Ω) in radians */
  Omega: number;
  /** Orbital inclination (i) in radians */
  i: number;
}

/**
 * 将轨道平面坐标转换为黄道坐标
 * 
 * @description 将天体在轨道平面中的位置转换为日心黄道坐标系（J2000.0）。
 * 这是计算行星位置的关键步骤，涉及三次旋转变换。
 * 
 * @coordinateSystem 
 * - 输入：轨道平面坐标系（x 轴指向近日点）
 * - 输出：日心黄道坐标系（J2000.0，x 轴指向春分点）
 * 
 * @unit 输入输出均为 AU（天文单位）
 * @precision 数值精度约 1e-10 AU（约 15 米）
 * 
 * 变换步骤：
 * 1. 在轨道平面内旋转近日点幅角（ω）
 * 2. 绕交线旋转轨道倾角（i）
 * 3. 绕黄道极旋转升交点黄经（Ω）
 * 
 * 旋转矩阵：R_z(Ω) * R_x(i) * R_z(ω)
 * 
 * @param {number} x_orb - 轨道平面 X 坐标（AU）
 * @param {number} y_orb - 轨道平面 Y 坐标（AU）
 * @param {OrbitalOrientation} orientation - 轨道方向角
 * @param {number} orientation.w - 近日点幅角（弧度）
 * @param {number} orientation.Omega - 升交点黄经（弧度）
 * @param {number} orientation.i - 轨道倾角（弧度）
 * @returns {Position3D} 黄道坐标系中的位置（AU）
 * 
 * @complexity 时间复杂度 O(1)，空间复杂度 O(1)
 * @performance 执行时间 < 0.001ms，适合实时计算
 * 
 * @example
 * ```typescript
 * // 无倾角无旋转的轨道
 * const pos = orbitalToEcliptic(1.0, 0.0, {
 *   w: 0,
 *   Omega: 0,
 *   i: 0
 * });
 * console.log(pos); // { x: 1, y: 0, z: 0 }
 * 
 * // 倾斜 30° 的轨道
 * const pos2 = orbitalToEcliptic(1.0, 0.0, {
 *   w: 0,
 *   Omega: 0,
 *   i: Math.PI / 6
 * });
 * console.log(pos2); // { x: 1, y: 0, z: 0 }（近日点在交线上）
 * ```
 */
export function orbitalToEcliptic(
  x_orb: number,
  y_orb: number,
  orientation: OrbitalOrientation
): Position3D {
  const { w, Omega, i } = orientation;

  // Precompute trigonometric values
  const cos_w = Math.cos(w);
  const sin_w = Math.sin(w);
  const cos_O = Math.cos(Omega);
  const sin_O = Math.sin(Omega);
  const cos_i = Math.cos(i);
  const sin_i = Math.sin(i);

  // Transform from orbital plane to ecliptic coordinates
  // Using rotation matrices: R_z(Ω) * R_x(i) * R_z(ω)
  const x = (cos_w * cos_O - sin_w * sin_O * cos_i) * x_orb +
            (-sin_w * cos_O - cos_w * sin_O * cos_i) * y_orb;

  const y = (cos_w * sin_O + sin_w * cos_O * cos_i) * x_orb +
            (-sin_w * sin_O + cos_w * cos_O * cos_i) * y_orb;

  const z = (sin_w * sin_i) * x_orb +
            (cos_w * sin_i) * y_orb;

  return { x, y, z };
}

/**
 * 从近日点黄经计算近日点幅角
 * 
 * @description 近日点幅角（ω）是从升交点到近日点的角度，在轨道平面内测量。
 * 
 * @coordinateSystem 角度在轨道平面内测量
 * @unit 输入输出均为弧度（radians）
 * @precision 精度取决于输入参数精度，通常约 1e-10 弧度
 * 
 * 公式：ω = ϖ - Ω
 * 其中：
 * - ϖ (w_bar) 是近日点黄经
 * - Ω (Omega) 是升交点黄经
 * - ω (w) 是近日点幅角
 * 
 * 物理意义：
 * - 近日点黄经是从春分点到近日点的角度（在黄道面内）
 * - 升交点黄经是从春分点到升交点的角度（在黄道面内）
 * - 近日点幅角是从升交点到近日点的角度（在轨道平面内）
 * 
 * @param {number} w_bar - 近日点黄经（弧度）
 * @param {number} Omega - 升交点黄经（弧度）
 * @returns {number} 近日点幅角（弧度）
 * 
 * @complexity 时间复杂度 O(1)
 * @performance 执行时间 < 0.001ms
 * 
 * @example
 * ```typescript
 * const w = argumentOfPeriapsis(1.5, 0.5);
 * console.log(w); // 1.0 弧度
 * 
 * // 地球的近日点幅角（J2000.0）
 * const w_earth = argumentOfPeriapsis(
 *   102.93768193 * Math.PI / 180,  // 近日点黄经
 *   0                                // 升交点黄经
 * );
 * ```
 */
export function argumentOfPeriapsis(w_bar: number, Omega: number): number {
  return w_bar - Omega;
}

/**
 * 从平黄经计算平近点角
 * 
 * @description 平近点角（M）是天体在轨道上运动的时间参数，表示自上次过近日点以来
 * 经过的轨道周期比例（以角度表示）。
 * 
 * @coordinateSystem 角度在轨道平面内测量，从近日点方向开始
 * @unit 输入输出均为弧度（radians）
 * @precision 精度取决于输入参数精度，通常约 1e-10 弧度
 * 
 * 公式：M = L - ϖ
 * 其中：
 * - L 是平黄经（mean longitude）
 * - ϖ (w_bar) 是近日点黄经
 * - M 是平近点角
 * 
 * 物理意义：
 * - 平黄经是假设天体以恒定角速度运动时的黄经
 * - 平近点角描述天体在轨道周期中的位置
 * - M = 0 表示在近日点，M = π 表示在远日点
 * 
 * 结果归一化到 [0, 2π) 区间。
 * 
 * @param {number} L - 平黄经（弧度）
 * @param {number} w_bar - 近日点黄经（弧度）
 * @returns {number} 平近点角（弧度），范围 [0, 2π)
 * 
 * @complexity 时间复杂度 O(1)
 * @performance 执行时间 < 0.001ms
 * 
 * @example
 * ```typescript
 * const M = meanAnomaly(Math.PI, Math.PI / 2);
 * console.log(M); // π/2 弧度
 * 
 * // 处理负值情况
 * const M2 = meanAnomaly(Math.PI / 4, Math.PI / 2);
 * console.log(M2); // 7π/4 弧度（自动归一化）
 * ```
 */
export function meanAnomaly(L: number, w_bar: number): number {
  const M = (L - w_bar) % (2 * Math.PI);
  // Ensure positive result
  return M < 0 ? M + 2 * Math.PI : M;
}

/**
 * Normalizes an angle to the range [0, 2π).
 * 
 * @param angle - Angle in radians
 * @returns Normalized angle in radians
 * 
 * @example
 * ```typescript
 * const normalized = normalizeAngle(3 * Math.PI);
 * console.log(normalized); // π
 * ```
 */
export function normalizeAngle(angle: number): number {
  const normalized = angle % (2 * Math.PI);
  return normalized < 0 ? normalized + 2 * Math.PI : normalized;
}

/**
 * Computes the distance between two 3D positions.
 * 
 * @param pos1 - First position
 * @param pos2 - Second position
 * @returns Distance in the same units as the input positions
 * 
 * @example
 * ```typescript
 * const d = distance3D(
 *   { x: 0, y: 0, z: 0 },
 *   { x: 1, y: 0, z: 0 }
 * );
 * console.log(d); // 1.0
 * ```
 */
export function distance3D(pos1: Position3D, pos2: Position3D): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
