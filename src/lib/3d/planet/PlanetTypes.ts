/**
 * 行星类型定义和常量 (Planet Types & Constants)
 *
 * 定义 3D 行星渲染的配置接口和真实行星半径常量。
 */

import type { CelestialBody } from '@/lib/astronomy/orbit';
import type { CelestialBodyConfig } from '@/lib/types/celestialTypes';

/** 3D 行星渲染配置 */
export interface PlanetConfig {
  body?: CelestialBody;
  config?: CelestialBodyConfig;
  rotationSpeed?: number;
  name?: string;
  radius?: number;
  color?: string;
  rotationPeriod?: number;
}

/** 太阳系天体真实半径 (AU)，用于物理正确的渲染比例 */
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
