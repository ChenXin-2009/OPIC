/**
 * 系外行星档案馆客户端 (Exoplanet Archive Client)
 *
 * 从 NASA Exoplanet Archive TAP 接口查询系外行星数据。
 * 支持宿主星索引查询和单个系统详情查询。
 *
 * 缓存策略：索引数据缓存 12 小时，减少重复请求。
 * 数据格式：TAP sync 接口返回 VOTable XML，解析为 JSON。
 */

import {
  ExoplanetHostIndex,
  ExoplanetIndexResponse,
  ExoplanetPlanet,
  ExoplanetStarDetails,
  ExoplanetSystemDetails,
} from '@/lib/types/exoplanet';

const TAP_SYNC_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const CACHE_DURATION = 12 * 60 * 60 * 1000;
const REQUEST_REVALIDATE_SECONDS = CACHE_DURATION / 1000;

type TapScalar = string | number | null;
type TapRow = Record<string, TapScalar>;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let indexCache: CacheEntry<ExoplanetIndexResponse> | null = null;
const systemCache = new Map<string, CacheEntry<ExoplanetSystemDetails>>();

function toNumber(value: TapScalar): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toRequiredNumber(value: TapScalar, fallback = 0): number {
  return toNumber(value) ?? fallback;
}

function toStringValue(value: TapScalar): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isFresh<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.timestamp < CACHE_DURATION;
}

function cacheExpiry(timestamp: number): string {
  return new Date(timestamp + CACHE_DURATION).toISOString();
}

function escapeAdqlString(value: string): string {
  return value.replace(/'/g, "''");
}

async function runTapQuery<T extends TapRow>(query: string): Promise<T[]> {
  const url = new URL(TAP_SYNC_URL);
  url.searchParams.set('query', query.replace(/\s+/g, ' ').trim());
  url.searchParams.set('format', 'json');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'OPIC Exoplanet Archive integration',
    },
    next: { revalidate: REQUEST_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NASA Exoplanet Archive TAP HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  if (!Array.isArray(json)) {
    throw new Error('NASA Exoplanet Archive TAP returned an unexpected payload');
  }

  return json as T[];
}

function mapIndexRow(row: TapRow): ExoplanetHostIndex | null {
  const hostname = toStringValue(row.hostname);
  const raDeg = toNumber(row.ra);
  const decDeg = toNumber(row.dec);
  const distancePc = toNumber(row.sy_dist);

  if (!hostname || raDeg === undefined || decDeg === undefined || distancePc === undefined) {
    return null;
  }

  return {
    hostname,
    raDeg,
    decDeg,
    distancePc,
    starCount: toRequiredNumber(row.sy_snum, 1),
    planetCount: toRequiredNumber(row.sy_pnum ?? row.planet_count, 1),
    stellarTemperatureK: toNumber(row.st_teff),
    stellarRadiusSolar: toNumber(row.st_rad),
    stellarMassSolar: toNumber(row.st_mass),
    stellarLuminosityLogSolar: toNumber(row.st_lum),
    stellarAgeGyr: toNumber(row.st_age),
  };
}

function mapPlanet(row: TapRow): ExoplanetPlanet {
  const fallbackName = `${toStringValue(row.hostname) ?? 'Unknown'} ${toStringValue(row.pl_letter) ?? '?'}`;

  return {
    name: toStringValue(row.pl_name) ?? fallbackName,
    letter: toStringValue(row.pl_letter),
    orbitalPeriodDays: toNumber(row.pl_orbper),
    semiMajorAxisAU: toNumber(row.pl_orbsmax),
    radiusEarth: toNumber(row.pl_rade),
    massEarth: toNumber(row.pl_bmasse),
    massJupiter: toNumber(row.pl_bmassj),
    equilibriumTemperatureK: toNumber(row.pl_eqt),
    eccentricity: toNumber(row.pl_orbeccen),
    inclinationDeg: toNumber(row.pl_orbincl),
    densityGcm3: toNumber(row.pl_dens),
    insolationEarth: toNumber(row.pl_insol),
    discoveryMethod: toStringValue(row.discoverymethod),
    discoveryYear: toNumber(row.disc_year),
  };
}

function mapStar(row: TapRow, planetCount: number): ExoplanetStarDetails {
  return {
    hostname: toStringValue(row.hostname) ?? 'Unknown',
    raDeg: toRequiredNumber(row.ra),
    decDeg: toRequiredNumber(row.dec),
    distancePc: toRequiredNumber(row.sy_dist),
    starCount: toRequiredNumber(row.sy_snum, 1),
    planetCount: toRequiredNumber(row.sy_pnum, planetCount),
    stellarTemperatureK: toNumber(row.st_teff),
    stellarRadiusSolar: toNumber(row.st_rad),
    stellarMassSolar: toNumber(row.st_mass),
    stellarLuminosityLogSolar: toNumber(row.st_lum),
    stellarAgeGyr: toNumber(row.st_age),
    spectralType: toStringValue(row.st_spectype),
    surfaceGravityLog: toNumber(row.st_logg),
    metallicityDex: toNumber(row.st_met),
  };
}

/**
 * 获取系外行星宿主星索引列表
 * 查询 NASA Exoplanet Archive pscomppars 表，返回所有已知宿主星的概要信息。
 * 结果缓存 12 小时，可通过 forceRefresh 强制刷新。
 */
export async function fetchExoplanetIndex(forceRefresh = false): Promise<ExoplanetIndexResponse> {
  if (!forceRefresh && isFresh(indexCache)) {
    return indexCache.data;
  }

  const rows = await runTapQuery<TapRow>(`
    select
      hostname,
      min(ra) as ra,
      min(dec) as dec,
      min(sy_dist) as sy_dist,
      max(sy_snum) as sy_snum,
      max(sy_pnum) as sy_pnum,
      min(st_teff) as st_teff,
      min(st_rad) as st_rad,
      min(st_mass) as st_mass,
      min(st_lum) as st_lum,
      min(st_age) as st_age,
      count(pl_name) as planet_count
    from pscomppars
    where hostname is not null
      and sy_dist is not null
      and ra is not null
      and dec is not null
    group by hostname
  `);

  const timestamp = Date.now();
  const systems = rows
    .map(mapIndexRow)
    .filter((row): row is ExoplanetHostIndex => row !== null)
    .sort((a, b) => a.distancePc - b.distancePc);

  const response: ExoplanetIndexResponse = {
    systems,
    count: systems.length,
    source: 'NASA Exoplanet Archive',
    table: 'pscomppars',
    lastUpdate: new Date(timestamp).toISOString(),
    cacheExpiry: cacheExpiry(timestamp),
  };

  indexCache = { data: response, timestamp };
  return response;
}

/**
 * 获取单个系外行星系统的完整详情
 * 包含宿主星详细参数和所有已知行星的轨道/物理数据。
 * 结果按 hostname 缓存，可通过 forceRefresh 强制刷新。
 */
export async function fetchExoplanetSystem(hostname: string, forceRefresh = false): Promise<ExoplanetSystemDetails> {
  const cacheKey = hostname.toLowerCase();
  const cached = systemCache.get(cacheKey);

  if (!forceRefresh && isFresh(cached)) {
    return cached.data;
  }

  const safeHostname = escapeAdqlString(hostname);
  const rows = await runTapQuery<TapRow>(`
    select
      hostname,
      pl_name,
      pl_letter,
      ra,
      dec,
      sy_dist,
      sy_snum,
      sy_pnum,
      st_teff,
      st_rad,
      st_mass,
      st_lum,
      st_logg,
      st_met,
      st_age,
      st_spectype,
      pl_orbper,
      pl_orbsmax,
      pl_rade,
      pl_bmasse,
      pl_bmassj,
      pl_eqt,
      pl_orbeccen,
      pl_orbincl,
      pl_dens,
      pl_insol,
      discoverymethod,
      disc_year
    from pscomppars
    where hostname = '${safeHostname}'
    order by pl_orbsmax asc
  `);

  if (rows.length === 0) {
    throw new Error(`No exoplanet system found for host "${hostname}"`);
  }

  const timestamp = Date.now();
  const planets = rows.map(mapPlanet).sort((a, b) => {
    const aOrbit = a.semiMajorAxisAU ?? Number.POSITIVE_INFINITY;
    const bOrbit = b.semiMajorAxisAU ?? Number.POSITIVE_INFINITY;
    return aOrbit - bOrbit;
  });

  const system: ExoplanetSystemDetails = {
    hostname: toStringValue(rows[0]?.hostname) ?? hostname,
    star: mapStar(rows[0]!, planets.length),
    planets,
    source: 'NASA Exoplanet Archive',
    table: 'pscomppars',
    lastUpdate: new Date(timestamp).toISOString(),
  };

  systemCache.set(cacheKey, { data: system, timestamp });
  return system;
}
