export interface PlanetTextureConfig {
  baseColor?: string;
  normalMap?: string;
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

export const TEXTURE_MANAGER_CONFIG = {
  enabled: true,
  defaultResolution: '2k',
  debugLogging: false,
  loadTimeout: 30000,
};
