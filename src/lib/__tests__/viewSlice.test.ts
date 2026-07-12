import { create } from 'zustand';
import { createViewSlice } from '../viewSlice';
import type { ViewSlice } from '../viewSlice';

type TestStore = ViewSlice & { celestialBodies: any[] };

describe('createViewSlice', () => {
  const createTestStore = () => create<TestStore>()((...a) => ({
    ...createViewSlice(...a),
    celestialBodies: [{ name: 'Earth', x: 100, y: 50 }],
  }));

  it('has initial state', () => {
    const store = createTestStore();
    expect(store.getState().selectedPlanet).toBeNull();
    expect(store.getState().zoom).toBe(50);
    expect(store.getState().cameraDistance).toBe(100);
  });

  it('selectPlanet sets selected planet', () => {
    const store = createTestStore();
    store.getState().selectPlanet('Mars');
    expect(store.getState().selectedPlanet).toBe('Mars');
    store.getState().selectPlanet(null);
    expect(store.getState().selectedPlanet).toBeNull();
  });

  it('setViewOffset sets offset', () => {
    const store = createTestStore();
    store.getState().setViewOffset({ x: 10, y: 20 });
    expect(store.getState().viewOffset).toEqual({ x: 10, y: 20 });
  });

  it('setZoom clamps zoom between 10 and 200', () => {
    const store = createTestStore();
    store.getState().setZoom(5);
    expect(store.getState().zoom).toBe(10);
    store.getState().setZoom(300);
    expect(store.getState().zoom).toBe(200);
    store.getState().setZoom(75);
    expect(store.getState().zoom).toBe(75);
  });

  it('setCameraDistance sets camera distance', () => {
    const store = createTestStore();
    store.getState().setCameraDistance(500);
    expect(store.getState().cameraDistance).toBe(500);
  });

  it('centerOnPlanet sets offset for known planet', () => {
    const store = createTestStore();
    store.getState().centerOnPlanet('Earth');
    expect(store.getState().selectedPlanet).toBe('Earth');
    expect(store.getState().viewOffset).toEqual({ x: -100, y: -50 });
  });

  it('centerOnPlanet does nothing for unknown planet', () => {
    const store = createTestStore();
    store.getState().centerOnPlanet('Pluto');
    expect(store.getState().selectedPlanet).toBeNull();
    expect(store.getState().viewOffset).toEqual({ x: 0, y: 0 });
  });

  it('resetView restores defaults', () => {
    const store = createTestStore();
    store.getState().centerOnPlanet('Earth');
    store.getState().setZoom(150);
    store.getState().resetView();
    expect(store.getState().viewOffset).toEqual({ x: 0, y: 0 });
    expect(store.getState().zoom).toBe(50);
    expect(store.getState().selectedPlanet).toBeNull();
  });
});
