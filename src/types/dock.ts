/**
 * Dock 任务栏类型定义
 */

import { ReactNode } from 'react';

/**
 * Dock 项目类型
 */
export type DockItemType = 'app' | 'separator' | 'folder';

/**
 * Dock 位置
 */
export type DockPosition = 'bottom' | 'left' | 'right';

/**
 * Dock 大小
 */
export type DockSize = 'small' | 'medium' | 'large';

/**
 * Dock 项目
 */
export interface DockItem {
  /** 唯一标识符 */
  id: string;
  /** 图标 (React 组件或图片 URL) */
  icon: ReactNode | string;
  /** 标签 */
  label: string;
  /** 类型 */
  type: DockItemType;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否正在运行 */
  isRunning?: boolean;
  /** 徽章数字 (未读消息等) */
  badge?: number;
  /** 是否固定在 Dock 中 */
  isPinned?: boolean;
  /** 关联的窗口 ID */
  windowId?: string;
  /** 自定义颜色 */
  color?: string;
  /** 排序顺序 */
  order?: number;
}

/**
 * Dock 状态
 */
export interface DockState {
  /** Dock 项目列表 */
  items: DockItem[];
  /** Dock 位置 */
  position: DockPosition;
  /** Dock 大小 */
  size: DockSize;
  /** 是否自动隐藏 */
  autoHide: boolean;
  /** 是否显示运行指示器 */
  showRunningIndicator: boolean;
  /** 是否显示标签 */
  showLabels: boolean;
}

/**
 * Dock Store 接口
 */
export interface DockStore extends DockState {
  // Dock 项目操作
  
  /** 添加 Dock 项目 */
  addItem: (item: DockItem) => void;
  /** 移除 Dock 项目 */
  removeItem: (id: string) => void;
  /** 更新 Dock 项目 */
  updateItem: (id: string, updates: Partial<DockItem>) => void;
  /** 设置运行状态 */
  setRunning: (id: string, isRunning: boolean) => void;
  /** 设置徽章数字 */
  setBadge: (id: string, badge: number | undefined) => void;
  /** 重新排序项目 */
  reorderItems: (fromIndex: number, toIndex: number) => void;
  /** 获取项目 */
  getItem: (id: string) => DockItem | undefined;
  /** 检查项目是否存在 */
  hasItem: (id: string) => boolean;
  /** 获取所有运行中的应用 */
  getRunningApps: () => DockItem[];
  /** 清空所有非固定项目 */
  clearNonPinnedItems: () => void;
  
  // Dock 配置操作
  
  /** 设置 Dock 位置 */
  setPosition: (position: DockPosition) => void;
  /** 设置 Dock 大小 */
  setSize: (size: DockSize) => void;
  /** 切换自动隐藏 */
  toggleAutoHide: () => void;
  /** 切换运行指示器 */
  toggleRunningIndicator: () => void;
  /** 切换标签显示 */
  toggleLabels: () => void;
}

/**
 * Dock 项目配置 (用于初始化)
 */
export interface DockItemConfig {
  id: string;
  icon: ReactNode | string;
  label: string;
  type?: DockItemType;
  onClick?: () => void;
  isPinned?: boolean;
  windowId?: string;
  color?: string;
  order?: number;
}
