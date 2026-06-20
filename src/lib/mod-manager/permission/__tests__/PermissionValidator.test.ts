import { PermissionValidator } from '../PermissionValidator';
import { PermissionDeniedError } from '../types';
import type { ModRegistry } from '../../core/ModRegistry';
import type { ModManifest } from '../../types';

function createMockRegistry(manifests: Record<string, ModManifest | undefined> = {}): ModRegistry {
  return {
    getManifest: jest.fn((modId: string) => manifests[modId]),
  } as unknown as ModRegistry;
}

function makeManifest(overrides: Partial<ModManifest>): ModManifest {
  return {
    id: 'test-mod',
    version: '1.0.0',
    name: 'Test Mod',
    entryPoint: 'main',
    ...overrides,
  } as ModManifest;
}

describe('PermissionValidator', () => {
  describe('validate', () => {
    it('should return false for unknown mod', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      expect(validator.validate('unknown', 'time:read')).toBe(false);
    });

    it('should grant all permissions when no declarations exist (backward compat)', () => {
      const registry = createMockRegistry({
        'legacy-mod': makeManifest({ id: 'legacy-mod' }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.validate('legacy-mod', 'time:read')).toBe(true);
      expect(validator.validate('legacy-mod', 'camera:write')).toBe(true);
    });

    it('should return true when required permission matches granted', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read', 'camera:write'],
        }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.validate('my-mod', 'time:read')).toBe(true);
    });

    it('should return false when required permission not granted', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read'],
        }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.validate('my-mod', 'camera:write')).toBe(false);
    });

    it('should check optionalPermissions too', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          optionalPermissions: ['render:read'],
        }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.validate('my-mod', 'render:read')).toBe(true);
    });

    it('should match wildcard granted permission', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:*'],
        }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.validate('my-mod', 'time:read')).toBe(true);
      expect(validator.validate('my-mod', 'time:write')).toBe(true);
    });

    it('should return false for invalid required permission string', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read'],
        }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.validate('my-mod', 'invalid')).toBe(false);
    });

    it('should cache results', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read'],
        }),
      });
      const validator = new PermissionValidator(registry);
      validator.validate('my-mod', 'time:read');
      validator.validate('my-mod', 'time:read');
      expect(validator.getCacheSize()).toBe(1);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw when permission granted', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const validator = new PermissionValidator(registry);
      expect(() => validator.validateOrThrow('my-mod', 'time:read')).not.toThrow();
    });

    it('should throw PermissionDeniedError when denied', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const validator = new PermissionValidator(registry);
      expect(() => validator.validateOrThrow('my-mod', 'camera:write')).toThrow(PermissionDeniedError);
    });

    it('should throw for unknown mod', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      expect(() => validator.validateOrThrow('unknown', 'time:read')).toThrow(PermissionDeniedError);
    });
  });

  describe('validateManifest', () => {
    it('should return valid for correct permissions', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      const result = validator.validateManifest({
        id: 'mod', version: '1.0.0', name: 'Mod', entryPoint: 'main',
        permissions: ['time:read', 'camera:write'],
      } as any);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for malformed permission string', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      const result = validator.validateManifest({
        id: 'mod', version: '1.0.0', name: 'Mod', entryPoint: 'main',
        permissions: ['bad-permission'],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate permissions', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      const result = validator.validateManifest({
        id: 'mod', version: '1.0.0', name: 'Mod', entryPoint: 'main',
        permissions: ['time:read', 'time:read'],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('should return valid for empty permissions', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      const result = validator.validateManifest({
        id: 'mod', version: '1.0.0', name: 'Mod', entryPoint: 'main',
      } as any);
      expect(result.valid).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const validator = new PermissionValidator(registry);
      validator.validate('my-mod', 'time:read');
      expect(validator.getCacheSize()).toBe(1);
      validator.clearCache();
      expect(validator.getCacheSize()).toBe(0);
    });

    it('should clear cache for specific mod', () => {
      const registry = createMockRegistry({
        'mod-a': makeManifest({ permissions: ['time:read'] }),
        'mod-b': makeManifest({ permissions: ['camera:read'] }),
      });
      const validator = new PermissionValidator(registry);
      validator.validate('mod-a', 'time:read');
      validator.validate('mod-b', 'camera:read');
      expect(validator.getCacheSize()).toBe(2);
      validator.clearCache('mod-a');
      expect(validator.getCacheSize()).toBe(1);
    });
  });

  describe('getGrantedPermissions', () => {
    it('should return combined permissions and optionalPermissions', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read'],
          optionalPermissions: ['camera:write'],
        }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.getGrantedPermissions('my-mod')).toEqual(['time:read', 'camera:write']);
    });

    it('should return empty array for unknown mod', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      expect(validator.getGrantedPermissions('unknown')).toEqual([]);
    });
  });

  describe('hasPermissionDeclarations', () => {
    it('should return true when permissions exist', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.hasPermissionDeclarations('my-mod')).toBe(true);
    });

    it('should return true when only optionalPermissions exist', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ optionalPermissions: ['time:read'] }),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.hasPermissionDeclarations('my-mod')).toBe(true);
    });

    it('should return false for unknown mod', () => {
      const registry = createMockRegistry({});
      const validator = new PermissionValidator(registry);
      expect(validator.hasPermissionDeclarations('unknown')).toBe(false);
    });

    it('should return false when no declarations', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({}),
      });
      const validator = new PermissionValidator(registry);
      expect(validator.hasPermissionDeclarations('my-mod')).toBe(false);
    });
  });
});
