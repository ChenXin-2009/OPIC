/**
 * SunVisualEnhancer — 太阳视觉增强器（大气光晕 + 镜头光晕）
 */
import * as THREE from 'three';
import { SunGlowEffect } from './SunGlowEffect';
import { createLensFlare } from './LensFlareCC0';
import { useSunVisualDebugStore } from '@/lib/state/SunVisualDebugStore';

export class SunVisualEnhancer {
  private glow: SunGlowEffect | null = null;
  private flare: ReturnType<typeof createLensFlare> | null = null;
  private flareMounted = false;
  private sunMesh: THREE.Object3D;
  private radius: number;
  private raycaster = new THREE.Raycaster();
  private occluders: THREE.Object3D[] = [];
  private occlusionOn = true;
  /** 平滑过渡 — 太阳是否在屏幕内 */
  private screenFactor = 1.0;

  constructor(mesh: THREE.Object3D, radius: number) {
    this.sunMesh = mesh;
    this.radius = radius;
  }

  create(): void {
    this.glow = new SunGlowEffect(this.sunMesh, this.radius);
    this.glow.create();
    this.flare = createLensFlare({
      enabled: true,
      lensPosition: new THREE.Vector3(),
      opacity: 0.95,
      colorGain: new THREE.Color(43, 18, 5),
      starPoints: 4,
      glareSize: 0.03,
      flareSize: 0.005,
      flareSpeed: 0,
      haloScale: 0.5,
      animated: false,
      anamorphic: true,
      secondaryGhosts: true,
      starBurst: false,
      ghostScale: 0.6,
      aditionalStreaks: true,
    });
    this.flare.mesh.renderOrder = 9999;
  }

  mount(): void {
    if (!this.flare || this.flareMounted) return;
    const scene = this.sunMesh.parent;
    if (scene) { scene.add(this.flare.mesh); this.flareMounted = true; }
  }

  update(camera: THREE.Camera): void {
    this.glow?.update(camera);
    if (!this.flareMounted) this.mount();
    if (!this.flare) return;

    const dbg = useSunVisualDebugStore.getState();
    if (!dbg.enabled) { this.flare.setOpacity(0); this.flare.update(camera); return; }

    const u = this.flare.uniforms;
    u.colorGain.value.set(dbg.colorGainR, dbg.colorGainG, dbg.colorGainB);
    u.starPoints.value = dbg.starPoints;
    u.glareSize.value = dbg.glareSize;
    u.flareSize.value = dbg.flareSize;
    u.flareSpeed.value = dbg.flareSpeed;
    u.haloScale.value = dbg.haloScale;
    u.ghostScale.value = dbg.ghostScale;
    u.animated.value = dbg.animated;
    u.anamorphic.value = dbg.anamorphic;
    u.secondaryGhosts.value = dbg.secondaryGhosts;
    u.starBurst.value = dbg.starBurst;
    u.aditionalStreaks.value = dbg.aditionalStreaks;

    const sunPos = new THREE.Vector3(); this.sunMesh.getWorldPosition(sunPos);
    const camPos = new THREE.Vector3(); camera.getWorldPosition(camPos);
    const dist = sunPos.distanceTo(camPos);

    let mult = 1.0;
    const { enhanceStartDistance, enhanceEndDistance, enhanceOpacityMultiplier, farLimitDistance } = dbg;
    if (dist <= enhanceEndDistance) mult = enhanceOpacityMultiplier;
    else if (dist < enhanceStartDistance) mult = 1.0 + (enhanceOpacityMultiplier - 1.0) * (enhanceStartDistance - dist) / (enhanceStartDistance - enhanceEndDistance);
    if (dist > farLimitDistance) mult *= Math.max(0, 1.0 - (dist - farLimitDistance) / (farLimitDistance * 0.15));

    // 距离越远，鬼影和光晕逐渐缩小
    if (dist > 20) {
      const scaleFade = Math.max(0.15, 1.0 - (dist - 20) / 100);
      u.ghostScale.value = dbg.ghostScale * scaleFade;
      u.haloScale.value = dbg.haloScale * scaleFade;
    }

    // 行星遮挡
    if (this.occlusionOn && this.occluders.length > 0) {
      const dir = sunPos.clone().sub(camPos).normalize();
      this.raycaster.set(camPos, dir);
      this.raycaster.far = dist * 0.98;
      const hits = this.raycaster.intersectObjects(this.occluders, false);
      if (hits.length > 0) {
        const r = (hits[0].object as any).geometry?.boundingSphere?.radius ?? 0.01;
        const pa = r / hits[0].distance;
        const sa = this.radius / dist;
        mult *= Math.max(0.08, 1.0 - Math.min(1.0, pa / Math.max(sa, 1e-9)) * 0.92);
      }
    }

    // 用点积判断太阳是否在相机前方（不依赖 camera.matrixWorldInverse）
    const sunDir = sunPos.clone().sub(camPos).normalize();
    const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const inFront = sunDir.dot(camFwd) > 0.05; // >0 在前方，留少量余量避免边界抖动
    const fadeSpeed = inFront ? 0.12 : 0.35;
    this.screenFactor += ((inFront ? 1.0 : 0.0) - this.screenFactor) * fadeSpeed;
    mult *= this.screenFactor;

    this.flare.setOpacity(dbg.opacity * mult);
    this.flare.setPosition(sunPos);
    this.flare.update(camera);
  }

  setOccluders(o: THREE.Object3D[]): void { this.occluders = o; }
  dispose(): void {
    this.glow?.dispose(); this.glow = null;
    if (this.flare) {
      if (this.flareMounted && this.flare.mesh.parent) this.flare.mesh.parent.remove(this.flare.mesh);
      this.flare.dispose(); this.flare = null; this.flareMounted = false;
    }
  }
}
