/**
 * @module flight-dynamics/state
 * @description 飞行动力学状态矢量与向量运算
 *
 * 本模块定义航天飞行物理仿真所用的核心数据类型。Phase 0 阶段仅包含
 * 纯引力二体问题所需的最小状态：位置、速度、时间。后续 Phase 将在此基础上
 * 扩展质量、燃料、姿态等字段。
 *
 * @architecture
 * - 所属子系统：飞行动力学 (flight-dynamics)
 * - 架构层级：lib/ 纯业务逻辑层（无 React 依赖）
 * - 职责边界：仅定义数据类型与纯向量运算，不包含物理积分逻辑
 *
 * @unit 全部采用 SI 国际单位制
 * - 位置：米 (m)
 * - 速度：米/秒 (m/s)
 * - 时间：秒 (s)，自参考历元起的秒数
 */

/** 三维向量（固定长度元组，避免堆分配） */
export type Vec3 = readonly [number, number, number];

/** 可变三维向量（用于中间计算结果） */
export type MutableVec3 = [number, number, number];

/**
 * 飞行器状态矢量。
 *
 * 描述某一时刻飞行器在地心惯性系 (ECI) 下的运动状态。
 * Phase 0 的纯二体积分器仅消费 position / velocity / time 三个字段。
 */
export interface StateVector {
  /** 位置 (m)，地心惯性系 */
  position: MutableVec3;
  /** 速度 (m/s)，地心惯性系 */
  velocity: MutableVec3;
  /** 时间 (s)，自参考历元起 */
  time: number;
}

// ---------------------------------------------------------------------------
// 向量运算（纯函数，不修改输入）
// ---------------------------------------------------------------------------

/** 向量加法 */
export function vecAdd(a: Vec3, b: Vec3): MutableVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** 向量减法 */
export function vecSub(a: Vec3, b: Vec3): MutableVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** 标量乘法 */
export function vecScale(a: Vec3, s: number): MutableVec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

/** 向量点积 */
export function vecDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** 向量叉积 */
export function vecCross(a: Vec3, b: Vec3): MutableVec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** 向量模长 */
export function vecMagnitude(a: Vec3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

/** 向量模长的平方（避免开方，用于比较） */
export function vecMagnitudeSq(a: Vec3): number {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

/** 两点间距离 */
export function vecDistance(a: Vec3, b: Vec3): number {
  return vecMagnitude(vecSub(a, b));
}

// ---------------------------------------------------------------------------
// 状态矢量辅助函数
// ---------------------------------------------------------------------------

/** 深拷贝状态矢量（防止外部修改内部数据） */
export function cloneState(s: StateVector): StateVector {
  return {
    position: [s.position[0], s.position[1], s.position[2]],
    velocity: [s.velocity[0], s.velocity[1], s.velocity[2]],
    time: s.time,
  };
}

/** 创建状态矢量 */
export function makeState(
  position: Vec3,
  velocity: Vec3,
  time = 0,
): StateVector {
  return {
    position: [position[0], position[1], position[2]],
    velocity: [velocity[0], velocity[1], velocity[2]],
    time,
  };
}

/**
 * 计算比机械能 (specific mechanical energy)。
 * ε = v²/2 - μ/|r|
 * 纯引力二体问题中此量守恒。
 *
 * @param state 状态矢量
 * @param mu    中心天体引力参数 (m³/s²)
 */
export function specificEnergy(state: StateVector, mu: number): number {
  const v2 = vecMagnitudeSq(state.velocity);
  const r = vecMagnitude(state.position);
  return v2 / 2 - mu / r;
}

/**
 * 计算比角动量矢量 (specific angular momentum)。
 * h = r × v
 * 纯引力二体问题中此矢量守恒。
 *
 * @param state 状态矢量
 */
export function specificAngularMomentum(state: StateVector): MutableVec3 {
  return vecCross(state.position, state.velocity);
}
