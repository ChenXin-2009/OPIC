import {
  parseJSDoc,
  isValidTagOrder,
  isPrimarilyChinese,
  validateModuleComment,
  validateFunctionComment,
  validateAstronomyFunctionComment,
  validateTypeComment,
} from '../validator';

describe('parseJSDoc', () => {
  it('should return null for non-JSDoc comments', () => {
    expect(parseJSDoc('// regular comment')).toBeNull();
    expect(parseJSDoc('/* block */')).toBeNull();
    expect(parseJSDoc('')).toBeNull();
  });

  it('should parse a simple JSDoc comment', () => {
    const result = parseJSDoc('/** Hello world */');
    expect(result).not.toBeNull();
    expect(result!.description).toBe('Hello world');
    expect(result!.tags).toEqual([]);
  });

  it('should parse JSDoc with tags', () => {
    const comment = `/**
 * My function
 * @param {string} name - The name
 * @returns {void}
 */`;
    const result = parseJSDoc(comment);
    expect(result!.description).toBe('My function');
    expect(result!.tags.length).toBe(2);
    expect(result!.tags[0].name).toBe('param');
    expect(result!.tags[1].name).toBe('returns');
  });

  it('should handle multi-line tag content', () => {
    const comment = `/**
 * @description This is a
 * multi-line description
 */`;
    const result = parseJSDoc(comment);
    const descTag = result!.tags.find(t => t.name === 'description');
    expect(descTag).toBeDefined();
    expect(descTag!.content).toContain('multi-line');
  });
});

describe('isValidTagOrder', () => {
  it('should return true for correctly ordered tags', () => {
    const tags = [
      { name: 'description', content: 'desc', lineNumber: 1 },
      { name: 'param', content: 'p', lineNumber: 2 },
      { name: 'returns', content: 'r', lineNumber: 3 },
    ];
    expect(isValidTagOrder(tags)).toBe(true);
  });

  it('should return false for incorrectly ordered tags', () => {
    const tags = [
      { name: 'returns', content: 'r', lineNumber: 1 },
      { name: 'param', content: 'p', lineNumber: 2 },
    ];
    expect(isValidTagOrder(tags)).toBe(false);
  });

  it('should skip unknown tags', () => {
    const tags = [
      { name: 'custom', content: 'c', lineNumber: 1 },
      { name: 'param', content: 'p', lineNumber: 2 },
    ];
    expect(isValidTagOrder(tags)).toBe(true);
  });

  it('should return true for empty tags', () => {
    expect(isValidTagOrder([])).toBe(true);
  });
});

describe('isPrimarilyChinese', () => {
  it('should return true for Chinese text', () => {
    expect(isPrimarilyChinese('这是一个测试')).toBe(true);
  });

  it('should return false for English text', () => {
    expect(isPrimarilyChinese('Hello world')).toBe(false);
  });

  it('should return false for empty text', () => {
    expect(isPrimarilyChinese('')).toBe(false);
    expect(isPrimarilyChinese('   ')).toBe(false);
  });

  it('should respect custom threshold', () => {
    expect(isPrimarilyChinese('你好', 0.3)).toBe(true);
    expect(isPrimarilyChinese('Hello 你好', 0.5)).toBe(false);
  });
});

describe('validateModuleComment', () => {
  it('should pass for complete module comment', () => {
    const parsed = parseJSDoc(`/**
 * @module test
 * @description A test module
 * @architecture layer
 * @dependencies none
 */`)!;
    const result = validateModuleComment(parsed);
    expect(result.valid).toBe(true);
  });

  it('should report errors for missing required tags', () => {
    const parsed = parseJSDoc('/** Just a comment */')!;
    const result = validateModuleComment(parsed);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should warn for non-Chinese description', () => {
    const parsed = parseJSDoc(`/**
 * Module description in English
 * @module test
 * @description A module
 * @architecture layer
 * @dependencies none
 */`)!;
    const result = validateModuleComment(parsed);
    expect(result.warnings.some(w => w.includes('中文'))).toBe(true);
  });
});

describe('validateFunctionComment', () => {
  it('should pass for complete function comment', () => {
    const parsed = parseJSDoc(`/**
 * My function
 * @param {string} name - name
 * @returns {void}
 */`)!;
    const result = validateFunctionComment(parsed, 1);
    expect(result.valid).toBe(true);
  });

  it('should report error for missing description', () => {
    const parsed = parseJSDoc('/** @param {string} x */')!;
    const result = validateFunctionComment(parsed, 1);
    expect(result.errors.some(e => e.includes('描述'))).toBe(true);
  });

  it('should report error for param count mismatch', () => {
    const parsed = parseJSDoc(`/**
 * My fn
 * @param {string} a
 * @param {number} b
 */`)!;
    const result = validateFunctionComment(parsed, 3);
    expect(result.errors.some(e => e.includes('参数'))).toBe(true);
  });

  it('should warn about missing @returns', () => {
    const parsed = parseJSDoc(`/**
 * My fn
 * @param {string} x
 */`)!;
    const result = validateFunctionComment(parsed, 1);
    expect(result.warnings.some(w => w.includes('returns'))).toBe(true);
  });
});

describe('validateAstronomyFunctionComment', () => {
  it('should pass with all astronomy tags', () => {
    const parsed = parseJSDoc(`/**
 * Calc
 * @coordinateSystem ECI
 * @unit km
 * @precision 1e-6
 */`)!;
    const result = validateAstronomyFunctionComment(parsed);
    expect(result.valid).toBe(true);
  });

  it('should fail when missing astronomy tags', () => {
    const parsed = parseJSDoc('/** Just a comment */')!;
    const result = validateAstronomyFunctionComment(parsed);
    expect(result.valid).toBe(false);
  });
});

describe('validateTypeComment', () => {
  it('should pass with description', () => {
    const parsed = parseJSDoc('/** Type definition for X */')!;
    const result = validateTypeComment(parsed);
    expect(result.valid).toBe(true);
  });

  it('should fail without description', () => {
    const parsed = parseJSDoc('/** @deprecated old type */')!;
    const result = validateTypeComment(parsed);
    expect(result.valid).toBe(false);
  });
});
