/**
 * universeLabelConfig.ts - 宇宙天体标签配置
 * 
 * 集中管理宇宙尺度天体标签的显示参数
 */

/**
 * 宇宙标签全局配置
 */
export const UNIVERSE_LABEL_CONFIG = {
  /** 是否启用宇宙标签系统 */
  enabled: true,
  
  /** 标签淡入淡出速度（秒） */
  fadeSpeed: 0.15,
  
  /** 标签最小显示优先级（0-10） */
  minPriority: 3,
  
  /** 标签之间的最小间距（像素） */
  minSpacing: 5,
  
  /** 是否显示额外信息（距离、大小等） */
  showMetadata: true,
  
  /** 字体族 */
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/**
 * 本星系群标签配置
 */
export const LOCAL_GROUP_LABEL_CONFIG = {
  /** 是否启用 */
  enabled: true,
  
  /** 最小亮度阈值（只显示亮度大于此值的星系） */
  minBrightness: 0.3,
  
  /** 字体大小 */
  fontSize: '14px',
  
  /** 字体粗细 */
  fontWeight: '500',
  
  /** 文字颜色 */
  color: '#88ccff',
  
  /** 标签偏移 */
  offsetX: 15,
  offsetY: -5,
  
  /** 显示的主要星系（高优先级） */
  majorGalaxies: [
    'Andromeda',
    'M33',
    'Large Magellanic Cloud',
    'Small Magellanic Cloud',
    'NGC 205',
    'M32',
  ],
};

/**
 * 近邻星系群标签配置
 */
export const NEARBY_GROUPS_LABEL_CONFIG = {
  /** 是否启用 */
  enabled: true,
  
  /** 最小成员数阈值（只显示成员数大于此值的星系群） */
  minMembers: 5,
  
  /** 字体大小 */
  fontSize: '15px',
  
  /** 字体粗细 */
  fontWeight: '600',
  
  /** 文字颜色 */
  color: '#ffaa88',
  
  /** 标签偏移 */
  offsetX: 20,
  offsetY: -8,
  
  /** 显示的主要星系群（高优先级） */
  majorGroups: [
    'M81 Group',
    'Sculptor Group',
    'Centaurus A Group',
    'M83 Group',
    'NGC 1023 Group',
  ],
};

/**
 * 室女座超星系团标签配置
 */
export const VIRGO_SUPERCLUSTER_LABEL_CONFIG = {
  /** 是否启用 */
  enabled: true,
  
  /** 最小成员数阈值（只显示成员数大于此值的星系团） */
  minMembers: 10,
  
  /** 字体大小 */
  fontSize: '16px',
  
  /** 字体粗细 */
  fontWeight: '600',
  
  /** 文字颜色 */
  color: '#ffcc66',
  
  /** 标签偏移 */
  offsetX: 25,
  offsetY: -10,
  
  /** 显示的主要星系团（高优先级） */
  majorClusters: [
    'Virgo Cluster',
    'Fornax Cluster',
    'Eridanus Cluster',
    'Leo Cluster',
  ],
};

/**
 * 拉尼亚凯亚超星系团标签配置
 */
export const LANIAKEA_SUPERCLUSTER_LABEL_CONFIG = {
  /** 是否启用 */
  enabled: true,
  
  /** 字体大小 */
  fontSize: '18px',
  
  /** 字体粗细 */
  fontWeight: '700',
  
  /** 文字颜色 */
  color: '#ff88cc',
  
  /** 标签偏移 */
  offsetX: 30,
  offsetY: -12,
  
  /** 显示的主要超星系团（高优先级） */
  majorSuperclusters: [
    'Laniakea',
    'Perseus-Pisces',
    'Coma',
    'Shapley',
  ],
};

/**
 * 根据天体名称获取优先级加成
 */
export function getNamePriorityBonus(name: string, type: 'galaxy' | 'group' | 'cluster' | 'supercluster'): number {
  const majorLists = {
    galaxy: LOCAL_GROUP_LABEL_CONFIG.majorGalaxies,
    group: NEARBY_GROUPS_LABEL_CONFIG.majorGroups,
    cluster: VIRGO_SUPERCLUSTER_LABEL_CONFIG.majorClusters,
    supercluster: LANIAKEA_SUPERCLUSTER_LABEL_CONFIG.majorSuperclusters,
  };
  
  const majorList = majorLists[type];
  const isMajor = majorList.some(majorName => 
    name.toLowerCase().includes(majorName.toLowerCase()) ||
    majorName.toLowerCase().includes(name.toLowerCase())
  );
  
  return isMajor ? 3 : 0;
}
