/**
 * Cesium 适配器默认配置
 *
 * 提供合理的默认值以平衡性能和视觉质量。
 * 包含三套预设：默认、性能优化、高质量。
 */

import type { CesiumAdapterConfig } from './CesiumAdapter';
export const DEFAULT_CESIUM_ADAPTER_CONFIG: Partial<CesiumAdapterConfig> = {
  // Canvas 分辨率缩放 (0.1 - 2.0)
  // 1.0 = 原生分辨率，0.5 = 一半分辨率（性能优化），2.0 = 双倍分辨率（高质量）
  canvasResolutionScale: 1.0,

  // 最大屏幕空间误差（像素）
  // 值越小，瓦片质量越高但性能开销越大
  // 推荐范围: 1-4（高质量）, 4-8（平衡）, 8-16（性能优先）
  maximumScreenSpaceError: 2,

  // 最大加载瓦片数量
  // 限制内存使用，防止加载过多瓦片
  maximumNumberOfLoadedTiles: 1000,

  // ── 地形配置 ──
  enableTerrain: true,
  terrainProviderSource: 'arcgis-world-elevation',
  requestTerrainVertexNormals: true,
  requestTerrainWaterMask: false,   // 默认禁用水面遮罩，节省 GPU 内存和带宽
  terrainExaggeration: 1.0,         // 默认 1.0 不夸大，保持真实比例
  terrainExaggerationRelativeHeight: 0,

  // ── 自适应 LOD（核心性能优化）──
  // 靠近地表时自动降低地形精度以维持流畅帧率
  enableAdaptiveLOD: true,
  // 最低精度（极近地表时）: 16（性能优先，地形细节肉眼难以分辨）
  adaptiveLODMinQuality: 16,
  // 最高精度（高空俯瞰时）: 2（全精度，能看到整个地球地形轮廓）
  adaptiveLODMaxQuality: 2,

  // ── 帧率控制 ──
  // Cesium 独立渲染目标帧率（30fps），0 表示不限制
  // 与 Three.js 主循环解耦，避免 Cesium 地形瓦片成为瓶颈
  targetCesiumFrameRate: 30,

  // 深度合成策略
  // 'render-order': 渲染顺序法（先渲染地球，后渲染卫星）
  // 'satellite-always-front': 卫星始终在前（暂未实现）
  depthCompositingStrategy: 'render-order' as const,
};

/**
 * 性能优化配置预设
 * 适用于低端设备或需要高帧率的场景
 */
export const PERFORMANCE_OPTIMIZED_CONFIG: Partial<CesiumAdapterConfig> = {
  ...DEFAULT_CESIUM_ADAPTER_CONFIG,
  canvasResolutionScale: 0.5,
  maximumScreenSpaceError: 8,
  maximumNumberOfLoadedTiles: 500,
};

/**
 * 高质量配置预设
 * 适用于高端设备或需要高视觉质量的场景
 */
export const HIGH_QUALITY_CONFIG: Partial<CesiumAdapterConfig> = {
  ...DEFAULT_CESIUM_ADAPTER_CONFIG,
  canvasResolutionScale: 1.5,
  maximumScreenSpaceError: 1,
  maximumNumberOfLoadedTiles: 2000,
};
