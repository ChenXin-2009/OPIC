import { StateCreator } from 'zustand';
import type { SolarSystemState, ViewOffset } from './state-types';

export interface ViewSlice {
  selectedPlanet: string | null;
  viewOffset: ViewOffset;
  zoom: number;
  cameraDistance: number;
  selectPlanet: (name: string | null) => void;
  setViewOffset: (offset: ViewOffset) => void;
  setZoom: (zoom: number) => void;
  setCameraDistance: (distance: number) => void;
  centerOnPlanet: (name: string) => void;
  resetView: () => void;
}

const DEFAULT_ZOOM = 50;
const MIN_ZOOM = 10;
const MAX_ZOOM = 200;

export const createViewSlice: StateCreator<SolarSystemState, [], [], ViewSlice> = (set, get) => ({
  selectedPlanet: null,
  viewOffset: { x: 0, y: 0 },
  zoom: DEFAULT_ZOOM,
  cameraDistance: 100,

  selectPlanet: (name: string | null) => {
    set({ selectedPlanet: name });
  },

  setViewOffset: (offset: ViewOffset) => set({ viewOffset: offset }),

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    set({ zoom: clampedZoom });
  },

  setCameraDistance: (distance: number) => {
    set({ cameraDistance: distance });
  },

  centerOnPlanet: (name: string) => {
    const state = get();
    const body = state.celestialBodies.find((b) => b.name === name);
    if (body) {
      set({ selectedPlanet: name, viewOffset: { x: -body.x, y: -body.y } });
    }
  },

  resetView: () => {
    set({
      viewOffset: { x: 0, y: 0 },
      zoom: DEFAULT_ZOOM,
      selectedPlanet: null,
    });
  },
});
