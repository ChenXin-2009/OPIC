/**
 * 可视化配置统一导出 (Visual Config Barrel)
 *
 * 汇总所有 3D 渲染相关的可视化配置模块，
 * 提供单一入口点便于其他模块导入。
 *
 * 配置模块：
 * - 太阳：光照、着色器、光晕、星芒
 * - 轨道：颜色、曲线、渐变、样式
 * - 行星：LOD、网格、光照、材质、土星环
 * - 纹理：行星贴图路径
 * - UI：头部、距离显示、时间滑块
 */

export { SUN_LIGHT_CONFIG, SUN_SHADER_CONFIG, SUN_GLOW_CONFIG, SUN_STAR_SPIKES_CONFIG, SUN_RAINBOW_LAYERS, SUN_LENS_FLARE_CONFIG } from './sunVisualConfig';

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
