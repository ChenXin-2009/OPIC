import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { getGravitationalParameterAU } from '@/lib/3d/player/gravity';
import {
  calcPotential,
  normalizePotentials,
  potentialToColor,
  type GridConfig,
  type BodyState,
  type GizmoMode,
} from './GravityFieldCalculator';

export class GravityGridRenderer {
  readonly group: THREE.Group;
  lineSegments: THREE.LineSegments;
  private config: GridConfig;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private localPotentials: Float64Array = new Float64Array(0);
  private vertexWorldPos = new THREE.Vector3();
  private worldMatrix = new THREE.Matrix4();

  // Gizmo
  private transformControls: TransformControls | null = null;
  private gizmoMode: GizmoMode = 'none';
  private gizmoActive = false;
  private anchorWorldPos: THREE.Vector3 | null = null;

  // Performance: frame throttle + cached scratch array
  private updateCounter = 0;
  private readonly UPDATE_INTERVAL = 2;
  private scratchPos = new Float32Array(0);

  constructor(initialConfig: GridConfig) {
    this.config = { ...initialConfig };

    this.group = new THREE.Group();
    this.group.name = 'GravityDynamicPlaneGroup';

    const seg = this.config.segments;
    const vertexCount = 2 * (seg + 1) * seg * 2;
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    this.localPotentials = new Float64Array(vertexCount);

    let offset = 0;
    for (let j = 0; j <= seg; j++) {
      const y = (j / seg) - 0.5;
      for (let i = 0; i < seg; i++) {
        const x1 = (i / seg) - 0.5;
        const x2 = ((i + 1) / seg) - 0.5;
        positions[offset * 3] = x1;
        positions[offset * 3 + 1] = y;
        positions[offset * 3 + 2] = 0;
        positions[offset * 3 + 3] = x2;
        positions[offset * 3 + 4] = y;
        positions[offset * 3 + 5] = 0;
        offset += 2;
      }
    }

    for (let i = 0; i <= seg; i++) {
      const x = (i / seg) - 0.5;
      for (let j = 0; j < seg; j++) {
        const y1 = (j / seg) - 0.5;
        const y2 = ((j + 1) / seg) - 0.5;
        positions[offset * 3] = x;
        positions[offset * 3 + 1] = y1;
        positions[offset * 3 + 2] = 0;
        positions[offset * 3 + 3] = x;
        positions[offset * 3 + 4] = y2;
        positions[offset * 3 + 5] = 0;
        offset += 2;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.config.opacity,
      depthWrite: false,
    });

    this.lineSegments = new THREE.LineSegments(this.geometry, this.material);
    this.lineSegments.name = 'GravityGrid';
    this.group.add(this.lineSegments);

    this.applyPlaneTransform();
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  setTransformControls(controls: TransformControls): void {
    this.transformControls = controls;
  }

  getGizmoMode(): GizmoMode {
    return this.gizmoMode;
  }

  setGizmoMode(mode: GizmoMode): void {
    this.gizmoMode = mode;
    if (!this.transformControls) return;

    if (mode === 'none') {
      this.transformControls.detach();
      this.gizmoActive = false;
      return;
    }

    this.transformControls.setMode(mode);
    this.transformControls.attach(this.lineSegments);
    this.transformControls.setSize(0.8);
    this.transformControls.setSpace('world');
  }

  readGizmoTransform(): void {
    if (this.gizmoMode === 'none' || !this.gizmoActive) return;
    const pos = this.lineSegments.position;
    const rot = this.lineSegments.rotation;
    if (this.anchorWorldPos) {
      this.config.posX = pos.x - this.anchorWorldPos.x;
      this.config.posY = pos.y - this.anchorWorldPos.y;
      this.config.posZ = pos.z - this.anchorWorldPos.z;
    } else {
      this.config.posX = pos.x;
      this.config.posY = pos.y;
      this.config.posZ = pos.z;
    }
    this.config.rotX = THREE.MathUtils.radToDeg(rot.x);
    this.config.rotY = THREE.MathUtils.radToDeg(rot.y);
    this.config.rotZ = THREE.MathUtils.radToDeg(rot.z);
  }

  getGizmoActive(): boolean {
    return this.gizmoActive;
  }

  setGizmoActive(active: boolean): void {
    this.gizmoActive = active;
  }

  updateConfig(newConfig: GridConfig): void {
    const resolutionChanged = this.config.segments !== newConfig.segments;
    const gizmoModeChanged = this.config.gizmoMode !== newConfig.gizmoMode;
    this.config.gizmoMode = newConfig.gizmoMode;
    this.config = { ...newConfig };

    if (resolutionChanged) {
      this.rebuildGridGeometry();
    } else if (!this.gizmoActive) {
      this.applyPlaneTransform();
    }

    if (gizmoModeChanged) {
      this.gizmoMode = newConfig.gizmoMode;
    }
  }

  private rebuildGridGeometry(): void {
    this.group.remove(this.lineSegments);
    this.geometry.dispose();
    this.material.dispose();

    const seg = this.config.segments;
    const vertexCount = 2 * (seg + 1) * seg * 2;
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    this.localPotentials = new Float64Array(vertexCount);

    let offset = 0;
    for (let j = 0; j <= seg; j++) {
      const y = (j / seg) - 0.5;
      for (let i = 0; i < seg; i++) {
        const x1 = (i / seg) - 0.5;
        const x2 = ((i + 1) / seg) - 0.5;
        positions[offset * 3] = x1;
        positions[offset * 3 + 1] = y;
        positions[offset * 3 + 2] = 0;
        positions[offset * 3 + 3] = x2;
        positions[offset * 3 + 4] = y;
        positions[offset * 3 + 5] = 0;
        offset += 2;
      }
    }
    for (let i = 0; i <= seg; i++) {
      const x = (i / seg) - 0.5;
      for (let j = 0; j < seg; j++) {
        const y1 = (j / seg) - 0.5;
        const y2 = ((j + 1) / seg) - 0.5;
        positions[offset * 3] = x;
        positions[offset * 3 + 1] = y1;
        positions[offset * 3 + 2] = 0;
        positions[offset * 3 + 3] = x;
        positions[offset * 3 + 4] = y2;
        positions[offset * 3 + 5] = 0;
        offset += 2;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.config.opacity,
      depthWrite: false,
    });

    const newLineSegments = new THREE.LineSegments(this.geometry, this.material);
    newLineSegments.name = 'GravityGrid';
    newLineSegments.position.copy(this.lineSegments.position);
    newLineSegments.rotation.copy(this.lineSegments.rotation);
    newLineSegments.scale.copy(this.lineSegments.scale);

    this.group.remove(this.lineSegments);
    this.lineSegments = newLineSegments;
    this.group.add(this.lineSegments);

    if (this.transformControls && this.gizmoMode !== 'none') {
      this.transformControls.detach();
      this.transformControls.attach(this.lineSegments);
    }
  }

  private applyPlaneTransform(): void {
    this.lineSegments.position.set(this.config.posX, this.config.posY, this.config.posZ);
    this.lineSegments.rotation.set(
      THREE.MathUtils.degToRad(this.config.rotX),
      THREE.MathUtils.degToRad(this.config.rotY),
      THREE.MathUtils.degToRad(this.config.rotZ),
    );
    this.lineSegments.scale.set(this.config.scaleX, this.config.scaleY, 1.0);
    this.lineSegments.updateMatrixWorld(true);
  }

  update(rawBodies: Array<{ name: string; x: number; y: number; z: number }>, camera: THREE.Camera): void {
    if (!this.lineSegments || !this.geometry || !this.material) return;

    const bodiesSnapshot: BodyState[] = [];
    const whitelist = this.config.detectedBodies;
    const useWhitelist = whitelist.length > 0;
    for (let i = 0; i < rawBodies.length; i++) {
      const b = rawBodies[i];
      const gm = getGravitationalParameterAU(b.name);
      if (gm !== null) {
        const name = b.name.toLowerCase();
        if (useWhitelist && !whitelist.includes(name)) continue;
        bodiesSnapshot.push({ name, gm, x: b.x, y: b.y, z: b.z });
      }
    }

    // Track anchor body world position for gizmo offset calculation
    if (this.config.anchorBody && this.config.anchorBody !== 'none') {
      const ab = bodiesSnapshot.find(b => b.name === this.config.anchorBody.toLowerCase());
      this.anchorWorldPos = ab ? new THREE.Vector3(ab.x, ab.y, ab.z) : null;
    } else {
      this.anchorWorldPos = null;
    }

    // When gizmo is active, skip anchor override so user's transform is preserved
    if (!this.gizmoActive && this.anchorWorldPos) {
      this.lineSegments.position.set(
        this.anchorWorldPos.x + this.config.posX,
        this.anchorWorldPos.y + this.config.posY,
        this.anchorWorldPos.z + this.config.posZ,
      );
      this.lineSegments.updateMatrixWorld(true);
    }

    // Frame throttle: skip vertex computation every other frame
    this.updateCounter++;
    if (this.updateCounter % this.UPDATE_INTERVAL !== 0) return;

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const count = posAttr.count;

    // Ensure scratch buffer is large enough
    if (this.scratchPos.length < count * 3) {
      this.scratchPos = new Float32Array(count * 3);
    }

    this.worldMatrix.copy(this.lineSegments.matrixWorld);

    // Read positions once into scratch array for fast bulk access
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.scratchPos[i3] = posArray[i3];
      this.scratchPos[i3 + 1] = posArray[i3 + 1];
      this.scratchPos[i3 + 2] = 0;
    }

    // Compute world positions and potentials
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.vertexWorldPos.set(this.scratchPos[i3], this.scratchPos[i3 + 1], this.scratchPos[i3 + 2]);
      this.vertexWorldPos.applyMatrix4(this.worldMatrix);
      this.localPotentials[i] = calcPotential(this.vertexWorldPos, bodiesSnapshot);
    }

    const normalized = normalizePotentials(this.localPotentials, count);

    const gridSize = Math.max(this.config.scaleX, this.config.scaleY);
    const zScale = gridSize * 0.1;
    const exaggeration = this.config.exaggeration;

    // Write Z displacement and colors directly to attribute arrays
    const colorArray = colorAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = normalized[i];
      posArray[i3 + 2] = (t - 1.0) * exaggeration * zScale;
      const [r, g, b] = potentialToColor(t);
      colorArray[i3] = r;
      colorArray[i3 + 1] = g;
      colorArray[i3 + 2] = b;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    const gridCenter = new THREE.Vector3().setFromMatrixPosition(this.worldMatrix);
    const distance = camera.position.distanceTo(gridCenter);
    const maxViewDist = Math.max(this.config.scaleX, this.config.scaleY) * 20.0;
    if (distance > maxViewDist) {
      this.material.opacity = Math.max(0, this.config.opacity * (1.0 - (distance - maxViewDist) / maxViewDist));
    } else {
      this.material.opacity = this.config.opacity;
    }
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    if (this.transformControls) {
      this.transformControls.detach();
      this.transformControls.dispose();
      this.transformControls = null;
    }
  }
}
