import { ConfigValidator } from '../ConfigValidator';
import type { JSONSchema } from '../types';

describe('ConfigValidator', () => {
  describe('validate', () => {
    it('should return valid for empty schema', () => {
      const result = ConfigValidator.validate({}, {});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for matching type', () => {
      const schema: JSONSchema = { type: 'string' };
      expect(ConfigValidator.validate('hello', schema).valid).toBe(true);
    });

    it('should return invalid for wrong type', () => {
      const schema: JSONSchema = { type: 'string' };
      const result = ConfigValidator.validate(123, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected type string');
    });
  });

  describe('type validation', () => {
    it('should validate string type', () => {
      expect(ConfigValidator.validate('test', { type: 'string' }).valid).toBe(true);
      expect(ConfigValidator.validate(123, { type: 'string' }).valid).toBe(false);
    });

    it('should validate number type', () => {
      expect(ConfigValidator.validate(42, { type: 'number' }).valid).toBe(true);
      expect(ConfigValidator.validate(NaN, { type: 'number' }).valid).toBe(false);
      expect(ConfigValidator.validate('42', { type: 'number' }).valid).toBe(false);
    });

    it('should validate boolean type', () => {
      expect(ConfigValidator.validate(true, { type: 'boolean' }).valid).toBe(true);
      expect(ConfigValidator.validate(false, { type: 'boolean' }).valid).toBe(true);
      expect(ConfigValidator.validate(1, { type: 'boolean' }).valid).toBe(false);
    });

    it('should validate array type', () => {
      expect(ConfigValidator.validate([], { type: 'array' }).valid).toBe(true);
      expect(ConfigValidator.validate([1, 2], { type: 'array' }).valid).toBe(true);
      expect(ConfigValidator.validate({}, { type: 'array' }).valid).toBe(false);
    });

    it('should validate object type', () => {
      expect(ConfigValidator.validate({}, { type: 'object' }).valid).toBe(true);
      expect(ConfigValidator.validate({ a: 1 }, { type: 'object' }).valid).toBe(true);
      expect(ConfigValidator.validate([], { type: 'object' }).valid).toBe(false);
      expect(ConfigValidator.validate(null, { type: 'object' }).valid).toBe(false);
    });

    it('should validate null type', () => {
      expect(ConfigValidator.validate(null, { type: 'null' }).valid).toBe(true);
      expect(ConfigValidator.validate(undefined, { type: 'null' }).valid).toBe(false);
    });
  });

  describe('string constraints', () => {
    it('should validate minLength', () => {
      const schema: JSONSchema = { type: 'string', minLength: 3 };
      expect(ConfigValidator.validate('abc', schema).valid).toBe(true);
      expect(ConfigValidator.validate('ab', schema).valid).toBe(false);
    });

    it('should validate maxLength', () => {
      const schema: JSONSchema = { type: 'string', maxLength: 3 };
      expect(ConfigValidator.validate('abc', schema).valid).toBe(true);
      expect(ConfigValidator.validate('abcd', schema).valid).toBe(false);
    });

    it('should validate pattern', () => {
      const schema: JSONSchema = { type: 'string', pattern: '^[a-z]+$' };
      expect(ConfigValidator.validate('hello', schema).valid).toBe(true);
      expect(ConfigValidator.validate('Hello', schema).valid).toBe(false);
    });

    it('should handle invalid regex pattern', () => {
      const schema: JSONSchema = { type: 'string', pattern: '[invalid' };
      const result = ConfigValidator.validate('test', schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid regex pattern');
    });
  });

  describe('number constraints', () => {
    it('should validate minimum', () => {
      const schema: JSONSchema = { type: 'number', minimum: 0 };
      expect(ConfigValidator.validate(0, schema).valid).toBe(true);
      expect(ConfigValidator.validate(5, schema).valid).toBe(true);
      expect(ConfigValidator.validate(-1, schema).valid).toBe(false);
    });

    it('should validate maximum', () => {
      const schema: JSONSchema = { type: 'number', maximum: 100 };
      expect(ConfigValidator.validate(100, schema).valid).toBe(true);
      expect(ConfigValidator.validate(101, schema).valid).toBe(false);
    });

    it('should validate multipleOf', () => {
      const schema: JSONSchema = { type: 'number', multipleOf: 5 };
      expect(ConfigValidator.validate(10, schema).valid).toBe(true);
      expect(ConfigValidator.validate(7, schema).valid).toBe(false);
    });
  });

  describe('array constraints', () => {
    it('should validate minItems', () => {
      const schema: JSONSchema = { type: 'array', minItems: 2 };
      expect(ConfigValidator.validate([1, 2], schema).valid).toBe(true);
      expect(ConfigValidator.validate([1], schema).valid).toBe(false);
    });

    it('should validate maxItems', () => {
      const schema: JSONSchema = { type: 'array', maxItems: 2 };
      expect(ConfigValidator.validate([1, 2], schema).valid).toBe(true);
      expect(ConfigValidator.validate([1, 2, 3], schema).valid).toBe(false);
    });

    it('should validate uniqueItems', () => {
      const schema: JSONSchema = { type: 'array', uniqueItems: true };
      expect(ConfigValidator.validate([1, 2, 3], schema).valid).toBe(true);
      expect(ConfigValidator.validate([1, 2, 1], schema).valid).toBe(false);
    });

    it('should validate items recursively', () => {
      const schema: JSONSchema = { type: 'array', items: { type: 'string' } };
      expect(ConfigValidator.validate(['a', 'b'], schema).valid).toBe(true);
      expect(ConfigValidator.validate(['a', 1], schema).valid).toBe(false);
    });
  });

  describe('object validation', () => {
    it('should validate required fields', () => {
      const schema: JSONSchema = {
        type: 'object',
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };
      expect(ConfigValidator.validate({ name: 'John', age: 30 }, schema).valid).toBe(true);
      const result = ConfigValidator.validate({ name: 'John' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe('age');
    });

    it('should validate properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      expect(ConfigValidator.validate({ name: 'John' }, schema).valid).toBe(true);
      expect(ConfigValidator.validate({ name: 123 }, schema).valid).toBe(false);
    });

    it('should validate additionalProperties', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: { a: { type: 'string' } },
        additionalProperties: false,
      };
      expect(ConfigValidator.validate({ a: 'hello' }, schema).valid).toBe(true);
      const result = ConfigValidator.validate({ a: 'hello', b: 'world' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe('b');
    });

    it('should handle nested object paths', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };
      const result = ConfigValidator.validate({ user: { name: 123 } }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe('user.name');
    });
  });

  describe('enum validation', () => {
    it('should validate enum values', () => {
      const schema: JSONSchema = { type: 'string', enum: ['a', 'b', 'c'] };
      expect(ConfigValidator.validate('a', schema).valid).toBe(true);
      expect(ConfigValidator.validate('d', schema).valid).toBe(false);
    });

    it('should validate enum without type', () => {
      const schema: JSONSchema = { enum: [1, 2, 3] };
      expect(ConfigValidator.validate(1, schema).valid).toBe(true);
      expect(ConfigValidator.validate(4, schema).valid).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return boolean', () => {
      expect(ConfigValidator.isValid('test', { type: 'string' })).toBe(true);
      expect(ConfigValidator.isValid(123, { type: 'string' })).toBe(false);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid config', () => {
      expect(() => ConfigValidator.validateOrThrow('test', { type: 'string' })).not.toThrow();
    });

    it('should throw ConfigValidationFailedError for invalid config', () => {
      expect(() => ConfigValidator.validateOrThrow(123, { type: 'string' })).toThrow();
    });
  });
});
