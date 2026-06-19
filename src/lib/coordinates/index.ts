/**
 * OPIC 统一坐标变换层。
 *
 * 本目录是 OPIC 坐标系对齐方案的落地实现，按 Frame Graph 架构组织：
 * - `frames/`：ICRF 与各入口帧之间的双向变换。
 * - `time/`（规划中）：UTC ↔ TT/TDB 等时间尺度。
 * - `scale/`（规划中）：跨尺度的 RenderWorld domain 与 RTC 辅助。
 * - `fixtures/`（规划中）：离线生成的回归基准（JPL/HORIZONS/Astropy）。
 *
 * 设计原则：
 * 1. ICRF (J2000.0) 是唯一惯性锚点；其他帧（ITRF/TEME/Galactic/Supergalactic）是同级入口帧。
 * 2. RenderWorld = J2000 mean ecliptic，单位 AU，是渲染出口而非天文学权威帧。
 * 3. 所有变换函数为纯函数，输入向量不被修改，返回新实例。
 * 4. 不使用 R_x(±ε) 这类易歧义符号，只写显式分量公式 + 测试向量。
 *
 * 详见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md。
 */

export {
  icrfToEcliptic,
  eclipticToIcrf,
  icrfToRenderWorld,
  renderWorldToIcrf,
  OBLIQUITY_J2000_DEG,
  OBLIQUITY_J2000_RAD,
  objectLocalToRenderWorld,
  renderWorldToObjectLocal,
  objectLocalToWorldQuat,
  worldToObjectLocalQuat,
  temeToRenderWorld,
  temeToRenderWorldSimple,
  icrfToGalactic,
  galacticToIcrf,
  GALACTIC_CENTER_ICRS,
  icrfToSupergalactic,
  supergalacticToIcrf,
  supergalacticToRenderWorld,
} from './frames';
export type { TemeToWorldInput, WorldPosition } from './frames';

export {
  RENDER_DOMAINS,
  getActiveRenderDomain,
  rtcOffset,
  float32Resolution,
} from './scale';
export type { RenderDomain } from './scale';
