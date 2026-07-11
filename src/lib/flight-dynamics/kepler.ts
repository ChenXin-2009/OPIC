/**
 * @module flight-dynamics/kepler
 * @description 二体问题解析解（开普勒传播器）
 *
 * 本模块提供二体问题的解析解，作为数值积分器 (RK4) 的精度基准。
 * 给定初始状态矢量，可在任意时刻解析计算出精确的位置和速度，
 * 无需数值积分的累积误差。
 *
 * 算法流程：
 *   1. 由初始状态计算轨道根数 (a, e, i, Ω, ω, ν₀)
 *   2. 通过开普勒方程将真近点角推进到目标时刻
 *   3. 由新真近点角重建位置/速度矢量
 *
 * @architecture
 * - 所属子系统：飞行动动力学 (flight-dynamics)
 * - 架构层级：lib/ 纯业务逻辑层
 * - 职责边界：纯解析计算，不含数值积分
 *
 * @unit SI 国际单位制
 *
 * @references
 * - Bate, Mueller, White — Fundamentals of Astrodynamics, Chapter 2-4
 * - Vallado — Fundamentals of Astrodynamics and Applications, Algorithm 10
 */

import {
  type StateVector,
  type Vec3,
  type MutableVec3,
  vecMagnitude,
  vecCross,
  vecDot,
  vecScale,
  vecAdd,
  vecSub,
} from './state';

/** 开普勒轨道根数 */
export interface OrbitalElements {
  /** 半长轴 (m) */
  semiMajorAxis: number;
  /** 偏心率 (无量纲) */
  eccentricity: number;
  /** 轨道倾角 (rad) */
  inclination: number;
  /** 升交点赤经 (rad) */
  raan: number;
  /** 近地点幅角 (rad) */
  argOfPeriapsis: number;
  /** 历元时刻的真近点角 (rad) */
  trueAnomaly: number;
  /** 历元时刻 (s) */
  epoch: number;
}

const TWO_PI = 2 * Math.PI;
const KEPLER_TOL = 1e-12;
const KEPLER_MAX_ITER = 100;

function normalizeAngle(a: number): number {
  let result = a % TWO_PI;
  if (result < 0) result += TWO_PI;
  return result;
}

/**
 * 由状态矢量计算轨道根数。
 *
 * @param state 状态矢量
 * @param mu    引力参数 (m³/s²)
 * @returns     轨道根数
 */
export function stateToElements(state: StateVector, mu: number): OrbitalElements {
  const r = state.position;
  const v = state.velocity;
  const rMag = vecMagnitude(r);

  // 比角动量矢量 h = r × v
  const h = vecCross(r, v);
  const hMag = vecMagnitude(h);

  // 节点矢量 n = k × h（指向升交点）
  const n: MutableVec3 = [-h[1], h[0], 0];
  const nMag = vecMagnitude(n);

  // 偏心率矢量 e_vec = (v × h)/μ - r/|r|
  const vCrossH = vecCross(v, h);
  const eVec: MutableVec3 = [
    vCrossH[0] / mu - r[0] / rMag,
    vCrossH[1] / mu - r[1] / rMag,
    vCrossH[2] / mu - r[2] / rMag,
  ];
  const e = vecMagnitude(eVec);

  // 比机械能
  const xi = vecDot(v, v) / 2 - mu / rMag;
  const a = -mu / (2 * xi);

  // 倾角
  const i = Math.acos(h[2] / hMag);

  // 升交点赤经
  let raan = 0;
  if (nMag > 1e-12) {
    raan = Math.acos(n[0] / nMag);
    if (n[1] < 0) raan = TWO_PI - raan;
  }

  // 近地点幅角
  let omega = 0;
  if (nMag > 1e-12 && e > 1e-12) {
    omega = Math.acos(vecDot(n, eVec) / (nMag * e));
    if (eVec[2] < 0) omega = TWO_PI - omega;
  }

  // 真近点角
  let nu = 0;
  if (e > 1e-12) {
    nu = Math.acos(vecDot(eVec, r) / (e * rMag));
    if (vecDot(r, v) < 0) nu = TWO_PI - nu;
  } else {
    // 圆轨道：用纬度幅角代替
    let u = 0;
    if (nMag > 1e-12) {
      u = Math.acos(vecDot(n, r) / (nMag * rMag));
      if (r[2] < 0) u = TWO_PI - u;
    } else {
      // 赤道圆轨道：用真近点角 = 0
      u = 0;
    }
    nu = u - omega;
  }

  return {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: normalizeAngle(i),
    raan: normalizeAngle(raan),
    argOfPeriapsis: normalizeAngle(omega),
    trueAnomaly: normalizeAngle(nu),
    epoch: state.time,
  };
}

/**
 * 解开普勒方程 M = E - e·sin(E)，求偏近点角 E。
 * 使用牛顿-拉夫森迭代。
 */
function solveKepler(meanAnomaly: number, e: number): number {
  let E = meanAnomaly;
  for (let iter = 0; iter < KEPLER_MAX_ITER; iter += 1) {
    const dE = (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < KEPLER_TOL) break;
  }
  return E;
}

/**
 * 由轨道根数 + 目标时刻计算状态矢量（解析传播）。
 *
 * @param elements 轨道根数（含历元时刻）
 * @param mu       引力参数 (m³/s²)
 * @param targetTime 目标时刻 (s)
 * @returns        目标时刻的状态矢量
 */
export function elementsToState(
  elements: OrbitalElements,
  mu: number,
  targetTime: number,
): StateVector {
  const { semiMajorAxis: a, eccentricity: e, inclination: i, raan: Omega, argOfPeriapsis: omega, trueAnomaly: nu0, epoch } = elements;

  const dt = targetTime - epoch;

  // 平均运动 n = sqrt(μ/a³)
  const n = Math.sqrt(mu / (a * a * a));

  // 历元时刻的偏近点角 E0
  const sinNu0 = Math.sin(nu0);
  const cosNu0 = Math.cos(nu0);
  const E0 = Math.atan2(Math.sqrt(1 - e * e) * sinNu0, e + cosNu0);

  // 历元时刻平近点角 M0 = E0 - e·sin(E0)
  const M0 = E0 - e * Math.sin(E0);

  // 目标时刻平近点角
  const M = M0 + n * dt;

  // 解开普勒方程求 E
  const E = solveKepler(M, e);

  // 真近点角 ν
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);

  // 轨道平面内的位置（近地点方向为 x 轴）
  const p = a * (1 - e * e);
  const rOrb = p / (1 + e * Math.cos(nu));
  const xOrb = rOrb * Math.cos(nu);
  const yOrb = rOrb * Math.sin(nu);

  // 速度（轨道平面，vis-viva 推导）
  const sqrtMuP = Math.sqrt(mu / p);
  const vxOrb = -sqrtMuP * Math.sin(nu);
  const vyOrb = sqrtMuP * (e + Math.cos(nu));

  // 旋转到惯性系：R = Rz(-Ω) · Rx(-i) · Rz(-ω)
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  // 旋转矩阵（PQW → ECI）
  const r11 = cosO * cosW - sinO * sinW * cosI;
  const r12 = -cosO * sinW - sinO * cosW * cosI;
  const r21 = sinO * cosW + cosO * sinW * cosI;
  const r22 = -sinO * sinW + cosO * cosW * cosI;
  const r31 = sinW * sinI;
  const r32 = cosW * sinI;

  const position: MutableVec3 = [
    r11 * xOrb + r12 * yOrb,
    r21 * xOrb + r22 * yOrb,
    r31 * xOrb + r32 * yOrb,
  ];

  const velocity: MutableVec3 = [
    r11 * vxOrb + r12 * vyOrb,
    r21 * vxOrb + r22 * vyOrb,
    r31 * vxOrb + r32 * vyOrb,
  ];

  return { position, velocity, time: targetTime };
}

/**
 * 解析传播：给定初始状态，计算任意时刻的精确状态。
 * 等价于 stateToElements → elementsToState 的组合。
 *
 * @param initialState 初始状态
 * @param mu           引力参数 (m³/s²)
 * @param targetTime   目标时刻 (s)
 * @returns            目标时刻的状态矢量
 */
export function propagateAnalytical(
  initialState: StateVector,
  mu: number,
  targetTime: number,
): StateVector {
  const elements = stateToElements(initialState, mu);
  return elementsToState(elements, mu, targetTime);
}

/**
 * 计算轨道周期。
 *
 * @param a  半长轴 (m)
 * @param mu 引力参数 (m³/s²)
 * @returns   周期 (s)
 */
export function orbitalPeriod(a: number, mu: number): number {
  return TWO_PI * Math.sqrt((a * a * a) / mu);
}
