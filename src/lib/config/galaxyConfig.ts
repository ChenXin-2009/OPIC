/**
 * galaxyConfig.ts - 银河系配置
 */

// 导入统一的单位转换常量
import { LIGHT_YEAR_TO_AU, PARSEC_TO_LIGHT_YEAR } from '../constants/units';

// 重新导出以保持向后兼容
export { LIGHT_YEAR_TO_AU, PARSEC_TO_LIGHT_YEAR };

// ==================== 视图切换阈值配置 ====================
export const SCALE_VIEW_CONFIG = {
  solarSystemFadeStart: 500,
  solarSystemFadeEnd: 2000,
  nearbyStarsShowStart: 30000,
  nearbyStarsShowFull: LIGHT_YEAR_TO_AU,
  nearbyStarsFadeStart: 500 * LIGHT_YEAR_TO_AU,
  nearbyStarsFadeEnd: 1000 * LIGHT_YEAR_TO_AU,
  galaxyShowStart: 1000 * LIGHT_YEAR_TO_AU,
  galaxyShowFull: 2000 * LIGHT_YEAR_TO_AU,
  milkyWayBackgroundFadeStart: 30000,
  milkyWayBackgroundFadeEnd: LIGHT_YEAR_TO_AU,
};

// ==================== 银河系配置 ====================
export const GALAXY_CONFIG = {
  enabled: true,
  radius: 50000,
  thickness: 1000,
  diskThickness: 300,
  sunDistanceFromCenter: 26000,
  topViewTexturePath: '/textures/planets/Milky_Way_map_by_Gaia_labelled.jpg',
  topViewOpacity: 1.0,
  topViewScale: 1.0,
  layerCount: 3,
  layerThicknessLY: 2000,
  layerOpacity: 0.3,
  bulgeFactor: 2,
  bulgeExponent: 4,
  coreRadius: 0.1,
  coreThicknessFactor: 0.0001,
  diskMinThickness: 0.2,
  layerJitter: 0,
  coreBrightness: 1,
  warpEnabled: true,
  warpAmplitude: 0.08,
  warpStartRadius: 0.4,
  warpAngle: 0,
  sideViewEnabled: true,
  sideViewTexturePath: '/textures/planets/MilkyWaySide_Gaia_5000_2.jpg',
  sideViewOpacity: 0.05,
  sideViewCount: 30,
  rotationX: -60.2,
  rotationY: 13.4,
  rotationZ: 103.0,
  particleCount: 100000,
  particleBaseSize: 1.0,
  coreColor: '#fffaf0',
  armColor: '#aaccff',
  outerColor: '#8899bb',
  lodLevels: 4,
  lodDistances: [100, 500, 2000, 10000],
  lodParticleRatios: [1.0, 0.5, 0.2, 0.05],
  armCount: 4,
  armWindingAngle: 12,
  armWidth: 0.15,
  armBrightnessBoost: 1.5,
};
