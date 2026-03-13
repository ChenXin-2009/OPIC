/**
 * @module store/useEphemerisStore
 * @description 星历数据状态管理 Store - 管理高精度星历数据的加载和配置
 * 
 * 本模块使用 Zustand 管理星历数据的全局状态，提供以下核心功能:
 * 1. 天体星历配置 - 控制每个天体是否使用高精度星历数据
 * 2. 加载状态跟踪 - 跟踪数据加载进度和错误
 * 3. 数据元信息 - 管理数据大小、时间范围、精度信息
 * 4. 持久化存储 - 将用户配置保存到 localStorage
 * 5. 全局开关 - 一键启用/禁用所有天体的高精度模式
 * 
 * @architecture
 * - 所属子系统: 状态管理
 * - 架构层级: 服务层
 * - 职责边界:
 *   - 负责: 星历配置状态管理、加载状态跟踪、用户偏好持久化
 *   - 不负责: 星历数据的实际加载、天体位置计算、UI 渲染
 * - 设计模式: Flux 单向数据流 + 持久化中间件
 * 
 * @dependencies
 * - 直接依赖:
 *   - zustand (状态管理库)
 *   - zustand/middleware (persist 中间件)
 * - 被依赖:
 *   - src/components/ (UI 组件读取和更新状态)
 *   - src/lib/3d/ (渲染器根据配置决定使用哪种数据源)
 * - 循环依赖: 无
 * 
 * @stateLifecycle
 * 1. 初始化: 从 localStorage 恢复用户配置，默认只启用月球
 * 2. 用户操作: 通过 UI 切换天体的启用状态
 * 3. 数据加载: 设置加载状态为 LOADING，加载完成后设置为 LOADED
 * 4. 持久化: 状态变化时自动保存到 localStorage
 * 5. 清理: 页面关闭时自动保存最终状态
 * 
 * @dataFlow
 * - 输入: 用户操作（启用/禁用天体）、数据加载器（更新加载状态）
 * - 输出: 配置状态（供渲染器使用）、UI 状态（供组件显示）
 * - 副作用: localStorage 写入（通过 persist 中间件）
 * 
 * @performance
 * - 状态更新: O(1) - 直接更新 Map 中的单个条目
 * - 持久化: 异步写入 localStorage，不阻塞主线程
 * - 内存占用: ~1-2 KB（32 个天体的配置数据）
 * 
 * @example
 * ```typescript
 * // 在组件中使用
 * const { bodies, enableBody, setBodyStatus } = useEphemerisStore();
 * 
 * // 启用地球的高精度星历
 * enableBody('earth');
 * 
 * // 更新加载状态
 * setBodyStatus('earth', LoadingStatus.LOADING);
 * // ... 加载数据 ...
 * setBodyStatus('earth', LoadingStatus.LOADED);
 * 
 * // 检查是否启用
 * if (bodies.earth.enabled && bodies.earth.status === LoadingStatus.LOADED) {
 *   // 使用高精度数据
 * }
 * ```
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
      enabled: key === 'moon',  // 月球默认启用，其他默认关闭
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
