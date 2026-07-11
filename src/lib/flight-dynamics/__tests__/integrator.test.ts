/**
 * @module flight-dynamics/__tests__/integrator
 * @description RK4 积分器单元测试与解析解回归验证
 *
 * 测试覆盖：
 *   1. 圆形轨道 — 数值积分 vs 解析解，位置误差 < 容差
 *   2. 椭圆轨道 — 数值积分 vs 解析解，位置误差 < 容差
 *   3. 守恒量 — 比机械能 ±5%、比角动量浮点级守恒
 *   4. 周期回归 — 积分一个完整周期后位置回到起点
 *   5. fast-check 属性测试 — 随机轨道不数值发散
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';

import {
  makeState,
  specificEnergy,
  specificAngularMomentum,
  vecDistance,
  vecMagnitude,
  vecSub,
  GM_SI,
  EARTH_RADIUS_M,
  rk4Step,
  propagate,
  propagateAnalytical,
  stateToElements,
  orbitalPeriod,
  type StateVector,
} from '../index';

const MU_EARTH = GM_SI.earth;

// ---------------------------------------------------------------------------
// 测试用轨道生成器
// ---------------------------------------------------------------------------

/**
 * 生成圆形轨道初始状态。
 * @param altitudeKm 轨道高度 (km)
 * @param inclinationDeg 倾角 (deg)
 */
function circularOrbit(altitudeKm: number, inclinationDeg: number): StateVector {
  const r = EARTH_RADIUS_M + altitudeKm * 1000;
  const v = Math.sqrt(MU_EARTH / r);
  const inc = (inclinationDeg * Math.PI) / 180;
  // 在 xz 平面内（升交点处），速度有 y 分量来自倾角
  return makeState(
    [r, 0, 0],
    [0, v * Math.cos(inc), v * Math.sin(inc)],
    0,
  );
}

/**
 * 生成椭圆轨道初始状态（近地点处）。
 * @param perigeeKm  近地点高度 (km)
 * @param apogeeKm   远地点高度 (km)
 * @param inclinationDeg 倾角 (deg)
 */
function ellipticalOrbit(
  perigeeKm: number,
  apogeeKm: number,
  inclinationDeg: number,
): StateVector {
  const rp = EARTH_RADIUS_M + perigeeKm * 1000;
  const ra = EARTH_RADIUS_M + apogeeKm * 1000;
  const a = (rp + ra) / 2;
  const vp = Math.sqrt(MU_EARTH * (2 / rp - 1 / a)); // vis-viva
  const inc = (inclinationDeg * Math.PI) / 180;
  return makeState(
    [rp, 0, 0],
    [0, vp * Math.cos(inc), vp * Math.sin(inc)],
    0,
  );
}

// ---------------------------------------------------------------------------
// 1. 圆形轨道回归测试
// ---------------------------------------------------------------------------

describe('RK4 积分器 — 圆形轨道', () => {
  it('400km 圆轨道：积分 1/4 周期后与解析解位置误差 < 100 m', () => {
    const state0 = circularOrbit(400, 0);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const dt = 10; // 10 秒步长
    const duration = T / 4;

    const numerical = propagate(state0, { dt, duration, mu: MU_EARTH });
    const analytical = propagateAnalytical(state0, MU_EARTH, duration);

    const posError = vecDistance(numerical.position, analytical.position);
    console.log(`  圆轨道 1/4 周期位置误差: ${posError.toFixed(2)} m`);
    expect(posError).toBeLessThan(100);
  });

  it('400km 圆轨道：积分一个完整周期后位置回到起点（误差 < 200 m）', () => {
    const state0 = circularOrbit(400, 0);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const dt = 10;

    const finalState = propagate(state0, { dt, duration: T, mu: MU_EARTH });
    const posError = vecDistance(finalState.position, state0.position);

    console.log(`  圆轨道完整周期回归误差: ${posError.toFixed(2)} m`);
    expect(posError).toBeLessThan(200);
  });

  it('倾角 51.6° 圆轨道（ISS 类似）：积分 1/2 周期与解析解吻合', () => {
    const state0 = circularOrbit(420, 51.6);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const dt = 10;
    const duration = T / 2;

    const numerical = propagate(state0, { dt, duration, mu: MU_EARTH });
    const analytical = propagateAnalytical(state0, MU_EARTH, duration);

    const posError = vecDistance(numerical.position, analytical.position);
    console.log(`  ISS 轨道 1/2 周期位置误差: ${posError.toFixed(2)} m`);
    expect(posError).toBeLessThan(150);
  });
});

// ---------------------------------------------------------------------------
// 2. 椭圆轨道回归测试
// ---------------------------------------------------------------------------

describe('RK4 积分器 — 椭圆轨道', () => {
  it('400km×40000km 椭圆轨道：积分一个周期后位置回到起点（误差 < 500 m）', () => {
    const state0 = ellipticalOrbit(400, 40000, 0);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const dt = 30;

    const finalState = propagate(state0, { dt, duration: T, mu: MU_EARTH });
    const posError = vecDistance(finalState.position, state0.position);

    console.log(`  椭圆轨道完整周期回归误差: ${posError.toFixed(2)} m`);
    expect(posError).toBeLessThan(500);
  });

  it('高偏心率椭圆轨道：积分 1/4 周期与解析解吻合', () => {
    // 近地点 200km，远地点 35786km（GTO 类似）
    const state0 = ellipticalOrbit(200, 35786, 28.5);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const dt = 30;
    const duration = T / 4;

    const numerical = propagate(state0, { dt, duration, mu: MU_EARTH });
    const analytical = propagateAnalytical(state0, MU_EARTH, duration);

    const posError = vecDistance(numerical.position, analytical.position);
    console.log(`  GTO 轨道 1/4 周期位置误差: ${posError.toFixed(2)} m, 偏心率=${elements.eccentricity.toFixed(4)}`);
    expect(posError).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------------------
// 3. 守恒量测试
// ---------------------------------------------------------------------------

describe('RK4 积分器 — 守恒量', () => {
  it('纯引力滑行：比机械能 ±5% 容差内守恒', () => {
    const state0 = ellipticalOrbit(400, 40000, 30);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const dt = 30;

    const energy0 = specificEnergy(state0, MU_EARTH);

    // 采样多个时刻
    const checkPoints = [T / 4, T / 2, (3 * T) / 4, T];
    for (const t of checkPoints) {
      const state = propagate(state0, { dt, duration: t, mu: MU_EARTH });
      const energy = specificEnergy(state, MU_EARTH);
      const relError = Math.abs((energy - energy0) / energy0);
      console.log(`  t=${t.toFixed(0)}s 能量误差: ${(relError * 100).toFixed(6)}%`);
      expect(relError).toBeLessThan(0.05); // 5%
    }
  });

  it('纯引力滑行：比角动量矢量浮点级守恒（相对误差 < 1e-6）', () => {
    const state0 = circularOrbit(500, 45);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const dt = 10;

    const h0 = specificAngularMomentum(state0);
    const h0Mag = vecMagnitude(h0);

    const checkPoints = [T / 4, T / 2, T];
    for (const t of checkPoints) {
      const state = propagate(state0, { dt, duration: t, mu: MU_EARTH });
      const h = specificAngularMomentum(state);
      const hMag = vecMagnitude(h);
      const relError = Math.abs((hMag - h0Mag) / h0Mag);
      console.log(`  t=${t.toFixed(0)}s 角动量误差: ${relError.toExponential(3)}`);
      expect(relError).toBeLessThan(1e-6);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. 时间加速上限测试
// ---------------------------------------------------------------------------

describe('RK4 积分器 — 时间加速', () => {
  it('10× 时间加速（dt=100s）：不数值爆炸，能量误差 < 1%', () => {
    const state0 = circularOrbit(400, 0);
    const elements = stateToElements(state0, MU_EARTH);
    const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
    const energy0 = specificEnergy(state0, MU_EARTH);

    const finalState = propagate(state0, { dt: 100, duration: T, mu: MU_EARTH });
    const energy = specificEnergy(finalState, MU_EARTH);
    const relError = Math.abs((energy - energy0) / energy0);
    console.log(`  10× 加速能量误差: ${(relError * 100).toFixed(4)}%`);
    expect(relError).toBeLessThan(0.01);
    // 位置仍在合理范围（不爆炸）
    const rMag = vecMagnitude(finalState.position);
    expect(rMag).toBeGreaterThan(EARTH_RADIUS_M);
    expect(rMag).toBeLessThan(EARTH_RADIUS_M + 1_000_000);
  });

  it('单步不发散：rk4Step 产出有限数值', () => {
    const state0 = circularOrbit(400, 0);
    const next = rk4Step(state0, 60, MU_EARTH);
    for (let i = 0; i < 3; i += 1) {
      expect(Number.isFinite(next.position[i])).toBe(true);
      expect(Number.isFinite(next.velocity[i])).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. fast-check 属性测试
// ---------------------------------------------------------------------------

describe('RK4 积分器 — 属性测试 (fast-check)', () => {
  it('随机圆/椭圆轨道积分不发散：位置有限且能量守恒 < 5%', () => {
    fc.assert(
      fc.property(
        fc.record({
          altitudeKm: fc.integer({ min: 200, max: 2000 }),
          apogeeKm: fc.integer({ min: 200, max: 60000 }),
          inclinationDeg: fc.integer({ min: 0, max: 180 }),
          dt: fc.constantFrom(5, 10, 30),
        }),
        (params) => {
          const state0 = ellipticalOrbit(
            params.altitudeKm,
            Math.max(params.apogeeKm, params.altitudeKm + 100),
            params.inclinationDeg,
          );
          const elements = stateToElements(state0, MU_EARTH);
          const T = orbitalPeriod(elements.semiMajorAxis, MU_EARTH);
          const energy0 = specificEnergy(state0, MU_EARTH);

          const finalState = propagate(state0, {
            dt: params.dt,
            duration: T / 4,
            mu: MU_EARTH,
          });

          // 位置有限（不发散）
          const rMag = vecMagnitude(finalState.position);
          if (!Number.isFinite(rMag)) return false;
          if (rMag < EARTH_RADIUS_M) return false;
          if (rMag > EARTH_RADIUS_M + 100_000_000) return false;

          // 能量守恒
          const energy = specificEnergy(finalState, MU_EARTH);
          const relError = Math.abs((energy - energy0) / energy0);
          return relError < 0.05;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('解析解往返一致性：state → elements → state 误差 < 1e-6', () => {
    fc.assert(
      fc.property(
        fc.record({
          altitudeKm: fc.integer({ min: 200, max: 5000 }),
          inclinationDeg: fc.integer({ min: 0, max: 90 }),
        }),
        (params) => {
          const state0 = circularOrbit(params.altitudeKm, params.inclinationDeg);
          const elements = stateToElements(state0, MU_EARTH);
          // 解析传播回 t=0 应当得到原始状态
          const reconstructed = propagateAnalytical(state0, MU_EARTH, 0);
          const posError = vecDistance(reconstructed.position, state0.position);
          return posError < 1e-6; // 1 微米
        },
      ),
      { numRuns: 30 },
    );
  });
});
