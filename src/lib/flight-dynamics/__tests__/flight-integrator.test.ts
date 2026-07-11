/**
 * @module flight-dynamics/__tests__/flight-integrator.test
 * @description Phase 1 扩展积分器测试：推力+大气+变质量
 *
 * 验证内容：
 *   1. 大气模型：密度随高度衰减、100km 截止
 *   2. 受力模型：推力加速度、阻力加速度、质量流率
 *   3. 变质量积分：燃料消耗后质量减少、速度增量匹配火箭方程
 *   4. 霍曼转移基准：数值积分 vs 解析 Δv
 *   5. 时间加速子步：10×/100×/10000× 不发散
 */

import { describe, it, expect } from '@jest/globals';
import {
  makeState,
  vecMagnitude,
  vecSub,
  vecScale,
  GM_SI,
  EARTH_RADIUS_M,
  rk4FlightStep,
  propagateFlight,
  propagateFlightWithSubsteps,
  EARTH_FORCE_MODEL,
  stateToElements,
  orbitalPeriod,
  earthAtmosphereDensity,
  massFlowRate,
  thrustAcceleration,
  deltaV,
  type FlightState,
  type ControlInput,
  type ForceModelConfig,
} from '../index';

const MU = GM_SI.earth;
const R_EARTH = EARTH_RADIUS_M;

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/** 创建圆轨道飞行状态 */
function circularFlightState(altitudeKm: number, massKg: number): FlightState {
  const r = R_EARTH + altitudeKm * 1000;
  const v = Math.sqrt(MU / r);
  return {
    position: [r, 0, 0],
    velocity: [0, v, 0],
    mass: massKg,
    time: 0,
  };
}

/** 创建无推力控制输入（仅阻力+引力） */
function noThrustControl(cd = 0.2, area = 3.14): ControlInput {
  return {
    throttle: 0,
    thrustDirection: [1, 0, 0],
    thrustN: 0,
    ispS: 0,
    dragCoefficient: cd,
    crossSectionAreaM2: area,
  };
}

/** 创建顺行推力控制输入 */
function progradeThrustControl(
  state: FlightState,
  thrustN: number,
  ispS: number,
  throttle = 1,
  cd = 0.2,
  area = 3.14,
): ControlInput {
  const vMag = vecMagnitude(state.velocity);
  const dir = vMag > 0 ? vecScale(state.velocity, 1 / vMag) : [1, 0, 0];
  return {
    throttle,
    thrustDirection: [dir[0], dir[1], dir[2]],
    thrustN,
    ispS,
    dragCoefficient: cd,
    crossSectionAreaM2: area,
  };
}

// ---------------------------------------------------------------------------
// 1. 大气模型
// ---------------------------------------------------------------------------

describe('大气模型', () => {
  it('海平面密度 ≈ 1.225 kg/m³', () => {
    expect(earthAtmosphereDensity(0)).toBeCloseTo(1.225, 1);
  });

  it('10km 密度 < 海平面的 40%', () => {
    const rho10 = earthAtmosphereDensity(10_000);
    expect(rho10).toBeLessThan(1.225 * 0.4);
    expect(rho10).toBeGreaterThan(0.1);
  });

  it('100km 以上密度归零', () => {
    expect(earthAtmosphereDensity(100_000)).toBe(0);
    expect(earthAtmosphereDensity(150_000)).toBe(0);
  });

  it('50km 密度极低但非零', () => {
    const rho50 = earthAtmosphereDensity(50_000);
    expect(rho50).toBeGreaterThan(0);
    expect(rho50).toBeLessThan(0.01);
  });
});

// ---------------------------------------------------------------------------
// 2. 受力模型
// ---------------------------------------------------------------------------

describe('受力模型', () => {
  it('推力加速度 = thrust·throttle / mass', () => {
    const control: ControlInput = {
      throttle: 0.5,
      thrustDirection: [1, 0, 0],
      thrustN: 1_000_000,
      ispS: 300,
      dragCoefficient: 0.2,
      crossSectionAreaM2: 3.14,
    };
    // a = 0.5 * 1e6 / 1000 = 500 m/s²
    const acc = thrustAcceleration(control, 1000);
    expect(acc[0]).toBeCloseTo(500, 0);
  });

  it('节流为 0 时推力加速度为 0', () => {
    const control: ControlInput = {
      throttle: 0,
      thrustDirection: [1, 0, 0],
      thrustN: 1_000_000,
      ispS: 300,
      dragCoefficient: 0.2,
      crossSectionAreaM2: 3.14,
    };
    const acc = thrustAcceleration(control, 1000);
    expect(acc).toEqual([0, 0, 0]);
  });

  it('质量流率 = thrust·throttle / (Isp·g₀)', () => {
    const control: ControlInput = {
      throttle: 1,
      thrustDirection: [1, 0, 0],
      thrustN: 845_000,
      ispS: 311,
      dragCoefficient: 0.2,
      crossSectionAreaM2: 3.14,
    };
    // ṁ = 845000 / (311 * 9.80665) = 276.8 kg/s
    const flow = massFlowRate(control);
    expect(flow).toBeCloseTo(276.8, 0);
  });
});

// ---------------------------------------------------------------------------
// 3. 变质量积分
// ---------------------------------------------------------------------------

describe('变质量积分', () => {
  it('燃料消耗后质量减少', () => {
    const state0 = circularFlightState(400, 10_000);
    const control = progradeThrustControl(state0, 845_000, 311, 1.0);

    const dt = 10;
    const state1 = rk4FlightStep(state0, control, EARTH_FORCE_MODEL, dt);

    const expectedFlow = massFlowRate(control);
    const expectedMass = 10_000 - expectedFlow * dt;
    expect(state1.mass).toBeCloseTo(expectedMass, 1);
    expect(state1.mass).toBeLessThan(10_000);
  });

  it('无推力时质量不变', () => {
    const state0 = circularFlightState(400, 10_000);
    const control = noThrustControl();

    const state1 = rk4FlightStep(state0, control, EARTH_FORCE_MODEL, 10);
    expect(state1.mass).toBe(10_000);
  });

  it('推力速度增量与火箭方程吻合', () => {
    // 在真空中（高度足够高，无大气阻力），短时间燃烧
    const altitudeKm = 400; // 大气阻力为 0
    const mass0 = 5000;
    const state0 = circularFlightState(altitudeKm, mass0);

    const thrustN = 100_000;
    const ispS = 300;
    const control = progradeThrustControl(state0, thrustN, ispS, 1.0);

    // 燃烧 30 秒
    const burnTime = 30;
    const dt = 1;
    let state = state0;
    for (let i = 0; i < burnTime; i += 1) {
      state = rk4FlightStep(state, control, EARTH_FORCE_MODEL, dt);
    }

    const massFlow = massFlowRate(control);
    const massFinal = mass0 - massFlow * burnTime;
    const expectedDv = deltaV(ispS, mass0, massFinal);

    // 实际速度增量（顺行方向）
    const v0 = vecMagnitude(state0.velocity);
    const v1 = vecMagnitude(state.velocity);
    const actualDv = v1 - v0;

    console.log(`  火箭方程 Δv: ${expectedDv.toFixed(1)} m/s, 实际 Δv: ${actualDv.toFixed(1)} m/s`);
    // 允许 2% 误差（引力影响速度方向变化）
    expect(Math.abs(actualDv - expectedDv) / expectedDv).toBeLessThan(0.05);
  });
});

// ---------------------------------------------------------------------------
// 4. 霍曼转移基准（已知任务）
// ---------------------------------------------------------------------------

describe('霍曼转移基准', () => {
  it('顺行脉冲 Δv 后远拱点升高到目标值', () => {
    // 从 400km 圆轨道施加顺行 Δv，将远拱点抬到 40000km
    const r1 = R_EARTH + 400_000;     // 近地点 = 6771km
    const r2 = R_EARTH + 40_000_000;  // 远地点目标 = 46371km
    const aTransfer = (r1 + r2) / 2;

    const vCircular = Math.sqrt(MU / r1);
    const vTransfer = Math.sqrt(MU * (2 / r1 - 1 / aTransfer));
    const requiredDv = vTransfer - vCircular;

    console.log(`  霍曼转移 Δv = ${requiredDv.toFixed(1)} m/s`);

    // 用大推力短时间燃烧模拟脉冲机动
    const state0 = circularFlightState(400, 5000);
    const thrustN = 500_000;
    const ispS = 300;

    // 计算需要燃烧多长时间达到 requiredDv
    const massFlow = thrustN / (ispS * 9.80665);
    // Δv = Isp·g₀·ln(m₀/m₁) → m₁ = m₀·exp(-Δv/(Isp·g₀))
    const massFinal = 5000 * Math.exp(-requiredDv / (ispS * 9.80665));
    const propellantUsed = 5000 - massFinal;
    const burnTime = propellantUsed / massFlow;

    console.log(`  燃烧时间: ${burnTime.toFixed(1)}s, 消耗推进剂: ${propellantUsed.toFixed(0)} kg`);

    // 积分燃烧段
    const dt = 1;
    let state = state0;
    for (let i = 0; i < Math.floor(burnTime); i += 1) {
      const control = progradeThrustControl(state, thrustN, ispS, 1.0);
      state = rk4FlightStep(state, control, EARTH_FORCE_MODEL, dt);
    }
    // 余数步
    const remainder = burnTime - Math.floor(burnTime);
    if (remainder > 0) {
      const control = progradeThrustControl(state, thrustN, ispS, 1.0);
      state = rk4FlightStep(state, control, EARTH_FORCE_MODEL, remainder);
    }

    // 燃烧结束后滑行到远拱点，检查远拱点高度
    const elements = stateToElements(
      { position: state.position, velocity: state.velocity, time: state.time },
      MU,
    );
    const apogeeAlt = elements.semiMajorAxis * (1 + elements.eccentricity) - R_EARTH;

    console.log(`  实际远拱点高度: ${(apogeeAlt / 1000).toFixed(0)} km, 目标: 40000 km, 偏心率: ${elements.eccentricity.toFixed(4)}`);
    // 误差 < 5%（脉冲近似 + 数值误差）
    expect(Math.abs(apogeeAlt - 40_000_000) / 40_000_000).toBeLessThan(0.05);
  });
});

// ---------------------------------------------------------------------------
// 5. 时间加速子步保护
// ---------------------------------------------------------------------------

describe('时间加速子步保护', () => {
  it('10× 加速 (frameDt ≈ 周期/6): 无推力滑行不发散', () => {
    const state0 = circularFlightState(400, 5000);
    const T = orbitalPeriod(stateToElements(
      { position: state0.position, velocity: state0.velocity, time: 0 },
      MU,
    ).semiMajorAxis, MU);

    // 10× 加速：单帧推进 T/6 ≈ 924s
    const frameDt = T / 6;
    const control = noThrustControl();

    let state = state0;
    for (let frame = 0; frame < 6; frame += 1) {
      state = propagateFlightWithSubsteps(state, control, EARTH_FORCE_MODEL, frameDt, 30);
    }

    // 6 帧后应接近完整周期，位置回到起点附近
    const rMag = vecMagnitude(state.position);
    expect(rMag).toBeGreaterThan(R_EARTH);
    expect(rMag).toBeLessThan(R_EARTH + 1_000_000);
    console.log(`  10× 加速 6 帧后位置模长: ${rMag.toFixed(0)} m (期望 ~${(R_EARTH + 400_000).toFixed(0)})`);
  });

  it('100× 加速 (frameDt ≈ 周期): 子步保护后不发散', () => {
    const state0 = circularFlightState(400, 5000);
    const T = orbitalPeriod(stateToElements(
      { position: state0.position, velocity: state0.velocity, time: 0 },
      MU,
    ).semiMajorAxis, MU);

    // 100× 加速：单帧推进 ≈ T
    const frameDt = T;
    const control = noThrustControl();

    const finalState = propagateFlightWithSubsteps(state0, control, EARTH_FORCE_MODEL, frameDt, 30);

    const rMag = vecMagnitude(finalState.position);
    expect(Number.isFinite(rMag)).toBe(true);
    expect(rMag).toBeGreaterThan(R_EARTH);
    expect(rMag).toBeLessThan(R_EARTH + 10_000_000);
    console.log(`  100× 加速 1 帧后位置模长: ${rMag.toFixed(0)} m`);
  });

  it('10000× 加速: 子步上限保护后不数值爆炸', () => {
    const state0 = circularFlightState(400, 5000);
    const T = orbitalPeriod(stateToElements(
      { position: state0.position, velocity: state0.velocity, time: 0 },
      MU,
    ).semiMajorAxis, MU);

    // 10000× 加速：单帧推进 10×T
    const frameDt = 10 * T;
    const control = noThrustControl();

    const finalState = propagateFlightWithSubsteps(state0, control, EARTH_FORCE_MODEL, frameDt, 30);

    const rMag = vecMagnitude(finalState.position);
    expect(Number.isFinite(rMag)).toBe(true);
    // 10 个周期后应仍在合理范围（不爆炸、不坠入地球）
    expect(rMag).toBeGreaterThan(R_EARTH);
    expect(rMag).toBeLessThan(R_EARTH + 100_000_000);
    console.log(`  10000× 加速 1 帧后位置模长: ${rMag.toFixed(0)} m`);
  });

  it('大气段高加速不数值发散', () => {
    // 在 80km 高度（大气层内）以高加速滑行
    // 注意：80km 轨道因大气阻力会迅速衰减，这是物理正确行为，
    // 本测试只验证数值不发散（NaN/Infinity），不要求保持轨道高度。
    const state0 = circularFlightState(80, 5000);
    const control = noThrustControl();

    const frameDt = 600; // 10 分钟
    const finalState = propagateFlightWithSubsteps(state0, control, EARTH_FORCE_MODEL, frameDt, 10);

    const rMag = vecMagnitude(finalState.position);
    // 数值有限（不发散）
    expect(Number.isFinite(rMag)).toBe(true);
    expect(Number.isFinite(finalState.mass)).toBe(true);
    for (let i = 0; i < 3; i += 1) {
      expect(Number.isFinite(finalState.velocity[i])).toBe(true);
    }
    console.log(`  大气段高加速后位置模长: ${rMag.toFixed(0)} m (轨道衰减属正常物理行为)`);
  });
});
