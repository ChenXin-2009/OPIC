/**
 * SearchIndex.ts - 天体搜索索引
 * 
 * 维护所有可搜索天体的索引数据，支持快速查询和检索
 * 索引包含太阳系天体、本星系群、近邻星系群、室女座超星系团、拉尼亚凯亚超星系团等
 */

import * as THREE from 'three';
import type { SolarSystemState, CelestialBody } from '../state';
import type { 
  LocalGroupGalaxy, 
  GalaxyGroup, 
  GalaxyCluster, 
  Supercluster
} from '../types/universeTypes';
import { UniverseScale } from '../types/universeTypes';
import { planetNames } from '../astronomy/names';
import { 
  LOCAL_GROUP_NAMES, 
  NEARBY_GROUPS_NAMES, 
  VIRGO_SUPERCLUSTER_NAMES, 
  LANIAKEA_SUPERCLUSTER_NAMES,
  getChineseName 
} from '../astronomy/universeNames';
import { MEGAPARSEC_TO_AU } from '../config/universeConfig';

/**
 * 天体类型枚举
 */
export type CelestialType = 
  | 'sun'
  | 'planet'
  | 'satellite'
  | 'galaxy'
  | 'group'
  | 'cluster'
  | 'supercluster';

/**
 * 索引中的天体数据结构
 */
export interface IndexedCelestial {
  id: string;              // 唯一标识符
  nameEn: string;          // 英文名称
  nameZh: string;          // 中文名称
  type: CelestialType;     // 天体类型
  scale: UniverseScale;    // 宇宙尺度
  position: THREE.Vector3; // 3D 位置（AU）
  distance?: number;       // 距离（AU 或 Mpc）
  metadata?: Record<string, any>; // 额外元数据
}

/**
 * 天体搜索索引类
 * 
 * 负责构建和维护所有可搜索天体的索引，提供快速查询接口
 */
export class SearchIndex {
  private celestials: Map<string, IndexedCelestial>;

  constructor() {
    this.celestials = new Map();
  }

  /**
   * 从 Store 和渲染器构建完整索引
   * @param store - Zustand store 实例
   * @param renderers - 宇宙尺度渲染器实例
   */
  buildFromStore(
    store: SolarSystemState,
    renderers?: {
      localGroup?: any;
      nearbyGroups?: any;
      virgoSupercluster?: any;
      laniakeaSupercluster?: any;
    }
  ): void {
    this.clear();

    // 1. 索引太阳系天体
    this.indexSolarSystemBodies(store.celestialBodies);

    // 2. 索引本星系群星系
    if (renderers?.localGroup) {
      this.indexLocalGroup(renderers.localGroup.getObjectData?.());
    }

    // 3. 索引近邻星系群
    if (renderers?.nearbyGroups) {
      const data = renderers.nearbyGroups.getObjectData?.();
      if (data) {
        this.indexNearbyGroups(data.groups, data.galaxies);
      }
    }

    // 4. 索引室女座超星系团
    if (renderers?.virgoSupercluster) {
      const data = renderers.virgoSupercluster.getObjectData?.();
      if (data) {
        this.indexVirgoSupercluster(data.clusters, data.galaxies);
      }
    }

    // 5. 索引拉尼亚凯亚超星系团
    if (renderers?.laniakeaSupercluster) {
      const data = renderers.laniakeaSupercluster.getObjectData?.();
      if (data) {
        this.indexLaniakeaSupercluster(data);
      }
    }
  }

  /**
   * 索引太阳系天体
   */
  private indexSolarSystemBodies(bodies: CelestialBody[]): void {
    bodies.forEach(body => {
      const nameEn = body.name;
      const nameZh = planetNames.zh[nameEn] || nameEn;
      
      // 确定天体类型
      let type: CelestialType;
      if (nameEn === 'Sun') {
        type = 'sun';
      } else if (['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(nameEn)) {
        type = 'planet';
      } else {
        type = 'satellite';
      }

      const indexed: IndexedCelestial = {
        id: `solar-system-${nameEn.toLowerCase()}`,
        nameEn,
        nameZh,
        type,
        scale: UniverseScale.SolarSystem,
        position: new THREE.Vector3(body.x, body.y, body.z),
        distance: Math.sqrt(body.x ** 2 + body.y ** 2 + body.z ** 2),
        metadata: {
          radius: body.radius,
        },
      };

      this.add(indexed);
    });
  }

  /**
   * 索引本星系群星系
   */
  private indexLocalGroup(galaxies?: LocalGroupGalaxy[]): void {
    if (!galaxies) return;

    galaxies.forEach(galaxy => {
      const nameEn = galaxy.name;
      const nameZh = LOCAL_GROUP_NAMES[nameEn] || nameEn;

      const indexed: IndexedCelestial = {
        id: `local-group-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'galaxy',
        scale: UniverseScale.LocalGroup,
        position: new THREE.Vector3(
          galaxy.x * MEGAPARSEC_TO_AU,
          galaxy.y * MEGAPARSEC_TO_AU,
          galaxy.z * MEGAPARSEC_TO_AU
        ),
        distance: Math.sqrt(galaxy.x ** 2 + galaxy.y ** 2 + galaxy.z ** 2),
        metadata: {
          galaxyType: galaxy.type,
          brightness: galaxy.brightness,
          radius: galaxy.radius,
        },
      };

      this.add(indexed);
    });
  }

  /**
   * 索引近邻星系群
   */
  private indexNearbyGroups(groups?: GalaxyGroup[], galaxies?: any[]): void {
    if (!groups) return;

    groups.forEach(group => {
      const nameEn = group.name;
      const nameZh = this.getNearbyGroupName(nameEn);

      const indexed: IndexedCelestial = {
        id: `nearby-groups-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'group',
        scale: UniverseScale.NearbyGroups,
        position: new THREE.Vector3(
          group.centerX * MEGAPARSEC_TO_AU,
          group.centerY * MEGAPARSEC_TO_AU,
          group.centerZ * MEGAPARSEC_TO_AU
        ),
        distance: Math.sqrt(group.centerX ** 2 + group.centerY ** 2 + group.centerZ ** 2),
        metadata: {
          memberCount: group.memberCount,
          richness: group.richness,
          radius: group.radius,
        },
      };

      this.add(indexed);
    });
  }

  /**
   * 索引室女座超星系团
   */
  private indexVirgoSupercluster(clusters?: GalaxyCluster[], galaxies?: any[]): void {
    if (!clusters) return;

    clusters.forEach(cluster => {
      const nameEn = cluster.name;
      const nameZh = this.getVirgoClusterName(nameEn);

      const indexed: IndexedCelestial = {
        id: `virgo-supercluster-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'cluster',
        scale: UniverseScale.VirgoSupercluster,
        position: new THREE.Vector3(
          cluster.centerX * MEGAPARSEC_TO_AU,
          cluster.centerY * MEGAPARSEC_TO_AU,
          cluster.centerZ * MEGAPARSEC_TO_AU
        ),
        distance: Math.sqrt(cluster.centerX ** 2 + cluster.centerY ** 2 + cluster.centerZ ** 2),
        metadata: {
          memberCount: cluster.memberCount,
          richness: cluster.richness,
          radius: cluster.radius,
        },
      };

      this.add(indexed);
    });
  }

  /**
   * 索引拉尼亚凯亚超星系团
   */
  private indexLaniakeaSupercluster(superclusters?: Supercluster[]): void {
    if (!superclusters) return;

    superclusters.forEach(supercluster => {
      const nameEn = supercluster.name;
      const nameZh = this.getLaniakeaName(nameEn);

      const indexed: IndexedCelestial = {
        id: `laniakea-supercluster-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'supercluster',
        scale: UniverseScale.LaniakeaSupercluster,
        position: new THREE.Vector3(
          supercluster.centerX * MEGAPARSEC_TO_AU,
          supercluster.centerY * MEGAPARSEC_TO_AU,
          supercluster.centerZ * MEGAPARSEC_TO_AU
        ),
        distance: Math.sqrt(supercluster.centerX ** 2 + supercluster.centerY ** 2 + supercluster.centerZ ** 2),
        metadata: {
          memberCount: supercluster.memberCount,
          richness: supercluster.richness,
          radius: supercluster.radius,
          velocity: supercluster.velocityX !== undefined ? {
            x: supercluster.velocityX,
            y: supercluster.velocityY,
            z: supercluster.velocityZ,
          } : undefined,
        },
      };

      this.add(indexed);
    });
  }

  /**
   * 获取近邻星系群的中文名称
   */
  private getNearbyGroupName(englishName: string): string {
    return getChineseName(englishName, 'nearby-groups');
  }

  /**
   * 获取室女座超星系团的中文名称
   */
  private getVirgoClusterName(englishName: string): string {
    return getChineseName(englishName, 'virgo-supercluster');
  }

  /**
   * 获取拉尼亚凯亚超星系团的中文名称
   */
  private getLaniakeaName(englishName: string): string {
    return getChineseName(englishName, 'laniakea');
  }

  /**
   * 添加天体到索引
   * @param celestial - 天体数据
   */
  add(celestial: IndexedCelestial): void {
    this.celestials.set(celestial.id, celestial);
  }

  /**
   * 获取所有天体
   * @returns 天体数组
   */
  getAll(): IndexedCelestial[] {
    return Array.from(this.celestials.values());
  }

  /**
   * 根据 ID 获取天体
   * @param id - 天体 ID
   * @returns 天体数据，如果不存在则返回 undefined
   */
  getById(id: string): IndexedCelestial | undefined {
    return this.celestials.get(id);
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.celestials.clear();
  }

  /**
   * 获取索引中的天体数量
   * @returns 天体数量
   */
  size(): number {
    return this.celestials.size;
  }
}
