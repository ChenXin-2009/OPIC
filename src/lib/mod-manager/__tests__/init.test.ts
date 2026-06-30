import { useModStore } from '../store';

const mockModRegistry = { has: jest.fn(), register: jest.fn(), unregister: jest.fn(), get: jest.fn(), getPermissionSystem: jest.fn(), getSandbox: jest.fn() };
const mockDependencyResolver = { register: jest.fn(), unregister: jest.fn() };
const mockModLifecycle = { load: jest.fn(), enable: jest.fn() };
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
    it('should run migrations and check enabled mods', () => {
      mockStorageAdapter.getEnabledMods.mockReturnValue({ modIds: ['mod-a'], version: 1, timestamp: '' });
      initModManager();
      expect(mockMigrationManager.migrateAll).toHaveBeenCalled();
      expect(mockStorageAdapter.getEnabledMods).toHaveBeenCalled();
    });

    it('should handle no enabled mods', () => {
      mockStorageAdapter.getEnabledMods.mockReturnValue(null);
      initModManager();
      expect(mockMigrationManager.migrateAll).toHaveBeenCalled();
    });
  });

  describe('registerMod', () => {
    it('should register a new mod', () => {
      mockModRegistry.has.mockReturnValue(false);
      const result = registerMod(testManifest);
      expect(result).toBe(true);
      expect(mockModRegistry.register).toHaveBeenCalledWith(testManifest, undefined);
      expect(mockDependencyResolver.register).toHaveBeenCalledWith(testManifest.id, undefined);
      expect(useModStore.getState().mods[testManifest.id]).toBeDefined();
    });

    it('should skip if already registered', () => {
      mockModRegistry.has.mockReturnValue(true);
      const result = registerMod(testManifest);
      expect(result).toBe(true);
      expect(mockModRegistry.register).not.toHaveBeenCalled();
    });

    it('should return false on error', () => {
      mockModRegistry.has.mockImplementation(() => { throw new Error('fail'); });
      const result = registerMod(testManifest);
      expect(result).toBe(false);
    });

    it('should add defaultEnabled mods to pending auto-enable queue', async () => {
      mockModRegistry.has.mockReturnValue(false);
      mockModRegistry.get.mockReturnValue({ manifest: testManifestAuto });
      mockModLifecycle.load.mockResolvedValue(undefined);
      mockModLifecycle.enable.mockResolvedValue(undefined);

      registerMod(testManifestAuto, {});
      await autoEnableMods();

      expect(mockModLifecycle.load).toHaveBeenCalledWith('test-mod-auto', expect.any(Function));
      expect(mockModLifecycle.enable).toHaveBeenCalledWith('test-mod-auto', expect.any(Function));
    });
  });

  describe('unregisterMod', () => {
    it('should unregister an existing mod', () => {
      mockModRegistry.unregister.mockReturnValue(true);
      useModStore.getState().registerMod(testManifest);
      const result = unregisterMod('test-mod');
      expect(result).toBe(true);
      expect(mockModRegistry.unregister).toHaveBeenCalledWith('test-mod');
      expect(mockDependencyResolver.unregister).toHaveBeenCalledWith('test-mod');
      expect(useModStore.getState().mods['test-mod']).toBeUndefined();
    });

    it('should return false when mod not found', () => {
      mockModRegistry.unregister.mockReturnValue(false);
      const result = unregisterMod('unknown');
      expect(result).toBe(false);
    });

    it('should return false on error', () => {
      mockModRegistry.unregister.mockImplementation(() => { throw new Error('fail'); });
      const result = unregisterMod('fail-mod');
      expect(result).toBe(false);
    });
  });

  describe('autoEnableMods', () => {
    it('should skip if no instance found', async () => {
      mockModRegistry.has.mockReturnValue(false);
      registerMod(testManifestAuto, {});
      mockModRegistry.get.mockReturnValue(null);
      await autoEnableMods();
      expect(mockModLifecycle.load).not.toHaveBeenCalled();
    });

    it('should handle lifecycle error gracefully', async () => {
      mockModRegistry.has.mockReturnValue(false);
      mockModRegistry.get.mockReturnValue({ manifest: testManifestAuto });
      mockModLifecycle.load.mockRejectedValue(new Error('load fail'));
      registerMod(testManifestAuto, {});
      await autoEnableMods();
      expect(mockModLifecycle.load).toHaveBeenCalled();
    });
  });

  describe('getRegisteredMods', () => {
    it('should return empty list when no mods registered', () => {
      const mods = getRegisteredMods();
      expect(mods).toEqual([]);
    });

    it('should return registered mods from store', () => {
      useModStore.getState().registerMod(testManifest);
      useModStore.getState().setModState('test-mod', 'enabled');
      const mods = getRegisteredMods();
      expect(mods).toHaveLength(1);
      expect(mods[0]).toMatchObject({
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
      expect(mods.map(m => m.id)).toContain('test-mod');
      expect(mods.map(m => m.id)).toContain('mod-2');
    });
  });
});
