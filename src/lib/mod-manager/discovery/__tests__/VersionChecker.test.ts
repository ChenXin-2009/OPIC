import { VersionChecker, getVersionChecker } from '../VersionChecker';

describe('VersionChecker', () => {
  describe('constructor', () => {
    it('should default to system version 1.0.0', () => {
      const checker = new VersionChecker();
      expect(checker.getSystemVersion()).toBe('1.0.0');
    });

    it('should accept custom system version', () => {
      const checker = new VersionChecker('2.3.4');
      expect(checker.getSystemVersion()).toBe('2.3.4');
    });
  });

  describe('setSystemVersion', () => {
    it('should update system version', () => {
      const checker = new VersionChecker('1.0.0');
      checker.setSystemVersion('2.0.0');
      expect(checker.getSystemVersion()).toBe('2.0.0');
    });
  });

  describe('checkCompatibility', () => {
    let checker: VersionChecker;

    beforeEach(() => {
      checker = new VersionChecker('1.0.0');
    });

    it('should be compatible with exact match', () => {
      const result = checker.checkCompatibility('1.0.0');
      expect(result.compatible).toBe(true);
      expect(result.requiredVersion).toBe('1.0.0');
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.warnings).toHaveLength(0);
    });

    it('should be compatible when system minor is higher', () => {
      const result = checker.checkCompatibility('1.0.0');
      checker.setSystemVersion('1.5.0');
      const result2 = checker.checkCompatibility('1.0.0');
      expect(result2.compatible).toBe(true);
      expect(result2.warnings).toHaveLength(1);
      expect(result2.warnings[0]).toContain('建议更新MOD');
    });

    it('should be compatible when system patch is higher', () => {
      checker.setSystemVersion('1.0.5');
      const result = checker.checkCompatibility('1.0.0');
      expect(result.compatible).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when system patch is lower than required', () => {
      checker.setSystemVersion('1.0.2');
      const result = checker.checkCompatibility('1.0.5');
      expect(result.compatible).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('可能缺少某些bug修复');
    });

    it('should be incompatible when major versions differ', () => {
      const result = checker.checkCompatibility('2.0.0');
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('主版本不兼容');
    });

    it('should be incompatible when system minor is lower than required', () => {
      checker.setSystemVersion('1.2.0');
      const result = checker.checkCompatibility('1.5.0');
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('系统版本过低');
    });

    it('should warn about prerelease versions', () => {
      const result = checker.checkCompatibility('1.0.0-beta.1');
      expect(result.compatible).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('预发布版本');
    });

    it('should return incompatible for invalid version format', () => {
      const result = checker.checkCompatibility('not-a-version');
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('版本号格式无效');
    });

    it('should handle prerelease vs non-prerelease comparison', () => {
      checker.setSystemVersion('1.0.0-alpha.1');
      const result = checker.checkCompatibility('1.0.0');
      expect(result.compatible).toBe(true);
    });

    it('should handle build metadata in versions', () => {
      const result = checker.checkCompatibility('1.0.0+build.123');
      expect(result.compatible).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('checkVersionRange', () => {
    let checker: VersionChecker;

    beforeEach(() => {
      checker = new VersionChecker('1.0.0');
    });

    it('should match wildcard range', () => {
      expect(checker.checkVersionRange('1.0.0', '*')).toBe(true);
      expect(checker.checkVersionRange('2.5.3', '*')).toBe(true);
    });

    it('should match caret range (^)', () => {
      expect(checker.checkVersionRange('1.2.3', '^1.2.3')).toBe(true);
      expect(checker.checkVersionRange('1.3.0', '^1.2.3')).toBe(true);
      expect(checker.checkVersionRange('1.9.9', '^1.2.3')).toBe(true);
      expect(checker.checkVersionRange('1.2.2', '^1.2.3')).toBe(false);
      expect(checker.checkVersionRange('2.0.0', '^1.2.3')).toBe(false);
    });

    it('should match tilde range (~)', () => {
      expect(checker.checkVersionRange('1.2.3', '~1.2.3')).toBe(true);
      expect(checker.checkVersionRange('1.2.5', '~1.2.3')).toBe(true);
      expect(checker.checkVersionRange('1.3.0', '~1.2.3')).toBe(false);
      expect(checker.checkVersionRange('1.2.2', '~1.2.3')).toBe(false);
    });

    it('should match >= range', () => {
      expect(checker.checkVersionRange('1.5.0', '>=1.0.0')).toBe(true);
      expect(checker.checkVersionRange('1.0.0', '>=1.0.0')).toBe(true);
      expect(checker.checkVersionRange('0.9.0', '>=1.0.0')).toBe(false);
    });

    it('should match <= range', () => {
      expect(checker.checkVersionRange('0.5.0', '<=1.0.0')).toBe(true);
      expect(checker.checkVersionRange('1.0.0', '<=1.0.0')).toBe(true);
      expect(checker.checkVersionRange('1.5.0', '<=1.0.0')).toBe(false);
    });

    it('should match > range', () => {
      expect(checker.checkVersionRange('1.0.1', '>1.0.0')).toBe(true);
      expect(checker.checkVersionRange('2.0.0', '>1.0.0')).toBe(true);
      expect(checker.checkVersionRange('1.0.0', '>1.0.0')).toBe(false);
    });

    it('should match < range', () => {
      expect(checker.checkVersionRange('0.9.9', '<1.0.0')).toBe(true);
      expect(checker.checkVersionRange('0.5.0', '<1.0.0')).toBe(true);
      expect(checker.checkVersionRange('1.0.0', '<1.0.0')).toBe(false);
    });

    it('should match exact version', () => {
      expect(checker.checkVersionRange('1.2.3', '1.2.3')).toBe(true);
      expect(checker.checkVersionRange('1.2.4', '1.2.3')).toBe(false);
    });

    it('should return false for invalid version format', () => {
      expect(checker.checkVersionRange('not-valid', '^1.0.0')).toBe(false);
    });
  });

  describe('getVersionChecker singleton', () => {
    it('should return the same instance', () => {
      const a = getVersionChecker();
      const b = getVersionChecker();
      expect(a).toBe(b);
    });

    it('should default to 1.0.0', () => {
      const checker = getVersionChecker();
      expect(checker.getSystemVersion()).toBe('1.0.0');
    });
  });
});
