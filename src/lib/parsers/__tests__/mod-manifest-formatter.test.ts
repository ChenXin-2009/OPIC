import {
  formatModManifest,
  validateFormattedModManifest,
  ModManifestFormatterError,
  ModManifest,
} from '../mod-manifest-formatter';

function makeManifest(overrides?: Partial<ModManifest>): ModManifest {
  return {
    id: 'test-mod',
    name: 'Test Mod',
    version: '1.0.0',
    author: 'Author',
    description: 'A test mod',
    entry: './index.js',
    ...overrides,
  };
}

describe('ModManifestFormatterError', () => {
  it('should be an instance of Error', () => {
    const err = new ModManifestFormatterError('test', 'field', 'value');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ModManifestFormatterError);
    expect(err.name).toBe('ModManifestFormatterError');
    expect(err.field).toBe('field');
    expect(err.value).toBe('value');
  });

  it('should allow optional field and value', () => {
    const err = new ModManifestFormatterError('test');
    expect(err.field).toBeUndefined();
    expect(err.value).toBeUndefined();
  });
});

describe('formatModManifest', () => {
  it('should format a valid manifest to pretty JSON', () => {
    const result = formatModManifest(makeManifest());
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe('test-mod');
    expect(parsed.name).toBe('Test Mod');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.author).toBe('Author');
    expect(parsed.description).toBe('A test mod');
    expect(parsed.entry).toBe('./index.js');
  });

  it('should format to compact JSON when pretty is false', () => {
    const result = formatModManifest(makeManifest(), false);
    expect(result).not.toContain('\n');
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe('test-mod');
  });

  it('should include optional fields when provided', () => {
    const manifest = makeManifest({
      icon: './icon.png',
      homepage: 'https://example.com',
      repository: 'https://github.com/example',
      license: 'MIT',
      dependencies: { 'dep-a': '>=1.0.0' },
      permissions: ['camera', 'storage'],
    });
    const result = formatModManifest(manifest);
    const parsed = JSON.parse(result);
    expect(parsed.icon).toBe('./icon.png');
    expect(parsed.homepage).toBe('https://example.com');
    expect(parsed.repository).toBe('https://github.com/example');
    expect(parsed.license).toBe('MIT');
    expect(parsed.dependencies).toEqual({ 'dep-a': '>=1.0.0' });
    expect(parsed.permissions).toEqual(['camera', 'storage']);
  });

  it('should omit optional fields when empty', () => {
    const result = formatModManifest(makeManifest());
    const parsed = JSON.parse(result);
    expect(parsed.icon).toBeUndefined();
    expect(parsed.homepage).toBeUndefined();
    expect(parsed.dependencies).toBeUndefined();
    expect(parsed.permissions).toBeUndefined();
  });

  it('should omit dependencies when empty object', () => {
    const manifest = makeManifest({ dependencies: {} });
    const result = formatModManifest(manifest);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies).toBeUndefined();
  });

  it('should omit permissions when empty array', () => {
    const manifest = makeManifest({ permissions: [] });
    const result = formatModManifest(manifest);
    const parsed = JSON.parse(result);
    expect(parsed.permissions).toBeUndefined();
  });

  it('should place entry field after required fields', () => {
    const result = formatModManifest(makeManifest());
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    const entryIdx = keys.indexOf('entry');
    const descIdx = keys.indexOf('description');
    expect(entryIdx).toBeGreaterThan(descIdx);
  });

  it('should throw for missing id', () => {
    expect(() => formatModManifest(makeManifest({ id: '' }))).toThrow(ModManifestFormatterError);
    expect(() => formatModManifest(makeManifest({ id: '' }))).toThrow('Missing or invalid id field');
  });

  it('should throw for missing name', () => {
    expect(() => formatModManifest(makeManifest({ name: '' }))).toThrow('Missing or invalid name field');
  });

  it('should throw for missing version', () => {
    expect(() => formatModManifest(makeManifest({ version: '' }))).toThrow('Missing or invalid version field');
  });

  it('should throw for missing author', () => {
    expect(() => formatModManifest(makeManifest({ author: '' }))).toThrow('Missing or invalid author field');
  });

  it('should throw for missing description', () => {
    expect(() => formatModManifest(makeManifest({ description: '' }))).toThrow('Missing or invalid description field');
  });

  it('should throw for missing entry', () => {
    expect(() => formatModManifest(makeManifest({ entry: '' }))).toThrow('Missing or invalid entry field');
  });

  it('should throw for invalid SemVer version', () => {
    expect(() => formatModManifest(makeManifest({ version: 'v1.0' }))).toThrow('Invalid version format');
    expect(() => formatModManifest(makeManifest({ version: 'latest' }))).toThrow('Invalid version format');
  });

  it('should accept valid SemVer with pre-release', () => {
    const manifest = makeManifest({ version: '1.0.0-beta.1' });
    expect(() => formatModManifest(manifest)).not.toThrow();
  });

  it('should accept valid SemVer with build metadata', () => {
    const manifest = makeManifest({ version: '1.0.0+build.123' });
    expect(() => formatModManifest(manifest)).not.toThrow();
  });

  it('should throw for invalid kebab-case id', () => {
    expect(() => formatModManifest(makeManifest({ id: 'MyMod' }))).toThrow('Invalid id format');
    expect(() => formatModManifest(makeManifest({ id: 'my_mod' }))).toThrow('Invalid id format');
    expect(() => formatModManifest(makeManifest({ id: 'My-Mod' }))).toThrow('Invalid id format');
  });

  it('should accept valid kebab-case id', () => {
    const manifest = makeManifest({ id: 'my-cool-mod' });
    expect(() => formatModManifest(manifest)).not.toThrow();
  });

  it('should accept numeric-only id', () => {
    const manifest = makeManifest({ id: '123' });
    expect(() => formatModManifest(manifest)).not.toThrow();
  });

  it('should throw for null input', () => {
    expect(() => formatModManifest(null as any)).toThrow();
  });

  it('should throw for undefined input', () => {
    expect(() => formatModManifest(undefined as any)).toThrow();
  });
});

describe('validateFormattedModManifest', () => {
  it('should return true for valid manifest JSON', () => {
    const formatted = formatModManifest(makeManifest());
    expect(validateFormattedModManifest(formatted)).toBe(true);
  });

  it('should return true for compact JSON', () => {
    const formatted = formatModManifest(makeManifest(), false);
    expect(validateFormattedModManifest(formatted)).toBe(true);
  });

  it('should return false for invalid JSON string', () => {
    expect(validateFormattedModManifest('not json')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateFormattedModManifest('')).toBe(false);
  });

  it('should return false for null input', () => {
    expect(validateFormattedModManifest(null as any)).toBe(false);
  });

  it('should return false when required fields are missing', () => {
    const incomplete = JSON.stringify({ id: 'test', name: 'Test' });
    expect(validateFormattedModManifest(incomplete)).toBe(false);
  });

  it('should return false for non-string required fields', () => {
    const bad = JSON.stringify({ id: 123, name: 'Test', version: '1.0.0', author: 'A', description: 'D', entry: './x.js' });
    expect(validateFormattedModManifest(bad)).toBe(false);
  });

  it('should return false when entry is missing', () => {
    const noEntry = JSON.stringify({ id: 'test', name: 'Test', version: '1.0.0', author: 'A', description: 'D' });
    expect(validateFormattedModManifest(noEntry)).toBe(false);
  });
});
