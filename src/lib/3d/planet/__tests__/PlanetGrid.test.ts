import * as THREE from 'three';
import { PlanetGrid } from '../PlanetGrid';

describe('PlanetGrid', () => {
  let parent: THREE.Object3D;

  beforeEach(() => {
    parent = new THREE.Object3D();
  });

  it('should create a grid group', () => {
    const grid = new PlanetGrid(parent, 1);
    grid.create();
    expect(parent.children.length).toBe(1);
    const group = parent.children[0] as THREE.Group;
    expect(group.name).toBe('');
    expect(group.renderOrder).toBe(1);
    expect(group.children.length).toBeGreaterThan(0);
    // Should have meridian + parallel lines
    const lineCount = group.children.filter(c => c instanceof THREE.Line).length;
    expect(lineCount).toBeGreaterThan(0);
  });

  it('should set visibility', () => {
    const grid = new PlanetGrid(parent, 1);
    grid.create();
    expect(grid.getVisible()).toBe(true);
    grid.setVisible(false);
    expect(grid.getVisible()).toBe(false);
    expect(parent.children[0].visible).toBe(false);
  });

  it('should return false for getVisible when not created', () => {
    const grid = new PlanetGrid(parent, 1);
    expect(grid.getVisible()).toBe(false);
  });

  it('should update visibility based on distance', () => {
    const grid = new PlanetGrid(parent, 1);
    grid.create();
    expect(() => grid.updateVisibility(1)).not.toThrow();
    expect(() => grid.updateVisibility(100)).not.toThrow();
  });

  it('should dispose and clean up', () => {
    const grid = new PlanetGrid(parent, 1);
    grid.create();
    expect(parent.children.length).toBe(1);
    grid.dispose();
    expect(parent.children.length).toBe(0);
  });

  it('should handle dispose when not created', () => {
    const grid = new PlanetGrid(parent, 1);
    expect(() => grid.dispose()).not.toThrow();
  });
});
