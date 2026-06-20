import * as THREE from 'three';
import { ORBIT_GRADIENT_CONFIG, ORBIT_STYLE_CONFIG } from '@/lib/config/visualConfig';

/** RGB color components in [0,1] range. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Parse hex color string (#RRGGBB or #RGB) to normalized RGB. */
export function parseHexColor(hex: string): RGB {
  if (hex.length === 7) {
    return {
      r: parseInt(hex.slice(1, 3), 16) / 255,
      g: parseInt(hex.slice(3, 5), 16) / 255,
      b: parseInt(hex.slice(5, 7), 16) / 255,
    };
  }
  if (hex.length === 4) {
    return {
      r: parseInt(hex[1], 16) / 15,
      g: parseInt(hex[2], 16) / 15,
      b: parseInt(hex[3], 16) / 15,
    };
  }
  return { r: 1, g: 1, b: 1 };
}

/** Get line opacity from style config (lower in filled mode). */
export function getLineOpacity(): number {
  return ORBIT_STYLE_CONFIG.style === 'filled' && ORBIT_STYLE_CONFIG.showLine
    ? (ORBIT_STYLE_CONFIG.lineOpacity ?? 0.5)
    : 1.0;
}

/** Result of closest-point search on an orbit path. */
export interface ClosestPointResult {
  closestIdx: number;
  maxDist: number;
}

/** Find closest point index and max distance from a given position. */
export function findClosestPointAndMaxDist(
  points: THREE.Vector3[],
  position: THREE.Vector3
): ClosestPointResult {
  let closestIdx = 0;
  let minDist = Infinity;
  let maxDist = 0;
  const px = position.x;
  const py = position.y;
  const pz = position.z;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - px;
    const dy = points[i].y - py;
    const dz = points[i].z - pz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
    if (dist > maxDist) maxDist = dist;
  }

  return { closestIdx, maxDist };
}

/** Compute per-vertex opacity gradient, fading orbit line away from planet. */
export function computeGradientColors(
  points: THREE.Vector3[],
  planetPos: THREE.Vector3,
  rgb: RGB,
  lineOpacity: number
): Float32Array {
  const vertexCount = points.length;
  const colors = new Float32Array(vertexCount * 3);
  const { r, g, b } = rgb;

  const { closestIdx, maxDist } = findClosestPointAndMaxDist(points, planetPos);

  const nextIdx = (closestIdx + 1) % vertexCount;
  const velX = points[nextIdx].x - points[closestIdx].x;
  const velY = points[nextIdx].y - points[closestIdx].y;
  const velZ = points[nextIdx].z - points[closestIdx].z;
  const velLen = Math.sqrt(velX * velX + velY * velY + velZ * velZ);
  const vnx = velX / velLen;
  const vny = velY / velLen;
  const vnz = velZ / velLen;

  const invMaxDist = maxDist > 0 ? 1 / maxDist : 1;
  const px = planetPos.x;
  const py = planetPos.y;
  const pz = planetPos.z;

  for (let i = 0; i < vertexCount; i++) {
    const point = points[i];
    const toDx = point.x - px;
    const toDy = point.y - py;
    const toDz = point.z - pz;
    const dist = Math.sqrt(toDx * toDx + toDy * toDy + toDz * toDz);

    if (dist < 0.001) {
      colors[i * 3] = r * lineOpacity;
      colors[i * 3 + 1] = g * lineOpacity;
      colors[i * 3 + 2] = b * lineOpacity;
      continue;
    }

    const invDist = 1 / dist;
    const dot = toDx * vnx * invDist + toDy * vny * invDist + toDz * vnz * invDist;
    const distT = Math.min(1, dist * invMaxDist);

    let opacity: number;
    if (dot < 0) {
      const fadeT = Math.abs(dot) * distT;
      opacity = ORBIT_GRADIENT_CONFIG.maxOpacity -
        (ORBIT_GRADIENT_CONFIG.maxOpacity - ORBIT_GRADIENT_CONFIG.minOpacity) * fadeT;
    } else {
      opacity = ORBIT_GRADIENT_CONFIG.maxOpacity -
        (ORBIT_GRADIENT_CONFIG.maxOpacity - ORBIT_GRADIENT_CONFIG.minOpacity) * distT * 0.3;
    }

    opacity = Math.max(ORBIT_GRADIENT_CONFIG.minOpacity, Math.min(ORBIT_GRADIENT_CONFIG.maxOpacity, opacity));
    opacity *= lineOpacity;

    colors[i * 3] = r * opacity;
    colors[i * 3 + 1] = g * opacity;
    colors[i * 3 + 2] = b * opacity;
  }

  return colors;
}
