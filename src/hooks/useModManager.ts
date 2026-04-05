/**
 * @module hooks/useModManager
 * @description MOD管理器React Hook
 */

import { useCallback, useMemo } from 'react';
import { useModStore } from '@/lib/mod-manager/store';
import { getRegistry } from '@/lib/mod-manager/core/ModRegistry';
import { getModLifecycle } from '@/lib/mod-manager/core/ModLifecycle';
import { getDependencyResolver } from '@/lib/mod-manager/core/DependencyResolver';
import { getTimeAPI } from '@/lib/mod-manager/api/TimeAPI';
import { getCameraAPI } from '@/lib/mod-manager/api/CameraAPI';
import { getCelestialAPI } from '@/lib/mod-manager/api/CelestialAPI';
import { getSatelliteAPI } from '@/lib/mod-manager/api/SatelliteAPI';
import { getRenderAPI } from '@/lib/mod-manager/api/RenderAPI';
import { getEventBus } from '@/lib/mod-manager/core/EventBus';
import type { ModManifest, ModState, ModContext } from '@/lib/mod-manager/types';

/**
 * MOD管理器Hook返回类型
 */
import type { ModStateEntry } from '@/lib/mod-manager/store';

export interface UseModManagerReturn {
  // 状态
  mods: Record<string, ModStateEntry>;
  isLoading: boolean;
  error: string | null;

  // MOD操作
  registerMod: (manifest: ModManifest) => boolean;
  unregisterMod: (modId: string) => boolean;
  enableMod: (modId: string) => Promise<void>;
  disableMod: (modId: string) => Promise<void>;

  // 查询
  getModState: (modId: string) => ModState | undefined;
  isModEnabled: (modId: string) => boolean;
  getEnabledMods: () => string[];

  // 配置
  getModConfig: (modId: string) => Record<string, unknown> | undefined;
  setModConfig: (modId: string, config: Record<string, unknown>) => void;
}

/**
 * 创建MOD上下文（简化版）
 */
function createModContext(modId: string, manifest: ModManifest): ModContext {
  const store = useModStore.getState();
  const eventBus = getEventBus();
  const renderAPI = getRenderAPI();
  renderAPI._setCurrentModId(modId);

  return {
    id: modId,
    manifest,
    time: getTimeAPI(),
    camera: getCameraAPI(),
    celestial: getCelestialAPI(),
    satellite: getSatelliteAPI(),
    render: renderAPI,
    config: store.mods[modId]?.config || {},
    setState: (state) => store.setModModState(modId, state),
    getState: () => store.mods[modId]?.modState || {},
    subscribe: () => () => {},
    emit: (event, data) => eventBus.emit(event, data),
    on: (event, handler) => {
      eventBus.on(event, handler, modId);
      return () => eventBus.off(event, handler);
    },
    off: (event, handler) => eventBus.off(event, handler),
    logger: {
      debug: (...args) => console.debug(`[${modId}]`, ...args),
      info: (...args) => console.info(`[${modId}]`, ...args),
      warn: (...args) => console.warn(`[${modId}]`, ...args),
      error: (...args) => console.error(`[${modId}]`, ...args),
    },
    setTimeout: (cb, ms) => window.setTimeout(cb, ms),
    setInterval: (cb, ms) => window.setInterval(cb, ms),
    clearTimeout: (id) => window.clearTimeout(id),
    clearInterval: (id) => window.clearInterval(id),
  };
}

/**
 * MOD管理器Hook
 * 
 * 提供MOD管理功能的响应式接口。
 */
export function useModManager(): UseModManagerReturn {
  const store = useModStore();

  // 注册MOD
  const registerMod = useCallback((manifest: ModManifest): boolean => {
    try {
      const registry = getRegistry();
      registry.register(manifest);
      store.registerMod(manifest);

      // 注册依赖
      const resolver = getDependencyResolver();
      resolver.register(manifest.id, manifest.dependencies);

      return true;
    } catch (error) {
      console.error('注册MOD失败:', error);
      return false;
    }
  }, [store]);

  // 注销MOD
  const unregisterMod = useCallback((modId: string): boolean => {
    try {
      const registry = getRegistry();
      const result = registry.unregister(modId);

      if (result) {
        store.unregisterMod(modId);

        // 注销依赖
        const resolver = getDependencyResolver();
        resolver.unregister(modId);
      }

      return result;
    } catch (error) {
      console.error('注销MOD失败:', error);
      return false;
    }
  }, [store]);

  // 启用MOD
  const enableMod = useCallback(async (modId: string): Promise<void> => {
    const lifecycle = getModLifecycle();
    const registry = getRegistry();

    // 检查依赖
    const resolver = getDependencyResolver();
    const missing = resolver.getMissingDependencies(modId);

    if (missing.length > 0) {
      throw new Error(`缺少依赖: ${missing.join(', ')}`);
    }

    // 获取启用顺序
    const resolution = resolver.getEnableOrder([modId]);
    if (!resolution.success) {
      throw new Error('依赖解析失败');
    }

    // 按顺序启用
    for (const id of resolution.loadOrder) {
      const instance = registry.get(id);
      if (!instance) continue;

      if (instance.state !== 'enabled') {
        // 创建上下文
        const context = createModContext(id, instance.manifest);
        const contextFactory = () => context;

        // 如果是 registered 状态，需要先加载
        if (instance.state === 'registered') {
          await lifecycle.load(id, contextFactory);
        }

        await lifecycle.enable(id, contextFactory);
        store.setModState(id, 'enabled');
      }
    }
  }, [store]);

  // 禁用MOD
  const disableMod = useCallback(async (modId: string): Promise<void> => {
    const lifecycle = getModLifecycle();
    const resolver = getDependencyResolver();

    // 获取依赖者
    const dependents = resolver.getAllDependents(modId);
    if (dependents.length > 0) {
      // 先禁用依赖者
      for (const depId of dependents) {
        await disableMod(depId);
      }
    }

    await lifecycle.disable(modId);
    store.setModState(modId, 'disabled');
  }, [store]);

  // 获取MOD状态
  const getModState = useCallback((modId: string): ModState | undefined => {
    return store.mods[modId]?.state;
  }, [store.mods]);

  // 检查MOD是否启用
  const isModEnabled = useCallback((modId: string): boolean => {
    return store.mods[modId]?.state === 'enabled';
  }, [store.mods]);

  // 获取已启用的MOD列表
  const getEnabledMods = useCallback((): string[] => {
    return Object.entries(store.mods)
      .filter(([, entry]) => entry.state === 'enabled')
      .map(([id]) => id);
  }, [store.mods]);

  // 获取MOD配置
  const getModConfig = useCallback((modId: string): Record<string, unknown> | undefined => {
    return store.mods[modId]?.config;
  }, [store.mods]);

  // 设置MOD配置
  const setModConfig = useCallback((modId: string, config: Record<string, unknown>): void => {
    store.setModConfig(modId, config);
  }, [store]);

  return useMemo(() => ({
    mods: store.mods,
    isLoading: store.isLoading,
    error: store.error,

    registerMod,
    unregisterMod,
    enableMod,
    disableMod,

    getModState,
    isModEnabled,
    getEnabledMods,

    getModConfig,
    setModConfig,
  }), [
    store,
    registerMod,
    unregisterMod,
    enableMod,
    disableMod,
    getModState,
    isModEnabled,
    getEnabledMods,
    getModConfig,
    setModConfig,
  ]);
}

export default useModManager;