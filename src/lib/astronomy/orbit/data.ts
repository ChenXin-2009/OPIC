/**
 * 轨道元素数据 (Orbital Elements Data)
 *
 * 定义太阳系所有行星和主要卫星的开普勒轨道根数。
 * 数据基于 J2000.0 历元，并包含长期变化率用于时间插值。
 *
 * 数据来源：JPL Solar System Dynamics
 * 坐标系：黄道面 J2000.0
 */

import type { OrbitalElements } from './types';

/** 两种计算模式的精度信息 */
export const ACCURACY_INFO = {
  ephemeris: '±10m',
  analytical: '±1000km',
};

/** 位置缓存容差 — JD 变化小于此值时复用缓存 (天) */
export const CACHE_TOLERANCE = 0.0001;
/** 位置缓存最大有效期 (毫秒) */
export const CACHE_MAX_AGE = 2000;

/** 太阳系所有行星和主要卫星的开普勒轨道根数，按天体名称索引 */
export const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: {
    name: 'Mercury',
    a: 0.38709927,
    e: 0.20563593,
    i: 7.00497902 * Math.PI / 180,
    L: 252.25032350 * Math.PI / 180,
    w_bar: 77.45779628 * Math.PI / 180,
    O: 48.33076593 * Math.PI / 180,
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

/** 各行星的主要卫星定义，按母行星名称索引 */
export const SATELLITE_DEFINITIONS: Record<string, Array<{
  name: string;
  a: number;
  periodDays: number;
  i: number;
  Omega: number;
  radius: number;
  color: string;
  phase?: number;
  eclipticOrbit?: boolean;
}>> = {
  earth: [
    { name: 'Moon', a: 384400 / 149597870.7, periodDays: 27.322, i: 5.145 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1737.4 / 149597870.7, color: '#c0c0c0', phase: 0.0, eclipticOrbit: true },
  ],
  jupiter: [
    { name: 'Io', a: 421700 / 149597870.7, periodDays: 1.769, i: 0.04 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1821.6 / 149597870.7, color: '#f5d6a0', phase: 0.02 },
    { name: 'Europa', a: 671034 / 149597870.7, periodDays: 3.551, i: 0.47 * Math.PI / 180, Omega: 90 * Math.PI / 180, radius: 1560.8 / 149597870.7, color: '#d9e8ff', phase: 0.25 },
    { name: 'Ganymede', a: 1070412 / 149597870.7, periodDays: 7.154, i: 0.18 * Math.PI / 180, Omega: 180 * Math.PI / 180, radius: 2634.1 / 149597870.7, color: '#cfae8b', phase: 0.5 },
    { name: 'Callisto', a: 1882700 / 149597870.7, periodDays: 16.689, i: 0.19 * Math.PI / 180, Omega: 270 * Math.PI / 180, radius: 2410.3 / 149597870.7, color: '#bba99b', phase: 0.75 },
  ],
  saturn: [
    { name: 'Titan', a: 1221870 / 149597870.7, periodDays: 15.945, i: 0.34 * Math.PI / 180, Omega: 45 * Math.PI / 180, radius: 2574.73 / 149597870.7, color: '#ffd9a6', phase: 0.2 },
    { name: 'Enceladus', a: 238020 / 149597870.7, periodDays: 1.370, i: 0.01 * Math.PI / 180, Omega: 225 * Math.PI / 180, radius: 252.1 / 149597870.7, color: '#e6f7ff', phase: 0.6 },
  ],
  uranus: [
    { name: 'Miranda', a: 129900 / 149597870.7, periodDays: 1.413, i: 4.338 * Math.PI / 180, Omega: 30 * Math.PI / 180, radius: 235.8 / 149597870.7, color: '#f0e9ff', phase: 0.1 },
    { name: 'Ariel', a: 191020 / 149597870.7, periodDays: 2.521, i: 0.260 * Math.PI / 180, Omega: 120 * Math.PI / 180, radius: 578.9 / 149597870.7, color: '#cfe7ff', phase: 0.35 },
    { name: 'Umbriel', a: 266000 / 149597870.7, periodDays: 4.144, i: 0.360 * Math.PI / 180, Omega: 210 * Math.PI / 180, radius: 584.7 / 149597870.7, color: '#bfc4d6', phase: 0.6 },
    { name: 'Titania', a: 436300 / 149597870.7, periodDays: 8.706, i: 0.100 * Math.PI / 180, Omega: 300 * Math.PI / 180, radius: 788.9 / 149597870.7, color: '#d6eaff', phase: 0.9 },
  ],
  neptune: [
    { name: 'Triton', a: 354800 / 149597870.7, periodDays: 5.877, i: 156.87 * Math.PI / 180, Omega: 0 * Math.PI / 180, radius: 1353.4 / 149597870.7, color: '#bde0ff', phase: 0.4 },
  ]
};
