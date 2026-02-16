/**
 * universeScaleConfig.ts - 宇宙尺度配置
 * 
 * 配置从本星系群到可观测宇宙的各个尺度的显示参数
 * 所有数据基于真实天文观测，不使用模拟数据
 */

import { PARSEC_TO_AU, LIGHT_YEAR_TO_AU, SCALE_VIEW_CONFIG } from './galaxyConfig';

// ==================== 单位转换常量 ====================
export const MEGAPARSEC_TO_AU = PARSEC_TO_AU * 1e6;
export const GIGAPARSEC_TO_AU = PARSEC_TO_AU * 1e9;

// ==================== 宇宙尺度视图切换配置 ====================
export const UNIVERSE_SCALE_CONFIG = {
  ...SCALE_VIEW_CONFIG,
  
  // 本星系群（Local Group）- 来自 McConnachie (2012) 目录
  localGroupFadeStart: 150000 * LIGHT_YEAR_TO_AU,
  localGroupShowStart: 200000 * LIGHT_YEAR_TO_AU,
  localGroupShowFull: 500000 * LIGHT_YEAR_TO_AU,
  
  // 近邻星系群（Nearby Groups）- 来自 Karachentsev et al. (2013) 目录
  nearbyGroupsFadeStart: 800000 * LIGHT_YEAR_TO_AU,
  nearbyGroupsShowStart: 1e6 * LIGHT_YEAR_TO_AU,
  nearbyGroupsShowFull: 3e6 * LIGHT_YEAR_TO_AU,
  
  // 室女座超星系团（Virgo Supercluster）- 来自 2MRS 巡天数据
  virgoFadeStart: 4e6 * LIGHT_YEAR_TO_AU,
  virgoShowStart: 5e6 * LIGHT_YEAR_TO_AU,
  virgoShowFull: 15e6 * LIGHT_YEAR_TO_AU,
  
  // 拉尼亚凯亚超星系团（Laniakea Supercluster）- 来自 Cosmicflows-3 数据集
  laniakeaFadeStart: 40e6 * LIGHT_YEAR_TO_AU,
  laniakeaShowStart: 50e6 * LIGHT_YEAR_TO_AU,
  laniakeaShowFull: 150e6 * LIGHT_YEAR_TO_AU,
  
  // 近邻超星系团（Nearby Superclusters）
  nearbySuperclusterFadeStart: 120e6 * LIGHT_YEAR_TO_AU,
  nearbySuperclusterShowStart: 150e6 * LIGHT_YEAR_TO_AU,
  nearbySuperclusterShowFull: 400e6 * LIGHT_YEAR_TO_AU,
  
  // 可观测宇宙（Observable Universe）
  observableUniverseFadeStart: 400e6 * LIGHT_YEAR_TO_AU,
  observableUniverseShowStart: 500e6 * LIGHT_YEAR_TO_AU,
  observableUniverseShowFull: 1500e6 * LIGHT_YEAR_TO_AU,
};

// ==================== 本星系群配置 ====================
export const LOCAL_GROUP_CONFIG = {
  enabled: true,
  galaxyCount: 80,  // McConnachie (2012) 目录中的主要星系数量
  baseGalaxySize: 1000,  // 基础星系大小（光年）
  brightnessScale: 1.5,  // 亮度缩放因子
  useTextures: true,  // 是否使用纹理
  texturePaths: {
    spiral: '/textures/universe/spiral-galaxy.webp',
    elliptical: '/textures/universe/elliptical-galaxy.webp',
    irregular: '/textures/universe/irregular-galaxy.webp',
  },
  labelShowDistance: 500000 * LIGHT_YEAR_TO_AU,  // 显示标签的距离阈值（50万光年）
  // 颜色配置
  colors: {
    spiral: '#aaccff',  // 螺旋星系 - 蓝白色
    elliptical: '#fff4d4',  // 椭圆星系 - 黄白色
    irregular: '#ffddaa',  // 不规则星系 - 橙白色
    dwarf: '#ffcccc',  // 矮星系 - 粉白色
  },
};

// ==================== 近邻星系群配置 ====================
export const NEARBY_GROUPS_CONFIG = {
  enabled: true,
  groupCount: 8,  // Karachentsev et al. (2013) 目录中的主要星系群数量
  galaxyCount: 150,  // 真实观测的星系数量
  useParticles: true,  // 使用粒子系统渲染
  particleSize: 0.01,  // 粒子基础大小（Mpc）- 对应约3万光年直径的星系
  enhancementFactor: 3,  // 程序化生成增强因子（在真实数据基础上）
  showConnections: true,  // 显示星系群内部连线
  connectionOpacity: 0.3,  // 连线透明度
  // 粒子颜色配置
  particleColors: {
    bright: '#ffffff',
    medium: '#aaccff',
    dim: '#8899bb',
  },
};

// ==================== 室女座超星系团配置 ====================
export const VIRGO_SUPERCLUSTER_CONFIG = {
  enabled: true,
  clusterCount: 30,  // 2MRS 巡天中的主要星系团数量
  galaxyCount: 600,  // 真实观测的星系数量
  useParticles: true,
  particleSize: 0.008,  // 粒子基础大小（Mpc）- 对应约2.5万光年直径的星系
  densityFieldEnabled: true,  // 启用密度场可视化
  densityFieldResolution: 32,  // 密度场网格分辨率
  enhancementFactor: 5,  // 程序化生成增强因子
  showConnections: true,  // 显示星系团内部连线
  connectionOpacity: 0.2,  // 连线透明度
  // 密度场颜色映射
  densityColors: {
    low: '#334455',
    medium: '#6688aa',
    high: '#aaccff',
  },
};

// ==================== 拉尼亚凯亚超星系团配置 ====================
export const LANIAKEA_SUPERCLUSTER_CONFIG = {
  enabled: true,
  superclusterCount: 15,  // Cosmicflows-3 数据集中的主要超星系团数量
  galaxyCount: 200,  // 真实观测的星系数量
  useParticles: true,
  particleSize: 0.006,  // 粒子基础大小（Mpc）- 对应约2万光年直径的星系
  showVelocityFlow: false,  // 是否显示引力流（可选功能）
  velocityArrowScale: 0.1,  // 速度箭头缩放因子
  lodEnabled: true,  // 启用 LOD 系统
  lodLevels: 3,  // LOD 级别数量
  showConnections: true,  // 显示超星系团内部连线
  connectionOpacity: 0.15,  // 连线透明度
  // 粒子颜色配置
  particleColors: {
    bright: '#ffeecc',
    medium: '#ccaa88',
    dim: '#aa8866',
  },
};

// ==================== 近邻超星系团配置 ====================
export const NEARBY_SUPERCLUSTER_CONFIG = {
  enabled: true,
  superclusterCount: 20,  // 近邻超星系团数量
  galaxyCount: 200,  // 真实观测的星系数量
  useParticles: true,
  particleSize: 0.005,  // 粒子基础大小（Mpc）- 对应约1.5万光年直径的星系
  densityFieldEnabled: true,
  densityFieldResolution: 24,
  showConnections: true,  // 显示超星系团内部连线
  connectionOpacity: 0.1,  // 连线透明度
  // 质量缩放配置
  massScaling: {
    minScale: 0.5,
    maxScale: 3.0,
    exponent: 0.7,  // 质量-大小关系指数
  },
};

// ==================== 可观测宇宙配置 ====================
export const OBSERVABLE_UNIVERSE_CONFIG = {
  enabled: true,
  anchorPointCount: 100,  // 宇宙网络锚点数量
  
  // 宇宙纤维配置
  filamentEnabled: true,
  filamentThickness: 5,  // Mpc
  filamentDensity: 0.5,  // 粒子密度
  filamentColor: '#6688aa',
  
  // 宇宙空洞配置
  voidEnabled: true,
  voidMinSize: 50,  // Mpc
  voidColor: '#112233',
  voidOpacity: 0.3,
  
  // 宇宙墙配置
  wallEnabled: true,
  wallColor: '#8899bb',
  wallOpacity: 0.2,
  
  // 红移标记配置
  showRedshiftMarkers: true,
  redshiftLevels: [0.1, 0.5, 1.0, 2.0],  // 显示的红移级别
  
  // 可观测宇宙边界
  showObservableBoundary: true,
  boundaryRadius: 46.5e9 * LIGHT_YEAR_TO_AU,  // 465 亿光年
  boundaryColor: '#445566',
  boundaryOpacity: 0.1,
};

// ==================== LOD 配置 ====================
export const LOD_CONFIG = {
  levels: [
    {
      distance: 0,
      particleRatio: 1.0,
      textureSize: 512,
    },
    {
      distance: 100e6 * LIGHT_YEAR_TO_AU,
      particleRatio: 0.5,
      textureSize: 256,
    },
    {
      distance: 500e6 * LIGHT_YEAR_TO_AU,
      particleRatio: 0.2,
      textureSize: 128,
    },
    {
      distance: 1000e6 * LIGHT_YEAR_TO_AU,
      particleRatio: 0.05,
      textureSize: 64,
    },
  ],
};

// ==================== 性能配置 ====================
export const PERFORMANCE_CONFIG = {
  // 内存管理
  maxMemoryMB: 2000,
  memoryWarningThreshold: 0.8,
  
  // 预加载配置
  preloadAdjacentScales: true,
  preloadDistance: 1,  // 预加载相邻尺度的距离（级别数）
  
  // 缓存释放配置
  releaseDistantScales: true,
  releaseDistance: 3,  // 释放远距离尺度的距离（级别数）
  
  // 渲染优化
  frustumCullingEnabled: true,
  instancedRenderingEnabled: true,
  
  // 淡入淡出配置
  fadeSpeed: 1.0,  // 淡入淡出速度倍数（0.5-2.0）
  fadeSmoothing: 'smoothstep',  // 'linear' | 'smoothstep' | 'smootherstep'
};
