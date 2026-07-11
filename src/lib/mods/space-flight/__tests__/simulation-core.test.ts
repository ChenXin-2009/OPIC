/**
 * @module mods/space-flight/__tests__/simulation-core
 * @description 航天飞行窗口仿真核心回归测试
 */

import { describe, expect, it } from '@jest/globals';
import { PRESET_FALCON9, computeVehicleSummary } from '@/lib/data/rocket-parts';
import { getLaunchSiteById, launchSiteToInitialState } from '@/lib/data/launch-sites';
import { GM_SI, vecMagnitude, type FlightState } from '@/lib/flight-dynamics';
import {
  buildTelemetry,
  computeMissionBodyRadius,
  defaultPlayerInputState,
  extractStageEngines,
  separateStage,
  simulateFlightFrame,
  type StageEngine,
} from '../simulation-core';

const MU = GM_SI.earth;

function circularState(altitudeM: number, mass: number): FlightState {
  const r = 6_371_000 + altitudeM;
  const v = Math.sqrt(MU / r);
  return {
    position: [r, 0, 0],
    velocity: [0, v, 0],
    mass,
    time: 0,
  };
}

function makeTwoStageEngines(): StageEngine[] {
  return [
    {
      name: 'stage-1',
      thrustN: 1_000_000,
      ispS: 300,
      propellantMassKg: 100,
      dryMassKg: 50,
      propellantConsumed: 100,
    },
    {
      name: 'stage-2',
      thrustN: 100_000,
      ispS: 320,
      propellantMassKg: 10,
      dryMassKg: 20,
      propellantConsumed: 0,
    },
  ];
}

describe('simulation-core', () => {
  it('发射瞬间遥测高度接近发射场海拔，而不是虚高 2km+', () => {
    const site = getLaunchSiteById('cape-canaveral');
    expect(site).toBeDefined();

    const initial = launchSiteToInitialState(site!, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)));
    const bodyRadius = computeMissionBodyRadius(
      initial.position as [number, number, number],
      site!.altitude,
    );
    const telemetry = buildTelemetry(
      {
        position: [...initial.position] as [number, number, number],
        velocity: [...initial.velocity] as [number, number, number],
        mass: 1000,
        time: 0,
      },
      [],
      0,
      100,
      0,
      bodyRadius,
    );

    expect(Math.abs(telemetry.altitudeKm * 1000 - site!.altitude)).toBeLessThan(20);
  });

  it('1 秒真实时间在 1× 下只推进约 1 秒任务时间', () => {
    const site = getLaunchSiteById('cape-canaveral')!;
    const initial = launchSiteToInitialState(site, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)));
    const initialMass = computeVehicleSummary(PRESET_FALCON9).totalWetMassKg;
    const engines = extractStageEngines(PRESET_FALCON9);

    const result = simulateFlightFrame({
      state: {
        position: [...initial.position] as [number, number, number],
        velocity: [...initial.velocity] as [number, number, number],
        mass: initialMass,
        time: 0,
      },
      engines,
      stageIndex: 0,
      throttlePercent: 100,
      timeScale: 1,
      realElapsedMs: 1000,
      maxQ: 0,
      bodyRadiusM: computeMissionBodyRadius(
        initial.position as [number, number, number],
        site.altitude,
      ),
      playerInput: defaultPlayerInputState(),
    });

    expect(result.state.time).toBeCloseTo(1, 2);
    expect(result.state.mass).toBeLessThan(initialMass - 2000);
    expect(result.state.mass).toBeGreaterThan(initialMass - 3000);
  });

  it('自动分级时丢弃前级干质量', () => {
    const state0 = circularState(400_000, 1000);
    const result = simulateFlightFrame({
      state: state0,
      engines: makeTwoStageEngines(),
      stageIndex: 0,
      throttlePercent: 100,
      timeScale: 1,
      realElapsedMs: 100,
      maxQ: 0,
      bodyRadiusM: 6_371_000,
      playerInput: defaultPlayerInputState(),
    });

    expect(result.stageIndex).toBe(1);
    expect(result.state.mass).toBeLessThan(1000);
  });

  it('手动分级函数也会同步减去级干质量', () => {
    const state0 = circularState(1000, 500);
    const separated = separateStage(state0, makeTwoStageEngines(), 0);

    expect(separated.stageIndex).toBe(1);
    expect(separated.state.mass).toBe(450);
  });

  it('触地后立即钳制到地表并结束，不继续穿地', () => {
    const bodyRadius = 6_371_000;
    const result = simulateFlightFrame({
      state: {
        position: [bodyRadius + 50, 0, 0],
        velocity: [-500, 0, 0],
        mass: 1000,
        time: 0,
      },
      engines: [
        {
          name: 'coast',
          thrustN: 0,
          ispS: 0,
          propellantMassKg: 0,
          dryMassKg: 1000,
          propellantConsumed: 0,
        },
      ],
      stageIndex: 0,
      throttlePercent: 0,
      timeScale: 1,
      realElapsedMs: 1000,
      maxQ: 0,
      bodyRadiusM: bodyRadius,
      playerInput: defaultPlayerInputState(),
    });

    expect(result.ended).toBe(true);
    expect(result.endReason).toBe('坠毁');
    expect(result.telemetry.altitudeKm).toBeCloseTo(0, 6);
    expect(vecMagnitude(result.state.position)).toBeCloseTo(bodyRadius, 3);
  });
});
