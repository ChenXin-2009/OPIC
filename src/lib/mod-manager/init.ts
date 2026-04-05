/**
 * @module mod-manager/init
 * @description MOD管理器初始化
 */

import { getRegistry } from './core/ModRegistry';
import { getDependencyResolver } from './core/DependencyResolver';
import { getModLifecycle } from './core/ModLifecycle';
import { getStorageAdapter } from './persistence/LocalStorageAdapter';
import { getMigrationManager } from './persistence/MigrationManager';
import { useModStore } from './store';
import { getTimeAPI } from './api/TimeAPI';
import { getCameraAPI } from './api/CameraAPI';
import { getCelestialAPI } from './api/CelestialAPI';
import { getSatelliteAPI } from './api/SatelliteAPI';
import { getRenderAPI } from './api/RenderAPI';
import { getEventBus } from './core/EventBus';
import type { ModManifest, ModLifecycleHooks, ModContext } from './types';

// 存储需要自动启用的MOD
const pendingAutoEnable: Array<{ modId: string; hooks?: ModLifecycleHooks }> = [];

/**
 * 初始化MOD管理器
 */
export function initModManager(): void {
  // 执行配置迁移
  const migrationManager = getMigrationManager();
  migrationManager.migrateAll();

  // 恢复已启用的MOD列表
  const storage = getStorageAdapter();
  const enabledMods = storage.getEnabledMods();

  if (enabledMods?.modIds) {
    console.log('[MOD Manager] 恢复已启用的MOD:', enabledMods.modIds);
  }
}

/**
 * 创建MOD上下文
 */
function createModContext(modId: string, manifest: ModManifest): ModContext {
  const store = useModStore.getState();
  const eventBus = getEventBus();
  const renderAPI = getRenderAPI();

  // 为该MOD设置当前modId，用于渲染器注册时的命名空间
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
 * 注册一个MOD
 */
export function registerMod(
  manifest: ModManifest,
  lifecycleHooks?: ModLifecycleHooks
): boolean {
  try {
    const registry = getRegistry();

    // 如果已注册，跳过（防止React StrictMode下重复注册）
    if (registry.has(manifest.id)) {
      return true;
    }

    registry.register(manifest, lifecycleHooks);

    const store = useModStore.getState();
    store.registerMod(manifest);

    // 注册依赖
    const resolver = getDependencyResolver();
    resolver.register(manifest.id, manifest.dependencies);

    console.log(`[MOD Manager] 已注册MOD: ${manifest.id}`);

    // 如果设置了默认启用，添加到待启用列表
    if (manifest.defaultEnabled) {
      pendingAutoEnable.push({ modId: manifest.id, hooks: lifecycleHooks });
    }

    return true;
  } catch (error) {
    console.error(`[MOD Manager] 注册MOD失败:`, error);
    return false;
  }
}

/**
 * 自动启用所有 defaultEnabled 的 MOD
 */
export async function autoEnableMods(): Promise<void> {
  const lifecycle = getModLifecycle();
  const registry = getRegistry();

  for (const { modId } of pendingAutoEnable) {
    try {
      const instance = registry.get(modId);
      if (!instance) continue;

      // 创建上下文
      const context = createModContext(modId, instance.manifest);
      const contextFactory = () => context;

      // 加载并启用
      await lifecycle.load(modId, contextFactory);
      await lifecycle.enable(modId, contextFactory);

      // 更新 store 状态
      const store = useModStore.getState();
      store.setModState(modId, 'enabled');

      console.log(`[MOD Manager] 已自动启用MOD: ${modId}`);
    } catch (error) {
      console.error(`[MOD Manager] 自动启用MOD失败 ${modId}:`, error);
    }
  }

  // 清空待启用列表
  pendingAutoEnable.length = 0;
}

/**
 * 注销一个MOD
 */
export function unregisterMod(modId: string): boolean {
  try {
    const registry = getRegistry();
    const result = registry.unregister(modId);

    if (result) {
      const store = useModStore.getState();
      store.unregisterMod(modId);

      const resolver = getDependencyResolver();
      resolver.unregister(modId);

      console.log(`[MOD Manager] 已注销MOD: ${modId}`);
    }

    return result;
  } catch (error) {
    console.error(`[MOD Manager] 注销MOD失败:`, error);
    return false;
  }
}

/**
 * 获取所有已注册的MOD
 */
export function getRegisteredMods(): Array<{ id: string; name: string; version: string; state: string }> {
  const store = useModStore.getState();
  return Object.entries(store.mods).map(([id, entry]) => ({
    id,
    name: entry.manifest.name,
    version: entry.manifest.version,
    state: entry.state,
  }));
}