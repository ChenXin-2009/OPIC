/**
 * @module astronomy/utils/kepler
 * @description 开普勒方程求解器
 * 
 * 本模块提供求解开普勒方程的工具函数，这是从轨道根数计算行星位置的基础。
 * 开普勒方程描述了天体在椭圆轨道上的运动规律。
 * 
 * @architecture
 * - 所属子系统：天文计算
 * - 架构层级：核心层（算法层）
 * - 职责边界：负责开普勒方程的数值求解，不涉及坐标变换或轨道参数管理
 * 
 * @dependencies
 * - 直接依赖：errors/base
 * - 被依赖：astronomy/orbit, astronomy/utils/index
 * - 循环依赖：无
 * 
 * @unit 角度：弧度（radians），距离：AU（天文单位）
 * @precision 数值精度约 1e-8 弧度（约 0.002 角秒）
 * 
 * 开普勒方程：M = E - e * sin(E)
 * 其中：
 * - M 是平近点角（mean anomaly）
 * - E 是偏近点角（eccentric anomaly，需要求解）
 * - e 是轨道离心率（eccentricity）
 * 
 * 参考文献：Jean Meeus - Astronomical Algorithms (2nd Ed.)
 * 
 * @example
 * ```typescript
 * import { solveKeplerEquation, eccentricToTrueAnomaly } from './kepler';
 * 
 * // 求解偏近点角
 * const M = Math.PI / 4; // 平近点角
 * const e = 0.1;         // 离心率
 * const E = solveKeplerEquation(M, e);
 * 
 * // 计算真近点角
 * const nu = eccentricToTrueAnomaly(E, e);
 * ```
 */

import { ConvergenceError } from '@/lib/errors/base';

/**
 * 使用牛顿-拉夫逊迭代法求解开普勒方程
 * 
 * @description 给定平近点角（M）和离心率（e），求解偏近点角（E）。
 * 使用迭代优化方法，直到结果收敛到指定精度。
 * 
 * @coordinateSystem 角度在轨道平面内测量，从近日点方向开始
 * @unit 输入输出均为弧度（radians），无量纲
 * @precision 默认精度 1e-8 弧度，约 0.002 角秒，对应位置精度约 1 km（1 AU 距离）
 * 
 * 算法步骤：
 * 1. 初始猜测值 E = M
 * 2. 计算 delta = (E - e*sin(E) - M) / (1 - e*cos(E))
 * 3. 更新 E = E - delta
 * 4. 重复直到 |delta| < tolerance 或达到最大迭代次数
 * 
 * @param {number} M - 平近点角（弧度），范围 [0, 2π]
 * @param {number} e - 轨道离心率，范围 [0, 1)，0 表示圆形轨道
 * @param {number} tolerance - 收敛容差（弧度），默认 1e-8
 * @param {number} maxIterations - 最大迭代次数，默认 50
 * @returns {number} 偏近点角（弧度）
 * @throws {ConvergenceError} 如果在 maxIterations 次迭代内未收敛
 * 
 * @complexity 时间复杂度 O(log(1/tolerance))，通常 3-5 次迭代即可收敛
 * @performance 典型执行时间 < 0.01ms，适合实时计算
 * 
 * @example
 * ```typescript
 * // 圆形轨道（e = 0）
 * const E = solveKeplerEquation(Math.PI / 4, 0);
 * console.log(E); // π/4（圆形轨道时 E = M）
 * 
 * // 椭圆轨道
 * const E2 = solveKeplerEquation(Math.PI / 2, 0.1);
 * console.log(E2); // 约 1.671 弧度
 * 
 * // 高离心率轨道（如彗星）
 * const E3 = solveKeplerEquation(Math.PI, 0.9);
 * ```
 */
export function solveKeplerEquation(
  M: number,
  e: number,
  tolerance: number = 1e-8,
  maxIterations: number = 50
): number {
  // Validate inputs
  if (e < 0 || e >= 1) {
    throw new ConvergenceError(
      `Invalid eccentricity: ${e}. Must be in range [0, 1)`,
      { M, e, tolerance, maxIterations }
    );
  }

  // Initial guess: E = M
  let E = M;
  let delta = 1;
  let iterations = 0;

  // Newton-Raphson iteration
  while (Math.abs(delta) > tolerance && iterations < maxIterations) {
    // Compute the function value and its derivative
    // f(E) = E - e*sin(E) - M
    // f'(E) = 1 - e*cos(E)
    delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= delta;
    iterations++;
  }

  // Check convergence
  if (Math.abs(delta) > tolerance) {
    throw new ConvergenceError(
      `Kepler equation failed to converge after ${iterations} iterations`,
      {
        M,
        e,
        tolerance,
        maxIterations,
        finalDelta: delta,
        finalE: E
      }
    );
  }

  return E;
}

/**
 * 从偏近点角计算真近点角
 * 
 * @description 真近点角（ν）是从近日点方向到天体当前位置的角度，从主焦点（太阳）观测。
 * 这是描述天体在轨道上实际位置的角度参数。
 * 
 * @coordinateSystem 角度在轨道平面内测量，从近日点方向开始
 * @unit 输入输出均为弧度（radians）
 * @precision 精度取决于输入的偏近点角精度，通常约 1e-8 弧度
 * 
 * 公式：ν = 2 * atan2(√(1+e) * sin(E/2), √(1-e) * cos(E/2))
 * 
 * 物理意义：
 * - 真近点角描述天体在轨道上的真实角位置
 * - 与平近点角不同，真近点角考虑了轨道的椭圆形状
 * - 在近日点时 ν = 0，在远日点时 ν = π
 * 
 * @param {number} E - 偏近点角（弧度）
 * @param {number} e - 轨道离心率，范围 [0, 1)
 * @returns {number} 真近点角（弧度），范围 [0, 2π]
 * 
 * @complexity 时间复杂度 O(1)
 * @performance 执行时间 < 0.001ms
 * 
 * @example
 * ```typescript
 * const E = Math.PI / 2;
 * const e = 0.1;
 * const nu = eccentricToTrueAnomaly(E, e);
 * console.log(nu); // 约 1.671 弧度
 * 
 * // 圆形轨道时，真近点角等于偏近点角
 * const nu2 = eccentricToTrueAnomaly(Math.PI / 4, 0);
 * console.log(nu2); // π/4
 * ```
 */
export function eccentricToTrueAnomaly(E: number, e: number): number {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}

/**
 * 从偏近点角计算日心距离
 * 
 * @description 计算天体到太阳的距离，基于轨道的半长轴、离心率和偏近点角。
 * 
 * @coordinateSystem 距离从太阳中心（主焦点）测量
 * @unit 输入半长轴单位为 AU，输出距离单位为 AU
 * @precision 精度取决于输入参数精度，通常约 1e-8 AU（约 1.5 km）
 * 
 * 公式：r = a * (1 - e * cos(E))
 * 其中：
 * - r 是日心距离
 * - a 是半长轴
 * - e 是离心率
 * - E 是偏近点角
 * 
 * 物理意义：
 * - 在近日点（E = 0）时，r = a(1 - e)，距离最小
 * - 在远日点（E = π）时，r = a(1 + e)，距离最大
 * - 对于圆形轨道（e = 0），r = a 恒定
 * 
 * @param {number} a - 半长轴（AU）
 * @param {number} e - 轨道离心率，范围 [0, 1)
 * @param {number} E - 偏近点角（弧度）
 * @returns {number} 日心距离（AU）
 * 
 * @complexity 时间复杂度 O(1)
 * @performance 执行时间 < 0.001ms
 * 
 * @example
 * ```typescript
 * // 地球在远日点的距离
 * const r = heliocentricDistance(1.0, 0.0167, Math.PI);
 * console.log(r); // 约 1.0167 AU
 * 
 * // 地球在近日点的距离
 * const r2 = heliocentricDistance(1.0, 0.0167, 0);
 * console.log(r2); // 约 0.9833 AU
 * ```
 */
export function heliocentricDistance(a: number, e: number, E: number): number {
  return a * (1 - e * Math.cos(E));
}
