/**
 * @module mod-manager
 * @description MOD管理器主入口
 * 
 * MOD管理器为cxic多尺度宇宙可视化平台提供模块化、可插拔的架构。
 */

// 类型导出
export type {
  SemVer,
  VersionConstraint,
  ModDependency,
  ModCapability,
  ModManifest,
  ManifestValidationResult,
  ModState,
  ModStateTransition,
  ModLifecycleHooks,
  ModInstance,
  ModContext,
  ModLogger,
  TimeAPI,
  ViewOffset,
  CameraAPI,
  CameraState,
  CelestialBodyData,
  OrbitalElementsData,
  CelestialAPI,
  SatelliteData,
  SatelliteAPI,
  RendererFactory,
  CesiumLayerOptions,
  RenderAPI,
  DependencyNode,
  DependencyResolution,
  PerformanceMetric,
  ModErrorType,
} from './types';

// 类型重命名导出（避免与错误类冲突）
export type {
  ManifestValidationError as ManifestValidationErrorType,
} from './types';

// 常量导出
export {
  STORAGE_KEYS,
  API_VERSION,
  TIME_SPEED_BOUNDS,
  ZOOM_BOUNDS,
  ERROR_THRESHOLD,
  SYSTEM_EVENTS,
  STORAGE_VERSION,
} from './types';

// 错误类型导出
export {
  ModError,
  CircularDependencyError,
  VersionMismatchError,
  MissingDependencyError,
  ManifestValidationError,
  LifecycleError,
  RenderError,
  DuplicateIdError,
  ApiError,
} from './error';

// 工具函数导出
export {
  parseSemVer,
  semVerToString,
  compareVersions,
  isVersionCompatible,
  getApiVersion,
  getApiVersionString,
  hasApiFeature,
  getAvailableFeatures,
  validateManifest,
  isValidManifest,
} from './utils';

// 核心模块导出
export {
  ModRegistry,
  getRegistry,
  resetRegistry,
  DependencyResolver,
  getDependencyResolver,
  resetDependencyResolver,
  EventBus,
  getEventBus,
  resetEventBus,
  ModLifecycle,
  getModLifecycle,
  resetModLifecycle,
} from './core';

// API模块导出
export {
  MOD_API_VERSION,
  TimeAPIImpl,
  getTimeAPI,
  resetTimeAPI,
  CameraAPIImpl,
  getCameraAPI,
  resetCameraAPI,
  CelestialAPIImpl,
  getCelestialAPI,
  resetCelestialAPI,
  SatelliteAPIImpl,
  getSatelliteAPI,
  resetSatelliteAPI,
  RenderAPIImpl,
  getRenderAPI,
  resetRenderAPI,
} from './api';

// 持久化模块导出
export type { StorageAdapter } from './persistence';
export {
  LocalStorageAdapter,
  getStorageAdapter,
  resetStorageAdapter,
  MigrationManager,
  getMigrationManager,
  resetMigrationManager,
} from './persistence';

// 状态管理导出
export {
  useModStore,
  getModState,
  getModConfig,
  getEnabledModIds,
  getRegisteredModIds,
} from './store';

export type { ModStateEntry, ModStoreState } from './store';

// 性能监控导出
export {
  PerformanceMonitor,
  getPerformanceMonitor,
  resetPerformanceMonitor,
} from './performance';

// 初始化函数导出
export {
  initModManager,
  registerMod,
  autoEnableMods,
  unregisterMod,
  getRegisteredMods,
} from './init';