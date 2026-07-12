/**
 * 全球货运与贸易路线追踪 - 类型定义
 *
 * 本模块定义了全球交通追踪系统所需的核心类型，包括：
 * - 交通数据源配置（TrafficDataSource）
 * - 船舶/飞行器实时位置（VesselPosition, FlightPosition）
 * - 贸易航线与港口/机场基础数据（TradeRoute, Port）
 * - 数据源运行状态（DataSourceState）
 * - 全局配置参数（GlobalTrafficConfig）
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

/**
 * 交通数据源配置
 *
 * 描述一个外部交通数据 API 的接入信息，包括认证、更新频率和覆盖范围。
 */
export interface TrafficDataSource {
  /** 数据源唯一标识 */
  id: DataSourceId;
  /** 数据源英文名称 */
  name: string;
  /** 数据源中文名称 */
  nameZh: string;
  /** 数据类别（'vessel' | 'flight' | 'trade_route' | 'port' | 'airport' | 'multi'） */
  category: TrafficCategory | 'multi';
  /** 英文描述 */
  description: string;
  /** 中文描述 */
  descriptionZh: string;
  /** 官网 URL */
  url: string;
  /** API 接入 URL */
  apiUrl: string;
  /** 数据更新间隔（秒） */
  updateInterval: number;
  /** 是否需要 API Key */
  requiresApiKey: boolean;
  /** API Key 获取地址（可选） */
  apiKeyUrl?: string;
  /** 是否免费 */
  free: boolean;
  /** 覆盖范围：全球或区域 */
  coverage: 'global' | 'regional';
  /** 区域名称（当 coverage 为 regional 时） */
  region?: string;
  /** 主题色（十六进制） */
  color: string;
  /** 图标标识 */
  icon: string;
  /** 数据格式 */
  dataFormat: 'json' | 'csv' | 'geojson' | 'websocket' | 'static';
}

/**
 * 船舶实时位置
 *
 * 通过 AIS 数据源获取的船舶位置、航速及基本属性快照。
 */
export interface VesselPosition {
  /** MMSI（海上移动通信业务标识） */
  mmsi: string;
  /** 船名 */
  name: string;
  /** 纬度 */
  lat: number;
  /** 经度 */
  lon: number;
  /** 航速（节） */
  speed: number;
  /** 船艏向（度） */
  heading: number;
  /** 对地航向（度） */
  course: number;
  /** 船舶类型 */
  vesselType: VesselType;
  /** 船旗国代码（可选） */
  flag?: string;
  /** 目的港（可选） */
  destination?: string;
  /** 预计到达时间（可选） */
  eta?: string;
  /** 吃水深度（米，可选） */
  draught?: number;
  /** 船长（米，可选） */
  length?: number;
  /** 数据时间戳 */
  timestamp: number;
  /** 来源数据源 ID */
  sourceId: DataSourceId;
}

/**
 * 飞行器实时位置
 *
 * 通过 ADS-B 等数据源获取的航班位置、高度和航向快照。
 */
export interface FlightPosition {
  /** ICAO 24 位地址码 */
  icao24: string;
  /** 航班呼号 */
  callsign: string;
  /** 纬度 */
  lat: number;
  /** 经度 */
  lon: number;
  /** 海拔高度（米） */
  altitude: number;
  /** 地速（米/秒） */
  velocity: number;
  /** 航向（度） */
  heading: number;
  /** 垂直速率（米/秒，正为爬升） */
  verticalRate: number;
  /** 起飞机场 IATA 代码（可选） */
  origin?: string;
  /** 目的机场 IATA 代码（可选） */
  destination?: string;
  /** 航空公司（可选） */
  airline?: string;
  /** 数据时间戳 */
  timestamp: number;
  /** 来源数据源 ID */
  sourceId: DataSourceId;
}

/**
 * 全球贸易航线
 *
 * 描述一条海运或空运航线的起点、终点和中间航点。
 */
export interface TradeRoute {
  /** 航线唯一标识 */
  id: string;
  /** 英文名称 */
  name: string;
  /** 中文名称 */
  nameZh: string;
  /** 航线类型：sea（海运）| air（空运） */
  type: 'sea' | 'air';
  /** 航线航点列表，每项包含经纬度 */
  waypoints: Array<{ lat: number; lon: number }>;
  /** 年运输量（TEU 或吨，可选） */
  volume?: number;
  /** 主题色（十六进制） */
  color: string;
  /** 航线描述（可选） */
  description?: string;
}

/**
 * 港口或机场基础设施
 *
 * 描述一个海港或机场的基本信息、位置和规模。
 */
export interface Port {
  /** 港口/机场唯一标识 */
  id: string;
  /** 名称 */
  name: string;
  /** 所在国家代码（ISO 3166-1 alpha-2） */
  country: string;
  /** 纬度 */
  lat: number;
  /** 经度 */
  lon: number;
  /** 类型：sea（海港）| air（机场） */
  type: 'sea' | 'air';
  /** 规模：small | medium | large | mega */
  size: 'small' | 'medium' | 'large' | 'mega';
  /** 年吞吐量（TEU，仅海港，可选） */
  annualTEU?: number;
  /** IATA 代码（仅机场，可选） */
  iata?: string;
  /** UN/LOCODE（仅海港，可选） */
  locode?: string;
}

/**
 * 数据源运行状态
 *
 * 跟踪某个数据源的加载、错误和最新数据数量等运行时状态。
 */
export interface DataSourceState {
  /** 数据源 ID */
  id: DataSourceId;
  /** 是否启用 */
  enabled: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息（无错误时为 null） */
  error: string | null;
  /** 最后更新时间戳（毫秒，未更新时为 null） */
  lastUpdated: number | null;
  /** 当前数据条目数 */
  count: number;
}

/**
 * 全球交通模块全局配置
 *
 * 控制数据显示开关、最大数量、动画行为和视觉效果。
 */
export interface GlobalTrafficConfig {
  /** 启用的数据源 ID 列表 */
  enabledSources: DataSourceId[];
  /** 是否显示船舶 */
  showVessels: boolean;
  /** 是否显示飞行器 */
  showFlights: boolean;
  /** 是否显示贸易航线 */
  showTradeRoutes: boolean;
  /** 是否显示港口/机场 */
  showPorts: boolean;
  /** 显示的船舶类型筛选 */
  vesselTypes: VesselType[];
  /** 最大船舶显示数量 */
  maxVessels: number;
  /** 最大飞行器显示数量 */
  maxFlights: number;
  /** 是否启用平滑移动动画 */
  animateMovement: boolean;
  /** 运动轨迹尾迹长度 */
  trailLength: number;
  /** 全局透明度 (0-1) */
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
