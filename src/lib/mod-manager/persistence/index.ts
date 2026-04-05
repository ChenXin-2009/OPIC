/**
 * @module mod-manager/persistence
 * @description MOD管理器持久化层导出
 */

export type { StorageAdapter } from './StorageAdapter';

export {
  LocalStorageAdapter,
  getStorageAdapter,
  resetStorageAdapter,
} from './LocalStorageAdapter';

export {
  MigrationManager,
  getMigrationManager,
  resetMigrationManager,
} from './MigrationManager';