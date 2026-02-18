/**
 * Zustand 全局状态管理
 * 管理太阳系模拟的所有状态和交互逻辑
 */

import { create } from 'zustand';
import { CelestialBody, getCelestialBodies, initializeSatelliteCalculator, initializeAllBodiesCalculator } from './astronomy/orbit';
import { dateToJulianDay } from './astronomy/time';

// Initialize the ephemeris calculators on module load (client-side only)
// This runs once when the module is first imported in the browser
if (typeof window !== 'undefined') {
  // Initialize all-bodies calculator (provides high-precision data for all bodies)
  initializeAllBodiesCalculator().catch(error => {
    console.warn('Failed to initialize all-bodies calculator, will use analytical models:', error);
  });
  
  // Note: Legacy satellite calculator is deprecated and not initialized
  // The all-bodies calculator handles all satellites now
}

/**
 * 视图偏移量接口
 */
export interface ViewOffset {
  x: number; // X轴偏移 (AU)
  y: number; // Y轴偏移 (AU)
}

/**
 * 支持语言类型
 */
export type Language = 'en' | 'zh';

/**
 * 状态接口
 */
export interface SolarSystemState {
  // ========== 时间状态 ==========
  currentTime: Date;
  isPlaying: boolean;
  timeSpeed: number;
  playDirection: 'forward' | 'backward'; // 播放方向
  
  // ========== 天体数据 ==========
  celestialBodies: CelestialBody[];
  selectedPlanet: string | null;
  
  // ========== 视图状态 ==========
  viewOffset: ViewOffset;
  zoom: number;
  cameraDistance: number; // 相机距离（AU）

  // ========== 语言 ==========
  lang: Language;               // 当前语言
  setLang: (lang: Language) => void; // 切换语言

  // ========== 操作方法 ==========
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

/**
 * 默认缩放级别
 */
const DEFAULT_ZOOM = 50;
const MIN_ZOOM = 10;
const MAX_ZOOM = 200;

/**
 * 创建 Zustand Store
 */
export const useSolarSystemStore = create<SolarSystemState>((set, get) => {
  const initialTime = new Date();
  const initialJD = dateToJulianDay(initialTime);
  
  // Initialize with empty bodies, will be populated asynchronously
  const initialState = {
    // ========== 初始状态 ==========
    currentTime: initialTime,
    isPlaying: true, // 默认开始播放
    timeSpeed: 1 / 86400, // 默认实时播放：每秒前进1秒 = 1/86400天
    playDirection: 'forward' as const,
    celestialBodies: [] as CelestialBody[],
    selectedPlanet: null,
    viewOffset: { x: 0, y: 0 },
    zoom: DEFAULT_ZOOM,
    cameraDistance: 100, // 默认相机距离
    
    // ========== 语言 ==========
    lang: 'zh' as Language, // 默认中文
    setLang: (lang: Language) => set({ lang }),

    // ========== 方法 ==========
    setCurrentTime: (date: Date) => {
      const jd = dateToJulianDay(date);
      // Call async function but don't wait for it
      // The bodies will be updated when the promise resolves
      getCelestialBodies(jd).then(bodies => {
        set({ currentTime: date, celestialBodies: bodies });
        // Note: ephemeris:bodies:ready event is emitted in calculateBodiesNow()
      }).catch(error => {
        console.error('Failed to get celestial bodies:', error);
        // Keep current bodies on error
        set({ currentTime: date });
        
        // Emit error event to unblock loading
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
            detail: { stage: 'bodies', error: true }
          }));
        }
      });
    },
    
    togglePlayPause: () => {
      set((state) => ({ isPlaying: !state.isPlaying }));
    },
    
    setTimeSpeed: (speed: number) => {
      // 确保速度在合理范围（以天为单位）
      const clampedSpeed = Math.max(0.1, Math.min(365, speed)); // 最大速度限制为1年/秒（365天）
      set({ timeSpeed: clampedSpeed });
    },
    
    setPlayDirection: (direction: 'forward' | 'backward') => {
      set({ playDirection: direction });
    },
    
    startPlaying: (speed: number, direction: 'forward' | 'backward') => {
      // 确保速度在合理范围（以天为单位）
      const clampedSpeed = Math.max(0.1, Math.min(365, speed)); // 最大速度限制为1年/秒（365天）
      set({ timeSpeed: clampedSpeed, playDirection: direction, isPlaying: true });
    },
    
    tick: (deltaSeconds: number) => {
      const state = get();
      if (!state.isPlaying) return;
      
      // timeSpeed 表示每秒前进多少天
      const direction = state.playDirection === 'forward' ? 1 : -1;
      const deltaTimeDays = deltaSeconds * state.timeSpeed * direction;
      
      // 使用毫秒计算
      const deltaTimeMs = deltaTimeDays * 24 * 60 * 60 * 1000;
      const newTime = new Date(state.currentTime.getTime() + deltaTimeMs);
      
      // CRITICAL FIX for sampling aliasing:
      // For satellites with short orbital periods (like Enceladus: 1.37 days),
      // we need to ensure smooth position updates every frame.
      // 
      // Strategy: Update positions synchronously if possible, or use the most
      // recent cached data to avoid gaps in position updates.
      
      const jd = dateToJulianDay(newTime);
      
      // Update time immediately
      set({ currentTime: newTime });
      
      // Try to get positions synchronously from cache first
      // This ensures every frame has updated positions
      getCelestialBodies(jd).then(bodies => {
        // Always update positions immediately when they're ready
        // The cache mechanism in getCelestialBodies ensures we don't
        // recalculate unnecessarily
        set({ celestialBodies: bodies });
      }).catch(error => {
        console.error('Failed to get celestial bodies:', error);
      });
    },
    
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
    
    resetToNow: () => {
      const now = new Date();
      get().setCurrentTime(now);
      set({ isPlaying: false });
    },
    
    resetView: () => {
      set({
        viewOffset: { x: 0, y: 0 },
        zoom: DEFAULT_ZOOM,
        selectedPlanet: null
      });
    }
  };
  
  // Load initial celestial bodies asynchronously
  // CRITICAL: This must complete before the loading page disappears
  // to avoid black screen on mobile devices
  if (typeof window !== 'undefined') {
    console.log('Initializing celestial bodies...');
    
    // Start loading immediately (don't await here to avoid blocking store creation)
    getCelestialBodies(initialJD).then(bodies => {
      console.log(`Loaded ${bodies.length} celestial bodies`);
      set({ celestialBodies: bodies });
      
      // Note: The ephemeris:bodies:ready event is already emitted
      // in calculateBodiesNow() inside getCelestialBodies()
      // This ensures the EphemerisMonitor knows the bodies are ready
    }).catch(error => {
      console.error('Failed to load initial celestial bodies:', error);
      
      // Even on error, emit the bodies:ready event to prevent infinite loading
      // The scene will use analytical models as fallback
      window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
        detail: { stage: 'bodies', error: true }
      }));
    });
  }
  
  return initialState;
});

// 文件末尾修改为：
export type { CelestialBody };

