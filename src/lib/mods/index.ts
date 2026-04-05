/**
 * @module mods
 * @description 核心MOD模块导出
 */

import { registerMod } from '@/lib/mod-manager/init';
import { getSatelliteTrackingMod } from './satellite-tracking';
import { getCesiumIntegrationMod } from './cesium-integration';
import { getFlightTrackingMod } from './flight-tracking';

/**
 * 注册所有核心MOD
 */
export function registerCoreMods(): void {
  // 注册卫星追踪MOD
  const satelliteMod = getSatelliteTrackingMod();
  registerMod(satelliteMod.manifest, satelliteMod.hooks);

  // 注册Cesium集成MOD
  const cesiumMod = getCesiumIntegrationMod();
  registerMod(cesiumMod.manifest, cesiumMod.hooks);

  // 注册航班追踪MOD
  const flightMod = getFlightTrackingMod();
  registerMod(flightMod.manifest, flightMod.hooks);

  console.log('[MODs] 核心MOD注册完成');
}

// 导出各个MOD
export { getSatelliteTrackingMod } from './satellite-tracking';
export { getCesiumIntegrationMod } from './cesium-integration';
export { getFlightTrackingMod } from './flight-tracking';