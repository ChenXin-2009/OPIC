/**
 * @module mod-manager/contribution/WindowManager
 * @description 窗口管理器实现
 */

import type { EventBus } from '../core/EventBus';
import type { RegisteredWindow } from './types';

/**
 * 窗口实例状态
 */
export interface WindowInstance {
  /** 窗口 ID */
  id: string;
  /** 窗口定义 */
  definition: RegisteredWindow;
  /** 当前位置 */
  position: { x: number; y: number };
  /** 当前大小 */
  size: { width: number; height: number };
  /** z-index */
  zIndex: number;
  /** 是否最小化 */
  minimized: boolean;
  /** 是否获得焦点 */
  focused: boolean;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 窗口管理器
 * 
 * 管理窗口的创建、销毁、z-index 和焦点。
 */
export class WindowManager {
  /** 窗口实例映射 */
  private instances: Map<string, WindowInstance> = new Map();
  
  /** 下一个 z-index */
  private nextZIndex = 1000;
  
  /** 当前焦点窗口 ID */
  private focusedWindowId: string | null = null;

  constructor(private eventBus: EventBus) {
    // 监听窗口注销事件,自动关闭该窗口定义的所有实例
    this.eventBus.on('contribution:window-unregistered', (event: any) => {
      const fullId = event.windowId as string;
      // 关闭所有使用该窗口定义的实例
      const instances = Array.from(this.instances.values()).filter(
        (instance) => instance.definition.fullId === fullId
      );
      for (const instance of instances) {
        this.closeWindow(instance.id);
      }
    });
  }

  /**
   * 打开窗口
   * 
   * @param definition - 窗口定义
   * @param options - 打开选项
   * @returns 窗口实例 ID
   * 
   * @example
   * ```ts
   * const instanceId = windowManager.openWindow(windowDef, {
   *   position: { x: 100, y: 100 },
   *   size: { width: 800, height: 600 },
   * });
   * ```
   */
  openWindow(
    definition: RegisteredWindow,
    options?: {
      position?: { x: number; y: number };
      size?: { width: number; height: number };
    }
  ): string {
    // 生成实例 ID (允许同一窗口定义打开多个实例)
    const instanceId = `${definition.fullId}-${Date.now()}`;

    // 创建窗口实例
    const instance: WindowInstance = {
      id: instanceId,
      definition,
      position: options?.position || definition.defaultPosition || { x: 100, y: 100 },
      size: options?.size || definition.defaultSize || { width: 800, height: 600 },
      zIndex: this.nextZIndex++,
      minimized: false,
      focused: true,
      createdAt: Date.now(),
    };

    // 保存实例
    this.instances.set(instanceId, instance);

    // 设置焦点
    this.setFocus(instanceId);

    // 触发事件
    this.eventBus.emit('window:opened', {
      instanceId,
      windowId: definition.fullId,
      modId: definition.modId,
    });

    return instanceId;
  }

  /**
   * 关闭窗口
   * 
   * @param instanceId - 窗口实例 ID
   * 
   * @example
   * ```ts
   * windowManager.closeWindow(instanceId);
   * ```
   */
  closeWindow(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    // 删除实例
    this.instances.delete(instanceId);

    // 如果是焦点窗口,清除焦点
    if (this.focusedWindowId === instanceId) {
      this.focusedWindowId = null;
      
      // 将焦点转移到最上层的窗口
      const topWindow = this.getTopWindow();
      if (topWindow) {
        this.setFocus(topWindow.id);
      }
    }

    // 触发事件
    this.eventBus.emit('window:closed', {
      instanceId,
      windowId: instance.definition.fullId,
      modId: instance.definition.modId,
    });
  }

  /**
   * 关闭 MOD 的所有窗口
   * 
   * @param modId - MOD ID
   */
  closeModWindows(modId: string): void {
    const instances = Array.from(this.instances.values()).filter(
      (instance) => instance.definition.modId === modId
    );

    for (const instance of instances) {
      this.closeWindow(instance.id);
    }
  }

  /**
   * 设置窗口焦点
   * 
   * @param instanceId - 窗口实例 ID
   * 
   * @example
   * ```ts
   * windowManager.setFocus(instanceId);
   * ```
   */
  setFocus(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    // 取消之前焦点窗口的焦点
    if (this.focusedWindowId && this.focusedWindowId !== instanceId) {
      const prevFocused = this.instances.get(this.focusedWindowId);
      if (prevFocused) {
        prevFocused.focused = false;
      }
    }

    // 设置新焦点
    instance.focused = true;
    instance.zIndex = this.nextZIndex++;
    this.focusedWindowId = instanceId;

    // 触发事件
    this.eventBus.emit('window:focused', {
      instanceId,
      windowId: instance.definition.fullId,
    });
  }

  /**
   * 最小化窗口
   * 
   * @param instanceId - 窗口实例 ID
   */
  minimizeWindow(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.definition.minimizable) {
      return;
    }

    instance.minimized = true;

    // 如果是焦点窗口,转移焦点
    if (this.focusedWindowId === instanceId) {
      this.focusedWindowId = null;
      const topWindow = this.getTopWindow();
      if (topWindow) {
        this.setFocus(topWindow.id);
      }
    }

    // 触发事件
    this.eventBus.emit('window:minimized', {
      instanceId,
      windowId: instance.definition.fullId,
    });
  }

  /**
   * 恢复窗口
   * 
   * @param instanceId - 窗口实例 ID
   */
  restoreWindow(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.minimized) {
      return;
    }

    instance.minimized = false;
    this.setFocus(instanceId);

    // 触发事件
    this.eventBus.emit('window:restored', {
      instanceId,
      windowId: instance.definition.fullId,
    });
  }

  /**
   * 更新窗口位置
   * 
   * @param instanceId - 窗口实例 ID
   * @param position - 新位置
   */
  updatePosition(instanceId: string, position: { x: number; y: number }): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    instance.position = position;

    // 触发事件
    this.eventBus.emit('window:moved', {
      instanceId,
      position,
    });
  }

  /**
   * 更新窗口大小
   * 
   * @param instanceId - 窗口实例 ID
   * @param size - 新大小
   */
  updateSize(instanceId: string, size: { width: number; height: number }): void {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.definition.resizable) {
      return;
    }

    instance.size = size;

    // 触发事件
    this.eventBus.emit('window:resized', {
      instanceId,
      size,
    });
  }

  /**
   * 获取窗口实例
   * 
   * @param instanceId - 窗口实例 ID
   * @returns 窗口实例或 undefined
   */
  getInstance(instanceId: string): WindowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * 获取所有窗口实例
   * 
   * @returns 窗口实例数组
   */
  getAllInstances(): WindowInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * 获取可见窗口(未最小化)
   * 
   * @returns 窗口实例数组(按 z-index 排序)
   */
  getVisibleWindows(): WindowInstance[] {
    return Array.from(this.instances.values())
      .filter((instance) => !instance.minimized)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * 获取最小化的窗口
   * 
   * @returns 窗口实例数组
   */
  getMinimizedWindows(): WindowInstance[] {
    return Array.from(this.instances.values()).filter(
      (instance) => instance.minimized
    );
  }

  /**
   * 获取最上层的窗口
   * 
   * @returns 窗口实例或 undefined
   */
  getTopWindow(): WindowInstance | undefined {
    const visible = this.getVisibleWindows();
    return visible.length > 0 ? visible[visible.length - 1] : undefined;
  }

  /**
   * 获取当前焦点窗口
   * 
   * @returns 窗口实例或 undefined
   */
  getFocusedWindow(): WindowInstance | undefined {
    return this.focusedWindowId
      ? this.instances.get(this.focusedWindowId)
      : undefined;
  }

  /**
   * 获取 MOD 的所有窗口实例
   * 
   * @param modId - MOD ID
   * @returns 窗口实例数组
   */
  getModInstances(modId: string): WindowInstance[] {
    return Array.from(this.instances.values()).filter(
      (instance) => instance.definition.modId === modId
    );
  }

  /**
   * 检查窗口是否打开
   * 
   * @param instanceId - 窗口实例 ID
   * @returns 是否打开
   */
  isOpen(instanceId: string): boolean {
    return this.instances.has(instanceId);
  }

  /**
   * 获取窗口数量
   * 
   * @returns 窗口数量
   */
  getWindowCount(): number {
    return this.instances.size;
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    const instanceIds = Array.from(this.instances.keys());
    for (const instanceId of instanceIds) {
      this.closeWindow(instanceId);
    }
  }
}
