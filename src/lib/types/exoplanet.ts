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
  densityGcm3?: number;
  insolationEarth?: number;
  discoveryMethod?: string;
  discoveryYear?: number;
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
