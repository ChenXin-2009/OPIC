/**
 * @module mods/space-flight/flight-runtime-store
 * @description 航天飞行运行时快照存储
 *
 * 在窗口侧仿真与 Three.js 渲染层之间共享一份轻量快照。
 * 保持为简单模块状态，避免为每帧渲染引入额外 React 依赖。
 */

/**
 * 航天飞行的帧渲染快照，由仿真线程以约 10 Hz 写入。
 * 包含当前火箭在 ECI 坐标系下的位置、速度、推力方向等关键状态，
 * 供 Three.js 渲染层与相机系统消费。
 */
export interface FlightRenderSnapshot {
  /** 任务是否处于活跃飞行状态 */
  active: boolean;
  /** 任务是否已结束（坠毁或入轨） */
  ended: boolean;
  /** ECI 坐标系下的位置矢量 [x, y, z]，单位米 */
  positionEci: [number, number, number];
  /** ECI 坐标系下的速度矢量 [x, y, z]，单位米/秒 */
  velocityEci: [number, number, number];
  /** ECI 坐标系下的推力方向单位矢量 [x, y, z] */
  thrustDirectionEci: [number, number, number];
  /** 油门百分比，范围 0–100 */
  throttlePercent: number;
  /** 是否正在喷焰（有推力和推进剂） */
  plumeActive: boolean;
  /** 当前级序号（0 为第一级） */
  stageIndex: number;
  /** 任务经过时间，单位秒 */
  missionTimeS: number;
  /** 仿真对应的绝对时间戳，单位毫秒（Date.now()） */
  absoluteTimeMs: number;
}

let snapshot: FlightRenderSnapshot | null = null;
let previousSnapshot: FlightRenderSnapshot | null = null;
let snapshotReceivedAtMs = 0;
const INTERPOLATION_WINDOW_MS = 100;

/**
 * 写入最新的飞行渲染快照。
 * 自动保存上一帧快照用于插值。当快照为 null、尚无初始快照或检测到任务
 * 重置（missionTimeS 回退）时，清除上一帧引用以避免跨任务插值。
 * @param next - 新的渲染快照，传入 null 表示清空状态
 */
export function setFlightRenderSnapshot(next: FlightRenderSnapshot | null): void {
  if (!next || !snapshot || next.missionTimeS < snapshot.missionTimeS) {
    previousSnapshot = null;
  } else {
    previousSnapshot = snapshot;
  }
  snapshot = next;
  snapshotReceivedAtMs = Date.now();
}

/**
 * 获取最新写入的飞行渲染快照。
 * @returns 当前最新快照，若尚未写入任何快照则返回 null
 */
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

/**
 * 清除所有飞行渲染快照状态（当前快照、上一帧快照及接收时间戳）。
 * 通常在任务结束或组件卸载时调用，避免残留数据影响下一次任务。
 */
export function clearFlightRenderSnapshot(): void {
  snapshot = null;
  previousSnapshot = null;
  snapshotReceivedAtMs = 0;
}
