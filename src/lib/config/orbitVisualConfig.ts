/**
 * 轨道视觉参数配置 (Orbit Visual Config)
 *
 * 定义行星和卫星轨道渲染的所有视觉参数：
 * - ORBIT_COLORS: 各行星轨道颜色映射
 * - ORBIT_CURVE_POINTS: 轨道曲线采样点数
 * - ORBIT_GRADIENT_CONFIG: 轨道渐变透明度设置
 * - ORBIT_STYLE_CONFIG: 轨道线宽、透明度等样式
 * - SATELLITE_ORBIT_STYLE_CONFIG: 卫星轨道专属样式
 * - ORBIT_RENDER_CONFIG: 轨道渲染开关和缓存配置
 * - ORBIT_FADE_CONFIG / SATELLITE_ORBIT_FADE_CONFIG: 距离淡出参数
 */

export const ORBIT_COLORS: Record<string, string> = {
  mercury: '#c4cbcf',
  venus: '#fcc307',
  earth: '#22a2c3',
  mars: '#f5391c',
  jupiter: '#D8CA9D',
  saturn: '#FAD5A5',
  uranus: '#4FD0E7',
  neptune: '#4B70DD',
};

export const ORBIT_CURVE_POINTS = 300;

export const ORBIT_GRADIENT_CONFIG = {
  enabled: false,
  maxOpacity: 1.0,
  minOpacity: 0.8,
};

export const ORBIT_STYLE_CONFIG = {
  style: 'filled' as 'line' | 'filled',
  showLine: true,
  lineOpacity: 1,
  fillAlpha: 0.3,
  innerRadiusRatio: 0.5,
};

export const SATELLITE_ORBIT_STYLE_CONFIG = {
  style: 'filled' as 'line' | 'filled',
  showLine: true,
  lineOpacity: 0.8,
  fillAlpha: 0.25,
  innerRadiusRatio: 0.6,
};

export const ORBIT_RENDER_CONFIG = {
  lineWidth: 1,
};

export const ORBIT_FADE_CONFIG = {
  enabled: true,
  fadeStartDistance: 0.005,
  fadeEndDistance: 0.0005,
  discMinOpacity: 0,
  lineMinOpacity: 0.3,
};

export const SATELLITE_ORBIT_FADE_CONFIG = {
  enabled: true,
  fadeStartDistance: 0.001,
  fadeEndDistance: 0.00005,
  discMinOpacity: 0,
  lineMinOpacity: 0.2,
};
