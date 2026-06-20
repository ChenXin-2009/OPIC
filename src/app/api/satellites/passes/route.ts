/**
 * 卫星过境预测API
 *
 * GET /api/satellites/passes?noradId={id}&lat={lat}&lon={lon}&alt={alt}&days={days}
 *
 * 使用SGP4算法计算卫星在指定地点的过境时间
 */

import { NextRequest, NextResponse } from 'next/server';
import { celestrakClient } from '@/lib/server/celestrakClient';
import { SatelliteCategory } from '@/lib/types/satellite';

// 地球常数
const EARTH_RADIUS_KM = 6371.0;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface PassEvent {
  /** 过境开始时间 ISO */
  startTime: string;
  /** 最大仰角时间 ISO */
  maxTime: string;
  /** 过境结束时间 ISO */
  endTime: string;
  /** 最大仰角(度) */
  maxElevation: number;
  /** 过境持续时间(秒) */
  duration: number;
  /** 过境开始方位角(度) */
  startAzimuth: number;
  /** 最大仰角时方位角(度) */
  maxAzimuth: number;
  /** 过境结束方位角(度) */
  endAzimuth: number;
}

export interface PassesResponse {
  noradId: number;
  name: string;
  observerLat: number;
  observerLon: number;
  observerAlt: number;
  passes: PassEvent[];
}



/**
 * 计算格林尼治恒星时(GMST)
 */
function calcGMST(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + T * T * 0.000387933 - T * T * T / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst * DEG_TO_RAD;
}

/**
 * 计算卫星相对于观测者的仰角和方位角
 */
function calcLookAngles(
  satX: number, satY: number, satZ: number,
  obsLat: number, obsLon: number, obsAlt: number,
  gmst: number
): { elevation: number; azimuth: number; range: number } {
  const latRad = obsLat * DEG_TO_RAD;
  const lonRad = obsLon * DEG_TO_RAD;

  // 观测者ECI坐标
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const sinLat = Math.sin(latRad);
  const N = EARTH_RADIUS_KM / Math.sqrt(1 - e2 * sinLat * sinLat);
  const obsR = (N + obsAlt / 1000) * Math.cos(latRad);
  const obsX = obsR * Math.cos(lonRad + gmst);
  const obsY = obsR * Math.sin(lonRad + gmst);
  const obsZ = (N * (1 - e2) + obsAlt / 1000) * sinLat;

  // 差向量
  const dx = satX - obsX;
  const dy = satY - obsY;
  const dz = satZ - obsZ;
  const range = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // 转换到南-东-天坐标系
  const sinLatObs = Math.sin(latRad);
  const cosLatObs = Math.cos(latRad);
  const sinLonObs = Math.sin(lonRad + gmst);
  const cosLonObs = Math.cos(lonRad + gmst);

  const south = sinLatObs * cosLonObs * dx + sinLatObs * sinLonObs * dy - cosLatObs * dz;
  const east = -sinLonObs * dx + cosLonObs * dy;
  const up = cosLatObs * cosLonObs * dx + cosLatObs * sinLonObs * dy + sinLatObs * dz;

  const elevation = Math.atan2(up, Math.sqrt(south * south + east * east)) * RAD_TO_DEG;
  let azimuth = Math.atan2(east, -south) * RAD_TO_DEG;
  if (azimuth < 0) azimuth += 360;

  return { elevation, azimuth, range };
}

/**
 * 简化的SGP4传播(服务端无法使用satellite.js worker，使用简化模型)
 * 基于平均运动和轨道参数的近似计算
 */
function propagateSatellite(
  line1: string, line2: string, date: Date
): { x: number; y: number; z: number; vx: number; vy: number; vz: number } | null {
  try {
    // 从TLE解析参数
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
    const meanMotion = parseFloat(line2.substring(52, 63)) * 2 * Math.PI / 86400; // rad/s

    // 计算时间差(秒)
    const dt = (date.getTime() - epochDate.getTime()) / 1000;

    // 计算当前平近点角
    const meanAnomaly = meanAnomaly0 + meanMotion * dt;

    // 求解偏近点角(迭代)
    let E = meanAnomaly;
    for (let i = 0; i < 10; i++) {
      E = meanAnomaly + eccentricity * Math.sin(E);
    }

    // 真近点角
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
    );

    // 半长轴
    const mu = 398600.4418; // km³/s²
    const n = meanMotion;
    const a = (mu / (n * n)) ** (1 / 3);

    // 轨道平面内坐标
    const r = a * (1 - eccentricity * Math.cos(E));
    const u = argPerigee + trueAnomaly;

    // 转换到ECI
    const cosRaan = Math.cos(raan);
    const sinRaan = Math.sin(raan);
    const cosInc = Math.cos(inclination);
    const sinInc = Math.sin(inclination);
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    const x = r * (cosRaan * cosU - sinRaan * sinU * cosInc);
    const y = r * (sinRaan * cosU + cosRaan * sinU * cosInc);
    const z = r * sinU * sinInc;

    // 速度(简化)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noradIdStr = searchParams.get('noradId');
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');
    const altStr = searchParams.get('alt') || '0';
    const daysStr = searchParams.get('days') || '3';
    const minElStr = searchParams.get('minEl') || '10';

    if (!noradIdStr || !latStr || !lonStr) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: '缺少必要参数: noradId, lat, lon' },
        { status: 400 }
      );
    }

    const noradId = parseInt(noradIdStr, 10);
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const alt = parseFloat(altStr);
    const days = Math.min(parseFloat(daysStr), 10);
    const minEl = parseFloat(minElStr);

    if (isNaN(noradId) || isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'INVALID_PARAMS', message: '参数格式错误' },
        { status: 400 }
      );
    }

    // 查找卫星TLE
    let tleData = null;
    const categories = [
      SatelliteCategory.ACTIVE, SatelliteCategory.ISS,
      SatelliteCategory.GPS, SatelliteCategory.WEATHER,
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

    // 计算过境
    const passes: PassEvent[] = [];
    const now = Date.now();
    const endTime = now + days * 86400000;
    const stepMs = 30000; // 30秒步长

    let inPass = false;
    let passStart: Date | null = null;
    let passStartAz = 0;
    let maxEl = 0;
    let maxElTime: Date | null = null;
    let maxElAz = 0;

    for (let t = now; t < endTime; t += stepMs) {
      const date = new Date(t);
      const gmst = calcGMST(date);
      const pos = propagateSatellite(tleData.line1, tleData.line2, date);
      if (!pos) continue;

      const look = calcLookAngles(pos.x, pos.y, pos.z, lat, lon, alt, gmst);

      if (look.elevation >= minEl) {
        if (!inPass) {
          inPass = true;
          passStart = date;
          passStartAz = look.azimuth;
          maxEl = look.elevation;
          maxElTime = date;
          maxElAz = look.azimuth;
        } else if (look.elevation > maxEl) {
          maxEl = look.elevation;
          maxElTime = date;
          maxElAz = look.azimuth;
        }
      } else if (inPass) {
        inPass = false;
        if (passStart && maxElTime && maxEl >= minEl) {
          const endDate = new Date(t);
          passes.push({
            startTime: passStart.toISOString(),
            maxTime: maxElTime.toISOString(),
            endTime: endDate.toISOString(),
            maxElevation: Math.round(maxEl * 10) / 10,
            duration: Math.round((endDate.getTime() - passStart.getTime()) / 1000),
            startAzimuth: Math.round(passStartAz),
            maxAzimuth: Math.round(maxElAz),
            endAzimuth: Math.round(look.azimuth),
          });
        }
        passStart = null;
        maxEl = 0;
        maxElTime = null;
      }

      if (passes.length >= 20) break;
    }

    const response: PassesResponse = {
      noradId,
      name: tleData.name,
      observerLat: lat,
      observerLon: lon,
      observerAlt: alt,
      passes,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Passes API] 错误:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: String(error) },
      { status: 500 }
    );
  }
}
