import * as THREE from 'three';
import { PARSEC_TO_AU } from '@/lib/constants/units';

const SOLAR_RADIUS_TO_AU = 0.00465047;

export function exoplanetEquatorialToCartesian(
  raDeg: number,
  decDeg: number,
  distancePc: number
): THREE.Vector3 {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  const distanceAU = distancePc * PARSEC_TO_AU;

  return new THREE.Vector3(
    distanceAU * Math.cos(dec) * Math.cos(ra),
    distanceAU * Math.sin(dec),
    -distanceAU * Math.cos(dec) * Math.sin(ra)
  );
}

export function stellarRadiusSolarToAU(radiusSolar?: number): number {
  return Math.max((radiusSolar ?? 1) * SOLAR_RADIUS_TO_AU, SOLAR_RADIUS_TO_AU * 0.15);
}

export function stellarColorFromTemperature(temperatureK?: number): THREE.Color {
  if (!temperatureK || !Number.isFinite(temperatureK)) {
    return new THREE.Color(0xfff4ea);
  }

  const t = Math.max(1800, Math.min(40000, temperatureK));
  if (t >= 30000) return new THREE.Color(0x9bb0ff);
  if (t >= 10000) return new THREE.Color(0xb8c8ff);
  if (t >= 7500) return new THREE.Color(0xd9e4ff);
  if (t >= 6000) return new THREE.Color(0xfff7e8);
  if (t >= 5200) return new THREE.Color(0xffe1b5);
  if (t >= 3700) return new THREE.Color(0xffb56b);
  return new THREE.Color(0xff7a45);
}

export function planetColorFromRadius(radiusEarth?: number, equilibriumTemperatureK?: number): THREE.Color {
  if (equilibriumTemperatureK && equilibriumTemperatureK > 1000) {
    return new THREE.Color(0xff9a55);
  }

  const radius = radiusEarth ?? 1;
  if (radius < 1.4) return new THREE.Color(0x7fc6ff);
  if (radius < 2.5) return new THREE.Color(0x8fe0b2);
  if (radius < 6) return new THREE.Color(0xd8c690);
  return new THREE.Color(0xe0a36f);
}

export function estimateSemiMajorAxisAU(periodDays?: number, stellarMassSolar?: number): number | undefined {
  if (!periodDays || !Number.isFinite(periodDays) || periodDays <= 0) {
    return undefined;
  }

  const periodYears = periodDays / 365.25;
  const mass = stellarMassSolar && stellarMassSolar > 0 ? stellarMassSolar : 1;
  return Math.cbrt(mass * periodYears * periodYears);
}

export function formatMaybe(value: number | undefined, digits = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }
  return value.toFixed(digits);
}
