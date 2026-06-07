import * as THREE from 'three';

const STARS_ALIGNMENT = {
  rotationX: -163.5,
  rotationY: -114.3,
  rotationZ: -252.0,
  eclipticRotation: -98.1,
};

export class StarsAlignmentCalculator {
  calculateCombinedRotation(): THREE.Quaternion {
    const degToRad = Math.PI / 180;
    const obliquity = 23.44 * degToRad;
    const extraQuat = this.createExtraRotationQuaternion(degToRad);
    const eclipticNormal = this.calculateEclipticNormal(obliquity);
    const eclipticQuat = this.createEclipticRotationQuaternion(eclipticNormal, extraQuat, degToRad);
    return eclipticQuat.multiply(extraQuat);
  }

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
