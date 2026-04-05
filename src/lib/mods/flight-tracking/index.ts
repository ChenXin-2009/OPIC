/**
 * @module mods/flight-tracking
 * @description 航班追踪 MOD 入口
 */

import { flightTrackingManifest } from './manifest';
import { flightTrackingHooks } from './FlightTrackingMod';

export { flightTrackingManifest } from './manifest';
export { flightTrackingHooks } from './FlightTrackingMod';
export { useFlightStore } from './store/flightStore';
export type {
  Flight,
  FlightState,
  FlightFilter,
  FlightSort,
  FlightTrackingConfig,
  FlightStats,
} from './types';

/**
 * 获取航班追踪 MOD 配置
 */
export function getFlightTrackingMod() {
  return {
    manifest: flightTrackingManifest,
    hooks: flightTrackingHooks,
  };
}
