/**
 * @module mods/flight-tracking/types
 * @description 航班追踪 MOD 类型定义
 */

// ============ 航班数据类型 ============

/**
 * OpenSky API 返回的原始航班状态
 */
export interface FlightState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;       // m/s
  trueTrack: number | null;      // 度
  verticalRate: number | null;   // m/s
  squawk: string | null;
  spi: boolean;
  positionSource: number;
  geoAltitude: number | null;
}

/**
 * 航班完整信息
 */
export interface Flight {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  position: {
    longitude: number;
    latitude: number;
    altitude: number; // 米
  } | null;
  velocity: number | null;       // m/s
  trueTrack: number | null;      // 度
  verticalRate: number | null;   // m/s
  onGround: boolean;
  squawk: string | null;
  timePosition: number | null;
  lastContact: number;
}

/**
 * 航迹点
 */
export interface FlightPathPoint {
  longitude: number;
  latitude: number;
  altitude: number;
  timestamp: number;
}

/**
 * 航迹数据
 */
export interface FlightPath {
  icao24: string;
  points: FlightPathPoint[];
  type: 'history' | 'planned';
}

// ============ 筛选与排序 ============

/**
 * 航班筛选条件
 */
export interface FlightFilter {
  callsign?: string;
  altitudeRange?: [number, number];
  countries?: string[];
  onGroundOnly?: boolean;
  inAirOnly?: boolean;
}

/**
 * 航班排序条件
 */
export interface FlightSort {
  field: 'altitude' | 'velocity' | 'callsign' | 'lastContact';
  direction: 'asc' | 'desc';
}

// ============ 配置类型 ============

/**
 * 高度颜色映射
 */
export interface AltitudeColors {
  ground: string;
  low: string;    // < 3000m
  medium: string; // 3000-10000m
  high: string;   // > 10000m
}

/**
 * 地理边界框
 */
export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

/**
 * MOD 配置
 */
export interface FlightTrackingConfig {
  updateInterval: number;          // 更新间隔 ms，默认 10000
  boundingBox: BoundingBox | null; // null 表示全球
  openSkyUsername?: string;
  openSkyPassword?: string;
  aircraftStyle: 'icon' | 'model' | 'auto';
  showFlightPath: boolean;
  showLabels: boolean;
  maxAircraft: number;
  altitudeColors: AltitudeColors;
  enableClustering: boolean;
  clusterThreshold: number;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: FlightTrackingConfig = {
  updateInterval: 10000,
  boundingBox: null,
  aircraftStyle: 'auto',
  showFlightPath: true,
  showLabels: false,
  maxAircraft: 10000,
  altitudeColors: {
    ground: '#808080',
    low: '#00cc44',
    medium: '#ffcc00',
    high: '#ff4444',
  },
  enableClustering: true,
  clusterThreshold: 5000,
};

// ============ 状态类型 ============

/**
 * 航班统计
 */
export interface FlightStats {
  total: number;
  inAir: number;
  onGround: number;
}

/**
 * 数据获取状态
 */
export interface FetchStatus {
  loading: boolean;
  error: string | null;
  lastUpdate: number | null;
  retryCount: number;
}

// ============ Worker 消息类型 ============

export type WorkerMessageType = 'parse-states' | 'filter-flights';

export interface WorkerRequest {
  type: WorkerMessageType;
  id: string;
  payload: unknown;
}

export interface WorkerResponse {
  type: WorkerMessageType;
  id: string;
  result: unknown;
  error?: string;
}

export interface ParseStatesPayload {
  states: unknown[][];
}

export interface ParseStatesResult {
  flights: FlightState[];
  stats: { total: number; valid: number; invalid: number };
}
