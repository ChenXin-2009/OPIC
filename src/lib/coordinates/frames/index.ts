/**
 * Frame transformations barrel.
 *
 * 每个 frame 模块提供 ICRF/ICRS 与该帧之间的双向变换。
 * ICRF (J2000.0) 是 OPIC 的惯性锚点，所有数据源按各自入口帧接入，
 * 再通过本目录的函数统一投影到 OPIC RenderWorld (J2000 ecliptic)。
 *
 * 参见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §2 Frame Graph 架构。
 */

export {
  icrfToEcliptic,
  eclipticToIcrf,
  icrfToRenderWorld,
  renderWorldToIcrf,
  OBLIQUITY_J2000_DEG,
  OBLIQUITY_J2000_RAD,
} from './ecliptic';

export {
  objectLocalToRenderWorld,
  renderWorldToObjectLocal,
  objectLocalToWorldQuat,
  worldToObjectLocalQuat,
} from './world';

export {
  temeToRenderWorld,
  temeToRenderWorldSimple,
} from './teme';
export type { TemeToWorldInput, WorldPosition } from './teme';

export {
  icrfToGalactic,
  galacticToIcrf,
  GALACTIC_CENTER_ICRS,
} from './galactic';

export {
  icrfToSupergalactic,
  supergalacticToIcrf,
  supergalacticToRenderWorld,
  SUPERGALACTIC_TO_ICRF_RAW,
} from './supergalactic';
