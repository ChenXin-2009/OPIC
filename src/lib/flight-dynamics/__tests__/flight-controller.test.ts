/**
 * @module flight-dynamics/__tests__/flight-controller
 * @description 飞行控制适配层测试
 */

import { describe, expect, it } from '@jest/globals';
import {
  buildSteeredThrustDirection,
  mapPlayerInputToFlightControl,
  updateThrottleFromPlayerInput,
} from '../flight-controller';
import { vecMagnitude } from '../state';
import type { PlayerInputState } from '@/lib/3d/player/PlayerInput';

function makeInput(overrides: Partial<PlayerInputState> = {}): PlayerInputState {
  return {
    thrust: 0,
    strafe: 0,
    lift: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    boost: false,
    stage: false,
    ...overrides,
  };
}

describe('flight-controller', () => {
  it('1 秒常规 W 输入提升 30% 节流', () => {
    const next = updateThrottleFromPlayerInput(40, makeInput({ thrust: 1 }), 1);
    expect(next).toBe(70);
  });

  it('Shift 加速时节流调节更快', () => {
    const next = updateThrottleFromPlayerInput(10, makeInput({ thrust: 1, boost: true }), 1);
    expect(next).toBe(80);
  });

  it('输出的推力方向保持单位向量', () => {
    const direction = buildSteeredThrustDirection(
      [1, 0, 0],
      [6_371_000, 0, 0],
      makeInput({ yaw: 1, pitch: 1 }),
    );

    expect(vecMagnitude(direction)).toBeCloseTo(1, 6);
  });

  it('保留分级请求和辅助轴输出', () => {
    const command = mapPlayerInputToFlightControl(
      makeInput({ stage: true, strafe: -1, roll: 1 }),
      50,
      0.5,
      [1, 0, 0],
      [6_371_000, 0, 0],
    );

    expect(command.stageRequested).toBe(true);
    expect(command.auxiliary).toBe(-1);
    expect(command.roll).toBe(1);
  });
});
