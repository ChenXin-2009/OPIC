/**
 * 卫星状态管理Store
 * 
 * 使用Zustand管理卫星数据、筛选、搜索和交互状态
 * 
 * 功能:
 * - 从API获取卫星TLE数据
 * - 管理卫星位置和可见性
 * - 处理类别筛选和搜索
 * - 管理卫星选择和轨道显示
 * - 持久化用户偏好到本地存储
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
