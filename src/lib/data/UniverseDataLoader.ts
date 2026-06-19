/**
 * @module data/UniverseDataLoader
 * @description 宇宙数据加载器 - 负责加载、缓存和解析宇宙尺度数据
 *
 * 本模块实现了单例模式的数据加载器，提供以下核心功能:
 * 1. 二进制数据加载 - 从服务器加载压缩的宇宙数据文件
 * 2. 智能缓存管理 - 缓存当前和相邻尺度的数据，释放远距离尺度的缓存
 * 3. 预加载策略 - 预加载相邻尺度数据，减少切换延迟
 * 4. 数据解析 - 将二进制数据解析为 JavaScript 对象
 * 5. 防重复加载 - 使用 Promise 缓存避免同一文件的重复请求
 *
 * @architecture
 * - 所属子系统: 数据加载
 * - 架构层级: 服务层
 * - 职责边界:
 *   - 负责: 数据文件的加载、缓存、解析和内存管理
 *   - 不负责: 数据的渲染、数据的业务逻辑处理、UI 交互
 * - 设计模式: 单例模式 (Singleton Pattern)
 *
 * @dependencies
 * - 直接依赖:
 *   - ../types/universeTypes (UniverseScale 枚举)
 *   - ./scale-utils (getFilenameForScale, getAdjacentScales, getDistantScales)
 *   - ./universe-data-parsers (parseLocalGroupData, parseNearbyGroupsData, ...)
 *   - Web APIs: fetch, ArrayBuffer, DataView, TextDecoder
 * - 被依赖:
 *   - src/lib/3d/universe/ (宇宙渲染器)
 *   - src/components/ (UI 组件)
 * - 循环依赖: 无
 *
 * @performance
 * - 缓存策略: 保留当前尺度和相邻尺度 (±1 级) 的数据，释放远距离尺度 (≥3 级) 的数据
 * - 预加载策略: 切换尺度时并行预加载相邻尺度数据
 * - 内存优化: 使用 ArrayBuffer 存储原始二进制数据，按需解析
 * - 防重复加载: 使用 loadingPromises Map 避免同一文件的并发请求
 *
 * @dataFormat
 * 所有数据文件使用自定义二进制格式，结构如下:
 *
 * **通用结构:**
 * - 名称表大小 (uint16, 2 字节)
 * - 名称表 (每个名称: uint8 长度 + UTF-8 字符串)
 * - 实体数量 (uint16, 2 字节)
 * - 实体数据 (结构因尺度而异)
 *
 * **本星系群 (LocalGroup):**
 * - 每个星系 16 字节: x,y,z (float32 × 3), brightness/type/nameIndex/color (uint8 × 4)
 *
 * **近邻星系群 (NearbyGroups):**
 * - 每个星系群: center (float32 × 3), radius (float32), memberCount (uint16), richness/nameIndex (uint8 × 2)
 * - 成员星系: x,y,z (float32 × 3)
 *
 * **室女座超星系团 (VirgoSupercluster):**
 * - 每个星系团: center (float32 × 3), radius (float32), memberCount (uint16), richness/nameIndex (uint8 × 2)
 * - 成员星系: x,y,z (float32 × 3)
 *
 * **拉尼亚凯亚超星系团 (Laniakea):**
 * - 每个超星系团: center (float32 × 3), radius (float32), memberCount (uint16), richness/nameIndex (uint8 × 2), hasVelocity (uint8)
 * - 可选速度: velocity (float32 × 3)
 * - 成员星系: x,y,z (float32 × 3)
 *
 * @unit
 * - 位置坐标: Mpc (百万秒差距, Megaparsec)
 * - 半径: Mpc
 * - 速度: km/s (仅 Laniakea 数据)
 * - 亮度: 归一化值 [0, 1]
 *
 * @example
 * ```typescript
 * // 获取单例实例
 * const loader = UniverseDataLoader.getInstance();
 *
 * // 加载本星系群数据
 * const buffer = await loader.loadDataForScale(UniverseScale.LocalGroup);
 * const galaxies = loader.parseLocalGroupData(buffer);
 *
 * // 预加载相邻尺度
 * await loader.preloadAdjacentScales(UniverseScale.LocalGroup);
 *
 * // 释放远距离尺度缓存
 * loader.releaseDistantScales(UniverseScale.LocalGroup);
 *
 * // 查看缓存大小
 * const cacheSize = loader.getCacheSize();
 * console.log(`Cache size: ${(cacheSize / 1024 / 1024).toFixed(2)} MB`);
 * ```
 */

import { UniverseScale } from '../types/universeTypes';
import { logger } from '@/utils/logger';
import { getFilenameForScale, getAdjacentScales, getDistantScales } from './scale-utils';
import {
  parseLocalGroupData,
  parseNearbyGroupsData,
  parseVirgoSuperclusterData,
  parseLaniakeaData,
} from './universe-data-parsers';

/**
 * 宇宙数据加载器（单例）
 *
 * @description 负责加载、缓存和解析宇宙尺度数据的单例类
 *
 * @class UniverseDataLoader
 * @pattern 单例模式 (Singleton Pattern)
 *
 * @features
 * - 单例模式: 确保全局只有一个实例
 * - 智能缓存: 保留当前和相邻尺度数据，释放远距离尺度数据
 * - 预加载策略: 并行预加载相邻尺度，减少切换延迟
 * - 防重复加载: 使用 Promise 缓存避免同一文件的并发请求
 * - 二进制解析: 高效解析自定义二进制格式
 *
 * @caching
 * - 第一层缓存: cache Map - 存储已加载的 ArrayBuffer
 * - 第二层缓存: loadingPromises Map - 避免并发请求
 * - 缓存策略: 保留 ±1 级尺度，释放 ≥3 级尺度
 *
 * @performance
 * - 内存使用: 通常 3-10 MB（取决于缓存的尺度数量）
 * - 网络优化: 并行预加载，强制缓存清除
 * - 解析性能: O(n) 时间复杂度，n 为数据点数量
 *
 * @example
 * ```typescript
 * // 获取单例实例
 * const loader = UniverseDataLoader.getInstance();
 *
 * // 加载并解析数据
 * const buffer = await loader.loadDataForScale(UniverseScale.LocalGroup);
 * const galaxies = loader.parseLocalGroupData(buffer);
 *
 * // 预加载相邻尺度
 * await loader.preloadAdjacentScales(UniverseScale.LocalGroup);
 *
 * // 释放远距离缓存
 * loader.releaseDistantScales(UniverseScale.LocalGroup);
 * ```
 */
export class UniverseDataLoader {
  private static instance: UniverseDataLoader | null = null;

  // 数据缓存
  private cache: Map<string, ArrayBuffer> = new Map();

  // 正在加载的 Promise，避免重复请求
  private loadingPromises: Map<string, Promise<ArrayBuffer>> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): UniverseDataLoader {
    if (!UniverseDataLoader.instance) {
      UniverseDataLoader.instance = new UniverseDataLoader();
    }
    return UniverseDataLoader.instance;
  }

  /**
   * 加载二进制文件
   */
  private async loadBinaryFile(path: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(path, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(
          `Failed to load ${path}: ${response.status} ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;
    } catch (error) {
      console.error(`Error loading binary file ${path}:`, error);
      throw error;
    }
  }

  /**
   * 加载指定尺度的数据
   */
  async loadDataForScale(scale: UniverseScale): Promise<ArrayBuffer> {
    const filename = getFilenameForScale(scale);

    // 检查缓存
    if (this.cache.has(filename)) {
      return this.cache.get(filename)!;
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(filename)) {
      return this.loadingPromises.get(filename)!;
    }

    // 开始加载
    const loadingPromise = this.loadBinaryFile(filename).then((buffer) => {
      // 存入缓存
      this.cache.set(filename, buffer);
      // 清除加载 Promise
      this.loadingPromises.delete(filename);
      return buffer;
    });

    // 记录加载 Promise
    this.loadingPromises.set(filename, loadingPromise);

    return loadingPromise;
  }

  /**
   * 预加载相邻尺度的数据
   */
  async preloadAdjacentScales(currentScale: UniverseScale): Promise<void> {
    const adjacentScales = getAdjacentScales(currentScale);

    // 并行加载相邻尺度数据
    const loadPromises = adjacentScales.map((scale) => {
      return this.loadDataForScale(scale).catch((error) => {
        console.warn(`Failed to preload data for ${scale}:`, error);
      });
    });

    await Promise.all(loadPromises);
  }

  /**
   * 释放远距离尺度的缓存
   */
  releaseDistantScales(currentScale: UniverseScale): void {
    const distantScales = getDistantScales(currentScale);

    distantScales.forEach((scale) => {
      try {
        const filename = getFilenameForScale(scale);
        if (this.cache.has(filename)) {
          this.cache.delete(filename);
          logger.debug(`Released cache for ${scale}`);
        }
      } catch (error) {
        // 忽略没有数据文件的尺度
      }
    });
  }

  /**
   * 获取缓存大小（估算）
   */
  getCacheSize(): number {
    let totalSize = 0;
    this.cache.forEach((buffer) => {
      totalSize += buffer.byteLength;
    });
    return totalSize;
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // --- 以下为数据解析方法，委托给纯函数 ---

  parseLocalGroupData(buffer: ArrayBuffer): any[] {
    return parseLocalGroupData(buffer);
  }

  parseNearbyGroupsData(buffer: ArrayBuffer): { groups: any[], galaxies: any[] } {
    return parseNearbyGroupsData(buffer);
  }

  parseVirgoSuperclusterData(buffer: ArrayBuffer): { clusters: any[], galaxies: any[] } {
    return parseVirgoSuperclusterData(buffer);
  }

  parseLaniakeaData(buffer: ArrayBuffer): { superclusters: any[], galaxies: any[] } {
    return parseLaniakeaData(buffer);
  }
}
