/**
 * Helper functions for TimeSlider component
 */

import { TIME_SLIDER_CONFIG } from '@/lib/config/visualConfig';

const SPEED_CONFIG = {
  maxSpeed: TIME_SLIDER_CONFIG.maxSpeed,
  exponent: TIME_SLIDER_CONFIG.speedExponent,
  deadZone: TIME_SLIDER_CONFIG.deadZone,
};

/**
 * Speed calculation result
 */
export interface SpeedResult {
  speed: number;
  direction: 'forward' | 'backward';
}

/**
 * Calculates Y coordinate on the arc for a given normalized X position
 * Uses parabolic curve for downward arc
 * 
 * @param normalizedX - Position along arc (0-1)
 * @param arcDepth - Depth of the arc
 * @param trackPadding - Padding from edges
 * @returns Y coordinate
 */
export function getArcY(
  normalizedX: number,
  arcDepth: number,
  trackPadding: number
): number {
  // Parabolic curve: y = 4 * depth * x * (1 - x)
  // Downward arc: center is lowest, edges are highest
  const y = 4 * arcDepth * normalizedX * (1 - normalizedX);
  return trackPadding + y;
}

/**
 * Calculates playback speed based on slider position
 * Applies dead zone and exponential curve
 * 
 * @param position - Slider position (0-1, 0.5 = center)
 * @returns Speed and direction
 */
export function calculateSpeed(position: number): SpeedResult {
  const offset = position - 0.5; // -0.5 to 0.5
  const normalizedOffset = offset * 2; // -1 to 1
  
  // Dead zone detection
  if (Math.abs(normalizedOffset) < SPEED_CONFIG.deadZone) {
    return { speed: 0, direction: 'forward' };
  }
  
  // Apply exponential curve for more dramatic acceleration at edges
  const sign = normalizedOffset > 0 ? 1 : -1;
  const magnitude = Math.pow(Math.abs(normalizedOffset), SPEED_CONFIG.exponent);
  const speed = magnitude * SPEED_CONFIG.maxSpeed;
  
  return {
    speed,
    direction: sign > 0 ? 'forward' : 'backward',
  };
}

/**
 * Formats speed for display
 * 
 * @param speed - Speed in days/second
 * @param lang - Language ('zh' or 'en')
 * @returns Formatted speed string
 */
export function formatSpeedLabel(speed: number, lang: 'zh' | 'en'): string {
  if (speed <= 0) return '';
  
  if (speed >= 365) {
    return `${(speed / 365).toFixed(1)}${lang === 'zh' ? '年/秒' : 'y/s'}`;
  } else if (speed >= 30) {
    return `${(speed / 30).toFixed(1)}${lang === 'zh' ? '月/秒' : 'm/s'}`;
  } else {
    return `${speed.toFixed(0)}${lang === 'zh' ? '天/秒' : 'd/s'}`;
  }
}

/**
 * Generates SVG path for the arc
 * 
 * @param trackPadding - Padding from edges
 * @param trackWidth - Width of the track
 * @param arcDepth - Depth of the arc
 * @returns SVG path string
 */
export function generateArcPath(
  trackPadding: number,
  trackWidth: number,
  arcDepth: number
): string {
  const points: string[] = [];
  const segments = 100;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = trackPadding + t * trackWidth;
    const y = getArcY(t, arcDepth, trackPadding);
    
    if (i === 0) {
      points.push(`M ${x} ${y}`);
    } else {
      points.push(`L ${x} ${y}`);
    }
  }
  
  return points.join(' ');
}

/**
 * Normalizes client X coordinate to slider position (0-1)
 * 
 * @param clientX - Client X coordinate
 * @param containerRect - Container bounding rect
 * @param trackPadding - Padding from edges
 * @param trackWidth - Width of the track
 * @returns Normalized position (0-1)
 */
export function normalizePosition(
  clientX: number,
  containerRect: DOMRect,
  trackPadding: number,
  trackWidth: number
): number {
  const x = clientX - containerRect.left;
  return Math.max(0, Math.min(1, (x - trackPadding) / trackWidth));
}
