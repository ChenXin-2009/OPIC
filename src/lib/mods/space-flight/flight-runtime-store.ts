/**
 * @module mods/space-flight/flight-runtime-store
 * @description 航天飞行运行时快照存储
 *
 * 在窗口侧仿真与 Three.js 渲染层之间共享一份轻量快照。
 * 保持为简单模块状态，避免为每帧渲染引入额外 React 依赖。
 */

export interface FlightRenderSnapshot {
  active: boolean;
  ended: boolean;
  positionEci: [number, number, number];
  velocityEci: [number, number, number];
  thrustDirectionEci: [number, number, number];
  throttlePercent: number;
  plumeActive: boolean;
  stageIndex: number;
  missionTimeS: number;
  absoluteTimeMs: number;
}

let snapshot: FlightRenderSnapshot | null = null;
let previousSnapshot: FlightRenderSnapshot | null = null;
let snapshotReceivedAtMs = 0;
const INTERPOLATION_WINDOW_MS = 100;

export function setFlightRenderSnapshot(next: FlightRenderSnapshot | null): void {
  if (!next || !snapshot || next.missionTimeS < snapshot.missionTimeS) {
    previousSnapshot = null;
  } else {
    previousSnapshot = snapshot;
  }
  snapshot = next;
  snapshotReceivedAtMs = Date.now();
}

export function getFlightRenderSnapshot(): FlightRenderSnapshot | null {
  return snapshot;
}

/**
 * 物理循环以 10Hz 写入快照；渲染与相机以帧率插值相邻两个 ECI 状态，避免火箭
 * 在近地和太空中每 100ms 突跳一次。新任务、重置和时间回退不会跨任务插值。
 */
export function getInterpolatedFlightRenderSnapshot(nowMs = Date.now()): FlightRenderSnapshot | null {
  if (!snapshot || !previousSnapshot) return snapshot;
  if (snapshot.ended || previousSnapshot.ended) return snapshot;

  const alpha = Math.max(0, Math.min(1, (nowMs - snapshotReceivedAtMs) / INTERPOLATION_WINDOW_MS));
  const lerp3 = (a: readonly number[], b: readonly number[]): [number, number, number] => [
    a[0] + (b[0] - a[0]) * alpha,
    a[1] + (b[1] - a[1]) * alpha,
    a[2] + (b[2] - a[2]) * alpha,
  ];

  return {
    ...snapshot,
    positionEci: lerp3(previousSnapshot.positionEci, snapshot.positionEci),
    velocityEci: lerp3(previousSnapshot.velocityEci, snapshot.velocityEci),
    thrustDirectionEci: lerp3(previousSnapshot.thrustDirectionEci, snapshot.thrustDirectionEci),
    missionTimeS: previousSnapshot.missionTimeS + (snapshot.missionTimeS - previousSnapshot.missionTimeS) * alpha,
    absoluteTimeMs: previousSnapshot.absoluteTimeMs
      + (snapshot.absoluteTimeMs - previousSnapshot.absoluteTimeMs) * alpha,
  };
}

export function clearFlightRenderSnapshot(): void {
  snapshot = null;
  previousSnapshot = null;
  snapshotReceivedAtMs = 0;
}
