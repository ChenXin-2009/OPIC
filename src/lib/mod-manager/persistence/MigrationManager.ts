/**
 * @module mod-manager/persistence/MigrationManager
 * @description 配置迁移管理器
 */

import type { StorageAdapter } from './StorageAdapter';
import { getStorageAdapter } from './LocalStorageAdapter';
import { STORAGE_VERSION, type EnabledModsStorage, type ModConfigStorage, type ModStateStorage } from '../types';

/**
 * 迁移函数类型
 */
type MigrationFunction = (data: unknown) => unknown;

/**
 * 迁移管理器
 */
export class MigrationManager {
  private adapter: StorageAdapter;
  private migrations: Map<number, MigrationFunction> = new Map();

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter || getStorageAdapter();
  }

  /**
   * 注册迁移函数
   */
  registerMigration(fromVersion: number, fn: MigrationFunction): void {
    this.migrations.set(fromVersion, fn);
  }

  /**
   * 检查是否需要迁移
   */
  needsMigration(version: number): boolean {
    return version < STORAGE_VERSION;
  }

  /**
   * 执行迁移
   */
  migrate(data: unknown, fromVersion: number): unknown {
    let currentData = data;
    let currentVersion = fromVersion;

    while (currentVersion < STORAGE_VERSION) {
      const migration = this.migrations.get(currentVersion);
      if (migration) {
        currentData = migration(currentData);
      }
      currentVersion++;
    }

    return currentData;
  }

  /**
   * 迁移已启用MOD数据
   */
  migrateEnabledMods(): void {
    const data = this.adapter.getEnabledMods();
    if (!data) return;

    if (this.needsMigration(data.version)) {
      const migrated = this.migrate(data, data.version) as EnabledModsStorage;
      this.adapter.setEnabledMods(migrated);
    }
  }

  /**
   * 迁移MOD配置数据
   */
  migrateModConfigs(): void {
    const data = this.adapter.getModConfigs();
    if (!data) return;

    if (this.needsMigration(data.version)) {
      const migrated = this.migrate(data, data.version) as ModConfigStorage;
      this.adapter.setModConfigs(migrated);
    }
  }

  /**
   * 迁移MOD状态数据
   */
  migrateModStates(): void {
    const data = this.adapter.getModStates();
    if (!data) return;

    if (this.needsMigration(data.version)) {
      const migrated = this.migrate(data, data.version) as ModStateStorage;
      this.adapter.setModStates(migrated);
    }
  }

  /**
   * 执行所有迁移
   */
  migrateAll(): void {
    this.migrateEnabledMods();
    this.migrateModConfigs();
    this.migrateModStates();
  }

  /**
   * 获取当前存储版本
   */
  getCurrentVersion(): number {
    return STORAGE_VERSION;
  }
}

// 单例实例
let migrationInstance: MigrationManager | null = null;

/**
 * 获取迁移管理器单例
 */
export function getMigrationManager(): MigrationManager {
  if (!migrationInstance) {
    migrationInstance = new MigrationManager();
  }
  return migrationInstance;
}

/**
 * 重置迁移管理器（仅用于测试）
 */
export function resetMigrationManager(): void {
  migrationInstance = null;
}