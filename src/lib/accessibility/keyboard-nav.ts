/**
 * 键盘导航管理器
 * 
 * 提供全局键盘快捷键注册、焦点管理和导航功能
 * 
 * 功能：
 * - 快捷键注册和管理
 * - 焦点陷阱（Focus Trap）
 * - 焦点导航（Tab, Shift+Tab）
 * - 帮助覆盖层（按 ? 键显示）
 * 
 * @example
 * ```typescript
 * const keyboardNav = KeyboardNavigationManager.getInstance();
 * 
 * // 注册快捷键
 * keyboardNav.registerShortcut('search', {
 *   key: 's',
 *   ctrl: true,
 *   description: 'Open search',
 *   action: () => openSearch()
 * });
 * 
 * // 启用焦点陷阱
 * keyboardNav.enableFocusTrap(modalElement);
 * ```
 */

import { logger } from '@/utils/logger';

/**
 * 键盘快捷键接口
 */
export interface KeyboardShortcut {
  /** 按键（例如: 'a', 'Enter', 'ArrowUp'） */
  key: string;
  
  /** 是否需要 Ctrl 键 */
  ctrl?: boolean;
  
  /** 是否需要 Shift 键 */
  shift?: boolean;
  
  /** 是否需要 Alt 键 */
  alt?: boolean;
  
  /** 快捷键描述（用于帮助覆盖层） */
  description: string;
  
  /** 触发的操作 */
  action: () => void;
  
  /** 快捷键分类（用于帮助覆盖层分组） */
  category?: 'navigation' | 'camera' | 'ui' | 'development' | 'other';
  
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
  
  /** 是否阻止事件冒泡 */
  stopPropagation?: boolean;
}

/**
 * 可聚焦元素选择器
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * 键盘导航管理器类（单例）
 */
export class KeyboardNavigationManager {
  private static instance: KeyboardNavigationManager | null = null;
  
  /** 注册的快捷键映射 */
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  
  /** 当前焦点陷阱元素 */
  private focusTrap: HTMLElement | null = null;
  
  /** 焦点陷阱的首个可聚焦元素 */
  private trapFirstElement: HTMLElement | null = null;
  
  /** 焦点陷阱的最后一个可聚焦元素 */
  private trapLastElement: HTMLElement | null = null;
  
  /** 是否已初始化 */
  private isInitialized: boolean = false;
  
  /** 帮助覆盖层元素 */
  private helpOverlay: HTMLElement | null = null;
  
  /** 是否显示帮助覆盖层 */
  private isHelpVisible: boolean = false;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    // 初始化将在 initialize() 中进行
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): KeyboardNavigationManager {
    if (!KeyboardNavigationManager.instance) {
      KeyboardNavigationManager.instance = new KeyboardNavigationManager();
    }
    return KeyboardNavigationManager.instance;
  }

  /**
   * 初始化键盘导航管理器
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('KeyboardNavigationManager 已初始化');
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('KeyboardNavigationManager 仅在浏览器环境中可用');
      return;
    }

    // 注册全局键盘事件监听器
    document.addEventListener('keydown', this.handleKeyDown);
    
    // 注册默认快捷键
    this.registerDefaultShortcuts();
    
    this.isInitialized = true;
    logger.debug('KeyboardNavigationManager 已初始化');
  }

  /**
   * 销毁键盘导航管理器
   */
  public destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    // 移除全局键盘事件监听器
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // 清除焦点陷阱
    this.disableFocusTrap();
    
    // 清除帮助覆盖层
    this.hideHelp();
    
    // 清空快捷键
    this.shortcuts.clear();
    
    this.isInitialized = false;
    logger.debug('KeyboardNavigationManager 已销毁');
  }

  /**
   * 注册默认快捷键
   */
  private registerDefaultShortcuts(): void {
    // 帮助覆盖层
    this.registerShortcut('help', {
      key: '?',
      description: '显示键盘快捷键帮助',
      category: 'ui',
      action: () => this.toggleHelp(),
    });

    // 摄像机控制
    this.registerShortcut('camera-forward', {
      key: 'ArrowUp',
      description: '向前移动摄像机',
      category: 'camera',
      action: () => this.moveCameraForward(),
    });

    this.registerShortcut('camera-backward', {
      key: 'ArrowDown',
      description: '向后移动摄像机',
      category: 'camera',
      action: () => this.moveCameraBackward(),
    });

    this.registerShortcut('camera-left', {
      key: 'ArrowLeft',
      description: '向左移动摄像机',
      category: 'camera',
      action: () => this.moveCameraLeft(),
    });

    this.registerShortcut('camera-right', {
      key: 'ArrowRight',
      description: '向右移动摄像机',
      category: 'camera',
      action: () => this.moveCameraRight(),
    });

    // UI 操作
    this.registerShortcut('close-modal', {
      key: 'Escape',
      description: '关闭模态框/面板',
      category: 'ui',
      action: () => this.closeModal(),
    });

    this.registerShortcut('open-search', {
      key: 's',
      ctrl: true,
      description: '打开搜索',
      category: 'ui',
      action: () => this.openSearch(),
      preventDefault: true,
    });

    this.registerShortcut('toggle-help-ctrl', {
      key: 'h',
      ctrl: true,
      description: '切换帮助',
      category: 'ui',
      action: () => this.toggleHelp(),
      preventDefault: true,
    });

    // 开发工具
    this.registerShortcut('performance-panel', {
      key: 'p',
      ctrl: true,
      shift: true,
      description: '切换性能面板',
      category: 'development',
      action: () => this.togglePerformancePanel(),
      preventDefault: true,
    });
  }

  /**
   * 注册快捷键
   * 
   * @param id - 快捷键唯一标识符
   * @param shortcut - 快捷键配置
   */
  public registerShortcut(id: string, shortcut: KeyboardShortcut): void {
    this.shortcuts.set(id, {
      preventDefault: true,
      stopPropagation: false,
      category: 'other',
      ...shortcut,
    });
  }

  /**
   * 注销快捷键
   * 
   * @param id - 快捷键唯一标识符
   */
  public unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * 获取所有注册的快捷键
   */
  public getAllShortcuts(): Map<string, KeyboardShortcut> {
    return new Map(this.shortcuts);
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // 遍历所有快捷键，检查是否匹配
    for (const [id, shortcut] of this.shortcuts.entries()) {
      if (this.isShortcutMatch(event, shortcut)) {
        // 执行快捷键操作
        try {
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          
          shortcut.action();
        } catch (error) {
          console.error(`执行快捷键 "${id}" 时出错:`, error);
        }
        
        // 只匹配第一个快捷键
        break;
      }
    }

    // 处理焦点陷阱的 Tab 导航
    if (this.focusTrap && (event.key === 'Tab')) {
      this.handleFocusTrapTab(event);
    }
  };

  /**
   * 检查键盘事件是否匹配快捷键
   */
  private isShortcutMatch(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    // 检查按键
    if (event.key !== shortcut.key) {
      return false;
    }

    // 检查修饰键
    if (shortcut.ctrl && !event.ctrlKey) {
      return false;
    }
    if (!shortcut.ctrl && event.ctrlKey) {
      return false;
    }

    if (shortcut.shift && !event.shiftKey) {
      return false;
    }
    if (!shortcut.shift && event.shiftKey && shortcut.key !== '?') {
      // 特殊处理：? 需要 Shift
      return false;
    }

    if (shortcut.alt && !event.altKey) {
      return false;
    }
    if (!shortcut.alt && event.altKey) {
      return false;
    }

    return true;
  }

  /**
   * 启用焦点陷阱
   * 
   * @param element - 要陷阱焦点的元素（通常是模态框）
   */
  public enableFocusTrap(element: HTMLElement): void {
    this.focusTrap = element;
    
    // 获取所有可聚焦元素
    const focusableElements = element.querySelectorAll(FOCUSABLE_SELECTORS);
    
    if (focusableElements.length === 0) {
      console.warn('焦点陷阱元素中没有可聚焦元素');
      return;
    }

    this.trapFirstElement = focusableElements[0] as HTMLElement;
    this.trapLastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // 聚焦到第一个元素
    this.trapFirstElement?.focus();
  }

  /**
   * 禁用焦点陷阱
   */
  public disableFocusTrap(): void {
    this.focusTrap = null;
    this.trapFirstElement = null;
    this.trapLastElement = null;
  }

  /**
   * 处理焦点陷阱中的 Tab 键导航
   */
  private handleFocusTrapTab(event: KeyboardEvent): void {
    if (!this.focusTrap || !this.trapFirstElement || !this.trapLastElement) {
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab: 向后导航
      if (document.activeElement === this.trapFirstElement) {
        event.preventDefault();
        this.trapLastElement.focus();
      }
    } else {
      // Tab: 向前导航
      if (document.activeElement === this.trapLastElement) {
        event.preventDefault();
        this.trapFirstElement.focus();
      }
    }
  }

  /**
   * 聚焦到下一个可聚焦元素
   */
  public focusNext(): void {
    const focusableElements = Array.from(document.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
      // 如果当前没有聚焦元素或已经是最后一个，聚焦到第一个
      focusableElements[0]?.focus();
    } else {
      // 聚焦到下一个
      focusableElements[currentIndex + 1]?.focus();
    }
  }

  /**
   * 聚焦到上一个可聚焦元素
   */
  public focusPrevious(): void {
    const focusableElements = Array.from(document.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1 || currentIndex === 0) {
      // 如果当前没有聚焦元素或已经是第一个，聚焦到最后一个
      focusableElements[focusableElements.length - 1]?.focus();
    } else {
      // 聚焦到上一个
      focusableElements[currentIndex - 1]?.focus();
    }
  }

  /**
   * 聚焦到第一个可聚焦元素
   */
  public focusFirst(): void {
    const focusableElements = Array.from(document.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];
    focusableElements[0]?.focus();
  }

  /**
   * 聚焦到最后一个可聚焦元素
   */
  public focusLast(): void {
    const focusableElements = Array.from(document.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];
    focusableElements[focusableElements.length - 1]?.focus();
  }

  /**
   * 切换帮助覆盖层
   */
  private toggleHelp(): void {
    if (this.isHelpVisible) {
      this.hideHelp();
    } else {
      this.showHelp();
    }
  }

  /**
   * 显示帮助覆盖层
   */
  private showHelp(): void {
    if (this.isHelpVisible || typeof window === 'undefined') {
      return;
    }

    // 创建帮助覆盖层
    this.helpOverlay = document.createElement('div');
    this.helpOverlay.id = 'keyboard-shortcuts-help';
    this.helpOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
    this.helpOverlay.innerHTML = this.generateHelpHTML();
    
    document.body.appendChild(this.helpOverlay);
    this.isHelpVisible = true;
    
    // 启用焦点陷阱
    this.enableFocusTrap(this.helpOverlay);
    
    // 点击背景或按 Escape 关闭
    this.helpOverlay.addEventListener('click', (e) => {
      if (e.target === this.helpOverlay) {
        this.hideHelp();
      }
    });
  }

  /**
   * 隐藏帮助覆盖层
   */
  private hideHelp(): void {
    if (!this.isHelpVisible || !this.helpOverlay) {
      return;
    }

    document.body.removeChild(this.helpOverlay);
    this.helpOverlay = null;
    this.isHelpVisible = false;
    this.disableFocusTrap();
  }

  /**
   * 生成帮助覆盖层 HTML
   */
  private generateHelpHTML(): string {
    // 按分类分组快捷键
    const categories: Record<string, KeyboardShortcut[]> = {
      navigation: [],
      camera: [],
      ui: [],
      development: [],
      other: [],
    };

    for (const shortcut of this.shortcuts.values()) {
      const category = shortcut.category || 'other';
      categories[category].push(shortcut);
    }

    const categoryTitles: Record<string, string> = {
      navigation: '导航',
      camera: '摄像机控制',
      ui: 'UI 操作',
      development: '开发工具',
      other: '其他',
    };

    let html = `
      <div class="bg-gray-800 rounded-lg shadow-2xl p-6 max-w-3xl max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-white">键盘快捷键</h2>
          <button onclick="this.closest('#keyboard-shortcuts-help').remove()" class="text-gray-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="space-y-6">
    `;

    for (const [category, shortcuts] of Object.entries(categories)) {
      if (shortcuts.length === 0) {
        continue;
      }

      html += `
        <div>
          <h3 class="text-lg font-semibold text-gray-300 mb-3">${categoryTitles[category]}</h3>
          <div class="space-y-2">
      `;

      for (const shortcut of shortcuts) {
        const keys = this.formatShortcutKeys(shortcut);
        html += `
          <div class="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
            <span class="text-gray-300">${shortcut.description}</span>
            <kbd class="px-2 py-1 text-sm font-mono bg-gray-900 text-gray-300 rounded">${keys}</kbd>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `
        </div>
        <div class="mt-6 text-center text-sm text-gray-400">
          按 <kbd class="px-2 py-1 bg-gray-700 rounded">?</kbd> 或 <kbd class="px-2 py-1 bg-gray-700 rounded">Esc</kbd> 关闭帮助
        </div>
      </div>
    `;

    return html;
  }

  /**
   * 格式化快捷键显示
   */
  private formatShortcutKeys(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrl) {
      parts.push('Ctrl');
    }
    if (shortcut.shift) {
      parts.push('Shift');
    }
    if (shortcut.alt) {
      parts.push('Alt');
    }
    
    parts.push(shortcut.key);
    
    return parts.join(' + ');
  }

  /**
   * 摄像机控制操作（这些方法应该由应用程序实现并注册）
   */
  private moveCameraForward(): void {
    // 触发自定义事件，由应用程序监听并处理
    this.dispatchCustomEvent('camera:move:forward');
  }

  private moveCameraBackward(): void {
    this.dispatchCustomEvent('camera:move:backward');
  }

  private moveCameraLeft(): void {
    this.dispatchCustomEvent('camera:move:left');
  }

  private moveCameraRight(): void {
    this.dispatchCustomEvent('camera:move:right');
  }

  /**
   * UI 操作
   */
  private closeModal(): void {
    this.dispatchCustomEvent('ui:close:modal');
  }

  private openSearch(): void {
    this.dispatchCustomEvent('ui:open:search');
  }

  private togglePerformancePanel(): void {
    this.dispatchCustomEvent('ui:toggle:performance');
  }

  /**
   * 触发自定义事件
   */
  private dispatchCustomEvent(eventName: string, detail?: unknown): void {
    if (typeof window === 'undefined') {
      return;
    }

    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    
    window.dispatchEvent(event);
  }
}

/**
 * 导出单例实例
 */
export const keyboardNavigationManager = KeyboardNavigationManager.getInstance();

/**
 * 便捷函数：初始化键盘导航
 */
export const initializeKeyboardNavigation = (): void => {
  keyboardNavigationManager.initialize();
};

/**
 * 便捷函数：注册快捷键
 */
export const registerKeyboardShortcut = (id: string, shortcut: KeyboardShortcut): void => {
  keyboardNavigationManager.registerShortcut(id, shortcut);
};

/**
 * 便捷函数：启用焦点陷阱
 */
export const enableFocusTrap = (element: HTMLElement): void => {
  keyboardNavigationManager.enableFocusTrap(element);
};

/**
 * 便捷函数：禁用焦点陷阱
 */
export const disableFocusTrap = (): void => {
  keyboardNavigationManager.disableFocusTrap();
};

// 默认导出
export default keyboardNavigationManager;
