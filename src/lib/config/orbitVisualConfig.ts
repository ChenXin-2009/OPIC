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
