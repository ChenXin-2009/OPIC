/**
 * @module mod-manager/persistence/StorageAdapter
 * @description 存储适配器接口定义
 */

import type { EnabledModsStorage, ModConfigStorage, ModStateStorage } from '../types';

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  /**
   * 获取已启用MOD列表
   */
  getEnabledMods(): EnabledModsStorage | null;

  /**
   * 保存已启用MOD列表
   */
  setEnabledMods(storage: EnabledModsStorage): void;

  /**
   * 获取MOD配置
   */
  getModConfigs(): ModConfigStorage | null;

  /**
   * 保存MOD配置
   */
  setModConfigs(storage: ModConfigStorage): void;

  /**
   * 获取MOD状态
   */
  getModStates(): ModStateStorage | null;

  /**
   * 保存MOD状态
   */
  setModStates(storage: ModStateStorage): void;

  /**
   * 删除MOD配置
   */
  deleteModConfig(modId: string): void;

  /**
   * 删除MOD状态
   */
  deleteModState(modId: string): void;

  /**
   * 清空所有数据
   */
  clear(): void;

  /**
   * 检查存储是否可用
   */
  isAvailable(): boolean;
}