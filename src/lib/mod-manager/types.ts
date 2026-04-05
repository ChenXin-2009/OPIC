/**
 * @module mod-manager/types
 * @description MOD管理器核心类型定义
 * 
 * 本模块定义MOD管理器系统的所有核心接口和类型。
 */

// ============ 版本相关类型 ============

/**
 * 语义化版本
 */
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/**
 * 版本约束（支持范围）
 */
export interface VersionConstraint {
  min?: string;    // 最小版本（包含）
  max?: string;    // 最大版本（不包含）
  exact?: string;  // 精确版本
}

// ============ MOD清单类型 ============

/**
 * MOD依赖声明
 */
export interface ModDependency {
  id: string;                    // 依赖MOD的ID
  version?: VersionConstraint;   // 版本约束
  optional?: boolean;            // 是否可选
}

/**
 * MOD能力声明
 */
export interface ModCapability {
  name: string;      // 能力名称
  required: boolean; // 是否必需
}

/**
 * MOD清单（完整定义）
 */
export interface ModManifest {
  // 必需字段
  id: string;              // 唯一标识符（kebab-case）
  version: string;         // 语义化版本（major.minor.patch）
  name: string;            // 显示名称
  entryPoint: string;      // 入口点函数名

  // 可选字段
  description?: string;    // 描述
  author?: string;         // 作者
  homepage?: string;       // 主页URL
  repository?: string;     // 代码仓库URL
  license?: string;        // 许可证

  // 依赖和能力
  dependencies?: ModDependency[];  // MOD依赖
  apiVersion?: string;     // 所需API版本
  capabilities?: ModCapability[]; // 所需系统能力

  // UI配置
  hasConfig?: boolean;     // 是否有配置UI
  configComponent?: string; // 配置组件名
  icon?: string;           // 图标URL或标识符
  
  // 默认启用
  defaultEnabled?: boolean; // 是否默认启用

  // 国际化（可选中文覆盖）
  nameZh?: string;         // 中文名称
  descriptionZh?: string;  // 中文描述
}

/**
 * MOD清单验证结果
 */
export interface ManifestValidationResult {
  valid: boolean;
  errors: ManifestValidationError[];
}

/**
 * 清单验证错误
 */
export interface ManifestValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// ============ MOD状态类型 ============

/**
 * MOD状态枚举
 */
export type ModState = 'registered' | 'loaded' | 'enabled' | 'disabled' | 'unloaded';

/**
 * MOD状态转换事件
 */
export interface ModStateTransition {
  modId: string;
  fromState: ModState;
  toState: ModState;
  timestamp: Date;
  error?: Error;
}

// ============ MOD生命周期类型 ============

/**
 * MOD生命周期钩子
 */
export interface ModLifecycleHooks {
  onLoad?: (context: ModContext) => void | Promise<void>;
  onEnable?: (context: ModContext) => void | Promise<void>;
  onDisable?: (context: ModContext) => void | Promise<void>;
  onUnload?: (context: ModContext) => void | Promise<void>;
  onError?: (error: Error, context: ModContext) => void;
}

/**
 * MOD实例（运行时）
 */
export interface ModInstance {
  manifest: ModManifest;
  state: ModState;
  context: ModContext | null;
  errorCount: number;
  lastError: Error | null;
  loadTime: number;
  renderTime: number;
  lifecycleHooks?: ModLifecycleHooks;
}

// ============ MOD上下文类型 ============

/**
 * MOD上下文（提供给MOD的运行时环境）
 */
export interface ModContext {
  // MOD元数据
  id: string;
  manifest: ModManifest;

  // API访问
  time: TimeAPI;
  camera: CameraAPI;
  celestial: CelestialAPI;
  satellite: SatelliteAPI;
  render: RenderAPI;

  // 状态管理
  config: Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  getState: () => Record<string, unknown>;
  subscribe: (listener: (state: Record<string, unknown>) => void) => () => void;

  // 事件系统
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (data: unknown) => void) => () => void;
  off: (event: string, handler: (data: unknown) => void) => void;

  // 日志
  logger: ModLogger;

  // 工具
  setTimeout: (callback: () => void, ms: number) => number;
  setInterval: (callback: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  clearInterval: (id: number) => void;
}

/**
 * MOD日志器
 */
export interface ModLogger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// ============ API类型 ============

/**
 * 时间API接口
 */
export interface TimeAPI {
  // 只读属性
  readonly currentTime: Date;
  readonly isPlaying: boolean;
  readonly timeSpeed: number; // 天/秒
  readonly playDirection: 'forward' | 'backward';

  // 控制方法
  setCurrentTime(date: Date): void;
  togglePlayPause(): void;
  setTimeSpeed(speed: number): void;
  setPlayDirection(direction: 'forward' | 'backward'): void;

  // 事件订阅
  onTimeChange(callback: (time: Date) => void): () => void;
}

/**
 * 视图偏移
 */
export interface ViewOffset {
  x: number; // AU
  y: number; // AU
}

/**
 * 相机API接口
 */
export interface CameraAPI {
  // 只读属性
  readonly cameraDistance: number; // AU
  readonly viewOffset: ViewOffset;
  readonly zoom: number;

  // 控制方法
  setCameraDistance(distance: number): void;
  setViewOffset(offset: ViewOffset): void;
  setZoom(zoom: number): void;
  centerOnPlanet(name: string): boolean;

  // 事件订阅
  onCameraChange(callback: (state: CameraState) => void): () => void;
}

/**
 * 相机状态
 */
export interface CameraState {
  distance: number;
  offset: ViewOffset;
  zoom: number;
  focusedPlanet: string | null;
}

/**
 * 天体数据
 */
export interface CelestialBodyData {
  name: string;
  x: number; // AU
  y: number; // AU
  z: number; // AU
  r: number; // 日心距离 AU
  radius: number; // 渲染半径 AU
  color: string;
  isSun?: boolean;
  parent?: string;
  isSatellite?: boolean;
}

/**
 * 轨道元素
 */
export interface OrbitalElementsData {
  a: number;  // 半长轴 (AU)
  e: number;  // 离心率
  i: number;  // 轨道倾角 (弧度)
  L: number;  // 平黄经 (弧度)
  w_bar: number;  // 近日点黄经 (弧度)
  O: number; // 升交点黄经 (弧度)
}

/**
 * 天体API接口
 */
export interface CelestialAPI {
  // 数据访问
  getCelestialBodies(): CelestialBodyData[];
  getOrbitalElements(bodyName: string): OrbitalElementsData | null;

  // 计算方法
  calculatePosition(elements: OrbitalElementsData, jd: number): { x: number; y: number; z: number; r: number };

  // 常量访问
  readonly ORBITAL_ELEMENTS: Record<string, OrbitalElementsData>;
  readonly CELESTIAL_BODIES: Record<string, unknown>;

  // 时间转换
  dateToJulianDay(date: Date): number;
  julianDayToDate(jd: number): Date;

  // 事件订阅
  onBodiesUpdate(callback: (bodies: CelestialBodyData[]) => void): () => void;
}

/**
 * 卫星数据
 */
export interface SatelliteData {
  noradId: number;
  name: string;
  tle?: {
    line1: string;
    line2: string;
  };
  position?: { x: number; y: number; z: number };
}

/**
 * 卫星API接口
 */
export interface SatelliteAPI {
  // 只读属性
  readonly satellites: SatelliteData[];
  readonly visibleSatellites: SatelliteData[];

  // 数据加载
  fetchSatellites(source?: string): Promise<void>;

  // 选择和计算
  selectSatellite(noradId: number): SatelliteData | null;
  calculateSatellitePosition(noradId: number, time: Date): { x: number; y: number; z: number } | null;

  // 事件订阅
  onSatellitesUpdate(callback: (satellites: SatelliteData[]) => void): () => void;
}

/**
 * 渲染器工厂函数
 */
export type RendererFactory = (context: ModContext) => unknown;

/**
 * Cesium图层选项
 */
export interface CesiumLayerOptions {
  id: string;
  type: 'imagery' | 'terrain';
  url: string;
  options?: Record<string, unknown>;
}

/**
 * 渲染API接口
 */
export interface RenderAPI {
  // 渲染器注册
  registerRenderer(id: string, factory: RendererFactory): void;
  unregisterRenderer(id: string): void;

  // Three.js访问
  getScene(): unknown;
  getCamera(): unknown;
  getRenderer(): unknown;

  // Cesium集成
  registerCesiumLayer(options: CesiumLayerOptions): void;
  unregisterCesiumLayer(id: string): void;

  // 渲染回调
  onBeforeRender(callback: () => void): () => void;
  onAfterRender(callback: () => void): () => void;
}

// ============ 依赖解析类型 ============

/**
 * 依赖图节点
 */
export interface DependencyNode {
  modId: string;
  dependencies: Set<string>;
  dependents: Set<string>; // 反向依赖
}

/**
 * 依赖解析结果
 */
export interface DependencyResolution {
  success: boolean;
  loadOrder: string[]; // 拓扑排序后的加载顺序
  cycles: string[][];  // 检测到的循环
  missing: string[];   // 缺失的依赖
}

// ============ 持久化类型 ============

/**
 * localStorage键名
 */
export const STORAGE_KEYS = {
  ENABLED_MODS: 'cxic:mod-manager:enabled-mods',
  MOD_CONFIGS: 'cxic:mod-manager:configs',
  MOD_STATES: 'cxic:mod-manager:states',
} as const;

/**
 * 已启用MOD列表存储结构
 */
export interface EnabledModsStorage {
  version: number;
  modIds: string[];
  timestamp: string; // ISO日期
}

/**
 * MOD配置存储结构
 */
export interface ModConfigStorage {
  version: number;
  configs: Record<string, Record<string, unknown>>;
  timestamp: string;
}

/**
 * MOD状态存储结构
 */
export interface ModStateStorage {
  version: number;
  states: Record<string, Record<string, unknown>>;
  timestamp: string;
}

// ============ 性能监控类型 ============

/**
 * 性能指标
 */
export interface PerformanceMetric {
  modId: string;
  type: 'init' | 'render';
  duration: number;
  timestamp: Date;
  threshold: number;
}

// ============ 错误类型 ============

/**
 * MOD错误类型枚举
 */
export type ModErrorType =
  | 'validation_error'      // 清单验证失败
  | 'duplicate_id'          // 重复ID
  | 'circular_dependency'   // 循环依赖
  | 'missing_dependency'    // 缺失依赖
  | 'version_mismatch'      // 版本不匹配
  | 'lifecycle_error'       // 生命周期钩子错误
  | 'render_error'          // 渲染错误
  | 'api_error';            // API调用错误

// ============ 常量 ============

/**
 * API版本
 */
export const API_VERSION: SemVer = {
  major: 1,
  minor: 0,
  patch: 0,
};

/**
 * 时间速度边界
 */
export const TIME_SPEED_BOUNDS = {
  MIN: 1 / 86400,  // 实时：每秒前进1秒
  MAX: 1095,       // 最大：每秒前进3年
};

/**
 * 缩放边界
 */
export const ZOOM_BOUNDS = {
  MIN: 10,
  MAX: 200,
};

/**
 * 错误阈值
 */
export const ERROR_THRESHOLD = 5;

/**
 * 标准系统事件
 */
export const SYSTEM_EVENTS = {
  TIME_CHANGE: 'time:change',
  CAMERA_CHANGE: 'camera:change',
  BODY_SELECT: 'body:select',
  SATELLITE_SELECT: 'satellite:select',
} as const;

/**
 * 存储版本
 */
export const STORAGE_VERSION = 1;