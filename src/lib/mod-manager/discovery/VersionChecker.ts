/**
 * 版本兼容性检查器
 * 检查MOD的API版本与系统版本的兼容性
 */

/**
 * 语义化版本结构
 */
interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * 版本兼容性检查结果
 */
export interface VersionCompatibility {
  /** 是否兼容 */
  compatible: boolean;
  /** MOD要求的API版本 */
  requiredVersion: string;
  /** 系统当前API版本 */
  currentVersion: string;
  /** 不兼容原因 */
  reason?: string;
  /** 警告信息 */
  warnings: string[];
}

export class VersionChecker {
  private readonly systemApiVersion: string;

  constructor(systemApiVersion: string = '1.0.0') {
    this.systemApiVersion = systemApiVersion;
  }

  /**
   * 检查MOD的API版本兼容性
   */
  checkCompatibility(modApiVersion: string): VersionCompatibility {
    const warnings: string[] = [];
    
    try {
      const required = this.parseVersion(modApiVersion);
      const current = this.parseVersion(this.systemApiVersion);

      // 规则1: major版本必须匹配
      if (required.major !== current.major) {
        return {
          compatible: false,
          requiredVersion: modApiVersion,
          currentVersion: this.systemApiVersion,
          reason: `MOD需要API v${required.major}.x.x，但系统提供的是 v${current.major}.x.x。主版本不兼容。`,
          warnings,
        };
      }

      // 规则2: minor版本向后兼容（系统版本 >= MOD要求版本）
      if (current.minor < required.minor) {
        return {
          compatible: false,
          requiredVersion: modApiVersion,
          currentVersion: this.systemApiVersion,
          reason: `MOD需要API v${required.major}.${required.minor}.x，但系统只提供 v${current.major}.${current.minor}.x。系统版本过低。`,
          warnings,
        };
      }

      // 规则3: 如果minor版本更高，给出警告
      if (current.minor > required.minor) {
        warnings.push(
          `MOD针对API v${modApiVersion}开发，当前系统版本为 v${this.systemApiVersion}。建议更新MOD以使用新特性。`
        );
      }

      // 规则4: patch版本向后兼容
      if (current.minor === required.minor && current.patch < required.patch) {
        warnings.push(
          `MOD需要API v${modApiVersion}，当前系统版本为 v${this.systemApiVersion}。可能缺少某些bug修复。`
        );
      }

      // 规则5: 预发布版本警告
      if (required.prerelease) {
        warnings.push(
          `MOD使用预发布版本的API (${modApiVersion})，可能不稳定。`
        );
      }

      return {
        compatible: true,
        requiredVersion: modApiVersion,
        currentVersion: this.systemApiVersion,
        warnings,
      };
    } catch (error) {
      return {
        compatible: false,
        requiredVersion: modApiVersion,
        currentVersion: this.systemApiVersion,
        reason: `版本号格式无效: ${error instanceof Error ? error.message : String(error)}`,
        warnings,
      };
    }
  }

  /**
   * 检查版本范围兼容性（用于依赖检查）
   */
  checkVersionRange(version: string, range: string): boolean {
    try {
      const ver = this.parseVersion(version);
      
      // 处理通配符
      if (range === '*') {
        return true;
      }

      // 处理范围前缀
      if (range.startsWith('^')) {
        // ^1.2.3 := >=1.2.3 <2.0.0
        const required = this.parseVersion(range.slice(1));
        return (
          ver.major === required.major &&
          (ver.minor > required.minor ||
            (ver.minor === required.minor && ver.patch >= required.patch))
        );
      }

      if (range.startsWith('~')) {
        // ~1.2.3 := >=1.2.3 <1.3.0
        const required = this.parseVersion(range.slice(1));
        return (
          ver.major === required.major &&
          ver.minor === required.minor &&
          ver.patch >= required.patch
        );
      }

      if (range.startsWith('>=')) {
        const required = this.parseVersion(range.slice(2));
        return this.compareVersions(ver, required) >= 0;
      }

      if (range.startsWith('<=')) {
        const required = this.parseVersion(range.slice(2));
        return this.compareVersions(ver, required) <= 0;
      }

      if (range.startsWith('>')) {
        const required = this.parseVersion(range.slice(1));
        return this.compareVersions(ver, required) > 0;
      }

      if (range.startsWith('<')) {
        const required = this.parseVersion(range.slice(1));
        return this.compareVersions(ver, required) < 0;
      }

      // 精确匹配
      const required = this.parseVersion(range);
      return this.compareVersions(ver, required) === 0;
    } catch (error) {
      console.error('[VersionChecker] 版本范围检查失败:', error);
      return false;
    }
  }

  /**
   * 解析语义化版本字符串
   */
  private parseVersion(version: string): SemanticVersion {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    
    const match = version.match(semverRegex);
    if (!match) {
      throw new Error(`无效的语义化版本: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5],
    };
  }

  /**
   * 比较两个版本
   * @returns -1: v1 < v2, 0: v1 === v2, 1: v1 > v2
   */
  private compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
    if (v1.major !== v2.major) {
      return v1.major > v2.major ? 1 : -1;
    }
    if (v1.minor !== v2.minor) {
      return v1.minor > v2.minor ? 1 : -1;
    }
    if (v1.patch !== v2.patch) {
      return v1.patch > v2.patch ? 1 : -1;
    }
    
    // 预发布版本比较
    if (v1.prerelease && !v2.prerelease) return -1;
    if (!v1.prerelease && v2.prerelease) return 1;
    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease);
    }
    
    return 0;
  }

  /**
   * 获取系统API版本
   */
  getSystemVersion(): string {
    return this.systemApiVersion;
  }

  /**
   * 设置系统API版本
   */
  setSystemVersion(version: string): void {
    (this as any).systemApiVersion = version;
  }
}

// 单例
let checkerInstance: VersionChecker | null = null;

export function getVersionChecker(): VersionChecker {
  if (!checkerInstance) {
    checkerInstance = new VersionChecker('1.0.0'); // 系统当前API版本
  }
  return checkerInstance;
}
