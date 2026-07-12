/**
 * Dock 任务栏 Zustand Store
 *
 * 管理 Dock 的状态和操作，支持项目添加/移除/排序、位置/尺寸切换、运行指示器及标签控制。
 */

import { create } from 'zustand';
import { DockItem, DockStore, DockItemConfig } from '@/types/dock';

/** Dock 全局状态 Store */
export const useDockStore = create<DockStore>((set, get) => ({
  // 初始状态
  items: [],
  position: 'bottom',
  size: 'medium',
  autoHide: false,
  showRunningIndicator: true,
  showLabels: true,

  /**
   * 添加 Dock 项目
   *
   * 自动去重（按 id），未指定 order 时追加到末尾。
   * 添加后按 order 升序排序。
   *
   * @param item - 待添加的 Dock 项目
   */
  addItem: (item: DockItem) => {
    const { items } = get();

    // 检查是否已存在
    if (items.some(i => i.id === item.id)) {
      console.warn(`Dock item with id "${item.id}" already exists`);
      return;
    }

    // 如果没有指定 order，使用当前最大 order + 1
    const maxOrder = items.reduce((max, i) => Math.max(max, i.order || 0), 0);
    const newItem = {
      ...item,
      order: item.order ?? maxOrder + 1,
    };

    set({
      items: [...items, newItem].sort((a, b) => (a.order || 0) - (b.order || 0)),
    });
  },

  /**
   * 移除 Dock 项目
   *
   * @param id - 项目唯一标识符
   */
  removeItem: (id: string) => {
    const { items } = get();
    set({
      items: items.filter(item => item.id !== id),
    });
  },

  /**
   * 更新 Dock 项目
   *
   * @param id - 项目唯一标识符
   * @param updates - 需要更新的部分字段
   */
  updateItem: (id: string, updates: Partial<DockItem>) => {
    const { items } = get();
    set({
      items: items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  },

  /**
   * 设置运行状态
   *
   * @param id - 项目唯一标识符
   * @param isRunning - 是否正在运行
   */
  setRunning: (id: string, isRunning: boolean) => {
    get().updateItem(id, { isRunning });
  },

  /**
   * 设置徽章数字
   *
   * @param id - 项目唯一标识符
   * @param badge - 徽章数字（传入 undefined 清除）
   */
  setBadge: (id: string, badge: number | undefined) => {
    get().updateItem(id, { badge });
  },

  /**
   * 重新排序项目
   *
   * 将项目从 fromIndex 移动到 toIndex，并重置所有项目的 order 字段。
   * 索引越界时静默返回。
   *
   * @param fromIndex - 源位置索引
   * @param toIndex - 目标位置索引
   */
  reorderItems: (fromIndex: number, toIndex: number) => {
    const { items } = get();

    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
      return;
    }

    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    // 更新 order
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    set({ items: reorderedItems });
  },

  /**
   * 获取项目
   *
   * @param id - 项目唯一标识符
   * @returns 匹配的 DockItem，未找到时返回 undefined
   */
  getItem: (id: string) => {
    return get().items.find(item => item.id === id);
  },

  /**
   * 检查项目是否存在
   *
   * @param id - 项目唯一标识符
   * @returns 是否存在
   */
  hasItem: (id: string) => {
    return get().items.some(item => item.id === id);
  },

  /**
   * 获取所有运行中的应用
   *
   * @returns 当前正在运行的所有 DockItem 数组
   */
  getRunningApps: () => {
    return get().items.filter(item => item.isRunning);
  },

  /**
   * 清空所有非固定项目
   *
   * 仅保留 isPinned 为 true 的项目。
   */
  clearNonPinnedItems: () => {
    const { items } = get();
    set({
      items: items.filter(item => item.isPinned),
    });
  },

  /**
   * 设置 Dock 位置
   *
   * @param position - Dock 位置（'bottom' | 'left' | 'right' | 'top'）
   */
  setPosition: (position) => {
    set({ position });
  },

  /**
   * 设置 Dock 大小
   *
   * @param size - Dock 尺寸（'small' | 'medium' | 'large'）
   */
  setSize: (size) => {
    set({ size });
  },

  /**
   * 切换自动隐藏
   */
  toggleAutoHide: () => {
    set(state => ({ autoHide: !state.autoHide }));
  },

  /**
   * 切换运行指示器
   */
  toggleRunningIndicator: () => {
    set(state => ({ showRunningIndicator: !state.showRunningIndicator }));
  },

  /**
   * 切换标签显示
   */
  toggleLabels: () => {
    set(state => ({ showLabels: !state.showLabels }));
  },
}));

/**
 * 初始化默认 Dock 项目
 *
 * 将一组 DockItemConfig 批量添加到 Dock Store 中，
 * 自动补全 type、isRunning、isPinned、order 等默认字段。
 *
 * @param items - 默认 Dock 项目配置数组
 */
export function initializeDefaultDockItems(items: DockItemConfig[]) {
  const dockStore = useDockStore.getState();

  items.forEach((config, index) => {
    const item: DockItem = {
      ...config,
      type: config.type || 'app',
      isRunning: false,
      isPinned: config.isPinned ?? true,
      order: config.order ?? index,
    };

    dockStore.addItem(item);
  });
}
