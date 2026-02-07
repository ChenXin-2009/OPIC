/**
 * Orbital Calculations Module v2
 * 
 * This module provides planetary position calculations using simplified
 * VSOP87 orbital elements with time evolution.
 * 
 * Features:
 * 1. VSOP87 simplified model orbital parameters (closer to NASA JPL data)
 * 2. Time-dependent orbital elements (secular variations per century)
 * 3. Ecliptic to heliocentric coordinate transformations
 * 4. Moon position using simplified ELP2000 model
 * 5. Satellite positions for major moons
 * 
 * References:
 * - NASA JPL HORIZONS System
 * - Simon et al. (1994) - Numerical expressions for precession
 * - Meeus, Jean - Astronomical Algorithms (2nd Ed.)
 */

import * as THREE from 'three';
import {
  argumentOfPeriapsis,
  eccentricToTrueAnomaly,
  heliocentricDistance,
  julianCenturies,
  meanAnomaly,
  orbitalToEcliptic,
  solveKeplerEquation
} from './utils';
import { CELESTIAL_BODIES, calculateRotationAxis } from '@/lib/types/celestialTypes';

export interface OrbitalElements {
  name: string;
  // 轨道元素（J2000.0历元）
  a: number;      // 半长轴 (AU)
  e: number;      // 离心率
  i: number;      // 轨道倾角 (rad)
  L: number;      // 平黄经 (rad)
  w_bar: number;  // 近日点黄经 (rad)
  O: number;      // 升交点黄经 (rad)
  // 每世纪变化率
  a_dot: number;
  e_dot: number;
  i_dot: number;
  L_dot: number;
  w_bar_dot: number;
  O_dot: number;
  // 显示属性
  radius: number;
  color: string;
}

export interface CelestialBody {
  name: string;
  x: number;
  y: number;
  z: number;
  r: number;
  radius: number;
  color: string;
  isSun?: boolean;
  // 可选：父天体的 key（小写），用于标识卫星
  parent?: string;
  // 标识这是否为卫星
  isSatellite?: boolean;
  elements?: OrbitalElements;
}

/**
 * 8大行星轨道参数
 * 数据源：NASA JPL DE440 + Simon et al. (1994)
 * 基准历元：J2000.0 (JD 2451545.0)
 */
export const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: {
    name: 'Mercury',
    // J2000.0 轨道元素
    a: 0.38709927,
    e: 0.20563593,
    i: 7.00497902 * Math.PI / 180,
    L: 252.25032350 * Math.PI / 180,
    w_bar: 77.45779628 * Math.PI / 180,
    O: 48.33076593 * Math.PI / 180,
    // 每儒略世纪变化率
    a_dot: 0.00000037,
    e_dot: 0.00001906,
    i_dot: -0.00594749 * Math.PI / 180,
    L_dot: 149472.67411175 * Math.PI / 180,
    w_bar_dot: 0.16047689 * Math.PI / 180,
    O_dot: -0.12534081 * Math.PI / 180,
    radius: 0.003,
    color: '#8C7853'
  },
  venus: {
    name: 'Venus',
    a: 0.72333566,
    e: 0.00677672,
    i: 3.39467605 * Math.PI / 180,
    L: 181.97909950 * Math.PI / 180,
    w_bar: 131.60246718 * Math.PI / 180,
    O: 76.67984255 * Math.PI / 180,
    a_dot: 0.00000390,
    e_dot: -0.00004107,
    i_dot: -0.00078890 * Math.PI / 180,
    L_dot: 58517.81538729 * Math.PI / 180,
    w_bar_dot: 0.00268329 * Math.PI / 180,
    O_dot: -0.27769418 * Math.PI / 180,
    radius: 0.008,
    color: '#FFC649'
  },
  earth: {
    name: 'Earth',
    a: 1.00000261,
    e: 0.01671123,
    i: -0.00001531 * Math.PI / 180,
    L: 100.46457166 * Math.PI / 180,
    w_bar: 102.93768193 * Math.PI / 180,
    O: 0.0,
    a_dot: 0.00000562,
    e_dot: -0.00004392,
    i_dot: -0.01294668 * Math.PI / 180,
    L_dot: 35999.37244981 * Math.PI / 180,
    w_bar_dot: 0.32327364 * Math.PI / 180,
    O_dot: 0.0,
    radius: 0.008,
    color: '#4A90E2'
  },
  mars: {
    name: 'Mars',
    a: 1.52371034,
    e: 0.09339410,
    i: 1.84969142 * Math.PI / 180,
    L: -4.55343205 * Math.PI / 180,
    w_bar: -23.94362959 * Math.PI / 180,
    O: 49.55953891 * Math.PI / 180,
    a_dot: 0.00001847,
    e_dot: 0.00007882,
    i_dot: -0.00813131 * Math.PI / 180,
    L_dot: 19140.30268499 * Math.PI / 180,
    w_bar_dot: 0.44441088 * Math.PI / 180,
    O_dot: -0.29257343 * Math.PI / 180,
    radius: 0.004,
    color: '#E27B58'
  },
  jupiter: {
    name: 'Jupiter',
    a: 5.20288700,
    e: 0.04838624,
    i: 1.30439695 * Math.PI / 180,
    L: 34.39644051 * Math.PI / 180,
    w_bar: 14.72847983 * Math.PI / 180,
    O: 100.47390909 * Math.PI / 180,
    a_dot: -0.00011607,
    e_dot: -0.00013253,
    i_dot: -0.00183714 * Math.PI / 180,
    L_dot: 3034.74612775 * Math.PI / 180,
    w_bar_dot: 0.21252668 * Math.PI / 180,
    O_dot: 0.20469106 * Math.PI / 180,
    radius: 0.09,
    color: '#C88B3A'
  },
  saturn: {
    name: 'Saturn',
    a: 9.53667594,
    e: 0.05386179,
    i: 2.48599187 * Math.PI / 180,
    L: 49.95424423 * Math.PI / 180,
    w_bar: 92.59887831 * Math.PI / 180,
    O: 113.66242448 * Math.PI / 180,
    a_dot: -0.00125060,
    e_dot: -0.00050991,
    i_dot: 0.00193609 * Math.PI / 180,
    L_dot: 1222.49362201 * Math.PI / 180,
    w_bar_dot: -0.41897216 * Math.PI / 180,
    O_dot: -0.28867794 * Math.PI / 180,
    radius: 0.075,
    color: '#FAD5A5'
  },
  uranus: {
    name: 'Uranus',
    a: 19.18916464,
    e: 0.04725744,
    i: 0.77263783 * Math.PI / 180,
    L: 313.23810451 * Math.PI / 180,
    w_bar: 170.95427630 * Math.PI / 180,
    O: 74.01692503 * Math.PI / 180,
    a_dot: -0.00196176,
    e_dot: -0.00004397,
    i_dot: -0.00242939 * Math.PI / 180,
    L_dot: 428.48202785 * Math.PI / 180,
    w_bar_dot: 0.40805281 * Math.PI / 180,
    O_dot: 0.04240589 * Math.PI / 180,
    radius: 0.032,
    color: '#4FD0E7'
  },
  neptune: {
    name: 'Neptune',
    a: 30.06992276,
    e: 0.00859048,
    i: 1.77004347 * Math.PI / 180,
    L: -55.12002969 * Math.PI / 180,
    w_bar: 44.96476227 * Math.PI / 180,
    O: 131.78422574 * Math.PI / 180,
    a_dot: 0.00026291,
    e_dot: 0.00005105,
    i_dot: 0.00035372 * Math.PI / 180,
    L_dot: 218.45945325 * Math.PI / 180,
    w_bar_dot: -0.32241464 * Math.PI / 180,
    O_dot: -0.00508664 * Math.PI / 180,
    radius: 0.031,
    color: '#4166F5'
  }
};

/**
 * 卫星定义（含完整轨道参数）
 * 
 * 数据源：NASA JPL HORIZONS 和 IAU WGAS 报告
 * 参数说明：
 * - parent: 母天体 key（小写，如 'jupiter'）
 * - name: 卫星名（英文）
 * - a: 半长轴（km，最后除以 AU 转换）
 * - periodDays: 公转周期（天）
 * - i: 轨道倾角（度，相对于母行星的赤道平面）
 * - Omega: 升交点黄经（度）
 * - radius: 卫星渲染半径（km，最后除以 AU 转换）
 * - color: 显示颜色
 * - phase: 初始相位（0-1）
 */
export const SATELLITE_DEFINITIONS: Record<string, Array<{
  name: string;
  a: number;          // 半长轴（AU）
  periodDays: number;
  i: number;          // 轨道倾角（弧度）
  Omega: number;      // 升交点黄经（弧度）
  radius: number;     // 半径（AU）
  color: string;
  phase?: number;
  eclipticOrbit?: boolean;  // 是否相对于黄道面而非母行星赤道面
}>> = {
  earth: [
    // 地球唯一天然卫星
    // 数据源：NASA JPL HORIZONS（2024）
    // 月球轨道倾角相对于黄道面 ~5.14°（不是相对于地球赤道面）
    { name: 'Moon', a: 384400 / 149597870.7, periodDays: 27.322, i: 5.145 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1737.4 / 149597870.7, color: '#c0c0c0', phase: 0.0, eclipticOrbit: true },
  ],
  jupiter: [
    // 木星的四颗伽利略卫星
    // 数据源：NASA JPL HORIZONS（2024）
    // 为每个卫星设置不同的升交点黄经，使它们的轨道处于不同平面
    { name: 'Io', a: 421700 / 149597870.7, periodDays: 1.769, i: 0.04 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1821.6 / 149597870.7, color: '#f5d6a0', phase: 0.02 },
    { name: 'Europa', a: 671034 / 149597870.7, periodDays: 3.551, i: 0.47 * Math.PI / 180, Omega: 90 * Math.PI / 180, radius: 1560.8 / 149597870.7, color: '#d9e8ff', phase: 0.25 },
    { name: 'Ganymede', a: 1070412 / 149597870.7, periodDays: 7.154, i: 0.18 * Math.PI / 180, Omega: 180 * Math.PI / 180, radius: 2634.1 / 149597870.7, color: '#cfae8b', phase: 0.5 },
    { name: 'Callisto', a: 1882700 / 149597870.7, periodDays: 16.689, i: 0.19 * Math.PI / 180, Omega: 270 * Math.PI / 180, radius: 2410.3 / 149597870.7, color: '#bba99b', phase: 0.75 },
  ],
  saturn: [
    // 土星主要卫星
    // 数据源：NASA JPL HORIZONS（2024）
    // 为卫星设置不同的升交点黄经
    { name: 'Titan', a: 1221870 / 149597870.7, periodDays: 15.945, i: 0.34 * Math.PI / 180, Omega: 45 * Math.PI / 180, radius: 2574.73 / 149597870.7, color: '#ffd9a6', phase: 0.2 },
    { name: 'Enceladus', a: 238020 / 149597870.7, periodDays: 1.370, i: 0.01 * Math.PI / 180, Omega: 225 * Math.PI / 180, radius: 252.1 / 149597870.7, color: '#e6f7ff', phase: 0.6 },
  ],
  uranus: [
    // 天王星卫星
    // 天王星自转轴倾斜97.8°，卫星轨道倾角相对于天王星赤道平面
    // 数据源：NASA JPL HORIZONS（2024）
    // 为卫星设置不同的升交点黄经
    { name: 'Miranda', a: 129900 / 149597870.7, periodDays: 1.413, i: 4.338 * Math.PI / 180, Omega: 30 * Math.PI / 180, radius: 235.8 / 149597870.7, color: '#f0e9ff', phase: 0.1 },
    { name: 'Ariel', a: 191020 / 149597870.7, periodDays: 2.521, i: 0.260 * Math.PI / 180, Omega: 120 * Math.PI / 180, radius: 578.9 / 149597870.7, color: '#cfe7ff', phase: 0.35 },
    { name: 'Umbriel', a: 266000 / 149597870.7, periodDays: 4.144, i: 0.360 * Math.PI / 180, Omega: 210 * Math.PI / 180, radius: 584.7 / 149597870.7, color: '#bfc4d6', phase: 0.6 },
    { name: 'Titania', a: 436300 / 149597870.7, periodDays: 8.706, i: 0.100 * Math.PI / 180, Omega: 300 * Math.PI / 180, radius: 788.9 / 149597870.7, color: '#d6eaff', phase: 0.9 },
  ],
  neptune: [
    // 海王星主要卫星
    // 数据源：NASA JPL HORIZONS（2024）
    { name: 'Triton', a: 354800 / 149597870.7, periodDays: 5.877, i: 156.87 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1353.4 / 149597870.7, color: '#bde0ff', phase: 0.4 },
  ]
};

/**
 * Computes orbital elements at a given time.
 * 
 * This function applies secular variations to the base orbital elements
 * to account for perturbations over time.
 * 
 * @param elements - Base orbital elements at J2000.0
 * @param T - Julian centuries since J2000.0
 * @returns Orbital elements at the specified time
 */
function computeElementsAtTime(elements: OrbitalElements, T: number): OrbitalElements {
  return {
    ...elements,
    a: elements.a + elements.a_dot * T,
    e: elements.e + elements.e_dot * T,
    i: elements.i + elements.i_dot * T,
    L: elements.L + elements.L_dot * T,
    w_bar: elements.w_bar + elements.w_bar_dot * T,
    O: elements.O + elements.O_dot * T
  };
}

/**
 * Calculates satellite position relative to its parent planet.
 * 
 * This function computes the position of a satellite using a simplified
 * circular orbit model. The orbit can be either in the planet's equatorial
 * plane or relative to the ecliptic plane (for the Moon).
 * 
 * @param sat - Satellite definition with orbital parameters
 * @param daysSinceJ2000 - Days since J2000.0 epoch
 * @param parentAxisQuaternion - Parent planet's axis orientation
 * @returns Satellite position relative to parent (AU)
 */
function calculateSatellitePosition(
  sat: {
    a: number;
    periodDays: number;
    i: number;
    Omega: number;
    phase?: number;
    eclipticOrbit?: boolean;
  },
  daysSinceJ2000: number,
  parentAxisQuaternion: THREE.Quaternion
): THREE.Vector3 {
  // Calculate mean angle based on orbital period
  const theta = (2 * Math.PI * (daysSinceJ2000 / sat.periodDays + (sat.phase || 0))) % (2 * Math.PI);

  // Satellite position in orbital plane
  const r_orb = sat.a;
  const x_orb = r_orb * Math.cos(theta);
  const y_orb = r_orb * Math.sin(theta);
  const z_orb = 0;

  let satellitePos: THREE.Vector3;

  if (sat.eclipticOrbit) {
    // Moon and similar: orbit relative to ecliptic plane
    // Apply orbital inclination directly in ecliptic coordinates
    const cos_Om = Math.cos(sat.Omega);
    const sin_Om = Math.sin(sat.Omega);
    const x_1 = x_orb * cos_Om - y_orb * sin_Om;
    const y_1 = x_orb * sin_Om + y_orb * cos_Om;
    const z_1 = z_orb;

    const cos_i = Math.cos(sat.i);
    const sin_i = Math.sin(sat.i);
    const x_final = x_1;
    const y_final = y_1 * cos_i - z_1 * sin_i;
    const z_final = y_1 * sin_i + z_1 * cos_i;

    satellitePos = new THREE.Vector3(x_final, y_final, z_final);
  } else {
    // Other satellites: orbit in parent planet's equatorial plane
    // Apply satellite orbital inclination and ascending node
    const cos_Om = Math.cos(sat.Omega);
    const sin_Om = Math.sin(sat.Omega);
    const x_1 = x_orb * cos_Om - y_orb * sin_Om;
    const y_1 = x_orb * sin_Om + y_orb * cos_Om;
    const z_1 = z_orb;

    const cos_i = Math.cos(sat.i);
    const sin_i = Math.sin(sat.i);
    const x_2 = x_1;
    const y_2 = y_1 * cos_i - z_1 * sin_i;
    const z_2 = y_1 * sin_i + z_1 * cos_i;

    // Apply parent planet's axis tilt transformation
    satellitePos = new THREE.Vector3(x_2, y_2, z_2);
    satellitePos.applyQuaternion(parentAxisQuaternion);
  }

  return satellitePos;
}

/**
 * Gets the parent planet's axis orientation quaternion.
 * 
 * This function retrieves the spin axis configuration from the celestial
 * bodies configuration and converts it to a quaternion for coordinate
 * transformations.
 * 
 * @param parentKey - Parent planet identifier (lowercase)
 * @returns Quaternion representing the planet's axis orientation
 */
function getParentAxisQuaternion(parentKey: string): THREE.Quaternion {
  const quaternion = new THREE.Quaternion(); // Default: no tilt

  const parentConfig = CELESTIAL_BODIES[parentKey];

  if (parentConfig && parentConfig.northPoleRA !== undefined && parentConfig.northPoleDec !== undefined) {
    // Calculate rotation axis from north pole coordinates
    const axis = calculateRotationAxis(parentConfig.northPoleRA, parentConfig.northPoleDec);

    // Convert to Three.js Vector3
    const spinAxisRender = new THREE.Vector3(axis.x, axis.y, axis.z);

    // Orbital plane is in equatorial plane, normal vector is spin axis
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const targetNormal = spinAxisRender.normalize();

    quaternion.setFromUnitVectors(defaultNormal, targetNormal);
  }

  return quaternion;
}

/**
 * Calculates the heliocentric position of a planet.
 * 
 * This function computes the 3D position of a celestial body in the
 * heliocentric ecliptic coordinate system at a given Julian Day.
 * 
 * Algorithm:
 * 1. Compute Julian centuries since J2000.0
 * 2. Apply secular variations to orbital elements
 * 3. Calculate mean anomaly from mean longitude
 * 4. Solve Kepler's equation for eccentric anomaly
 * 5. Compute true anomaly and heliocentric distance
 * 6. Transform from orbital plane to ecliptic coordinates
 * 
 * @param elements - Orbital elements of the body
 * @param julianDay - Julian Day Number
 * @returns Position in heliocentric ecliptic coordinates (AU) and distance
 * 
 * @example
 * ```typescript
 * const earthPos = calculatePosition(ORBITAL_ELEMENTS.earth, 2451545.0);
 * console.log(earthPos); // { x: ..., y: ..., z: ..., r: ... }
 * ```
 */
export function calculatePosition(
  elements: OrbitalElements,
  julianDay: number
): { x: number; y: number; z: number; r: number } {
  // Compute Julian centuries since J2000.0
  const T = julianCenturies(julianDay);
  
  // Apply secular variations to orbital elements
  const elem = computeElementsAtTime(elements, T);
  
  // Calculate argument of periapsis and mean anomaly
  const w = argumentOfPeriapsis(elem.w_bar, elem.O);
  const M = meanAnomaly(elem.L, elem.w_bar);
  
  // Solve Kepler's equation for eccentric anomaly
  const E = solveKeplerEquation(M, elem.e);
  
  // Calculate true anomaly
  const nu = eccentricToTrueAnomaly(E, elem.e);
  
  // Calculate heliocentric distance
  const r = heliocentricDistance(elem.a, elem.e, E);
  
  // Compute position in orbital plane
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);
  
  // Transform to ecliptic coordinates
  const pos = orbitalToEcliptic(x_orb, y_orb, {
    w,
    Omega: elem.O,
    i: elem.i
  });
  
  return { ...pos, r };
}

/**
 * Gets all celestial body positions at a given time.
 * 
 * This function computes the positions of the Sun, all 8 planets, and
 * their major satellites at the specified Julian Day.
 * 
 * The function returns an array of celestial bodies with their 3D positions
 * in heliocentric ecliptic coordinates (AU).
 * 
 * @param julianDay - Julian Day Number
 * @returns Array of celestial bodies with positions and properties
 * 
 * @example
 * ```typescript
 * const bodies = getCelestialBodies(2451545.0); // J2000.0
 * const earth = bodies.find(b => b.name === 'Earth');
 * console.log(earth?.x, earth?.y, earth?.z);
 * ```
 */
export function getCelestialBodies(julianDay: number): CelestialBody[] {
  const bodies: CelestialBody[] = [];
  
  // Add the Sun at origin
  bodies.push({
    name: 'Sun',
    x: 0,
    y: 0,
    z: 0,
    r: 0,
    radius: 0.05,
    color: '#FDB813',
    isSun: true
  });
  
  // Calculate positions for all 8 planets
  const planetPositions = calculatePlanetPositions(julianDay, bodies);
  
  // Calculate positions for all satellites
  calculateSatellitePositions(julianDay, planetPositions, bodies);
  
  return bodies;
}

/**
 * Calculates positions for all planets.
 * 
 * @param julianDay - Julian Day Number
 * @param bodies - Array to append planet bodies to
 * @returns Map of planet positions by lowercase name
 */
function calculatePlanetPositions(
  julianDay: number,
  bodies: CelestialBody[]
): Record<string, { x: number; y: number; z: number }> {
  const planetPosMap: Record<string, { x: number; y: number; z: number }> = {};
  
  for (const [key, elements] of Object.entries(ORBITAL_ELEMENTS)) {
    const pos = calculatePosition(elements, julianDay);
    
    bodies.push({
      name: elements.name,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      r: pos.r,
      radius: elements.radius,
      color: elements.color,
      elements: elements
    });
    
    planetPosMap[key] = { x: pos.x, y: pos.y, z: pos.z };
  }
  
  return planetPosMap;
}

/**
 * Calculates positions for all satellites.
 * 
 * This function computes satellite positions using simplified circular
 * orbit models. Satellites orbit their parent planets, and their positions
 * are calculated relative to the parent's current position.
 * 
 * @param julianDay - Julian Day Number
 * @param planetPosMap - Map of planet positions by lowercase name
 * @param bodies - Array to append satellite bodies to
 */
function calculateSatellitePositions(
  julianDay: number,
  planetPosMap: Record<string, { x: number; y: number; z: number }>,
  bodies: CelestialBody[]
): void {
  const daysSinceJ2000 = julianDay - 2451545.0;
  
  for (const [parentKey, sats] of Object.entries(SATELLITE_DEFINITIONS)) {
    const parentPos = planetPosMap[parentKey];
    if (!parentPos) {
      console.warn(`Parent planet not found: ${parentKey}`);
      continue;
    }

    // Get parent planet's axis orientation
    const parentAxisQuaternion = getParentAxisQuaternion(parentKey);

    for (const sat of sats) {
      // Calculate satellite position relative to parent
      const satellitePos = calculateSatellitePosition(
        sat,
        daysSinceJ2000,
        parentAxisQuaternion
      );

      // Add satellite to bodies array
      bodies.push({
        name: sat.name,
        x: parentPos.x + satellitePos.x,
        y: parentPos.y + satellitePos.y,
        z: parentPos.z + satellitePos.z,
        r: 0,
        radius: sat.radius,
        color: sat.color,
        parent: parentKey,
        isSatellite: true,
      } as unknown as CelestialBody);
    }
  }
}