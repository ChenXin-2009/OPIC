import {
  ORBIT_COLORS, SUN_LIGHT_CONFIG, SUN_SHADER_CONFIG, ORBIT_CURVE_POINTS,
  MARKER_CONFIG, SUN_GLOW_CONFIG, SUN_STAR_SPIKES_CONFIG, SUN_RAINBOW_LAYERS,
  FAR_VIEW_CONFIG, ORBIT_GRADIENT_CONFIG, ORBIT_STYLE_CONFIG,
  SATELLITE_ORBIT_STYLE_CONFIG, ORBIT_RENDER_CONFIG, ORBIT_FADE_CONFIG,
  SATELLITE_ORBIT_FADE_CONFIG, CAMERA_CONFIG, SATELLITE_CONFIG,
  HEADER_CONFIG, PLANET_LOD_CONFIG, PLANET_GRID_CONFIG,
  PLANET_TEXTURE_CONFIG, TEXTURE_MANAGER_CONFIG, PLANET_LIGHTING_CONFIG,
  CELESTIAL_MATERIAL_PARAMS, getCelestialMaterialParams,
  SATURN_RING_CONFIG, DISTANCE_DISPLAY_CONFIG, TIME_SLIDER_CONFIG,
  TIME_CONTROL_CONFIG,
} from '../visualConfig';

describe('visualConfig', () => {
  it('should export ORBIT_COLORS with 8 planets', () => {
    expect(Object.keys(ORBIT_COLORS)).toHaveLength(8);
  });

  it('should export SUN_LIGHT_CONFIG with required fields', () => {
    expect(SUN_LIGHT_CONFIG.color).toBeDefined();
    expect(SUN_LIGHT_CONFIG.intensity).toBeGreaterThan(0);
  });

  it('should export SUN_SHADER_CONFIG with animationSpeed', () => {
    expect(SUN_SHADER_CONFIG.animationSpeed).toBe(0.05);
  });

  it('should export ORBIT_CURVE_POINTS as number', () => {
    expect(typeof ORBIT_CURVE_POINTS).toBe('number');
  });

  it('should export MARKER_CONFIG with size and opacity', () => {
    expect(MARKER_CONFIG.size).toBeGreaterThan(0);
    expect(MARKER_CONFIG.baseOpacity).toBe(1.0);
  });

  it('should export SUN_GLOW_CONFIG with far enhancement', () => {
    expect(SUN_GLOW_CONFIG.farEnhanceStartDistance).toBe(50);
    expect(SUN_GLOW_CONFIG.farEnhanceSizeMultiplier).toBe(3.0);
  });

  it('should export SUN_STAR_SPIKES_CONFIG with crescent options', () => {
    expect(SUN_STAR_SPIKES_CONFIG.crescentEnabled).toBe(true);
    expect(SUN_STAR_SPIKES_CONFIG.spikeCount).toBe(4);
  });

  it('should export SUN_RAINBOW_LAYERS with 3 layers', () => {
    expect(SUN_RAINBOW_LAYERS).toHaveLength(3);
  });

  it('should export FAR_VIEW_CONFIG with planet fade', () => {
    expect(FAR_VIEW_CONFIG.planetFadeStartDistance).toBe(80);
    expect(FAR_VIEW_CONFIG.enabled).toBe(true);
  });

  it('should export SATELLITE_CONFIG with visibility threshold', () => {
    expect(SATELLITE_CONFIG.visibilityThreshold).toBe(0.15);
    expect(SATELLITE_CONFIG.enabled).toBe(true);
  });

  it('should export HEADER_CONFIG with floating mode', () => {
    expect(HEADER_CONFIG.floatingMode).toBe(true);
    expect(HEADER_CONFIG.titleText).toContain('OPIC');
  });

  it('should export PLANET_LOD_CONFIG with segment ranges', () => {
    expect(PLANET_LOD_CONFIG.minSegments).toBe(16);
    expect(PLANET_LOD_CONFIG.maxSegments).toBe(128);
  });

  it('should export PLANET_GRID_CONFIG with outward offset', () => {
    expect(PLANET_GRID_CONFIG.outwardOffset).toBe(0.002);
  });

  it('should export PLANET_TEXTURE_CONFIG for known planets', () => {
    expect(PLANET_TEXTURE_CONFIG.earth.baseColor).toContain('earth');
    expect(PLANET_TEXTURE_CONFIG.mars.baseColor).toContain('mars');
  });

  it('should export TEXTURE_MANAGER_CONFIG with timeout', () => {
    expect(TEXTURE_MANAGER_CONFIG.loadTimeout).toBe(30000);
  });

  it('should export PLANET_LIGHTING_CONFIG with Earth night map', () => {
    expect(PLANET_LIGHTING_CONFIG.enableEarthNightMap).toBe(true);
    expect(PLANET_LIGHTING_CONFIG.fresnelIntensity).toBe(0.15);
  });

  it('should export CELESTIAL_MATERIAL_PARAMS with all bodies', () => {
    expect(CELESTIAL_MATERIAL_PARAMS.earth).toBeDefined();
    expect(CELESTIAL_MATERIAL_PARAMS.moon).toBeDefined();
    expect(CELESTIAL_MATERIAL_PARAMS.jupiter).toBeDefined();
    expect(CELESTIAL_MATERIAL_PARAMS.titan).toBeDefined();
  });

  it('should export SATURN_RING_CONFIG with ring parameters', () => {
    expect(SATURN_RING_CONFIG.innerRadius).toBe(1.2);
    expect(SATURN_RING_CONFIG.outerRadius).toBe(2.3);
  });

  it('should export DISTANCE_DISPLAY_CONFIG with text settings', () => {
    expect(DISTANCE_DISPLAY_CONFIG.titleText).toContain('地球');
    expect(DISTANCE_DISPLAY_CONFIG.titleFontSize).toBe(12);
  });

  it('should export TIME_SLIDER_CONFIG with speed zones', () => {
    expect(TIME_SLIDER_CONFIG.speedZones).toHaveLength(6);
    expect(TIME_SLIDER_CONFIG.maxSpeed).toBe(1095);
  });

  it('should export TIME_CONTROL_CONFIG with now button', () => {
    expect(TIME_CONTROL_CONFIG.nowButtonBg).toContain('rgba');
    expect(TIME_CONTROL_CONFIG.dateTimeSizeDesktop).toBe(20);
  });

  it('should return defaults for unknown body in getCelestialMaterialParams', () => {
    const params = getCelestialMaterialParams('nonexistent');
    expect(params.ambientIntensity).toBe(PLANET_LIGHTING_CONFIG.ambientIntensity);
    expect(params.enableFresnelEffect).toBe(PLANET_LIGHTING_CONFIG.enableFresnelEffect);
  });

  it('should merge specific params in getCelestialMaterialParams', () => {
    const params = getCelestialMaterialParams('earth');
    expect(params.ambientIntensity).toBe(0.12);
    expect(params.nightMapIntensity).toBe(1.3);
  });

  it('should handle case-insensitive body name in getCelestialMaterialParams', () => {
    const lower = getCelestialMaterialParams('mars');
    const upper = getCelestialMaterialParams('MARS');
    expect(lower.ambientIntensity).toBe(upper.ambientIntensity);
  });
});
