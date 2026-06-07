import type { CelestialBody } from '@/lib/astronomy/orbit';
import type { CelestialBodyConfig } from '@/lib/types/celestialTypes';

export interface PlanetConfig {
  body?: CelestialBody;
  config?: CelestialBodyConfig;
  rotationSpeed?: number;
  name?: string;
  radius?: number;
  color?: string;
  rotationPeriod?: number;
}

export const REAL_PLANET_RADII: Record<string, number> = {
  sun: 0.00465,
  mercury: 0.000015,
  venus: 0.000037,
  earth: 0.000043,
  mars: 0.000023,
  jupiter: 0.000477,
  saturn: 0.000402,
  uranus: 0.000170,
  neptune: 0.000165,
};
