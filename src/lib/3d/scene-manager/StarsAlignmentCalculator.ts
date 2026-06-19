import * as THREE from 'three';

/**
 * Skybox 纹理朝向校准器。
 *
 * 本模块的旋转常数 (STARS_ALIGNMENT) 是手工调整的银河系/星空贴图校准角度，
 * **仅供 skybox 纹理使用，不参与恒星/系外行星的数据坐标变换**。
 *
 * 数据坐标的对齐由帧变换层统一处理：
 *   src/lib/coordinates/frames/ecliptic.ts (icrfToEcliptic)
 *
 * @skybox_only 本模块所有输出仅影响天空盒贴图的视觉朝向，
 *             恒星物理位置、系外行星方向不受此模块影响。
 *
 * 参见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.8
 * "银河系贴图如果是艺术纹理，需要区分'纹理朝向校准'和'物理坐标变换'"
 */

const STARS_ALIGNMENT = {
  rotationX: -163.5,
  rotationY: -114.3,
  rotationZ: -252.0,
  eclipticRotation: -98.1,
};

/**
 * Skybox 纹理校准器。
 *
 * 提供与 v2 方案前一致的纹理旋转行为，但已明确标记为仅供 skybox 使用。
 * 新代码中的恒星位置计算不应依赖此模块。
 */
export class StarsAlignmentCalculator {
  /** 返回 skybox 纹理校准四元数（与魔法数一致，向后兼容） */
  calculateCombinedRotation(): THREE.Quaternion {
    const degToRad = Math.PI / 180;
    const obliquity = 23.44 * degToRad;
    const extraQuat = this.createExtraRotationQuaternion(degToRad);
    const eclipticNormal = this.calculateEclipticNormal(obliquity);
    const eclipticQuat = this.createEclipticRotationQuaternion(eclipticNormal, extraQuat, degToRad);
    return eclipticQuat.multiply(extraQuat);
  }

  /** @alias calculateCombinedRotation */
  getAlignmentQuaternion(): THREE.Quaternion {
    return this.calculateCombinedRotation();
  }

  private createExtraRotationQuaternion(degToRad: number): THREE.Quaternion {
    const extraEuler = new THREE.Euler(
      STARS_ALIGNMENT.rotationX * degToRad,
      STARS_ALIGNMENT.rotationY * degToRad,
      STARS_ALIGNMENT.rotationZ * degToRad,
      'XYZ'
    );
    return new THREE.Quaternion().setFromEuler(extraEuler);
  }

  private calculateEclipticNormal(obliquity: number): THREE.Vector3 {
    return new THREE.Vector3(0, Math.cos(obliquity), Math.sin(obliquity)).normalize();
  }

  private createEclipticRotationQuaternion(
    eclipticNormal: THREE.Vector3,
    extraQuat: THREE.Quaternion,
    degToRad: number
  ): THREE.Quaternion {
    const transformedNormal = eclipticNormal.clone().applyQuaternion(extraQuat);
    return new THREE.Quaternion().setFromAxisAngle(
      transformedNormal,
      STARS_ALIGNMENT.eclipticRotation * degToRad
    );
  }
}
