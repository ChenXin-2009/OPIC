/**
 * @module mod-manager/contribution/ContributionRegistry
 * @description 扩展点注册表实现
 */

import type { ModRegistry } from '../core/ModRegistry';
import type { EventBus } from '../core/EventBus';
import { ContributionError, type ContributionPoints, type DockIconContribution, type WindowContribution, type CommandContribution, type RegisteredDockIcon, type RegisteredWindow, type RegisteredCommand } from './types';

/**
 * 扩展点注册表
 * 
 * 管理 Dock 图标、窗口、命令等扩展点的注册和注销。
 */
export class ContributionRegistry {
  /** Dock 图标注册表 */
  private dockIcons: Map<string, RegisteredDockIcon> = new Map();
  
  /** 窗口注册表 */
  private windows: Map<string, RegisteredWindow> = new Map();
  
  /** 命令注册表 */
  private commands: Map<string, RegisteredCommand> = new Map();

  constructor(
    private registry: ModRegistry,
    private eventBus: EventBus
  ) {}

  /**
   * 注册 MOD 的所有扩展点
   * 
   * @param modId - MOD ID
   * @param contributions - 扩展点配置
   * 
   * @example
   * ```ts
   * registry.registerContributions('my-mod', {
   *   dockIcons: [{ id: 'icon1', icon: '...', label: 'My Icon', command: 'my-mod.command1' }],
   *   commands: [{ id: 'command1', title: 'My Command', handler: 'handleCommand' }],
   * });
   * ```
   */
  registerContributions(modId: string, contributions: ContributionPoints): void {
    // 注册 Dock 图标
    if (contributions.dockIcons) {
      for (const icon of contributions.dockIcons) {
        this.registerDockIcon(modId, icon);
      }
    }

    // 注册窗口
    if (contributions.windows) {
      for (const window of contributions.windows) {
        this.registerWindow(modId, window);
      }
    }

    // 注册命令
    if (contributions.commands) {
      for (const command of contributions.commands) {
        this.registerCommand(modId, command);
      }
    }
  }

  /**
   * 注销 MOD 的所有扩展点
   * 
   * @param modId - MOD ID
   */
  unregisterContributions(modId: string): void {
    // 注销 Dock 图标
    for (const [id, icon] of this.dockIcons) {
      if (icon.modId === modId) {
        this.unregisterDockIcon(id);
      }
    }

    // 注销窗口
    for (const [id, window] of this.windows) {
      if (window.modId === modId) {
        this.unregisterWindow(id);
      }
    }

    // 注销命令
    for (const [id, command] of this.commands) {
      if (command.modId === modId) {
        this.unregisterCommand(id);
      }
    }
  }

  // ============ Dock 图标管理 ============

  /**
   * 注册 Dock 图标
   */
  private registerDockIcon(modId: string, icon: DockIconContribution): void {
    const fullId = `${modId}.${icon.id}`;

    // 检查 ID 冲突
    if (this.dockIcons.has(fullId)) {
      throw new ContributionError(
        `Dock icon "${fullId}" already registered`
      );
    }

    // 注册图标
    this.dockIcons.set(fullId, {
      ...icon,
      modId,
      fullId,
    });

    // 触发事件
    this.eventBus.emit('contribution:dock-icon-registered', {
      modId,
      iconId: fullId,
    });
  }

  /**
   * 注销 Dock 图标
   */
  private unregisterDockIcon(fullId: string): void {
    if (this.dockIcons.delete(fullId)) {
      this.eventBus.emit('contribution:dock-icon-unregistered', {
        iconId: fullId,
      });
    }
  }

  /**
   * 获取所有 Dock 图标（按 order 排序）
   * 
   * @returns Dock 图标数组
   */
  getDockIcons(): RegisteredDockIcon[] {
    return Array.from(this.dockIcons.values()).sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
  }

  /**
   * 获取指定 Dock 图标
   * 
   * @param fullId - 完整 ID
   * @returns Dock 图标或 undefined
   */
  getDockIcon(fullId: string): RegisteredDockIcon | undefined {
    return this.dockIcons.get(fullId);
  }

  /**
   * 更新 Dock 图标徽章
   * 
   * @param fullId - 完整 ID
   * @param badge - 徽章值
   */
  updateDockIconBadge(fullId: string, badge: number | string | undefined): void {
    const icon = this.dockIcons.get(fullId);
    if (icon) {
      icon.badge = badge;
      this.eventBus.emit('contribution:dock-icon-updated', {
        iconId: fullId,
        badge,
      });
    }
  }

  // ============ 窗口管理 ============

  /**
   * 注册窗口
   */
  private registerWindow(modId: string, window: WindowContribution): void {
    const fullId = `${modId}.${window.id}`;

    // 检查 ID 冲突
    if (this.windows.has(fullId)) {
      throw new ContributionError(
        `Window "${fullId}" already registered`
      );
    }

    // 注册窗口
    this.windows.set(fullId, {
      ...window,
      modId,
      fullId,
    });

    // 触发事件
    this.eventBus.emit('contribution:window-registered', {
      modId,
      windowId: fullId,
    });
  }

  /**
   * 注销窗口
   */
  private unregisterWindow(fullId: string): void {
    if (this.windows.delete(fullId)) {
      this.eventBus.emit('contribution:window-unregistered', {
        windowId: fullId,
      });
    }
  }

  /**
   * 获取窗口定义
   * 
   * @param fullId - 完整 ID
   * @returns 窗口定义或 undefined
   */
  getWindow(fullId: string): RegisteredWindow | undefined {
    return this.windows.get(fullId);
  }

  /**
   * 获取所有窗口
   * 
   * @returns 窗口数组
   */
  getWindows(): RegisteredWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * 获取 MOD 的所有窗口
   * 
   * @param modId - MOD ID
   * @returns 窗口数组
   */
  getWindowsByMod(modId: string): RegisteredWindow[] {
    return this.getWindows().filter(w => w.modId === modId);
  }

  // ============ 命令管理 ============

  /**
   * 注册命令
   */
  private registerCommand(modId: string, command: CommandContribution): void {
    const fullId = `${modId}.${command.id}`;

    // 检查 ID 冲突
    if (this.commands.has(fullId)) {
      throw new ContributionError(
        `Command "${fullId}" already registered`
      );
    }

    // 注册命令
    this.commands.set(fullId, {
      ...command,
      modId,
      fullId,
    });

    // 触发事件
    this.eventBus.emit('contribution:command-registered', {
      modId,
      commandId: fullId,
    });
  }

  /**
   * 注销命令
   */
  private unregisterCommand(fullId: string): void {
    if (this.commands.delete(fullId)) {
      this.eventBus.emit('contribution:command-unregistered', {
        commandId: fullId,
      });
    }
  }

  /**
   * 执行命令
   * 
   * @param commandId - 命令 ID
   * @param args - 命令参数
   * 
   * @example
   * ```ts
   * await registry.executeCommand('my-mod.command1', arg1, arg2);
   * ```
   */
  async executeCommand(commandId: string, ...args: unknown[]): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new ContributionError(`Command "${commandId}" not found`);
    }

    try {
      // 获取 MOD 实例
      const instance = this.registry.get(command.modId);
      if (!instance || !instance.context) {
        throw new ContributionError(
          `MOD "${command.modId}" not loaded or has no context`
        );
      }

      // 调用命令处理器 - 从 lifecycleHooks 中查找
      const hooks = instance.lifecycleHooks;
      if (!hooks) {
        throw new ContributionError(
          `MOD "${command.modId}" has no lifecycle hooks`
        );
      }

      const handler = (hooks as any)[command.handler];
      if (typeof handler !== 'function') {
        throw new ContributionError(
          `Command handler "${command.handler}" not found in MOD "${command.modId}"`
        );
      }

      await handler(instance.context, ...args);

      // 触发成功事件
      this.eventBus.emit('contribution:command-executed', {
        commandId,
        success: true,
      });
    } catch (error) {
      console.error(`Failed to execute command "${commandId}":`, error);
      
      // 触发失败事件
      this.eventBus.emit('contribution:command-executed', {
        commandId,
        success: false,
        error,
      });
      
      throw error;
    }
  }

  /**
   * 获取所有命令
   * 
   * @returns 命令数组
   */
  getCommands(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取指定命令
   * 
   * @param fullId - 完整 ID
   * @returns 命令或 undefined
   */
  getCommand(fullId: string): RegisteredCommand | undefined {
    return this.commands.get(fullId);
  }

  /**
   * 按类别获取命令
   * 
   * @returns 按类别分组的命令映射
   */
  getCommandsByCategory(): Map<string, RegisteredCommand[]> {
    const byCategory = new Map<string, RegisteredCommand[]>();

    for (const command of this.commands.values()) {
      const category = command.category || 'General';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(command);
    }

    return byCategory;
  }

  /**
   * 获取 MOD 的所有命令
   * 
   * @param modId - MOD ID
   * @returns 命令数组
   */
  getCommandsByMod(modId: string): RegisteredCommand[] {
    return this.getCommands().filter(c => c.modId === modId);
  }

  /**
   * 检查命令是否存在
   * 
   * @param commandId - 命令 ID
   * @returns 是否存在
   */
  hasCommand(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  // ============ 统计信息 ============

  /**
   * 获取扩展点统计信息
   * 
   * @returns 统计信息
   */
  getStats() {
    return {
      dockIcons: this.dockIcons.size,
      windows: this.windows.size,
      commands: this.commands.size,
      total: this.dockIcons.size + this.windows.size + this.commands.size,
    };
  }

  /**
   * 获取 MOD 的扩展点统计
   * 
   * @param modId - MOD ID
   * @returns 统计信息
   */
  getModStats(modId: string) {
    return {
      dockIcons: Array.from(this.dockIcons.values()).filter(i => i.modId === modId).length,
      windows: Array.from(this.windows.values()).filter(w => w.modId === modId).length,
      commands: Array.from(this.commands.values()).filter(c => c.modId === modId).length,
    };
  }
}
