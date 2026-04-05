/**
 * @module mod-manager/error/ModError
 * @description MOD管理器错误类型定义
 */

import type { ModErrorType } from '../types';

/**
 * MOD错误基类
 */
export class ModError extends Error {
  public type: ModErrorType;
  public modId: string;
  public override cause?: Error;

  constructor(
    type: ModErrorType,
    modId: string,
    message: string,
    cause?: Error
  ) {
    super(`[${type}] MOD ${modId}: ${message}`);
    this.name = 'ModError';
    this.type = type;
    this.modId = modId;
    this.cause = cause;
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends ModError {
  constructor(modId: string, public cycles: string[][]) {
    super(
      'circular_dependency',
      modId,
      `检测到循环依赖: ${cycles.map(c => c.join(' → ')).join('; ')}`
    );
    this.name = 'CircularDependencyError';
  }
}

/**
 * 版本不匹配错误
 */
export class VersionMismatchError extends ModError {
  constructor(modId: string, public required: string, public current: string) {
    super(
      'version_mismatch',
      modId,
      `需要API版本 ${required}，当前版本 ${current}`
    );
    this.name = 'VersionMismatchError';
  }
}

/**
 * 清单验证错误
 */
export class ManifestValidationError extends ModError {
  constructor(modId: string, public errors: Array<{ field: string; message: string }>) {
    super(
      'validation_error',
      modId,
      `清单验证失败: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`
    );
    this.name = 'ManifestValidationError';
  }
}

/**
 * 重复ID错误
 */
export class DuplicateIdError extends ModError {
  constructor(modId: string) {
    super('duplicate_id', modId, `MOD ID "${modId}" 已存在`);
    this.name = 'DuplicateIdError';
  }
}

/**
 * 缺失依赖错误
 */
export class MissingDependencyError extends ModError {
  constructor(modId: string, public missingDependencies: string[]) {
    super(
      'missing_dependency',
      modId,
      `缺失依赖: ${missingDependencies.join(', ')}`
    );
    this.name = 'MissingDependencyError';
  }
}

/**
 * 生命周期错误
 */
export class LifecycleError extends ModError {
  constructor(modId: string, public hook: string, cause?: Error) {
    super(
      'lifecycle_error',
      modId,
      `生命周期钩子 ${hook} 执行失败`,
      cause
    );
    this.name = 'LifecycleError';
  }
}

/**
 * 渲染错误
 */
export class RenderError extends ModError {
  constructor(modId: string, public rendererId: string, cause?: Error) {
    super(
      'render_error',
      modId,
      `渲染器 ${rendererId} 执行失败`,
      cause
    );
    this.name = 'RenderError';
  }
}

/**
 * API错误
 */
export class ApiError extends ModError {
  constructor(modId: string, public apiName: string, cause?: Error) {
    super(
      'api_error',
      modId,
      `API调用 ${apiName} 失败`,
      cause
    );
    this.name = 'ApiError';
  }
}