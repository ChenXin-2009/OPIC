/**
 * @module mods/space-flight/simulation-core
 * @description 航天飞行窗口的纯函数仿真核心
 *
 * 将 React hook 里的数值推进逻辑抽离出来，方便：
 * - 稳定修复时间推进 / 分级 / 触地问题
 * - 为发射流程补自动化回归测试
 * - 让 UI 层只负责状态持有与展示
 */

import type { PlayerInputState } from '@/lib/3d/player/PlayerInput';
import {
  EARTH_FORCE_MODEL,
  EARTH_RADIUS_M,
  earthAtmosphereDensity,
  massFlowRate,
  mapPlayerInputToFlightControl,
  rk4FlightStep,
  stateToElements,
  vecMagnitude,
  vecScale,
  type ControlInput,
  type FlightState,
} from '@/lib/flight-dynamics';
import {
  computeVehicleSummary,
  getPart,
  type VehicleConfig,
} from '@/lib/data/rocket-parts';

/**
 * 单级发动机的运行时快照。
 * 记录了发动机的设计参数以及在仿真过程中已消耗的推进剂质量。
 */
export interface StageEngine {
  /** 发动机/级名称 */
  name: string;
  /** 真空推力，单位牛 */
  thrustN: number;
  /** 比冲，单位秒 */
  ispS: number;
  /** 推进剂总质量，单位千克 */
  propellantMassKg: number;
  /** 结构干质量，单位千克 */
  dryMassKg: number;
  /** 已消耗的推进剂质量，单位千克 */
  propellantConsumed: number;
}

/**
 * 仿真遥测数据快照。
 * 每次帧推进后生成，供 UI 层展示高度、速度、燃料等关键飞行参数。
 */
export interface SimulationTelemetry {
  /** 当前海拔，单位千米 */
  altitudeKm: number;
  /** 当前速率，单位米/秒 */
  speedMs: number;
  /** 轨道远地点高度，单位千米（亚轨道时为 0） */
  apogeeKm: number;
  /** 轨道近地点高度，单位千米（亚轨道时为 0） */
  perigeeKm: number;
  /** 当前级燃料剩余百分比，范围 0–100 */
  fuelPercent: number;
  /** 当前级序号（0 为第一级） */
  currentStage: number;
  /** 当前级名称 */
  currentStageName: string;
  /** 当前级预计剩余燃烧时间，单位秒 */
  stageBurnTimeRemaining: number;
  /** 任务经过时间，单位秒 */
  missionTime: number;
  /** 最大动压，单位 Pa */
  maxQ: number;
  /** 飞行器当前总质量，单位千克 */
  massKg: number;
}

/**
 * 单帧仿真所需的全部输入参数。
 * 包含当前飞行状态、发动机配置、玩家输入和时间缩放因子。
 */
export interface SimulationFrameInput {
  /** 当前飞行状态（位置、速度、质量、时间） */
  state: FlightState;
  /** 各级发动机快照数组 */
  engines: StageEngine[];
  /** 当前工作级序号 */
  stageIndex: number;
  /** 油门百分比（玩家设定），范围 0–100 */
  throttlePercent: number;
  /** 时间缩放倍率（1 = 实时，2 = 两倍速，依此类推） */
  timeScale: number;
  /** 真实经过时间，单位毫秒 */
  realElapsedMs: number;
  /** 当前最大动压记录，单位 Pa */
  maxQ: number;
  /** 天体半径，单位米 */
  bodyRadiusM: number;
  /** 玩家输入状态（键盘/手柄） */
  playerInput: PlayerInputState;
}

/**
 * 单帧仿真的输出结果。
 * 包含推进后的飞行状态、发动机消耗、遥测数据以及任务结束标记。
 */
export interface SimulationFrameResult {
  /** 推进后的飞行状态 */
  state: FlightState;
  /** 推进后各级发动机快照（已扣除消耗） */
  engines: StageEngine[];
  /** 推进后的当前级序号 */
  stageIndex: number;
  /** 本帧最终应用的油门百分比 */
  throttlePercent: number;
  /** 本帧实际应用的推力方向单位矢量（ECI 坐标系） */
  thrustDirectionEci: [number, number, number];
  /** 是否处于喷焰状态（有推力且推进剂充足） */
  plumeActive: boolean;
  /** 本帧遥测数据 */
  telemetry: SimulationTelemetry;
  /** 累计最大动压，单位 Pa */
  maxQ: number;
  /** 任务是否在本帧结束后终止 */
  ended: boolean;
  /** 任务终止原因（如 "坠毁"、"入轨成功"），仅在 ended 为 true 时存在 */
  endReason?: string;
}

const MU = 3.986004418e14;
const MAX_SUBSTEP_SECONDS = 0.25;
const GRAVITY_TURN_ALT = 10_000;
const GRAVITY_TURN_END = 80_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneState(state: FlightState): FlightState {
  return {
    position: [...state.position] as [number, number, number],
    velocity: [...state.velocity] as [number, number, number],
    mass: state.mass,
    time: state.time,
  };
}

function surfaceClampedState(state: FlightState, bodyRadiusM: number): FlightState {
  const rMag = vecMagnitude(state.position);
  if (rMag < 1e-6) {
    return {
      position: [bodyRadiusM, 0, 0],
      velocity: [0, 0, 0],
      mass: state.mass,
      time: state.time,
    };
  }

  return {
    position: vecScale(state.position, bodyRadiusM / rMag) as [number, number, number],
    velocity: [0, 0, 0],
    mass: state.mass,
    time: state.time,
  };
}

function getAltitudeM(state: FlightState, bodyRadiusM: number): number {
  return vecMagnitude(state.position) - bodyRadiusM;
}

/**
 * 根据初始位置矢量和发射海拔计算天体半径。
 * 初始位置到地心的距离减去发射海拔即得到天体表面半径。
 * @param initialPosition - 初始位置 ECI 矢量 [x, y, z]，单位米
 * @param launchAltitudeM - 发射场海拔高度，单位米
 * @returns 天体半径，单位米
 */
export function computeMissionBodyRadius(
  initialPosition: readonly [number, number, number],
  launchAltitudeM: number,
): number {
  return vecMagnitude(initialPosition) - launchAltitudeM;
}

/**
 * 根据当前飞行状态自动计算推力方向，实现重力转弯。
 * - 低空段（< 10 km）：沿径向（垂直向上）推力
 * - 高空段（> 80 km）：完全沿顺向（速度方向）推力
 * - 中间段：在径向与顺向之间线性插值
 * @param state - 当前飞行状态
 * @param bodyRadiusM - 天体半径，单位米
 * @returns 推力方向单位矢量 [x, y, z]（ECI 坐标系）
 */
export function getAutoThrustDirection(
  state: FlightState,
  bodyRadiusM: number,
): [number, number, number] {
  const rMag = vecMagnitude(state.position);
  const altitude = rMag - bodyRadiusM;

  if (altitude < GRAVITY_TURN_ALT) {
    return vecScale(state.position, 1 / rMag) as [number, number, number];
  }

  const vMag = vecMagnitude(state.velocity);
  if (vMag < 1) {
    return vecScale(state.position, 1 / rMag) as [number, number, number];
  }

  const prograde = vecScale(state.velocity, 1 / vMag);
  const radial = vecScale(state.position, 1 / rMag);
  const t = Math.min(1, (altitude - GRAVITY_TURN_ALT) / (GRAVITY_TURN_END - GRAVITY_TURN_ALT));
  return [
    radial[0] * (1 - t) + prograde[0] * t,
    radial[1] * (1 - t) + prograde[1] * t,
    radial[2] * (1 - t) + prograde[2] * t,
  ];
}

/**
 * 从飞行器配置中提取各级发动机的快照信息。
 * 遍历配置中的每一级和每个部件，汇总推力和比冲，计算干质量和推进剂质量。
 * @param config - 完整飞行器配置（各分级及部件列表）
 * @returns 各级发动机快照数组，长度与 config.stages 一致
 * @throws 当引用不存在的部件 ID 时由 getPart 隐式抛出
 */
export function extractStageEngines(config: VehicleConfig): StageEngine[] {
  const summary = computeVehicleSummary(config);
  return config.stages.map((stage, i) => {
    const stageSummary = summary.stages[i];
    let dryMass = 0;
    let propellant = 0;

    for (const inst of stage.parts) {
      const part = getPart(inst.partId);
      const count = inst.count ?? 1;
      dryMass += part.dryMassKg * count;
      if (part.propellantMassKg) {
        propellant += part.propellantMassKg * count;
      }
    }

    return {
      name: stage.name,
      thrustN: stageSummary.thrustN,
      ispS: stageSummary.ispS,
      propellantMassKg: propellant,
      dryMassKg: dryMass,
      propellantConsumed: 0,
    };
  });
}

/**
 * 执行级间分离。
 * 丢弃当前级的干质量，并将级序号推进到下一级。
 * 如果已是最后一级则无操作。
 * @param state - 分离前的飞行状态
 * @param engines - 各级发动机快照数组
 * @param stageIndex - 当前级序号
 * @returns 分离后的状态（质量已扣除本级干质量）和新的级序号
 */
export function separateStage(
  state: FlightState,
  engines: StageEngine[],
  stageIndex: number,
): { state: FlightState; stageIndex: number } {
  if (stageIndex >= engines.length - 1) {
    return { state, stageIndex };
  }

  return {
    state: {
      ...state,
      mass: Math.max(0, state.mass - engines[stageIndex].dryMassKg),
    },
    stageIndex: stageIndex + 1,
  };
}

/**
 * 根据当前飞行状态和发动机信息构建遥测数据快照。
 * 计算海拔、速率、轨道根数（远/近地点）、燃料百分比、剩余燃烧时间等。
 * 当轨道根数计算失败时（如亚轨道或数值不稳定），远/近地点保持为 0。
 * @param state - 当前飞行状态
 * @param engines - 各级发动机快照数组
 * @param stageIdx - 当前级序号
 * @param throttlePercent - 当前油门百分比
 * @param maxQ - 累计最大动压
 * @param bodyRadiusM - 天体半径，单位米
 * @returns 结构化的遥测数据对象
 */
export function buildTelemetry(
  state: FlightState,
  engines: StageEngine[],
  stageIdx: number,
  throttlePercent: number,
  maxQ: number,
  bodyRadiusM: number,
): SimulationTelemetry {
  const altitude = getAltitudeM(state, bodyRadiusM);
  const vMag = vecMagnitude(state.velocity);

  let apogee = 0;
  let perigee = 0;
  try {
    const elements = stateToElements(
      { position: state.position, velocity: state.velocity, time: state.time },
      MU,
    );

    if (Number.isFinite(elements.semiMajorAxis) && Number.isFinite(elements.eccentricity)) {
      apogee = clamp(
        elements.semiMajorAxis * (1 + elements.eccentricity) - bodyRadiusM,
        0,
        Number.MAX_SAFE_INTEGER,
      );
      perigee = clamp(
        elements.semiMajorAxis * (1 - elements.eccentricity) - bodyRadiusM,
        0,
        Number.MAX_SAFE_INTEGER,
      );
    }
  } catch {
    // 保持 0，避免在 UI 中出现 NaN / Infinity
  }

  const currentEngine = engines[stageIdx];
  const remainingPropellant = currentEngine
    ? Math.max(0, currentEngine.propellantMassKg - currentEngine.propellantConsumed)
    : 0;

  const fuelPercent = currentEngine && currentEngine.propellantMassKg > 0
    ? clamp((remainingPropellant / currentEngine.propellantMassKg) * 100, 0, 100)
    : 0;

  const throttleFraction = clamp(throttlePercent / 100, 0, 1);
  const mFlow = currentEngine && currentEngine.ispS > 0
    ? (throttleFraction * currentEngine.thrustN) / (currentEngine.ispS * 9.80665)
    : 0;
  const burnTimeRemaining = mFlow > 0 ? remainingPropellant / mFlow : 0;

  return {
    altitudeKm: altitude / 1000,
    speedMs: vMag,
    apogeeKm: apogee / 1000,
    perigeeKm: perigee / 1000,
    fuelPercent,
    currentStage: stageIdx,
    currentStageName: currentEngine?.name ?? '-',
    stageBurnTimeRemaining: burnTimeRemaining,
    missionTime: state.time,
    maxQ,
    massKg: state.mass,
  };
}

/**
 * 执行一帧飞行仿真推进。
 * 在给定的帧时间内使用子步进积分（RK4）推进飞行状态，处理推进剂消耗、
 * 级间分离、重力转弯引导、大气阻力、动压计算以及任务终止判定（坠毁/入轨）。
 * @param input - 单帧仿真输入参数（状态、发动机、玩家输入、时间缩放等）
 * @returns 推进后的完整帧结果（状态、遥测、结束标记等）
 * @throws 当下层积分器或质量流计算遇到无效输入时可能抛出异常
 */
export function simulateFlightFrame(input: SimulationFrameInput): SimulationFrameResult {
  const engines = input.engines.map((engine) => ({ ...engine }));
  let current = cloneState(input.state);
  let stageIdx = input.stageIndex;
  let maxQ = input.maxQ;

  const realElapsedSeconds = Math.max(0.001, input.realElapsedMs / 1000);
  const frameSimSeconds = realElapsedSeconds * Math.max(1, input.timeScale);
  const controlCommand = mapPlayerInputToFlightControl(
    input.playerInput,
    input.throttlePercent,
    realElapsedSeconds,
    getAutoThrustDirection(current, input.bodyRadiusM),
    current.position,
  );

  let throttlePercent = controlCommand.throttlePercent;
  let stageRequested = controlCommand.stageRequested;
  let remainingFrameSeconds = frameSimSeconds;
  let ended = false;
  let endReason: string | undefined;
  let lastThrustDirection = [...controlCommand.thrustDirection] as [number, number, number];
  let plumeActive = false;

  while (remainingFrameSeconds > 1e-9 && !ended) {
    const engine = engines[stageIdx];
    if (!engine) {
      break;
    }

    if (stageRequested) {
      const separated = separateStage(current, engines, stageIdx);
      current = separated.state;
      stageIdx = separated.stageIndex;
      stageRequested = false;
      continue;
    }

    const remainingPropellant = Math.max(0, engine.propellantMassKg - engine.propellantConsumed);
    if (remainingPropellant <= 1e-6 && stageIdx < engines.length - 1) {
      const separated = separateStage(current, engines, stageIdx);
      current = separated.state;
      stageIdx = separated.stageIndex;
      continue;
    }

    const subStepSecondsBase = Math.min(remainingFrameSeconds, MAX_SUBSTEP_SECONDS);
    const guidedDirection = mapPlayerInputToFlightControl(
      input.playerInput,
      throttlePercent,
      0,
      getAutoThrustDirection(current, input.bodyRadiusM),
      current.position,
    ).thrustDirection;
    let control: ControlInput = {
      throttle: clamp(throttlePercent / 100, 0, 1),
      thrustDirection: guidedDirection,
      thrustN: engine.thrustN,
      ispS: engine.ispS,
      dragCoefficient: 0.2,
      crossSectionAreaM2: 3.14,
    };

    if (remainingPropellant <= 1e-6 || control.throttle <= 0) {
      control = {
        throttle: 0,
        thrustDirection: control.thrustDirection,
        thrustN: 0,
        ispS: 0,
        dragCoefficient: control.dragCoefficient,
        crossSectionAreaM2: control.crossSectionAreaM2,
      };
    }

    lastThrustDirection = [...control.thrustDirection] as [number, number, number];
    plumeActive = control.throttle > 0 && control.thrustN > 0 && remainingPropellant > 1e-6;

    const flow = massFlowRate(control);
    const burnLimitedStepSeconds = flow > 0
      ? Math.min(subStepSecondsBase, remainingPropellant / flow)
      : subStepSecondsBase;
    const stepSeconds = Math.max(1e-4, burnLimitedStepSeconds);

    const next = rk4FlightStep(
      current,
      control,
      {
        ...EARTH_FORCE_MODEL,
        bodyRadius: input.bodyRadiusM,
      },
      stepSeconds,
    );

    if (flow > 0) {
      engine.propellantConsumed = clamp(
        engine.propellantConsumed + flow * stepSeconds,
        0,
        engine.propellantMassKg,
      );
    }

    const nextAltitude = getAltitudeM(next, input.bodyRadiusM);
    if (nextAltitude <= 0) {
      current = surfaceClampedState(next, input.bodyRadiusM);
      ended = true;
      endReason = '坠毁';
      break;
    }

    current = next;
    remainingFrameSeconds -= stepSeconds;

    const density = earthAtmosphereDensity(getAltitudeM(current, input.bodyRadiusM));
    const speed = vecMagnitude(current.velocity);
    const q = density > 0 ? 0.5 * density * speed * speed : 0;
    if (q > maxQ) {
      maxQ = q;
    }

    try {
      const elements = stateToElements(
        { position: current.position, velocity: current.velocity, time: current.time },
        MU,
      );
      const perigee = elements.semiMajorAxis * (1 - elements.eccentricity) - input.bodyRadiusM;
      if (perigee > 100_000 && current.time > 300) {
        ended = true;
        endReason = '入轨成功';
      }
    } catch {
      // 忽略，继续飞行
    }
  }

  return {
    state: current,
    engines,
    stageIndex: stageIdx,
    throttlePercent,
    thrustDirectionEci: lastThrustDirection,
    plumeActive,
    telemetry: buildTelemetry(current, engines, stageIdx, throttlePercent, maxQ, input.bodyRadiusM),
    maxQ,
    ended,
    endReason,
  };
}

/**
 * 生成默认（归零）的玩家输入状态。
 * 所有模拟轴输出为 0，按钮为 false，适用于仿真启动前的初始状态。
 * @returns 全零/全禁用的玩家输入快照
 */
export function defaultPlayerInputState(): PlayerInputState {
  return {
    thrust: 0,
    strafe: 0,
    lift: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    boost: false,
    stage: false,
  };
}

/**
 * 默认天体半径，取地球平均半径。
 * 在不指定具体天体时作为回退值使用。
 */
export const DEFAULT_BODY_RADIUS_M = EARTH_RADIUS_M;
