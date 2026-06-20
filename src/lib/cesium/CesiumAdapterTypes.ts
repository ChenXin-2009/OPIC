/**
 * CesiumAdapter 类型定义
 *
 * 包含配置接口和错误类层次，无运行时依赖。
 */

function withDefault<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value;
}

function clampDefault(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, withDefault(value, fallback)));
}

/**
 * Cesium 适配器配置接口
 *
 * 传入 CesiumAdapter 构造函数，控制 Cesium Viewer 的初始化行为与渲染参数。
 */
export interface CesiumAdapterConfig {
  /** Cesium 容器 div 的 id，由适配器自动创建并挂载到 DOM */
  cesiumContainerId: string;
  /**
   * 挂载容器（默认 document.body）
   * 建议传入 Three.js canvas 的父容器，确保两者处于同一 stacking context，
   * 使 z-index 层叠关系正确生效
   */
  parentElement?: HTMLElement;
  /** 初始影像图层提供者；若不传则使用 Cesium 默认图源 */
  imageryProvider?: Cesium.ImageryProvider;
  /** 地形提供者；若不传则使用平坦地形（EllipsoidTerrainProvider） */
  terrainProvider?: Cesium.TerrainProvider;
  /** Enable real terrain elevation for the globe. */
  enableTerrain?: boolean;
  /** Default terrain source to load when terrainProvider is not supplied. */
  terrainProviderSource?: 'arcgis-world-elevation' | 'cesium-world-terrain' | 'none';
  /** Optional ArcGIS token for the WorldElevation3D terrain service. */
  esriTerrainToken?: string;
  /** Request terrain normals where supported for better oblique lighting. */
  requestTerrainVertexNormals?: boolean;
  /** Request terrain water masks where supported. */
  requestTerrainWaterMask?: boolean;
  /** Vertical terrain exaggeration. 1.0 keeps real-world height. */
  terrainExaggeration?: number;
  /** Reference height for vertical terrain exaggeration. */
  terrainExaggerationRelativeHeight?: number;
  /** Ellipsoid used by Cesium's globe. Defaults to WGS84 Earth. */
  ellipsoid?: 'wgs84' | 'moon' | { x: number; y: number; z: number };
  /** Mean body radius in meters, used for camera clipping and altitude logs. */
  bodyRadiusMeters?: number;
  /** Expose this viewer as window.__cesiumViewer for earth-specific MOD integrations. */
  exposeViewerToWindow?: boolean;

  /** 3D Tiles 模式：用 Cesium 3D Tiles 瓦片集渲染天体表面，替代 globe */
  enableTileset?: boolean;
  /** Cesium ion Asset ID，用于通过 Cesium3DTileset.fromIonAssetId 加载（月球 = 2684829） */
  tilesetIonAssetId?: number;
  /** 3D Tiles 最大屏幕空间误差，控制 LOD 精度（默认 16，值越小越精细） */
  tilesetMaximumScreenSpaceError?: number;
  /** Cesium ion Access Token（显式传入，优先级高于环境变量） */
  ionAccessToken?: string;

  /** URL for a single-tile fallback imagery layer placed at the bottom of the stack. */
  fallbackImageUrl?: string;

  /**
   * Canvas 分辨率缩放系数（默认 1.0，范围 0.1 ~ 2.0）
   * 小于 1.0 可降低渲染分辨率以提升性能；大于 1.0 可提升清晰度（高 DPI 屏幕）
   */
  canvasResolutionScale?: number;
  /**
   * 瓦片 LOD 误差阈值（默认 2，单位：屏幕像素）
   * 值越小，加载的瓦片精度越高，但性能开销越大
   */
  maximumScreenSpaceError?: number;
  /**
   * 内存中最大缓存瓦片数量（默认 1000）
   * 超出后 Cesium 会自动淘汰最久未使用的瓦片
   */
  maximumNumberOfLoadedTiles?: number;

  /** 启用海拔自适应 LOD（默认 true）
   *  靠近地表时自动降低地形精度以维持流畅帧率 */
  enableAdaptiveLOD?: boolean;
  /** 自适应 LOD 在最低海拔时的 screenSpaceError（默认 16，值越大精度越低） */
  adaptiveLODMinQuality?: number;
  /** 自适应 LOD 在最高海拔时的 screenSpaceError（默认 2，值越小精度越高） */
  adaptiveLODMaxQuality?: number;
  /** Cesium 渲染目标帧率（默认 30fps），0 表示不限制 */
  targetCesiumFrameRate?: number;

  /**
   * 深度合成策略（默认 'render-order'）
   * - 'render-order'：按渲染顺序决定前后关系（Cesium 在下，Three.js 在上）
   * - 'satellite-always-front'：卫星模型始终渲染在地球之上
   */
  depthCompositingStrategy?: 'render-order' | 'satellite-always-front';

  /** 性能监控对象（可选），用于记录每帧渲染耗时等指标 */
  performanceMonitor?: any;
}

/**
 * Cesium 初始化错误
 */
export class CesiumInitializationError extends Error {
  override cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'CesiumInitializationError';
    this.cause = cause;
  }
}

/**
 * Cesium 渲染错误
 */
export class CesiumRenderError extends Error {
  override cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'CesiumRenderError';
    this.cause = cause;
  }
}

/**
 * WebGL Context Lost 错误
 */
export class WebGLContextLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebGLContextLostError';
  }
}

export { withDefault, clampDefault };
