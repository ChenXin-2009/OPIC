import * as THREE from 'three';
import { PlumeRenderer } from './PlumeRenderer';

const METERS_PER_AU = 149_597_870_700;
const ROCKET_HEIGHT_AU = 70 / METERS_PER_AU;
const BODY_AXIS = new THREE.Vector3(0, 1, 0);

function visibleMaterial(color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
  });
}

/** 火箭底部锚定在物理位置；远距离仅按视觉 LOD 放大，不改变轨道坐标。 */
export class RocketRenderer {
  private readonly group: THREE.Group;
  private readonly plume: PlumeRenderer;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SpaceFlightRocket';
    this.group.renderOrder = 100;

    const bodyHeight = ROCKET_HEIGHT_AU * 0.8;
    const bodyRadius = 2.1 / METERS_PER_AU;
    const noseHeight = ROCKET_HEIGHT_AU * 0.2;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius, bodyRadius * 1.08, bodyHeight, 12),
      visibleMaterial('#dbe4ff'),
    );
    body.position.y = bodyHeight / 2;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(bodyRadius, noseHeight, 12),
      visibleMaterial('#93c5fd'),
    );
    nose.position.y = bodyHeight + noseHeight / 2;

    for (let index = 0; index < 4; index += 1) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(3.6 / METERS_PER_AU, 9 / METERS_PER_AU, 0.7 / METERS_PER_AU),
        visibleMaterial('#64748b'),
      );
      fin.position.set(0, 7 / METERS_PER_AU, 0);
      fin.rotation.y = (Math.PI / 2) * index;
      this.group.add(fin);
    }

    this.plume = new PlumeRenderer();
    this.group.add(body, nose, this.plume.getObject());
    this.group.visible = false;
  }

  getObject(): THREE.Group {
    return this.group;
  }

  getPlumeVisible(): boolean {
    return this.plume.getObject().visible;
  }

  setState(
    position: THREE.Vector3,
    thrustDirection: THREE.Vector3,
    plumeActive: boolean,
    throttlePercent: number,
    visualScale: number,
  ): void {
    this.group.visible = true;
    this.group.position.copy(position);
    this.group.scale.setScalar(visualScale);

    const direction = thrustDirection.lengthSq() < 1e-12
      ? BODY_AXIS
      : thrustDirection.clone().normalize();
    this.group.quaternion.setFromUnitVectors(BODY_AXIS, direction);
    this.plume.setState(plumeActive, throttlePercent);
  }

  hide(): void {
    this.group.visible = false;
    this.plume.setState(false, 0);
  }

  dispose(): void {
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
      else mesh.material?.dispose();
    });
  }
}

export function cameraDistanceToRocketScale(distanceAU: number): number {
  const desiredHeightAU = THREE.MathUtils.clamp(
    distanceAU * 0.025,
    ROCKET_HEIGHT_AU,
    30_000 / METERS_PER_AU,
  );
  return desiredHeightAU / ROCKET_HEIGHT_AU;
}
