import {
  formatConfig,
  validateFormattedConfig,
  formatConfigWithComments,
  compareConfigs,
  ConfigFormatterError,
} from '../config-formatter';

describe('ConfigFormatterError', () => {
  it('should be an instance of Error', () => {
    const err = new ConfigFormatterError('test', 'field', 'value');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConfigFormatterError);
    expect(err.name).toBe('ConfigFormatterError');
    expect(err.field).toBe('field');
    expect(err.value).toBe('value');
  });

  it('should allow optional field and value', () => {
    const err = new ConfigFormatterError('msg');
    expect(err.field).toBeUndefined();
    expect(err.value).toBeUndefined();
  });
});

describe('formatConfig', () => {
  it('should format a valid config to pretty JSON', () => {
    const config = { apiUrl: 'https://api.example.com', timeout: 5000 };
    const result = formatConfig(config);
    const parsed = JSON.parse(result);
    expect(parsed.apiUrl).toBe('https://api.example.com');
    expect(parsed.timeout).toBe(5000);
  });

  it('should format to compact JSON when pretty is false', () => {
    const config = { key: 'value' };
    const result = formatConfig(config, false);
    expect(result).not.toContain('\n');
  });

  it('should handle nested objects', () => {
    const config = { features: { enableMods: true, nested: { a: 1 } } };
    const result = formatConfig(config);
    const parsed = JSON.parse(result);
    expect(parsed.features.enableMods).toBe(true);
    expect(parsed.features.nested.a).toBe(1);
  });

  it('should handle arrays', () => {
    const config = { items: [1, 2, 3] };
    const result = formatConfig(config);
    const parsed = JSON.parse(result);
    expect(parsed.items).toEqual([1, 2, 3]);
  });

  it('should handle empty object', () => {
    const result = formatConfig({});
    expect(result).toBe('{}');
  });

  it('should handle null values in config', () => {
    const config = { a: null, b: 'hello' };
    const result = formatConfig(config);
    const parsed = JSON.parse(result);
    expect(parsed.a).toBeNull();
    expect(parsed.b).toBe('hello');
  });

  it('should handle boolean values', () => {
    const config = { flag: true, other: false };
    const result = formatConfig(config);
    const parsed = JSON.parse(result);
    expect(parsed.flag).toBe(true);
    expect(parsed.other).toBe(false);
  });

  it('should throw for null input', () => {
    expect(() => formatConfig(null as any)).toThrow(ConfigFormatterError);
    expect(() => formatConfig(null as any)).toThrow('Config must be an object');
  });

  it('should throw for undefined input', () => {
    expect(() => formatConfig(undefined as any)).toThrow('Config must be an object');
  });

  it('should throw for non-object input', () => {
    expect(() => formatConfig('string' as any)).toThrow('Config must be an object');
    expect(() => formatConfig(123 as any)).toThrow('Config must be an object');
  });

  it('should throw for function values', () => {
    const config = { fn: () => {} };
    expect(() => formatConfig(config)).toThrow('Config cannot contain functions');
  });

  it('should throw for circular references', () => {
    const config: Record<string, unknown> = { a: 1 };
    config.self = config;
    expect(() => formatConfig(config)).toThrow();
  });

  it('should detect circular references in nested objects', () => {
    const inner: Record<string, unknown> = {};
    const config = { nested: inner };
    inner.parent = config;
    expect(() => formatConfig(config)).toThrow();
  });

  it('should detect circular references in arrays', () => {
    const config: Record<string, unknown> = { items: [] };
    (config.items as unknown[]).push(config);
    expect(() => formatConfig(config)).toThrow();
  });
});

describe('validateFormattedConfig', () => {
  it('should return true for valid JSON object', () => {
    expect(validateFormattedConfig('{"key":"value"}')).toBe(true);
  });

  it('should return true for formatted JSON', () => {
    const formatted = formatConfig({ a: 1 });
    expect(validateFormattedConfig(formatted)).toBe(true);
  });

  it('should return true for empty object JSON', () => {
    expect(validateFormattedConfig('{}')).toBe(true);
  });

  it('should return false for invalid JSON', () => {
    expect(validateFormattedConfig('not json')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateFormattedConfig('')).toBe(false);
  });

  it('should return false for null input', () => {
    expect(validateFormattedConfig(null as any)).toBe(false);
  });

  it('should return true for JSON array (typeof object check passes)', () => {
    expect(validateFormattedConfig('[1, 2, 3]')).toBe(true);
  });

  it('should return false for JSON primitive', () => {
    expect(validateFormattedConfig('"string"')).toBe(false);
    expect(validateFormattedConfig('123')).toBe(false);
    expect(validateFormattedConfig('true')).toBe(false);
  });
});

describe('formatConfigWithComments', () => {
  it('should add _comments field to the output', () => {
    const config = { apiUrl: 'https://api.example.com' };
    const comments = { apiUrl: 'The API endpoint URL' };
    const result = formatConfigWithComments(config, comments);
    const parsed = JSON.parse(result);
    expect(parsed._comments).toEqual(comments);
    expect(parsed.apiUrl).toBe('https://api.example.com');
  });

  it('should include config fields alongside comments', () => {
    const config = { a: 1, b: 2 };
    const comments = { a: 'First value' };
    const result = formatConfigWithComments(config, comments);
    const parsed = JSON.parse(result);
    expect(parsed.a).toBe(1);
    expect(parsed.b).toBe(2);
    expect(parsed._comments).toEqual(comments);
  });

  it('should produce compact output when pretty is false', () => {
    const result = formatConfigWithComments({ x: 1 }, {}, false);
    expect(result).not.toContain('\n');
  });

  it('should handle null config input gracefully (spreads into empty object)', () => {
    const result = formatConfigWithComments(null as any, {});
    const parsed = JSON.parse(result);
    expect(parsed._comments).toEqual({});
  });
});

describe('compareConfigs', () => {
  it('should return empty diff for identical configs', () => {
    const config = { a: 1, b: 'hello' };
    const diff = compareConfigs(config, { ...config });
    expect(diff).toEqual({ added: [], removed: [], modified: [] });
  });

  it('should detect added keys', () => {
    const diff = compareConfigs({ a: 1 }, { a: 1, b: 2 });
    expect(diff.added).toEqual(['b']);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it('should detect removed keys', () => {
    const diff = compareConfigs({ a: 1, b: 2 }, { a: 1 });
    expect(diff.removed).toEqual(['b']);
    expect(diff.added).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it('should detect modified values', () => {
    const diff = compareConfigs({ a: 1 }, { a: 2 });
    expect(diff.modified).toEqual(['a']);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('should detect nested value changes via JSON.stringify', () => {
    const diff = compareConfigs({ a: { x: 1 } }, { a: { x: 2 } });
    expect(diff.modified).toEqual(['a']);
  });

  it('should return all three diff types at once', () => {
    const diff = compareConfigs({ a: 1, b: 2 }, { a: 1, c: 3 });
    expect(diff.removed).toEqual(['b']);
    expect(diff.added).toEqual(['c']);
    expect(diff.modified).toEqual([]);
  });

  it('should handle empty objects', () => {
    const diff = compareConfigs({}, {});
    expect(diff).toEqual({ added: [], removed: [], modified: [] });
  });

  it('should handle array value changes', () => {
    const diff = compareConfigs({ items: [1, 2] }, { items: [1, 2, 3] });
    expect(diff.modified).toEqual(['items']);
  });

  it('should treat identical arrays as unchanged', () => {
    const diff = compareConfigs({ items: [1, 2] }, { items: [1, 2] });
    expect(diff.modified).toEqual([]);
  });
});
