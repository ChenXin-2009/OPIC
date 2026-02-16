/**
 * universeConfig.ts - 统一配置导出
 * 
 * 导出所有宇宙可视化相关的配置
 * 包括现有的银河系配置和新的宇宙尺度配置
 */

// 导出现有的银河系和近邻恒星配置
export * from './galaxyConfig';

// 导出新的宇宙尺度配置
export {
  MEGAPARSEC_TO_AU,
  GIGAPARSEC_TO_AU,
  UNIVERSE_SCALE_CONFIG,
  LOCAL_GROUP_CONFIG,
  NEARBY_GROUPS_CONFIG,
  VIRGO_SUPERCLUSTER_CONFIG,
  LANIAKEA_SUPERCLUSTER_CONFIG,
  NEARBY_SUPERCLUSTER_CONFIG,
  OBSERVABLE_UNIVERSE_CONFIG,
  LOD_CONFIG,
  PERFORMANCE_CONFIG,
} from './universeScaleConfig';
