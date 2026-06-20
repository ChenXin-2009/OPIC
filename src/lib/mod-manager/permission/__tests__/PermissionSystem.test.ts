import { PermissionSystem } from '../PermissionSystem';
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

describe('PermissionSystem', () => {
  describe('hasPermission', () => {
    it('should return true when mod has permission', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const system = new PermissionSystem(registry);
      expect(system.hasPermission('my-mod', 'time:read')).toBe(true);
    });

    it('should return false when mod lacks permission', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const system = new PermissionSystem(registry);
      expect(system.hasPermission('my-mod', 'camera:write')).toBe(false);
    });

    it('should return false for unknown mod', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      expect(system.hasPermission('unknown', 'time:read')).toBe(false);
    });

    it('should grant all for legacy mod without declarations', () => {
      const registry = createMockRegistry({
        'legacy': makeManifest({}),
      });
      const system = new PermissionSystem(registry);
      expect(system.hasPermission('legacy', 'any:thing')).toBe(true);
    });
  });

  describe('requirePermission', () => {
    it('should not throw when permission granted', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const system = new PermissionSystem(registry);
      expect(() => system.requirePermission('my-mod', 'time:read')).not.toThrow();
    });

    it('should throw PermissionDeniedError when denied', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const system = new PermissionSystem(registry);
      expect(() => system.requirePermission('my-mod', 'camera:write')).toThrow(PermissionDeniedError);
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read'],
          optionalPermissions: ['camera:write'],
        }),
      });
      const system = new PermissionSystem(registry);
      expect(system.getPermissions('my-mod')).toEqual(['time:read', 'camera:write']);
    });

    it('should return empty array for unknown mod', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      expect(system.getPermissions('unknown')).toEqual([]);
    });
  });

  describe('getRequiredPermissions', () => {
    it('should return only required permissions', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read'],
          optionalPermissions: ['camera:write'],
        }),
      });
      const system = new PermissionSystem(registry);
      expect(system.getRequiredPermissions('my-mod')).toEqual(['time:read']);
    });

    it('should return empty array when none declared', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({}),
      });
      const system = new PermissionSystem(registry);
      expect(system.getRequiredPermissions('my-mod')).toEqual([]);
    });
  });

  describe('getOptionalPermissions', () => {
    it('should return only optional permissions', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({
          permissions: ['time:read'],
          optionalPermissions: ['camera:write'],
        }),
      });
      const system = new PermissionSystem(registry);
      expect(system.getOptionalPermissions('my-mod')).toEqual(['camera:write']);
    });
  });

  describe('describePermission', () => {
    it('should return a description for valid permission', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      const desc = system.describePermission('time:read');
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should return original string for invalid permission', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      expect(system.describePermission('bad')).toBe('bad');
    });
  });

  describe('getPermissionDescriptions', () => {
    it('should return descriptions map', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read', 'camera:write'] }),
      });
      const system = new PermissionSystem(registry);
      const descriptions = system.getPermissionDescriptions('my-mod');
      expect(Object.keys(descriptions)).toHaveLength(2);
      expect(descriptions['time:read']).toBeDefined();
      expect(descriptions['camera:write']).toBeDefined();
    });
  });

  describe('validateManifest', () => {
    it('should validate correct manifest', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      const result = system.validateManifest({
        id: 'mod', version: '1.0.0', name: 'Mod', entryPoint: 'main',
        permissions: ['time:read'],
      } as any);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid permission format', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      const result = system.validateManifest({
        id: 'mod', version: '1.0.0', name: 'Mod', entryPoint: 'main',
        permissions: ['bad'],
      } as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cache', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const system = new PermissionSystem(registry);
      system.hasPermission('my-mod', 'time:read');
      expect(system.getCacheSize()).toBe(1);
      system.clearCache();
      expect(system.getCacheSize()).toBe(0);
    });
  });

  describe('hasPermissionDeclarations', () => {
    it('should return true when declarations exist', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({ permissions: ['time:read'] }),
      });
      const system = new PermissionSystem(registry);
      expect(system.hasPermissionDeclarations('my-mod')).toBe(true);
    });

    it('should return false when no declarations', () => {
      const registry = createMockRegistry({
        'my-mod': makeManifest({}),
      });
      const system = new PermissionSystem(registry);
      expect(system.hasPermissionDeclarations('my-mod')).toBe(false);
    });
  });

  describe('getValidCategories', () => {
    it('should return categories', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      const cats = system.getValidCategories();
      expect(cats).toContain('time');
      expect(cats).toContain('camera');
    });
  });

  describe('getValidActions', () => {
    it('should return actions', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      const actions = system.getValidActions();
      expect(actions).toContain('read');
      expect(actions).toContain('*');
    });
  });

  describe('getAllPermissionsForCategory', () => {
    it('should return permissions for category', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      const perms = system.getAllPermissionsForCategory('time');
      expect(perms).toContain('time:read');
      expect(perms).toContain('time:*');
    });
  });

  describe('isValidPermission', () => {
    it('should return true for valid', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      expect(system.isValidPermission('time:read')).toBe(true);
    });

    it('should return false for invalid', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      expect(system.isValidPermission('bad')).toBe(false);
    });
  });

  describe('getValidator', () => {
    it('should return validator instance', () => {
      const registry = createMockRegistry({});
      const system = new PermissionSystem(registry);
      const validator = system.getValidator();
      expect(validator).toBeDefined();
    });
  });
});
