/**
 * 系外行星类型定义 (Exoplanet Types)
 *
 * 定义系外行星系统相关的所有 TypeScript 接口，
 * 包括宿主星索引、恒星详情、行星数据、选择状态和系统详情。
 */

/**
 * 系外行星宿主星索引条目
 * 从 NASA Exoplanet Archive 查询的宿主星概要信息，用于列表展示和快速检索。
 */
export interface ExoplanetHostIndex {
  /** 宿主星名称（如 "Kepler-22"） */
  hostname: string;
  raDeg: number;
  decDeg: number;
  distancePc: number;
  starCount: number;
  planetCount: number;
  stellarTemperatureK?: number;
  stellarRadiusSolar?: number;
  stellarMassSolar?: number;
  stellarLuminosityLogSolar?: number;
  stellarAgeGyr?: number;
}

/**
 * 系外行星宿主星详细信息
 * 继承索引信息，扩展光谱类型、表面重力和金属丰度等详细参数。
 */
export interface ExoplanetStarDetails extends ExoplanetHostIndex {
  /** 光谱类型（如 "G2V"、"M1V"） */
  spectralType?: string;
  surfaceGravityLog?: number;
  metallicityDex?: number;
}

/**
 * 系外行星数据
 * 单颗行星的轨道和物理参数，用于 3D 渲染和信息面板展示。
 */
export interface ExoplanetPlanet {
  /** 行星名称（如 "Kepler-22 b"） */
  name: string;
  letter?: string;
  orbitalPeriodDays?: number;
  semiMajorAxisAU?: number;
  radiusEarth?: number;
  massEarth?: number;
  massJupiter?: number;
  equilibriumTemperatureK?: number;
  eccentricity?: number;
  inclinationDeg?: number;
  /** 升交点经度 Ω (度)。若缺失，轨道只能作为示意性显示。
   *  参见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.7 */
  omegaDeg?: number;
  densityGcm3?: number;
  insolationEarth?: number;
  discoveryMethod?: string;
  discoveryYear?: number;
  /** 当缺少 Omega 或其他关键轨道参数时，轨道仅为示意性展示 */
  isSchematicOrbit?: boolean;
}

/**
 * 系外行星系统完整详情
 * 包含宿主星详细信息和所有已知行星的完整数据。
 */
export interface ExoplanetSystemDetails {
  /** 宿主星名称 */
  hostname: string;
  star: ExoplanetStarDetails;
  planets: ExoplanetPlanet[];
  source: 'NASA Exoplanet Archive';
  table: 'pscomppars';
  lastUpdate: string;
}

/**
 * 系外行星索引 API 响应
 * /api/exoplanets 接口返回的数据结构。
 */
export interface ExoplanetIndexResponse {
  /** 宿主星列表 */
  systems: ExoplanetHostIndex[];
  count: number;
  source: 'NASA Exoplanet Archive';
  table: 'pscomppars';
  lastUpdate: string;
  cacheExpiry: string;
}

/**
 * 系外行星选择状态
 * 标识当前用户选中的是恒星还是具体行星。
 */
export type ExoplanetSelection =
  | { type: 'star'; hostname: string }
  | { type: 'planet'; hostname: string; planetName: string };
