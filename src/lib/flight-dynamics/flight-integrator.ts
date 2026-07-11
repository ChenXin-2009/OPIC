/**
 * @module flight-dynamics/flight-integrator
 * @description Phase 1 扩展积分器：推力 + 大气阻力 + 变质量
 *
 * 在 Phase 0 的纯二体 RK4 基础上扩展，支持：
 *   - 变推力（节流 0–100%）
 *   - 变质量（火箭方程，燃料消耗实时更新质量）
 *   - 大气阻力（指数模型，仅海拔 < 100 km 启用）
 *   - 时间加速子步保护（10,000× 不发散）
 *
 * 运动方程：
 *   dr/dt = v
 *   dv/dt = a_grav(r) + a_thrust(control, m) + a_drag(r, v, m)
 *   dm/dt = -ṁ(control)
 *
 * @architecture
 * - 独立于 integrator.ts 以避免循环依赖
 *   （forces.ts 依赖 integrator.ts 的常数，本文件依赖 forces.ts）
 *
 * @unit SI 国际单位制
 */

import {
  type FlightState,
  type ControlInput,
  type ForceModelConfig,
  totalAcceleration,
  massFlowRate,
} from './forces';

/**
 * 飞行状态导数。
 * RK4 的中间步骤需要同时计算位置、速度、质量的导数。
 */
interface FlightDerivative {
  dPos: [number, number, number];
  dVel: [number, number, number];
  dMass: number;
}

function computeFlightDerivative(
  state: FlightState,
  control: ControlInput,
  config: ForceModelConfig,
): FlightDerivative {
  const acc = totalAcceleration(state, control, config);
  const mFlow = massFlowRate(control);
  return {
    dPos: [state.velocity[0], state.velocity[1], state.velocity[2]],
    dVel: acc,
    dMass: -mFlow,
  };
}

/** 飞行状态线性叠加 */
function addScaledFlight(
  state: FlightState,
  deriv: FlightDerivative,
  scale: number,
  dt: number,
): FlightState {
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
    mass: Math.max(0, state.mass + deriv.dMass * scale),
    time: state.time + dt,
  };
}

/**
 * 执行一步带推力+阻力+变质量的 RK4 积分。
 *
 * @param state   飞行状态
 * @param control 控制输入（该步内恒定）
 * @param config  受力模型配置
 * @param dt      时间步长 (s)
 * @returns       积分后的新飞行状态
 */
export function rk4FlightStep(
  state: FlightState,
  control: ControlInput,
  config: ForceModelConfig,
  dt: number,
): FlightState {
  const k1 = computeFlightDerivative(state, control, config);

  const s2 = addScaledFlight(state, k1, dt / 2, 0);
  const k2 = computeFlightDerivative(s2, control, config);

  const s3 = addScaledFlight(state, k2, dt / 2, 0);
  const k3 = computeFlightDerivative(s3, control, config);

  const s4 = addScaledFlight(state, k3, dt, 0);
  const k4 = computeFlightDerivative(s4, control, config);

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
    mass: Math.max(0, state.mass + sixth * k1.dMass + third * k2.dMass + third * k3.dMass + sixth * k4.dMass),
    time: state.time + dt,
  };
}

/** 飞行积分配置 */
export interface FlightPropagateOptions {
  /** 时间步长 (s) */
  dt: number;
  /** 总积分时长 (s) */
  duration: number;
  /** 受力模型配置 */
  config: ForceModelConfig;
  /**
   * 控制输入回调：每步调用，返回当前控制输入。
   * 可根据飞行状态动态调整节流和推力方向。
   * 返回 null 表示停止积分。
   */
  getControl: (state: FlightState, stepIndex: number) => ControlInput | null;
  /** 每步回调 */
  onStep?: (state: FlightState, stepIndex: number) => boolean | void;
  /** 子步上限 */
  maxSteps?: number;
}

/**
 * 多步飞行积分（带推力+阻力+变质量）。
 *
 * @param initialState 初始飞行状态
 * @param options      积分配置
 * @returns            最终飞行状态
 */
export function propagateFlight(
  initialState: FlightState,
  options: FlightPropagateOptions,
): FlightState {
  const { dt, duration, config, getControl, onStep, maxSteps = 1_000_000 } = options;

  const numSteps = Math.floor(duration / dt);
  if (numSteps > maxSteps) {
    throw new Error(
      `propagateFlight: 步数 ${numSteps} 超过上限 ${maxSteps}`,
    );
  }

  let state = initialState;
  const remainder = duration - numSteps * dt;

  for (let i = 0; i < numSteps; i += 1) {
    const control = getControl(state, i);
    if (control === null) break;

    state = rk4FlightStep(state, control, config, dt);
    if (onStep && onStep(state, i) === false) {
      return state;
    }
  }

  if (remainder > 0) {
    const control = getControl(state, numSteps);
    if (control !== null) {
      state = rk4FlightStep(state, control, config, remainder);
    }
  }

  return state;
}

/**
 * 带子步保护的时间加速积分。
 *
 * 当时间加速倍率很高时（如 10,000×），单帧 dt 很大。
 * 此函数将大步长拆分为多个子步，每个子步不超过 maxSubStepDt，
 * 防止数值发散。
 *
 * @param state         当前飞行状态
 * @param control       控制输入（整段恒定）
 * @param config        受力模型
 * @param frameDt       单帧时间步长 (s) = 真实帧间隔 × 时间加速倍率
 * @param maxSubStepDt  子步上限 (s)，默认 30s
 * @returns             积分后的飞行状态
 */
export function propagateFlightWithSubsteps(
  state: FlightState,
  control: ControlInput,
  config: ForceModelConfig,
  frameDt: number,
  maxSubStepDt = 30,
): FlightState {
  const numSubSteps = Math.ceil(frameDt / maxSubStepDt);
  const subDt = frameDt / numSubSteps;

  let current = state;
  for (let i = 0; i < numSubSteps; i += 1) {
    // 燃料耗尽后推力归零
    if (current.mass <= 0) {
      const noThrustControl: ControlInput = {
        ...control,
        throttle: 0,
      };
      current = rk4FlightStep(current, noThrustControl, config, subDt);
    } else {
      current = rk4FlightStep(current, control, config, subDt);
    }
  }

  return current;
}
