/**
 * Ephemeris Store - 管理星历数据的加载状态
 * 
 * 功能:
 * - 控制每个天体是否使用高精度星历数据
 * - 跟踪数据加载状态
 * - 管理数据缓存
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 天体ID映射
 */
export const BODY_IDS = {
  // 行星
  mercury: 199,
  venus: 299,
  earth: 399,
  mars: 4,
  jupiter: 5,
  saturn: 6,
  uranus: 7,
  neptune: 8,
  // 地球卫星
  moon: 301,
  // 木星卫星
  io: 501,
  europa: 502,
  ganymede: 503,
  callisto: 504,
  // 土星卫星
  mimas: 601,
  enceladus: 602,
  tethys: 603,
  dione: 604,
  rhea: 605,
  titan: 606,
  hyperion: 607,
  iapetus: 608,
  // 天王星卫星
  miranda: 705,
  ariel: 701,
  umbriel: 702,
  titania: 703,
  oberon: 704,
  // 海王星卫星
  triton: 801,
} as const;

export type BodyKey = keyof typeof BODY_IDS;

/**
 * 数据加载状态
 */
export enum LoadingStatus {
  NOT_LOADED = 'not_loaded',    // 未加载
  LOADING = 'loading',           // 加载中
  LOADED = 'loaded',             // 已加载
  ERROR = 'error',               // 加载失败
}

/**
 * 天体星历配置
 */
export interface BodyEphemerisConfig {
  enabled: boolean;              // 是否启用高精度模式
  status: LoadingStatus;         // 加载状态
  dataSize?: number;             // 数据大小(KB)
  error?: string;                // 错误信息
  timeRange?: {                  // 时间范围（儒略日）
    start: number;
    end: number;
  };
  accuracy?: {                   // 精度信息
    ephemeris: string;           // 星历数据精度（如"±10m"）
    analytical: string;          // 解析模型精度（如"±1000km"）
  };
}

/**
 * Store状态接口
 */
interface EphemerisStoreState {
  // 每个天体的配置
  bodies: Record<BodyKey, BodyEphemerisConfig>;
  
  // 全局开关
  globalEnabled: boolean;
  
  // 操作方法
  enableBody: (bodyKey: BodyKey) => void;
  disableBody: (bodyKey: BodyKey) => void;
  setBodyStatus: (bodyKey: BodyKey, status: LoadingStatus, error?: string) => void;
  setBodyDataSize: (bodyKey: BodyKey, size: number) => void;
  setBodyTimeRange: (bodyKey: BodyKey, start: number, end: number) => void;
  setBodyAccuracy: (bodyKey: BodyKey, ephemeris: string, analytical: string) => void;
  enableAll: () => void;
  disableAll: () => void;
  setGlobalEnabled: (enabled: boolean) => void;
}

/**
 * 初始化所有天体配置
 */
const initializeBodies = (): Record<BodyKey, BodyEphemerisConfig> => {
  const bodies: Partial<Record<BodyKey, BodyEphemerisConfig>> = {};
  
  for (const key of Object.keys(BODY_IDS) as BodyKey[]) {
    bodies[key] = {
      enabled: false,  // 默认关闭,使用解析模型
      status: LoadingStatus.NOT_LOADED,
    };
  }
  
  return bodies as Record<BodyKey, BodyEphemerisConfig>;
};

/**
 * 创建Ephemeris Store
 */
export const useEphemerisStore = create<EphemerisStoreState>()(
  persist(
    (set, get) => ({
      bodies: initializeBodies(),
      globalEnabled: false,
      
      enableBody: (bodyKey: BodyKey) => {
        set((state) => {
          const currentConfig = state.bodies[bodyKey];
          // 如果之前已经加载过，保持LOADED状态；否则设置为NOT_LOADED
          const newStatus = currentConfig.status === LoadingStatus.LOADED 
            ? LoadingStatus.LOADED 
            : LoadingStatus.NOT_LOADED;
          
          return {
            bodies: {
              ...state.bodies,
              [bodyKey]: {
                ...currentConfig,
                enabled: true,
                status: newStatus,
              },
            },
          };
        });
      },
      
      disableBody: (bodyKey: BodyKey) => {
        set((state) => ({
          bodies: {
            ...state.bodies,
            [bodyKey]: {
              ...state.bodies[bodyKey],
              enabled: false,
            },
          },
        }));
      },
      
      setBodyStatus: (bodyKey: BodyKey, status: LoadingStatus, error?: string) => {
        set((state) => ({
          bodies: {
            ...state.bodies,
            [bodyKey]: {
              ...state.bodies[bodyKey],
              status,
              error,
            },
          },
        }));
      },
      
      setBodyDataSize: (bodyKey: BodyKey, size: number) => {
        set((state) => ({
          bodies: {
            ...state.bodies,
            [bodyKey]: {
              ...state.bodies[bodyKey],
              dataSize: size,
            },
          },
        }));
      },
      
      setBodyTimeRange: (bodyKey: BodyKey, start: number, end: number) => {
        set((state) => ({
          bodies: {
            ...state.bodies,
            [bodyKey]: {
              ...state.bodies[bodyKey],
              timeRange: { start, end },
            },
          },
        }));
      },
      
      setBodyAccuracy: (bodyKey: BodyKey, ephemeris: string, analytical: string) => {
        set((state) => ({
          bodies: {
            ...state.bodies,
            [bodyKey]: {
              ...state.bodies[bodyKey],
              accuracy: { ephemeris, analytical },
            },
          },
        }));
      },
      
      enableAll: () => {
        const bodies = get().bodies;
        const updatedBodies: Partial<Record<BodyKey, BodyEphemerisConfig>> = {};
        
        for (const key of Object.keys(bodies) as BodyKey[]) {
          const currentConfig = bodies[key];
          // 如果之前已经加载过，保持LOADED状态；否则设置为NOT_LOADED
          const newStatus = currentConfig.status === LoadingStatus.LOADED 
            ? LoadingStatus.LOADED 
            : LoadingStatus.NOT_LOADED;
          
          updatedBodies[key] = {
            ...currentConfig,
            enabled: true,
            status: newStatus,
          };
        }
        
        set({ bodies: updatedBodies as Record<BodyKey, BodyEphemerisConfig>, globalEnabled: true });
      },
      
      disableAll: () => {
        const bodies = get().bodies;
        const updatedBodies: Partial<Record<BodyKey, BodyEphemerisConfig>> = {};
        
        for (const key of Object.keys(bodies) as BodyKey[]) {
          updatedBodies[key] = {
            ...bodies[key],
            enabled: false,
          };
        }
        
        set({ bodies: updatedBodies as Record<BodyKey, BodyEphemerisConfig>, globalEnabled: false });
      },
      
      setGlobalEnabled: (enabled: boolean) => {
        set({ globalEnabled: enabled });
        if (enabled) {
          get().enableAll();
        } else {
          get().disableAll();
        }
      },
    }),
    {
      name: 'ephemeris-settings', // localStorage key
      partialize: (state) => ({
        bodies: state.bodies,
        globalEnabled: state.globalEnabled,
      }),
    }
  )
);
