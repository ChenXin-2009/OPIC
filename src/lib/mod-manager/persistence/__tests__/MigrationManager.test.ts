import { MigrationManager, getMigrationManager, resetMigrationManager } from '../MigrationManager';
import type { StorageAdapter } from '../StorageAdapter';
import { STORAGE_VERSION } from '../../types';

function createMockAdapter(): StorageAdapter & {
  enabledMods: ReturnType<StorageAdapter['getEnabledMods']>;
  modConfigs: ReturnType<StorageAdapter['getModConfigs']>;
  modStates: ReturnType<StorageAdapter['getModStates']>;
} {
  return {
    enabledMods: null,
    modConfigs: null,
    modStates: null,
    getEnabledMods() { return this.enabledMods; },
    setEnabledMods(data) { this.enabledMods = data; },
    getModConfigs() { return this.modConfigs; },
    setModConfigs(data) { this.modConfigs = data; },
    getModStates() { return this.modStates; },
    setModStates(data) { this.modStates = data; },
    deleteModConfig() {},
    deleteModState() {},
    clear() {},
    isAvailable() { return true; },
  };
}

describe('MigrationManager', () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  let manager: MigrationManager;

  beforeEach(() => {
    adapter = createMockAdapter();
    manager = new MigrationManager(adapter);
  });

  describe('needsMigration', () => {
    it('should return true when version is less than STORAGE_VERSION', () => {
      expect(manager.needsMigration(0)).toBe(true);
    });

    it('should return false when version equals STORAGE_VERSION', () => {
      expect(manager.needsMigration(STORAGE_VERSION)).toBe(false);
    });

    it('should return false when version is greater than STORAGE_VERSION', () => {
      expect(manager.needsMigration(STORAGE_VERSION + 1)).toBe(false);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return STORAGE_VERSION', () => {
      expect(manager.getCurrentVersion()).toBe(STORAGE_VERSION);
    });
  });

  describe('migrate', () => {
    it('should return data unchanged when no migration needed', () => {
      const data = { version: STORAGE_VERSION, value: 42 };
      const result = manager.migrate(data, STORAGE_VERSION);
      expect(result).toBe(data);
    });

    it('should apply a registered migration', () => {
      const v0toV1: ReturnType<MigrationManager['migrate']> = (data) => {
        const d = data as { old: number };
        return { version: STORAGE_VERSION, value: d.old * 2 };
      };
      manager.registerMigration(0, v0toV1);
      const result = manager.migrate({ old: 21 }, 0) as { version: number; value: number };
      expect(result.version).toBe(STORAGE_VERSION);
      expect(result.value).toBe(42);
    });

    it('should chain multiple migrations across versions', () => {
      const fn1 = jest.fn((data: unknown) => ({ ...data as object, step: 1 }));
      const fn2 = jest.fn((data: unknown) => ({ ...data as object, step: 2 }));
      manager.registerMigration(-1, fn1);
      manager.registerMigration(0, fn2);
      const result = manager.migrate({ version: -1 }, -1) as Record<string, unknown>;
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(result.step).toBe(2);
    });

    it('should skip missing migration functions', () => {
      manager.registerMigration(1, (data) => data);
      const data = { version: 0, val: 1 };
      const result = manager.migrate(data, 0);
      expect(result).toBe(data);
    });
  });

  describe('migrateEnabledMods', () => {
    it('should do nothing when no data', () => {
      manager.migrateEnabledMods();
      expect(adapter.enabledMods).toBeNull();
    });

    it('should do nothing when version is current', () => {
      adapter.enabledMods = { version: STORAGE_VERSION, modIds: [], timestamp: '' };
      manager.migrateEnabledMods();
      expect(adapter.enabledMods.version).toBe(STORAGE_VERSION);
    });

    it('should migrate and save enabled mods', () => {
      adapter.enabledMods = { version: 0, modIds: ['a'], timestamp: '' } as never;
      const spy = jest.fn((data) => ({ ...data, version: STORAGE_VERSION }));
      manager.registerMigration(0, spy);
      manager.migrateEnabledMods();
      expect(spy).toHaveBeenCalled();
      expect(adapter.enabledMods?.version).toBe(STORAGE_VERSION);
    });
  });

  describe('migrateModConfigs', () => {
    it('should do nothing when no data', () => {
      manager.migrateModConfigs();
      expect(adapter.modConfigs).toBeNull();
    });

    it('should migrate and save mod configs', () => {
      adapter.modConfigs = { version: 0, configs: { a: {} }, timestamp: '' } as never;
      const spy = jest.fn((data) => ({ ...data, version: STORAGE_VERSION }));
      manager.registerMigration(0, spy);
      manager.migrateModConfigs();
      expect(spy).toHaveBeenCalled();
      expect(adapter.modConfigs?.version).toBe(STORAGE_VERSION);
    });
  });

  describe('migrateModStates', () => {
    it('should do nothing when no data', () => {
      manager.migrateModStates();
      expect(adapter.modStates).toBeNull();
    });

    it('should migrate and save mod states', () => {
      adapter.modStates = { version: 0, states: { a: {} }, timestamp: '' } as never;
      const spy = jest.fn((data) => ({ ...data, version: STORAGE_VERSION }));
      manager.registerMigration(0, spy);
      manager.migrateModStates();
      expect(spy).toHaveBeenCalled();
      expect(adapter.modStates?.version).toBe(STORAGE_VERSION);
    });
  });

  describe('migrateAll', () => {
    it('should call all three migration methods', () => {
      const spy1 = jest.fn();
      const spy2 = jest.fn();
      const spy3 = jest.fn();
      jest.spyOn(manager, 'migrateEnabledMods').mockImplementation(spy1);
      jest.spyOn(manager, 'migrateModConfigs').mockImplementation(spy2);
      jest.spyOn(manager, 'migrateModStates').mockImplementation(spy3);
      manager.migrateAll();
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      expect(spy3).toHaveBeenCalled();
    });
  });

  describe('registerMigration', () => {
    it('should register and chain multiple version migrations', () => {
      const fn1 = jest.fn((d: unknown) => d);
      const fn2 = jest.fn((d: unknown) => d);
      manager.registerMigration(-1, fn1);
      manager.registerMigration(0, fn2);
      manager.migrate({ version: -1 }, -1);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should allow overwriting a migration for the same version', () => {
      const fn1 = jest.fn((d: unknown) => d);
      const fn2 = jest.fn((d: unknown) => d);
      manager.registerMigration(0, fn1);
      manager.registerMigration(0, fn2);
      manager.migrate({ version: 0 }, 0);
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });
});

describe('getMigrationManager / resetMigrationManager', () => {
  afterEach(() => {
    resetMigrationManager();
  });

  it('should return the same instance on repeated calls', () => {
    const a = getMigrationManager();
    const b = getMigrationManager();
    expect(a).toBe(b);
  });

  it('should return a new instance after reset', () => {
    const a = getMigrationManager();
    resetMigrationManager();
    const b = getMigrationManager();
    expect(a).not.toBe(b);
  });
});
