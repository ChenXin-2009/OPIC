/**
 * @module mod-manager/persistence/LocalStorageAdapter
 * @description localStorage存储适配器实现
 */

import type { StorageAdapter } from './StorageAdapter';
import type { EnabledModsStorage, ModConfigStorage, ModStateStorage } from '../types';
import { STORAGE_KEYS, STORAGE_VERSION } from '../types';

/**
 * localStorage存储适配器
 */
export class LocalStorageAdapter implements StorageAdapter {
  private available: boolean;

  constructor() {
    this.available = this.checkAvailability();
  }

  /**
   * 检查localStorage是否可用
   */
  private checkAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 安全地读取JSON
   */
  private safeRead<T>(key: string): T | null {
    if (!this.available) return null;

    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * 安全地写入JSON
   */
  private safeWrite<T>(key: string, data: T): boolean {
    if (!this.available) return false;

    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取已启用MOD列表
   */
  getEnabledMods(): EnabledModsStorage | null {
    return this.safeRead<EnabledModsStorage>(STORAGE_KEYS.ENABLED_MODS);
  }

  /**
   * 保存已启用MOD列表
   */
  setEnabledMods(storage: EnabledModsStorage): void {
    this.safeWrite(STORAGE_KEYS.ENABLED_MODS, storage);
  }

  /**
   * 获取MOD配置
   */
  getModConfigs(): ModConfigStorage | null {
    return this.safeRead<ModConfigStorage>(STORAGE_KEYS.MOD_CONFIGS);
  }

  /**
   * 保存MOD配置
   */
  setModConfigs(storage: ModConfigStorage): void {
    this.safeWrite(STORAGE_KEYS.MOD_CONFIGS, storage);
  }

  /**
   * 获取MOD状态
   */
  getModStates(): ModStateStorage | null {
    return this.safeRead<ModStateStorage>(STORAGE_KEYS.MOD_STATES);
  }

  /**
   * 保存MOD状态
   */
  setModStates(storage: ModStateStorage): void {
    this.safeWrite(STORAGE_KEYS.MOD_STATES, storage);
  }

  /**
   * 删除MOD配置
   */
  deleteModConfig(modId: string): void {
    const configs = this.getModConfigs();
    if (configs && configs.configs[modId]) {
      delete configs.configs[modId];
      this.setModConfigs(configs);
    }
  }

  /**
   * 删除MOD状态
   */
  deleteModState(modId: string): void {
    const states = this.getModStates();
    if (states && states.states[modId]) {
      delete states.states[modId];
      this.setModStates(states);
    }
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    if (!this.available) return;

    localStorage.removeItem(STORAGE_KEYS.ENABLED_MODS);
    localStorage.removeItem(STORAGE_KEYS.MOD_CONFIGS);
    localStorage.removeItem(STORAGE_KEYS.MOD_STATES);
  }

  /**
   * 检查存储是否可用
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * 创建默认的已启用MOD存储
   */
  static createDefaultEnabledMods(modIds: string[] = []): EnabledModsStorage {
    return {
      version: STORAGE_VERSION,
      modIds,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 创建默认的配置存储
   */
  static createDefaultModConfigs(): ModConfigStorage {
    return {
      version: STORAGE_VERSION,
      configs: {},
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 创建默认的状态存储
   */
  static createDefaultModStates(): ModStateStorage {
    return {
      version: STORAGE_VERSION,
      states: {},
      timestamp: new Date().toISOString(),
    };
  }
}

// 单例实例
let adapterInstance: LocalStorageAdapter | null = null;

/**
 * 获取存储适配器单例
 */
export function getStorageAdapter(): LocalStorageAdapter {
  if (!adapterInstance) {
    adapterInstance = new LocalStorageAdapter();
  }
  return adapterInstance;
}

/**
 * 重置存储适配器（仅用于测试）
 */
export function resetStorageAdapter(): void {
  adapterInstance = null;
}