/**
 * @module flight-dynamics/flight-controller
 * @description 飞行控制适配层：PlayerInput -> 节流/姿态/分级命令
 *
 * 复用现有 PlayerInput 的输入状态，但重新解释为火箭控制语义：
 * - W / S 或 thrust 轴：节流增减
 * - Shift：快速节流调节
 * - 方向键：俯仰 / 偏航微调
 * - Q / E：横滚输入（当前先透传，为后续姿态系统预留）
 * - A / D：辅助控制输入（为未来 RCS / 平移保留）
 * - Space：分级请求
 */

import type { PlayerInputState } from '@/lib/3d/player/PlayerInput';
import {
  type MutableVec3,
  type Vec3,
  vecCross,
  vecMagnitude,
} from './state';

export interface FlightControllerConfig {
  /** 常规节流调整速率（百分比 / 秒） */
  throttleRatePercentPerSecond: number;
  /** Shift 加速时的节流调整速率（百分比 / 秒） */
  boostedThrottleRatePercentPerSecond: number;
  /** 手动姿态输入的最大方向偏转角（度） */
  maxSteeringDeflectionDeg: number;
}

export interface FlightControlCommand {
  throttlePercent: number;
  thrustDirection: MutableVec3;
  pitch: number;
  yaw: number;
  roll: number;
  auxiliary: number;
  stageRequested: boolean;
}

export const DEFAULT_FLIGHT_CONTROLLER_CONFIG: FlightControllerConfig = {
  throttleRatePercentPerSecond: 30,
  boostedThrottleRatePercentPerSecond: 70,
  maxSteeringDeflectionDeg: 12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(vec: Vec3): MutableVec3 {
  const mag = vecMagnitude(vec);
  if (mag < 1e-9) {
    return [1, 0, 0];
  }
  return [vec[0] / mag, vec[1] / mag, vec[2] / mag];
}

function scale(vec: Vec3, factor: number): MutableVec3 {
  return [vec[0] * factor, vec[1] * factor, vec[2] * factor];
}

function add(a: Vec3, b: Vec3): MutableVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * 依据玩家输入调整节流百分比。
 *
 * 这里按“真实经过时间”调整，而不是按仿真倍率调整，
 * 这样 1x/10x/50x 下的操控手感保持一致。
 */
export function updateThrottleFromPlayerInput(
  currentThrottlePercent: number,
  input: PlayerInputState,
  realElapsedSeconds: number,
  config: FlightControllerConfig = DEFAULT_FLIGHT_CONTROLLER_CONFIG,
): number {
  const rate = input.boost
    ? config.boostedThrottleRatePercentPerSecond
    : config.throttleRatePercentPerSecond;
  const delta = input.thrust * rate * Math.max(0, realElapsedSeconds);
  return clamp(currentThrottlePercent + delta, 0, 100);
}

/**
 * 将玩家姿态输入转成对推力方向的微调。
 *
 * 当前积分器尚未显式模拟整套姿态动力学，因此这里采取
 * “在自动重力转弯方向附近做局部偏转”的简化方案。
 */
export function buildSteeredThrustDirection(
  baseDirection: Vec3,
  position: Vec3,
  input: PlayerInputState,
  config: FlightControllerConfig = DEFAULT_FLIGHT_CONTROLLER_CONFIG,
): MutableVec3 {
  const forward = normalize(baseDirection);
  const radial = normalize(position);

  let east = vecCross([0, 0, 1], radial);
  if (vecMagnitude(east) < 1e-6) {
    east = [1, 0, 0];
  } else {
    east = normalize(east);
  }
  const north = normalize(vecCross(radial, east));

  const deflection = Math.tan((config.maxSteeringDeflectionDeg * Math.PI) / 180);
  const yawOffset = scale(east, input.yaw * deflection);
  const pitchOffset = scale(north, input.pitch * deflection);

  return normalize(add(add(forward, yawOffset), pitchOffset));
}

export function mapPlayerInputToFlightControl(
  input: PlayerInputState,
  currentThrottlePercent: number,
  realElapsedSeconds: number,
  baseDirection: Vec3,
  position: Vec3,
  config: FlightControllerConfig = DEFAULT_FLIGHT_CONTROLLER_CONFIG,
): FlightControlCommand {
  return {
    throttlePercent: updateThrottleFromPlayerInput(
      currentThrottlePercent,
      input,
      realElapsedSeconds,
      config,
    ),
    thrustDirection: buildSteeredThrustDirection(
      baseDirection,
      position,
      input,
      config,
    ),
    pitch: input.pitch,
    yaw: input.yaw,
    roll: input.roll,
    auxiliary: input.strafe,
    stageRequested: input.stage,
  };
}
