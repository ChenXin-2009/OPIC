/**
 * @module mod-manager/store/modStore
 * @description MOD状态管理Zustand Store
 */

import { create } from 'zustand';
import type { ModState, ModManifest } from '../types';

/**
 * MOD状态条目
 */
export interface ModStateEntry {
  manifest: ModManifest;
  state: ModState;
  config: Record<string, unknown>;
  modState: Record<string, unknown>;
  errorCount: number;
  lastError: string | null;
}

/**
 * MOD Store状态
 */
export interface ModStoreState {
  // MOD数据
  mods: Record<string, ModStateEntry>;

  // 全局状态
  isLoading: boolean;
  error: string | null;

  // Actions
  registerMod: (manifest: ModManifest) => void;
  unregisterMod: (modId: string) => void;
  setModState: (modId: string, state: ModState) => void;
  setModConfig: (modId: string, config: Record<string, unknown>) => void;
  setModModState: (modId: string, modState: Record<string, unknown>) => void;
  recordError: (modId: string, error: string) => void;
  resetErrors: (modId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

/**
 * MOD状态Store
 */
export const useModStore = create<ModStoreState>((set, get) => ({
  mods: {},
  isLoading: false,
  error: null,

  registerMod: (manifest) => {
    set((state) => {
      if (state.mods[manifest.id]) {
        return state; // 已存在，不覆盖
      }

      return {
        mods: {
          ...state.mods,
          [manifest.id]: {
            manifest,
            state: 'registered',
            config: {},
            modState: {},
            errorCount: 0,
            lastError: null,
          },
        },
      };
    });
  },

  unregisterMod: (modId) => {
    set((state) => {
      const { [modId]: _, ...rest } = state.mods;
      return { mods: rest };
    });
  },

  setModState: (modId, modState) => {
    set((state) => {
      const entry = state.mods[modId];
      if (!entry) return state;

      return {
        mods: {
          ...state.mods,
          [modId]: { ...entry, state: modState },
        },
      };
    });
  },

  setModConfig: (modId, config) => {
    set((state) => {
      const entry = state.mods[modId];
      if (!entry) return state;

      return {
        mods: {
          ...state.mods,
          [modId]: { ...entry, config },
        },
      };
    });
  },

  setModModState: (modId, modState) => {
    set((state) => {
      const entry = state.mods[modId];
      if (!entry) return state;

      return {
        mods: {
          ...state.mods,
          [modId]: { ...entry, modState },
        },
      };
    });
  },

  recordError: (modId, error) => {
    set((state) => {
      const entry = state.mods[modId];
      if (!entry) return state;

      return {
        mods: {
          ...state.mods,
          [modId]: {
            ...entry,
            errorCount: entry.errorCount + 1,
            lastError: error,
          },
        },
      };
    });
  },

  resetErrors: (modId) => {
    set((state) => {
      const entry = state.mods[modId];
      if (!entry) return state;

      return {
        mods: {
          ...state.mods,
          [modId]: {
            ...entry,
            errorCount: 0,
            lastError: null,
          },
        },
      };
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clear: () => {
    set({ mods: {}, isLoading: false, error: null });
  },
}));

/**
 * 获取MOD状态
 */
export function getModState(modId: string): ModState | undefined {
  return useModStore.getState().mods[modId]?.state;
}

/**
 * 获取MOD配置
 */
export function getModConfig(modId: string): Record<string, unknown> | undefined {
  return useModStore.getState().mods[modId]?.config;
}

/**
 * 获取所有已启用的MOD ID
 */
export function getEnabledModIds(): string[] {
  const mods = useModStore.getState().mods;
  return Object.entries(mods)
    .filter(([, entry]) => entry.state === 'enabled')
    .map(([id]) => id);
}

/**
 * 获取所有已注册的MOD ID
 */
export function getRegisteredModIds(): string[] {
  return Object.keys(useModStore.getState().mods);
}