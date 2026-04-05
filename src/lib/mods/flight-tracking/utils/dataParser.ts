/**
 * @module mods/flight-tracking/utils/dataParser
 * @description 航班数据解析工具
 */

import type { FlightState, Flight } from '../types';

/**
 * 将 FlightState 转换为 Flight
 */
export function stateToFlight(state: FlightState): Flight {
  const altitude = state.baroAltitude ?? state.geoAltitude ?? 0;

  return {
    icao24: state.icao24,
    callsign: state.callsign,
    originCountry: state.originCountry,
    position:
      state.longitude !== null && state.latitude !== null
        ? {
            longitude: state.longitude,
            latitude: state.latitude,
            altitude,
          }
        : null,
    velocity: state.velocity,
    trueTrack: state.trueTrack,
    verticalRate: state.verticalRate,
    onGround: state.onGround,
    squawk: state.squawk,
    timePosition: state.timePosition,
    lastContact: state.lastContact,
  };
}

/**
 * 过滤无效航班数据
 */
export function filterValidStates(states: FlightState[]): FlightState[] {
  return states.filter(
    (s) =>
      s.icao24 &&
      s.longitude !== null &&
      s.latitude !== null &&
      Math.abs(s.latitude) <= 90 &&
      Math.abs(s.longitude) <= 180
  );
}

/**
 * 将 m/s 转换为 km/h
 */
export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6);
}

/**
 * 将 m/s 转换为节 (knots)
 */
export function msToKnots(ms: number): number {
  return Math.round(ms * 1.944);
}

/**
 * 将米转换为英尺
 */
export function metersToFeet(m: number): number {
  return Math.round(m * 3.281);
}

/**
 * 根据高度获取颜色键
 */
export function getAltitudeKey(
  altitude: number,
  onGround: boolean
): 'ground' | 'low' | 'medium' | 'high' {
  if (onGround) return 'ground';
  if (altitude < 3000) return 'low';
  if (altitude < 10000) return 'medium';
  return 'high';
}
