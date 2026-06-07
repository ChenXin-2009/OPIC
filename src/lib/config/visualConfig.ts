export { SUN_LIGHT_CONFIG, SUN_SHADER_CONFIG, SUN_GLOW_CONFIG, SUN_STAR_SPIKES_CONFIG, SUN_RAINBOW_LAYERS } from './sunVisualConfig';

export { ORBIT_COLORS, ORBIT_CURVE_POINTS, ORBIT_GRADIENT_CONFIG, ORBIT_STYLE_CONFIG, SATELLITE_ORBIT_STYLE_CONFIG, ORBIT_RENDER_CONFIG, ORBIT_FADE_CONFIG, SATELLITE_ORBIT_FADE_CONFIG } from './orbitVisualConfig';

export { PLANET_LOD_CONFIG, PLANET_GRID_CONFIG, PLANET_LIGHTING_CONFIG, CELESTIAL_MATERIAL_PARAMS, getCelestialMaterialParams, SATURN_RING_CONFIG } from './planetVisualConfig';
export type { CelestialMaterialParams } from './planetVisualConfig';

export { PLANET_TEXTURE_CONFIG, TEXTURE_MANAGER_CONFIG } from './textureConfig';
export type { PlanetTextureConfig } from './textureConfig';

export { HEADER_CONFIG, DISTANCE_DISPLAY_CONFIG, TIME_SLIDER_CONFIG, TIME_CONTROL_CONFIG } from './uiVisualConfig';

/**
 * 标记圈（Marker）相关配置
 */
export const MARKER_CONFIG = {
  size: 20,
  strokeWidth: 2,
  baseOpacity: 1.0,
  fadeSpeed: 0.2,
  minOpacity: 0.1,
};

/**
 * 远距离视图配置
 */
export const FAR_VIEW_CONFIG = {
  enabled: true,
  planetFadeStartDistance: 80,
  planetFadeEndDistance: 300,
  orbitFadeStartDistance: 800,
  orbitFadeEndDistance: 2000,
  labelFadeStartDistance: 500,
  labelFadeEndDistance: 1000,
};

/**
 * 相机相关配置
 */
export const CAMERA_CONFIG = {
  minDistanceToBody: 0.002,
  initialTiltDeg: 30,
  initialTransitionSec: 1.2,
};

/**
 * 卫星相关全局配置
 */
export const SATELLITE_CONFIG = {
  enabled: true,
  defaultScale: 1.0,
  showOnFocusMultiplier: 15,
  visibilityThreshold: 0.15,
  fadeOutDistance: 0.25,
};
