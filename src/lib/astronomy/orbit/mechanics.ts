/**
 * 轨道力学核心计算 (Orbital Mechanics Core)
 *
 * 实现基于开普勒方程的天体位置解析计算。
 *
 * 计算流程：
 * 1. 从轨道根数插值当前时刻参数（a, e, i, L, ω̃, Ω）
 * 2. 求解开普勒方程 E - e·sin(E) = M 得到偏近点角
 * 3. 转换为真近点角，计算日心距离
 * 4. 通过轨道面→黄道面变换得到 3D 位置
 * 5. 叠加母行星轴倾角得到最终位置
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
} from '../utils';
import { calculateRotationAxis, CELESTIAL_BODIES } from '@/lib/types/celestialTypes';
import type { OrbitalElements } from './types';

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

function getParentAxisQuaternion(parentKey: string): THREE.Quaternion {
  const quaternion = new THREE.Quaternion();
  const parentConfig = CELESTIAL_BODIES[parentKey];
  if (parentConfig && parentConfig.northPoleRA !== undefined && parentConfig.northPoleDec !== undefined) {
    const axis = calculateRotationAxis(parentConfig.northPoleRA, parentConfig.northPoleDec);
    const spinAxisRender = new THREE.Vector3(axis.x, axis.y, axis.z);
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const targetNormal = spinAxisRender.normalize();
    quaternion.setFromUnitVectors(defaultNormal, targetNormal);
  }
  return quaternion;
}

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
  const theta = (2 * Math.PI * (daysSinceJ2000 / sat.periodDays + (sat.phase || 0))) % (2 * Math.PI);
  const cos_Om = Math.cos(sat.Omega);
  const sin_Om = Math.sin(sat.Omega);
  const x_1 = sat.a * Math.cos(theta) * cos_Om - sat.a * Math.sin(theta) * sin_Om;
  const y_1 = sat.a * Math.cos(theta) * sin_Om + sat.a * Math.sin(theta) * cos_Om;
  const cos_i = Math.cos(sat.i);
  const sin_i = Math.sin(sat.i);
  const satellitePos = new THREE.Vector3(x_1, y_1 * cos_i, y_1 * sin_i);
  if (!sat.eclipticOrbit) {
    satellitePos.applyQuaternion(parentAxisQuaternion);
  }
  return satellitePos;
}

/**
 * 根据开普勒轨道根数计算天体在 RenderWorld 坐标系中的位置。
 * 计算流程：轨道根数插值 → 开普勒方程求解 → 轨道面→黄道面变换。
 *
 * @param elements 开普勒轨道根数
 * @param julianDay 儒略日 (JD)
 * @returns 天体位置 {x, y, z} (AU) 和日心距离 r (AU)
 */
export function calculatePosition(
  elements: OrbitalElements,
  julianDay: number
): { x: number; y: number; z: number; r: number } {
  const T = julianCenturies(julianDay);
  const elem = computeElementsAtTime(elements, T);
  const w = argumentOfPeriapsis(elem.w_bar, elem.O);
  const M = meanAnomaly(elem.L, elem.w_bar);
  const E = solveKeplerEquation(M, elem.e);
  const nu = eccentricToTrueAnomaly(E, elem.e);
  const r = heliocentricDistance(elem.a, elem.e, E);
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);
  const pos = orbitalToEcliptic(x_orb, y_orb, {
    w,
    Omega: elem.O,
    i: elem.i
  });
  return { ...pos, r };
}

export { computeElementsAtTime, getParentAxisQuaternion, calculateSatellitePosition };
