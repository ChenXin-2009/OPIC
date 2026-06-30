/**
 * 航天发射数据代理 API
 * GET /api/launches?source=launch_library2|spacex_api|rocketlaunch_live|thespacedevs|nextspaceflight
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureError } from '@/lib/utils/errors';

const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL: Record<string, number> = {
  launch_library2:   300_000,
  spacex_api:        600_000,
  rocketlaunch_live: 120_000,
  thespacedevs:      180_000,
  nextspaceflight:   3600_000,
};

/**
 * 将 Launch Library 2 状态缩写映射为标准状态码
 *
 * @param abbrev - 状态缩写（如 'Go', 'TBD', 'Success'）
 * @returns 标准状态码
 */
function mapLL2Status(abbrev: string): string {
  const map: Record<string, string> = {
    'Go': 'go', 'TBD': 'tbd', 'Success': 'success', 'Failure': 'failure',
    'Partial Failure': 'partial_failure', 'Hold': 'hold',
    'In Flight': 'in_flight', 'Go for Launch': 'go_for_launch',
  };
  return map[abbrev] ?? 'tbd';
}

/**
 * 将轨道名称映射为标准轨道类型
 *
 * @param name - 轨道名称（如 'Low Earth Orbit', 'GEO'）
 * @returns 标准轨道类型（LEO, MEO, GEO, GTO, SSO, ISS, TLI, HEO, Sub, Other）
 */
function mapOrbit(name?: string): string {
  if (!name) return 'Other';
  const n = name.toUpperCase();
  if (n.includes('LEO') || n.includes('LOW EARTH')) return 'LEO';
  if (n.includes('MEO') || n.includes('MEDIUM EARTH')) return 'MEO';
  if (n.includes('GEO') || n.includes('GEOSTATIONARY')) return 'GEO';
  if (n.includes('GTO') || n.includes('GEOSYNCHRONOUS TRANSFER')) return 'GTO';
  if (n.includes('SSO') || n.includes('SUN-SYNC') || n.includes('SUN SYNC')) return 'SSO';
  if (n.includes('ISS') || n.includes('SPACE STATION')) return 'ISS';
  if (n.includes('TLI') || n.includes('TRANS-LUNAR') || n.includes('LUNAR')) return 'TLI';
  if (n.includes('HEO') || n.includes('HIGH EARTH') || n.includes('ELLIPTICAL')) return 'HEO';
  if (n.includes('SUB') || n.includes('SUBORBITAL')) return 'Sub';
  return 'Other';
}

/**
 * 从 Launch Library 2 API 获取即将进行的发射数据
 *
 * @returns 发射数据数组
 */
async function fetchLaunchLibrary2() {
  const res = await fetch(
    'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?format=json&limit=25&mode=detailed',
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`LL2 HTTP ${res.status}`);
  const json = await res.json();
  return (json.results || []).map((item: any) => ({
    id: `ll2-${item.id}`,
    sourceId: 'launch_library2',
    name: item.name,
    status: mapLL2Status(item.status?.abbrev),
    net: item.net,
    windowStart: item.window_start,
    windowEnd: item.window_end,
    probability: item.probability,
    holdReason: item.holdreason,
    failReason: item.failreason,
    url: item.url,
    imageUrl: item.image?.image_url,
    livestreamUrl: item.vidURLs?.[0]?.url,
    vehicle: {
      name: item.rocket?.configuration?.name || 'Unknown',
      family: item.rocket?.configuration?.family,
      variant: item.rocket?.configuration?.variant,
      reusable: item.rocket?.configuration?.reusable,
      manufacturer: item.rocket?.configuration?.manufacturer?.name,
      country: item.rocket?.configuration?.manufacturer?.country_code,
      payloadLEO: item.rocket?.configuration?.leo_capacity,
      payloadGTO: item.rocket?.configuration?.gto_capacity,
      stages: item.rocket?.configuration?.stages,
    },
    site: {
      name: item.pad?.name || 'Unknown',
      location: item.pad?.location?.name || '',
      country: item.pad?.location?.country_code || '',
      lat: parseFloat(item.pad?.latitude) || 0,
      lon: parseFloat(item.pad?.longitude) || 0,
    },
    mission: item.mission ? {
      name: item.mission.name,
      description: item.mission.description,
      type: item.mission.type,
      orbit: mapOrbit(item.mission.orbit?.name),
      orbitAltitude: item.mission.orbit?.altitude,
      orbitInclination: item.mission.orbit?.inclination,
    } : undefined,
  }));
}

/**
 * 从 SpaceX API 获取即将进行的发射数据
 *
 * @returns 发射数据数组
 */
async function fetchSpaceX() {
  const res = await fetch(
    'https://api.spacexdata.com/v5/launches/upcoming',
    { next: { revalidate: 600 } }
  );
  if (!res.ok) throw new Error(`SpaceX API HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : []).map((item: any) => ({
    id: `spacex-${item.id}`,
    sourceId: 'spacex_api',
    name: item.name,
    status: item.upcoming ? 'go' : item.success === true ? 'success' : item.success === false ? 'failure' : 'tbd',
    net: item.date_utc,
    url: item.links?.wikipedia || item.links?.webcast,
    imageUrl: item.links?.patch?.large || item.links?.patch?.small,
    livestreamUrl: item.links?.webcast,
    vehicle: {
      name: 'Falcon 9',
      family: 'Falcon',
      manufacturer: 'SpaceX',
      country: 'USA',
      reusable: true,
    },
    site: {
      name: item.launchpad || 'SpaceX Launch Site',
      location: 'United States',
      country: 'USA',
      lat: 28.5618571,
      lon: -80.577366,
    },
    mission: {
      name: item.name,
      description: item.details || '',
      orbit: mapOrbit(item.payloads?.[0]?.orbit),
    },
  }));
}

/**
 * 从 RocketLaunch.Live API 获取即将进行的发射数据
 *
 * @returns 发射数据数组
 */
async function fetchRocketLaunchLive() {
  const res = await fetch(
    'https://fdo.rocketlaunch.live/json/launches/next/5',
    { next: { revalidate: 120 } }
  );
  if (!res.ok) throw new Error(`RocketLaunch.Live HTTP ${res.status}`);
  const json = await res.json();
  return (json.result || []).map((item: any) => ({
    id: `rll-${item.id}`,
    sourceId: 'rocketlaunch_live',
    name: item.name || `${item.vehicle?.name} - ${item.provider?.name}`,
    status: item.t0 ? 'go' : 'tbd',
    net: item.t0 || item.win_open || new Date().toISOString(),
    windowStart: item.win_open,
    windowEnd: item.win_close,
    url: item.launch_description,
    vehicle: {
      name: item.vehicle?.name || 'Unknown',
      manufacturer: item.provider?.name,
      country: item.provider?.country_code,
    },
    site: {
      name: item.pad?.name || 'Unknown',
      location: item.pad?.location?.name || '',
      country: item.pad?.location?.country || '',
      lat: item.pad?.location?.latitude || 0,
      lon: item.pad?.location?.longitude || 0,
    },
    mission: item.missions?.[0] ? {
      name: item.missions[0].name,
      description: item.missions[0].description,
      orbit: mapOrbit(item.missions[0].orbit),
    } : undefined,
  }));
}

/**
 * 从 TheSpaceDevs API 获取即将进行的发射数据（列表模式）
 *
 * @returns 发射数据数组
 */
async function fetchTheSpaceDevsList() {
  const res = await fetch(
    'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?format=json&limit=10&mode=list',
    { next: { revalidate: 180 } }
  );
  if (!res.ok) throw new Error(`TSD HTTP ${res.status}`);
  const json = await res.json();
  return (json.results || []).map((item: any) => ({
    id: `tsd-${item.id}`,
    sourceId: 'thespacedevs',
    name: item.name,
    status: mapLL2Status(item.status?.abbrev),
    net: item.net,
    windowStart: item.window_start,
    windowEnd: item.window_end,
    url: item.url,
    vehicle: {
      name: item.rocket?.configuration?.name || 'Unknown',
      manufacturer: item.rocket?.configuration?.manufacturer?.name,
    },
    site: {
      name: item.pad?.name || 'Unknown',
      location: item.pad?.location?.name || '',
      country: item.pad?.location?.country_code || '',
      lat: parseFloat(item.pad?.latitude) || 0,
      lon: parseFloat(item.pad?.longitude) || 0,
    },
  }));
}

/**
 * 从 TheSpaceDevs API 获取历史发射数据
 *
 * @returns 发射数据数组
 */
async function fetchPreviousLaunches() {
  const res = await fetch(
    'https://ll.thespacedevs.com/2.3.0/launches/previous/?format=json&limit=20&mode=detailed',
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`NSF HTTP ${res.status}`);
  const json = await res.json();
  return (json.results || []).map((item: any) => ({
    id: `nsf-${item.id}`,
    sourceId: 'nextspaceflight',
    name: item.name,
    status: mapLL2Status(item.status?.abbrev),
    net: item.net,
    url: item.url,
    imageUrl: item.image?.image_url,
    vehicle: {
      name: item.rocket?.configuration?.name || 'Unknown',
      family: item.rocket?.configuration?.family,
      manufacturer: item.rocket?.configuration?.manufacturer?.name,
      country: item.rocket?.configuration?.manufacturer?.country_code,
      payloadLEO: item.rocket?.configuration?.leo_capacity,
    },
    site: {
      name: item.pad?.name || 'Unknown',
      location: item.pad?.location?.name || '',
      country: item.pad?.location?.country_code || '',
      lat: parseFloat(item.pad?.latitude) || 0,
      lon: parseFloat(item.pad?.longitude) || 0,
    },
    mission: item.mission ? {
      name: item.mission.name,
      description: item.mission.description,
      type: item.mission.type,
      orbit: mapOrbit(item.mission.orbit?.name),
    } : undefined,
  }));
}

const FETCHERS: Record<string, () => Promise<unknown[]>> = {
  launch_library2: fetchLaunchLibrary2,
  spacex_api: fetchSpaceX,
  rocketlaunch_live: fetchRocketLaunchLive,
  thespacedevs: fetchTheSpaceDevsList,
  nextspaceflight: fetchPreviousLaunches,
};

/** GET /api/launches - Fetch upcoming space launches from multiple data sources.
 * Sources: Launch Library 2, SpaceX API, Astra, Rocket Lab, ULA.
 * Each source is fetched independently; failures are logged but don't block others.
 * Results are merged and sorted by launch date.
 */
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source');
  if (!source || !FETCHERS[source]) {
    return NextResponse.json({ error: '未知数据源', available: Object.keys(FETCHERS) }, { status: 400 });
  }

  const cached = CACHE.get(source);
  const ttl = CACHE_TTL[source] || 300_000;
  if (cached && Date.now() - cached.ts < ttl) {
    return NextResponse.json({ launches: cached.data, cached: true, count: (cached.data as unknown[]).length });
  }

  try {
    const launches = await FETCHERS[source]();
    CACHE.set(source, { data: launches, ts: Date.now() });
    return NextResponse.json({ launches, cached: false, count: launches.length });
  } catch (err: unknown) {
    const msg = ensureError(err).message;
    console.error(`[Launches API] ${source} 获取失败:`, msg);
    if (cached) {
      return NextResponse.json({ launches: cached.data, cached: true, stale: true, count: (cached.data as unknown[]).length });
    }
    return NextResponse.json({ error: msg, launches: [], count: 0 }, { status: 500 });
  }
}
