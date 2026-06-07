export const SUN_LIGHT_CONFIG = {
  color: 0xFFF9F0,
  intensity: 3,
  distance: 2000,
  decay: 2,
  castShadow: false,
  shadowMapSize: 1024,
};

export const SUN_SHADER_CONFIG = {
  color: 0xFFF9F0,
  intensity: 1.2,
  limbDarkeningStrength: 0.6,
  turbulenceStrength: 0.15,
  granuleStrength: 0.08,
  animationSpeed: 0.05,
};

export const SUN_GLOW_CONFIG = {
  enabled: true,
  radiusMultiplier: 1.5,
  color: 0xFFF9F0,
  opacity: 0.6,
  farEnhanceStartDistance: 50,
  farEnhanceEndDistance: 200,
  farEnhanceSizeMultiplier: 3.0,
  farEnhanceOpacityMultiplier: 1.5,
  veryFarLimitStartDistance: 5000,
  maxAbsoluteSize: 500000,
};

export const SUN_STAR_SPIKES_CONFIG = {
  enabled: true,
  showStartDistance: 30,
  showFullDistance: 80,
  spikeCount: 4,
  rotationAngle: 45,
  lengthMultiplier: 2,
  spikeWidth: 8,
  color: '#FFFAF0',
  opacity: 0.6,
  falloffExponent: 0.5,
  crescentEnabled: true,
  crescentOuterRadius: 0.26,
  crescentInnerRadiusRatio: 0.75,
  crescentOffsetRatio: 0.15,
  crescentColor: '#FFF8E8',
  crescentOpacity: 0.6,
  crescentFalloff: 1.5,
};

export const SUN_RAINBOW_LAYERS = [
  { color: '#ff6b6b', radiusMultiplier: 1.9, opacity: 0.32 },
  { color: '#ffd56b', radiusMultiplier: 2.3, opacity: 0.25 },
  { color: '#6bd6ff', radiusMultiplier: 2.8, opacity: 0.2 },
];
