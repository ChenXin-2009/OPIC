import * as THREE from 'three';
import type { UniverseScaleRenderer } from '@/lib/types/universeTypes';
import { logger } from '@/utils/logger';
import { SUPERGALACTIC_TO_ICRF_RAW } from '@/lib/coordinates/frames/supergalactic';

/**
 * 计算 Supergalactic Cartesian → OPIC RenderWorld (J2000 ecliptic) 的旋转四元数。
 *
 * 使用 Astropy 8.0 验证的 ICRF↔Supergalactic 矩阵，结合 ICRF→RenderWorld (R_x(-ε))。
 *
 * 参见 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.8
 * fixtures: src/lib/coordinates/fixtures/astropy-frames.json
 */
function computeSupergalacticToRenderWorldQuat(): THREE.Quaternion {
  const eps = 23.43928 * Math.PI / 180;
  const cosE = Math.cos(eps);
  const sinE = Math.sin(eps);

  const M = SUPERGALACTIC_TO_ICRF_RAW;
  const xx = M[0][0], xy = M[0][1], xz = M[0][2];
  const yx = M[1][0], yy = M[1][1], yz = M[1][2];
  const zx = M[2][0], zy = M[2][1], zz = M[2][2];

  // Combined: R_x(-ε) * supergalactic_to_icrf
  // Row 0 (X unchanged by R_x)
  const m4 = new THREE.Matrix4();
  m4.set(
    xx, xy, xz, 0,
    yx * cosE + zx * sinE, yy * cosE + zy * sinE, yz * cosE + zz * sinE, 0,
    -yx * sinE + zx * cosE, -yy * sinE + zy * cosE, -yz * sinE + zz * cosE, 0,
    0, 0, 0, 1
  );

  return new THREE.Quaternion().setFromRotationMatrix(m4).normalize();
}

export class UniverseGroupManager {
  private universeGroup: THREE.Group;
  private localGroupRenderer: UniverseScaleRenderer | null = null;
  private nearbyGroupsRenderer: UniverseScaleRenderer | null = null;
  private virgoSuperclusterRenderer: UniverseScaleRenderer | null = null;
  private laniakeaSuperclusterRenderer: UniverseScaleRenderer | null = null;

  constructor() {
    this.universeGroup = new THREE.Group();
    this.universeGroup.name = 'UniverseGroup';

    // 使用 Supergalactic Cartesian → RenderWorld 的数学正确旋转，
    // 替代旧版硬编码 (58°, -21°, 59.5°) 裸旋转。
    // 参见 COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.8 / §4 阶段 6
    this.universeGroup.quaternion.copy(computeSupergalacticToRenderWorldQuat());
  }

  getGroup(): THREE.Group {
    return this.universeGroup;
  }

  private replaceRendererInGroup(
    oldRenderer: UniverseScaleRenderer | null,
    newRenderer: UniverseScaleRenderer | null
  ): void {
    if (oldRenderer) {
      this.universeGroup.remove(oldRenderer.getGroup());
      oldRenderer.dispose();
    }
    if (newRenderer) {
      this.universeGroup.add(newRenderer.getGroup());
    }
  }

  setLocalGroupRenderer(renderer: UniverseScaleRenderer | null): void {
    this.replaceRendererInGroup(this.localGroupRenderer, renderer);
    this.localGroupRenderer = renderer;
  }

  setNearbyGroupsRenderer(renderer: UniverseScaleRenderer | null): void {
    this.replaceRendererInGroup(this.nearbyGroupsRenderer, renderer);
    this.nearbyGroupsRenderer = renderer;
  }

  setVirgoSuperclusterRenderer(renderer: UniverseScaleRenderer | null): void {
    this.replaceRendererInGroup(this.virgoSuperclusterRenderer, renderer);
    this.virgoSuperclusterRenderer = renderer;
  }

  setLaniakeaSuperclusterRenderer(renderer: UniverseScaleRenderer | null): void {
    this.replaceRendererInGroup(this.laniakeaSuperclusterRenderer, renderer);
    this.laniakeaSuperclusterRenderer = renderer;
  }

  getLocalGroupRenderer(): UniverseScaleRenderer | null {
    return this.localGroupRenderer;
  }

  getNearbyGroupsRenderer(): UniverseScaleRenderer | null {
    return this.nearbyGroupsRenderer;
  }

  getVirgoSuperclusterRenderer(): UniverseScaleRenderer | null {
    return this.virgoSuperclusterRenderer;
  }

  getLaniakeaSuperclusterRenderer(): UniverseScaleRenderer | null {
    return this.laniakeaSuperclusterRenderer;
  }

  setRotationOffset(x: number, y: number, z: number): void {
    // 重置为基础 Supergalactic→RenderWorld 旋转，再叠加调试偏移
    this.universeGroup.quaternion.copy(computeSupergalacticToRenderWorldQuat());
    const degToRad = Math.PI / 180;
    const offsetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(x * degToRad, y * degToRad, z * degToRad, 'YXZ')
    );
    this.universeGroup.quaternion.multiply(offsetQuat);
    logger.debug('[SceneManager] Universe group rotation offset updated:', { x, y, z });
  }

  updateAll(cameraDistance: number, deltaTime: number): void {
    if (this.localGroupRenderer) {
      this.localGroupRenderer.update(cameraDistance, deltaTime);
    }
    if (this.nearbyGroupsRenderer) {
      this.nearbyGroupsRenderer.update(cameraDistance, deltaTime);
    }
    if (this.virgoSuperclusterRenderer) {
      this.virgoSuperclusterRenderer.update(cameraDistance, deltaTime);
    }
    if (this.laniakeaSuperclusterRenderer) {
      this.laniakeaSuperclusterRenderer.update(cameraDistance, deltaTime);
    }
  }

  disposeAll(): void {
    if (this.localGroupRenderer) {
      this.localGroupRenderer.dispose();
      this.localGroupRenderer = null;
    }
    if (this.nearbyGroupsRenderer) {
      this.nearbyGroupsRenderer.dispose();
      this.nearbyGroupsRenderer = null;
    }
    if (this.virgoSuperclusterRenderer) {
      this.virgoSuperclusterRenderer.dispose();
      this.virgoSuperclusterRenderer = null;
    }
    if (this.laniakeaSuperclusterRenderer) {
      this.laniakeaSuperclusterRenderer.dispose();
      this.laniakeaSuperclusterRenderer = null;
    }
  }
}
