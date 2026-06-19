import * as THREE from 'three';
import { PLANET_GRID_CONFIG } from '@/lib/config/visualConfig';

export class PlanetGrid {
  private group: THREE.Group | null = null;
  private parentObject: THREE.Object3D;
  private realRadius: number;

  constructor(parentObject: THREE.Object3D, realRadius: number) {
    this.parentObject = parentObject;
    this.realRadius = realRadius;
  }

  create(): void {
    const cfg = PLANET_GRID_CONFIG;
    const radius = this.realRadius;
    const outward = radius * (cfg.outwardOffset || 0.002);
    const segs = Math.max(12, cfg.segments || 96);

    this.group = new THREE.Group();

    const gridColor = new THREE.Color(cfg.color);
    gridColor.multiplyScalar(cfg.opacity);

    const lineMat = new THREE.LineBasicMaterial({
      color: gridColor,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });

    for (let i = 0; i < cfg.meridians; i++) {
      const lon = (i / cfg.meridians) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= segs; j++) {
        const lat = -Math.PI / 2 + (j / segs) * Math.PI;
        const r = radius + outward;
        pts.push(new THREE.Vector3(
          r * Math.cos(lat) * Math.cos(lon),
          r * Math.sin(lat),
          r * Math.cos(lat) * Math.sin(lon)
        ));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, lineMat);
      this.group.add(line);
    }

    for (let i = 1; i <= cfg.parallels; i++) {
      const lat = -Math.PI / 2 + (i / (cfg.parallels + 1)) * Math.PI;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= segs; j++) {
        const lon = (j / segs) * Math.PI * 2;
        const r = radius + outward;
        pts.push(new THREE.Vector3(
          r * Math.cos(lat) * Math.cos(lon),
          r * Math.sin(lat),
          r * Math.cos(lat) * Math.sin(lon)
        ));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, lineMat);
      this.group.add(line);
    }

    if (this.group) {
      this.parentObject.add(this.group);
      this.group.position.set(0, 0, 0);
      this.group.renderOrder = 1;
    }
  }

  setVisible(visible: boolean): void {
    if (this.group) this.group.visible = visible;
  }

  getVisible(): boolean {
    return this.group ? this.group.visible : false;
  }

  updateVisibility(distance: number): void {
    if (!this.group) return;

    const minDistance = this.realRadius * 2;
    const maxDistance = this.realRadius * 50;

    let brightness = PLANET_GRID_CONFIG.opacity;
    if (distance > minDistance) {
      const fadeRange = maxDistance - minDistance;
      const fadeProgress = Math.min(1, (distance - minDistance) / fadeRange);
      brightness = PLANET_GRID_CONFIG.opacity * (1 - fadeProgress * 0.7);
    }

    const baseColor = new THREE.Color(PLANET_GRID_CONFIG.color);
    const adjustedColor = baseColor.clone().multiplyScalar(brightness);

    this.group.traverse((child) => {
      if (child instanceof THREE.Line) {
        const material = child.material as THREE.LineBasicMaterial;
        if (material) {
          material.color.copy(adjustedColor);
          material.needsUpdate = true;
        }
      }
    });
  }

  dispose(): void {
    if (this.group) {
      this.group.traverse((c) => {
        if ((c as any).geometry) (c as any).geometry.dispose();
        if ((c as any).material) (c as any).material.dispose();
      });
      if (this.group.parent) this.group.parent.remove(this.group);
      this.group = null;
    }
  }
}
