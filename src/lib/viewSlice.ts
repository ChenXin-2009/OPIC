/**
 * 视图状态切片 (View Slice)
 *
 * 管理太阳系 3D 场景的视图状态，包括：
 * - 当前选中的天体
 * - 视角偏移（平移量）
 * - 缩放级别（限制在 MIN_ZOOM ~ MAX_ZOOM 范围）
 * - 相机距离
 *
 * 视图操作：
 * - centerOnPlanet(): 自动将视角对准指定天体
 * - resetView(): 恢复默认视角
 */

import { StateCreator } from 'zustand';
import type { SolarSystemState, ViewOffset } from './state-types';

/** 视图状态切片接口 — 管理视角、缩放和天体选择 */
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
