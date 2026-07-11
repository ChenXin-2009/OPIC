/**
 * @module flight-dynamics/integrator
 * @description RK4 定步长轨道积分器
 *
 * 本模块实现经典四阶 Runge-Kutta (RK4) 定步长积分器，用于求解二体引力
 * 下的运动方程。Phase 0 阶段仅处理纯引力（无推力、无阻力、无变质量），
 * 后续 Phase 将在同一接口上扩展受力项。
 *
 * 运动方程（二体）：
 *   dr/dt = v
 *   dv/dt = -μ · r / |r|³
 *
 * @architecture
 * - 所属子系统：飞行动力学 (flight-dynamics)
 * - 架构层级：lib/ 纯业务逻辑层
 * - 职责边界：数值积分核心，不含受力模型细节（受力由 forces.ts 提供，Phase 1 引入）
 *
 * @unit SI 国际单位制
 *
 * @references
 * - Numerical Recipes 3rd Ed., §17.1 Runge-Kutta Methods
 * - Bate, Mueller, White — Fundamentals of Astrodynamics
 */

import {
  type StateVector,
  type Vec3,
  type MutableVec3,
  vecMagnitude,
  vecScale,
  vecAdd,
} from './state';

/** 中心天体引力参数表（m³/s²），复用 gravity.ts 的 GM 值并转换为 SI 单位 */
export const GM_SI: Record<string, number> = {
  // 地球: 3.986004418e5 km³/s² → m³/s²
  earth: 3.986004418e14,
  // 月球: 4.902800066e3 km³/s² → m³/s²
  moon: 4.902800066e12,
  // 太阳: 1.32712440018e11 km³/s² → m³/s²
  sun: 1.32712440018e20,
  // 火星: 4.282837e4 km³/s² → m³/s²
  mars: 4.282837e13,
};

/** 地球平均半径 (m) */
export const EARTH_RADIUS_M = 6_371_000;

/** 地球海平面重力加速度 (m/s²) */
export const G0 = 9.80665;

/**
 * 计算二体引力加速度。
 *
 * a = -μ · r / |r|³
 *
 * @param pos  位置矢量 (m)
 * @param mu   引力参数 (m³/s²)
 * @returns    加速度矢量 (m/s²)
 */
export function twoBodyAcceleration(pos: Vec3, mu: number): MutableVec3 {
  const rMag = vecMagnitude(pos);
  // 防御性：避免 r → 0 时除零（实际飞行不会出现）
  const rCubed = rMag * rMag * rMag;
  const factor = -mu / rCubed;
  return [pos[0] * factor, pos[1] * factor, pos[2] * factor];
}

/**
 * 状态导数：给定状态返回 [dr/dt, dv/dt]。
 * 二体问题中 dr/dt = v, dv/dt = a(r)。
 */
interface Derivative {
  dPos: MutableVec3;
  dVel: MutableVec3;
}

function computeDerivative(state: StateVector, mu: number): Derivative {
  return {
    dPos: [state.velocity[0], state.velocity[1], state.velocity[2]],
    dVel: twoBodyAcceleration(state.position, mu),
  };
}

/**
 * 对状态矢量做线性叠加：result = state + scale * deriv。
 * 返回新的 StateVector（不修改输入）。
 */
function addScaledState(
  state: StateVector,
  deriv: Derivative,
  scale: number,
  dt: number,
): StateVector {
  return {
    position: [
      state.position[0] + deriv.dPos[0] * scale,
      state.position[1] + deriv.dPos[1] * scale,
      state.position[2] + deriv.dPos[2] * scale,
    ],
    velocity: [
      state.velocity[0] + deriv.dVel[0] * scale,
      state.velocity[1] + deriv.dVel[1] * scale,
      state.velocity[2] + deriv.dVel[2] * scale,
    ],
    time: state.time + dt,
  };
}

/**
 * 执行一步 RK4 积分。
 *
 * 经典四阶 Runge-Kutta：
 *   k1 = f(y)
 *   k2 = f(y + dt/2 · k1)
 *   k3 = f(y + dt/2 · k2)
 *   k4 = f(y + dt · k3)
 *   y_new = y + dt/6 · (k1 + 2·k2 + 2·k3 + k4)
 *
 * @param state 当前状态
 * @param dt    时间步长 (s)
 * @param mu    中心天体引力参数 (m³/s²)
 * @returns     积分后的新状态（新对象，不修改输入）
 */
export function rk4Step(state: StateVector, dt: number, mu: number): StateVector {
  const k1 = computeDerivative(state, mu);

  const state2 = addScaledState(state, k1, dt / 2, 0);
  const k2 = computeDerivative(state2, mu);

  const state3 = addScaledState(state, k2, dt / 2, 0);
  const k3 = computeDerivative(state3, mu);

  const state4 = addScaledState(state, k3, dt, 0);
  const k4 = computeDerivative(state4, mu);

  // 合并：y + dt/6 * (k1 + 2k2 + 2k3 + k4)
  const sixth = dt / 6;
  const third = dt / 3;

  return {
    position: [
      state.position[0] + sixth * k1.dPos[0] + third * k2.dPos[0] + third * k3.dPos[0] + sixth * k4.dPos[0],
      state.position[1] + sixth * k1.dPos[1] + third * k2.dPos[1] + third * k3.dPos[1] + sixth * k4.dPos[1],
      state.position[2] + sixth * k1.dPos[2] + third * k2.dPos[2] + third * k3.dPos[2] + sixth * k4.dPos[2],
    ],
    velocity: [
      state.velocity[0] + sixth * k1.dVel[0] + third * k2.dVel[0] + third * k3.dVel[0] + sixth * k4.dVel[0],
      state.velocity[1] + sixth * k1.dVel[1] + third * k2.dVel[1] + third * k3.dVel[1] + sixth * k4.dVel[1],
      state.velocity[2] + sixth * k1.dVel[2] + third * k2.dVel[2] + third * k3.dVel[2] + sixth * k4.dVel[2],
    ],
    time: state.time + dt,
  };
}

/**
 * 多步积分配置。
 */
export interface PropagateOptions {
  /** 时间步长 (s) */
  dt: number;
  /** 总积分时长 (s) */
  duration: number;
  /** 中心天体引力参数 (m³/s²) */
  mu: number;
  /**
   * 可选回调：每步积分后调用。用于轨迹采样、遥测等。
   * 返回 false 可提前终止积分。
   */
  onStep?: (state: StateVector, stepIndex: number) => boolean | void;
  /**
   * 子步上限。当 duration/dt 超过此值时报错，防止意外的大循环。
   * 默认 1,000,000。
   */
  maxSteps?: number;
}

/**
 * 多步定步长 RK4 积分。
 *
 * 从 initialState 积分 duration 秒，每步 dt 秒。
 * 返回最终状态。如需中间轨迹，使用 onStep 回调。
 *
 * @param initialState 初始状态
 * @param options      积分配置
 * @returns            最终状态
 */
export function propagate(
  initialState: StateVector,
  options: PropagateOptions,
): StateVector {
  const { dt, duration, mu, onStep, maxSteps = 1_000_000 } = options;

  // 使用 floor 取完整步数，余数（正值）由最后的修正步处理。
  // 注意：不能用 round，否则当 duration/dt 非整数时余数为负，
  // 会跳过修正步导致总积分时长不等于 duration。
  const numSteps = Math.floor(duration / dt);
  if (numSteps > maxSteps) {
    throw new Error(
      `propagate: 步数 ${numSteps} 超过上限 ${maxSteps}，请减小 duration 或增大 dt`,
    );
  }

  let state = initialState;
  const remainder = duration - numSteps * dt;

  for (let i = 0; i < numSteps; i += 1) {
    state = rk4Step(state, dt, mu);
    if (onStep && onStep(state, i) === false) {
      return state;
    }
  }

  // 处理余数步（非整数倍步长）
  if (remainder > 0) {
    state = rk4Step(state, remainder, mu);
  }

  return state;
}
