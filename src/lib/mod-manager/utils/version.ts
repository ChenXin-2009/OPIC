/**
 * @module mod-manager/utils/version
 * @description 版本兼容性检查工具
 */

import type { SemVer } from '../types';
import { API_VERSION } from '../types';

/**
 * 解析语义化版本字符串
 */
export function parseSemVer(version: string): SemVer | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * 将SemVer转换为字符串
 */
export function semVerToString(version: SemVer): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * 比较两个版本
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * 检查版本兼容性
 * 
 * 规则：
 * - 主版本必须匹配
 * - 如果指定了次版本，当前次版本必须 >= 要求
 * - 如果指定了补丁版本，当前补丁版本必须 >= 要求（当次版本匹配时）
 */
export function isVersionCompatible(required: string, current: SemVer = API_VERSION): boolean {
  const requiredVersion = parseSemVer(required);
  if (!requiredVersion) return false;

  // 主版本必须匹配
  if (requiredVersion.major !== current.major) {
    return false;
  }

  // 如果指定了次版本，当前次版本必须 >= 要求
  if (requiredVersion.minor > current.minor) {
    return false;
  }

  // 如果次版本相等，检查补丁版本
  if (requiredVersion.minor === current.minor && requiredVersion.patch > current.patch) {
    return false;
  }

  return true;
}

/**
 * 获取当前API版本
 */
export function getApiVersion(): SemVer {
  return { ...API_VERSION };
}

/**
 * 获取当前API版本字符串
 */
export function getApiVersionString(): string {
  return semVerToString(API_VERSION);
}

/**
 * 可选API功能检查
 */
export function hasApiFeature(feature: string): boolean {
  const features: Record<string, boolean> = {
    'time:direction': true,      // 播放方向控制
    'camera:focus': true,        // 相机聚焦
    'render:cesium': true,       // Cesium图层
    'satellite:visible': true,   // 可见卫星过滤
    'events:system': true,       // 系统事件
    'state:persistent': true,    // 状态持久化
    'performance:monitor': true, // 性能监控
  };

  return features[feature] ?? false;
}

/**
 * 获取所有可用的API功能
 */
export function getAvailableFeatures(): string[] {
  return Object.entries(hasApiFeature('') ? {} : {
    'time:direction': true,
    'camera:focus': true,
    'render:cesium': true,
    'satellite:visible': true,
    'events:system': true,
    'state:persistent': true,
    'performance:monitor': true,
  })
    .filter(([, available]) => available)
    .map(([feature]) => feature);
}