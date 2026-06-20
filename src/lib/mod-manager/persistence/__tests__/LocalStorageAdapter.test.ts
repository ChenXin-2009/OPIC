import { LocalStorageAdapter, getStorageAdapter, resetStorageAdapter } from '../LocalStorageAdapter';
import { STORAGE_KEYS, STORAGE_VERSION } from '../../types';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isAvailable', () => {
    it('should return true in jsdom', () => {
      expect(adapter.isAvailable()).toBe(true);
    });
  });

  describe('getEnabledMods / setEnabledMods', () => {
    it('should return null when no data', () => {
      expect(adapter.getEnabledMods()).toBeNull();
    });

    it('should store and retrieve enabled mods', () => {
      const data = { version: STORAGE_VERSION, modIds: ['mod-a', 'mod-b'], timestamp: '2025-01-01T00:00:00.000Z' };
      adapter.setEnabledMods(data);
      expect(adapter.getEnabledMods()).toEqual(data);
    });

    it('should use correct localStorage key', () => {
      const data = { version: STORAGE_VERSION, modIds: [], timestamp: '' };
      adapter.setEnabledMods(data);
      expect(localStorage.getItem(STORAGE_KEYS.ENABLED_MODS)).toBe(JSON.stringify(data));
    });

    it('should overwrite previous value', () => {
      const data1 = { version: STORAGE_VERSION, modIds: ['a'], timestamp: '' };
      const data2 = { version: STORAGE_VERSION, modIds: ['b', 'c'], timestamp: '' };
      adapter.setEnabledMods(data1);
      adapter.setEnabledMods(data2);
      expect(adapter.getEnabledMods()).toEqual(data2);
    });
  });

  describe('getModConfigs / setModConfigs', () => {
    it('should return null when no data', () => {
      expect(adapter.getModConfigs()).toBeNull();
    });

    it('should store and retrieve mod configs', () => {
      const data = { version: STORAGE_VERSION, configs: { 'mod-x': { key: 'value' } }, timestamp: '2025-01-01T00:00:00.000Z' };
      adapter.setModConfigs(data);
      expect(adapter.getModConfigs()).toEqual(data);
    });

    it('should use correct localStorage key', () => {
      const data = { version: STORAGE_VERSION, configs: {}, timestamp: '' };
      adapter.setModConfigs(data);
      expect(localStorage.getItem(STORAGE_KEYS.MOD_CONFIGS)).toBe(JSON.stringify(data));
    });
  });

  describe('getModStates / setModStates', () => {
    it('should return null when no data', () => {
      expect(adapter.getModStates()).toBeNull();
    });

    it('should store and retrieve mod states', () => {
      const data = { version: STORAGE_VERSION, states: { 'mod-y': { enabled: true } }, timestamp: '2025-01-01T00:00:00.000Z' };
      adapter.setModStates(data);
      expect(adapter.getModStates()).toEqual(data);
    });

    it('should use correct localStorage key', () => {
      const data = { version: STORAGE_VERSION, states: {}, timestamp: '' };
      adapter.setModStates(data);
      expect(localStorage.getItem(STORAGE_KEYS.MOD_STATES)).toBe(JSON.stringify(data));
    });
  });

  describe('deleteModConfig', () => {
    it('should delete a specific mod config entry', () => {
      const data = {
        version: STORAGE_VERSION,
        configs: { 'mod-a': { setting: 1 }, 'mod-b': { setting: 2 } },
        timestamp: '',
      };
      adapter.setModConfigs(data);
      adapter.deleteModConfig('mod-a');
      const result = adapter.getModConfigs();
      expect(result?.configs['mod-a']).toBeUndefined();
      expect(result?.configs['mod-b']).toEqual({ setting: 2 });
    });

    it('should do nothing if modId does not exist', () => {
      const data = { version: STORAGE_VERSION, configs: { 'mod-a': {} }, timestamp: '' };
      adapter.setModConfigs(data);
      adapter.deleteModConfig('nonexistent');
      expect(adapter.getModConfigs()).toEqual(data);
    });

    it('should do nothing if no configs stored', () => {
      adapter.deleteModConfig('mod-a');
      expect(adapter.getModConfigs()).toBeNull();
    });
  });

  describe('deleteModState', () => {
    it('should delete a specific mod state entry', () => {
      const data = {
        version: STORAGE_VERSION,
        states: { 'mod-a': { enabled: true }, 'mod-b': { enabled: false } },
        timestamp: '',
      };
      adapter.setModStates(data);
      adapter.deleteModState('mod-a');
      const result = adapter.getModStates();
      expect(result?.states['mod-a']).toBeUndefined();
      expect(result?.states['mod-b']).toEqual({ enabled: false });
    });

    it('should do nothing if modId does not exist', () => {
      const data = { version: STORAGE_VERSION, states: { 'mod-a': {} }, timestamp: '' };
      adapter.setModStates(data);
      adapter.deleteModState('nonexistent');
      expect(adapter.getModStates()).toEqual(data);
    });

    it('should do nothing if no states stored', () => {
      adapter.deleteModState('mod-a');
      expect(adapter.getModStates()).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all storage keys', () => {
      adapter.setEnabledMods({ version: STORAGE_VERSION, modIds: ['a'], timestamp: '' });
      adapter.setModConfigs({ version: STORAGE_VERSION, configs: {}, timestamp: '' });
      adapter.setModStates({ version: STORAGE_VERSION, states: {}, timestamp: '' });
      adapter.clear();
      expect(localStorage.getItem(STORAGE_KEYS.ENABLED_MODS)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.MOD_CONFIGS)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.MOD_STATES)).toBeNull();
    });

    it('should not affect unrelated keys', () => {
      localStorage.setItem('other-key', 'value');
      adapter.clear();
      expect(localStorage.getItem('other-key')).toBe('value');
    });
  });

  describe('corrupt data handling', () => {
    it('should return null for invalid JSON', () => {
      localStorage.setItem(STORAGE_KEYS.ENABLED_MODS, '{{invalid json}}');
      expect(adapter.getEnabledMods()).toBeNull();
    });
  });

  describe('static factory methods', () => {
    it('createDefaultEnabledMods should create with default version', () => {
      const result = LocalStorageAdapter.createDefaultEnabledMods();
      expect(result.version).toBe(STORAGE_VERSION);
      expect(result.modIds).toEqual([]);
      expect(result.timestamp).toBeTruthy();
    });

    it('createDefaultEnabledMods should accept custom modIds', () => {
      const result = LocalStorageAdapter.createDefaultEnabledMods(['a', 'b']);
      expect(result.modIds).toEqual(['a', 'b']);
    });

    it('createDefaultModConfigs should create with empty configs', () => {
      const result = LocalStorageAdapter.createDefaultModConfigs();
      expect(result.version).toBe(STORAGE_VERSION);
      expect(result.configs).toEqual({});
    });

    it('createDefaultModStates should create with empty states', () => {
      const result = LocalStorageAdapter.createDefaultModStates();
      expect(result.version).toBe(STORAGE_VERSION);
      expect(result.states).toEqual({});
    });
  });
});

describe('getStorageAdapter / resetStorageAdapter', () => {
  afterEach(() => {
    resetStorageAdapter();
    localStorage.clear();
  });

  it('should return the same instance on repeated calls', () => {
    const a = getStorageAdapter();
    const b = getStorageAdapter();
    expect(a).toBe(b);
  });

  it('should return a new instance after reset', () => {
    const a = getStorageAdapter();
    resetStorageAdapter();
    const b = getStorageAdapter();
    expect(a).not.toBe(b);
  });
});
