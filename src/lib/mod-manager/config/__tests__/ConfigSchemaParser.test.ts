import { ConfigSchemaParser } from '../ConfigSchemaParser';
import type { JSONSchema } from '../types';
import { SchemaParseError } from '../types';

describe('ConfigSchemaParser', () => {
  describe('parse', () => {
    it('should parse a valid schema', () => {
      const schema = { type: 'string' };
      const result = ConfigSchemaParser.parse(schema);
      expect(result.type).toBe('string');
    });

    it('should throw for non-object input', () => {
      expect(() => ConfigSchemaParser.parse(null)).toThrow(SchemaParseError);
      expect(() => ConfigSchemaParser.parse(undefined)).toThrow(SchemaParseError);
      expect(() => ConfigSchemaParser.parse('string')).toThrow(SchemaParseError);
      expect(() => ConfigSchemaParser.parse(123)).toThrow(SchemaParseError);
    });

    it('should throw for array input', () => {
      expect(() => ConfigSchemaParser.parse([])).toThrow(SchemaParseError);
    });

    it('should accept all valid types', () => {
      const validTypes = ['string', 'number', 'boolean', 'object', 'array', 'null'];
      for (const type of validTypes) {
        expect(() => ConfigSchemaParser.parse({ type })).not.toThrow();
      }
    });

    it('should throw for invalid type', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'invalid' })).toThrow(SchemaParseError);
    });
  });

  describe('numeric constraints parsing', () => {
    it('should accept valid minimum', () => {
      const result = ConfigSchemaParser.parse({ type: 'number', minimum: 0 });
      expect(result.minimum).toBe(0);
    });

    it('should throw for non-number minimum', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'number', minimum: '0' })).toThrow(SchemaParseError);
    });

    it('should throw for non-number maximum', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'number', maximum: '10' })).toThrow(SchemaParseError);
    });

    it('should throw when minimum > maximum', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'number', minimum: 10, maximum: 5 })).toThrow(SchemaParseError);
    });

    it('should accept minimum equals maximum', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'number', minimum: 5, maximum: 5 })).not.toThrow();
    });
  });

  describe('string constraints parsing', () => {
    it('should throw for non-number minLength', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'string', minLength: '1' })).toThrow(SchemaParseError);
    });

    it('should throw for non-number maxLength', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'string', maxLength: '10' })).toThrow(SchemaParseError);
    });

    it('should throw for non-string pattern', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'string', pattern: 123 })).toThrow(SchemaParseError);
    });

    it('should accept valid string constraints', () => {
      const result = ConfigSchemaParser.parse({ type: 'string', minLength: 1, maxLength: 10, pattern: '^[a-z]+$' });
      expect(result.minLength).toBe(1);
      expect(result.maxLength).toBe(10);
      expect(result.pattern).toBe('^[a-z]+$');
    });
  });

  describe('array constraints parsing', () => {
    it('should throw for non-number minItems', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'array', minItems: '1' })).toThrow(SchemaParseError);
    });

    it('should throw for non-number maxItems', () => {
      expect(() => ConfigSchemaParser.parse({ type: 'array', maxItems: '10' })).toThrow(SchemaParseError);
    });

    it('should accept valid array constraints', () => {
      const result = ConfigSchemaParser.parse({ type: 'array', minItems: 1, maxItems: 5 });
      expect(result.minItems).toBe(1);
      expect(result.maxItems).toBe(5);
    });
  });

  describe('enum parsing', () => {
    it('should throw for non-array enum', () => {
      expect(() => ConfigSchemaParser.parse({ enum: 'invalid' })).toThrow(SchemaParseError);
    });

    it('should accept valid enum', () => {
      const result = ConfigSchemaParser.parse({ type: 'string', enum: ['a', 'b', 'c'] });
      expect(result.enum).toEqual(['a', 'b', 'c']);
    });
  });

  describe('required parsing', () => {
    it('should throw for non-array required', () => {
      expect(() => ConfigSchemaParser.parse({ required: 'field' })).toThrow(SchemaParseError);
    });

    it('should throw for non-string required fields', () => {
      expect(() => ConfigSchemaParser.parse({ required: [123] })).toThrow(SchemaParseError);
    });

    it('should accept valid required', () => {
      const result = ConfigSchemaParser.parse({ type: 'object', required: ['name', 'age'] });
      expect(result.required).toEqual(['name', 'age']);
    });
  });

  describe('properties parsing', () => {
    it('should throw for non-object properties', () => {
      expect(() => ConfigSchemaParser.parse({ properties: 'invalid' })).toThrow(SchemaParseError);
    });

    it('should throw for array properties', () => {
      expect(() => ConfigSchemaParser.parse({ properties: [] })).toThrow(SchemaParseError);
    });

    it('should recursively validate property schemas', () => {
      expect(() =>
        ConfigSchemaParser.parse({
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        })
      ).not.toThrow();
    });

    it('should throw for invalid nested property schema', () => {
      expect(() =>
        ConfigSchemaParser.parse({
          type: 'object',
          properties: {
            name: { type: 'invalid' },
          },
        })
      ).toThrow(SchemaParseError);
    });
  });

  describe('items parsing', () => {
    it('should recursively validate items schema', () => {
      const result = ConfigSchemaParser.parse({ type: 'array', items: { type: 'string' } });
      expect(result.items?.type).toBe('string');
    });

    it('should throw for invalid items schema', () => {
      expect(() =>
        ConfigSchemaParser.parse({ type: 'array', items: { type: 'invalid' } })
      ).toThrow(SchemaParseError);
    });
  });

  describe('isValid', () => {
    it('should return true for valid schema', () => {
      expect(ConfigSchemaParser.isValid({ type: 'string' })).toBe(true);
    });

    it('should return false for invalid schema', () => {
      expect(ConfigSchemaParser.isValid({ type: 'invalid' })).toBe(false);
    });

    it('should return false for null input', () => {
      expect(ConfigSchemaParser.isValid(null)).toBe(false);
    });
  });

  describe('getDefaultValue', () => {
    it('should return explicit default when provided', () => {
      const schema: JSONSchema = { type: 'string', default: 'hello' };
      expect(ConfigSchemaParser.getDefaultValue(schema)).toBe('hello');
    });

    it('should return empty string for string type', () => {
      expect(ConfigSchemaParser.getDefaultValue({ type: 'string' })).toBe('');
    });

    it('should return 0 for number type', () => {
      expect(ConfigSchemaParser.getDefaultValue({ type: 'number' })).toBe(0);
    });

    it('should return false for boolean type', () => {
      expect(ConfigSchemaParser.getDefaultValue({ type: 'boolean' })).toBe(false);
    });

    it('should return empty array for array type', () => {
      expect(ConfigSchemaParser.getDefaultValue({ type: 'array' })).toEqual([]);
    });

    it('should return null for null type', () => {
      expect(ConfigSchemaParser.getDefaultValue({ type: 'null' })).toBeNull();
    });

    it('should return empty object for object type', () => {
      expect(ConfigSchemaParser.getDefaultValue({ type: 'object' })).toEqual({});
    });

    it('should return undefined for unknown type', () => {
      expect(ConfigSchemaParser.getDefaultValue({})).toBeUndefined();
    });

    it('should recursively compute defaults for object properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' },
        },
      };
      expect(ConfigSchemaParser.getDefaultValue(schema)).toEqual({ name: '', count: 0 });
    });
  });

  describe('getFieldPaths', () => {
    it('should return empty array for non-object schema', () => {
      expect(ConfigSchemaParser.getFieldPaths({ type: 'string' })).toEqual([]);
    });

    it('should return field paths for flat object', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };
      expect(ConfigSchemaParser.getFieldPaths(schema)).toEqual(['name', 'age']);
    });

    it('should return nested field paths', () => {
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
      expect(ConfigSchemaParser.getFieldPaths(schema)).toEqual(['user', 'user.name']);
    });

    it('should use prefix', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      expect(ConfigSchemaParser.getFieldPaths(schema, 'config')).toEqual(['config.name']);
    });
  });

  describe('getFieldSchema', () => {
    it('should return schema for existing field', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      expect(ConfigSchemaParser.getFieldSchema(schema, 'name')).toEqual({ type: 'string' });
    });

    it('should return nested schema', () => {
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
      expect(ConfigSchemaParser.getFieldSchema(schema, 'user.name')).toEqual({ type: 'string' });
    });

    it('should return undefined for missing field', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      expect(ConfigSchemaParser.getFieldSchema(schema, 'missing')).toBeUndefined();
    });

    it('should return undefined for non-object schema', () => {
      expect(ConfigSchemaParser.getFieldSchema({ type: 'string' }, 'name')).toBeUndefined();
    });

    it('should return undefined for non-object nested path', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      expect(ConfigSchemaParser.getFieldSchema(schema, 'name.extra')).toBeUndefined();
    });
  });
});
