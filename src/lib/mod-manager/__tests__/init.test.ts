import { useModStore } from '../store';

const mockModRegistry = { has: jest.fn(), register: jest.fn(), unregister: jest.fn(), get: jest.fn(), getPermissionSystem: jest.fn(), getSandbox: jest.fn() };
const mockDependencyResolver = { register: jest.fn(), unregister: jest.fn() };
const mockModLifecycle = { load: jest.fn(), enable: jest.fn(), disable: jest.fn() };
const mockStorageAdapter = { getEnabledMods: jest.fn() };
const mockMigrationManager = { migrateAll: jest.fn() };
const mockTimeAPI = { getCurrentTime: jest.fn() };
const mockCameraAPI = { getPosition: jest.fn() };
const mockCelestialAPI = { getBodyPosition: jest.fn() };
const mockSatelliteAPI = { fetchSatellites: jest.fn() };
const mockRenderAPI = { getScene: jest.fn(), onBeforeRender: jest.fn(), _setCurrentModId: jest.fn() };
const mockEventBus = { on: jest.fn(), emit: jest.fn(), off: jest.fn() };
const mockPermissionSystem = { hasPermissionDeclarations: jest.fn(), validateManifest: jest.fn() };
const mockSandbox = { trackTimer: jest.fn(), untrackTimer: jest.fn() };
const mockAPIProxyFactory = { createProxy: jest.fn() };

jest.mock('../core/ModRegistry', () => ({
  getRegistry: jest.fn(() => mockModRegistry),
}));
jest.mock('../core/DependencyResolver', () => ({
  getDependencyResolver: jest.fn(() => mockDependencyResolver),
}));
jest.mock('../core/ModLifecycle', () => ({
  getModLifecycle: jest.fn(() => mockModLifecycle),
}));
jest.mock('../persistence/LocalStorageAdapter', () => ({
  getStorageAdapter: jest.fn(() => mockStorageAdapter),
}));
jest.mock('../persistence/MigrationManager', () => ({
  getMigrationManager: jest.fn(() => mockMigrationManager),
}));
jest.mock('../api/TimeAPI', () => ({
  getTimeAPI: jest.fn(() => mockTimeAPI),
}));
jest.mock('../api/CameraAPI', () => ({
  getCameraAPI: jest.fn(() => mockCameraAPI),
}));
jest.mock('../api/CelestialAPI', () => ({
  getCelestialAPI: jest.fn(() => mockCelestialAPI),
}));
jest.mock('../api/SatelliteAPI', () => ({
  getSatelliteAPI: jest.fn(() => mockSatelliteAPI),
}));
jest.mock('../api/RenderAPI', () => ({
  getRenderAPI: jest.fn(() => mockRenderAPI),
}));
jest.mock('../core/EventBus', () => ({
  getEventBus: jest.fn(() => mockEventBus),
}));
jest.mock('../proxy/APIProxyFactory', () => ({
  APIProxyFactory: jest.fn(() => mockAPIProxyFactory),
}));

const testManifest = {
  id: 'test-mod',
  version: '1.0.0',
  name: 'Test Mod',
  entryPoint: 'onLoad',
};

const testManifestAuto = {
  ...testManifest,
  id: 'test-mod-auto',
  defaultEnabled: true,
};

const testManifestDeps = {
  ...testManifest,
  id: 'test-mod-deps',
  dependencies: [{ id: 'dep-1' }],
};

import {
  initModManager,
  registerMod,
  unregisterMod,
  autoEnableMods,
  getRegisteredMods,
} from '../init';

describe('mod-manager/init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useModStore.setState({ mods: {}, isLoading: false, error: null });
    mockModRegistry.get.mockReset();
    mockModRegistry.has.mockReset();
    mockAPIProxyFactory.createProxy.mockReset();
    mockModRegistry.getPermissionSystem = jest.fn(() => mockPermissionSystem);
    mockModRegistry.getSandbox = jest.fn(() => mockSandbox);
  });

  describe('initModManager', () => {
    it('should run migrations and log enabled mods from storage', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockStorageAdapter.getEnabledMods.mockReturnValue({ modIds: ['mod-a', 'mod-b'], version: 1, timestamp: '2024-01-01' });

      initModManager();

      expect(mockMigrationManager.migrateAll).toHaveBeenCalledTimes(1);
      expect(mockStorageAdapter.getEnabledMods).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('[MOD Manager] 恢复已启用的MOD:', ['mod-a', 'mod-b']);
      logSpy.mockRestore();
    });

    it('should handle no enabled mods without logging', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockStorageAdapter.getEnabledMods.mockReturnValue(null);

      initModManager();

      expect(mockMigrationManager.migrateAll).toHaveBeenCalledTimes(1);
      expect(mockStorageAdapter.getEnabledMods).toHaveBeenCalledTimes(1);
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('registerMod', () => {
    it('should register in registry, store, and dependency resolver, returning true', () => {
      mockModRegistry.has.mockReturnValue(false);

      const result = registerMod(testManifestDeps, { onLoad: jest.fn() });

      expect(result).toBe(true);
      expect(mockModRegistry.has).toHaveBeenCalledWith('test-mod-deps');
      expect(mockModRegistry.register).toHaveBeenCalledWith(testManifestDeps, { onLoad: expect.any(Function) });
      expect(useModStore.getState().mods['test-mod-deps']).toBeDefined();
      expect(useModStore.getState().mods['test-mod-deps'].state).toBe('registered');
      expect(mockDependencyResolver.register).toHaveBeenCalledWith('test-mod-deps', [{ id: 'dep-1' }]);
    });

    it('should return true without re-registering if already registered', () => {
      mockModRegistry.has.mockReturnValue(true);

      const result = registerMod(testManifest);

      expect(result).toBe(true);
      expect(mockModRegistry.register).not.toHaveBeenCalled();
      expect(mockDependencyResolver.register).not.toHaveBeenCalled();
    });

    it('should add defaultEnabled mod to pending auto-enable list', () => {
      mockModRegistry.has.mockReturnValue(false);

      registerMod(testManifestAuto, { onLoad: jest.fn() });

      expect(mockModRegistry.register).toHaveBeenCalled();
      // autoEnableMods will verify the pending list is populated
    });

    it('should return false when an error is caught', () => {
      mockModRegistry.has.mockImplementation(() => { throw new Error('registry error'); });

      const result = registerMod(testManifest);

      expect(result).toBe(false);
      expect(mockModRegistry.register).not.toHaveBeenCalled();
    });
  });

  describe('autoEnableMods', () => {
    it('should enable pending mods and update store state', async () => {
      mockModRegistry.has.mockReturnValue(false);
      mockModRegistry.get.mockReturnValue({ manifest: testManifestAuto });
      mockModLifecycle.load.mockResolvedValue(undefined);
      mockModLifecycle.enable.mockResolvedValue(undefined);
      mockPermissionSystem.hasPermissionDeclarations.mockReturnValue(false);

      registerMod(testManifestAuto, { onLoad: jest.fn() });
      await autoEnableMods();

      expect(mockModLifecycle.load).toHaveBeenCalledWith('test-mod-auto', expect.any(Function));
      expect(mockModLifecycle.enable).toHaveBeenCalledWith('test-mod-auto', expect.any(Function));
      expect(useModStore.getState().mods['test-mod-auto'].state).toBe('enabled');
    });

    it('should skip if registry.get returns no instance', async () => {
      mockModRegistry.has.mockReturnValue(false);
      mockModRegistry.get.mockReturnValue(null);

      registerMod(testManifestAuto, {});
      await autoEnableMods();

      expect(mockModLifecycle.load).not.toHaveBeenCalled();
      expect(mockModLifecycle.enable).not.toHaveBeenCalled();
    });

    it('should handle error during enable and continue to next mod', async () => {
      const testModFail = { ...testManifest, id: 'mod-fail', defaultEnabled: true };
      const testModOk = { ...testManifest, id: 'mod-ok', defaultEnabled: true };

      mockModRegistry.has.mockReturnValue(false);
      mockModRegistry.get
        .mockReturnValueOnce({ manifest: testModFail })
        .mockReturnValueOnce({ manifest: testModOk });
      mockModLifecycle.load.mockResolvedValue(undefined);
      mockModLifecycle.enable
        .mockRejectedValueOnce(new Error('enable failed'))
        .mockResolvedValueOnce(undefined);
      mockPermissionSystem.hasPermissionDeclarations.mockReturnValue(false);

      registerMod(testModFail, {});
      registerMod(testModOk, {});
      await autoEnableMods();

      // Both should have been attempted
      expect(mockModLifecycle.load).toHaveBeenCalledTimes(2);
      expect(mockModLifecycle.enable).toHaveBeenCalledTimes(2);
      // Only the successful mod should have its state updated
      expect(useModStore.getState().mods['mod-ok']?.state).toBe('enabled');
      expect(useModStore.getState().mods['mod-fail']?.state).not.toBe('enabled');
    });
  });

  describe('unregisterMod', () => {
    it('should successfully unregister and clean up store and dependencies', () => {
      mockModRegistry.unregister.mockReturnValue(true);
      useModStore.getState().registerMod(testManifest);

      const result = unregisterMod('test-mod');

      expect(result).toBe(true);
      expect(mockModRegistry.unregister).toHaveBeenCalledWith('test-mod');
      expect(mockDependencyResolver.unregister).toHaveBeenCalledWith('test-mod');
      expect(useModStore.getState().mods['test-mod']).toBeUndefined();
    });

    it('should skip store/dependency cleanup when registry.unregister returns false', () => {
      useModStore.getState().registerMod(testManifest);
      mockModRegistry.unregister.mockReturnValue(false);

      const result = unregisterMod('test-mod');

      expect(result).toBe(false);
      expect(mockDependencyResolver.unregister).not.toHaveBeenCalled();
      // Store entry should remain
      expect(useModStore.getState().mods['test-mod']).toBeDefined();
    });

    it('should return false on error', () => {
      mockModRegistry.unregister.mockImplementation(() => { throw new Error('unregister error'); });

      const result = unregisterMod('test-mod');

      expect(result).toBe(false);
    });
  });

  describe('getRegisteredMods', () => {
    it('should return empty array when no mods registered', () => {
      const mods = getRegisteredMods();

      expect(mods).toEqual([]);
    });

    it('should return formatted array of registered mods', () => {
      useModStore.getState().registerMod(testManifest);
      useModStore.getState().setModState('test-mod', 'enabled');

      const mods = getRegisteredMods();

      expect(mods).toHaveLength(1);
      expect(mods[0]).toEqual({
        id: 'test-mod',
        name: 'Test Mod',
        version: '1.0.0',
        state: 'enabled',
      });
    });

    it('should return multiple registered mods', () => {
      useModStore.getState().registerMod(testManifest);
      useModStore.getState().registerMod({ ...testManifest, id: 'mod-2', name: 'Mod 2' });

      const mods = getRegisteredMods();

      expect(mods).toHaveLength(2);
      expect(mods.map(m => m.id)).toEqual(expect.arrayContaining(['test-mod', 'mod-2']));
      expect(mods.find(m => m.id === 'test-mod')?.name).toBe('Test Mod');
      expect(mods.find(m => m.id === 'mod-2')?.name).toBe('Mod 2');
    });
  });
});
