/**
 * @module mods/space-flight/flight-camera-policy
 * @description 飞行相机的无渲染策略。坐标使用当地 ENU（东、北、天）米制坐标。
 */

/**
 * 飞行相机所处的阶段。
 * - `'pad'`: 近地机位，相机固定在发射架附近
 * - `'ascent'`: 跟随机位，相机随火箭上升动态调整
 */
export type FlightCameraPhase = 'pad' | 'ascent';

/**
 * 地面（近地）机位的相机参数。
 * 定义了相机位置和注视点在发射架 ENU 坐标系下的偏移量。
 */
export interface GroundCameraPlan {
  /** 相机相对发射架的 ENU 偏移 [东, 北, 天]，单位米 */
  cameraOffsetEnu: readonly [number, number, number];
  /** 相机注视点相对发射架的 ENU 偏移 [东, 北, 天]，单位米 */
  targetOffsetEnu: readonly [number, number, number];
}

/**
 * 上升段跟随机位的相机参数。
 * 根据火箭当前海拔动态计算跟拍半径、垂直偏移和前视距离。
 */
export interface AscentCameraPlan {
  /** 当前所处的相机阶段 */
  phase: FlightCameraPhase;
  /** 相机到火箭的水平距离，单位米 */
  rangeM: number;
  /** 相机相对火箭的垂直偏移量，单位米（正值表示上方） */
  verticalOffsetM: number;
  /** 相机注视点领先火箭的距离，单位米 */
  lookAheadM: number;
}

/**
 * 默认地面机位的方位角。
 * 表示相机到发射架的方向，以正北为 0°、顺时针为正，单位度。
 * 默认值 45° 对应东北方向，提供较开阔的发射塔侧面视野。
 */
export const DEFAULT_PAD_VIEW_HEADING_DEG = 45;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 生成近地机位参数。
 * 相机离地约 60 m、距发射架 260 m，提供约 8° 俯视角。
 * 该视角避免纯平视时地平线遮挡箭体，同时保留接近发射场的低空观感。
 * @param headingToPadDeg - 相机指向发射架的方位角（正北为 0°，顺时针为正），默认 45°
 * @returns 包含相机位置与注视点 ENU 偏移量的机位参数
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
 * 根据火箭当前海拔选择追踪机位。
 * 离架早期（< 750 m）保持地面机位（phase: 'pad'），避免立刻切换为航拍视角；
 * 之后随海拔线性扩大跟拍半径，并给出有限的上方偏移以保证地平线和箭体同时入镜。
 * @param altitudeM - 火箭当前海拔，单位米
 * @returns 上升段相机参数，包含机位阶段、半径、垂直偏移和前视距离
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

/**
 * 帧率无关的一阶平滑因子。
 * 基于指数平滑公式 `1 - exp(-Δt * ω)` 计算，使相机运动平滑程度不受帧率波动影响。
 * @param deltaSeconds - 距上一帧的时间差，单位秒
 * @param responsePerSecond - 每秒响应速度常数，值越大跟随越快，默认 5
 * @returns 0–1 之间的平滑因子，可直接用于线性插值
 */
export function smoothingFactor(deltaSeconds: number, responsePerSecond = 5): number {
  return 1 - Math.exp(-Math.max(0, deltaSeconds) * responsePerSecond);
}
