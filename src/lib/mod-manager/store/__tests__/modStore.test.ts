import {
  useModStore,
  getModState,
  getModConfig,
  getEnabledModIds,
  getRegisteredModIds,
} from '../modStore';
import type { ModManifest } from '../../types';

const createManifest = (id: string): ModManifest => ({
  id,
  version: '1.0.0',
  name: `Mod ${id}`,
  entryPoint: 'main',
});

describe('modStore', () => {
  beforeEach(() => {
    useModStore.setState({ mods: {}, isLoading: false, error: null });
  });

  describe('registerMod', () => {
    it('should register a new mod', () => {
      const manifest = createManifest('mod-1');
      useModStore.getState().registerMod(manifest);

      expect(useModStore.getState().mods['mod-1']).toBeDefined();
      expect(useModStore.getState().mods['mod-1'].state).toBe('registered');
      expect(useModStore.getState().mods['mod-1'].manifest).toEqual(manifest);
    });

    it('should not overwrite an existing mod', () => {
      const manifest = createManifest('mod-1');
      useModStore.getState().registerMod(manifest);
      useModStore.getState().setModState('mod-1', 'enabled');

      useModStore.getState().registerMod(manifest);
      expect(useModStore.getState().mods['mod-1'].state).toBe('enabled');
    });
  });

  describe('unregisterMod', () => {
    it('should remove a mod', () => {
      useModStore.getState().registerMod(createManifest('mod-1'));
      useModStore.getState().unregisterMod('mod-1');

      expect(useModStore.getState().mods['mod-1']).toBeUndefined();
    });
  });

  describe('setModState', () => {
    it('should update mod state', () => {
      useModStore.getState().registerMod(createManifest('mod-1'));
      useModStore.getState().setModState('mod-1', 'enabled');

      expect(useModStore.getState().mods['mod-1'].state).toBe('enabled');
    });

    it('should be a no-op for unknown mod', () => {
      useModStore.getState().setModState('unknown', 'enabled');
      expect(useModStore.getState().mods['unknown']).toBeUndefined();
    });
  });

  describe('setModConfig', () => {
    it('should update mod config', () => {
      useModStore.getState().registerMod(createManifest('mod-1'));
      useModStore.getState().setModConfig('mod-1', { key: 'value' });

      expect(useModStore.getState().mods['mod-1'].config).toEqual({ key: 'value' });
    });
  });

  describe('setModModState', () => {
    it('should update mod runtime state', () => {
      useModStore.getState().registerMod(createManifest('mod-1'));
      useModStore.getState().setModModState('mod-1', { counter: 42 });

      expect(useModStore.getState().mods['mod-1'].modState).toEqual({ counter: 42 });
    });
  });

  describe('recordError / resetErrors', () => {
    it('should record errors and reset', () => {
      useModStore.getState().registerMod(createManifest('mod-1'));

      useModStore.getState().recordError('mod-1', 'error 1');
      useModStore.getState().recordError('mod-1', 'error 2');

      expect(useModStore.getState().mods['mod-1'].errorCount).toBe(2);
      expect(useModStore.getState().mods['mod-1'].lastError).toBe('error 2');

      useModStore.getState().resetErrors('mod-1');
      expect(useModStore.getState().mods['mod-1'].errorCount).toBe(0);
      expect(useModStore.getState().mods['mod-1'].lastError).toBeNull();
    });
  });

  describe('setLoading / setError', () => {
    it('should set loading state', () => {
      useModStore.getState().setLoading(true);
      expect(useModStore.getState().isLoading).toBe(true);
    });

    it('should set error state', () => {
      useModStore.getState().setError('Something went wrong');
      expect(useModStore.getState().error).toBe('Something went wrong');
    });
  });

  describe('clear', () => {
    it('should reset entire store', () => {
      useModStore.getState().registerMod(createManifest('mod-1'));
      useModStore.getState().setLoading(true);
      useModStore.getState().setError('error');

      useModStore.getState().clear();

      expect(useModStore.getState().mods).toEqual({});
      expect(useModStore.getState().isLoading).toBe(false);
      expect(useModStore.getState().error).toBeNull();
    });
  });
});

describe('helper functions', () => {
  beforeEach(() => {
    useModStore.setState({ mods: {}, isLoading: false, error: null });
  });

  it('getModState returns state', () => {
    useModStore.getState().registerMod(createManifest('mod-1'));
    expect(getModState('mod-1')).toBe('registered');
  });

  it('getModState returns undefined for unknown mod', () => {
    expect(getModState('unknown')).toBeUndefined();
  });

  it('getModConfig returns config', () => {
    useModStore.getState().registerMod(createManifest('mod-1'));
    useModStore.getState().setModConfig('mod-1', { a: 1 });
    expect(getModConfig('mod-1')).toEqual({ a: 1 });
  });

  it('getEnabledModIds returns enabled mods', () => {
    useModStore.getState().registerMod(createManifest('mod-1'));
    useModStore.getState().registerMod(createManifest('mod-2'));
    useModStore.getState().setModState('mod-1', 'enabled');

    expect(getEnabledModIds()).toEqual(['mod-1']);
  });

  it('getRegisteredModIds returns all registered mods', () => {
    useModStore.getState().registerMod(createManifest('mod-1'));
    useModStore.getState().registerMod(createManifest('mod-2'));

    expect(getRegisteredModIds()).toContain('mod-1');
    expect(getRegisteredModIds()).toContain('mod-2');
  });
});
