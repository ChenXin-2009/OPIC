/**
 * @module mods/space-flight/flight-camera-policy
 * @description 飞行相机的无渲染策略。坐标使用当地 ENU（东、北、天）米制坐标。
 */

export type FlightCameraPhase = 'pad' | 'ascent';

export interface GroundCameraPlan {
  /** 相机相对发射架的 ENU 偏移，单位米。 */
  cameraOffsetEnu: readonly [number, number, number];
  /** 相机注视点相对发射架的 ENU 偏移，单位米。 */
  targetOffsetEnu: readonly [number, number, number];
}

export interface AscentCameraPlan {
  phase: FlightCameraPhase;
  rangeM: number;
  verticalOffsetM: number;
  lookAheadM: number;
}

/** 地面机位到发射架的方位角（正北为 0°，顺时针为正）。 */
export const DEFAULT_PAD_VIEW_HEADING_DEG = 45;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 生成近地机位。相机离地约 60 m、距发射架 260 m，约 8° 俯视；
 * 避免纯平视时地平线遮挡箭体，同时保留接近发射场的低空观感。
 */
export function createGroundCameraPlan(
  headingToPadDeg = DEFAULT_PAD_VIEW_HEADING_DEG,
): GroundCameraPlan {
  const heading = (headingToPadDeg * Math.PI) / 180;
  const rangeM = 260;

  // heading 表示由相机指向发射架；相机位置位于反方向。
  const east = -Math.sin(heading) * rangeM;
  const north = -Math.cos(heading) * rangeM;

  return {
    cameraOffsetEnu: [east, north, 60] as const,
    targetOffsetEnu: [0, 0, 24] as const,
  };
}

/**
 * 根据海拔选择追踪机位。离架早期保持地面机位，避免立刻切成航拍视角；
 * 之后随海拔扩大跟拍半径，且给出有限上方偏移以保证地平线和箭体同时入镜。
 */
export function createAscentCameraPlan(altitudeM: number): AscentCameraPlan {
  if (altitudeM < 750) {
    return {
      phase: 'pad',
      rangeM: 0,
      verticalOffsetM: 0,
      lookAheadM: 20,
    };
  }

  const rangeM = clamp(500 + altitudeM * 0.45, 900, 18_000);
  return {
    phase: 'ascent',
    rangeM,
    verticalOffsetM: rangeM * 0.24,
    lookAheadM: clamp(80 + altitudeM * 0.08, 120, 2_500),
  };
}

/** 帧率无关的一阶平滑因子。 */
export function smoothingFactor(deltaSeconds: number, responsePerSecond = 5): number {
  return 1 - Math.exp(-Math.max(0, deltaSeconds) * responsePerSecond);
}
