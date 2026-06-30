import * as THREE from 'three';

export interface BodyState {
  name: string;
  gm: number;
  x: number;
  y: number;
  z: number;
}

export type GizmoMode = 'none' | 'translate' | 'rotate';

export interface GridConfig {
  segments: number;
  anchorBody: string;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  exaggeration: number;
  opacity: number;
  gizmoMode: GizmoMode;
  detectedBodies: string[]; // empty = include all bodies with GM
}

export const ALL_BODY_IDS = [
  'sun', 'mercury', 'venus', 'earth', 'moon', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune',
  'io', 'europa', 'ganymede', 'callisto',
  'titan', 'enceladus',
  'miranda', 'ariel', 'umbriel', 'titania',
];

export const DEFAULT_GRID_CONFIG: GridConfig = {
  segments: 48,
  anchorBody: 'earth',
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scaleX: 0.02,
  scaleY: 0.02,
  exaggeration: 30,
  opacity: 0.9,
  gizmoMode: 'none',
  detectedBodies: [],
};

const MIN_DISTANCE_AU = 1e-8;

export function calcPotential(point: THREE.Vector3, bodies: BodyState[]): number {
  let phi = 0;
  const len = bodies.length;
  for (let i = 0; i < len; i++) {
    const body = bodies[i];
    const dx = point.x - body.x;
    const dy = point.y - body.y;
    const dz = point.z - body.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const clampedDist = dist < MIN_DISTANCE_AU ? MIN_DISTANCE_AU : dist;
    phi -= body.gm / clampedDist;
  }
  return phi;
}

export function normalizePotentials(potentials: Float64Array, count: number): Float32Array {
  if (count === 0) return new Float32Array(0);

  // streaming min/max — O(n), no sort
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < count; i++) {
    const v = potentials[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min;
  const normalized = new Float32Array(count);
  if (range === 0) return normalized;

  for (let i = 0; i < count; i++) {
    normalized[i] = (potentials[i] - min) / range;
  }
  return normalized;
}

export function potentialToColor(t: number): [number, number, number] {
  if (t < 0.15) {
    const r = t / 0.15;
    return [0, 0, 0.2 + r * 0.4];
  } else if (t < 0.30) {
    const r = (t - 0.15) / 0.15;
    return [0, r * 0.8, 0.6 + r * 0.4];
  } else if (t < 0.50) {
    const r = (t - 0.30) / 0.20;
    return [0, 0.8 + r * 0.2, 1.0 - r * 0.7];
  } else if (t < 0.70) {
    const r = (t - 0.50) / 0.20;
    return [r * 0.8, 1.0 - r * 0.2, 0.3 * (1 - r)];
  } else if (t < 0.90) {
    const r = (t - 0.70) / 0.20;
    return [0.8 + r * 0.2, 0.8 - r * 0.6, 0];
  } else {
    const r = (t - 0.90) / 0.10;
    return [1.0, 0.2 + r * 0.8, r];
  }
}
