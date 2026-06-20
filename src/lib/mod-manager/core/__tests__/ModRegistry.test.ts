import type { ModManifest, ModState } from '../../types';

jest.mock('../../utils/validateManifest', () => ({
  validateManifest: jest.fn(),
}));

jest.mock('../../permission/PermissionSystem', () => ({
  PermissionSystem: jest.fn().mockImplementation(() => ({
    validateManifest: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  })),
}));

jest.mock('../../contribution/ContributionRegistry', () => ({
  ContributionRegistry: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../service/ServiceRegistry', () => ({
  ServiceRegistry: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../sandbox/Sandbox', () => ({
  Sandbox: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
  })),
}));

jest.mock('../../contribution/WindowManager', () => ({
  WindowManager: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../EventBus', () => ({
  getEventBus: jest.fn().mockReturnValue({
    on: jest.fn(),
    emit: jest.fn(),
  }),
}));

import { ModRegistry, getRegistry, resetRegistry } from '../ModRegistry';
import { validateManifest } from '../../utils/validateManifest';
import { ManifestValidationError, DuplicateIdError } from '../../error/ModError';

const validManifest: ModManifest = {
  id: 'test-mod',
  version: '1.0.0',
  name: 'Test Mod',
  entryPoint: 'main',
};

const validManifest2: ModManifest = {
  id: 'test-mod-2',
  version: '1.0.0',
  name: 'Test Mod 2',
  entryPoint: 'main',
};

describe('ModRegistry', () => {
  let registry: ModRegistry;

  beforeEach(() => {
    registry = new ModRegistry();
    (validateManifest as jest.Mock).mockReturnValue({ valid: true, errors: [] });
  });

  describe('register', () => {
    it('should register a valid mod', () => {
      registry.register(validManifest);
      expect(registry.has('test-mod')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should set initial state to registered', () => {
      registry.register(validManifest);
      expect(registry.getState('test-mod')).toBe('registered');
    });

    it('should store manifest', () => {
      registry.register(validManifest);
      expect(registry.getManifest('test-mod')).toEqual(validManifest);
    });

    it('should throw ManifestValidationError for invalid manifest', () => {
      (validateManifest as jest.Mock).mockReturnValue({
        valid: false,
        errors: [{ field: 'id', message: 'missing' }],
      });
      expect(() => registry.register(validManifest)).toThrow(ManifestValidationError);
    });

    it('should throw DuplicateIdError for duplicate id', () => {
      registry.register(validManifest);
      expect(() => registry.register(validManifest)).toThrow(DuplicateIdError);
    });
  });

  describe('unregister', () => {
    it('should unregister a registered mod', () => {
      registry.register(validManifest);
      expect(registry.unregister('test-mod')).toBe(true);
      expect(registry.has('test-mod')).toBe(false);
    });

    it('should return false for non-existent mod', () => {
      expect(registry.unregister('nonexistent')).toBe(false);
    });

    it('should not unregister a loaded mod', () => {
      registry.register(validManifest);
      registry.setState('test-mod', 'loaded');
      expect(registry.unregister('test-mod')).toBe(false);
    });

    it('should not unregister an enabled mod', () => {
      registry.register(validManifest);
      registry.setState('test-mod', 'enabled');
      expect(registry.unregister('test-mod')).toBe(false);
    });

    it('should unregister a disabled mod', () => {
      registry.register(validManifest);
      registry.setState('test-mod', 'disabled');
      expect(registry.unregister('test-mod')).toBe(true);
    });
  });

  describe('get / getManifest / getState', () => {
    it('should return undefined for non-existent mod', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
      expect(registry.getManifest('nonexistent')).toBeUndefined();
      expect(registry.getState('nonexistent')).toBeUndefined();
    });

    it('should return mod instance', () => {
      registry.register(validManifest);
      const instance = registry.get('test-mod');
      expect(instance).toBeDefined();
      expect(instance!.manifest).toEqual(validManifest);
    });
  });

  describe('setState', () => {
    it('should set state for existing mod', () => {
      registry.register(validManifest);
      expect(registry.setState('test-mod', 'enabled')).toBe(true);
      expect(registry.getState('test-mod')).toBe('enabled');
    });

    it('should return false for non-existent mod', () => {
      expect(registry.setState('nonexistent', 'enabled')).toBe(false);
    });
  });

  describe('setContext', () => {
    it('should set context for existing mod', () => {
      registry.register(validManifest);
      const ctx = { id: 'test-mod' } as any;
      expect(registry.setContext('test-mod', ctx)).toBe(true);
      expect(registry.get('test-mod')!.context).toBe(ctx);
    });

    it('should return false for non-existent mod', () => {
      expect(registry.setContext('nonexistent', null)).toBe(false);
    });
  });

  describe('error tracking', () => {
    it('should record errors', () => {
      registry.register(validManifest);
      registry.recordError('test-mod', new Error('fail'));
      registry.recordError('test-mod', new Error('fail2'));
      const instance = registry.get('test-mod')!;
      expect(instance.errorCount).toBe(2);
      expect(instance.lastError).toBeInstanceOf(Error);
      expect(instance.lastError!.message).toBe('fail2');
    });

    it('should reset errors', () => {
      registry.register(validManifest);
      registry.recordError('test-mod', new Error('fail'));
      registry.resetErrors('test-mod');
      const instance = registry.get('test-mod')!;
      expect(instance.errorCount).toBe(0);
      expect(instance.lastError).toBeNull();
    });

    it('should ignore errors for non-existent mod', () => {
      expect(() => registry.recordError('nonexistent', new Error())).not.toThrow();
      expect(() => registry.resetErrors('nonexistent')).not.toThrow();
    });
  });

  describe('queries', () => {
    it('should return all mod ids', () => {
      registry.register(validManifest);
      registry.register(validManifest2);
      expect(registry.getModIds()).toEqual(
        expect.arrayContaining(['test-mod', 'test-mod-2'])
      );
    });

    it('should return all mods', () => {
      registry.register(validManifest);
      registry.register(validManifest2);
      expect(registry.getAll()).toHaveLength(2);
    });

    it('should filter by state', () => {
      registry.register(validManifest);
      registry.register(validManifest2);
      registry.setState('test-mod', 'enabled');
      expect(registry.getByState('enabled')).toHaveLength(1);
      expect(registry.getByState('registered')).toHaveLength(1);
    });
  });

  describe('onStateChange', () => {
    it('should notify state change listeners', () => {
      const listener = jest.fn();
      registry.onStateChange(listener);
      registry.register(validManifest);
      expect(listener).toHaveBeenCalledWith('test-mod', 'registered');
    });

    it('should allow unsubscribing listeners', () => {
      const listener = jest.fn();
      const unsub = registry.onStateChange(listener);
      unsub();
      registry.register(validManifest);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should not throw if listener errors', () => {
      const badListener = jest.fn().mockImplementation(() => { throw new Error(); });
      registry.onStateChange(badListener);
      expect(() => registry.register(validManifest)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all mods', () => {
      registry.register(validManifest);
      registry.register(validManifest2);
      registry.clear();
      expect(registry.size).toBe(0);
    });
  });
});

describe('getRegistry singleton', () => {
  beforeEach(() => {
    resetRegistry();
  });

  it('should return same instance', () => {
    const a = getRegistry();
    const b = getRegistry();
    expect(a).toBe(b);
  });
});
