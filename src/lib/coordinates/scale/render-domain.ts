/**
 * 跨尺度渲染域管理。
 *
 * OPIC 从地球 (1e6 m) 到可观测宇宙 (1e26 m) 跨越约 19 个数量级。
 * GPU Float32 精度在 ~1 AU (~1.5e11 m) 处仅为 ~10^-7 AU (~15 km)，
 * 直接写入同一坐标空间会导致卫星 (km 级运动) 量化跳跃。
 *
 * 本模块提供每个尺度的渲染域定义和 RTC (Relative-To-Center) 辅助函数。
 *
 * 策略：
 *   1. 每个 UniverseScale 一个 render domain，独立原点 + 单位缩放系数。
 *   2. 切换尺度时用淡入淡出（200ms），不混用坐标。
 *   3. 卫星等小尺度对象使用 RTC：相对地球的位置存入 GPU buffer，
 *      地球绝对位置通过父 Group.position 设定（JS number 双精度）。
 *   4. GPU depth buffer 保护：Three.js logarithmicDepthBuffer: true。
 *
 * 参见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §7
 */

/**
 * 渲染域定义
 */
export interface RenderDomain {
  /** 域名称（对应 UniverseScale 枚举值） */
  name: string;
  /** 单位缩放系数（该域 1 单位 = RenderWorld 中多少 AU） */
  unitScale: number;
  /** 该域中相机距离超过此值（AU）时切换到下一域 */
  exitDistanceAU: number;
  /** 该域中相机距离低于此值（AU）时切换到上一域 */
  enterDistanceAU: number;
  /** 是否使用 RTC 模式 */
  useRTC: boolean;
}

/**
 * 各尺度的渲染域定义。
 *
 * unitScale 将域内坐标映射到 RenderWorld (J2000 ecliptic, AU)：
 *   renderWorldPos = domainPos * unitScale
 */
export const RENDER_DOMAINS: Record<string, RenderDomain> = {
  earthLocal: {
    name: 'earthLocal',
    unitScale: 1 / 149597870.7, // metres → AU
    exitDistanceAU: 0.01,        // ~1.5e6 km
    enterDistanceAU: 0,          // no lower bound
    useRTC: true,                // satellites use RTC
  },
  solarSystem: {
    name: 'solarSystem',
    unitScale: 1,                // already in AU
    exitDistanceAU: 500,         // ~Neptune orbit
    enterDistanceAU: 0.005,
    useRTC: false,
  },
  nearbyStars: {
    name: 'nearbyStars',
    unitScale: 1,                // parsec → AU conversion handled at data load
    exitDistanceAU: 50000,
    enterDistanceAU: 200,
    useRTC: false,
  },
  galaxy: {
    name: 'galaxy',
    unitScale: 1,                // already in AU (or converted at load)
    exitDistanceAU: 5e7,
    enterDistanceAU: 20000,
    useRTC: false,
  },
  supergalactic: {
    name: 'supergalactic',
    unitScale: 63241.077,       // 1 pc in AU (if data in pc) — adjust per actual data unit
    exitDistanceAU: 5e10,
    enterDistanceAU: 1e7,
    useRTC: false,
  },
};

/**
 * 获取当前相机距离对应的活跃渲染域。
 *
 * @param cameraDistanceAU - 相机距太阳系原点的距离 (AU)
 * @returns 渲染域名称，或 null（超出所有域范围）
 */
export function getActiveRenderDomain(cameraDistanceAU: number): string | null {
  for (const [name, domain] of Object.entries(RENDER_DOMAINS)) {
    if (cameraDistanceAU >= domain.enterDistanceAU && cameraDistanceAU < domain.exitDistanceAU) {
      return name;
    }
  }
  return null;
}

/**
 * RTC (Relative-To-Center) 辅助函数。
 *
 * 将对象的世界空间位置转换为相对于相机局部原点的位置，
 * 用于 GPU buffer 写入时保持 Float32 精度。
 *
 * 典型用法（卫星渲染）：
 *   pointCloud.position.copy(earthWorldPosition);        // JS double precision
 *   for each satellite:
 *     positions[i] = rtcOffset(earthWorldPos, satWorldPos); // Float32 in GPU buffer
 *
 * @param center - 局部原点（如地球在 RenderWorld 中的位置）
 * @param worldPos - 对象在 RenderWorld 中的位置
 * @returns 对象相对于 center 的偏移
 */
export function rtcOffset(
  center: { x: number; y: number; z: number },
  worldPos: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  return {
    x: worldPos.x - center.x,
    y: worldPos.y - center.y,
    z: worldPos.z - center.z,
  };
}

/**
 * Float32 精度估算（AU 单位）。
 *
 * 在距离量级 |d| AU 处，Float32 分辨率为约 |d| * 1.19e-7 AU。
 *
 * 示例：
 *   - 地球轨道 (1 AU)：分辨率 ~0.12 ppm = 18 km
 *   - 卫星轨道 (~10^-4 AU)：分辨率 ~1.2 ppb
 *   - 银河系尺度 (10^9 AU)：分辨率 ~120 AU，单颗星位置不可信
 *
 * 因此大尺度对象必须使用双精度 CPU 坐标 (JS Number)，
 * GPU 渲染使用 RTC 分段映射。
 *
 * @param distanceAU - 距离量级 (AU)
 * @returns Float32 分辨率 (AU)
 */
export function float32Resolution(distanceAU: number): number {
  return distanceAU * 1.1920929e-7; // 2^-23
}
