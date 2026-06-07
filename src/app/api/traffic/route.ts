/**
 * 全球货运与贸易路线数据代理 API
 * GET /api/traffic?source=opensky|adsbexchange|flightradar24_free|worldports
 *
 * 数据源选择原则：真正无需 key、服务端可访问、稳定
 */

import { NextRequest, NextResponse } from 'next/server';

const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL: Record<string, number> = {
  opensky:            20_000,
  adsbexchange:       20_000,
  flightradar24_free: 20_000,
  worldports:         86400_000,
};

async function safeFetch(url: string, init?: RequestInit, timeoutMs = 9000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── 航班：adsb.fi（完全免费，无 key，Vercel 友好）────────────────────────────

async function fetchAdsbFi(): Promise<unknown[]> {
  const res = await safeFetch('https://api.adsb.fi/v1/flights', {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`adsb.fi HTTP ${res.status}`);
  const json = await res.json();
  const ac: any[] = json.ac || json.aircraft || [];
  return ac
    .filter(a => a.lat != null && a.lon != null)
    .slice(0, 3000)
    .map((a, i) => ({
      icao24:       a.hex || `fi-${i}`,
      callsign:     (a.flight || a.r || '').trim(),
      lat:          a.lat,
      lon:          a.lon,
      altitude:     typeof a.alt_baro === 'number' ? a.alt_baro * 0.3048
                  : typeof a.alt_geom === 'number' ? a.alt_geom * 0.3048 : 0,
      velocity:     (a.gs || 0) * 0.514444,
      heading:      a.track || 0,
      verticalRate: (a.baro_rate || 0) * 0.00508,
      timestamp:    Date.now(),
      sourceId:     'adsbexchange',
    }));
}

// ── 航班：AviationStack 免费层（每月 100 次，备用）────────────────────────────
// 注：免费层只有历史数据，实时需付费，这里作为最后备用

async function fetchAviationEdge(): Promise<unknown[]> {
  // aviation-edge.com 免费试用 key（公开演示 key，仅供测试）
  // 实际部署建议在 .env 里配置 AVIATION_EDGE_KEY
  const key = process.env.AVIATION_EDGE_KEY || '';
  if (!key) throw new Error('未配置 AVIATION_EDGE_KEY');
  const res = await safeFetch(
    `https://aviation-edge.com/v2/public/flights?key=${key}&status=en-route&limit=1000`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (!res.ok) throw new Error(`AviationEdge HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error('AviationEdge 返回格式异常');
  return json.slice(0, 2000).map((a: any, i: number) => ({
    icao24:   a.aircraft?.icao24 || `ae-${i}`,
    callsign: a.flight?.iataNumber || a.flight?.icaoNumber || '',
    lat:      parseFloat(a.geography?.latitude  || '0'),
    lon:      parseFloat(a.geography?.longitude || '0'),
    altitude: parseFloat(a.geography?.altitude  || '0') * 0.3048,
    velocity: parseFloat(a.speed?.horizontal    || '0') * 0.514444,
    heading:  parseFloat(a.geography?.direction || '0'),
    verticalRate: parseFloat(a.speed?.vertical  || '0'),
    origin:      a.departure?.iataCode,
    destination: a.arrival?.iataCode,
    airline:     a.airline?.iataCode,
    timestamp:   Date.now(),
    sourceId:    'flightradar24_free',
  }));
}

// ── 航班：OpenSky 带认证（可选，速率更高）────────────────────────────────────

async function fetchOpenSkyAuth(): Promise<unknown[]> {
  const user = process.env.OPENSKY_USER || '';
  const pass = process.env.OPENSKY_PASS || '';
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (user && pass) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }
  const res = await safeFetch('https://opensky-network.org/api/states/all', { headers });
  if (res.status === 429) throw new Error('OpenSky 限速');
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
  const json = await res.json();
  return ((json.states as unknown[][]) || [])
    .filter(s => s[5] != null && s[6] != null && s[8] === false)
    .slice(0, 3000)
    .map(s => ({
      icao24:       String(s[0]),
      callsign:     String(s[1] || '').trim(),
      lat:          s[6] as number,
      lon:          s[5] as number,
      altitude:     (s[7] as number) || 0,
      velocity:     (s[9] as number) || 0,
      heading:      (s[10] as number) || 0,
      verticalRate: (s[11] as number) || 0,
      timestamp:    ((s[3] as number) || 0) * 1000,
      sourceId:     'opensky',
    }));
}

// ── 港口：内置主要港口数据（完全离线，不依赖任何 API）────────────────────────

function getBuiltinPorts(): unknown[] {
  return [
    // 亚洲
    { id: 'shanghai',    name: 'Shanghai',        country: 'CN', lat: 31.23,  lon: 121.47, type: 'sea', size: 'mega'   },
    { id: 'singapore',   name: 'Singapore',       country: 'SG', lat: 1.26,   lon: 103.82, type: 'sea', size: 'mega'   },
    { id: 'ningbo',      name: 'Ningbo-Zhoushan', country: 'CN', lat: 29.87,  lon: 121.55, type: 'sea', size: 'mega'   },
    { id: 'shenzhen',    name: 'Shenzhen',        country: 'CN', lat: 22.54,  lon: 114.06, type: 'sea', size: 'mega'   },
    { id: 'guangzhou',   name: 'Guangzhou',       country: 'CN', lat: 23.09,  lon: 113.26, type: 'sea', size: 'large'  },
    { id: 'qingdao',     name: 'Qingdao',         country: 'CN', lat: 36.07,  lon: 120.38, type: 'sea', size: 'large'  },
    { id: 'busan',       name: 'Busan',           country: 'KR', lat: 35.10,  lon: 129.04, type: 'sea', size: 'large'  },
    { id: 'hongkong',    name: 'Hong Kong',       country: 'HK', lat: 22.30,  lon: 114.17, type: 'sea', size: 'large'  },
    { id: 'tianjin',     name: 'Tianjin',         country: 'CN', lat: 39.00,  lon: 117.72, type: 'sea', size: 'large'  },
    { id: 'kaohsiung',   name: 'Kaohsiung',       country: 'TW', lat: 22.62,  lon: 120.27, type: 'sea', size: 'large'  },
    { id: 'tanjung',     name: 'Tanjung Pelepas', country: 'MY', lat: 1.36,   lon: 103.55, type: 'sea', size: 'large'  },
    { id: 'colombo',     name: 'Colombo',         country: 'LK', lat: 6.93,   lon: 79.85,  type: 'sea', size: 'medium' },
    { id: 'dubai',       name: 'Jebel Ali',       country: 'AE', lat: 24.98,  lon: 55.06,  type: 'sea', size: 'large'  },
    { id: 'tokyo',       name: 'Tokyo',           country: 'JP', lat: 35.62,  lon: 139.77, type: 'sea', size: 'large'  },
    { id: 'osaka',       name: 'Osaka',           country: 'JP', lat: 34.65,  lon: 135.43, type: 'sea', size: 'medium' },
    { id: 'mumbai',      name: 'Mumbai (JNPT)',   country: 'IN', lat: 18.95,  lon: 72.95,  type: 'sea', size: 'large'  },
    { id: 'klang',       name: 'Port Klang',      country: 'MY', lat: 3.00,   lon: 101.39, type: 'sea', size: 'large'  },
    { id: 'laemchabang', name: 'Laem Chabang',    country: 'TH', lat: 13.08,  lon: 100.88, type: 'sea', size: 'large'  },
    // 欧洲
    { id: 'rotterdam',   name: 'Rotterdam',       country: 'NL', lat: 51.90,  lon: 4.48,   type: 'sea', size: 'mega'   },
    { id: 'antwerp',     name: 'Antwerp',         country: 'BE', lat: 51.22,  lon: 4.40,   type: 'sea', size: 'large'  },
    { id: 'hamburg',     name: 'Hamburg',         country: 'DE', lat: 53.55,  lon: 9.99,   type: 'sea', size: 'large'  },
    { id: 'felixstowe',  name: 'Felixstowe',      country: 'GB', lat: 51.96,  lon: 1.35,   type: 'sea', size: 'medium' },
    { id: 'barcelona',   name: 'Barcelona',       country: 'ES', lat: 41.35,  lon: 2.17,   type: 'sea', size: 'medium' },
    { id: 'valencia',    name: 'Valencia',        country: 'ES', lat: 39.45,  lon: -0.32,  type: 'sea', size: 'medium' },
    { id: 'piraeus',     name: 'Piraeus',         country: 'GR', lat: 37.94,  lon: 23.63,  type: 'sea', size: 'large'  },
    { id: 'gioia_tauro', name: 'Gioia Tauro',     country: 'IT', lat: 38.43,  lon: 15.90,  type: 'sea', size: 'medium' },
    // 美洲
    { id: 'losangeles',  name: 'Los Angeles',     country: 'US', lat: 33.74,  lon: -118.27,type: 'sea', size: 'large'  },
    { id: 'longbeach',   name: 'Long Beach',      country: 'US', lat: 33.77,  lon: -118.19,type: 'sea', size: 'large'  },
    { id: 'newyork',     name: 'New York/NJ',     country: 'US', lat: 40.69,  lon: -74.04, type: 'sea', size: 'large'  },
    { id: 'savannah',    name: 'Savannah',        country: 'US', lat: 32.08,  lon: -81.10, type: 'sea', size: 'large'  },
    { id: 'houston',     name: 'Houston',         country: 'US', lat: 29.73,  lon: -95.27, type: 'sea', size: 'large'  },
    { id: 'santos',      name: 'Santos',          country: 'BR', lat: -23.95, lon: -46.33, type: 'sea', size: 'large'  },
    { id: 'colon',       name: 'Colón (Panama)',  country: 'PA', lat: 9.36,   lon: -79.90, type: 'sea', size: 'large'  },
    { id: 'manzanillo',  name: 'Manzanillo MX',   country: 'MX', lat: 19.05,  lon: -104.32,type: 'sea', size: 'medium' },
    // 非洲 / 中东
    { id: 'portsa',      name: 'Port Said',       country: 'EG', lat: 31.26,  lon: 32.31,  type: 'sea', size: 'large'  },
    { id: 'durban',      name: 'Durban',          country: 'ZA', lat: -29.87, lon: 31.03,  type: 'sea', size: 'large'  },
    { id: 'djibouti',    name: 'Djibouti',        country: 'DJ', lat: 11.59,  lon: 43.14,  type: 'sea', size: 'medium' },
    // 大洋洲
    { id: 'sydney',      name: 'Sydney',          country: 'AU', lat: -33.87, lon: 151.21, type: 'sea', size: 'medium' },
    { id: 'melbourne',   name: 'Melbourne',       country: 'AU', lat: -37.82, lon: 144.93, type: 'sea', size: 'medium' },
  ];
}

// ── 港口：尝试 NGA API，失败回退内置数据 ─────────────────────────────────────

async function fetchWorldPorts(): Promise<unknown[]> {
  try {
    const res = await safeFetch(
      'https://msi.nga.mil/api/publications/world-port-index?output=json',
      { headers: { 'Accept': 'application/json' } },
      6000
    );
    if (!res.ok) throw new Error(`NGA HTTP ${res.status}`);
    const json = await res.json();
    const ports: any[] = json.ports || json.data || (Array.isArray(json) ? json : []);
    if (ports.length > 10) {
      return ports
        .filter((p: any) => p.latitude && p.longitude)
        .slice(0, 600)
        .map((p: any) => ({
          id:      p.portNumber || String(Math.random()),
          name:    p.portName   || 'Unknown Port',
          country: p.countryCode || '',
          lat:     parseFloat(String(p.latitude  || '0')),
          lon:     parseFloat(String(p.longitude || '0')),
          type:    'sea',
          size:    p.overallSize === 'L' ? 'large' : p.overallSize === 'M' ? 'medium' : 'small',
          locode:  p.unloCode || '',
        }));
    }
  } catch {
    // 回退到内置数据
  }
  return getBuiltinPorts();
}

// ── 航班：多源瀑布（依次尝试，第一个成功即返回）─────────────────────────────

async function fetchFlightsCascade(_sourceId: string): Promise<unknown[]> {
  const errors: string[] = [];

  // 1. adsb.fi（最稳定）
  try { return await fetchAdsbFi(); } catch (e: any) { errors.push(`adsb.fi: ${e.message}`); }

  // 2. OpenSky（带认证优先，否则匿名）
  try { return await fetchOpenSkyAuth(); } catch (e: any) { errors.push(`opensky: ${e.message}`); }

  // 3. AviationEdge（需要 key）
  if (process.env.AVIATION_EDGE_KEY) {
    try { return await fetchAviationEdge(); } catch (e: any) { errors.push(`aviationedge: ${e.message}`); }
  }

  throw new Error(`所有航班数据源失败: ${errors.join(' | ')}`);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

const FETCHERS: Record<string, () => Promise<unknown[]>> = {
  opensky:            () => fetchFlightsCascade('opensky'),
  adsbexchange:       () => fetchFlightsCascade('adsbexchange'),
  flightradar24_free: () => fetchFlightsCascade('flightradar24_free'),
  worldports:         fetchWorldPorts,
};

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source');
  if (!source || !FETCHERS[source]) {
    return NextResponse.json({ error: '未知数据源', available: Object.keys(FETCHERS) }, { status: 400 });
  }

  const cached = CACHE.get(source);
  const ttl = CACHE_TTL[source] ?? 30_000;

  if (cached && Date.now() - cached.ts < ttl) {
    return NextResponse.json(
      { data: cached.data, cached: true, count: (cached.data as unknown[]).length },
      { headers: { 'Cache-Control': `public, s-maxage=${Math.floor(ttl / 1000)}, stale-while-revalidate=30` } }
    );
  }

  try {
    const data = await FETCHERS[source]();
    CACHE.set(source, { data, ts: Date.now() });
    return NextResponse.json(
      { data, cached: false, count: data.length },
      { headers: { 'Cache-Control': `public, s-maxage=${Math.floor(ttl / 1000)}, stale-while-revalidate=30` } }
    );
  } catch (err: any) {
    console.error(`[Traffic API] ${source} 失败:`, err.message);
    if (cached) {
      return NextResponse.json(
        { data: cached.data, cached: true, stale: true, count: (cached.data as unknown[]).length },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(
      { error: err.message, data: [], count: 0 },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
