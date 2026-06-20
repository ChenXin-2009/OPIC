/**
 * @module mod-manager/config/ConfigSchemaParser
 * @description 配置 Schema 解析器
 */

import { SchemaParseError, type JSONSchema } from './types';

/**
 * 配置 Schema 解析器
 * 
 * 解析 JSON Schema 为内部验证规则。
 */
export class ConfigSchemaParser {
  /**
   * 解析 Schema
   * 
   * @param schema - JSON Schema 对象
   * @returns 解析后的 Schema
   * @throws {SchemaParseError} 当 Schema 格式无效时抛出
   */
  static parse(schema: unknown): JSONSchema {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new SchemaParseError('Schema must be an object');
    }

    const s = schema as Record<string, unknown>;

    // 验证 type 字段
    if (s.type !== undefined) {
      const validTypes = ['string', 'number', 'boolean', 'object', 'array', 'null'];
      if (!validTypes.includes(s.type as string)) {
        throw new SchemaParseError(
          `Invalid type: ${s.type}. Must be one of: ${validTypes.join(', ')}`
        );
      }
    }

    // 验证数字约束
    if (s.minimum !== undefined && typeof s.minimum !== 'number') {
      throw new SchemaParseError('minimum must be a number');
    }

    if (s.maximum !== undefined && typeof s.maximum !== 'number') {
      throw new SchemaParseError('maximum must be a number');
    }

    if (s.minimum !== undefined && s.maximum !== undefined) {
      if (s.minimum > s.maximum) {
        throw new SchemaParseError('minimum must be less than or equal to maximum');
      }
    }

    // 验证字符串约束
    if (s.minLength !== undefined && typeof s.minLength !== 'number') {
      throw new SchemaParseError('minLength must be a number');
    }

    if (s.maxLength !== undefined && typeof s.maxLength !== 'number') {
      throw new SchemaParseError('maxLength must be a number');
    }

    if (s.pattern !== undefined && typeof s.pattern !== 'string') {
      throw new SchemaParseError('pattern must be a string');
    }

    // 验证数组约束
    if (s.minItems !== undefined && typeof s.minItems !== 'number') {
      throw new SchemaParseError('minItems must be a number');
    }

    if (s.maxItems !== undefined && typeof s.maxItems !== 'number') {
      throw new SchemaParseError('maxItems must be a number');
    }

    // 验证 enum
    if (s.enum !== undefined && !Array.isArray(s.enum)) {
      throw new SchemaParseError('enum must be an array');
    }

    // 验证 required
    if (s.required !== undefined) {
      if (!Array.isArray(s.required)) {
        throw new SchemaParseError('required must be an array');
      }
      for (const field of s.required) {
        if (typeof field !== 'string') {
          throw new SchemaParseError('required fields must be strings');
        }
      }
    }

    // 递归验证 properties
    if (s.properties !== undefined) {
      if (s.properties === null || typeof s.properties !== 'object' || Array.isArray(s.properties)) {
        throw new SchemaParseError('properties must be an object');
      }

      for (const [key, value] of Object.entries(s.properties)) {
        try {
          this.parse(value);
        } catch (error) {
          if (error instanceof SchemaParseError) {
            throw new SchemaParseError(
              `Invalid schema for property "${key}": ${error.message}`
            );
          }
          throw error;
        }
      }
    }

    // 递归验证 items
    if (s.items !== undefined) {
      try {
        this.parse(s.items);
      } catch (error) {
        if (error instanceof SchemaParseError) {
          throw new SchemaParseError(
            `Invalid schema for items: ${error.message}`
          );
        }
        throw error;
      }
    }

    return s as JSONSchema;
  }

  /**
   * 验证 Schema 格式（不抛出异常）
   * 
   * @param schema - JSON Schema 对象
   * @returns 是否有效
   */
  static isValid(schema: unknown): boolean {
    try {
      this.parse(schema);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取 Schema 的默认值
   * 
   * @param schema - JSON Schema 对象
   * @returns 默认值
   */
  static getDefaultValue(schema: JSONSchema): unknown {
    if (schema.default !== undefined) {
      return schema.default;
    }

    // 根据类型生成默认值
    switch (schema.type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return this.getDefaultObject(schema);
      case 'null':
        return null;
      default:
        return undefined;
    }
  }

  /**
   * 获取对象类型的默认值
   */
  private static getDefaultObject(schema: JSONSchema): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        obj[key] = this.getDefaultValue(propSchema);
      }
    }

    return obj;
  }

  /**
   * 获取 Schema 的所有字段路径
   * 
   * @param schema - JSON Schema 对象
   * @param prefix - 路径前缀
   * @returns 字段路径数组
   */
  static getFieldPaths(schema: JSONSchema, prefix: string = ''): string[] {
    const paths: string[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.push(path);

        // 递归处理嵌套对象
        if (propSchema.type === 'object') {
          paths.push(...this.getFieldPaths(propSchema, path));
        }
      }
    }

    return paths;
  }

  /**
   * 获取字段的 Schema
   * 
   * @param schema - 根 Schema
   * @param path - 字段路径 (如 "user.name")
   * @returns 字段 Schema 或 undefined
   */
  static getFieldSchema(schema: JSONSchema, path: string): JSONSchema | undefined {
    const parts = path.split('.');
    let current = schema;

    for (const part of parts) {
      if (current.type === 'object' && current.properties) {
        const next = current.properties[part];
        if (!next) {
          return undefined;
        }
        current = next;
      } else {
        return undefined;
      }
    }

    return current;
  }
}
