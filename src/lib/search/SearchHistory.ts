/**
 * 天体搜索历史记录管理器
 * 
 * 使用 localStorage 持久化存储最近搜索的天体记录。
 * 当 localStorage 不可用时,自动降级到内存存储。
 * 
 * @module SearchHistory
 */

import type { CelestialType } from './SearchIndex';

/**
 * 历史记录条目接口
 */
export interface HistoryEntry {
  /** 天体唯一标识符 */
  id: string;
  /** 天体名称 */
  name: string;
  /** 天体类型 */
  type: CelestialType;
  /** 记录时间戳 */
  timestamp: number;
}

/**
 * 搜索历史记录管理类
 * 
 * 提供静态方法管理搜索历史,无需实例化。
 * 自动处理 localStorage 异常并降级到内存存储。
 */
export class SearchHistory {
  /** localStorage 存储键名 */
  private static readonly STORAGE_KEY = 'celestial-search-history';
  
  /** 最大历史记录数量 */
  private static readonly MAX_ENTRIES = 5;
  
  /** 内存存储备份(当 localStorage 不可用时使用) */
  private static memoryStorage: HistoryEntry[] = [];
  
  /** localStorage 是否可用 */
  private static isLocalStorageAvailable: boolean | null = null;

  /**
   * 检测 localStorage 是否可用
   * 
   * @returns localStorage 是否可用
   */
  private static checkLocalStorageAvailability(): boolean {
    if (this.isLocalStorageAvailable !== null) {
      return this.isLocalStorageAvailable;
    }

    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.isLocalStorageAvailable = true;
      return true;
    } catch (error) {
      console.warn('localStorage 不可用,降级到内存存储:', error);
      this.isLocalStorageAvailable = false;
      return false;
    }
  }

  /**
   * 从存储中读取历史记录
   * 
   * @returns 历史记录数组
   */
  private static readFromStorage(): HistoryEntry[] {
    if (!this.checkLocalStorageAvailability()) {
      return this.memoryStorage;
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return [];
      }

      const entries = JSON.parse(data) as HistoryEntry[];
      
      // 验证数据格式
      if (!Array.isArray(entries)) {
        console.warn('历史记录数据格式无效,已清空');
        return [];
      }

      // 验证每个条目的必需字段
      return entries.filter(entry => 
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.type === 'string' &&
        typeof entry.timestamp === 'number'
      );
    } catch (error) {
      console.error('读取历史记录失败:', error);
      return [];
    }
  }

  /**
   * 写入历史记录到存储
   * 
   * @param entries - 历史记录数组
   */
  private static writeToStorage(entries: HistoryEntry[]): void {
    if (!this.checkLocalStorageAvailability()) {
      this.memoryStorage = entries;
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('写入历史记录失败:', error);
      // 降级到内存存储
      this.memoryStorage = entries;
      this.isLocalStorageAvailable = false;
    }
  }

  /**
   * 添加历史记录
   * 
   * 自动生成时间戳并维护 FIFO 队列(最多 5 条记录)。
   * 如果天体已存在于历史记录中,则更新其时间戳并移至最前。
   * 
   * @param entry - 历史记录条目(不含 timestamp)
   * 
   * @example
   * ```typescript
   * SearchHistory.add({
   *   id: 'earth',
   *   name: '地球',
   *   type: 'planet'
   * });
   * ```
   */
  static add(entry: Omit<HistoryEntry, 'timestamp'>): void {
    const entries = this.readFromStorage();
    
    // 移除已存在的相同天体记录
    const filteredEntries = entries.filter(e => e.id !== entry.id);
    
    // 添加新记录到最前面
    const newEntry: HistoryEntry = {
      ...entry,
      timestamp: Date.now()
    };
    
    filteredEntries.unshift(newEntry);
    
    // 限制最大数量
    const limitedEntries = filteredEntries.slice(0, this.MAX_ENTRIES);
    
    this.writeToStorage(limitedEntries);
  }

  /**
   * 获取所有历史记录
   * 
   * 返回按时间倒序排列的历史记录(最新的在前)。
   * 
   * @returns 历史记录数组
   * 
   * @example
   * ```typescript
   * const history = SearchHistory.getAll();
   * console.log(`共有 ${history.length} 条历史记录`);
   * ```
   */
  static getAll(): HistoryEntry[] {
    return this.readFromStorage();
  }

  /**
   * 清除所有历史记录
   * 
   * 同时清除 localStorage 和内存存储。
   * 
   * @example
   * ```typescript
   * SearchHistory.clear();
   * ```
   */
  static clear(): void {
    this.memoryStorage = [];
    
    if (!this.checkLocalStorageAvailability()) {
      return;
    }

    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('清除历史记录失败:', error);
    }
  }
}
