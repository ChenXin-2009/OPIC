/**
 * 卫星地面轨迹API
 *
 * GET /api/satellites/groundtrack?noradId={id}&duration={minutes}&steps={n}
 *
 * 返回卫星在指定时间段内的地面轨迹(经纬度序列)
 */

import { NextRequest, NextResponse } from 'next/server';
import { celestrakClient } from '@/lib/server/celestrakClient';
import { SatelliteCategory } from '@/lib/types/satellite';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0;

export interface GroundTrackPoint {
  lat: number;
  lon: number;
  alt: number;
  time: string;
  velocity: number; // km/s
}

export interface GroundTrackResponse {
  noradId: number;
  name: string;
  points: GroundTrackPoint[];
  /** 当前位置索引 */
  currentIndex: number;
}

function calcGMST(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + T * T * 0.000387933 - T * T * T / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst * DEG_TO_RAD;
}

function propagateSatellite(
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
    const n = meanMotion;
    const a = (mu / (n * n)) ** (1 / 3);
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

function eciToGeodetic(
  x: number, y: number, z: number, gmst: number
): { lat: number; lon: number; alt: number } {
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

// 简单内存缓存
const cache = new Map<string, { data: GroundTrackResponse; ts: number }>();
const CACHE_TTL = 60000; // 1分钟

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noradIdStr = searchParams.get('noradId');
    const durationStr = searchParams.get('duration') || '90'; // 分钟
    const stepsStr = searchParams.get('steps') || '180';

    if (!noradIdStr) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: '缺少 noradId 参数' },
        { status: 400 }
      );
    }

    const noradId = parseInt(noradIdStr, 10);
    const duration = Math.min(parseFloat(durationStr), 360); // 最多6小时
    const steps = Math.min(parseInt(stepsStr, 10), 360);

    const cacheKey = `${noradId}-${duration}-${steps}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=60', 'X-Cache': 'HIT' },
      });
    }

    // 查找TLE
    let tleData = null;
    const categories = [
      SatelliteCategory.ACTIVE, SatelliteCategory.ISS,
      SatelliteCategory.GPS, SatelliteCategory.WEATHER,
      SatelliteCategory.COMMUNICATION, SatelliteCategory.SCIENCE,
    ];

    for (const cat of categories) {
      try {
        const tles = await celestrakClient.fetchTLE(cat);
        const found = tles.find(t => t.noradId === noradId);
        if (found) { tleData = found; break; }
      } catch { /* continue */ }
    }

    if (!tleData) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '未找到卫星TLE数据' },
        { status: 404 }
      );
    }

    // 计算地面轨迹
    const now = Date.now();
    const halfDuration = (duration / 2) * 60000; // 前后各一半
    const startTime = now - halfDuration;
    const endTime = now + halfDuration;
    const stepMs = (endTime - startTime) / steps;

    const points: GroundTrackPoint[] = [];
    let currentIndex = Math.floor(steps / 2);

    for (let i = 0; i <= steps; i++) {
      const t = startTime + i * stepMs;
      const date = new Date(t);
      const gmst = calcGMST(date);
      const pos = propagateSatellite(tleData.line1, tleData.line2, date);
      if (!pos) continue;

      const geo = eciToGeodetic(pos.x, pos.y, pos.z, gmst);
      const speed = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy + pos.vz * pos.vz);

      points.push({
        lat: Math.round(geo.lat * 1000) / 1000,
        lon: Math.round(geo.lon * 1000) / 1000,
        alt: Math.round(geo.alt * 10) / 10,
        time: date.toISOString(),
        velocity: Math.round(speed * 100) / 100,
      });

      if (Math.abs(t - now) < stepMs / 2) {
        currentIndex = points.length - 1;
      }
    }

    const response: GroundTrackResponse = {
      noradId,
      name: tleData.name,
      points,
      currentIndex,
    };

    cache.set(cacheKey, { data: response, ts: Date.now() });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[GroundTrack API] 错误:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: String(error) },
      { status: 500 }
    );
  }
}
