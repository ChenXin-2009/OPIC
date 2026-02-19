/**
 * UniverseDataLoader.ts - 宇宙数据加载器
 * 
 * 单例模式的数据加载器，负责加载和缓存宇宙尺度数据
 * 支持预加载和内存管理
 */

import { UniverseScale } from '../types/universeTypes';

/**
 * 宇宙数据加载器（单例）
 */
export class UniverseDataLoader {
  private static instance: UniverseDataLoader | null = null;

  // 数据缓存
  private cache: Map<string, ArrayBuffer> = new Map();

  // 正在加载的 Promise，避免重复请求
  private loadingPromises: Map<string, Promise<ArrayBuffer>> = new Map();

  // 私有构造函数，确保单例模式
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
   * @param path - 文件路径
   * @returns ArrayBuffer
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
   * @param scale - 宇宙尺度
   * @returns 文件路径
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
   * @param scale - 宇宙尺度
   * @returns ArrayBuffer
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
   * @param scale - 当前尺度
   * @returns 相邻尺度数组
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
   * @param scale - 当前尺度
   * @returns 远距离尺度数组
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
   * @param currentScale - 当前尺度
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
   * @param currentScale - 当前尺度
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
   * @returns 缓存大小（字节）
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

  /**
   * 解析本星系群数据
   * 二进制格式：
   * - 名称表大小 (uint16)
   * - 名称表 (每个名称: uint8 长度 + 字符串)
   * - 星系数量 (uint16)
   * - 星系数据 (每个16字节: x,y,z float32, brightness/type/nameIndex/color uint8)
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
   * 返回星系群元数据和星系位置
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
