/**
 * 星历表集成层 (Ephemeris Integration Layer)
 *
 * 桥接轨道力学系统与高精度星历表系统。
 * 根据时间精度需求自动切换计算模式：
 * - 低精度场景（年级别变化）→ 解析轨道力学
 * - 高精度场景（日/时级别变化）→ 星历表插值
 *
 * 提供的天体位置提供者：
 * - 地球和木星位置（用于木星伽利略卫星计算）
 * - 太阳位置（用于光行差修正）
 */

import { calculatePosition } from './mechanics';
import { ORBITAL_ELEMENTS, ACCURACY_INFO } from './data';
import {
  Vector3 as EphemerisVector3,
  type PlanetaryPositionProvider,
  SatelliteId
} from '../ephemeris';
import { AllBodiesCalculator } from '../ephemeris/all-bodies-calculator';
import { logger } from '@/utils/logger';
import { AU_IN_KM } from '@/lib/astronomy/utils/constants';

class OrbitSystemPositionProvider implements PlanetaryPositionProvider {
  getEarthPosition(jd_tdb: number): EphemerisVector3 {
    const pos = calculatePosition(ORBITAL_ELEMENTS.earth, jd_tdb);
    return new EphemerisVector3(pos.x, pos.y, pos.z);
  }

  getJupiterPosition(jd_tdb: number): EphemerisVector3 {
    const pos = calculatePosition(ORBITAL_ELEMENTS.jupiter, jd_tdb);
    return new EphemerisVector3(pos.x, pos.y, pos.z);
  }

  getEarthVelocity(jd_tdb: number): EphemerisVector3 {
    const dt = 1.0 / 86400.0;
    const pos1 = calculatePosition(ORBITAL_ELEMENTS.earth, jd_tdb - dt / 2);
    const pos2 = calculatePosition(ORBITAL_ELEMENTS.earth, jd_tdb + dt / 2);
    const vx = (pos2.x - pos1.x) / dt;
    const vy = (pos2.y - pos1.y) / dt;
    const vz = (pos2.z - pos1.z) / dt;
    const AU_TO_KM = AU_IN_KM;
    const DAYS_TO_SECONDS = 86400.0;
    const scale = AU_TO_KM / DAYS_TO_SECONDS;
    return new EphemerisVector3(vx * scale, vy * scale, vz * scale);
  }
}

let allBodiesCalculator: AllBodiesCalculator | null = null;
let allBodiesInitPromise: Promise<void> | null = null;

function shouldUseEphemeris(naifId: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('ephemeris-settings');
    if (!stored) return false;
    const settings = JSON.parse(stored);
    if (!settings?.state?.bodies) return false;
    const bodyKeyMap: Record<number, string> = {
      199: 'mercury', 299: 'venus', 399: 'earth', 4: 'mars',
      5: 'jupiter', 6: 'saturn', 7: 'uranus', 8: 'neptune',
      301: 'moon',
      501: 'io', 502: 'europa', 503: 'ganymede', 504: 'callisto',
      601: 'mimas', 602: 'enceladus', 603: 'tethys', 604: 'dione',
      605: 'rhea', 606: 'titan', 607: 'hyperion', 608: 'iapetus',
      701: 'ariel', 702: 'umbriel', 703: 'titania', 704: 'oberon', 705: 'miranda',
      801: 'triton',
    };
    const bodyKey = bodyKeyMap[naifId];
    if (!bodyKey) return false;
    return settings.state.bodies[bodyKey]?.enabled === true;
  } catch (error) {
    console.warn('[Ephemeris] Failed to check user settings:', error);
    return false;
  }
}

function getSatelliteKey(satelliteId: SatelliteId): string {
  switch (satelliteId) {
    case SatelliteId.IO: return 'Io';
    case SatelliteId.EUROPA: return 'Europa';
    case SatelliteId.GANYMEDE: return 'Ganymede';
    case SatelliteId.CALLISTO: return 'Callisto';
    default: return '';
  }
}

function getSatelliteId(name: string): SatelliteId | null {
  switch (name) {
    case 'Io': return SatelliteId.IO;
    case 'Europa': return SatelliteId.EUROPA;
    case 'Ganymede': return SatelliteId.GANYMEDE;
    case 'Callisto': return SatelliteId.CALLISTO;
    default: return null;
  }
}

/** 获取已初始化的全天体计算器实例，未初始化时返回 null */
export function getAllBodiesCalculator(): AllBodiesCalculator | null {
  return allBodiesCalculator;
}

/** 初始化全天体高精度星历表计算器，加载数据块并缓存。可重复调用，已初始化时直接返回。 */
export async function initializeAllBodiesCalculator(
  callbacks?: {
    setBodyStatus?: (bodyKey: string, status: string, error?: string) => void;
    setBodyTimeRange?: (bodyKey: string, start: number, end: number) => void;
    setBodyAccuracy?: (bodyKey: string, ephemeris: string, analytical: string) => void;
  }
): Promise<void> {
  if (allBodiesInitPromise) {
    return allBodiesInitPromise;
  }

  allBodiesInitPromise = (async () => {
    try {
      logger.debug('[Ephemeris] Initializing all-bodies calculator (on-demand)...');
      allBodiesCalculator = new AllBodiesCalculator({
        baseUrl: '/data/ephemeris'
      });

      const bodies = allBodiesCalculator.getBodies();

      bodies.forEach((bodyConfig: any) => {
        const bodyKeyMap: Record<number, string> = {
          199: 'mercury', 299: 'venus', 399: 'earth', 4: 'mars',
          5: 'jupiter', 6: 'saturn', 7: 'uranus', 8: 'neptune',
          301: 'moon',
          501: 'io', 502: 'europa', 503: 'ganymede', 504: 'callisto',
          601: 'mimas', 602: 'enceladus', 603: 'tethys', 604: 'dione',
          605: 'rhea', 606: 'titan', 607: 'hyperion', 608: 'iapetus',
          701: 'ariel', 702: 'umbriel', 703: 'titania', 704: 'oberon', 705: 'miranda',
          801: 'triton'
        };

        const bodyKey = bodyKeyMap[bodyConfig.naifId];
        if (bodyKey && bodyConfig.timeRange) {
          callbacks?.setBodyTimeRange?.(
            bodyKey,
            bodyConfig.timeRange.start,
            bodyConfig.timeRange.end
          );
          callbacks?.setBodyAccuracy?.(
            bodyKey,
            ACCURACY_INFO.ephemeris,
            ACCURACY_INFO.analytical
          );
        }
      });

      logger.debug('[Ephemeris] All-bodies calculator initialized successfully');
    } catch (error) {
      console.warn('[Ephemeris] Failed to initialize all-bodies calculator:', error);
      allBodiesCalculator = null;
      allBodiesInitPromise = null;
      throw error;
    }
  })();

  return allBodiesInitPromise;
}

export { OrbitSystemPositionProvider, shouldUseEphemeris, getSatelliteKey, getSatelliteId, allBodiesCalculator, allBodiesInitPromise };
