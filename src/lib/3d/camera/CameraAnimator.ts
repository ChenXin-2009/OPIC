import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraAnimator {
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;

  // Polar angle transition
  private isPolarAngleTransitioning: boolean = false;
  private targetPolarAngle: number = 0;
  private currentPolarAngle: number = 0;
  private polarAngleTransitionSpeed: number = 0.08;

  // Azimuthal angle transition
  private isAzimuthalAngleTransitioning: boolean = false;
  private targetAzimuthalAngle: number = 0;
  private currentAzimuthalAngle: number = 0;
  private azimuthalAngleTransitionSpeed: number = 0.08;

  // FOV transition
  private targetFov: number;
  private currentFov: number;
  private isFovTransitioning: boolean = false;
  private fovTransitionSpeed: number = 1.0;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls, defaultFov: number) {
    this.camera = camera;
    this.controls = controls;
    this.targetFov = defaultFov;
    this.currentFov = defaultFov;
  }

  setPolarAngle(angle: number, smooth = false) {
    let normalizedAngle = angle;
    if (normalizedAngle < 0) {
      normalizedAngle = 180 + normalizedAngle;
    }
    if (normalizedAngle >= 360) {
      normalizedAngle = normalizedAngle % 360;
    }
    if (normalizedAngle > 180) {
      normalizedAngle = 360 - normalizedAngle;
    }

    const angleRad = normalizedAngle * (Math.PI / 180);

    if (!isFinite(angleRad)) {
      console.warn('CameraAnimator.setPolarAngle: Invalid angle value', angle);
      return;
    }

    this.controls.update();

    const controlsAny = this.controls as any;

    if (!smooth) {
      if (controlsAny.spherical) {
        controlsAny.spherical.phi = angleRad;
        this.controls.update();
      } else {
        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        const currentAzimuthalAngle = this.controls.getAzimuthalAngle();
        const newPosition = new THREE.Vector3();
        newPosition.x = currentDistance * Math.sin(angleRad) * Math.cos(currentAzimuthalAngle);
        newPosition.y = currentDistance * Math.cos(angleRad);
        newPosition.z = currentDistance * Math.sin(angleRad) * Math.sin(currentAzimuthalAngle);
        newPosition.add(this.controls.target);
        this.camera.position.copy(newPosition);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      }
      this.currentPolarAngle = angleRad;
      this.targetPolarAngle = angleRad;
      this.isPolarAngleTransitioning = false;
      return;
    }

    this.targetPolarAngle = angleRad;
    this.isPolarAngleTransitioning = true;
    const ctrl = this.controls as any;
    this.currentPolarAngle = ctrl.spherical ? ctrl.spherical.phi : this.controls.getPolarAngle();
  }

  setAzimuthalAngle(angle: number, smooth = false) {
    let normalizedAngle = angle;
    while (normalizedAngle < -180) normalizedAngle += 360;
    while (normalizedAngle >= 180) normalizedAngle -= 360;

    const angleRad = normalizedAngle * (Math.PI / 180);

    if (!isFinite(angleRad)) {
      console.warn('CameraAnimator.setAzimuthalAngle: Invalid angle value', angle);
      return;
    }

    this.controls.update();

    const controlsAny = this.controls as any;

    if (!smooth) {
      if (controlsAny.spherical) {
        const currentAngle = controlsAny.spherical.theta;
        let normalizedCurrent = currentAngle;
        while (normalizedCurrent > Math.PI) normalizedCurrent -= 2 * Math.PI;
        while (normalizedCurrent < -Math.PI) normalizedCurrent += 2 * Math.PI;

        let angleDiff = angleRad - normalizedCurrent;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const finalAngle = normalizedCurrent + angleDiff;

        const oldEnableDamping = this.controls.enableDamping;
        this.controls.enableDamping = false;

        controlsAny.spherical.theta = finalAngle;
        this.controls.update();

        this.controls.enableDamping = oldEnableDamping;
      } else {
        const currentAngle = this.controls.getAzimuthalAngle();
        let normalizedCurrent = currentAngle;
        while (normalizedCurrent > Math.PI) normalizedCurrent -= 2 * Math.PI;
        while (normalizedCurrent < -Math.PI) normalizedCurrent += 2 * Math.PI;

        let angleDiff = angleRad - normalizedCurrent;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const finalAngle = normalizedCurrent + angleDiff;

        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        const currentPolarAngle = this.controls.getPolarAngle();
        const newPosition = new THREE.Vector3();
        newPosition.x = currentDistance * Math.sin(currentPolarAngle) * Math.cos(finalAngle);
        newPosition.y = currentDistance * Math.cos(currentPolarAngle);
        newPosition.z = currentDistance * Math.sin(currentPolarAngle) * Math.sin(finalAngle);
        newPosition.add(this.controls.target);
        this.camera.position.copy(newPosition);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      }
      this.currentAzimuthalAngle = angleRad;
      this.targetAzimuthalAngle = angleRad;
      this.isAzimuthalAngleTransitioning = false;
      return;
    }

    this.targetAzimuthalAngle = angleRad;
    this.isAzimuthalAngleTransitioning = true;
    this.controls.update();
    const ctrl = this.controls as any;
    const currentAngle = ctrl.spherical ? ctrl.spherical.theta : this.controls.getAzimuthalAngle();
    let normalizedCurrent = currentAngle;
    while (normalizedCurrent > Math.PI) normalizedCurrent -= 2 * Math.PI;
    while (normalizedCurrent < -Math.PI) normalizedCurrent += 2 * Math.PI;
    let angleDiff = angleRad - normalizedCurrent;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    this.currentAzimuthalAngle = normalizedCurrent;
  }

  setFov(fov: number, smooth = false) {
    if (!isFinite(fov) || fov <= 0 || fov >= 180) {
      console.warn('CameraAnimator.setFov: Invalid FOV value', fov);
      return;
    }

    if (smooth) {
      this.targetFov = fov;
      this.isFovTransitioning = true;
      this.currentFov = this.camera.fov;
    } else {
      this.camera.fov = fov;
      this.currentFov = fov;
      this.targetFov = fov;
      this.isFovTransitioning = false;
      this.camera.updateProjectionMatrix();
    }
  }

  getFov(): number {
    return this.camera.fov;
  }

  /** @returns true if any transition is still active */
  update(deltaTime: number): boolean {
    let active = false;

    // FOV transition
    if (this.isFovTransitioning) {
      const fovDiff = this.targetFov - this.currentFov;
      if (Math.abs(fovDiff) > 0.1) {
        this.currentFov += fovDiff * this.fovTransitionSpeed;
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
        active = true;
      } else {
        this.currentFov = this.targetFov;
        this.camera.fov = this.targetFov;
        this.isFovTransitioning = false;
        this.camera.updateProjectionMatrix();
      }
    }

    // Azimuthal angle transition
    if (this.isAzimuthalAngleTransitioning) {
      let angleDiff = this.targetAzimuthalAngle - this.currentAzimuthalAngle;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) > 0.01) {
        this.currentAzimuthalAngle += angleDiff * this.azimuthalAngleTransitionSpeed;
        if (this.currentAzimuthalAngle > Math.PI) this.currentAzimuthalAngle -= 2 * Math.PI;
        if (this.currentAzimuthalAngle < -Math.PI) this.currentAzimuthalAngle += 2 * Math.PI;

        const controlsAny = this.controls as any;
        if (controlsAny.spherical) {
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          controlsAny.spherical.theta = this.currentAzimuthalAngle;
          this.controls.update();
          this.controls.enableDamping = oldEnableDamping;
        } else {
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentPolarAngle = this.controls.getPolarAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(currentPolarAngle) * Math.cos(this.currentAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(currentPolarAngle);
          newPosition.z = currentDistance * Math.sin(currentPolarAngle) * Math.sin(this.currentAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
        active = true;
      } else {
        this.currentAzimuthalAngle = this.targetAzimuthalAngle;
        const controlsAny = this.controls as any;
        if (controlsAny.spherical) {
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          controlsAny.spherical.theta = this.targetAzimuthalAngle;
          this.controls.update();
          this.controls.enableDamping = oldEnableDamping;
        } else {
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentPolarAngle = this.controls.getPolarAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(currentPolarAngle) * Math.cos(this.targetAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(currentPolarAngle);
          newPosition.z = currentDistance * Math.sin(currentPolarAngle) * Math.sin(this.targetAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
        this.isAzimuthalAngleTransitioning = false;
      }
    }

    // Polar angle transition
    if (this.isPolarAngleTransitioning) {
      const angleDiff = this.targetPolarAngle - this.currentPolarAngle;
      if (Math.abs(angleDiff) > 0.01) {
        this.currentPolarAngle += angleDiff * this.polarAngleTransitionSpeed;
        this.currentPolarAngle = Math.max(0, Math.min(Math.PI, this.currentPolarAngle));

        const controlsAny = this.controls as any;
        if (controlsAny.spherical) {
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          controlsAny.spherical.phi = this.currentPolarAngle;
          this.controls.update();
          this.controls.enableDamping = oldEnableDamping;
        } else {
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentAzimuthalAngle = this.controls.getAzimuthalAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(this.currentPolarAngle) * Math.cos(currentAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(this.currentPolarAngle);
          newPosition.z = currentDistance * Math.sin(this.currentPolarAngle) * Math.sin(currentAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
        active = true;
      } else {
        this.currentPolarAngle = this.targetPolarAngle;
        const controlsAny = this.controls as any;
        if (controlsAny.spherical) {
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          controlsAny.spherical.phi = this.targetPolarAngle;
          this.controls.update();
          this.controls.enableDamping = oldEnableDamping;
        } else {
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentAzimuthalAngle = this.controls.getAzimuthalAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(this.targetPolarAngle) * Math.cos(currentAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(this.targetPolarAngle);
          newPosition.z = currentDistance * Math.sin(this.targetPolarAngle) * Math.sin(currentAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
        this.isPolarAngleTransitioning = false;
      }
    }

    return active;
  }
}
