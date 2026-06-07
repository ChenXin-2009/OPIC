import * as THREE from 'three';
import type { UniverseScaleRenderer } from '@/lib/types/universeTypes';
import { logger } from '@/utils/logger';

export class UniverseGroupManager {
  private universeGroup: THREE.Group;
  private localGroupRenderer: UniverseScaleRenderer | null = null;
  private nearbyGroupsRenderer: UniverseScaleRenderer | null = null;
  private virgoSuperclusterRenderer: UniverseScaleRenderer | null = null;
  private laniakeaSuperclusterRenderer: UniverseScaleRenderer | null = null;

  constructor() {
    this.universeGroup = new THREE.Group();
    this.universeGroup.name = 'UniverseGroup';

    const degToRad = Math.PI / 180;
    this.universeGroup.rotation.order = 'YXZ';
    this.universeGroup.rotation.x = 58.0 * degToRad;
    this.universeGroup.rotation.y = -21.0 * degToRad;
    this.universeGroup.rotation.z = 59.5 * degToRad;
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
    const degToRad = Math.PI / 180;
    this.universeGroup.rotation.order = 'YXZ';
    this.universeGroup.rotation.x = x * degToRad;
    this.universeGroup.rotation.y = y * degToRad;
    this.universeGroup.rotation.z = z * degToRad;
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
