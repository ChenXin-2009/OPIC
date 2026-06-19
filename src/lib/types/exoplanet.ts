export interface ExoplanetHostIndex {
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

export interface ExoplanetStarDetails extends ExoplanetHostIndex {
  spectralType?: string;
  surfaceGravityLog?: number;
  metallicityDex?: number;
}

export interface ExoplanetPlanet {
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

export interface ExoplanetSystemDetails {
  hostname: string;
  star: ExoplanetStarDetails;
  planets: ExoplanetPlanet[];
  source: 'NASA Exoplanet Archive';
  table: 'pscomppars';
  lastUpdate: string;
}

export interface ExoplanetIndexResponse {
  systems: ExoplanetHostIndex[];
  count: number;
  source: 'NASA Exoplanet Archive';
  table: 'pscomppars';
  lastUpdate: string;
  cacheExpiry: string;
}

export type ExoplanetSelection =
  | { type: 'star'; hostname: string }
  | { type: 'planet'; hostname: string; planetName: string };
