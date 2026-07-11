/**
 * verify-flight-dynamics.ts
 *
 * Phase 0 Task 0.2 + Phase 1 Task 1.3 验证脚本。
 *
 * 验证内容：
 *   Phase 0:
 *   1. 圆形轨道 — 数值积分 vs 解析解，位置误差 < 容差
 *   2. 椭圆轨道 — 数值积分 vs 解析解，位置误差 < 容差
 *   3. 守恒量 — 比机械能 ±5%、比角动量 < 1e-6
 *   4. fast-check 属性测试 — 随机轨道不发散
 *
 *   Phase 1:
 *   5. 大气模型 — 密度衰减与截止
 *   6. 变质量积分 — 燃料消耗与火箭方程吻合
 *   7. 霍曼转移基准 — 数值积分 vs 解析 Δv
 *   8. 时间加速子步 — 10000× 不发散
 *
 * 运行方式：npx tsx test/verify-flight-dynamics.ts
 * 退出码：0 = 通过，1 = 失败（AI Agent 可直接读退出码判断）
 */

import fc from 'fast-check';
import {
  makeState,
  specificEnergy,
  specificAngularMomentum,
  vecDistance,
  vecMagnitude,
  vecScale,
  GM_SI,
  EARTH_RADIUS_M,
  propagate,
  propagateAnalytical,
  stateToElements,
  orbitalPeriod,
  earthAtmosphereDensity,
  massFlowRate,
  thrustAcceleration,
  rk4FlightStep,
  propagateFlightWithSubsteps,
  EARTH_FORCE_MODEL,
  deltaV,
  type StateVector,
  type FlightState,
  type ControlInput,
} from '../src/lib/flight-dynamics';

const MU_EARTH = GM_SI.earth;

// ---------------------------------------------------------------------------
// 测试用轨道生成器
// ---------------------------------------------------------------------------

function circularOrbit(altitudeKm: number, inclinationDeg: number): StateVector {
  const r = EARTH_RADIUS_M + altitudeKm * 1000;
  const v = Math.sqrt(MU_EARTH / r);
  const inc = (inclinationDeg * Math.PI) / 180;
  return makeState([r, 0, 0], [0, v * Math.cos(inc), v * Math.sin(inc)], 0);
}

function ellipticalOrbit(
  perigeeKm: number,
  apogeeKm: number,
  inclinationDeg: number,
): StateVector {
  const rp = EARTH_RADIUS_M + perigeeKm * 1000;
  const ra = EARTH_RADIUS_M + apogeeKm * 1000;
  const a = (rp + ra) / 2;
  const vp = Math.sqrt(MU_EARTH * (2 / rp - 1 / a));
  const inc = (inclinationDeg * Math.PI) / 180;
  return makeState([rp, 0, 0], [0, vp * Math.cos(inc), vp * Math.sin(inc)], 0);
}

// ---------------------------------------------------------------------------
// 测试用例
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  run: () => boolean;
}

const testCases: TestCase[] = [
  {
    name: '圆形轨道 1/4 周期 vs 解析解 (误差 < 100m)',
    run: () => {
      const state0 = circularOrbit(400, 0);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const num = propagate(state0, { dt: 10, duration: T / 4, mu: MU_EARTH });
      const ana = propagateAnalytical(state0, MU_EARTH, T / 4);
      const err = vecDistance(num.position, ana.position);
      console.log(`    位置误差: ${err.toFixed(2)} m`);
      return err < 100;
    },
  },
  {
    name: '圆形轨道完整周期回归 (误差 < 200m)',
    run: () => {
      const state0 = circularOrbit(400, 0);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const final = propagate(state0, { dt: 10, duration: T, mu: MU_EARTH });
      const err = vecDistance(final.position, state0.position);
      console.log(`    回归误差: ${err.toFixed(2)} m`);
      return err < 200;
    },
  },
  {
    name: 'ISS 倾角圆轨道 1/2 周期 vs 解析解 (误差 < 150m)',
    run: () => {
      const state0 = circularOrbit(420, 51.6);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const num = propagate(state0, { dt: 10, duration: T / 2, mu: MU_EARTH });
      const ana = propagateAnalytical(state0, MU_EARTH, T / 2);
      const err = vecDistance(num.position, ana.position);
      console.log(`    位置误差: ${err.toFixed(2)} m`);
      return err < 150;
    },
  },
  {
    name: '椭圆轨道完整周期回归 (误差 < 500m)',
    run: () => {
      const state0 = ellipticalOrbit(400, 40000, 0);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const final = propagate(state0, { dt: 30, duration: T, mu: MU_EARTH });
      const err = vecDistance(final.position, state0.position);
      console.log(`    回归误差: ${err.toFixed(2)} m`);
      return err < 500;
    },
  },
  {
    name: 'GTO 高偏心率轨道 1/4 周期 vs 解析解 (误差 < 2000m)',
    run: () => {
      const state0 = ellipticalOrbit(200, 35786, 28.5);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const num = propagate(state0, { dt: 30, duration: T / 4, mu: MU_EARTH });
      const ana = propagateAnalytical(state0, MU_EARTH, T / 4);
      const err = vecDistance(num.position, ana.position);
      console.log(`    位置误差: ${err.toFixed(2)} m, e=${el.eccentricity.toFixed(4)}`);
      return err < 2000;
    },
  },
  {
    name: '比机械能守恒 (±5%)',
    run: () => {
      const state0 = ellipticalOrbit(400, 40000, 30);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const e0 = specificEnergy(state0, MU_EARTH);
      const points = [T / 4, T / 2, (3 * T) / 4, T];
      for (const t of points) {
        const s = propagate(state0, { dt: 30, duration: t, mu: MU_EARTH });
        const e = specificEnergy(s, MU_EARTH);
        const relErr = Math.abs((e - e0) / e0);
        console.log(`    t=${t.toFixed(0)}s 能量误差: ${(relErr * 100).toFixed(6)}%`);
        if (relErr >= 0.05) return false;
      }
      return true;
    },
  },
  {
    name: '比角动量守恒 (相对误差 < 1e-6)',
    run: () => {
      const state0 = circularOrbit(500, 45);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const h0 = vecMagnitude(specificAngularMomentum(state0));
      const points = [T / 4, T / 2, T];
      for (const t of points) {
        const s = propagate(state0, { dt: 10, duration: t, mu: MU_EARTH });
        const h = vecMagnitude(specificAngularMomentum(s));
        const relErr = Math.abs((h - h0) / h0);
        console.log(`    t=${t.toFixed(0)}s 角动量误差: ${relErr.toExponential(3)}`);
        if (relErr >= 1e-6) return false;
      }
      return true;
    },
  },
  {
    name: '10× 时间加速不发散 (能量误差 < 1%)',
    run: () => {
      const state0 = circularOrbit(400, 0);
      const el = stateToElements(state0, MU_EARTH);
      const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
      const e0 = specificEnergy(state0, MU_EARTH);
      const final = propagate(state0, { dt: 100, duration: T, mu: MU_EARTH });
      const e = specificEnergy(final, MU_EARTH);
      const relErr = Math.abs((e - e0) / e0);
      const rMag = vecMagnitude(final.position);
      console.log(`    能量误差: ${(relErr * 100).toFixed(4)}%, 位置模长: ${rMag.toFixed(0)} m`);
      return relErr < 0.01 && rMag > EARTH_RADIUS_M && rMag < EARTH_RADIUS_M + 1_000_000;
    },
  },
  {
    name: 'fast-check: 随机轨道积分不发散',
    run: () => {
      const result = fc.check(
        fc.property(
          fc.record({
            alt: fc.integer({ min: 200, max: 2000 }),
            apo: fc.integer({ min: 200, max: 60000 }),
            inc: fc.integer({ min: 0, max: 180 }),
            dt: fc.constantFrom(5, 10, 30),
          }),
          (p) => {
            const s0 = ellipticalOrbit(p.alt, Math.max(p.apo, p.alt + 100), p.inc);
            const el = stateToElements(s0, MU_EARTH);
            const T = orbitalPeriod(el.semiMajorAxis, MU_EARTH);
            const e0 = specificEnergy(s0, MU_EARTH);
            const s = propagate(s0, { dt: p.dt, duration: T / 4, mu: MU_EARTH });
            const r = vecMagnitude(s.position);
            if (!Number.isFinite(r) || r < EARTH_RADIUS_M || r > EARTH_RADIUS_M + 1e8) return false;
            const e = specificEnergy(s, MU_EARTH);
            return Math.abs((e - e0) / e0) < 0.05;
          },
        ),
        { numRuns: 50 },
      );
      console.log(`    ${result.counterexample ? '发现反例' : '50 次随机全部通过'}`);
      return result.counterexample === null;
    },
  },
  {
    name: 'fast-check: 解析解往返一致性 (误差 < 1e-6 m)',
    run: () => {
      const result = fc.check(
        fc.property(
          fc.record({
            alt: fc.integer({ min: 200, max: 5000 }),
            inc: fc.integer({ min: 0, max: 90 }),
          }),
          (p) => {
            const s0 = circularOrbit(p.alt, p.inc);
            const recon = propagateAnalytical(s0, MU_EARTH, 0);
            const err = vecDistance(recon.position, s0.position);
            return err < 1e-6;
          },
        ),
        { numRuns: 30 },
      );
      console.log(`    ${result.counterexample ? '发现反例' : '30 次随机全部通过'}`);
      return result.counterexample === null;
    },
  },

  // =======================================================================
  // Phase 1 扩展测试
  // =======================================================================

  {
    name: '[Phase1] 大气模型：海平面密度 ≈ 1.225, 100km 截止',
    run: () => {
      const rho0 = earthAtmosphereDensity(0);
      const rho50 = earthAtmosphereDensity(50_000);
      const rho100 = earthAtmosphereDensity(100_000);
      console.log(`    ρ(0m)=${rho0.toFixed(3)}, ρ(50km)=${rho50.toExponential(2)}, ρ(100km)=${rho100}`);
      return Math.abs(rho0 - 1.225) < 0.01 && rho50 > 0 && rho50 < 0.01 && rho100 === 0;
    },
  },
  {
    name: '[Phase1] 变质量积分：燃料消耗后质量减少',
    run: () => {
      const r = EARTH_RADIUS_M + 400_000;
      const v = Math.sqrt(MU_EARTH / r);
      const state0: FlightState = {
        position: [r, 0, 0],
        velocity: [0, v, 0],
        mass: 10_000,
        time: 0,
      };
      const control: ControlInput = {
        throttle: 1.0,
        thrustDirection: [0, 1, 0],
        thrustN: 845_000,
        ispS: 311,
        dragCoefficient: 0.2,
        crossSectionAreaM2: 3.14,
      };
      const dt = 10;
      const state1 = rk4FlightStep(state0, control, EARTH_FORCE_MODEL, dt);
      const expectedFlow = massFlowRate(control);
      const expectedMass = 10_000 - expectedFlow * dt;
      console.log(`    初始质量: 10000 kg, 10s 后: ${state1.mass.toFixed(1)} kg (期望 ${expectedMass.toFixed(1)})`);
      return Math.abs(state1.mass - expectedMass) < 1 && state1.mass < 10_000;
    },
  },
  {
    name: '[Phase1] 推力速度增量与火箭方程吻合 (< 5% 误差)',
    run: () => {
      const r = EARTH_RADIUS_M + 400_000;
      const v = Math.sqrt(MU_EARTH / r);
      const mass0 = 5000;
      const state0: FlightState = {
        position: [r, 0, 0],
        velocity: [0, v, 0],
        mass: mass0,
        time: 0,
      };
      const thrustN = 100_000;
      const ispS = 300;
      const burnTime = 30;
      const dt = 1;
      let state = state0;
      for (let i = 0; i < burnTime; i += 1) {
        const vMag = vecMagnitude(state.velocity);
        const dir = vMag > 0 ? vecScale(state.velocity, 1 / vMag) : [0, 1, 0];
        const control: ControlInput = {
          throttle: 1.0,
          thrustDirection: [dir[0], dir[1], dir[2]],
          thrustN,
          ispS,
          dragCoefficient: 0.2,
          crossSectionAreaM2: 3.14,
        };
        state = rk4FlightStep(state, control, EARTH_FORCE_MODEL, dt);
      }
      const massFlow = massFlowRate({ throttle: 1, thrustDirection: [0, 1, 0], thrustN, ispS, dragCoefficient: 0.2, crossSectionAreaM2: 3.14 });
      const massFinal = mass0 - massFlow * burnTime;
      const expectedDv = deltaV(ispS, mass0, massFinal);
      const actualDv = vecMagnitude(state.velocity) - v;
      const relErr = Math.abs(actualDv - expectedDv) / expectedDv;
      console.log(`    火箭方程 Δv: ${expectedDv.toFixed(1)} m/s, 实际: ${actualDv.toFixed(1)} m/s, 误差: ${(relErr * 100).toFixed(2)}%`);
      return relErr < 0.05;
    },
  },
  {
    name: '[Phase1] 霍曼转移基准：数值 Δv 达到目标远拱点 (< 5%)',
    run: () => {
      const r1 = EARTH_RADIUS_M + 400_000;
      const r2 = EARTH_RADIUS_M + 40_000_000;
      const aTransfer = (r1 + r2) / 2;
      const vCircular = Math.sqrt(MU_EARTH / r1);
      const vTransfer = Math.sqrt(MU_EARTH * (2 / r1 - 1 / aTransfer));
      const requiredDv = vTransfer - vCircular;

      const mass0 = 5000;
      const state0: FlightState = {
        position: [r1, 0, 0],
        velocity: [0, vCircular, 0],
        mass: mass0,
        time: 0,
      };
      const thrustN = 500_000;
      const ispS = 300;
      const massFlow = thrustN / (ispS * 9.80665);
      const massFinal = mass0 * Math.exp(-requiredDv / (ispS * 9.80665));
      const burnTime = (mass0 - massFinal) / massFlow;

      let state = state0;
      const dt = 1;
      const fullSteps = Math.floor(burnTime);
      for (let i = 0; i < fullSteps; i += 1) {
        const vMag = vecMagnitude(state.velocity);
        const dir = vMag > 0 ? vecScale(state.velocity, 1 / vMag) : [0, 1, 0];
        const control: ControlInput = {
          throttle: 1.0,
          thrustDirection: [dir[0], dir[1], dir[2]],
          thrustN,
          ispS,
          dragCoefficient: 0.2,
          crossSectionAreaM2: 3.14,
        };
        state = rk4FlightStep(state, control, EARTH_FORCE_MODEL, dt);
      }
      const remainder = burnTime - fullSteps;
      if (remainder > 0) {
        const vMag = vecMagnitude(state.velocity);
        const dir = vMag > 0 ? vecScale(state.velocity, 1 / vMag) : [0, 1, 0];
        const control: ControlInput = {
          throttle: 1.0,
          thrustDirection: [dir[0], dir[1], dir[2]],
          thrustN,
          ispS,
          dragCoefficient: 0.2,
          crossSectionAreaM2: 3.14,
        };
        state = rk4FlightStep(state, control, EARTH_FORCE_MODEL, remainder);
      }

      const el = stateToElements(
        { position: state.position, velocity: state.velocity, time: state.time },
        MU_EARTH,
      );
      const apogeeAlt = el.semiMajorAxis * (1 + el.eccentricity) - EARTH_RADIUS_M;
      const relErr = Math.abs(apogeeAlt - 40_000_000) / 40_000_000;
      console.log(`    目标远拱点: 40000km, 实际: ${(apogeeAlt / 1000).toFixed(0)}km, 误差: ${(relErr * 100).toFixed(1)}%`);
      return relErr < 0.05;
    },
  },
  {
    name: '[Phase1] 10000× 时间加速子步保护不发散',
    run: () => {
      const r = EARTH_RADIUS_M + 400_000;
      const v = Math.sqrt(MU_EARTH / r);
      const state0: FlightState = {
        position: [r, 0, 0],
        velocity: [0, v, 0],
        mass: 5000,
        time: 0,
      };
      const T = orbitalPeriod(stateToElements(
        { position: state0.position, velocity: state0.velocity, time: 0 },
        MU_EARTH,
      ).semiMajorAxis, MU_EARTH);
      const frameDt = 10 * T;
      const control: ControlInput = {
        throttle: 0,
        thrustDirection: [1, 0, 0],
        thrustN: 0,
        ispS: 0,
        dragCoefficient: 0.2,
        crossSectionAreaM2: 3.14,
      };
      const final = propagateFlightWithSubsteps(state0, control, EARTH_FORCE_MODEL, frameDt, 30);
      const rMag = vecMagnitude(final.position);
      console.log(`    10000× 加速后位置模长: ${rMag.toFixed(0)} m (有限: ${Number.isFinite(rMag)})`);
      return Number.isFinite(rMag) && rMag > EARTH_RADIUS_M && rMag < EARTH_RADIUS_M + 100_000_000;
    },
  },
];

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

async function main(): Promise<boolean> {
  console.log('='.repeat(60));
  console.log('飞行动力学验证 (Phase 0 + Phase 1)');
  console.log('='.repeat(60));
  console.log();

  let allPassed = true;
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`[测试] ${tc.name}`);
    console.log('-'.repeat(60));
    let ok = false;
    try {
      ok = tc.run();
    } catch (err) {
      console.error(`    执行异常: ${err}`);
      ok = false;
    }
    if (ok) {
      console.log(`  ✓ 通过`);
      passed += 1;
    } else {
      console.log(`  ❌ 失败`);
      failed += 1;
      allPassed = false;
    }
    console.log();
  }

  console.log('='.repeat(60));
  console.log(`结果: ${passed} 通过 / ${failed} 失败 / ${testCases.length} 总计`);
  if (allPassed) {
    console.log('✓ 验证通过: 飞行动力学核心满足 Phase 0 + Phase 1 验收标准');
  } else {
    console.log('❌ 验证失败: 存在未通过的测试用例');
  }
  console.log('='.repeat(60));

  return allPassed;
}

main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('验证过程发生错误:', error);
    process.exit(1);
  });
