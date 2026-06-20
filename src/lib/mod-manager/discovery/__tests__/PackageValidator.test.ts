import { PackageValidator, getPackageValidator } from '../PackageValidator';
import type { ModPackageFile } from '../types';
import type { ModManifest } from '../../types';

function makeValidPackage(overrides?: Partial<ModPackageFile>): ModPackageFile {
  return {
    id: 'test-mod',
    name: 'Test Mod',
    version: '1.0.0',
    apiVersion: '1.0.0',
    ...overrides,
  };
}

function makeValidManifest(overrides?: Partial<ModManifest>): ModManifest {
  return {
    id: 'test-mod',
    version: '1.0.0',
    name: 'Test Mod',
    entryPoint: 'onInit',
    ...overrides,
  };
}

describe('PackageValidator', () => {
  describe('constructor', () => {
    it('should default to 10MB max size', () => {
      const validator = new PackageValidator();
      expect(validator).toBeDefined();
    });

    it('should accept custom max size', () => {
      const validator = new PackageValidator(5 * 1024 * 1024);
      expect(validator).toBeDefined();
    });
  });

  describe('validatePackage', () => {
    let validator: PackageValidator;

    beforeEach(() => {
      validator = new PackageValidator();
    });

    it('should pass for valid package and manifest', () => {
      const result = validator.validatePackage(makeValidPackage(), makeValidManifest());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about missing optional fields', () => {
      const result = validator.validatePackage(makeValidPackage(), makeValidManifest());
      expect(result.warnings).toContain('建议添加 description 字段');
      expect(result.warnings).toContain('建议添加 author 字段');
      expect(result.warnings).toContain('建议添加 license 字段');
    });

    it('should not warn when optional fields are present', () => {
      const pkg = makeValidPackage({ description: 'A mod', author: 'me', license: 'MIT' });
      const result = validator.validatePackage(pkg, makeValidManifest());
      expect(result.warnings).toHaveLength(0);
    });

    it('should error when package size exceeds limit', () => {
      const pkg = makeValidPackage({ size: 20 * 1024 * 1024 });
      const result = validator.validatePackage(pkg, makeValidManifest());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('包大小'))).toBe(true);
    });

    it('should pass when package size is within limit', () => {
      const pkg = makeValidPackage({ size: 5 * 1024 * 1024 });
      const result = validator.validatePackage(pkg, makeValidManifest());
      expect(result.errors.some(e => e.includes('包大小'))).toBe(false);
    });

    it('should error when id is missing', () => {
      const pkg = makeValidPackage({ id: '' });
      const result = validator.validatePackage(pkg, makeValidManifest({ id: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id 字段'))).toBe(true);
    });

    it('should error when name is missing', () => {
      const pkg = makeValidPackage({ name: '' });
      const result = validator.validatePackage(pkg, makeValidManifest({ name: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name 字段'))).toBe(true);
    });

    it('should error when version is missing', () => {
      const pkg = makeValidPackage({ version: '' });
      const result = validator.validatePackage(pkg, makeValidManifest({ version: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version 字段'))).toBe(true);
    });

    it('should error when apiVersion is missing', () => {
      const pkg = makeValidPackage({ apiVersion: '' });
      const result = validator.validatePackage(pkg, makeValidManifest());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('apiVersion 字段'))).toBe(true);
    });

    it('should error for invalid version format', () => {
      const pkg = makeValidPackage({ version: 'not-semver' });
      const result = validator.validatePackage(pkg, makeValidManifest({ version: 'not-semver' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('语义化版本规范'))).toBe(true);
    });

    it('should error for invalid apiVersion format', () => {
      const pkg = makeValidPackage({ apiVersion: 'bad' });
      const result = validator.validatePackage(pkg, makeValidManifest());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('API版本号'))).toBe(true);
    });

    it('should accept valid semver with prerelease', () => {
      const pkg = makeValidPackage({ version: '1.0.0-beta.1', apiVersion: '1.0.0-alpha.1' });
      const result = validator.validatePackage(pkg, makeValidManifest({ version: '1.0.0-beta.1' }));
      expect(result.errors.some(e => e.includes('语义化版本规范'))).toBe(false);
    });

    it('should error when package id does not match manifest id', () => {
      const pkg = makeValidPackage({ id: 'mod-a' });
      const manifest = makeValidManifest({ id: 'mod-b' });
      const result = validator.validatePackage(pkg, manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('包ID') && e.includes('清单ID'))).toBe(true);
    });

    it('should error when package version does not match manifest version', () => {
      const pkg = makeValidPackage({ version: '1.0.0' });
      const manifest = makeValidManifest({ version: '2.0.0' });
      const result = validator.validatePackage(pkg, manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('包版本') && e.includes('清单版本'))).toBe(true);
    });

    it('should error for invalid dependency version range', () => {
      const pkg = makeValidPackage({
        dependencies: { 'dep-a': 'not-a-range' },
      });
      const result = validator.validatePackage(pkg, makeValidManifest());
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dep-a') && e.includes('版本范围'))).toBe(true);
    });

    it('should accept valid dependency version ranges', () => {
      const pkg = makeValidPackage({
        dependencies: {
          'dep-a': '^1.0.0',
          'dep-b': '~2.0.0',
          'dep-c': '>=1.0.0',
          'dep-d': '1.0.0',
          'dep-e': '*',
        },
      });
      const result = validator.validatePackage(pkg, makeValidManifest());
      expect(result.errors.some(e => e.includes('版本范围'))).toBe(false);
    });

    it('should error when manifest validation fails', () => {
      const pkg = makeValidPackage();
      const manifest = { id: 'test-mod', version: '1.0.0' } as ModManifest;
      const result = validator.validatePackage(pkg, manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('清单验证失败'))).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const pkg = makeValidPackage({
        id: '',
        name: '',
        version: '',
        apiVersion: '',
      });
      const manifest = makeValidManifest({ id: '', name: '', version: '' });
      const result = validator.validatePackage(pkg, manifest);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getPackageValidator singleton', () => {
    it('should return the same instance', () => {
      const a = getPackageValidator();
      const b = getPackageValidator();
      expect(a).toBe(b);
    });
  });
});
