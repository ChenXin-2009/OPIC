/**
 * 轨道力学类型定义 (Orbital Mechanics Types)
 *
 * 定义轨道计算所需的接口：开普勒轨道根数、天体数据和缓存类型。
 */

/**
 * 开普勒轨道根数
 * 描述天体椭圆轨道的六个经典参数及其长期变化率。
 * 基于 J2000.0 历元，单位为 AU（半长轴）和弧度（角度）。
 */
export interface OrbitalElements {
  /** 天体名称 */
  name: string;
  /** 半长轴 a (AU) — 椭圆的大小 */
  a: number;
  /** 离心率 e (0~1) — 椭圆的扁平程度 */
  e: number;
  /** 轨道倾角 i (弧度) — 相对于黄道面的倾斜 */
  i: number;
  /** 平经度 L (弧度) — 当前时刻的平均角位置 */
  L: number;
  /** 近日点经度 ω̃ (弧度) — 近日点在黄道面上的方向 */
  w_bar: number;
  /** 升交点黄经 Ω (弧度) — 轨道与黄道面交线的方向 */
  O: number;
  /** 半长轴变化率 (AU/世纪) */
  a_dot: number;
  /** 离心率变化率 (1/世纪) */
  e_dot: number;
  /** 倾角变化率 (弧度/世纪) */
  i_dot: number;
  /** 平经度变化率 (弧度/世纪) */
  L_dot: number;
  /** 近日点经度变化率 (弧度/世纪) */
  w_bar_dot: number;
  /** 升交点黄经变化率 (弧度/世纪) */
  O_dot: number;
  /** 天体视觉半径 (AU) — 用于渲染 */
  radius: number;
  /** 天体渲染颜色 (十六进制) */
  color: string;
}

/**
 * 天体位置数据
 * 包含天体在 RenderWorld 坐标系中的位置和渲染属性。
 * 由 getCelestialBodies() 函数计算并返回。
 */
export interface CelestialBody {
  /** 天体名称（英文） */
  name: string;
  /** X 坐标 (AU) — 黄道面春分点方向 */
  x: number;
  /** Y 坐标 (AU) — 黄道面内 90° 方向 */
  y: number;
  /** Z 坐标 (AU) — 黄道北极方向 */
  z: number;
  /** 日心距离 (AU) */
  r: number;
  /** 渲染半径 (AU) */
  radius: number;
  /** 渲染颜色 (十六进制) */
  color: string;
  /** 是否为太阳 */
  isSun?: boolean;
  /** 父天体名称（卫星使用，如 "earth"） */
  parent?: string;
  /** 是否为卫星 */
  isSatellite?: boolean;
  /** 轨道根数（可选，用于轨道线渲染） */
  elements?: OrbitalElements;
  /** 是否使用高精度星历表数据 */
  usingEphemeris?: boolean;
}

/**
 * 位置缓存
 * 缓存特定儒略日的天体位置计算结果，避免重复计算。
 */
export interface PositionCache {
  /** 儒略日 (JD) */
  jd: number;
  /** 缓存的天体位置数组 */
  bodies: CelestialBody[];
  /** 缓存创建时间戳 (ms) */
  timestamp: number;
}
