/**
 * @module mods/space-flight/flight-coordinate-transform
 * @description 航天飞行坐标系转换工具。
 *
 * 在 ECI（地心惯性系）与 ECEF（地心地固系）之间转换位置、方向和速度，
 * 供飞行渲染器和 Cesium 相机共同使用。转换基于格林威治恒星时 (GMST)
 * 绕 Z 轴旋转，速度转换额外扣除地球自转带来的牵连速度。
 */

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

/**
 * 将 ECI 坐标系下的位置矢量转换为 ECEF 坐标系。
 * 通过绕 Z 轴旋转 GMST 角度实现——ECI 与 ECEF 共享 Z 轴（极轴），
 * 差异仅在于绕 Z 轴的地球自转相位。
 * @param positionEci - ECI 位置矢量 [x, y, z]，单位米
 * @param absoluteTimeMs - 绝对时间戳（Date.now() 格式），单位毫秒
 * @returns ECEF 位置矢量 [x, y, z]，单位米
 */
export function eciToEcef(
  positionEci: readonly [number, number, number],
  absoluteTimeMs: number,
): [number, number, number] {
  return rotateZ(positionEci, computeGMST(new Date(absoluteTimeMs)));
}

/**
 * 将 ECI 坐标系下的方向矢量转换为 ECEF 坐标系。
 * 与位置转换相同，仅执行绕 Z 轴的 GMST 旋转。
 * @param directionEci - ECI 方向矢量 [x, y, z]（通常为单位矢量）
 * @param absoluteTimeMs - 绝对时间戳，单位毫秒
 * @returns ECEF 方向矢量 [x, y, z]
 */
export function eciDirectionToEcef(
  directionEci: readonly [number, number, number],
  absoluteTimeMs: number,
): [number, number, number] {
  return rotateZ(directionEci, computeGMST(new Date(absoluteTimeMs)));
}

/**
 * 将惯性系速度转换为地固系速度。
 * 除方向旋转外还必须减去地球自转的牵连速度（ω × r），否则静止在发射架上
 * 的火箭会被误判为横向高速移动，导致跟随镜头抖动。
 * @param velocityEci - ECI 速度矢量 [x, y, z]，单位米/秒
 * @param positionEcef - 对应位置的 ECEF 坐标 [x, y, z]，单位米（用于计算牵连速度）
 * @param absoluteTimeMs - 绝对时间戳，单位毫秒
 * @returns ECEF 速度矢量 [x, y, z]，单位米/秒
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
