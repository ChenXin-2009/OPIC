/**
 * @module 3d/OrbitCurve
 * @description 轨道曲线 3D 渲染模块
 *
 * 管理行星轨道的 3D 视觉表示（线条 + 可选填充圆盘）。
 * 支持 LOD 分辨率缩放、渐变着色、透明度控制和开普勒位置计算。
 */

import * as THREE from 'three';
import type { OrbitalElements } from '@/lib/astronomy/orbit';
import { ORBIT_GRADIENT_CONFIG, ORBIT_STYLE_CONFIG } from '@/lib/config/visualConfig';
import { generateOrbitPoints } from './orbit-curve/OrbitCurveGenerator';
import { parseHexColor, computeGradientColors, getLineOpacity } from './orbit-curve/OrbitCurveColor';
import { createOrbitDisc } from './orbit-curve/OrbitCurveDisc';
import { createOrbitLine } from './orbit-curve/OrbitCurveGradientLine';

/** Manages the 3D visual representation of a planetary orbit curve (line + optional filled disc).
 * Supports LOD resolution scaling, gradient coloring, opacity control, and Kepler position calculation.
 */
export class OrbitCurve {
  readonly root: THREE.Group;
  private visualObjects: THREE.Object3D[] = [];
  private points: THREE.Vector3[] = [];
  private planetPosition: THREE.Vector3 | null = null;
  private orbitColor: string;

  private elements: OrbitalElements;
  private currentResolution: number = 300;
  private lastCameraDistance: number = 0;
  private resolutionUpdateThreshold: number = 0.1;
  private julianDay?: number;

  private currentDiscOpacity: number = 1.0;
  private currentLineOpacity: number = 1.0;

  /**
   * @param elements - Keplerian orbital elements
   * @param color - hex color string for the orbit
   * @param segments - initial curve resolution
   * @param julianDay - epoch for precession-adjusted elements
   * @param planetPosition - starting position of the orbiting body
   */
  constructor(
    elements: OrbitalElements,
    color: string,
    segments: number = 300,
    julianDay?: number,
    planetPosition?: THREE.Vector3
  ) {
    this.root = new THREE.Group();
    this.elements = elements;
    this.orbitColor = color || '#ffffff';
    this.planetPosition = planetPosition || null;
    this.currentResolution = segments;
    this.julianDay = julianDay;

    this.points = generateOrbitPoints(elements, segments, julianDay);
    this.createVisualObject();
  }

  /** Create or rebuild the orbit visual (disc and/or line) based on style config. */
  private createVisualObject(): void {
    if (this.visualObjects.length > 0) {
      this.visualObjects.forEach(obj => {
        this.root.remove(obj);
        if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      this.visualObjects = [];
    }

    if (ORBIT_STYLE_CONFIG.style === 'filled') {
      const mesh = createOrbitDisc(this.points, this.orbitColor);
      if (mesh) {
        this.root.add(mesh);
        this.visualObjects.push(mesh);
      }

      if (ORBIT_STYLE_CONFIG.showLine) {
        const line = createOrbitLine(this.points, this.orbitColor, this.planetPosition);
        if (line) {
          this.root.add(line);
          this.visualObjects.push(line);
        }
      }
    } else {
      const line = createOrbitLine(this.points, this.orbitColor, this.planetPosition);
      if (line) {
        this.root.add(line);
        this.visualObjects.push(line);
      }
    }
  }

  /** Compute LOD resolution: farther camera = fewer segments (64-1200). */
  private calculateOptimalResolution(cameraDistance: number): number {
    const minResolution = 64;
    const maxResolution = 1200;
    const baseDistance = 30;
    const baseResolution = 300;

    const distanceRatio = Math.max(0.1, cameraDistance / baseDistance);
    const targetResolution = Math.round(baseResolution / Math.sqrt(distanceRatio));

    return Math.max(minResolution, Math.min(maxResolution, targetResolution));
  }

  /** Update curve LOD when camera distance changes significantly. */
  updateCurveResolution(cameraDistance: number): void {
    const distanceChange = Math.abs(cameraDistance - this.lastCameraDistance);
    const relativeChange = distanceChange / Math.max(0.1, this.lastCameraDistance);

    if (relativeChange < this.resolutionUpdateThreshold) {
      return;
    }

    const optimalResolution = this.calculateOptimalResolution(cameraDistance);

    const resolutionChange = Math.abs(optimalResolution - this.currentResolution);
    const minResolutionChange = Math.max(8, this.currentResolution * 0.1);

    if (resolutionChange >= minResolutionChange) {
      this.currentResolution = optimalResolution;
      this.regenerateCurve();
      this.lastCameraDistance = cameraDistance;
    }
  }

  /** Set visual opacity for the disc and/or line components. */
  setOpacity(discOpacity: number, lineOpacity?: number): void {
    this.currentDiscOpacity = discOpacity;
    this.currentLineOpacity = lineOpacity ?? discOpacity;
    this.applyCurrentOpacity();
  }

  private applyCurrentOpacity(): void {
    for (const obj of this.visualObjects) {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshBasicMaterial;
        mat.opacity = this.currentDiscOpacity;
        obj.visible = this.currentDiscOpacity > 0.01;
      } else if (obj instanceof THREE.Line) {
        const mat = obj.material as THREE.LineBasicMaterial;
        mat.opacity = this.currentLineOpacity;
        mat.transparent = true;
        obj.visible = this.currentLineOpacity > 0.01;
      }
    }
  }

  private regenerateCurve(): void {
    this.points = generateOrbitPoints(this.elements, this.currentResolution, this.julianDay);
    this.createVisualObject();
    this.applyCurrentOpacity();
  }

  /** Update gradient colors when the orbiting body moves along the orbit. */
  updatePlanetPosition(position: THREE.Vector3): void {
    this.planetPosition = position;

    if (ORBIT_GRADIENT_CONFIG.enabled && this.planetPosition && this.visualObjects.length > 0 && this.points.length > 0) {
      const lineObj = this.visualObjects.find(obj => obj instanceof THREE.Line) as THREE.Line | undefined;
      if (!lineObj) return;

      const geometry = lineObj.geometry;
      const vertexCount = this.points.length;

      let colors = geometry.getAttribute('color') as THREE.BufferAttribute;
      if (!colors || colors.count !== vertexCount) {
        colors = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
        geometry.setAttribute('color', colors);
      }

      const rgb = parseHexColor(this.orbitColor);
      const lineOpacity = getLineOpacity();
      const computedColors = computeGradientColors(this.points, this.planetPosition, rgb, lineOpacity);

      for (let i = 0; i < vertexCount; i++) {
        colors.setXYZ(i, computedColors[i * 3], computedColors[i * 3 + 1], computedColors[i * 3 + 2]);
      }

      colors.needsUpdate = true;
    }
  }

  /** Validate how well a planet aligns with the orbit curve (min distance check). */
  validatePlanetAlignment(planetPosition: THREE.Vector3, _tolerance: number = 0.001): number {
    if (this.points.length === 0) {
      return -1;
    }

    let minDistance = Infinity;
    const px = planetPosition.x;
    const py = planetPosition.y;
    const pz = planetPosition.z;

    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i].x - px;
      const dy = this.points[i].y - py;
      const dz = this.points[i].z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    return minDistance;
  }

  /** Find the closest point on the orbit path to a given position. */
  getClosestPointOnOrbit(position: THREE.Vector3): THREE.Vector3 | null {
    if (this.points.length === 0) return null;

    let minDistance = Infinity;
    let closestPoint: THREE.Vector3 | null = null;
    const px = position.x;
    const py = position.y;
    const pz = position.z;

    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i].x - px;
      const dy = this.points[i].y - py;
      const dz = this.points[i].z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = this.points[i];
      }
    }

    return closestPoint ? closestPoint.clone() : null;
  }

  /** Replace orbital elements and rebuild the curve. */
  updateOrbit(elements: OrbitalElements, segments: number = 300): void {
    this.elements = elements;
    this.currentResolution = segments;

    this.points = generateOrbitPoints(elements, segments);

    this.createVisualObject();
  }

  /** Get the root group containing the orbit visuals. */
  getLine(): THREE.Object3D {
    return this.root;
  }

  /** Compute the 3D position of the orbiting body at a given epoch using Kepler's equation. */
  calculatePosition(_julianDay: number): THREE.Vector3 {
    const elem = this.elements;

    const w = elem.w_bar - elem.O;
    const M = (elem.L - elem.w_bar) % (2 * Math.PI);

    let E = M;
    for (let i = 0; i < 10; i++) {
      E = M + elem.e * Math.sin(E);
    }

    const nu = 2 * Math.atan2(
      Math.sqrt(1 + elem.e) * Math.sin(E / 2),
      Math.sqrt(1 - elem.e) * Math.cos(E / 2)
    );

    const r = elem.a * (1 - elem.e * Math.cos(E));

    const x_orb = r * Math.cos(nu);
    const y_orb = r * Math.sin(nu);

    const cos_w = Math.cos(w);
    const sin_w = Math.sin(w);
    const cos_O = Math.cos(elem.O);
    const sin_O = Math.sin(elem.O);
    const cos_i = Math.cos(elem.i);
    const sin_i = Math.sin(elem.i);

    const x = (cos_w * cos_O - sin_w * sin_O * cos_i) * x_orb +
              (-sin_w * cos_O - cos_w * sin_O * cos_i) * y_orb;

    const y = (cos_w * sin_O + sin_w * cos_O * cos_i) * x_orb +
              (-sin_w * sin_O + cos_w * cos_O * cos_i) * y_orb;

    const z = (sin_w * sin_i) * x_orb +
              (cos_w * sin_i) * y_orb;

    return new THREE.Vector3(x, y, z);
  }

  /** Compute the normal vector of the orbital plane. */
  getOrbitNormal(): THREE.Vector3 {
    const i = this.elements.i;
    const O = this.elements.O;

    const nx = Math.sin(i) * Math.sin(O);
    const ny = -Math.sin(i) * Math.cos(O);
    const nz = Math.cos(i);

    return new THREE.Vector3(nx, ny, nz).normalize();
  }

  /** Clean up all Three.js geometry and material resources. */
  dispose(): void {
    this.visualObjects.forEach(obj => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else if (obj.material) {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
    this.visualObjects = [];
  }
}
