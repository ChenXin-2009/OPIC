/**
 * 太阳系 3D 场景配置 (Solar System 3D Config)
 *
 * - ROTATION_SPEEDS: 各天体自转角速度（弧度/帧）
 * - CAMERA_ANGLE_CONFIG: 初始和目标相机角度参数
 */

export const ROTATION_SPEEDS: Record<string, number> = {
  mercury: 0.000000124,
  venus: -0.000000116,
  earth: 0.0000727,
  mars: 0.0000709,
  jupiter: 0.000175,
  saturn: 0.000164,
  uranus: 0.000101,
  neptune: 0.000108,
  sun: 0.000000725,
};

export const CAMERA_ANGLE_CONFIG = {
  initialPolarAngle: 90,
  initialAzimuthalAngle: 90,
  targetPolarAngle: 160,
  targetAzimuthalAngle: 0,
  transitionDelay: 500,
  smoothTransition: true,
};
