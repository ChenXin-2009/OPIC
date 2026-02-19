/**
 * SearchEngine.ts - 天体搜索引擎
 * 
 * 使用 Fuse.js 进行模糊匹配搜索，支持中英文双语搜索
 * 实现结果排序（太阳系天体优先）和数量限制
 */

import Fuse from 'fuse.js';
import type { SearchIndex, IndexedCelestial, CelestialType } from './SearchIndex';
import { UniverseScale } from '../types/universeTypes';
import * as THREE from 'three';

/**
 * 搜索结果接口
 */
export interface SearchResult {
  id: string;              // 唯一标识符
  name: string;            // 天体名称（当前语言）
  nameEn: string;          // 英文名称
  nameZh: string;          // 中文名称
  type: CelestialType;     // 天体类型
  scale: UniverseScale;    // 宇宙尺度
  position: THREE.Vector3; // 3D 位置
  distance?: number;       // 距离（AU 或 Mpc）
  relevance: number;       // 相关性评分（0-1，越小越相关）
}

/**
 * Fuse.js 配置选项
 */
const FUSE_OPTIONS: Fuse.IFuseOptions<IndexedCelestial> = {
  keys: [
    { name: 'nameEn', weight: 0.5 },
    { name: 'nameZh', weight: 0.5 }
  ],
  threshold: 0.4,        // 模糊匹配阈值（0-1，越小越严格）
  distance: 100,         // 匹配距离
  minMatchCharLength: 1, // 最小匹配字符数
  includeScore: true,    // 包含相关性评分
};

/**
 * 天体类型优先级（用于排序）
 * 数值越小优先级越高
 */
const TYPE_PRIORITY: Record<CelestialType, number> = {
  sun: 1,
  planet: 2,
  satellite: 3,
  galaxy: 4,
  group: 5,
  cluster: 6,
  supercluster: 7,
};

/**
 * 天体搜索引擎类
 * 
 * 提供高效的模糊匹配搜索功能，支持中英文双语搜索
 * 自动按相关性和天体类型排序结果
 */
export class SearchEngine {
  private index: SearchIndex;
  private fuse: Fuse<IndexedCelestial>;

  /**
   * 构造函数
   * @param index - 搜索索引实例
   */
  constructor(index: SearchIndex) {
    this.index = index;
    this.fuse = new Fuse(this.index.getAll(), FUSE_OPTIONS);
  }

  /**
   * 搜索天体
   * @param query - 搜索查询字符串
   * @param maxResults - 最大结果数量（默认 10）
   * @returns 搜索结果数组，按相关性和类型排序
   */
  search(query: string, maxResults: number = 10): SearchResult[] {
    // 空查询返回空结果
    if (!query || query.trim().length === 0) {
      return [];
    }

    // 使用 Fuse.js 进行模糊搜索
    const fuseResults = this.fuse.search(query.trim());

    // 转换为 SearchResult 格式
    const results: SearchResult[] = fuseResults.map(result => ({
      id: result.item.id,
      name: result.item.nameZh || result.item.nameEn, // 优先使用中文名称
      nameEn: result.item.nameEn,
      nameZh: result.item.nameZh,
      type: result.item.type,
      scale: result.item.scale,
      position: result.item.position,
      distance: result.item.distance,
      relevance: result.score ?? 0, // Fuse.js 评分（0-1，越小越相关）
    }));

    // 排序：先按类型优先级，再按相关性评分
    results.sort((a, b) => {
      const priorityDiff = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // 相关性评分越小越好
      return a.relevance - b.relevance;
    });

    // 限制结果数量
    return results.slice(0, maxResults);
  }

  /**
   * 更新搜索索引
   * @param index - 新的搜索索引
   */
  updateIndex(index: SearchIndex): void {
    this.index = index;
    // 重新创建 Fuse 实例
    this.fuse = new Fuse(this.index.getAll(), FUSE_OPTIONS);
  }
}
