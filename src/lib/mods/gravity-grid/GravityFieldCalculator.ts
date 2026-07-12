import * as THREE from 'three';

/**
 * 天体状态快照
 *
 * 描述单个天体的引力参数及其在场景中的位置。
 */
export interface BodyState {
  /** 天体名称标识（如 'earth', 'sun'） */
  name: string;
  /** 标准引力参数 GM（km³/s²） */
  gm: number;
  /** X 坐标（AU） */
  x: number;
  /** Y 坐标（AU） */
  y: number;
  /** Z 坐标（AU） */
  z: number;
}

/**
 * 重力网格 Gizmo 交互模式
 *
 * - `none`: 无交互
 * - `translate`: 平移模式
 * - `rotate`: 旋转模式
 */
export type GizmoMode = 'none' | 'translate' | 'rotate';

/**
 * 重力网格渲染配置
 *
 * 控制网格的分辨率、位置、缩放、透明度及参与引力计算的天体列表。
 */
export interface GridConfig {
  /** 网格细分段数（每轴） */
  segments: number;
  /** 锚定天体名称，网格坐标系以此为参考 */
  anchorBody: string;
  /** 网格中心 X 偏移（AU） */
  posX: number;
  /** 网格中心 Y 偏移（AU） */
  posY: number;
  /** 网格中心 Z 偏移（AU） */
  posZ: number;
  /** X 轴旋转（弧度） */
  rotX: number;
  /** Y 轴旋转（弧度） */
  rotY: number;
  /** Z 轴旋转（弧度） */
  rotZ: number;
  /** X 轴缩放（AU） */
  scaleX: number;
  /** Y 轴缩放（AU） */
  scaleY: number;
  /** 重力势能夸张系数，用于增强可视化对比度 */
  exaggeration: number;
  /** 网格透明度 (0-1) */
  opacity: number;
  /** 当前 Gizmo 交互模式 */
  gizmoMode: GizmoMode;
  /**
   * 参与计算的天体名称白名单。
   * 空数组表示包含所有具有 GM 的天体。
   */
  detectedBodies: string[];
}

/**
 * 所有支持的天体标识列表
 *
 * 包含太阳、八大行星、月球以及主要卫星。
 */
export const ALL_BODY_IDS = [
  'sun', 'mercury', 'venus', 'earth', 'moon', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune',
  'io', 'europa', 'ganymede', 'callisto',
  'titan', 'enceladus',
  'miranda', 'ariel', 'umbriel', 'titania',
];

/**
 * 默认重力网格配置
 *
 * 以地球为锚点、48 段细分，关闭 Gizmo 交互的初始设置。
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  segments: 48,
  anchorBody: 'earth',
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scaleX: 0.02,
  scaleY: 0.02,
  exaggeration: 30,
  opacity: 0.9,
  gizmoMode: 'none',
  detectedBodies: [],
};

const MIN_DISTANCE_AU = 1e-8;

/**
 * 计算空间中某点的重力势能
 *
 * 遍历所有天体，累加其引力势能 φ = -Σ(GM / r)。
 * 距离钳制在 MIN_DISTANCE_AU 以上以避免奇点。
 *
 * @param point - 空间中待计算点的坐标（AU）
 * @param bodies - 天体状态数组，每项包含 GM 和位置
 * @returns 该点的重力势能值
 */
export function calcPotential(point: THREE.Vector3, bodies: BodyState[]): number {
  let phi = 0;
  const len = bodies.length;
  for (let i = 0; i < len; i++) {
    const body = bodies[i];
    const dx = point.x - body.x;
    const dy = point.y - body.y;
    const dz = point.z - body.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const clampedDist = dist < MIN_DISTANCE_AU ? MIN_DISTANCE_AU : dist;
    phi -= body.gm / clampedDist;
  }
  return phi;
}

/**
 * 将重力势能数组归一化到 [0, 1] 区间
 *
 * 使用流式 min/max 算法（O(n)），无需排序。
 *
 * @param potentials - 原始势能值数组（Float64）
 * @param count - 有效元素数量
 * @returns 归一化后的 Float32Array，range 为 0 时返回全零数组
 */
export function normalizePotentials(potentials: Float64Array, count: number): Float32Array {
  if (count === 0) return new Float32Array(0);

  // streaming min/max — O(n), no sort
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < count; i++) {
    const v = potentials[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min;
  const normalized = new Float32Array(count);
  if (range === 0) return normalized;

  for (let i = 0; i < count; i++) {
    normalized[i] = (potentials[i] - min) / range;
  }
  return normalized;
}

/**
 * 将归一化后的势能值映射为 RGB 颜色
 *
 * 使用分段线性渐变：蓝 → 青 → 绿 → 黄 → 橙 → 红。
 *
 * @param t - 归一化势能值 [0, 1]
 * @returns RGB 三元组，每分量范围 [0, 1]
 */
export function potentialToColor(t: number): [number, number, number] {
  if (t < 0.15) {
    const r = t / 0.15;
    return [0, 0, 0.2 + r * 0.4];
  } else if (t < 0.30) {
    const r = (t - 0.15) / 0.15;
    return [0, r * 0.8, 0.6 + r * 0.4];
  } else if (t < 0.50) {
    const r = (t - 0.30) / 0.20;
    return [0, 0.8 + r * 0.2, 1.0 - r * 0.7];
  } else if (t < 0.70) {
    const r = (t - 0.50) / 0.20;
    return [r * 0.8, 1.0 - r * 0.2, 0.3 * (1 - r)];
  } else if (t < 0.90) {
    const r = (t - 0.70) / 0.20;
    return [0.8 + r * 0.2, 0.8 - r * 0.6, 0];
  } else {
    const r = (t - 0.90) / 0.10;
    return [1.0, 0.2 + r * 0.8, r];
  }
}
