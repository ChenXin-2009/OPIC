/**
 * 商业航天发射追踪 - 类型定义
 */

export type LaunchStatus =
  | 'go'           // 确认发射
  | 'tbd'          // 待定
  | 'success'      // 发射成功
  | 'failure'      // 发射失败
  | 'partial_failure' // 部分失败
  | 'hold'         // 暂停
  | 'in_flight'    // 飞行中
  | 'go_for_launch'; // 准备发射

export type OrbitType =
  | 'LEO'   // 低地球轨道
  | 'MEO'   // 中地球轨道
  | 'GEO'   // 地球静止轨道
  | 'GTO'   // 地球同步转移轨道
  | 'SSO'   // 太阳同步轨道
  | 'ISS'   // 国际空间站
  | 'TLI'   // 月球转移轨道
  | 'HEO'   // 高椭圆轨道
  | 'Sub'   // 亚轨道
  | 'Other';

export type DataSourceId =
  | 'launch_library2'
  | 'spacex_api'
  | 'rocketlaunch_live'
  | 'thespacedevs'
  | 'nextspaceflight'
  | 'all'; // 整合全部

export interface DataSource {
  id: DataSourceId;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  url: string;
  apiUrl: string;
  updateInterval: number; // seconds
  requiresApiKey: boolean;
  free: boolean;
  coverage: 'global' | 'partial';
  color: string;
  icon: string;
}

export interface LaunchVehicle {
  name: string;
  family?: string;
  variant?: string;
  reusable?: boolean;
  manufacturer?: string;
  manufacturerZh?: string;
  country?: string;
  liftoffThrust?: number; // kN
  payloadLEO?: number;    // kg
  payloadGTO?: number;    // kg
  stages?: number;
  imageUrl?: string;
}

/** A physical launch site/pad location. */
export interface LaunchSite {
  name: string;
  nameZh?: string;
  location: string;
  locationZh?: string;
  country: string;
  lat: number;
  lon: number;
  pad?: string;
}

export interface LaunchMission {
  name: string;
  nameZh?: string;
  description?: string;
  descriptionZh?: string;
  type?: string;
  orbit?: OrbitType;
  orbitAltitude?: number;   // km
  orbitInclination?: number; // degrees
  customer?: string;
  customerZh?: string;
  payload?: string;
  payloadMass?: number; // kg
}

/** A milestone event during a launch countdown or mission. */
export interface LaunchEvent {
  id: string;
  sourceId: DataSourceId;
  name: string;
  nameZh?: string;
  status: LaunchStatus;
  net: string;           // NET (No Earlier Than) - ISO string
  windowStart?: string;  // ISO string
  windowEnd?: string;    // ISO string
  vehicle: LaunchVehicle;
  site: LaunchSite;
  mission?: LaunchMission;
  probability?: number;  // 0-100
  holdReason?: string;
  failReason?: string;
  url?: string;
  imageUrl?: string;
  livestreamUrl?: string;
  // 轨道参数
  orbitParams?: {
    apogee?: number;    // km
    perigee?: number;   // km
    inclination?: number; // degrees
    period?: number;    // minutes
    raan?: number;      // degrees
  };
  // 任务进度（飞行中）
  missionPhase?: string;
  missionElapsed?: number; // seconds since launch
}

export interface DataSourceState {
  id: DataSourceId;
  enabled: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  launches: LaunchEvent[];
}

export const ORBIT_LABELS: Record<OrbitType, { zh: string; en: string; color: string }> = {
  LEO:   { zh: '低地球轨道',     en: 'LEO',   color: '#4488ff' },
  MEO:   { zh: '中地球轨道',     en: 'MEO',   color: '#44aaff' },
  GEO:   { zh: '地球静止轨道',   en: 'GEO',   color: '#ff8844' },
  GTO:   { zh: '同步转移轨道',   en: 'GTO',   color: '#ffaa44' },
  SSO:   { zh: '太阳同步轨道',   en: 'SSO',   color: '#44ffaa' },
  ISS:   { zh: '国际空间站',     en: 'ISS',   color: '#ffffff' },
  TLI:   { zh: '月球转移轨道',   en: 'TLI',   color: '#aaaaff' },
  HEO:   { zh: '高椭圆轨道',     en: 'HEO',   color: '#ff44aa' },
  Sub:   { zh: '亚轨道',         en: 'Sub',   color: '#888888' },
  Other: { zh: '其他轨道',       en: 'Other', color: '#666666' },
};

export const STATUS_LABELS: Record<LaunchStatus, { zh: string; en: string; color: string; icon: string }> = {
  go:             { zh: '确认发射', en: 'Go',            color: '#44ff44', icon: '✅' },
  go_for_launch:  { zh: '准备发射', en: 'Go for Launch', color: '#88ff44', icon: '🚀' },
  in_flight:      { zh: '飞行中',   en: 'In Flight',     color: '#44aaff', icon: '🛸' },
  success:        { zh: '发射成功', en: 'Success',        color: '#44ff88', icon: '🎉' },
  failure:        { zh: '发射失败', en: 'Failure',        color: '#ff4444', icon: '❌' },
  partial_failure:{ zh: '部分失败', en: 'Partial Fail',   color: '#ff8844', icon: '⚠️' },
  hold:           { zh: '暂停',     en: 'Hold',           color: '#ffaa00', icon: '⏸️' },
  tbd:            { zh: '待定',     en: 'TBD',            color: '#888888', icon: '❓' },
};
