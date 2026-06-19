/**
 * 行星纹理路径配置 (Texture Config)
 *
 * 定义所有行星和天体的纹理贴图路径映射。
 * 支持三种贴图类型：
 * - baseColor: 表面漫反射贴图
 * - normalMap: 法线贴图（增强表面细节）
 * - nightMap: 夜间灯光贴图（仅地球等）
 */

/** 天体纹理配置 — 指定贴图文件路径 */
export interface PlanetTextureConfig {
  /** 表面漫反射贴图路径 */
  baseColor?: string;
  /** 法线贴图路径（可选，增强表面凹凸细节） */
  normalMap?: string;
  /** 夜间灯光贴图路径（可选，仅地球等有夜间灯光的天体） */
  nightMap?: string;
}

export const PLANET_TEXTURE_CONFIG: Record<string, PlanetTextureConfig> = {
  mercury: {
    baseColor: '/textures/planets/2k_mercury.webp',
  },
  venus: {
    baseColor: '/textures/planets/2k_venus_surface.webp',
  },
  earth: {
    baseColor: '/textures/planets/2k_earth_daymap.webp',
    nightMap: '/textures/planets/2k_earth_nightmap.webp',
  },
  mars: {
    baseColor: '/textures/planets/2k_mars.webp',
  },
  jupiter: {
    baseColor: '/textures/planets/2k_jupiter.webp',
  },
  saturn: {
    baseColor: '/textures/planets/2k_saturn.webp',
  },
  uranus: {
    baseColor: '/textures/planets/2k_uranus.webp',
  },
  neptune: {
    baseColor: '/textures/planets/2k_neptune.webp',
  },
  moon: {
    baseColor: '/textures/planets/2k_moon.webp',
  },
  ceres: {
    baseColor: '/textures/planets/2k_ceres_fictional.webp',
  },
  eris: {
    baseColor: '/textures/planets/2k_eris_fictional.webp',
  },
  haumea: {
    baseColor: '/textures/planets/2k_haumea_fictional.webp',
  },
  makemake: {
    baseColor: '/textures/planets/2k_makemake_fictional.webp',
  },
};

/** 纹理管理器全局配置 */
export const TEXTURE_MANAGER_CONFIG = {
  enabled: true,
  defaultResolution: '2k',
  debugLogging: false,
  loadTimeout: 30000,
};
