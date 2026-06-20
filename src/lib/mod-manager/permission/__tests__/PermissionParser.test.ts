import { PermissionParser } from '../PermissionParser';
import { PermissionParseError, VALID_PERMISSION_CATEGORIES, VALID_PERMISSION_ACTIONS } from '../types';

describe('PermissionParser', () => {
  describe('parse', () => {
    it('should parse valid permission string', () => {
      const result = PermissionParser.parse('time:read');
      expect(result).toEqual({ category: 'time', action: 'read' });
    });

    it('should parse all valid categories', () => {
      for (const cat of VALID_PERMISSION_CATEGORIES) {
        const result = PermissionParser.parse(`${cat}:read`);
        expect(result.category).toBe(cat);
        expect(result.action).toBe('read');
      }
    });

    it('should parse all valid actions', () => {
      for (const act of VALID_PERMISSION_ACTIONS) {
        const result = PermissionParser.parse(`time:${act}`);
        expect(result.category).toBe('time');
        expect(result.action).toBe(act);
      }
    });

    it('should handle leading/trailing whitespace', () => {
      const result = PermissionParser.parse('  camera:write  ');
      expect(result).toEqual({ category: 'camera', action: 'write' });
    });

    it('should throw on empty string', () => {
      expect(() => PermissionParser.parse('')).toThrow(PermissionParseError);
    });

    it('should throw on non-string input', () => {
      expect(() => PermissionParser.parse(null as any)).toThrow(PermissionParseError);
      expect(() => PermissionParser.parse(undefined as any)).toThrow(PermissionParseError);
      expect(() => PermissionParser.parse(123 as any)).toThrow(PermissionParseError);
    });

    it('should throw on missing colon', () => {
      expect(() => PermissionParser.parse('time')).toThrow(PermissionParseError);
    });

    it('should throw on too many colons', () => {
      expect(() => PermissionParser.parse('time:read:extra')).toThrow(PermissionParseError);
    });

    it('should throw on invalid category', () => {
      expect(() => PermissionParser.parse('invalid:read')).toThrow(PermissionParseError);
    });

    it('should throw on invalid action', () => {
      expect(() => PermissionParser.parse('time:delete')).toThrow(PermissionParseError);
    });
  });

  describe('parseMany', () => {
    it('should parse multiple valid permissions', () => {
      const result = PermissionParser.parseMany(['time:read', 'camera:write']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ category: 'time', action: 'read' });
      expect(result[1]).toEqual({ category: 'camera', action: 'write' });
    });

    it('should throw if any permission is invalid', () => {
      expect(() => PermissionParser.parseMany(['time:read', 'bad'])).toThrow(PermissionParseError);
    });

    it('should handle empty array', () => {
      expect(PermissionParser.parseMany([])).toEqual([]);
    });
  });

  describe('format', () => {
    it('should format permission object to string', () => {
      const result = PermissionParser.format({ category: 'camera', action: 'write' });
      expect(result).toBe('camera:write');
    });

    it('should format wildcard permission', () => {
      const result = PermissionParser.format({ category: 'render', action: '*' });
      expect(result).toBe('render:*');
    });
  });

  describe('matches', () => {
    it('should match exact permissions', () => {
      const required = { category: 'time', action: 'read' } as const;
      const granted = { category: 'time', action: 'read' } as const;
      expect(PermissionParser.matches(required, granted)).toBe(true);
    });

    it('should match wildcard action', () => {
      const required = { category: 'time', action: 'read' } as const;
      const granted = { category: 'time', action: '*' } as const;
      expect(PermissionParser.matches(required, granted)).toBe(true);
    });

    it('should not match different categories', () => {
      const required = { category: 'time', action: 'read' } as const;
      const granted = { category: 'camera', action: '*' } as const;
      expect(PermissionParser.matches(required, granted)).toBe(false);
    });

    it('should not match different actions', () => {
      const required = { category: 'time', action: 'write' } as const;
      const granted = { category: 'time', action: 'read' } as const;
      expect(PermissionParser.matches(required, granted)).toBe(false);
    });
  });

  describe('describe', () => {
    it('should return description for known permission', () => {
      const desc = PermissionParser.describe({ category: 'time', action: 'read' });
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should return formatted fallback for unknown category', () => {
      const desc = PermissionParser.describe({ category: 'unknown' as any, action: 'read' });
      expect(desc).toBe('unknown:read');
    });
  });

  describe('describeString', () => {
    it('should return description for valid permission string', () => {
      const desc = PermissionParser.describeString('time:read');
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should return original string for invalid permission', () => {
      const desc = PermissionParser.describeString('invalid');
      expect(desc).toBe('invalid');
    });
  });

  describe('isValid', () => {
    it('should return true for valid permission', () => {
      expect(PermissionParser.isValid('time:read')).toBe(true);
    });

    it('should return false for invalid permission', () => {
      expect(PermissionParser.isValid('bad')).toBe(false);
    });
  });

  describe('getValidCategories', () => {
    it('should return array of valid categories', () => {
      const cats = PermissionParser.getValidCategories();
      expect(cats.length).toBeGreaterThan(0);
      expect(cats).toContain('time');
      expect(cats).toContain('camera');
    });
  });

  describe('getValidActions', () => {
    it('should return array of valid actions', () => {
      const actions = PermissionParser.getValidActions();
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('read');
      expect(actions).toContain('*');
    });
  });

  describe('getAllPermissionsForCategory', () => {
    it('should return permissions for a category', () => {
      const perms = PermissionParser.getAllPermissionsForCategory('time');
      expect(perms.length).toBe(VALID_PERMISSION_ACTIONS.length);
      expect(perms).toContain('time:read');
      expect(perms).toContain('time:*');
    });
  });
});
