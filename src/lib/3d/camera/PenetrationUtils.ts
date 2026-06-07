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
