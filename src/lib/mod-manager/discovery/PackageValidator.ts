/**
 * MOD 包验证器
 * 验证包的完整性、签名、清单和依赖
 */

import type { ModManifest } from '../types';
import type { ModPackageFile, PackageValidationResult } from './types';
import { validateManifest } from '../utils/validateManifest';

export class PackageValidator {
  private readonly maxPackageSize: number;

  constructor(maxPackageSize: number = 10 * 1024 * 1024) { // 默认10MB
    this.maxPackageSize = maxPackageSize;
  }

  /**
   * 验证MOD包的完整性
   */
  validatePackage(
    packageInfo: ModPackageFile,
    manifest: ModManifest,
    packageData?: ArrayBuffer
  ): PackageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 验证包大小
    if (packageInfo.size && packageInfo.size > this.maxPackageSize) {
      errors.push(
        `包大小 ${this.formatBytes(packageInfo.size)} 超过限制 ${this.formatBytes(this.maxPackageSize)}`
      );
    }

    // 2. 验证必需字段
    if (!packageInfo.id) {
      errors.push('包缺少 id 字段');
    }
    if (!packageInfo.name) {
      errors.push('包缺少 name 字段');
    }
    if (!packageInfo.version) {
      errors.push('包缺少 version 字段');
    }
    if (!packageInfo.apiVersion) {
      errors.push('包缺少 apiVersion 字段');
    }

    // 3. 验证版本格式（语义化版本）
    if (packageInfo.version && !this.isValidSemver(packageInfo.version)) {
      errors.push(`版本号 "${packageInfo.version}" 不符合语义化版本规范`);
    }
    if (packageInfo.apiVersion && !this.isValidSemver(packageInfo.apiVersion)) {
      errors.push(`API版本号 "${packageInfo.apiVersion}" 不符合语义化版本规范`);
    }

    // 4. 验证清单
    const manifestValidation = validateManifest(manifest);
    if (!manifestValidation.valid) {
      errors.push(...manifestValidation.errors.map(e => `清单验证失败: ${e}`));
    }

    // 5. 验证包信息与清单一致性
    if (packageInfo.id !== manifest.id) {
      errors.push(`包ID "${packageInfo.id}" 与清单ID "${manifest.id}" 不一致`);
    }
    if (packageInfo.version !== manifest.version) {
      errors.push(`包版本 "${packageInfo.version}" 与清单版本 "${manifest.version}" 不一致`);
    }

    // 6. 验证哈希值（如果提供了包数据）
    if (packageData && packageInfo.hash) {
      const calculatedHash = this.calculateHash(packageData);
      if (calculatedHash !== packageInfo.hash) {
        errors.push('包哈希值验证失败，文件可能已损坏');
      }
    }

    // 7. 验证依赖格式
    if (packageInfo.dependencies) {
      for (const [depId, depVersion] of Object.entries(packageInfo.dependencies)) {
        if (!this.isValidSemverRange(depVersion)) {
          errors.push(`依赖 "${depId}" 的版本范围 "${depVersion}" 格式无效`);
        }
      }
    }

    // 8. 警告：缺少可选字段
    if (!packageInfo.description) {
      warnings.push('建议添加 description 字段');
    }
    if (!packageInfo.author) {
      warnings.push('建议添加 author 字段');
    }
    if (!packageInfo.license) {
      warnings.push('建议添加 license 字段');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证数字签名
   */
  async verifySignature(
    _packageData: ArrayBuffer,
    _signature: string,
    _publicKey: string
  ): Promise<boolean> {
    try {
      // TODO: 实现真实的签名验证
      // 这里需要使用 Web Crypto API 或类似的加密库
      // 示例实现：
      // const key = await crypto.subtle.importKey(...);
      // const isValid = await crypto.subtle.verify(...);
      
      console.warn('[PackageValidator] 签名验证功能尚未实现');
      return true; // 临时返回true
    } catch (error) {
      console.error('[PackageValidator] 签名验证失败:', error);
      return false;
    }
  }

  /**
   * 验证语义化版本格式
   */
  private isValidSemver(version: string): boolean {
    // 语义化版本格式: major.minor.patch[-prerelease][+build]
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  /**
   * 验证语义化版本范围格式
   */
  private isValidSemverRange(range: string): boolean {
    // 支持的范围格式: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, *
    const rangeRegex = /^(\^|~|>=|<=|>|<)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$|^\*$/;
    return rangeRegex.test(range);
  }

  /**
   * 计算数据的哈希值
   */
  private calculateHash(_data: ArrayBuffer): string {
    // TODO: 实现真实的哈希计算
    // 使用 Web Crypto API 的 SHA-256
    // 示例实现：
    // const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    // return Array.from(new Uint8Array(hashBuffer))
    //   .map(b => b.toString(16).padStart(2, '0'))
    //   .join('');
    
    console.warn('[PackageValidator] 哈希计算功能尚未实现');
    return ''; // 临时返回空字符串
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / (k ** i) * 100) / 100 + ' ' + sizes[i];
  }
}

// 单例
let validatorInstance: PackageValidator | null = null;

export function getPackageValidator(): PackageValidator {
  if (!validatorInstance) {
    validatorInstance = new PackageValidator();
  }
  return validatorInstance;
}
