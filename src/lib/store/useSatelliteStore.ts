/**
 * @module store/useSatelliteStore
 * @description 卫星状态管理 Store - 管理人造卫星的数据、筛选、搜索和交互状态
 * 
 * 本模块使用 Zustand 管理卫星可视化的全局状态，提供以下核心功能:
 * 1. 数据管理 - 从 API 获取和存储 TLE (Two-Line Element) 数据
 * 2. 实时状态 - 管理卫星的位置、速度、可见性等实时状态
 * 3. 筛选搜索 - 支持按名称、NORAD ID 搜索卫星
 * 4. 交互状态 - 管理选中、悬停、轨道显示、相机跟随等交互
 * 5. 持久化存储 - 将用户偏好保存到 localStorage
 * 
 * @architecture
 * - 所属子系统: 状态管理
 * - 架构层级: 服务层
 * - 职责边界:
 *   - 负责: 卫星数据获取、状态管理、筛选逻辑、用户偏好持久化
 *   - 不负责: 卫星位置计算（由 SGP4 算法处理）、3D 渲染、UI 组件逻辑
 * - 设计模式: Flux 单向数据流 + 持久化中间件
 * 
 * @dependencies
 * - 直接依赖:
 *   - zustand (状态管理库)
 *   - zustand/middleware (persist 中间件)
 *   - ../types/satellite (卫星类型定义)
 *   - ../config/satelliteConfig (配置常量)
 * - 被依赖:
 *   - src/components/satellite/ (卫星 UI 组件)
 *   - src/lib/3d/satellite/ (卫星渲染器)
 * - 循环依赖: 无
 * 
 * @stateLifecycle
 * 1. 初始化: 从 localStorage 恢复用户偏好（showSatellites）
 * 2. 数据获取: 调用 fetchSatellites() 从 API 获取 TLE 数据
 * 3. 位置更新: 定期调用 updateSatellitePositions() 更新可见卫星列表
 * 4. 用户交互: 通过 UI 选择、搜索、切换轨道显示
 * 5. 持久化: 状态变化时自动保存到 localStorage
 * 
 * @dataFlow
 * - 输入: API 响应（TLE 数据）、用户操作（搜索、选择）、时间更新
 * - 输出: 可见卫星列表、选中卫星信息、轨道显示状态
 * - 副作用: 
 *   - 网络请求（fetchSatellites）
 *   - localStorage 写入（persist 中间件）
 *   - 控制台日志（调试信息）
 * 
 * @performance
 * - 数据量: 支持 ~1000-5000 颗卫星
 * - 筛选性能: O(n) - 遍历所有卫星进行搜索匹配
 * - 状态更新: O(1) - 直接更新 Map 中的单个条目
 * - 内存占用: ~2-10 MB（取决于卫星数量）
 * - 优化策略: 使用 Map 存储卫星数据，使用 Set 存储可见卫星 ID
 * 
 * @async
 * - fetchSatellites: 异步 API 请求，带超时控制
 * - 错误处理: 捕获网络错误和 API 错误，设置 error 状态
 * 
 * @example
 * ```typescript
 * // 在组件中使用
 * const {
 *   satellites,
 *   visibleSatellites,
 *   fetchSatellites,
 *   setSearchQuery,
 *   selectSatellite
 * } = useSatelliteStore();
 * 
 * // 获取卫星数据
 * await fetchSatellites(SatelliteCategory.ACTIVE);
 * 
 * // 搜索卫星
 * setSearchQuery('ISS');
 * 
 * // 选择卫星
 * selectSatellite(25544); // ISS NORAD ID
 * 
 * // 渲染可见卫星
 * visibleSatellites.forEach(noradId => {
 *   const satellite = satellites.get(noradId);
 *   // 渲染卫星...
 * });
 * ```
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TLEData,
  SatelliteState,
  SatelliteCategory,
  SatelliteAPIResponse,
} from '../types/satellite';
import { satelliteConfig } from '../config/satelliteConfig';

// ============ Store接口定义 ============

/**
 * 卫星状态Store接口
 */
export interface SatelliteStore {
  // ========== 数据状态 ==========
  /** TLE原始数据 Map<noradId, TLEData> */
  tleData: Map<number, TLEData>;
  /** 卫星实时状态 Map<noradId, SatelliteState> */
  satellites: Map<number, SatelliteState>;
  /** 数据加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 数据最后更新时间 */
  lastUpdate: Date | null;

  // ========== 筛选状态 ==========
  /** 搜索查询字符串 */
  searchQuery: string;
  /** 可见卫星的NORAD ID集合 */
  visibleSatellites: Set<number>;

  // ========== 交互状态 ==========
  /** 选中的卫星NORAD ID */
  selectedSatellite: number | null;
  /** 鼠标悬停的卫星NORAD ID */
  hoveredSatellite: number | null;
  /** 显示轨道的卫星NORAD ID集合 */
  showOrbits: Set<number>;
  /** 相机跟随目标卫星NORAD ID */
  cameraFollowTarget: number | null;

  // ========== UI状态 ==========
  /** 是否显示卫星图层 */
  showSatellites: boolean;
  /** 是否显示信息面板 */
  showInfoPanel: boolean;

  // ========== Actions ==========
  /** 从API获取卫星数据 */
  fetchSatellites: (category?: SatelliteCategory) => Promise<void>;
  /** 更新卫星位置和筛选 */
  updateSatellitePositions: (time: number) => void;
  /** 设置搜索查询 */
  setSearchQuery: (query: string) => void;
  /** 选择卫星 */
  selectSatellite: (noradId: number | null) => void;
  /** 设置悬停卫星 */
  setHoveredSatellite: (noradId: number | null) => void;
  /** 切换轨道显示 */
  toggleOrbit: (noradId: number) => void;
  /** 清除所有轨道 */
  clearAllOrbits: () => void;
  /** 设置卫星图层可见性 */
  setShowSatellites: (show: boolean) => void;
  /** 设置信息面板可见性 */
  setShowInfoPanel: (show: boolean) => void;
  /** 更新单个卫星状态 */
  updateSatelliteState: (noradId: number, state: SatelliteState) => void;
  /** 批量更新卫星状态 */
  updateSatelliteStates: (states: Map<number, SatelliteState>) => void;
  /** 设置相机跟随目标 */
  setCameraFollowTarget: (noradId: number | null) => void;
}

// ============ 持久化配置 ============

/**
 * 需要持久化的状态
 */
interface PersistedState {
  showSatellites: boolean;
}

/**
 * 从持久化状态恢复
 */
function hydratePersistedState(persisted: PersistedState): Partial<SatelliteStore> {
  return {
    showSatellites: persisted.showSatellites,
  };
}

/**
 * 转换为持久化状态
 */
function dehydrateState(state: SatelliteStore): PersistedState {
  return {
    showSatellites: state.showSatellites,
  };
}

// ============ 创建Store ============

/**
 * 卫星状态Store
 */
export const useSatelliteStore = create<SatelliteStore>()(
  persist(
    (set, get) => ({
      // ========== 初始状态 ==========
      tleData: new Map(),
      satellites: new Map(),
      loading: false,
      error: null,
      lastUpdate: null,
      searchQuery: '',
      visibleSatellites: new Set(),
      selectedSatellite: null,
      hoveredSatellite: null,
      showOrbits: new Set(),
      cameraFollowTarget: null,
      showSatellites: true,
      showInfoPanel: false,

      // ========== Actions实现 ==========

      /**
       * 从API获取卫星数据
       */
      fetchSatellites: async (category?: SatelliteCategory) => {
        set({ loading: true, error: null });

        try {
          const targetCategory = category || SatelliteCategory.ACTIVE;
          const url = `${satelliteConfig.api.endpoint}?category=${targetCategory}`;

          console.log(`[SatelliteStore] 获取卫星数据: ${targetCategory}`);

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(satelliteConfig.api.timeout),
          });

          if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
          }

          const data: SatelliteAPIResponse = await response.json();

          console.log(`[SatelliteStore] 成功获取 ${data.count} 颗卫星数据`);

          // 转换为Map
          const tleMap = new Map<number, TLEData>(
            data.satellites.map((tle) => [tle.noradId, tle])
          );

          set({
            tleData: tleMap,
            lastUpdate: new Date(data.lastUpdate),
            loading: false,
            error: null,
          });

          // 触发位置更新和筛选
          get().updateSatellitePositions(Date.now());
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : '未知错误';
          console.error('[SatelliteStore] 获取卫星数据失败:', errorMessage);

          set({
            error: `获取卫星数据失败: ${errorMessage}`,
            loading: false,
          });
        }
      },

      /**
       * 更新卫星位置和筛选
       * 
       * 根据搜索查询筛选可见卫星
       */
      updateSatellitePositions: (time: number) => {
        const { tleData, searchQuery } = get();

        // 筛选可见卫星
        const visible = new Set<number>();
        const query = searchQuery.toLowerCase().trim();

        tleData.forEach((tle, noradId) => {
          // 如果有搜索查询，进行搜索筛选
          if (query) {
            const nameMatch = tle.name.toLowerCase().includes(query);
            const idMatch = noradId.toString().includes(query);

            if (!nameMatch && !idMatch) {
              return;
            }
          }

          // 没有搜索查询或匹配搜索条件，添加到可见列表
          visible.add(noradId);
        });

        console.log(
          `[SatelliteStore] 筛选后可见卫星: ${visible.size} / ${tleData.size}`
        );

        set({ visibleSatellites: visible });
      },

      /**
       * 设置搜索查询
       */
      setSearchQuery: (query: string) => {
        console.log(`[SatelliteStore] 设置搜索查询: "${query}"`);

        set({ searchQuery: query });

        // 触发筛选更新
        get().updateSatellitePositions(Date.now());
      },

      /**
       * 选择卫星
       */
      selectSatellite: (noradId: number | null) => {
        console.log(`[SatelliteStore] 选择卫星: ${noradId}`);

        set({
          selectedSatellite: noradId,
          showInfoPanel: noradId !== null,
        });
      },

      /**
       * 设置悬停卫星
       */
      setHoveredSatellite: (noradId: number | null) => {
        set({ hoveredSatellite: noradId });
      },

      /**
       * 切换轨道显示
       */
      toggleOrbit: (noradId: number) => {
        const { showOrbits } = get();
        const newOrbits = new Set(showOrbits);

        if (newOrbits.has(noradId)) {
          // 隐藏轨道
          newOrbits.delete(noradId);
          console.log(`[SatelliteStore] 隐藏轨道: ${noradId}`);
        } else {
          // 显示轨道
          // 限制最多10条轨道
          if (newOrbits.size >= satelliteConfig.ui.maxOrbits) {
            const firstOrbit = newOrbits.values().next().value;
            if (firstOrbit !== undefined) {
              newOrbits.delete(firstOrbit);
              console.log(
                `[SatelliteStore] 达到轨道数量限制,移除最早的轨道: ${firstOrbit}`
              );
            }
          }

          newOrbits.add(noradId);
          console.log(`[SatelliteStore] 显示轨道: ${noradId}`);
        }

        set({ showOrbits: newOrbits });
      },

      /**
       * 清除所有轨道
       */
      clearAllOrbits: () => {
        console.log('[SatelliteStore] 清除所有轨道');
        set({ showOrbits: new Set() });
      },

      /**
       * 设置卫星图层可见性
       */
      setShowSatellites: (show: boolean) => {
        console.log(`[SatelliteStore] 设置卫星图层可见性: ${show}`);
        set({ showSatellites: show });
      },

      /**
       * 设置信息面板可见性
       */
      setShowInfoPanel: (show: boolean) => {
        set({ showInfoPanel: show });

        // 如果关闭面板,清除选中的卫星
        if (!show) {
          set({ selectedSatellite: null });
        }
      },

      /**
       * 更新单个卫星状态
       */
      updateSatelliteState: (noradId: number, state: SatelliteState) => {
        const { satellites } = get();
        const newSatellites = new Map(satellites);
        newSatellites.set(noradId, state);
        set({ satellites: newSatellites });
      },

      /**
       * 批量更新卫星状态
       */
      updateSatelliteStates: (states: Map<number, SatelliteState>) => {
        set({ satellites: new Map(states) });
      },

      /**
       * 设置相机跟随目标
       */
      setCameraFollowTarget: (noradId: number | null) => {
        set({ cameraFollowTarget: noradId });
      },
    }),
    {
      name: 'satellite-store', // localStorage键名
      partialize: (state) => dehydrateState(state), // 选择需要持久化的状态
      merge: (persistedState, currentState) => {
        // 合并持久化状态和当前状态
        const persisted = persistedState as PersistedState;
        return {
          ...currentState,
          ...hydratePersistedState(persisted),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('[SatelliteStore] 从本地存储恢复状态');
          // 恢复后触发筛选更新
          state.updateSatellitePositions(Date.now());
        }
      },
    }
  )
);

/**
 * 导出Store类型
 */
export type { SatelliteCategory, TLEData, SatelliteState };
