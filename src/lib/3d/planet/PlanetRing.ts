import * as THREE from 'three';
import { SATURN_RING_CONFIG } from '@/lib/config/visualConfig';

export class PlanetRingRenderer {
  private mesh: THREE.Mesh | null = null;
  private ringTexture: THREE.Texture | null = null;
  private parentObject: THREE.Object3D;
  private realRadius: number;

  constructor(parentObject: THREE.Object3D, realRadius: number) {
    this.parentObject = parentObject;
    this.realRadius = realRadius;
  }

  create(): void {
    const cfg = SATURN_RING_CONFIG;
    const saturnRadius = this.realRadius;

    const innerRadius = saturnRadius * cfg.innerRadius;
    const outerRadius = saturnRadius * cfg.outerRadius;

    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, cfg.segments, 1);

    const pos = ringGeometry.attributes.position;
    const uv = ringGeometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const u = (dist - innerRadius) / (outerRadius - innerRadius);
      uv.setXY(i, u, 0.5);
    }
    uv.needsUpdate = true;

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: cfg.fallbackColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(ringGeometry, ringMaterial);
    this.mesh.rotation.x = -Math.PI / 2;
    this.parentObject.add(this.mesh);

    this.loadRingTexture();
  }

  private loadRingTexture(): void {
    if (!this.mesh) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      SATURN_RING_CONFIG.texturePath,
      (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        this.ringTexture = texture;

        if (this.mesh) {
          const material = this.mesh.material as THREE.MeshBasicMaterial;
          material.map = texture;
          material.color.setHex(0xffffff);
          material.alphaMap = texture;
          material.needsUpdate = true;
        }
      },
      undefined,
      (error) => {
        console.warn('Failed to load Saturn ring texture:', error);
      }
    );
  }

  dispose(): void {
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) (this.mesh.material as THREE.Material).dispose();
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      this.mesh = null;
    }
    if (this.ringTexture) {
      this.ringTexture.dispose();
      this.ringTexture = null;
    }
  }
}
