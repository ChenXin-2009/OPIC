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
  const r_orb = sat.a;
  const x_orb = r_orb * Math.cos(theta);
  const y_orb = r_orb * Math.sin(theta);
  const z_orb = 0;
  let satellitePos: THREE.Vector3;

  if (sat.eclipticOrbit) {
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
    satellitePos = new THREE.Vector3(x_2, y_2, z_2);
    satellitePos.applyQuaternion(parentAxisQuaternion);
  }
  return satellitePos;
}

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
