import {
  parseSemVer, semVerToString, compareVersions, isVersionCompatible,
  getApiVersion, getApiVersionString, hasApiFeature, getAvailableFeatures,
} from '../version';

describe('parseSemVer', () => {
  it('should parse valid semver', () => {
    const result = parseSemVer('1.2.3');
    expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('should return null for invalid version', () => {
    expect(parseSemVer('invalid')).toBeNull();
  });

  it('should handle multi-digit components', () => {
    expect(parseSemVer('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30 });
  });
});

describe('semVerToString', () => {
  it('should format semver as string', () => {
    expect(semVerToString({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
  });
});

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBe(0);
  });

  it('should return -1 when a < b', () => {
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 })).toBe(-1);
  });

  it('should return 1 when a > b', () => {
    expect(compareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBe(1);
  });
});

describe('isVersionCompatible', () => {
  it('should return true for exact match with current version', () => {
    const current = getApiVersion();
    const currentStr = semVerToString(current);
    expect(isVersionCompatible(currentStr, current)).toBe(true);
  });

  it('should return false for incompatible major version', () => {
    const result = isVersionCompatible('2.0.0', { major: 1, minor: 0, patch: 0 });
    expect(result).toBe(false);
  });

  it('should return false for higher minor version', () => {
    expect(isVersionCompatible('1.5.0', { major: 1, minor: 0, patch: 0 })).toBe(false);
  });

  it('should return false for invalid required version', () => {
    expect(isVersionCompatible('abc', { major: 1, minor: 0, patch: 0 })).toBe(false);
  });

  it('should return false when patch is higher and minor matches', () => {
    expect(isVersionCompatible('1.0.5', { major: 1, minor: 0, patch: 0 })).toBe(false);
  });
});

describe('getApiVersion', () => {
  it('should return a semver object', () => {
    const v = getApiVersion();
    expect(v.major).toBeGreaterThanOrEqual(0);
  });
});

describe('getApiVersionString', () => {
  it('should return a version string', () => {
    const s = getApiVersionString();
    expect(s).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('hasApiFeature', () => {
  it('should return true for known features', () => {
    expect(hasApiFeature('time:direction')).toBe(true);
    expect(hasApiFeature('camera:focus')).toBe(true);
  });

  it('should return false for unknown features', () => {
    expect(hasApiFeature('nonexistent')).toBe(false);
  });
});

describe('getAvailableFeatures', () => {
  it('should return array of feature strings', () => {
    const features = getAvailableFeatures();
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);
    expect(features).toContain('time:direction');
  });
});
