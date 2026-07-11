/**
 * @module flight-dynamics/forces
 * @description 受力模型：引力 + 推力 + 大气阻力
 *
 * 将三种力统一为加速度接口，供扩展积分器使用。
 *
 * @unit SI 国际单位制
 *
 * @references
 * - Bate, Mueller, White — Fundamentals of Astrodynamics
 * - Anderson — Introduction to Flight, 大气阻力章节
 */

import { type Vec3, type MutableVec3, vecMagnitude, vecScale } from './state';
import { GM_SI, EARTH_RADIUS_M, twoBodyAcceleration } from './integrator';
import { earthAtmosphereDensity, dynamicPressure } from './atmosphere';

// ---------------------------------------------------------------------------
// 控制输入与飞行状态
// ---------------------------------------------------------------------------

/**
 * 飞行控制输入。
 * 描述当前帧的发动机状态和姿态指向。
 */
export interface ControlInput {
  /** 节流百分比 (0-1)，0 = 关机 */
  throttle: number;
  /** 推力方向单位矢量（ECI），沿火箭纵轴指向 */
  thrustDirection: Vec3;
  /** 当前级发动机总真空推力 (N)（100% 节流时） */
  thrustN: number;
  /** 当前级发动机平均真空比冲 (s) */
  ispS: number;
  /** 阻力系数 */
  dragCoefficient: number;
  /** 横截面积 (m²) */
  crossSectionAreaM2: number;
}

/**
 * 带质量的飞行状态矢量。
 * 在 Phase 0 的 StateVector 基础上增加质量字段。
 */
export interface FlightState {
  /** 位置 (m)，ECI */
  position: MutableVec3;
  /** 速度 (m/s)，ECI */
  velocity: MutableVec3;
  /** 当前总质量 (kg) — 含剩余推进剂 */
  mass: number;
  /** 时间 (s) */
  time: number;
}

/** 受力模型配置 */
export interface ForceModelConfig {
  /** 中心天体引力参数 (m³/s²) */
  mu: number;
  /** 中心天体名称（用于大气查询） */
  bodyName: string;
  /** 中心天体半径 (m) */
  bodyRadius: number;
  /** 是否启用大气阻力 */
  atmosphereEnabled: boolean;
}

/** 默认地球受力模型 */
export const EARTH_FORCE_MODEL: ForceModelConfig = {
  mu: GM_SI.earth,
  bodyName: 'earth',
  bodyRadius: EARTH_RADIUS_M,
  atmosphereEnabled: true,
};

// ---------------------------------------------------------------------------
// 加速度计算
// ---------------------------------------------------------------------------

/**
 * 计算引力加速度。
 * a_grav = -μ · r / |r|³
 */
export function gravityAcceleration(pos: Vec3, mu: number): MutableVec3 {
  return twoBodyAcceleration(pos, mu);
}

/**
 * 计算推力加速度。
 * a_thrust = (throttle · thrustN / mass) · direction
 */
export function thrustAcceleration(
  control: ControlInput,
  mass: number,
): MutableVec3 {
  if (control.throttle <= 0 || mass <= 0) {
    return [0, 0, 0];
  }
  const mag = (control.throttle * control.thrustN) / mass;
  return [
    control.thrustDirection[0] * mag,
    control.thrustDirection[1] * mag,
    control.thrustDirection[2] * mag,
  ];
}

/**
 * 计算大气阻力加速度。
 * a_drag = -(0.5 · ρ · v² · Cd · A / mass) · (v/|v|)
 *
 * @param pos      位置 (m)，ECI
 * @param vel      速度 (m/s)，ECI
 * @param mass     质量 (kg)
 * @param cd       阻力系数
 * @param area     横截面积 (m²)
 * @param bodyRadius 天体半径 (m)
 * @param bodyName 天体名称
 * @param atmosphereEnabled 是否启用大气
 * @returns        阻力加速度 (m/s²)
 */
export function dragAcceleration(
  pos: Vec3,
  vel: Vec3,
  mass: number,
  cd: number,
  area: number,
  bodyRadius: number,
  bodyName: string,
  atmosphereEnabled: boolean,
): MutableVec3 {
  if (!atmosphereEnabled || mass <= 0) {
    return [0, 0, 0];
  }

  const rMag = vecMagnitude(pos);
  const altitude = rMag - bodyRadius;

  const density = bodyName.toLowerCase() === 'earth'
    ? earthAtmosphereDensity(altitude)
    : 0;

  if (density === 0) {
    return [0, 0, 0];
  }

  const vMag = vecMagnitude(vel);
  if (vMag < 1e-6) {
    return [0, 0, 0];
  }

  // a_drag = -(0.5 · ρ · v² · Cd · A / mass) · (v/|v|)
  const dragMag = (0.5 * density * vMag * vMag * cd * area) / mass;
  const factor = -dragMag / vMag;

  return [vel[0] * factor, vel[1] * factor, vel[2] * factor];
}

/**
 * 计算总加速度 = 引力 + 推力 + 阻力。
 */
export function totalAcceleration(
  state: FlightState,
  control: ControlInput,
  config: ForceModelConfig,
): MutableVec3 {
  const aGrav = gravityAcceleration(state.position, config.mu);
  const aThrust = thrustAcceleration(control, state.mass);
  const aDrag = dragAcceleration(
    state.position,
    state.velocity,
    state.mass,
    control.dragCoefficient,
    control.crossSectionAreaM2,
    config.bodyRadius,
    config.bodyName,
    config.atmosphereEnabled,
  );

  return [
    aGrav[0] + aThrust[0] + aDrag[0],
    aGrav[1] + aThrust[1] + aDrag[1],
    aGrav[2] + aThrust[2] + aDrag[2],
  ];
}

// ---------------------------------------------------------------------------
// 质量流率
// ---------------------------------------------------------------------------

/** 标准重力加速度 (m/s²) */
const G0 = 9.80665;

/**
 * 计算质量流率（发动机点火时的质量消耗率）。
 * ṁ = throttle · thrustN / (Isp · g₀)
 *
 * @returns 质量流率 (kg/s)，正值表示质量在减少
 */
export function massFlowRate(control: ControlInput): number {
  if (control.throttle <= 0 || control.ispS <= 0) {
    return 0;
  }
  return (control.throttle * control.thrustN) / (control.ispS * G0);
}

// ---------------------------------------------------------------------------
// 辅助：动压查询
// ---------------------------------------------------------------------------

/**
 * 计算当前飞行状态的动压。
 * 用于结构过载判定和最大动压点 (max-Q) 监测。
 */
export function currentDynamicPressure(
  state: FlightState,
  config: ForceModelConfig,
): number {
  if (!config.atmosphereEnabled) return 0;
  const rMag = vecMagnitude(state.position);
  const altitude = rMag - config.bodyRadius;
  const density = config.bodyName.toLowerCase() === 'earth'
    ? earthAtmosphereDensity(altitude)
    : 0;
  if (density === 0) return 0;
  const vMag = vecMagnitude(state.velocity);
  return dynamicPressure(density, vMag);
}
