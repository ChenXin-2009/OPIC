import * as THREE from 'three';

const METERS_PER_AU = 149_597_870_700;
const BASE_PLUME_LENGTH = 42 / METERS_PER_AU;

export class PlumeRenderer {
  private readonly mesh: THREE.Mesh;

  constructor() {
    const geometry = new THREE.ConeGeometry(2.5 / METERS_PER_AU, BASE_PLUME_LENGTH, 10, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: '#ff8a3d',
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'SpaceFlightPlume';
    this.mesh.visible = false;
    this.mesh.position.set(0, -BASE_PLUME_LENGTH / 2, 0);
    this.mesh.rotation.x = Math.PI;
  }

  getObject(): THREE.Mesh {
    return this.mesh;
  }

  setState(active: boolean, throttlePercent: number): void {
    this.mesh.visible = active;
    if (!active) return;

    const throttle = Math.max(0, Math.min(1, throttlePercent / 100));
    const scale = 0.45 + throttle * 1.55;
    this.mesh.scale.setScalar(scale);

    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.3 + throttle * 0.55;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
