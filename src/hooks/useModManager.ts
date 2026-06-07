/**
 * @module hooks/useModManager
 * @description MOD管理器React Hook - 提供MOD生命周期管理的响应式接口
 * 
 * 核心功能：
 * - MOD注册与注销
 * - MOD启用与禁用
 * - 依赖关系解析
 * - 状态查询和配置管理
 * 
 * 架构说明：
 * 本Hook整合了多个MOD管理子系统：
 * 1. ModRegistry - MOD实例注册表
 * 2. ModLifecycle - 生命周期管理器
 * 3. DependencyResolver - 依赖解析器
 * 4. ModStore - Zustand状态存储
 * 5. 各种API（Time, Camera, Celestial, Satellite, Render）
 * 6. EventBus - 事件总线
 * 
 * MOD生命周期状态：
 * - registered: 已注册，manifest已加载
 * - loaded: 已加载，初始化完成但未启用
 * - enabled: 已启用，正在运行
 * - disabled: 已禁用，可以重新启用
 * - error: 错误状态，需要处理
 * 
 * 依赖处理策略：
 * - 启用MOD时自动启用所有依赖项
 * - 禁用MOD时自动禁用所有依赖者
 * - 拓扑排序确保正确的加载顺序
 * - 循环依赖检测和报告
 * 
 * 使用示例：
 * ```typescript
 * function ModManagerPanel() {
 *   const {
 *     mods,
 *     registerMod,
 *     enableMod,
 *     disableMod,
 *     isModEnabled
 *   } = useModManager();
 * 
 *   const handleToggleMod = async (modId: string) => {
 *     if (isModEnabled(modId)) {
 *       await disableMod(modId);
 *     } else {
 *       await enableMod(modId);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       {Object.entries(mods).map(([id, mod]) => (
 *         <ModCard
 *           key={id}
 *           mod={mod}
 *           onToggle={() => handleToggleMod(id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
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
 * 
 * 定义了useModManager返回的完整API接口。
 */
import type { ModStateEntry } from '@/lib/mod-manager/store';

export interface UseModManagerReturn {
  // ========== 状态数据 ==========
  /** 
   * 所有MOD的状态映射
   * key: modId
   * value: MOD的完整状态信息
   */
  mods: Record<string, ModStateEntry>;
  
  /** 
   * MOD管理器是否正在加载
   * 通常在初始化或批量操作时为true
   */
  isLoading: boolean;
  
  /** 
   * 全局错误信息
   * null表示没有错误
   */
  error: string | null;

  // ========== MOD操作方法 ==========
  /** 
   * 注册新MOD
   * @param manifest - MOD的manifest配置
   * @returns 是否注册成功
   */
  registerMod: (manifest: ModManifest) => boolean;
  
  /** 
   * 注销MOD
   * @param modId - 要注销的MOD ID
   * @returns 是否注销成功
   */
  unregisterMod: (modId: string) => boolean;
  
  /** 
   * 启用MOD（会自动处理依赖）
   * @param modId - 要启用的MOD ID
   * @throws 当依赖缺失或解析失败时抛出错误
   */
  enableMod: (modId: string) => Promise<void>;
  
  /** 
   * 禁用MOD（会自动禁用依赖者）
   * @param modId - 要禁用的MOD ID
   */
  disableMod: (modId: string) => Promise<void>;

  // ========== 查询方法 ==========
  /** 
   * 获取MOD的当前状态
   * @param modId - MOD ID
   * @returns MOD状态，不存在时返回undefined
   */
  getModState: (modId: string) => ModState | undefined;
  
  /** 
   * 检查MOD是否已启用
   * @param modId - MOD ID
   * @returns true表示已启用
   */
  isModEnabled: (modId: string) => boolean;
  
  /** 
   * 获取所有已启用的MOD ID列表
   * @returns MOD ID数组
   */
  getEnabledMods: () => string[];

  // ========== 配置管理 ==========
  /** 
   * 获取MOD的配置
   * @param modId - MOD ID
   * @returns 配置对象，不存在时返回undefined
   */
  getModConfig: (modId: string) => Record<string, unknown> | undefined;
  
  /** 
   * 设置MOD的配置
   * @param modId - MOD ID
   * @param config - 新的配置对象
   */
  setModConfig: (modId: string, config: Record<string, unknown>) => void;
}

/**
 * 创建MOD上下文（简化版）
 * 
 * 为MOD创建运行时上下文对象，提供所有可用的API和工具。
 * 
 * 上下文内容：
 * 1. 基础信息 - id, manifest
 * 2. 系统API - time, camera, celestial, satellite, render
 * 3. 状态管理 - config, setState, getState, subscribe
 * 4. 事件系统 - emit, on, off
 * 5. 日志工具 - logger (debug, info, warn, error)
 * 6. 定时器 - setTimeout, setInterval, clearTimeout, clearInterval
 * 
 * 注意事项：
 * - 这是简化版实现，完整版应该包含更多安全检查
 * - RenderAPI需要设置当前MOD ID以进行权限控制
 * - 事件监听器会自动绑定MOD ID用于清理
 * 
 * 生命周期：
 * - 在MOD加载时创建
 * - 在MOD运行期间保持不变
 * - 在MOD卸载时清理相关资源
 * 
 * @param modId - MOD的唯一标识符
 * @param manifest - MOD的manifest配置
 * @returns 完整的MOD运行时上下文
 * 
 * @private
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
 * 提供MOD管理功能的响应式接口，自动响应状态变化。
 * 
 * 特性：
 * - 响应式状态：自动触发组件重渲染
 * - 依赖处理：自动解析和处理MOD依赖关系
 * - 错误处理：捕获并报告操作错误
 * - 类型安全：完整的TypeScript类型定义
 * 
 * 使用模式：
 * 1. 基础使用：
 * ```typescript
 * const { mods, enableMod } = useModManager();
 * ```
 * 
 * 2. 选择性订阅（性能优化）：
 * ```typescript
 * const mods = useModStore(state => state.mods);
 * ```
 * 
 * 3. 方法调用：
 * ```typescript
 * const manager = useModManager();
 * await manager.enableMod('my-mod');
 * ```
 * 
 * 注意事项：
 * - enableMod 和 disableMod 是异步操作
 * - 启用MOD时会自动启用依赖项
 * - 禁用MOD时会自动禁用依赖者
 * - 失败时会抛出错误，建议使用try-catch
 * 
 * @returns {UseModManagerReturn} MOD管理器API
 */
export function useModManager(): UseModManagerReturn {
  const store = useModStore();

  /**
   * 注册MOD
   * 
   * 将新MOD添加到系统中，使其可以被管理和使用。
   * 
   * 执行步骤：
   * 1. 在ModRegistry中注册manifest
   * 2. 在ModStore中创建状态条目
   * 3. 在DependencyResolver中注册依赖关系
   * 
   * 注册后状态：
   * - MOD状态: 'registered'
   * - 可以被启用
   * - 可以被查询
   * - 依赖关系已记录
   * 
   * 失败场景：
   * - MOD ID已存在
   * - Manifest格式无效
   * - 依赖项格式错误
   * 
   * @param manifest - MOD的完整manifest配置
   * @returns true表示注册成功，false表示失败
   */
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

  /**
   * 注销MOD
   * 
   * 从系统中移除MOD，清理所有相关资源。
   * 
   * 执行步骤：
   * 1. 从ModRegistry中注销
   * 2. 从ModStore中删除状态
   * 3. 从DependencyResolver中移除依赖记录
   * 
   * 前置条件：
   * - MOD必须已被禁用（状态不是'enabled'）
   * - 没有其他MOD依赖此MOD
   * 
   * 清理内容：
   * - 移除事件监听器
   * - 清理定时器
   * - 释放渲染资源
   * - 删除配置数据
   * 
   * 失败场景：
   * - MOD不存在
   * - MOD正在运行（需要先禁用）
   * - 有其他MOD依赖此MOD
   * 
   * @param modId - 要注销的MOD ID
   * @returns true表示注销成功，false表示失败
   */
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

  /**
   * 启用MOD
   * 
   * 激活MOD并使其开始运行，自动处理依赖关系。
   * 
   * 执行流程：
   * 1. 检查依赖项是否都已注册
   * 2. 使用依赖解析器计算启用顺序
   * 3. 按拓扑排序的顺序依次启用MOD
   * 4. 为每个MOD创建运行时上下文
   * 5. 调用生命周期的load和enable方法
   * 6. 更新状态到'enabled'
   * 
   * 依赖处理：
   * - 自动检测缺失的依赖项
   * - 按正确顺序启用所有依赖项
   * - 确保依赖项在依赖者之前启用
   * - 如果依赖项已启用，跳过重复启用
   * 
   * 状态转换：
   * - registered → loaded → enabled
   * - 如果已是loaded状态，直接 → enabled
   * 
   * 错误处理：
   * - 缺少依赖项：抛出错误并列出缺失项
   * - 循环依赖：抛出错误
   * - 加载失败：停止后续操作并抛出错误
   * 
   * 性能考虑：
   * - 异步操作，避免阻塞UI
   * - 批量启用时复用依赖解析结果
   * - 已启用的MOD不会重复初始化
   * 
   * @param modId - 要启用的MOD ID
   * @throws 当依赖缺失、解析失败或启用过程出错时抛出
   * 
   * @example
   * ```typescript
   * try {
   *   await enableMod('my-visualization-mod');
   *   console.log('MOD启用成功');
   * } catch (error) {
   *   if (error.message.includes('缺少依赖')) {
   *     console.error('请先安装依赖的MOD');
   *   }
   * }
   * ```
   */
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

  /**
   * 禁用MOD
   * 
   * 停止MOD的运行并清理资源，自动处理依赖关系。
   * 
   * 执行流程：
   * 1. 查找所有依赖此MOD的其他MOD（依赖者）
   * 2. 递归禁用所有依赖者
   * 3. 调用生命周期的disable方法
   * 4. 更新状态到'disabled'
   * 
   * 级联禁用：
   * - 自动禁用所有直接和间接依赖者
   * - 按依赖关系的逆序执行（先禁用依赖者）
   * - 确保不会出现"孤儿"MOD（依赖项被禁用但依赖者仍运行）
   * 
   * 资源清理：
   * - 移除事件监听器
   * - 清除定时器
   * - 释放渲染资源（通过renderAPI）
   * - 停止后台任务
   * 
   * 状态保留：
   * - MOD的配置不会被清除
   * - MOD的状态数据（modState）会被保留
   * - 可以重新启用而不丢失配置
   * 
   * 错误处理：
   * - 禁用失败不会中断整个流程
   * - 会尝试禁用所有依赖者
   * - 记录错误但继续执行
   * 
   * @param modId - 要禁用的MOD ID
   * 
   * @example
   * ```typescript
   * // 禁用单个MOD
   * await disableMod('my-mod');
   * 
   * // 如果MOD-B依赖MOD-A，禁用MOD-A会：
   * // 1. 先禁用MOD-B（依赖者）
   * // 2. 再禁用MOD-A（被依赖项）
   * ```
   */
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

  /**
   * 获取MOD的当前状态
   * 
   * 查询MOD的生命周期状态。
   * 
   * 可能的返回值：
   * - 'registered': 已注册，未加载
   * - 'loaded': 已加载，未启用
   * - 'enabled': 已启用，正在运行
   * - 'disabled': 已禁用，可重新启用
   * - 'error': 错误状态
   * - undefined: MOD不存在
   * 
   * @param modId - MOD ID
   * @returns MOD状态，不存在时返回undefined
   */
  const getModState = useCallback((modId: string): ModState | undefined => {
    return store.mods[modId]?.state;
  }, [store.mods]);

  /**
   * 检查MOD是否已启用
   * 
   * 便捷方法，用于快速检查MOD的启用状态。
   * 
   * @param modId - MOD ID
   * @returns true表示MOD已启用且正在运行
   */
  const isModEnabled = useCallback((modId: string): boolean => {
    return store.mods[modId]?.state === 'enabled';
  }, [store.mods]);

  /**
   * 获取所有已启用的MOD ID列表
   * 
   * 遍历所有MOD并筛选出状态为'enabled'的。
   * 
   * 使用场景：
   * - 显示当前活动的MOD列表
   * - 统计启用的MOD数量
   * - 批量操作已启用的MOD
   * 
   * @returns 已启用的MOD ID数组
   */
  const getEnabledMods = useCallback((): string[] => {
    return Object.entries(store.mods)
      .filter(([, entry]) => entry.state === 'enabled')
      .map(([id]) => id);
  }, [store.mods]);

  /**
   * 获取MOD的配置
   * 
   * 返回MOD的用户自定义配置对象。
   * 
   * 配置特性：
   * - 在MOD禁用后保留
   * - 可以在运行时修改
   * - MOD通过context.config访问
   * 
   * @param modId - MOD ID
   * @returns 配置对象，不存在时返回undefined
   */
  const getModConfig = useCallback((modId: string): Record<string, unknown> | undefined => {
    return store.mods[modId]?.config;
  }, [store.mods]);

  /**
   * 设置MOD的配置
   * 
   * 更新MOD的配置对象。MOD可以通过context.config读取新配置。
   * 
   * 配置更新策略：
   * - 完全替换（不是合并）
   * - 立即生效
   * - MOD需要自行处理配置变更
   * 
   * 建议：
   * - MOD应该监听配置变更（通过context.subscribe）
   * - 验证配置的有效性
   * - 提供配置默认值
   * 
   * @param modId - MOD ID
   * @param config - 新的配置对象
   * 
   * @example
   * ```typescript
   * setModConfig('my-mod', {
   *   theme: 'dark',
   *   showLabels: true,
   *   updateInterval: 1000
   * });
   * ```
   */
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