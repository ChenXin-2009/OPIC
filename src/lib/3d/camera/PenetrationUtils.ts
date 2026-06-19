/**
 * 相机穿透防止工具 (Penetration Prevention Utils)
 *
 * 提供相机在操作过程中防止穿透天体表面的工具函数。
 * 当相机位置过于接近天体时，自动将相机推回安全距离。
 */

import * as THREE from 'three';

/**
 * 四次方缓出（easeOutQuart）缓动函数
 */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * 输入操作期间的实时防穿透检测
 */
export function preventPenetrationDuringInput(
  proposedCameraPosition: THREE.Vector3,
  center: THREE.Vector3,
  currentTargetRadius: number | null,
  safetyDistanceMultiplier: number,
): THREE.Vector3 {
  if (!currentTargetRadius) return proposedCameraPosition;

  const minSafeDistance = currentTargetRadius * safetyDistanceMultiplier;
  const distanceToCenter = proposedCameraPosition.distanceTo(center);

  if (distanceToCenter < minSafeDistance) {
    const direction = new THREE.Vector3()
      .subVectors(proposedCameraPosition, center)
      .normalize();

    if (direction.length() < 0.001) {
      direction.set(0, 0.5, 1).normalize();
    }

    return center.clone().add(direction.multiplyScalar(minSafeDistance));
  }

  return proposedCameraPosition;
}
