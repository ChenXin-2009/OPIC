/**
 * 行星视觉参数配置 (Planet Visual Config)
 *
 * 定义行星 3D 渲染的所有视觉参数：
 * - PLANET_LOD_CONFIG: 多层次细节（LOD）分段数配置
 * - PLANET_GRID_CONFIG: 经纬网格线参数
 * - PLANET_LIGHTING_CONFIG: 行星光照（环境光、漫反射、临边衰减）
 * - CELESTIAL_MATERIAL_PARAMS: 各天体的自定义材质参数
 * - SATURN_RING_CONFIG: 土星环几何和样式参数
 */

/** Level-of-detail thresholds for planet rendering (distance-based). */
export const PLANET_LOD_CONFIG = {
  baseSegments: 32,
  minSegments: 16,
  maxSegments: 128,
  transitionDistance: 10,
  smoothness: 0.15,
};

/** Configuration for planet axis/ring grid lines. */
export const PLANET_GRID_CONFIG = {
  enabled: true,
  meridians: 12,
  parallels: 6,
  color: '#ffffff',
  opacity: 0.2,
  segments: 96,
  outwardOffset: 0.002,
};

//** Lighting defaults per planet (ambient, diffuse, specular colors). */
export const PLANET_LIGHTING_CONFIG = {
  ambientIntensity: 0.08,
  terminatorWidth: 0.15,
  maxDaylightIntensity: 1.3,
  minNightIntensity: 0.05,
  contrastBoost: 1.1,
  saturationBoost: 1.1,
  gamma: 1.0,
  enableEarthNightMap: true,
  nightMapIntensity: 1.2,
  enableFresnelEffect: true,
  fresnelIntensity: 0.15,
  fresnelColor: 0x88ccff,
  fresnelPower: 3.0,
  poleBlendStart: 0.9,
  poleBlendEnd: 0.99,
  poleSampleCount: 8,
  poleSampleRadius: 0.02,
};

/** 单个天体的自定义材质参数覆盖 */
export interface CelestialMaterialParams {
  ambientIntensity?: number;
  terminatorWidth?: number;
  maxDaylightIntensity?: number;
  minNightIntensity?: number;
  contrastBoost?: number;
  saturationBoost?: number;
  gamma?: number;
  nightMapIntensity?: number;
  enableFresnelEffect?: boolean;
  fresnelIntensity?: number;
  fresnelColor?: number;
  fresnelPower?: number;
}

export const CELESTIAL_MATERIAL_PARAMS: Record<string, CelestialMaterialParams> = {
  mercury: {
    ambientIntensity: 0.04,
    terminatorWidth: 0.06,
    contrastBoost: 1.6,
    saturationBoost: 0.9,
    gamma: 0.9,
    enableFresnelEffect: false,
  },
  venus: {
    ambientIntensity: 0.18,
    terminatorWidth: 0.3,
    contrastBoost: 1.0,
    saturationBoost: 1.1,
    gamma: 1.15,
    enableFresnelEffect: true,
    fresnelIntensity: 0.3,
    fresnelColor: 0xffddaa,
    fresnelPower: 2.0,
  },
  earth: {
    ambientIntensity: 0.12,
    terminatorWidth: 0.22,
    contrastBoost: 1.15,
    saturationBoost: 1.15,
    gamma: 1.05,
    nightMapIntensity: 1.3,
    enableFresnelEffect: true,
    fresnelIntensity: 0.22,
    fresnelColor: 0x88ccff,
    fresnelPower: 2.5,
  },
  mars: {
    ambientIntensity: 0.07,
    terminatorWidth: 0.14,
    contrastBoost: 1.35,
    saturationBoost: 1.2,
    gamma: 1.0,
    enableFresnelEffect: true,
    fresnelIntensity: 0.1,
    fresnelColor: 0xffaa88,
    fresnelPower: 3.0,
  },
  jupiter: {
    ambientIntensity: 0.15,
    terminatorWidth: 0.35,
    contrastBoost: 1.0,
    saturationBoost: 1.25,
    gamma: 1.1,
    enableFresnelEffect: true,
    fresnelIntensity: 0.18,
    fresnelColor: 0xffeedd,
    fresnelPower: 2.0,
  },
  saturn: {
    ambientIntensity: 0.14,
    terminatorWidth: 0.33,
    contrastBoost: 1.0,
    saturationBoost: 1.15,
    gamma: 1.1,
    enableFresnelEffect: true,
    fresnelIntensity: 0.2,
    fresnelColor: 0xffeedd,
    fresnelPower: 2.0,
  },
  uranus: {
    ambientIntensity: 0.16,
    terminatorWidth: 0.32,
    contrastBoost: 1.0,
    saturationBoost: 1.3,
    gamma: 1.15,
    enableFresnelEffect: true,
    fresnelIntensity: 0.25,
    fresnelColor: 0x99ddff,
    fresnelPower: 2.5,
  },
  neptune: {
    ambientIntensity: 0.16,
    terminatorWidth: 0.32,
    contrastBoost: 1.0,
    saturationBoost: 1.3,
    gamma: 1.15,
    enableFresnelEffect: true,
    fresnelIntensity: 0.25,
    fresnelColor: 0x99ddff,
    fresnelPower: 2.5,
  },
  moon: {
    ambientIntensity: 0.03,
    terminatorWidth: 0.08,
    contrastBoost: 1.45,
    saturationBoost: 0.95,
    gamma: 0.95,
    enableFresnelEffect: false,
  },
  io: {
    ambientIntensity: 0.04,
    terminatorWidth: 0.1,
    contrastBoost: 1.4,
    saturationBoost: 1.1,
    gamma: 0.95,
    enableFresnelEffect: false,
  },
  europa: {
    ambientIntensity: 0.1,
    terminatorWidth: 0.18,
    contrastBoost: 1.2,
    saturationBoost: 0.9,
    gamma: 1.2,
    enableFresnelEffect: true,
    fresnelIntensity: 0.3,
    fresnelColor: 0xccffff,
    fresnelPower: 3.0,
  },
  ganymede: {
    ambientIntensity: 0.06,
    terminatorWidth: 0.12,
    contrastBoost: 1.3,
    saturationBoost: 0.95,
    gamma: 1.0,
    enableFresnelEffect: true,
    fresnelIntensity: 0.15,
    fresnelColor: 0xddddff,
    fresnelPower: 3.0,
  },
  callisto: {
    ambientIntensity: 0.05,
    terminatorWidth: 0.1,
    contrastBoost: 1.35,
    saturationBoost: 0.9,
    gamma: 1.0,
    enableFresnelEffect: false,
  },
  titan: {
    ambientIntensity: 0.2,
    terminatorWidth: 0.35,
    contrastBoost: 1.0,
    saturationBoost: 1.0,
    gamma: 1.2,
    enableFresnelEffect: true,
    fresnelIntensity: 0.35,
    fresnelColor: 0xffcc88,
    fresnelPower: 2.0,
  },
  enceladus: {
    ambientIntensity: 0.1,
    terminatorWidth: 0.18,
    contrastBoost: 1.2,
    saturationBoost: 0.85,
    gamma: 1.25,
    enableFresnelEffect: true,
    fresnelIntensity: 0.35,
    fresnelColor: 0xccffff,
    fresnelPower: 2.5,
  },
  triton: {
    ambientIntensity: 0.08,
    terminatorWidth: 0.15,
    contrastBoost: 1.25,
    saturationBoost: 0.9,
    gamma: 1.2,
    enableFresnelEffect: true,
    fresnelIntensity: 0.3,
    fresnelColor: 0xaaddff,
    fresnelPower: 3.0,
  },
  ceres: {
    ambientIntensity: 0.04,
    terminatorWidth: 0.1,
    contrastBoost: 1.4,
    saturationBoost: 0.9,
    gamma: 0.95,
    enableFresnelEffect: false,
  },
  pluto: {
    ambientIntensity: 0.06,
    terminatorWidth: 0.12,
    contrastBoost: 1.3,
    saturationBoost: 0.95,
    gamma: 1.15,
    enableFresnelEffect: true,
    fresnelIntensity: 0.2,
    fresnelColor: 0xddccaa,
    fresnelPower: 3.0,
  },
  eris: {
    ambientIntensity: 0.05,
    terminatorWidth: 0.1,
    contrastBoost: 1.35,
    saturationBoost: 0.85,
    gamma: 1.2,
    enableFresnelEffect: true,
    fresnelIntensity: 0.25,
    fresnelColor: 0xccddff,
    fresnelPower: 3.0,
  },
  haumea: {
    ambientIntensity: 0.06,
    terminatorWidth: 0.12,
    contrastBoost: 1.3,
    saturationBoost: 0.9,
    gamma: 1.15,
    enableFresnelEffect: true,
    fresnelIntensity: 0.2,
    fresnelColor: 0xddddff,
    fresnelPower: 3.0,
  },
  makemake: {
    ambientIntensity: 0.05,
    terminatorWidth: 0.1,
    contrastBoost: 1.35,
    saturationBoost: 1.0,
    gamma: 1.1,
    enableFresnelEffect: true,
    fresnelIntensity: 0.2,
    fresnelColor: 0xffccaa,
    fresnelPower: 3.0,
  },
};

/** 获取指定天体的材质参数，未配置的字段使用 PLANET_LIGHTING_CONFIG 默认值 */
export function getCelestialMaterialParams(bodyName: string): Required<CelestialMaterialParams> {
  const defaults: Required<CelestialMaterialParams> = {
    ambientIntensity: PLANET_LIGHTING_CONFIG.ambientIntensity,
    terminatorWidth: PLANET_LIGHTING_CONFIG.terminatorWidth,
    maxDaylightIntensity: PLANET_LIGHTING_CONFIG.maxDaylightIntensity,
    minNightIntensity: PLANET_LIGHTING_CONFIG.minNightIntensity,
    contrastBoost: PLANET_LIGHTING_CONFIG.contrastBoost,
    saturationBoost: PLANET_LIGHTING_CONFIG.saturationBoost,
    gamma: PLANET_LIGHTING_CONFIG.gamma,
    nightMapIntensity: PLANET_LIGHTING_CONFIG.nightMapIntensity,
    enableFresnelEffect: PLANET_LIGHTING_CONFIG.enableFresnelEffect,
    fresnelIntensity: PLANET_LIGHTING_CONFIG.fresnelIntensity,
    fresnelColor: PLANET_LIGHTING_CONFIG.fresnelColor,
    fresnelPower: PLANET_LIGHTING_CONFIG.fresnelPower,
  };

  const specific = CELESTIAL_MATERIAL_PARAMS[bodyName.toLowerCase()];
  if (!specific) {
    return defaults;
  }

  return { ...defaults, ...specific };
}

export const SATURN_RING_CONFIG = {
  enabled: true,
  innerRadius: 1.2,
  outerRadius: 2.3,
  texturePath: '/textures/planets/2k_saturn_ring_alpha.png',
  opacity: 3,
  segments: 128,
  tiltAngle: 0,
  fallbackColor: 0xc4a66a,
  receiveShadow: false,
  castShadow: false,
};
