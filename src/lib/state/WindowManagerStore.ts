/**
 * 窗口管理器 Zustand Store
 *
 * 管理所有浮动窗口的状态和操作，支持打开/关闭、最小化/最大化/恢复、
 * 聚焦/拖拽/缩放、可见性切换等完整窗口生命周期。
 */

import { create } from 'zustand';
import { WindowConfig, WindowState, WindowManagerStore } from '@/types/window';

/**
 * 默认窗口配置
 */
const DEFAULT_WINDOW_CONFIG = {
  defaultPosition: { x: 100, y: 100 },
  defaultSize: { width: 600, height: 400 },
  minSize: { width: 300, height: 200 },
  resizable: true,
  draggable: true,
  minimizable: true,
  maximizable: true,
  closable: true,
};

/**
 * 初始 z-index
 */
const INITIAL_Z_INDEX = 1000;

/** 窗口管理器全局状态 Store */
export const useWindowManagerStore = create<WindowManagerStore>((set, get) => ({
  windows: new Map(),
  activeWindowId: null,
  maxZIndex: INITIAL_Z_INDEX,

  /**
   * 打开窗口
   *
   * 若窗口已存在则聚焦；否则按配置创建新窗口，自动钳制尺寸至视口范围。
   *
   * @param config - 窗口配置对象
   */
  openWindow: (config: WindowConfig) => {
    const { windows, maxZIndex } = get();

    // 如果窗口已存在，聚焦它
    if (windows.has(config.id)) {
      get().focusWindow(config.id);
      return;
    }

    // 创建新窗口状态
    const viewportW = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1920;
    const viewportH = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 1080;
    const defaultSize = config.defaultSize || DEFAULT_WINDOW_CONFIG.defaultSize;
    const clampedSize = {
      width: Math.min(defaultSize.width, viewportW - 20),
      height: Math.min(defaultSize.height, viewportH - 20),
    };
    const newWindow: WindowState = {
      id: config.id,
      title: config.title,
      content: config.content,
      position: config.defaultPosition || DEFAULT_WINDOW_CONFIG.defaultPosition,
      size: clampedSize,
      minSize: config.minSize || DEFAULT_WINDOW_CONFIG.minSize,
      maxSize: config.maxSize,
      zIndex: maxZIndex + 1,
      isMinimized: false,
      isMaximized: false,
      isVisible: true,
      resizable: config.resizable ?? DEFAULT_WINDOW_CONFIG.resizable,
      draggable: config.draggable ?? DEFAULT_WINDOW_CONFIG.draggable,
      minimizable: config.minimizable ?? DEFAULT_WINDOW_CONFIG.minimizable,
      maximizable: config.maximizable ?? DEFAULT_WINDOW_CONFIG.maximizable,
      closable: config.closable ?? DEFAULT_WINDOW_CONFIG.closable,
      icon: config.icon,
    };

    set({
      windows: new Map(windows).set(config.id, newWindow),
      activeWindowId: config.id,
      maxZIndex: maxZIndex + 1,
    });
  },

  /**
   * 关闭窗口
   *
   * 若关闭的窗口为当前活动窗口，自动清除 activeWindowId。
   *
   * @param id - 窗口唯一标识符
   */
  closeWindow: (id: string) => {
    const { windows, activeWindowId } = get();

    if (!windows.has(id)) {
      return;
    }

    const newWindows = new Map(windows);
    newWindows.delete(id);

    // 如果关闭的是活动窗口，清除活动窗口 ID
    const newActiveWindowId = activeWindowId === id ? null : activeWindowId;

    set({
      windows: newWindows,
      activeWindowId: newActiveWindowId,
    });
  },

  /**
   * 最小化窗口
   *
   * 将窗口隐藏并标记为最小化状态。若窗口不允许最小化则静默返回。
   *
   * @param id - 窗口唯一标识符
   */
  minimizeWindow: (id: string) => {
    const { windows } = get();
    const window = windows.get(id);

    if (!window || !window.minimizable) {
      return;
    }

    const newWindows = new Map(windows);
    newWindows.set(id, {
      ...window,
      isMinimized: true,
      isVisible: false,
    });

    set({ windows: newWindows });
  },

  /**
   * 最大化窗口
   *
   * 将窗口填满视口，同时保存当前尺寸/位置以便恢复。
   * 若窗口不允许最大化则静默返回。
   *
   * @param id - 窗口唯一标识符
   */
  maximizeWindow: (id: string) => {
    const { windows } = get();
    const window = windows.get(id);

    if (!window || !window.maximizable) {
      return;
    }

    // 保存当前状态以便恢复
    const previousState = {
      position: { ...window.position },
      size: { ...window.size },
    };

    // 获取视口尺寸
    const viewportWidth = typeof window !== 'undefined' ? globalThis.window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? globalThis.window.innerHeight : 1080;

    const newWindows = new Map(windows);
    newWindows.set(id, {
      ...window,
      position: { x: 0, y: 0 },
      size: { width: viewportWidth, height: viewportHeight },
      isMaximized: true,
      previousState,
    });

    set({ windows: newWindows });
  },

  /**
   * 恢复窗口（从最小化或最大化状态）
   *
   * - 最小化状态：恢复可见性并取消最小化标记
   * - 最大化状态：恢复至保存的 previousState
   *
   * @param id - 窗口唯一标识符
   */
  restoreWindow: (id: string) => {
    const { windows } = get();
    const window = windows.get(id);

    if (!window) {
      return;
    }

    const newWindows = new Map(windows);

    if (window.isMinimized) {
      // 从最小化恢复
      newWindows.set(id, {
        ...window,
        isMinimized: false,
        isVisible: true,
      });
    } else if (window.isMaximized && window.previousState) {
      // 从最大化恢复
      newWindows.set(id, {
        ...window,
        position: window.previousState.position,
        size: window.previousState.size,
        isMaximized: false,
        previousState: undefined,
      });
    }

    set({ windows: newWindows });
  },

  /**
   * 聚焦窗口
   *
   * 将窗口提升至最高 z-index，设为活动窗口。
   * 若窗口当前处于最小化状态则先恢复。
   *
   * @param id - 窗口唯一标识符
   */
  focusWindow: (id: string) => {
    const { windows, maxZIndex } = get();
    const window = windows.get(id);

    if (!window) {
      return;
    }

    // 如果窗口被最小化，先恢复它
    if (window.isMinimized) {
      get().restoreWindow(id);
    }

    const newWindows = new Map(windows);
    newWindows.set(id, {
      ...window,
      zIndex: maxZIndex + 1,
    });

    set({
      windows: newWindows,
      activeWindowId: id,
      maxZIndex: maxZIndex + 1,
    });
  },

  /**
   * 更新窗口位置（拖拽）
   *
   * @param id - 窗口唯一标识符
   * @param position - 新的窗口位置坐标
   */
  updateWindowPosition: (id: string, position: { x: number; y: number }) => {
    const { windows } = get();
    const window = windows.get(id);

    if (!window || !window.draggable) {
      return;
    }

    const newWindows = new Map(windows);
    newWindows.set(id, {
      ...window,
      position,
    });

    set({ windows: newWindows });
  },

  /**
   * 更新窗口大小（缩放）
   *
   * 自动将尺寸钳制在 minSize / maxSize 范围内。
   *
   * @param id - 窗口唯一标识符
   * @param size - 新的窗口尺寸
   */
  updateWindowSize: (id: string, size: { width: number; height: number }) => {
    const { windows } = get();
    const window = windows.get(id);

    if (!window || !window.resizable) {
      return;
    }

    // 应用最小/最大尺寸限制
    const constrainedSize = {
      width: Math.max(
        window.minSize.width,
        window.maxSize ? Math.min(size.width, window.maxSize.width) : size.width
      ),
      height: Math.max(
        window.minSize.height,
        window.maxSize ? Math.min(size.height, window.maxSize.height) : size.height
      ),
    };

    const newWindows = new Map(windows);
    newWindows.set(id, {
      ...window,
      size: constrainedSize,
    });

    set({ windows: newWindows });
  },

  /**
   * 切换窗口可见性
   *
   * @param id - 窗口唯一标识符
   */
  toggleWindowVisibility: (id: string) => {
    const { windows } = get();
    const window = windows.get(id);

    if (!window) {
      return;
    }

    const newWindows = new Map(windows);
    newWindows.set(id, {
      ...window,
      isVisible: !window.isVisible,
    });

    set({ windows: newWindows });
  },

  /**
   * 获取窗口状态
   *
   * @param id - 窗口唯一标识符
   * @returns 窗口状态对象，未找到时返回 undefined
   */
  getWindow: (id: string) => {
    return get().windows.get(id);
  },

  /**
   * 检查窗口是否存在
   *
   * @param id - 窗口唯一标识符
   * @returns 是否存在
   */
  hasWindow: (id: string) => {
    return get().windows.has(id);
  },

  /**
   * 获取所有可见窗口
   *
   * @returns 按 z-index 升序排列的可见窗口数组
   */
  getVisibleWindows: () => {
    const { windows } = get();
    return Array.from(windows.values())
      .filter(window => window.isVisible)
      .sort((a, b) => a.zIndex - b.zIndex);
  },

  /**
   * 清空所有窗口
   *
   * 重置 windows Map、activeWindowId 和 maxZIndex。
   */
  clearAllWindows: () => {
    set({
      windows: new Map(),
      activeWindowId: null,
      maxZIndex: INITIAL_Z_INDEX,
    });
  },
}));
