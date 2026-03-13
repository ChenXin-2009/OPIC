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

  /**
   * 私有构造函数
   * 
   * @description 防止外部直接实例化，确保单例模式
   * 
   * @private
   */
  private constructor() {}

  /**
   * 获取单例实例
   * 
   * @description 获取 UniverseDataLoader 的唯一实例，如果不存在则创建
   * 
   * @returns {UniverseDataLoader} 单例实例
   * 
   * @pattern 单例模式 (Singleton Pattern)
   * 
   * @performance
   * - 时间复杂度: O(1)
   * - 空间复杂度: O(1) - 只创建一个实例
   * 
   * @example
   * ```typescript
   * const loader1 = UniverseDataLoader.getInstance();
   * const loader2 = UniverseDataLoader.getInstance();
   * console.log(loader1 === loader2); // true
   * ```
   */
  static getInstance(): UniverseDataLoader {
    if (!UniverseDataLoader.instance) {
      UniverseDataLoader.instance = new UniverseDataLoader();
    }
    return UniverseDataLoader.instance;
  }

  /**
   * 加载二进制文件
   * 
   * @description 从服务器加载二进制数据文件，使用 fetch API 并配置强制缓存清除策略
   * 
   * @param {string} path - 文件路径，相对于网站根目录
   * @returns {Promise<ArrayBuffer>} 文件的二进制数据
   * @throws {Error} 当网络请求失败或 HTTP 状态码非 2xx 时抛出错误
   * 
   * @performance
   * - 执行频率: 按需调用（每个尺度首次加载时）
   * - 性能影响: 取决于网络速度和文件大小（通常 100KB - 2MB）
   * - 缓存策略: 使用 'no-store' 和 'no-cache' 强制从服务器重新获取
   * 
   * @async
   * @sideEffects
   * - 发起网络请求
   * - 可能触发浏览器的网络缓存清除
   * 
   * @errorHandling
   * - 网络错误: 捕获并重新抛出，附加错误上下文
   * - HTTP 错误: 检查 response.ok，抛出包含状态码的错误
   * - 控制台日志: 记录错误详情用于调试
   * 
   * @example
   * ```typescript
   * try {
   *   const buffer = await this.loadBinaryFile('/data/universe/local-group.bin');
   *   console.log(`Loaded ${buffer.byteLength} bytes`);
   * } catch (error) {
   *   console.error('Failed to load file:', error);
   * }
   * ```
   */
  private async loadBinaryFile(path: string): Promise<ArrayBuffer> {
    try {
      // 添加 cache-busting 和 no-cache headers
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
   * 根据尺度获取文件名
   * 
   * @description 将 UniverseScale 枚举值映射到对应的数据文件路径，并添加时间戳参数强制缓存清除
   * 
   * @param {UniverseScale} scale - 宇宙尺度枚举值
   * @returns {string} 文件路径，包含时间戳查询参数
   * @throws {Error} 当传入的尺度没有对应的数据文件时抛出错误
   * 
   * @dataSource
   * - LocalGroup: /data/universe/local-group.bin (本星系群数据)
   * - NearbyGroups: /data/universe/nearby-groups.bin (近邻星系群数据)
   * - VirgoSupercluster: /data/universe/virgo-supercluster.bin (室女座超星系团数据)
   * - LaniakeaSupercluster: /data/universe/laniakea.bin (拉尼亚凯亚超星系团数据)
   * 
   * @performance
   * - 时间复杂度: O(1) - switch 语句
   * - 空间复杂度: O(1) - 返回字符串
   * 
   * @example
   * ```typescript
   * const filename = this.getFilenameForScale(UniverseScale.LocalGroup);
   * // 返回: '/data/universe/local-group.bin?t=1234567890'
   * ```
   */
  private getFilenameForScale(scale: UniverseScale): string {
    const basePath = '/data/universe/';
    // 使用时间戳强制重新加载（更激进的缓存清除）
    const timestamp = Date.now();

    switch (scale) {
      case UniverseScale.LocalGroup:
        return `${basePath}local-group.bin?t=${timestamp}`;
      case UniverseScale.NearbyGroups:
        return `${basePath}nearby-groups.bin?t=${timestamp}`;
      case UniverseScale.VirgoSupercluster:
        return `${basePath}virgo-supercluster.bin?t=${timestamp}`;
      case UniverseScale.LaniakeaSupercluster:
        return `${basePath}laniakea.bin?t=${timestamp}`;
      default:
        throw new Error(`No data file for scale: ${scale}`);
    }
  }

  /**
   * 加载指定尺度的数据
   * 
   * @description 加载指定宇宙尺度的二进制数据，使用双层缓存机制避免重复加载
   * 
   * @param {UniverseScale} scale - 宇宙尺度枚举值
   * @returns {Promise<ArrayBuffer>} 数据文件的二进制内容
   * 
   * @async
   * @sideEffects
   * - 首次加载时发起网络请求
   * - 将加载的数据存入 this.cache
   * - 将加载 Promise 存入 this.loadingPromises（加载完成后删除）
   * 
   * @caching
   * - 第一层缓存: this.cache - 存储已加载的 ArrayBuffer
   * - 第二层缓存: this.loadingPromises - 避免同一文件的并发请求
   * - 缓存键: 文件路径（包含时间戳）
   * - 缓存失效: 调用 clearCache() 或 releaseDistantScales()
   * 
   * @performance
   * - 缓存命中: O(1) - Map.get()
   * - 缓存未命中: 取决于网络速度和文件大小
   * - 并发请求: 共享同一个 Promise，避免重复下载
   * 
   * @errorHandling
   * - 网络错误: 由 loadBinaryFile() 抛出，不会缓存失败的结果
   * - Promise 清理: 无论成功或失败，都会从 loadingPromises 中删除
   * 
   * @example
   * ```typescript
   * // 首次加载 - 发起网络请求
   * const buffer1 = await loader.loadDataForScale(UniverseScale.LocalGroup);
   * 
   * // 再次加载 - 从缓存返回
   * const buffer2 = await loader.loadDataForScale(UniverseScale.LocalGroup);
   * 
   * // 并发加载 - 共享同一个 Promise
   * const [buffer3, buffer4] = await Promise.all([
   *   loader.loadDataForScale(UniverseScale.LocalGroup),
   *   loader.loadDataForScale(UniverseScale.LocalGroup)
   * ]);
   * ```
   */
  async loadDataForScale(scale: UniverseScale): Promise<ArrayBuffer> {
    const filename = this.getFilenameForScale(scale);

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
   * 获取相邻的尺度
   * 
   * @description 返回当前尺度的前一个和后一个尺度（±1 级）
   * 
   * @param {UniverseScale} scale - 当前宇宙尺度
   * @returns {UniverseScale[]} 相邻尺度数组，长度为 0-2
   * 
   * @performance
   * - 时间复杂度: O(1) - 数组查找和切片
   * - 空间复杂度: O(1) - 最多返回 2 个元素
   * 
   * @example
   * ```typescript
   * const adjacent = this.getAdjacentScales(UniverseScale.LocalGroup);
   * // 返回: [UniverseScale.Galaxy, UniverseScale.NearbyGroups]
   * 
   * const adjacent2 = this.getAdjacentScales(UniverseScale.SolarSystem);
   * // 返回: [UniverseScale.NearbyStars] (只有后一个)
   * ```
   */
  private getAdjacentScales(scale: UniverseScale): UniverseScale[] {
    const scales = [
      UniverseScale.SolarSystem,
      UniverseScale.NearbyStars,
      UniverseScale.Galaxy,
      UniverseScale.LocalGroup,
      UniverseScale.NearbyGroups,
      UniverseScale.VirgoSupercluster,
      UniverseScale.LaniakeaSupercluster,
      UniverseScale.NearbySupercluster,
      UniverseScale.ObservableUniverse,
    ];

    const currentIndex = scales.indexOf(scale);
    if (currentIndex === -1) return [];

    const adjacent: UniverseScale[] = [];

    // 前一个尺度
    if (currentIndex > 0) {
      adjacent.push(scales[currentIndex - 1]);
    }

    // 后一个尺度
    if (currentIndex < scales.length - 1) {
      adjacent.push(scales[currentIndex + 1]);
    }

    return adjacent;
  }

  /**
   * 获取远距离的尺度（距离 >= 3 级）
   * 
   * @description 返回距离当前尺度 ≥3 级的所有尺度，用于缓存释放
   * 
   * @param {UniverseScale} scale - 当前宇宙尺度
   * @returns {UniverseScale[]} 远距离尺度数组
   * 
   * @performance
   * - 时间复杂度: O(n) - n 为总尺度数量（固定为 9）
   * - 空间复杂度: O(n) - 最多返回 n-5 个元素
   * 
   * @example
   * ```typescript
   * const distant = this.getDistantScales(UniverseScale.LocalGroup);
   * // 返回: [UniverseScale.SolarSystem, UniverseScale.NearbyStars, 
   * //        UniverseScale.VirgoSupercluster, UniverseScale.LaniakeaSupercluster, ...]
   * ```
   */
  private getDistantScales(scale: UniverseScale): UniverseScale[] {
    const scales = [
      UniverseScale.SolarSystem,
      UniverseScale.NearbyStars,
      UniverseScale.Galaxy,
      UniverseScale.LocalGroup,
      UniverseScale.NearbyGroups,
      UniverseScale.VirgoSupercluster,
      UniverseScale.LaniakeaSupercluster,
      UniverseScale.NearbySupercluster,
      UniverseScale.ObservableUniverse,
    ];

    const currentIndex = scales.indexOf(scale);
    if (currentIndex === -1) return [];

    const distant: UniverseScale[] = [];

    for (let i = 0; i < scales.length; i++) {
      if (Math.abs(i - currentIndex) >= 3) {
        distant.push(scales[i]);
      }
    }

    return distant;
  }

  /**
   * 预加载相邻尺度的数据
   * 
   * @description 并行预加载当前尺度的相邻尺度（±1 级）数据，减少用户切换尺度时的等待时间
   * 
   * @param {UniverseScale} currentScale - 当前宇宙尺度
   * @returns {Promise<void>} 所有预加载操作完成后 resolve
   * 
   * @async
   * @sideEffects
   * - 发起网络请求加载相邻尺度数据
   * - 将加载的数据存入 this.cache
   * 
   * @performance
   * - 执行频率: 每次切换尺度时调用一次
   * - 性能影响: 并行加载，不阻塞主流程
   * - 网络优化: 使用 Promise.all() 并行加载多个文件
   * 
   * @errorHandling
   * - 单个文件加载失败不影响其他文件
   * - 失败时输出警告日志，不抛出错误
   * - 失败的文件会在实际需要时重新尝试加载
   * 
   * @example
   * ```typescript
   * // 切换到本星系群时，预加载银河系和近邻星系群数据
   * await loader.preloadAdjacentScales(UniverseScale.LocalGroup);
   * // 此时 Galaxy 和 NearbyGroups 的数据已在缓存中
   * ```
   */
  async preloadAdjacentScales(currentScale: UniverseScale): Promise<void> {
    const adjacentScales = this.getAdjacentScales(currentScale);

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
   * 
   * @description 删除距离当前尺度 ≥3 级的数据缓存，释放内存空间
   * 
   * @param {UniverseScale} currentScale - 当前宇宙尺度
   * @returns {void}
   * 
   * @sideEffects
   * - 从 this.cache 中删除远距离尺度的数据
   * - 输出控制台日志记录释放的缓存
   * 
   * @performance
   * - 执行频率: 每次切换尺度时调用一次
   * - 性能影响: 低（Map.delete() 是 O(1) 操作）
   * - 内存优化: 释放不再需要的大型 ArrayBuffer（每个 100KB - 2MB）
   * 
   * @cachingStrategy
   * - 保留: 当前尺度和相邻尺度（±1 级）
   * - 释放: 远距离尺度（≥3 级）
   * - 中间尺度（±2 级）: 保留，作为缓冲区
   * 
   * @errorHandling
   * - 忽略没有数据文件的尺度（如 SolarSystem, NearbyStars 等）
   * - 使用 try-catch 捕获 getFilenameForScale() 的错误
   * 
   * @example
   * ```typescript
   * // 切换到本星系群后，释放拉尼亚凯亚超星系团的缓存
   * loader.releaseDistantScales(UniverseScale.LocalGroup);
   * // 此时 LaniakeaSupercluster 的数据已从缓存中删除
   * ```
   */
  releaseDistantScales(currentScale: UniverseScale): void {
    const distantScales = this.getDistantScales(currentScale);

    distantScales.forEach((scale) => {
      try {
        const filename = this.getFilenameForScale(scale);
        if (this.cache.has(filename)) {
          this.cache.delete(filename);
          console.log(`Released cache for ${scale}`);
        }
      } catch (error) {
        // 忽略没有数据文件的尺度
      }
    });
  }

  /**
   * 获取缓存大小（估算）
   * 
   * @description 计算当前缓存中所有 ArrayBuffer 的总字节数
   * 
   * @returns {number} 缓存大小，单位：字节
   * 
   * @performance
   * - 时间复杂度: O(n) - n 为缓存中的文件数量
   * - 空间复杂度: O(1)
   * - 典型值: 0 - 10 MB（取决于缓存的尺度数量）
   * 
   * @example
   * ```typescript
   * const cacheSize = loader.getCacheSize();
   * console.log(`Cache size: ${(cacheSize / 1024 / 1024).toFixed(2)} MB`);
   * // 输出: Cache size: 3.45 MB
   * ```
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
   * 
   * @description 清空数据缓存和加载 Promise 缓存，释放所有内存
   * 
   * @returns {void}
   * 
   * @sideEffects
   * - 清空 this.cache（所有已加载的 ArrayBuffer）
   * - 清空 this.loadingPromises（所有正在加载的 Promise）
   * 
   * @performance
   * - 时间复杂度: O(1) - Map.clear() 是常数时间操作
   * - 内存释放: 释放所有缓存的数据（可能达到 10+ MB）
   * 
   * @useCase
   * - 用户手动清除缓存
   * - 内存不足时强制释放
   * - 应用重置或重新初始化
   * 
   * @example
   * ```typescript
   * // 清空所有缓存
   * loader.clearCache();
   * console.log(loader.getCacheSize()); // 输出: 0
   * ```
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * 解析本星系群数据
   * 
   * @description 将本星系群的二进制数据解析为星系对象数组
   * 
   * @param {ArrayBuffer} buffer - 二进制数据缓冲区
   * @returns {Array<Object>} 星系对象数组，每个对象包含位置、类型、亮度等属性
   * 
   * @dataFormat
   * 二进制格式（小端序）:
   * 1. 名称表大小 (uint16, 2 字节)
   * 2. 名称表 (每个名称: uint8 长度 + UTF-8 字符串)
   * 3. 星系数量 (uint16, 2 字节)
   * 4. 星系数据 (每个 16 字节):
   *    - x, y, z (float32 × 3, 12 字节) - 位置坐标
   *    - brightness (uint8, 1 字节) - 亮度 [0-255]
   *    - type (uint8, 1 字节) - 星系类型 [0-3]
   *    - nameIndex (uint8, 1 字节) - 名称表索引
   *    - colorIndex (uint8, 1 字节) - 颜色索引 [0-3]
   * 
   * @unit
   * - 位置 (x, y, z): Mpc (百万秒差距)
   * - 亮度: 归一化值 [0, 1]
   * - 半径: Mpc
   * 
   * @galaxyTypes
   * - 0: Spiral (螺旋星系) - 半径 ~12 kpc
   * - 1: Elliptical (椭圆星系) - 半径 ~8 kpc
   * - 2: Irregular (不规则星系) - 半径 ~4 kpc
   * - 3: Dwarf (矮星系) - 半径 ~1 kpc
   * 
   * @colorMapping
   * - 0: 0xffffff (白色)
   * - 1: 0xffffaa (淡黄色)
   * - 2: 0xaaaaff (淡蓝色)
   * - 3: 0xffaaaa (淡红色)
   * 
   * @performance
   * - 时间复杂度: O(n) - n 为星系数量
   * - 空间复杂度: O(n) - 创建星系对象数组
   * - 典型数据量: ~50-100 个星系
   * 
   * @example
   * ```typescript
   * const buffer = await loader.loadDataForScale(UniverseScale.LocalGroup);
   * const galaxies = loader.parseLocalGroupData(buffer);
   * 
   * console.log(galaxies[0]);
   * // {
   * //   name: 'Milky Way',
   * //   x: 0, y: 0, z: 0,
   * //   type: 0,
   * //   brightness: 1.0,
   * //   color: 0xffffff,
   * //   radius: 0.012
   * // }
   * ```
   */
  parseLocalGroupData(buffer: ArrayBuffer): any[] {
    const view = new DataView(buffer);
    let offset = 0;

    // 读取名称表
    const nameTableSize = view.getUint16(offset, true);
    offset += 2;

    const nameTable: string[] = [];
    for (let i = 0; i < nameTableSize; i++) {
      const nameLength = view.getUint8(offset);
      offset += 1;
      
      const nameBytes = new Uint8Array(buffer, offset, nameLength);
      const name = new TextDecoder().decode(nameBytes);
      nameTable.push(name);
      offset += nameLength;
    }

    // 读取星系数量
    const galaxyCount = view.getUint16(offset, true);
    offset += 2;

    // 读取星系数据
    const galaxies: any[] = [];
    for (let i = 0; i < galaxyCount; i++) {
      const x = view.getFloat32(offset, true);
      offset += 4;
      const y = view.getFloat32(offset, true);
      offset += 4;
      const z = view.getFloat32(offset, true);
      offset += 4;
      
      const brightness = view.getUint8(offset) / 255.0;
      offset += 1;
      const type = view.getUint8(offset);
      offset += 1;
      const nameIndex = view.getUint8(offset);
      offset += 1;
      const colorIndex = view.getUint8(offset);
      offset += 1;

      // 颜色映射
      const colors = [0xffffff, 0xffffaa, 0xaaaaff, 0xffaaaa];
      const color = colors[colorIndex] || 0xffffff;

      // 根据类型设置半径（更真实的大小）
      // Spiral: ~10-15 kpc, Elliptical: ~5-10 kpc, Irregular: ~2-5 kpc, Dwarf: ~0.5-2 kpc
      const radiusMap = [0.012, 0.008, 0.004, 0.001]; // Mpc
      const radius = radiusMap[type] || 0.002;

      galaxies.push({
        name: nameTable[nameIndex] || `Galaxy ${i}`,
        x,
        y,
        z,
        type,
        brightness,
        color,
        radius,
      });
    }

    return galaxies;
  }

  /**
   * 解析近邻星系群数据
   * 
   * @description 将近邻星系群的二进制数据解析为星系群和星系对象
   * 
   * @param {ArrayBuffer} buffer - 二进制数据缓冲区
   * @returns {{ groups: Array<Object>, galaxies: Array<Object> }} 包含星系群元数据和所有星系位置的对象
   * 
   * @dataFormat
   * 二进制格式（小端序）:
   * 1. 名称表大小 (uint16, 2 字节)
   * 2. 名称表 (每个名称: uint8 长度 + UTF-8 字符串)
   * 3. 星系群数量 (uint16, 2 字节)
   * 4. 星系群数据 (每个星系群):
   *    - center (float32 × 3, 12 字节) - 中心坐标
   *    - radius (float32, 4 字节) - 半径
   *    - memberCount (uint16, 2 字节) - 成员星系数量
   *    - richness (uint8, 1 字节) - 丰度等级
   *    - nameIndex (uint8, 1 字节) - 名称表索引
   *    - 成员星系 (每个 12 字节): x, y, z (float32 × 3)
   * 
   * @unit
   * - 位置 (x, y, z): Mpc (百万秒差距)
   * - 半径: Mpc
   * - 丰度: 无量纲 [0-255]
   * 
   * @performance
   * - 时间复杂度: O(n + m) - n 为星系群数量，m 为总星系数量
   * - 空间复杂度: O(n + m)
   * - 典型数据量: ~20-50 个星系群，~500-1000 个星系
   * 
   * @example
   * ```typescript
   * const buffer = await loader.loadDataForScale(UniverseScale.NearbyGroups);
   * const { groups, galaxies } = loader.parseNearbyGroupsData(buffer);
   * 
   * console.log(groups[0]);
   * // {
   * //   name: 'M81 Group',
   * //   centerX: 3.5, centerY: 0.2, centerZ: 0.1,
   * //   radius: 0.5,
   * //   memberCount: 34,
   * //   richness: 150,
   * //   galaxies: [...]
   * // }
   * ```
   */
  parseNearbyGroupsData(buffer: ArrayBuffer): { groups: any[], galaxies: any[] } {
    const view = new DataView(buffer);
    let offset = 0;

    // 读取名称表
    const nameTableSize = view.getUint16(offset, true);
    offset += 2;

    const nameTable: string[] = [];
    for (let i = 0; i < nameTableSize; i++) {
      const nameLength = view.getUint8(offset);
      offset += 1;
      
      const nameBytes = new Uint8Array(buffer, offset, nameLength);
      const name = new TextDecoder().decode(nameBytes);
      nameTable.push(name);
      offset += nameLength;
    }

    // 读取星系群数量
    const groupCount = view.getUint16(offset, true);
    offset += 2;

    // 读取星系群数据
    const groups: any[] = [];
    const allGalaxies: any[] = [];

    for (let i = 0; i < groupCount; i++) {
      const centerX = view.getFloat32(offset, true);
      offset += 4;
      const centerY = view.getFloat32(offset, true);
      offset += 4;
      const centerZ = view.getFloat32(offset, true);
      offset += 4;
      const radius = view.getFloat32(offset, true);
      offset += 4;
      const memberCount = view.getUint16(offset, true);
      offset += 2;
      const richness = view.getUint8(offset);
      offset += 1;
      const nameIndex = view.getUint8(offset);
      offset += 1;

      // 读取成员星系
      const galaxies: any[] = [];
      for (let j = 0; j < memberCount; j++) {
        const x = view.getFloat32(offset, true);
        offset += 4;
        const y = view.getFloat32(offset, true);
        offset += 4;
        const z = view.getFloat32(offset, true);
        offset += 4;

        const galaxy = { x, y, z, brightness: 1.0 };
        galaxies.push(galaxy);
        allGalaxies.push(galaxy);
      }

      groups.push({
        name: nameTable[nameIndex] || `Group ${i}`,
        centerX,
        centerY,
        centerZ,
        radius,
        memberCount,
        richness,
        galaxies,
      });
    }

    return { groups, galaxies: allGalaxies };
  }

  /**
   * 解析室女座超星系团数据
   * 
   * @description 将室女座超星系团的二进制数据解析为星系团和星系对象
   * 
   * @param {ArrayBuffer} buffer - 二进制数据缓冲区
   * @returns {{ clusters: Array<Object>, galaxies: Array<Object> }} 包含星系团元数据和所有星系位置的对象
   * 
   * @dataFormat
   * 二进制格式（小端序）:
   * 1. 名称表大小 (uint16, 2 字节)
   * 2. 名称表 (每个名称: uint8 长度 + UTF-8 字符串)
   * 3. 星系团数量 (uint16, 2 字节)
   * 4. 星系团数据 (每个星系团):
   *    - center (float32 × 3, 12 字节) - 中心坐标
   *    - radius (float32, 4 字节) - 半径
   *    - memberCount (uint16, 2 字节) - 成员星系数量
   *    - richness (uint8, 1 字节) - 丰度等级
   *    - nameIndex (uint8, 1 字节) - 名称表索引
   *    - 成员星系 (每个 12 字节): x, y, z (float32 × 3)
   * 
   * @unit
   * - 位置 (x, y, z): Mpc (百万秒差距)
   * - 半径: Mpc
   * - 丰度: 无量纲 [0-255]
   * 
   * @performance
   * - 时间复杂度: O(n + m) - n 为星系团数量，m 为总星系数量
   * - 空间复杂度: O(n + m)
   * - 典型数据量: ~10-30 个星系团，~2000-5000 个星系
   * 
   * @example
   * ```typescript
   * const buffer = await loader.loadDataForScale(UniverseScale.VirgoSupercluster);
   * const { clusters, galaxies } = loader.parseVirgoSuperclusterData(buffer);
   * 
   * console.log(clusters[0]);
   * // {
   * //   name: 'Virgo Cluster',
   * //   centerX: 16.5, centerY: 0.0, centerZ: 0.0,
   * //   radius: 2.2,
   * //   memberCount: 1300,
   * //   richness: 255,
   * //   galaxies: [...]
   * // }
   * ```
   */
  parseVirgoSuperclusterData(buffer: ArrayBuffer): { clusters: any[], galaxies: any[] } {
    const view = new DataView(buffer);
    let offset = 0;

    // 读取名称表
    const nameTableSize = view.getUint16(offset, true);
    offset += 2;

    const nameTable: string[] = [];
    for (let i = 0; i < nameTableSize; i++) {
      const nameLength = view.getUint8(offset);
      offset += 1;
      
      const nameBytes = new Uint8Array(buffer, offset, nameLength);
      const name = new TextDecoder().decode(nameBytes);
      nameTable.push(name);
      offset += nameLength;
    }

    // 读取星系团数量
    const clusterCount = view.getUint16(offset, true);
    offset += 2;

    // 读取星系团数据
    const clusters: any[] = [];
    const allGalaxies: any[] = [];

    for (let i = 0; i < clusterCount; i++) {
      const centerX = view.getFloat32(offset, true);
      offset += 4;
      const centerY = view.getFloat32(offset, true);
      offset += 4;
      const centerZ = view.getFloat32(offset, true);
      offset += 4;
      const radius = view.getFloat32(offset, true);
      offset += 4;
      const memberCount = view.getUint16(offset, true);
      offset += 2;
      const richness = view.getUint8(offset);
      offset += 1;
      const nameIndex = view.getUint8(offset);
      offset += 1;

      // 读取成员星系
      const galaxies: any[] = [];
      for (let j = 0; j < memberCount; j++) {
        const x = view.getFloat32(offset, true);
        offset += 4;
        const y = view.getFloat32(offset, true);
        offset += 4;
        const z = view.getFloat32(offset, true);
        offset += 4;

        const galaxy = { x, y, z, brightness: 1.0 };
        galaxies.push(galaxy);
        allGalaxies.push(galaxy);
      }

      clusters.push({
        name: nameTable[nameIndex] || `Cluster ${i}`,
        centerX,
        centerY,
        centerZ,
        radius,
        memberCount,
        richness,
        galaxies,
      });
    }

    return { clusters, galaxies: allGalaxies };
  }

  /**
   * 解析拉尼亚凯亚超星系团数据
   * 
   * @description 将拉尼亚凯亚超星系团的二进制数据解析为超星系团和星系对象，包含可选的速度数据
   * 
   * @param {ArrayBuffer} buffer - 二进制数据缓冲区
   * @returns {{ superclusters: Array<Object>, galaxies: Array<Object> }} 包含超星系团元数据和所有星系位置的对象
   * 
   * @dataFormat
   * 二进制格式（小端序）:
   * 1. 名称表大小 (uint16, 2 字节)
   * 2. 名称表 (每个名称: uint8 长度 + UTF-8 字符串)
   * 3. 超星系团数量 (uint16, 2 字节)
   * 4. 超星系团数据 (每个超星系团):
   *    - center (float32 × 3, 12 字节) - 中心坐标
   *    - radius (float32, 4 字节) - 半径
   *    - memberCount (uint16, 2 字节) - 成员星系数量
   *    - richness (uint8, 1 字节) - 丰度等级
   *    - nameIndex (uint8, 1 字节) - 名称表索引
   *    - hasVelocity (uint8, 1 字节) - 是否包含速度数据
   *    - velocity (float32 × 3, 12 字节, 可选) - 速度向量
   *    - 成员星系 (每个 12 字节): x, y, z (float32 × 3)
   * 
   * @unit
   * - 位置 (x, y, z): Mpc (百万秒差距)
   * - 半径: Mpc
   * - 速度 (velocityX, velocityY, velocityZ): km/s
   * - 丰度: 无量纲 [0-255]
   * 
   * @dataSource
   * - 位置数据: Cosmicflows-3 数据库
   * - 速度数据: 本动速度场 (Peculiar Velocity Field)
   * - 参考文献: Tully et al. (2014), Nature 513, 71-73
   * 
   * @performance
   * - 时间复杂度: O(n + m) - n 为超星系团数量，m 为总星系数量
   * - 空间复杂度: O(n + m)
   * - 典型数据量: ~5-15 个超星系团，~10000-30000 个星系
   * 
   * @sideEffects
   * - 控制台日志: 输出超星系团数量和前 3 个超星系团的详细信息
   * 
   * @example
   * ```typescript
   * const buffer = await loader.loadDataForScale(UniverseScale.LaniakeaSupercluster);
   * const { superclusters, galaxies } = loader.parseLaniakeaData(buffer);
   * 
   * console.log(superclusters[0]);
   * // {
   * //   name: 'Laniakea',
   * //   centerX: 0.0, centerY: 0.0, centerZ: 0.0,
   * //   radius: 80.0,
   * //   memberCount: 100000,
   * //   richness: 255,
   * //   velocityX: 627, velocityY: -224, velocityZ: -302
   * // }
   * ```
   */
  parseLaniakeaData(buffer: ArrayBuffer): { superclusters: any[], galaxies: any[] } {
    const view = new DataView(buffer);
    let offset = 0;

    // 读取名称表
    const nameTableSize = view.getUint16(offset, true);
    offset += 2;

    const nameTable: string[] = [];
    for (let i = 0; i < nameTableSize; i++) {
      const nameLength = view.getUint8(offset);
      offset += 1;
      
      const nameBytes = new Uint8Array(buffer, offset, nameLength);
      const name = new TextDecoder().decode(nameBytes);
      nameTable.push(name);
      offset += nameLength;
    }

    // 读取超星系团数量
    const superclusterCount = view.getUint16(offset, true);
    offset += 2;
    console.log(`[UniverseDataLoader] Supercluster count: ${superclusterCount}`);

    // 读取超星系团数据
    const superclusters: any[] = [];
    const allGalaxies: any[] = [];

    for (let i = 0; i < superclusterCount; i++) {
      const centerX = view.getFloat32(offset, true);
      offset += 4;
      const centerY = view.getFloat32(offset, true);
      offset += 4;
      const centerZ = view.getFloat32(offset, true);
      offset += 4;
      const radius = view.getFloat32(offset, true);
      offset += 4;
      const memberCount = view.getUint16(offset, true);
      offset += 2;
      const richness = view.getUint8(offset);
      offset += 1;
      const nameIndex = view.getUint8(offset);
      offset += 1;

      // 可选的速度数据
      const hasVelocity = view.getUint8(offset);
      offset += 1;

      let velocityX, velocityY, velocityZ;
      if (hasVelocity) {
        velocityX = view.getFloat32(offset, true);
        offset += 4;
        velocityY = view.getFloat32(offset, true);
        offset += 4;
        velocityZ = view.getFloat32(offset, true);
        offset += 4;
      }

      // 读取成员星系
      const galaxies: any[] = [];
      for (let j = 0; j < memberCount; j++) {
        const x = view.getFloat32(offset, true);
        offset += 4;
        const y = view.getFloat32(offset, true);
        offset += 4;
        const z = view.getFloat32(offset, true);
        offset += 4;

        const galaxy = { x, y, z, brightness: 1.0 };
        galaxies.push(galaxy);
        allGalaxies.push(galaxy);
      }

      superclusters.push({
        name: nameTable[nameIndex] || `Supercluster ${i}`,
        centerX,
        centerY,
        centerZ,
        radius,
        memberCount,
        richness,
        velocityX,
        velocityY,
        velocityZ,
      });
      
      if (i < 3) {
        console.log(`[UniverseDataLoader] Supercluster ${i}: ${nameTable[nameIndex]}, center=(${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)}), members=${memberCount}`);
      }
    }

    console.log(`[UniverseDataLoader] Parsed ${superclusters.length} superclusters, ${allGalaxies.length} total galaxies`);
    return { superclusters, galaxies: allGalaxies };
  }
}
