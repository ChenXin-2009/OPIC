/**
 * 全球货运与贸易路线追踪 - 类型定义
 */

export type TrafficCategory = 'vessel' | 'flight' | 'trade_route' | 'port' | 'airport';

export type VesselType =
  | 'cargo' | 'tanker' | 'container' | 'bulk_carrier'
  | 'passenger' | 'fishing' | 'military' | 'other';

export type DataSourceId =
  | 'aisstream'
  | 'marinetraffic_free'
  | 'vesselfinder_free'
  | 'opensky'
  | 'adsbexchange'
  | 'flightradar24_free'
  | 'ourairports'
  | 'worldports'
  | 'ihs_sea_routes'
  | 'natural_earth_routes'
  | 'cargo_tracker_demo';

/** Configuration for a traffic data source API. */
export interface TrafficDataSource {
  id: DataSourceId;
  name: string;
  nameZh: string;
  category: TrafficCategory | 'multi';
  description: string;
  descriptionZh: string;
  url: string;
  apiUrl: string;
  updateInterval: number; // seconds
  requiresApiKey: boolean;
  apiKeyUrl?: string;
  free: boolean;
  coverage: 'global' | 'regional';
  region?: string;
  color: string;
  icon: string;
  dataFormat: 'json' | 'csv' | 'geojson' | 'websocket' | 'static';
}

export interface VesselPosition {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  speed: number;       // knots
  heading: number;     // degrees
  course: number;      // degrees
  vesselType: VesselType;
  flag?: string;       // country code
  destination?: string;
  eta?: string;
  draught?: number;
  length?: number;
  timestamp: number;
  sourceId: DataSourceId;
}

export interface FlightPosition {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;    // meters
  velocity: number;    // m/s
  heading: number;     // degrees
  verticalRate: number;
  origin?: string;     // IATA airport code
  destination?: string;
  airline?: string;
  timestamp: number;
  sourceId: DataSourceId;
}

/** A maritime trade route with origin, destination, and waypoints. */
export interface TradeRoute {
  id: string;
  name: string;
  nameZh: string;
  type: 'sea' | 'air';
  waypoints: Array<{ lat: number; lon: number }>;
  volume?: number;     // annual TEU or tons
  color: string;
  description?: string;
}

export interface Port {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  type: 'sea' | 'air';
  size: 'small' | 'medium' | 'large' | 'mega';
  annualTEU?: number;
  iata?: string;
  locode?: string;
}

export interface DataSourceState {
  id: DataSourceId;
  enabled: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  count: number;
}

export interface GlobalTrafficConfig {
  enabledSources: DataSourceId[];
  showVessels: boolean;
  showFlights: boolean;
  showTradeRoutes: boolean;
  showPorts: boolean;
  vesselTypes: VesselType[];
  maxVessels: number;
  maxFlights: number;
  animateMovement: boolean;
  trailLength: number;
  opacity: number;
}

export const DEFAULT_CONFIG: GlobalTrafficConfig = {
  enabledSources: ['opensky', 'natural_earth_routes', 'worldports'],
  showVessels: true,
  showFlights: true,
  showTradeRoutes: true,
  showPorts: true,
  vesselTypes: ['cargo', 'tanker', 'container', 'bulk_carrier'],
  maxVessels: 500,
  maxFlights: 1000,
  animateMovement: true,
  trailLength: 5,
  opacity: 0.8,
};
