/**
 * @module mod-manager/utils/validateManifest
 * @description MOD清单验证工具
 */

import type {
  ModManifest,
  ManifestValidationResult,
  ManifestValidationError,
} from '../types';

/**
 * 验证MOD清单
 */
export function validateManifest(manifest: unknown): ManifestValidationResult {
  const errors: ManifestValidationError[] = [];

  // 检查是否为对象
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      valid: false,
      errors: [{ field: 'root', message: '清单必须是一个对象' }],
    };
  }

  const m = manifest as Record<string, unknown>;

  // 验证必需字段
  validateRequiredField(m, 'id', 'string', errors);
  validateRequiredField(m, 'version', 'string', errors);
  validateRequiredField(m, 'name', 'string', errors);
  validateRequiredField(m, 'entryPoint', 'string', errors);

  // 如果有错误，提前返回
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 验证字段格式
  validateIdFormat(m.id as string, errors);
  validateVersionFormat(m.version as string, errors);

  // 验证可选字段
  if (m.description !== undefined) {
    validateFieldType(m, 'description', 'string', errors);
  }

  if (m.author !== undefined) {
    validateFieldType(m, 'author', 'string', errors);
  }

  if (m.apiVersion !== undefined) {
    validateFieldType(m, 'apiVersion', 'string', errors);
    if (typeof m.apiVersion === 'string') {
      validateVersionFormat(m.apiVersion, errors, 'apiVersion');
    }
  }

  if (m.dependencies !== undefined) {
    validateDependencies(m.dependencies, errors);
  }

  if (m.capabilities !== undefined) {
    validateCapabilities(m.capabilities, errors);
  }

  if (m.hasConfig !== undefined) {
    validateFieldType(m, 'hasConfig', 'boolean', errors);
  }

  if (m.defaultEnabled !== undefined) {
    validateFieldType(m, 'defaultEnabled', 'boolean', errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证必需字段存在且类型正确
 */
function validateRequiredField(
  manifest: Record<string, unknown>,
  field: string,
  expectedType: string,
  errors: ManifestValidationError[]
): void {
  if (manifest[field] === undefined) {
    errors.push({
      field,
      message: `缺少必需字段 "${field}"`,
    });
    return;
  }

  validateFieldType(manifest, field, expectedType, errors);
}

/**
 * 验证字段类型
 */
function validateFieldType(
  manifest: Record<string, unknown>,
  field: string,
  expectedType: string,
  errors: ManifestValidationError[]
): void {
  const value = manifest[field];
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (actualType !== expectedType) {
    errors.push({
      field,
      message: `字段 "${field}" 类型错误，期望 ${expectedType}，实际 ${actualType}`,
      value,
    });
  }
}

/**
 * 验证ID格式（kebab-case）
 */
function validateIdFormat(id: string, errors: ManifestValidationError[]): void {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    errors.push({
      field: 'id',
      message: 'ID必须使用kebab-case格式（小写字母、数字和连字符，以字母开头）',
      value: id,
    });
  }

  if (id.length > 100) {
    errors.push({
      field: 'id',
      message: 'ID长度不能超过100个字符',
      value: id,
    });
  }
}

/**
 * 验证版本格式（语义化版本）
 */
function validateVersionFormat(
  version: string,
  errors: ManifestValidationError[],
  field: string = 'version'
): void {
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version)) {
    errors.push({
      field,
      message: `${field}必须遵循语义化版本格式 (major.minor.patch)`,
      value: version,
    });
  }
}

/**
 * 验证依赖数组
 */
function validateDependencies(
  dependencies: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(dependencies)) {
    errors.push({
      field: 'dependencies',
      message: 'dependencies必须是一个数组',
      value: dependencies,
    });
    return;
  }

  dependencies.forEach((dep, index) => {
    if (!dep || typeof dep !== 'object') {
      errors.push({
        field: `dependencies[${index}]`,
        message: '依赖必须是一个对象',
        value: dep,
      });
      return;
    }

    const d = dep as Record<string, unknown>;

    if (typeof d.id !== 'string') {
      errors.push({
        field: `dependencies[${index}].id`,
        message: '依赖ID必须是字符串',
        value: d.id,
      });
    }

    if (d.optional !== undefined && typeof d.optional !== 'boolean') {
      errors.push({
        field: `dependencies[${index}].optional`,
        message: 'optional必须是布尔值',
        value: d.optional,
      });
    }
  });
}

/**
 * 验证能力数组
 */
function validateCapabilities(
  capabilities: unknown,
  errors: ManifestValidationError[]
): void {
  if (!Array.isArray(capabilities)) {
    errors.push({
      field: 'capabilities',
      message: 'capabilities必须是一个数组',
      value: capabilities,
    });
    return;
  }

  capabilities.forEach((cap, index) => {
    if (!cap || typeof cap !== 'object') {
      errors.push({
        field: `capabilities[${index}]`,
        message: '能力必须是一个对象',
        value: cap,
      });
      return;
    }

    const c = cap as Record<string, unknown>;

    if (typeof c.name !== 'string') {
      errors.push({
        field: `capabilities[${index}].name`,
        message: '能力名称必须是字符串',
        value: c.name,
      });
    }

    if (c.required !== undefined && typeof c.required !== 'boolean') {
      errors.push({
        field: `capabilities[${index}].required`,
        message: 'required必须是布尔值',
        value: c.required,
      });
    }
  });
}

/**
 * 快速检查清单是否有效（不返回详细错误）
 */
export function isValidManifest(manifest: unknown): manifest is ModManifest {
  return validateManifest(manifest).valid;
}