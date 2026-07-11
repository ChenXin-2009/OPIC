/**
 * @module data/launch-sites
 * @description 发射场静态数据库
 *
 * 提供全球主要航天发射场的地理坐标（WGS84）和元数据。
 * 仿照 `src/lib/astronomy/lunar-sites.ts` 的数据模式。
 *
 * 坐标系说明：
 * - 发射场坐标使用 WGS84 大地坐标系（纬度/经度/海拔）
 * - 积分器使用地心惯性系 (ECI, J2000)
 * - 本模块提供 LLA → ECEF → ECI 转换函数
 *
 * @unit
 * - 纬度/经度：度 (°)
 * - 海拔：米 (m)
 * - ECI 位置：米 (m)
 * - ECI 速度：米/秒 (m/s)
 *
 * @references
 * - WGS84 椭球参数：NIMA TR8350.2
 * - 发射场坐标：各航天机构公开数据
 * - GMST 计算：Vallado, Fundamentals of Astrodynamics, Algorithm 15
 */

import { type StateVector, makeState, type Vec3 } from '@/lib/flight-dynamics/state';
import { GM_SI, EARTH_RADIUS_M } from '@/lib/flight-dynamics/integrator';

// ---------------------------------------------------------------------------
// WGS84 椭球参数
// ---------------------------------------------------------------------------

/** WGS84 长半轴 (m) */
const WGS84_A = 6_378_137.0;
/** WGS84 扁率倒数 */
const WGS84_INV_F = 298.257223563;
/** WGS84 扁率 */
const WGS84_F = 1 / WGS84_INV_F;
/** WGS84 第一偏心率平方 */
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
/** 地球自转角速度 (rad/s) */
const EARTH_OMEGA = 7.2921159e-5;

// ---------------------------------------------------------------------------
// 发射场数据类型
// ---------------------------------------------------------------------------

/** 发射场类型 */
export type LaunchSiteType = 'orbital' | 'suborbital' | 'test' | 'historic';

/** 发射场信息 */
export interface LaunchSite {
  /** 唯一标识符 */
  id: string;
  /** 发射场名称 */
  name: string;
  /** 所在国家 */
  country: string;
  /** 纬度 (°)，正北 */
  lat: number;
  /** 经度 (°)，正东 */
  lon: number;
  /** 海拔 (m) */
  altitude: number;
  /** 发射场类型 */
  type: LaunchSiteType;
  /** 可选描述 */
  desc?: string;
}

// ---------------------------------------------------------------------------
// 全球主要发射场数据
// ---------------------------------------------------------------------------

export const LAUNCH_SITES: LaunchSite[] = [
  {
    id: 'cape-canaveral',
    name: 'Cape Canaveral SLC-40',
    country: '美国',
    lat: 28.562106,
    lon: -80.577180,
    altitude: 3,
    type: 'orbital',
    desc: 'SpaceX Falcon 9 主力发射工位，卡纳维拉尔角太空军基地',
  },
  {
    id: 'baikonur',
    name: 'Baikonur Site 31/6',
    country: '哈萨克斯坦',
    lat: 45.9960,
    lon: 63.5640,
    altitude: 90,
    type: 'orbital',
    desc: 'Soyuz-2 现役发射工位，俄罗斯主力载人/货运发射台',
  },
  {
    id: 'kourou',
    name: 'Kourou ELA-4',
    country: '法国圭亚那',
    lat: 5.26258,
    lon: -52.79074,
    altitude: 12,
    type: 'orbital',
    desc: 'Ariane 6 发射工位，ESA 圭亚那航天中心',
  },
  {
    id: 'jiuquan',
    name: 'Jiuquan SLS-1 (921)',
    country: '中国',
    lat: 40.957778,
    lon: 100.291667,
    altitude: 1000,
    type: 'orbital',
    desc: '载人航天专用工位（长征二号F），酒泉卫星发射中心南部场区',
  },
  {
    id: 'wenchang',
    name: 'Wenchang LC-101',
    country: '中国',
    lat: 19.6144917,
    lon: 110.9511333,
    altitude: 20,
    type: 'orbital',
    desc: '长征五号发射工位，文昌航天发射场一号工位',
  },
  {
    id: 'xichang',
    name: 'Xichang LC-2',
    country: '中国',
    lat: 28.24550,
    lon: 102.02678,
    altitude: 1800,
    type: 'orbital',
    desc: '长征三号乙主力工位，西昌卫星发射中心二号工位',
  },
  {
    id: 'taiyuan',
    name: 'Taiyuan LC-9',
    country: '中国',
    lat: 38.8490,
    lon: 111.6080,
    altitude: 1500,
    type: 'orbital',
    desc: '长征四号/六号主力工位，太原卫星发射中心九号工位',
  },
  {
    id: 'tanegashima',
    name: 'Tanegashima LA-Y1',
    country: '日本',
    lat: 30.40222,
    lon: 130.97500,
    altitude: 30,
    type: 'orbital',
    desc: 'H-IIA 主力发射工位，JAXA 种子岛宇宙中心吉信射场',
  },
  {
    id: 'sriharikota',
    name: 'Sriharikota SLP',
    country: '印度',
    lat: 13.7199,
    lon: 80.2304,
    altitude: 5,
    type: 'orbital',
    desc: 'GSLV / LVM3 工位，ISRO 萨蒂什·达万航天中心第二发射台',
  },
  {
    id: 'vandenberg',
    name: 'Vandenberg SLC-4E',
    country: '美国',
    lat: 34.6320,
    lon: -120.6107,
    altitude: 100,
    type: 'orbital',
    desc: 'SpaceX 西海岸主力工位，极轨道/太阳同步轨道发射',
  },
  {
    id: 'plesetsk',
    name: 'Plesetsk Site 43/4',
    country: '俄罗斯',
    lat: 62.929,
    lon: 40.457,
    altitude: 180,
    type: 'orbital',
    desc: 'Soyuz-2 主力工位，俄罗斯军事/商业极轨发射',
  },
];

// ---------------------------------------------------------------------------
// 坐标转换：LLA → ECEF → ECI
// ---------------------------------------------------------------------------

/**
 * 大地坐标 (纬度/经度/海拔) → ECEF (地心地固坐标系)。
 *
 * 使用 WGS84 椭球模型。
 *
 * @param lat 纬度 (rad)
 * @param lon 经度 (rad)
 * @param alt 海拔 (m)
 * @returns   ECEF 位置 [x, y, z] (m)
 */
export function geodeticToECEF(
  lat: number,
  lon: number,
  alt: number,
): [number, number, number] {
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  // 卯酉圈曲率半径
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);

  const x = (N + alt) * cosLat * cosLon;
  const y = (N + alt) * cosLat * sinLon;
  const z = (N * (1 - WGS84_E2) + alt) * sinLat;

  return [x, y, z];
}

/**
 * ECEF → ECI（地心惯性系）。
 *
 * 绕 Z 轴旋转 GMST（格林尼治平恒星时）角度。
 *
 * @param ecef ECEF 位置 [x, y, z] (m)
 * @param gmst 格林尼治平恒星时 (rad)
 * @returns    ECI 位置 [x, y, z] (m)
 */
export function ecefToECI(
  ecef: Vec3,
  gmst: number,
): [number, number, number] {
  const cosG = Math.cos(gmst);
  const sinG = Math.sin(gmst);
  return [
    ecef[0] * cosG - ecef[1] * sinG,
    ecef[0] * sinG + ecef[1] * cosG,
    ecef[2],
  ];
}

/**
 * ECEF 速度 → ECI 速度。
 *
 * 在 ECEF 中静止的点，在 ECI 中因地球自转而具有速度：
 * v_eci = ω × r（绕 Z 轴旋转）
 *
 * @param ecefPos ECEF 位置 (m)
 * @param ecefVel ECEF 速度 (m/s)，发射前为 [0,0,0]
 * @param gmst    GMST (rad)
 * @returns       ECI 速度 (m/s)
 */
export function ecefVelToECI(
  ecefPos: Vec3,
  ecefVel: Vec3,
  gmst: number,
): [number, number, number] {
  // 先旋转速度
  const cosG = Math.cos(gmst);
  const sinG = Math.sin(gmst);
  const rotVel: [number, number, number] = [
    ecefVel[0] * cosG - ecefVel[1] * sinG,
    ecefVel[0] * sinG + ecefVel[1] * cosG,
    ecefVel[2],
  ];

  // 加上地球自转速度 ω × r
  // ω = [0, 0, ω_earth]
  // ω × r = [-ω·y, ω·x, 0]
  const rotPos: [number, number, number] = [
    ecefPos[0] * cosG - ecefPos[1] * sinG,
    ecefPos[0] * sinG + ecefPos[1] * cosG,
    ecefPos[2],
  ];

  return [
    rotVel[0] - EARTH_OMEGA * rotPos[1],
    rotVel[1] + EARTH_OMEGA * rotPos[0],
    rotVel[2],
  ];
}

/**
 * 计算格林尼治平恒星时 (GMST)。
 *
 * 基于 J2000.0 历元的简化模型，精度约 0.1°（足够 MVP）。
 *
 * @param date JS Date 对象
 * @returns    GMST (rad)
 */
export function computeGMST(date: Date): number {
  // J2000.0 = 2000-01-01 12:00:00 UT
  const j2000Epoch = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dtMs = date.getTime() - j2000Epoch;
  const dtDays = dtMs / 86_400_000;

  // 平恒星时（Vallado Algorithm 15）
  const T = dtDays / 36525.0; // 儒略世纪
  let gmstDeg = 280.46061837 + 360.98564736629 * dtDays + 0.000387933 * T * T - (T * T * T) / 38_710_000;

  // 归一化到 [0, 360)
  gmstDeg = ((gmstDeg % 360) + 360) % 360;

  return (gmstDeg * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// 发射场 → 初始状态矢量
// ---------------------------------------------------------------------------

/**
 * 将发射场坐标转换为 ECI 初始状态矢量。
 *
 * 给定发射场和时刻，计算该时刻发射场在 ECI 中的位置和速度。
 * 速度来自地球自转（发射前火箭与地面相对静止）。
 *
 * @param site 发射场
 * @param date 发射时刻
 * @returns    ECI 初始状态矢量
 */
export function launchSiteToInitialState(site: LaunchSite, date: Date): StateVector {
  const latRad = (site.lat * Math.PI) / 180;
  const lonRad = (site.lon * Math.PI) / 180;

  const ecefPos = geodeticToECEF(latRad, lonRad, site.altitude);
  const gmst = computeGMST(date);

  const eciPos = ecefToECI(ecefPos, gmst);
  const eciVel = ecefVelToECI(ecefPos, [0, 0, 0], gmst);

  const timeSeconds = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 1000;

  return makeState(eciPos, eciVel, timeSeconds);
}

// ---------------------------------------------------------------------------
// 查询辅助
// ---------------------------------------------------------------------------

/** 按 ID 查找发射场 */
export function getLaunchSiteById(id: string): LaunchSite | undefined {
  return LAUNCH_SITES.find((s) => s.id === id);
}

/** 按国家筛选发射场 */
export function getLaunchSitesByCountry(country: string): LaunchSite[] {
  return LAUNCH_SITES.filter((s) => s.country === country);
}

/**
 * 验证所有发射场坐标在有效范围内。
 */
export function validateLaunchSites(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const site of LAUNCH_SITES) {
    if (site.lat < -90 || site.lat > 90) {
      errors.push(`${site.name}: 纬度 ${site.lat} 越界 [-90, 90]`);
    }
    if (site.lon < -180 || site.lon > 180) {
      errors.push(`${site.name}: 经度 ${site.lon} 越界 [-180, 180]`);
    }
    if (site.altitude < -500 || site.altitude > 10000) {
      errors.push(`${site.name}: 海拔 ${site.altitude} 异常`);
    }
  }
  return { valid: errors.length === 0, errors };
}
