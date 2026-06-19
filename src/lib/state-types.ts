import type { CelestialBody } from './astronomy/orbit';

export type { CelestialBody };

export interface ViewOffset {
  x: number;
  y: number;
}

export type Language = 'en' | 'zh';

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
