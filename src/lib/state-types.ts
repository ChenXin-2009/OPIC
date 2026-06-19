/**
 * 太阳系状态类型定义 (Solar System State Types)
 *
 * 定义全局 Zustand Store 的完整状态结构和子切片接口。
 */

import type { CelestialBody } from './astronomy/orbit';

export type { CelestialBody };

/** 视角偏移量 (AU) — 相对于太阳系中心的平移 */
export interface ViewOffset {
  /** X 轴偏移 */
  x: number;
  /** Y 轴偏移 */
  y: number;
}

/** 应用语言：中文或英文 */
export type Language = 'en' | 'zh';

/**
 * 太阳系全局状态 — 包含时间、视图、天体数据和所有操作方法。
 * 由 useSolarSystemStore (Zustand) 管理。
 */
export interface SolarSystemState {
  currentTime: Date;
  isPlaying: boolean;
  timeSpeed: number;
  playDirection: 'forward' | 'backward';
  celestialBodies: CelestialBody[];
  selectedPlanet: string | null;
  viewOffset: ViewOffset;
  zoom: number;
  cameraDistance: number;
  lang: Language;

  setLang: (lang: Language) => void;
  setCurrentTime: (date: Date) => void;
  togglePlayPause: () => void;
  setTimeSpeed: (speed: number) => void;
  setPlayDirection: (direction: 'forward' | 'backward') => void;
  startPlaying: (speed: number, direction: 'forward' | 'backward') => void;
  tick: (deltaSeconds: number) => void;
  selectPlanet: (name: string | null) => void;
  setViewOffset: (offset: ViewOffset) => void;
  setZoom: (zoom: number) => void;
  setCameraDistance: (distance: number) => void;
  centerOnPlanet: (name: string) => void;
  resetToNow: () => void;
  resetView: () => void;
}
