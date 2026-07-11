/** ECI / ECEF conversion shared by the flight renderer and the Cesium camera. */

import { computeGMST } from '@/lib/data/launch-sites';

function rotateZ(vector: readonly [number, number, number], angle: number): [number, number, number] {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return [
    vector[0] * cosA + vector[1] * sinA,
    -vector[0] * sinA + vector[1] * cosA,
    vector[2],
  ];
}

export function eciToEcef(
  positionEci: readonly [number, number, number],
  absoluteTimeMs: number,
): [number, number, number] {
  return rotateZ(positionEci, computeGMST(new Date(absoluteTimeMs)));
}

export function eciDirectionToEcef(
  directionEci: readonly [number, number, number],
  absoluteTimeMs: number,
): [number, number, number] {
  return rotateZ(directionEci, computeGMST(new Date(absoluteTimeMs)));
}

/**
 * 将惯性系速度转换为地固系速度。除旋转速度外还必须减去地球自转项，
 * 否则静止在发射架上的火箭会被误判为横向高速移动，导致跟随镜头抖动。
 */
export function eciVelocityToEcef(
  velocityEci: readonly [number, number, number],
  positionEcef: readonly [number, number, number],
  absoluteTimeMs: number,
): [number, number, number] {
  const [vx, vy, vz] = eciDirectionToEcef(velocityEci, absoluteTimeMs);
  const earthAngularVelocity = 7.2921159e-5;
  return [
    vx + earthAngularVelocity * positionEcef[1],
    vy - earthAngularVelocity * positionEcef[0],
    vz,
  ];
}
