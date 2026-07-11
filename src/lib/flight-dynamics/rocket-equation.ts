/**
 * @module flight-dynamics/rocket-equation
 * @description 火箭方程计算工具
 *
 * 提供飞行中的质量/Δv 实时计算工具，用于遥测显示和任务规划。
 * 与 forces.ts 的质量流率配合使用。
 *
 * @unit SI 国际单位制
 *
 * @references
 * - Tsiolkovsky rocket equation: Δv = Isp · g₀ · ln(m₀/m₁)
 */

/** 标准重力加速度 (m/s²) */
const G0 = 9.80665;

/**
 * 计算给定质量比的 Δv（齐奥尔科夫斯基方程）。
 *
 * @param isp        比冲 (s)
 * @param massInitial 初始质量 (kg)
 * @param massFinal   最终质量 (kg)
 * @returns           Δv (m/s)
 */
export function deltaV(isp: number, massInitial: number, massFinal: number): number {
  if (massFinal <= 0 || massInitial <= massFinal) return 0;
  return isp * G0 * Math.log(massInitial / massFinal);
}

/**
 * 计算燃烧一定时间后的剩余质量。
 *
 * @param initialMass 初始质量 (kg)
 * @param massFlow    质量流率 (kg/s)
 * @param burnTime    燃烧时间 (s)
 * @returns           剩余质量 (kg)，不小于 0
 */
export function massAfterBurn(
  initialMass: number,
  massFlow: number,
  burnTime: number,
): number {
  const consumed = massFlow * burnTime;
  return Math.max(0, initialMass - consumed);
}

/**
 * 计算耗尽全部推进剂所需的燃烧时间。
 *
 * @param propellantMass 推进剂质量 (kg)
 * @param massFlow       质量流率 (kg/s)
 * @returns              燃烧时间 (s)
 */
export function burnTime(propellantMass: number, massFlow: number): number {
  if (massFlow <= 0) return Infinity;
  return propellantMass / massFlow;
}

/**
 * 计算达到指定 Δv 需要消耗的推进剂质量。
 *
 * 由 Δv = Isp·g₀·ln(m₀/m₁) 反推：
 * m₁ = m₀ · exp(-Δv / (Isp·g₀))
 * 消耗 = m₀ - m₁
 *
 * @param deltaV     目标 Δv (m/s)
 * @param isp        比冲 (s)
 * @param initialMass 初始质量 (kg)
 * @returns           消耗的推进剂质量 (kg)
 */
export function propellantForDeltaV(
  deltaV: number,
  isp: number,
  initialMass: number,
): number {
  if (isp <= 0 || initialMass <= 0) return 0;
  const massRatio = Math.exp(-deltaV / (isp * G0));
  const finalMass = initialMass * massRatio;
  return Math.max(0, initialMass - finalMass);
}

/**
 * 计算推重比。
 *
 * @param thrust     推力 (N)
 * @param mass       质量 (kg)
 * @param gravity    重力加速度 (m/s²)，默认海平面 g₀
 * @returns          推重比
 */
export function thrustToWeight(thrust: number, mass: number, gravity = G0): number {
  if (mass <= 0) return 0;
  return thrust / (mass * gravity);
}
