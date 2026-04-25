/**
 * 窗口管理器类型定义
 */

import { ReactNode } from 'react';

/**
 * 窗口配置
 */
export interface WindowConfig {
  /** 窗口唯一标识符 */
  id: string;
  /** 窗口标题 */
  title: string;
  /** 窗口内容 */
  content: ReactNode;
  /** 默认位置 */
  defaultPosition?: { x: number; y: number };
  /** 默认大小 */
  defaultSize?: { width: number; height: number };
  /** 最小尺寸 */
  minSize?: { width: number; height: number };
  /** 最大尺寸 */
  maxSize?: { width: number; height: number };
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否可拖动 */
  draggable?: boolean;
  /** 是否可最小化 */
  minimizable?: boolean;
  /** 是否可最大化 */
  maximizable?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 窗口图标 */
  icon?: ReactNode | string;
}

/**
 * 窗口状态
 */
export interface WindowState {
  /** 窗口唯一标识符 */
  id: string;
  /** 窗口标题 */
  title: string;
  /** 窗口内容 */
  content: ReactNode;
  /** 当前位置 */
  position: { x: number; y: number };
  /** 当前大小 */
  size: { width: number; height: number };
  /** 最小尺寸 */
  minSize: { width: number; height: number };
  /** 最大尺寸 */
  maxSize?: { width: number; height: number };
  /** z-index 层级 */
  zIndex: number;
  /** 是否最小化 */
  isMinimized: boolean;
  /** 是否最大化 */
  isMaximized: boolean;
  /** 是否可见 */
  isVisible: boolean;
  /** 是否可调整大小 */
  resizable: boolean;
  /** 是否可拖动 */
  draggable: boolean;
  /** 是否可最小化 */
  minimizable: boolean;
  /** 是否可最大化 */
  maximizable: boolean;
  /** 是否可关闭 */
  closable: boolean;
  /** 窗口图标 */
  icon?: ReactNode | string;
  /** 最大化前的位置和大小 (用于恢复) */
  previousState?: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
}

/**
 * 窗口管理器 Store 接口
 */
export interface WindowManagerStore {
  /** 所有窗口状态 */
  windows: Map<string, WindowState>;
  /** 当前活动窗口 ID */
  activeWindowId: string | null;
  /** 最大 z-index */
  maxZIndex: number;
  
  // 窗口操作方法
  
  /** 打开窗口 */
  openWindow: (config: WindowConfig) => void;
  /** 关闭窗口 */
  closeWindow: (id: string) => void;
  /** 最小化窗口 */
  minimizeWindow: (id: string) => void;
  /** 最大化窗口 */
  maximizeWindow: (id: string) => void;
  /** 恢复窗口 (从最小化或最大化状态) */
  restoreWindow: (id: string) => void;
  /** 聚焦窗口 */
  focusWindow: (id: string) => void;
  /** 更新窗口位置 */
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
  /** 更新窗口大小 */
  updateWindowSize: (id: string, size: { width: number; height: number }) => void;
  /** 切换窗口可见性 */
  toggleWindowVisibility: (id: string) => void;
  /** 获取窗口状态 */
  getWindow: (id: string) => WindowState | undefined;
  /** 检查窗口是否存在 */
  hasWindow: (id: string) => boolean;
  /** 获取所有可见窗口 */
  getVisibleWindows: () => WindowState[];
  /** 清空所有窗口 */
  clearAllWindows: () => void;
}

/**
 * 窗口拖动状态
 */
export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startWindowX: number;
  startWindowY: number;
}

/**
 * 窗口调整大小状态
 */
export interface ResizeState {
  isResizing: boolean;
  direction: ResizeDirection | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startWindowX: number;
  startWindowY: number;
}

/**
 * 调整大小方向
 */
export type ResizeDirection =
  | 'n'  // 北 (上)
  | 's'  // 南 (下)
  | 'e'  // 东 (右)
  | 'w'  // 西 (左)
  | 'ne' // 东北 (右上)
  | 'nw' // 西北 (左上)
  | 'se' // 东南 (右下)
  | 'sw'; // 西南 (左下)
