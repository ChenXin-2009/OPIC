import * as THREE from 'three';
import { PlanetRingRenderer } from '../PlanetRing';

describe('PlanetRingRenderer', () => {
  let parent: THREE.Object3D;

  beforeEach(() => {
    parent = new THREE.Object3D();
  });

  it('should create a ring mesh', () => {
    const ring = new PlanetRingRenderer(parent, 1);
    ring.create();
    expect(parent.children.length).toBe(1);
    const mesh = parent.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.RingGeometry);
    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });

  it('should dispose and clean up', () => {
    const ring = new PlanetRingRenderer(parent, 1);
    ring.create();
    expect(parent.children.length).toBe(1);
    ring.dispose();
    expect(parent.children.length).toBe(0);
  });

  it('should handle dispose when not created', () => {
    const ring = new PlanetRingRenderer(parent, 1);
    expect(() => ring.dispose()).not.toThrow();
  });
});
