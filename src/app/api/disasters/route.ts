/**
 * 灾害数据代理 API
 * GET /api/disasters?source=usgs_earthquake|gdacs|nasa_firms|noaa_weather|emsc_earthquake|noaa_tsunami|reliefweb
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureError } from '@/lib/utils/errors';

const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL: Record<string, number> = {
  usgs_earthquake: 60_000,
  emsc_earthquake: 120_000,
  gdacs:           300_000,
  nasa_firms:      600_000,
  noaa_weather:    300_000,
  noaa_tsunami:    86400_000,
  reliefweb:       3600_000,
};

/**
 * 从 USGS 获取地震数据（过去一周 M2.5+）
 *
 * @returns 地震事件数组
 */
async function fetchUSGS() {
  const res = await fetch(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
    { next: { revalidate: 60 } }
  );
  const json = await res.json();
  return (json.features || []).slice(0, 150).map((f: any) => ({
    id: f.id,
    source: 'usgs_earthquake',
    category: 'earthquake',
    title: f.properties.title,
    severity: f.properties.mag >= 7 ? 'extreme' : f.properties.mag >= 6 ? 'high' : f.properties.mag >= 5 ? 'medium' : 'low',
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    time: new Date(f.properties.time).toISOString(),
    description: `M${f.properties.mag}，深度 ${f.geometry.coordinates[2]}km`,
    url: f.properties.url,
    extra: { magnitude: f.properties.mag, depth: f.geometry.coordinates[2] },
  }));
}

/**
 * 从 EMSC（欧洲地震中心）获取地震数据
 *
 * @returns 地震事件数组
 */
async function fetchEMSC() {
  const res = await fetch(
    'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=100&minmagnitude=3&orderby=time',
    { next: { revalidate: 120 } }
  );
  const json = await res.json();
  return (json.features || []).slice(0, 100).map((f: any) => ({
    id: `emsc-${f.id}`,
    source: 'emsc_earthquake',
    category: 'earthquake',
    title: `M${f.properties.mag} - ${f.properties.flynn_region || '未知地区'}`,
    severity: f.properties.mag >= 7 ? 'extreme' : f.properties.mag >= 6 ? 'high' : f.properties.mag >= 5 ? 'medium' : 'low',
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    time: f.properties.time,
    description: `震级 ${f.properties.mag}，深度 ${f.geometry.coordinates[2]}km`,
    url: `https://www.emsc-csem.org/Earthquake/earthquake.php?id=${f.id}`,
    extra: { magnitude: f.properties.mag, depth: f.geometry.coordinates[2] },
  }));
}

/**
 * 从 GDACS（全球灾害预警和协调系统）获取多类灾害数据
 *
 * @returns 灾害事件数组（地震、台风、洪水、火山、野火、干旱）
 */
async function fetchGDACS() {
  const url = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=EQ,TC,FL,VO,WF,DR&alertlevel=Green,Orange,Red&limit=100';
  const res = await fetch(url, { next: { revalidate: 300 } });
  const json = await res.json();
  const catMap: Record<string, string> = {
    EQ: 'earthquake', TC: 'typhoon', FL: 'flood', VO: 'volcano', WF: 'wildfire', DR: 'drought',
  };
  const alertMap: Record<string, string> = { Red: 'extreme', Orange: 'high', Green: 'medium' };
  return (json.features || []).slice(0, 80).map((f: any) => {
    const p = f.properties;
    return {
      id: `gdacs-${p.eventid}`,
      source: 'gdacs',
      category: catMap[p.eventtype] || 'earthquake',
      title: p.eventname || p.htmldescription?.slice(0, 80) || 'GDACS 事件',
      severity: alertMap[p.alertlevel] || 'low',
      lat: f.geometry?.coordinates?.[1] ?? 0,
      lon: f.geometry?.coordinates?.[0] ?? 0,
      time: p.fromdate || new Date().toISOString(),
      description: p.htmldescription?.replace(/<[^>]+>/g, '').slice(0, 200),
      url: p.url?.report,
      extra: { alertLevel: p.alertlevel, eventType: p.eventtype },
    };
  });
}

/**
 * 从 NASA FIRMS 获取全球活跃火点数据
 *
 * @returns 野火事件数组
 */
async function fetchNASAFIRMS() {
  // FIRMS JSON endpoint - no key needed for basic world data
  const res = await fetch(
    'https://firms.modaps.eosdis.nasa.gov/api/area/json/VIIRS_SNPP_NRT/world/1',
    { next: { revalidate: 600 } }
  );
  const json = await res.json();
  const items = Array.isArray(json) ? json : [];
  return items.slice(0, 300).map((item: any, i: number) => ({
    id: `firms-${i}-${item.latitude}-${item.longitude}`,
    source: 'nasa_firms',
    category: 'wildfire',
    title: `活跃火点 (${parseFloat(item.latitude).toFixed(2)}°, ${parseFloat(item.longitude).toFixed(2)}°)`,
    severity: item.frp > 500 ? 'extreme' : item.frp > 100 ? 'high' : item.frp > 20 ? 'medium' : 'low',
    lat: parseFloat(item.latitude),
    lon: parseFloat(item.longitude),
    time: `${item.acq_date}T${String(item.acq_time).padStart(4, '0').slice(0, 2)}:${String(item.acq_time).padStart(4, '0').slice(2)}:00Z`,
    description: `辐射功率: ${item.frp} MW，置信度: ${item.confidence}`,
    extra: { frp: item.frp, confidence: item.confidence },
  }));
}

/**
 * 从 NOAA 获取美国气象预警数据
 *
 * @returns 气象预警事件数组
 */
async function fetchNOAAWeather() {
  const res = await fetch(
    'https://api.weather.gov/alerts/active?status=actual&message_type=alert',
    { next: { revalidate: 300 } }
  );
  const json = await res.json();
  return (json.features || []).slice(0, 80).map((f: any) => {
    const p = f.properties;
    const sev = p.severity === 'Extreme' ? 'extreme' : p.severity === 'Severe' ? 'high' : p.severity === 'Moderate' ? 'medium' : 'low';
    const coords = f.geometry?.coordinates?.[0]?.[0];
    return {
      id: p.id,
      source: 'noaa_weather',
      category: 'storm',
      title: p.headline || p.event || '气象预警',
      severity: sev,
      lat: coords ? coords[1] : 39.5,
      lon: coords ? coords[0] : -98.35,
      time: p.sent || new Date().toISOString(),
      description: p.description?.slice(0, 200),
      url: p['@id'],
      extra: { event: p.event, urgency: p.urgency },
    };
  });
}

/**
 * 从 NOAA 获取历史海啸事件数据
 *
 * @returns 海啸事件数组
 */
async function fetchNOAATsunami() {
  const res = await fetch(
    'https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/tsunamis/events?maxYear=2026&minYear=2020&orderBy=year',
    { next: { revalidate: 86400 } }
  );
  const json = await res.json();
  return (json.items || []).slice(0, 50).map((item: any) => ({
    id: `noaa-tsunami-${item.id}`,
    source: 'noaa_tsunami',
    category: 'tsunami',
    title: `海啸 - ${item.locationName || item.country || '未知'}`,
    severity: (item.tsIntensity || 0) >= 4 ? 'extreme' : (item.tsIntensity || 0) >= 2 ? 'high' : 'medium',
    lat: item.latitude ?? 0,
    lon: item.longitude ?? 0,
    time: `${item.year}-${String(item.month || 1).padStart(2, '0')}-${String(item.day || 1).padStart(2, '0')}T00:00:00Z`,
    description: `强度: ${item.tsIntensity}，最大浪高: ${item.maxEventRunup}m`,
    extra: { intensity: item.tsIntensity, maxWave: item.maxEventRunup },
  }));
}

/**
 * 从 ReliefWeb 获取正在进行的灾害事件数据
 *
 * @returns 灾害事件数组
 */
async function fetchReliefWeb() {
  const res = await fetch(
    'https://api.reliefweb.int/v1/disasters?appname=opic&limit=50&fields[include][]=name&fields[include][]=date&fields[include][]=country&fields[include][]=type&fields[include][]=status&filter[field]=status&filter[value]=ongoing',
    { next: { revalidate: 3600 } }
  );
  const json = await res.json();
  const catMap: Record<string, string> = {
    'Earthquake': 'earthquake', 'Flood': 'flood', 'Tropical Cyclone': 'typhoon',
    'Wild Fire': 'wildfire', 'Volcano': 'volcano', 'Tsunami': 'tsunami',
    'Drought': 'drought', 'Storm': 'storm',
  };
  return (json.data || []).map((item: any) => {
    const typeName = item.fields?.type?.[0]?.name || 'Storm';
    return {
      id: `reliefweb-${item.id}`,
      source: 'reliefweb',
      category: catMap[typeName] || 'storm',
      title: item.fields?.name || '灾害事件',
      severity: 'high',
      lat: item.fields?.country?.[0]?.location?.lat ?? 0,
      lon: item.fields?.country?.[0]?.location?.lon ?? 0,
      time: item.fields?.date?.created || new Date().toISOString(),
      description: `${typeName} - ${item.fields?.country?.map((c: any) => c.name).join(', ')}`,
      url: `https://reliefweb.int/disaster/${item.id}`,
    };
  });
}

const FETCHERS: Record<string, () => Promise<unknown[]>> = {
  usgs_earthquake: fetchUSGS,
  emsc_earthquake: fetchEMSC,
  gdacs: fetchGDACS,
  nasa_firms: fetchNASAFIRMS,
  noaa_weather: fetchNOAAWeather,
  noaa_tsunami: fetchNOAATsunami,
  reliefweb: fetchReliefWeb,
};

/** GET /api/disasters - Fetch natural disaster data from multiple sources.
 * Sources: USGS earthquakes, GDACS alerts, NASA FIRMS wildfires, Copernicus EMS.
 * Each source fetcher handles its own cache TTL. Results are merged and sorted.
 */
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source');
  if (!source || !FETCHERS[source]) {
    return NextResponse.json({ error: '未知数据源', available: Object.keys(FETCHERS) }, { status: 400 });
  }

  // Check cache
  const cached = CACHE.get(source);
  const ttl = CACHE_TTL[source] || 300_000;
  if (cached && Date.now() - cached.ts < ttl) {
    return NextResponse.json({ events: cached.data, cached: true, count: (cached.data as unknown[]).length });
  }

  try {
    const events = await FETCHERS[source]();
    CACHE.set(source, { data: events, ts: Date.now() });
    return NextResponse.json({ events, cached: false, count: events.length });
  } catch (err: unknown) {
    const msg = ensureError(err).message;
    console.error(`[Disasters API] ${source} 获取失败:`, msg);
    if (cached) {
      return NextResponse.json({ events: cached.data, cached: true, stale: true, count: (cached.data as unknown[]).length });
    }
    return NextResponse.json({ error: msg, events: [], count: 0 }, { status: 500 });
  }
}
