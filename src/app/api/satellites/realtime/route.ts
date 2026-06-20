/**
 * 卫星实时位置API
 *
 * GET /api/satellites/realtime?noradId={id}
 * GET /api/satellites/realtime?noradIds={id1,id2,...}
 *
 * 返回卫星当前的精确地理坐标、速度、仰角等实时数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { celestrakClient } from '@/lib/server/celestrakClient';
import { SatelliteCategory } from '@/lib/types/satellite';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0;

export interface RealtimePosition {
  noradId: number;
  name: string;
  /** 纬度(度) */
  latitude: number;
  /** 经度(度) */
  longitude: number;
  /** 高度(km) */
  altitude: number;
  /** 速度(km/s) */
  velocity: number;
  /** 速度分量 */
  velocityVector: { x: number; y: number; z: number };
  /** 方位角(度, 0=北) */
  azimuth: number;
  /** 仰角(度) */
  elevation: number;
  /** 距地面距离(km) */
  range: number;
  /** 轨道倾角(度) */
  inclination: number;
  /** 轨道周期(分钟) */
  period: number;
  /** 轨道类型 */
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'HEO';
  /** 计算时间 */
  timestamp: string;
  /** 可见性(是否在地平线以上) */
  visible: boolean;
}

function calcGMST(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + T * T * 0.000387933 - T * T * T / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst * DEG_TO_RAD;
}

function propagate(
  line1: string, line2: string, date: Date
): { x: number; y: number; z: number; vx: number; vy: number; vz: number } | null {
  try {
    const epochYear = parseInt(line1.substring(18, 20), 10);
    const epochDay = parseFloat(line1.substring(20, 32));
    const fullYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
    const epochDate = new Date(Date.UTC(fullYear, 0, 1));
    epochDate.setTime(epochDate.getTime() + (epochDay - 1) * 86400000);

    const inclination = parseFloat(line2.substring(8, 16)) * DEG_TO_RAD;
    const raan = parseFloat(line2.substring(17, 25)) * DEG_TO_RAD;
    const eccentricity = parseFloat('0.' + line2.substring(26, 33));
    const argPerigee = parseFloat(line2.substring(34, 42)) * DEG_TO_RAD;
    const meanAnomaly0 = parseFloat(line2.substring(43, 51)) * DEG_TO_RAD;
    const meanMotion = parseFloat(line2.substring(52, 63)) * 2 * Math.PI / 86400;

    const dt = (date.getTime() - epochDate.getTime()) / 1000;
    const meanAnomaly = meanAnomaly0 + meanMotion * dt;

    let E = meanAnomaly;
    for (let i = 0; i < 10; i++) {
      E = meanAnomaly + eccentricity * Math.sin(E);
    }

    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
    );

    const mu = 398600.4418;
    const a = (mu / (meanMotion * meanMotion)) ** (1 / 3);
    const r = a * (1 - eccentricity * Math.cos(E));
    const u = argPerigee + trueAnomaly;

    const cosRaan = Math.cos(raan);
    const sinRaan = Math.sin(raan);
    const cosInc = Math.cos(inclination);
    const sinInc = Math.sin(inclination);
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    const x = r * (cosRaan * cosU - sinRaan * sinU * cosInc);
    const y = r * (sinRaan * cosU + cosRaan * sinU * cosInc);
    const z = r * sinU * sinInc;

    const p = a * (1 - eccentricity * eccentricity);
    const h = Math.sqrt(mu * p);
    const vr = (mu / h) * eccentricity * Math.sin(trueAnomaly);
    const vt = h / r;

    const vx = vr * (cosRaan * cosU - sinRaan * sinU * cosInc)
      - vt * (cosRaan * sinU + sinRaan * cosU * cosInc);
    const vy = vr * (sinRaan * cosU + cosRaan * sinU * cosInc)
      - vt * (sinRaan * sinU - cosRaan * cosU * cosInc);
    const vz = vr * sinU * sinInc + vt * cosU * sinInc;

    return { x, y, z, vx, vy, vz };
  } catch {
    return null;
  }
}

function eciToGeodetic(x: number, y: number, z: number, gmst: number) {
  const r = Math.sqrt(x * x + y * y);
  let lon = Math.atan2(y, x) - gmst;
  while (lon < -Math.PI) lon += 2 * Math.PI;
  while (lon > Math.PI) lon -= 2 * Math.PI;

  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  let lat = Math.atan2(z, r);
  for (let i = 0; i < 5; i++) {
    const sinLat = Math.sin(lat);
    const N = EARTH_RADIUS_KM / Math.sqrt(1 - e2 * sinLat * sinLat);
    lat = Math.atan2(z + e2 * N * sinLat, r);
  }
  const sinLat = Math.sin(lat);
  const N = EARTH_RADIUS_KM / Math.sqrt(1 - e2 * sinLat * sinLat);
  const alt = r / Math.cos(lat) - N;
  return { lat: lat * RAD_TO_DEG, lon: lon * RAD_TO_DEG, alt };
}

function getOrbitType(alt: number, ecc: number): 'LEO' | 'MEO' | 'GEO' | 'HEO' {
  if (ecc > 0.25) return 'HEO';
  if (alt < 2000) return 'LEO';
  if (alt < 35000) return 'MEO';
  return 'GEO';
}

// 缓存
const cache = new Map<number, { data: RealtimePosition; ts: number }>();
const CACHE_TTL = 5000; // 5秒

async function getRealtimePosition(noradId: number): Promise<RealtimePosition | null> {
  const cached = cache.get(noradId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const categories = [
    SatelliteCategory.ACTIVE, SatelliteCategory.ISS,
    SatelliteCategory.GPS, SatelliteCategory.WEATHER,
    SatelliteCategory.COMMUNICATION, SatelliteCategory.SCIENCE,
  ];

  let tleData = null;
  for (const cat of categories) {
    try {
      const tles = await celestrakClient.fetchTLE(cat);
      const found = tles.find(t => t.noradId === noradId);
      if (found) { tleData = found; break; }
    } catch { /* continue */ }
  }

  if (!tleData) return null;

  const now = new Date();
  const gmst = calcGMST(now);
  const pos = propagate(tleData.line1, tleData.line2, now);
  if (!pos) return null;

  const geo = eciToGeodetic(pos.x, pos.y, pos.z, gmst);
  const speed = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy + pos.vz * pos.vz);

  // 从TLE解析轨道参数
  const inclination = parseFloat(tleData.line2.substring(8, 16));
  const eccentricity = parseFloat('0.' + tleData.line2.substring(26, 33));
  const meanMotion = parseFloat(tleData.line2.substring(52, 63));
  const period = 1440 / meanMotion;

  // 计算相对于地面的方位角(卫星运动方向)
  const azimuth = Math.atan2(pos.vy, pos.vx) * RAD_TO_DEG;

  const result: RealtimePosition = {
    noradId,
    name: tleData.name,
    latitude: Math.round(geo.lat * 10000) / 10000,
    longitude: Math.round(geo.lon * 10000) / 10000,
    altitude: Math.round(geo.alt * 10) / 10,
    velocity: Math.round(speed * 100) / 100,
    velocityVector: {
      x: Math.round(pos.vx * 100) / 100,
      y: Math.round(pos.vy * 100) / 100,
      z: Math.round(pos.vz * 100) / 100,
    },
    azimuth: ((azimuth % 360) + 360) % 360,
    elevation: 90 - Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + geo.alt)) * RAD_TO_DEG,
    range: geo.alt,
    inclination: Math.round(inclination * 100) / 100,
    period: Math.round(period * 100) / 100,
    orbitType: getOrbitType(geo.alt, eccentricity),
    timestamp: now.toISOString(),
    visible: geo.alt > 0,
  };

  cache.set(noradId, { data: result, ts: Date.now() });
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noradIdStr = searchParams.get('noradId');
    const noradIdsStr = searchParams.get('noradIds');

    if (!noradIdStr && !noradIdsStr) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: '缺少 noradId 或 noradIds 参数' },
        { status: 400 }
      );
    }

    if (noradIdsStr) {
      // 批量查询
      const ids = noradIdsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (ids.length > 50) {
        return NextResponse.json(
          { error: 'TOO_MANY', message: '最多同时查询50颗卫星' },
          { status: 400 }
        );
      }

      const results = await Promise.all(ids.map(id => getRealtimePosition(id)));
      const positions = results.filter(Boolean) as RealtimePosition[];

      return NextResponse.json({ positions, count: positions.length }, {
        status: 200,
        headers: { 'Cache-Control': 'no-cache' },
      });
    }

    // 单个查询
    const noradId = parseInt(noradIdStr!, 10);
    if (isNaN(noradId)) {
      return NextResponse.json(
        { error: 'INVALID_PARAMS', message: '无效的 noradId' },
        { status: 400 }
      );
    }

    const position = await getRealtimePosition(noradId);
    if (!position) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '未找到卫星数据' },
        { status: 404 }
      );
    }

    return NextResponse.json(position, {
      status: 200,
      headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Realtime API] 错误:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: String(error) },
      { status: 500 }
    );
  }
}
