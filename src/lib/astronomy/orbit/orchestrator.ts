/**
 * 天体位置计算编排器 (Celestial Position Orchestrator)
 *
 * 协调所有太阳系天体（行星、卫星）的位置计算。
 * 根据时间精度需求自动选择：
 * - 解析轨道力学（快速，±1000km 精度）
 * - 星历表插值（高精度，±10m 精度）
 *
 * 缓存机制：
 * - JD 变化小于 CACHE_TOLERANCE 时复用上次结果
 * - 缓存超过 CACHE_MAX_AGE 毫秒自动失效
 */

import * as THREE from 'three';
import type { CelestialBody } from './types';
import { ORBITAL_ELEMENTS, SATELLITE_DEFINITIONS, CACHE_TOLERANCE, CACHE_MAX_AGE } from './data';
import { calculatePosition, getParentAxisQuaternion, calculateSatellitePosition } from './mechanics';
import { shouldUseEphemeris, initializeAllBodiesCalculator, getAllBodiesCalculator } from './ephemeris-integration';
import { logger } from '@/utils/logger';
import { J2000_JD } from '@/lib/astronomy/utils/constants';

interface PositionCache {
  jd: number;
  bodies: CelestialBody[];
  timestamp: number;
}

let positionCache: PositionCache | null = null;

/**
 * 获取所有太阳系天体在指定时刻的位置。
 * 根据精度需求自动选择解析轨道力学或星历表插值。
 * 结果按 JD 缓存，短时间内重复调用直接返回缓存。
 *
 * @param julianDay 儒略日 (JD)
 * @param setBodyStatus 可选的状态回调，用于报告各天体的加载进度
 * @returns 天体位置数组（太阳、行星、卫星）
 */
export async function getCelestialBodies(
  julianDay: number,
  setBodyStatus?: (bodyKey: string, status: string, error?: string) => void
): Promise<CelestialBody[]> {
  const now = Date.now();
  if (positionCache) {
    const jdDiff = Math.abs(julianDay - positionCache.jd);
    const age = now - positionCache.timestamp;

    if (jdDiff < CACHE_TOLERANCE && age < CACHE_MAX_AGE) {
      return positionCache.bodies;
    }

    if (jdDiff < CACHE_TOLERANCE * 10 && age < CACHE_MAX_AGE * 2) {
      const cachedBodies = positionCache.bodies;
      calculateBodiesInBackground(julianDay);
      return cachedBodies;
    }
  }

  return await calculateBodiesNow(julianDay, setBodyStatus);
}

async function calculateBodiesNow(
  julianDay: number,
  setBodyStatus?: (bodyKey: string, status: string, error?: string) => void
): Promise<CelestialBody[]> {
  const bodies: CelestialBody[] = [];

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

  const planetPositions = await calculatePlanetPositions(julianDay, bodies, setBodyStatus);

  await calculateSatellitePositions(julianDay, planetPositions, bodies, setBodyStatus);

  logger.debug(`getCelestialBodies: Loaded ${bodies.length} bodies for JD ${julianDay}`);

  positionCache = {
    jd: julianDay,
    bodies: bodies,
    timestamp: Date.now()
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
      detail: { stage: 'bodies' }
    }));
  }

  return bodies;
}

function calculateBodiesInBackground(julianDay: number): void {
  calculateBodiesNow(julianDay).catch(error => {
    console.warn('Background body calculation failed:', error);
  });
}

async function calculatePlanetPositions(
  julianDay: number,
  bodies: CelestialBody[],
  setBodyStatus?: (bodyKey: string, status: string, error?: string) => void
): Promise<Record<string, { x: number; y: number; z: number }>> {
  const planetPosMap: Record<string, { x: number; y: number; z: number }> = {};

  const planetNaifIds: Record<string, number> = {
    'mercury': 199, 'venus': 299, 'earth': 399,
    'mars': 4, 'jupiter': 5, 'saturn': 6, 'uranus': 7, 'neptune': 8
  };

  for (const [key, elements] of Object.entries(ORBITAL_ELEMENTS)) {
    const naifId = planetNaifIds[key];
    const pos = calculatePosition(elements, julianDay);
    const shouldUseHighPrecision = naifId && shouldUseEphemeris(naifId);

    if (shouldUseHighPrecision) {
      if (!getAllBodiesCalculator()) {
        try {
          setBodyStatus?.(key, 'LOADING');
          await initializeAllBodiesCalculator();
        } catch (error) {
          console.warn(`[Ephemeris] Failed to initialize calculator for ${key}, using analytical model:`, error);
          setBodyStatus?.(key, 'ERROR', String(error));
        }
      }

      const allBodiesCalculator = getAllBodiesCalculator();
      if (allBodiesCalculator) {
        try {
          const result = await allBodiesCalculator.calculatePosition(naifId, julianDay);
          if (result.usingEphemeris) {
            pos.x = result.position.x;
            pos.y = result.position.y;
            pos.z = result.position.z;
            pos.r = Math.sqrt(result.position.x ** 2 + result.position.y ** 2 + result.position.z ** 2);
            setBodyStatus?.(key, 'LOADED');
          }
        } catch (error) {
          console.warn(`[Ephemeris] Error for ${key}, using analytical model:`, error);
          setBodyStatus?.(key, 'ERROR', String(error));
        }
      }
    }

    bodies.push({
      name: elements.name,
      x: pos.x, y: pos.y, z: pos.z,
      r: pos.r,
      radius: elements.radius,
      color: elements.color,
      elements: elements
    });

    planetPosMap[key] = { x: pos.x, y: pos.y, z: pos.z };
  }

  return planetPosMap;
}

async function calculateSatellitePositions(
  julianDay: number,
  planetPosMap: Record<string, { x: number; y: number; z: number }>,
  bodies: CelestialBody[],
  setBodyStatus?: (bodyKey: string, status: string, error?: string) => void
): Promise<void> {
  const daysSinceJ2000 = julianDay - J2000_JD;

  const satelliteNaifIds: Record<string, number> = {
    'Moon': 301,
    'Io': 501, 'Europa': 502, 'Ganymede': 503, 'Callisto': 504,
    'Mimas': 601, 'Enceladus': 602, 'Tethys': 603, 'Dione': 604,
    'Rhea': 605, 'Titan': 606, 'Hyperion': 607, 'Iapetus': 608,
    'Miranda': 705, 'Ariel': 701, 'Umbriel': 702, 'Titania': 703, 'Oberon': 704,
    'Triton': 801
  };

  for (const [parentKey, sats] of Object.entries(SATELLITE_DEFINITIONS)) {
    const parentPos = planetPosMap[parentKey];
    if (!parentPos) {
      console.warn(`Parent planet not found: ${parentKey}`);
      continue;
    }

    const hasEphemerisEnabled = sats.some(sat => {
      const naifId = satelliteNaifIds[sat.name];
      return naifId && shouldUseEphemeris(naifId);
    });

    if (hasEphemerisEnabled && !getAllBodiesCalculator()) {
      try {
        sats.forEach(sat => {
          const naifId = satelliteNaifIds[sat.name];
          if (naifId && shouldUseEphemeris(naifId)) {
            setBodyStatus?.(sat.name.toLowerCase(), 'LOADING');
          }
        });
        await initializeAllBodiesCalculator();
      } catch (error) {
        console.warn(`[Ephemeris] Failed to initialize calculator for ${parentKey} satellites:`, error);
        sats.forEach(sat => {
          const naifId = satelliteNaifIds[sat.name];
          if (naifId && shouldUseEphemeris(naifId)) {
            setBodyStatus?.(sat.name.toLowerCase(), 'ERROR', String(error));
          }
        });
      }
    }

    for (const sat of sats) {
      const naifId = satelliteNaifIds[sat.name];
      let useEphemeris = false;
      let satellitePos: THREE.Vector3;

      const shouldUseHighPrecision = naifId && shouldUseEphemeris(naifId);

      if (sat.name === 'Enceladus') {
        const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
        satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
        useEphemeris = false;
      } else if (shouldUseHighPrecision && getAllBodiesCalculator() && naifId) {
        try {
          const allBodiesCalculator = getAllBodiesCalculator()!;
          const result = await allBodiesCalculator.calculatePosition(naifId, julianDay);
          if (result.usingEphemeris) {
            satellitePos = new THREE.Vector3(
              result.position.x, result.position.y, result.position.z
            );
            useEphemeris = true;
            setBodyStatus?.(sat.name.toLowerCase(), 'LOADED');
          } else {
            const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
            satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
          }
        } catch (error) {
          console.warn(`[Ephemeris] Error for ${sat.name}, using analytical model:`, error);
          const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
          satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
          setBodyStatus?.(sat.name.toLowerCase(), 'ERROR', String(error));
        }
      } else {
        const parentAxisQuaternion = getParentAxisQuaternion(parentKey);
        satellitePos = calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion);
      }

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
        usingEphemeris: useEphemeris,
      } as unknown as CelestialBody);
    }
  }
}

export { positionCache, calculateBodiesNow, calculateBodiesInBackground, calculatePlanetPositions, calculateSatellitePositions };
