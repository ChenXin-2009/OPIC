import * as THREE from 'three';
import { PlumeRenderer } from '../PlumeRenderer';

describe('PlumeRenderer', () => {
  it('creates a cone mesh, initially invisible', () => {
    const renderer = new PlumeRenderer();
    const obj = renderer.getObject();
    expect(obj).toBeInstanceOf(THREE.Mesh);
    expect(obj.visible).toBe(false);
    expect(obj.name).toBe('SpaceFlightPlume');
    renderer.dispose();
  });

  it('setState with active=false keeps mesh hidden', () => {
    const renderer = new PlumeRenderer();
    renderer.setState(false, 100);
    expect(renderer.getObject().visible).toBe(false);
    renderer.dispose();
  });

  it('setState with active=true shows mesh and scales by throttle', () => {
    const renderer = new PlumeRenderer();
    renderer.setState(true, 100);
    const mesh = renderer.getObject();
    expect(mesh.visible).toBe(true);
    expect(mesh.scale.x).toBeCloseTo(2, 4);
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.opacity).toBeCloseTo(0.85, 4);
    renderer.dispose();
  });

  it('setState clamps throttle to [0, 100]', () => {
    const renderer = new PlumeRenderer();
    renderer.setState(true, 200);
    const mesh = renderer.getObject();
    expect(mesh.scale.x).toBeCloseTo(2, 4);
    renderer.dispose();
  });

  it('setState at zero throttle shows minimum plume', () => {
    const renderer = new PlumeRenderer();
    renderer.setState(true, 0);
    const mesh = renderer.getObject();
    expect(mesh.scale.x).toBeCloseTo(0.45, 4);
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.opacity).toBeCloseTo(0.3, 4);
    renderer.dispose();
  });

  it('dispose cleans up geometry and material', () => {
    const renderer = new PlumeRenderer();
    const mesh = renderer.getObject();
    const geoSpy = jest.spyOn(mesh.geometry, 'dispose');
    const matSpy = jest.spyOn(mesh.material, 'dispose');
    renderer.dispose();
    expect(geoSpy).toHaveBeenCalled();
    expect(matSpy).toHaveBeenCalled();
  });
});
