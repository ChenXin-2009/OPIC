/**
 * @module types/universeTypes
 * @description 宇宙可视化类型定义 - 包含所有宇宙尺度、星系、星系团等数据结构的类型定义
 * 
 * 本模块定义了宇宙可视化系统中使用的所有数据类型和接口，基于真实的天文观测数据。
 * 所有数据来源于公开的天文数据库和科学文献，不是模拟数据。
 * 
 * @architecture
 * - 所属子系统: 类型系统
 * - 架构层级: 核心层
 * - 职责边界: 
 *   - 负责: 定义数据结构、接口契约、枚举类型
 *   - 不负责: 数据加载、数据处理、业务逻辑
 * 
 * @dependencies
 * - 直接依赖: three (THREE.Group, THREE.Vector3)
 * - 被依赖: 
 *   - src/lib/data/ (数据加载模块)
 *   - src/lib/3d/universe/ (宇宙渲染器)
 *   - src/components/ (UI 组件)
 * - 循环依赖: 无
 * 
 * @dataSource
 * - 本星系群: McConnachie (2012) catalog
 * - 近邻星系群: Karachentsev et al. (2013) catalog
 * - 室女座超星系团: 2MRS survey
 * - 拉尼亚凯亚超星系团: Cosmicflows-3 dataset, Tully et al. (2014)
 * 
 * @coordinateSystem
 * - 坐标系: 超星系坐标系 (Supergalactic Coordinate System)
 * - 原点: 银河系中心
 * - X 轴: 指向超星系团平面
 * - Y 轴: 垂直于超星系团平面
 * - Z 轴: 右手坐标系
 * 
 * @unit
 * - 距离: Mpc (百万秒差距, Megaparsec)
 * - 半径: Mpc 或 kpc (千秒差距, Kiloparsec)
 * - 速度: km/s (千米每秒)
 * - 亮度: 归一化值 [0, 1] 或视星等
 */

import * as THREE from 'three';

/**
 * 宇宙尺度枚举
 * 
 * @description 定义从太阳系到可观测宇宙的 9 个尺度级别
 * 
 * @enum {string}
 * 
 * @scale
 * - SolarSystem: 太阳系 (~10^-4 Mpc, ~30 AU)
 * - NearbyStars: 近邻恒星 (~10^-3 Mpc, ~300 光年)
 * - Galaxy: 银河系 (~0.03 Mpc, ~100,000 光年)
 * - LocalGroup: 本星系群 (~1 Mpc, ~10 Mly)
 * - NearbyGroups: 近邻星系群 (~10 Mpc, ~30 Mly)
 * - VirgoSupercluster: 室女座超星系团 (~30 Mpc, ~100 Mly)
 * - LaniakeaSupercluster: 拉尼亚凯亚超星系团 (~160 Mpc, ~520 Mly)
 * - NearbySupercluster: 近邻超星系团 (~300 Mpc, ~1 Gly)
 * - ObservableUniverse: 可观测宇宙 (~14,000 Mpc, ~46 Gly)
 * 
 * @dataAvailability
 * - 有数据文件: LocalGroup, NearbyGroups, VirgoSupercluster, LaniakeaSupercluster
 * - 无数据文件: SolarSystem, NearbyStars, Galaxy, NearbySupercluster, ObservableUniverse
 * 
 * @example
 * ```typescript
 * const scale = UniverseScale.LocalGroup;
 * console.log(scale); // 'local-group'
 * ```
 */
export enum UniverseScale {
  SolarSystem = 'solar-system',
  NearbyStars = 'nearby-stars',
  Galaxy = 'galaxy',
  LocalGroup = 'local-group',
  NearbyGroups = 'nearby-groups',
  VirgoSupercluster = 'virgo-supercluster',
  LaniakeaSupercluster = 'laniakea-supercluster',
  NearbySupercluster = 'nearby-supercluster',
  ObservableUniverse = 'observable-universe',
}

/**
 * 星系类型枚举
 * 
 * @description 基于哈勃形态分类的星系类型
 * 
 * @enum {number}
 * 
 * @classification
 * - Spiral (0): 螺旋星系 - 具有旋臂结构，如银河系、仙女座星系
 * - Elliptical (1): 椭圆星系 - 椭球形状，缺乏旋臂，如 M87
 * - Irregular (2): 不规则星系 - 无明显结构，如大麦哲伦云
 * - Dwarf (3): 矮星系 - 小型星系，如人马座矮椭球星系
 * 
 * @typicalSize
 * - Spiral: ~10-15 kpc (直径)
 * - Elliptical: ~5-10 kpc (直径)
 * - Irregular: ~2-5 kpc (直径)
 * - Dwarf: ~0.5-2 kpc (直径)
 * 
 * @example
 * ```typescript
 * const milkyWay: GalaxyType = GalaxyType.Spiral;
 * console.log(milkyWay); // 0
 * ```
 */
export enum GalaxyType {
  Spiral = 0,
  Elliptical = 1,
  Irregular = 2,
  Dwarf = 3,
}

/**
 * Interface for universe scale renderers
 * All renderers must implement this interface for consistent behavior
 */
export interface UniverseScaleRenderer {
  /**
   * Get the THREE.Group containing all rendered objects
   */
  getGroup(): THREE.Group;

  /**
   * Update the renderer based on camera distance and time
   * @param cameraDistance - Distance from camera to origin in AU
   * @param deltaTime - Time elapsed since last frame in seconds
   */
  update(cameraDistance: number, deltaTime: number): void;

  /**
   * Get current opacity value (0-1)
   */
  getOpacity(): number;

  /**
   * Get visibility state
   */
  getIsVisible(): boolean;

  /**
   * Clean up resources
   */
  dispose(): void;

  /**
   * Set brightness multiplier (optional)
   * @param brightness - Brightness value (0-1)
   */
  setBrightness?(brightness: number): void;

  /**
   * Get object data for interaction (optional)
   * @returns Array of objects with position and metadata
   */
  getObjectData?(): any[];
}

/**
 * 本星系群星系数据接口
 * 
 * @description 本星系群中单个星系的完整数据，包含位置、类型、亮度等属性
 * 
 * @interface LocalGroupGalaxy
 * 
 * @dataSource McConnachie (2012) catalog - "The Observed Properties of Dwarf Galaxies in and around the Local Group"
 * 
 * @coordinateSystem 超星系坐标系 (Supergalactic Coordinate System)
 * 
 * @unit
 * - x, y, z: Mpc (百万秒差距)
 * - radius: kpc (千秒差距)
 * - brightness: 视星等或光度（取决于数据源）
 * 
 * @example
 * ```typescript
 * const milkyWay: LocalGroupGalaxy = {
 *   name: 'Milky Way',
 *   x: 0, y: 0, z: 0,
 *   type: GalaxyType.Spiral,
 *   brightness: 1.0,
 *   color: '#ffffff',
 *   radius: 12
 * };
 * ```
 */
export interface LocalGroupGalaxy {
  /** 星系名称（英文） */
  name: string;
  
  /** 超星系坐标系 X 坐标，单位：Mpc */
  x: number;
  
  /** 超星系坐标系 Y 坐标，单位：Mpc */
  y: number;
  
  /** 超星系坐标系 Z 坐标，单位：Mpc */
  z: number;
  
  /** 星系类型（螺旋、椭圆、不规则、矮星系） */
  type: GalaxyType;
  
  /** 亮度或视星等，归一化值 [0, 1] 或绝对星等 */
  brightness: number;
  
  /** 颜色（十六进制颜色代码），如 '#ffffff' */
  color: string;
  
  /** 视觉半径，单位：kpc */
  radius: number;
}

/**
 * 简化星系数据接口
 * 
 * @description 用于粒子系统渲染的简化星系数据，只包含位置和亮度
 * 
 * @interface SimpleGalaxy
 * 
 * @useCase
 * - 大规模星系渲染（数千到数万个星系）
 * - 粒子系统优化
 * - 远距离尺度可视化
 * 
 * @coordinateSystem 超星系坐标系 (Supergalactic Coordinate System)
 * 
 * @unit
 * - x, y, z: Mpc (百万秒差距)
 * - brightness: 归一化值 [0, 1]
 * 
 * @example
 * ```typescript
 * const galaxy: SimpleGalaxy = {
 *   x: 10.5,
 *   y: -3.2,
 *   z: 7.8,
 *   brightness: 0.8
 * };
 * ```
 */
export interface SimpleGalaxy {
  /** 超星系坐标系 X 坐标，单位：Mpc */
  x: number;
  
  /** 超星系坐标系 Y 坐标，单位：Mpc */
  y: number;
  
  /** 超星系坐标系 Z 坐标，单位：Mpc */
  z: number;
  
  /** 相对亮度，归一化值 [0, 1] */
  brightness: number;
}

/**
 * 星系群数据接口
 * 
 * @description 星系群的元数据和成员星系列表
 * 
 * @interface GalaxyGroup
 * 
 * @dataSource Karachentsev et al. (2013) catalog - "Updated Nearby Galaxy Catalog"
 * 
 * @coordinateSystem 超星系坐标系 (Supergalactic Coordinate System)
 * 
 * @unit
 * - centerX, centerY, centerZ: Mpc (百万秒差距)
 * - radius: Mpc
 * - memberCount: 无量纲（星系数量）
 * - richness: 无量纲 [0-255]，表示星系群的丰度等级
 * 
 * @typicalValues
 * - memberCount: 5-50 个星系
 * - radius: 0.5-2 Mpc
 * - richness: 50-200
 * 
 * @example
 * ```typescript
 * const m81Group: GalaxyGroup = {
 *   name: 'M81 Group',
 *   centerX: 3.5, centerY: 0.2, centerZ: 0.1,
 *   radius: 0.5,
 *   memberCount: 34,
 *   richness: 150,
 *   galaxies: [...]
 * };
 * ```
 */
export interface GalaxyGroup {
  /** 星系群名称（英文） */
  name: string;
  
  /** 星系群中心 X 坐标，单位：Mpc */
  centerX: number;
  
  /** 星系群中心 Y 坐标，单位：Mpc */
  centerY: number;
  
  /** 星系群中心 Z 坐标，单位：Mpc */
  centerZ: number;
  
  /** 星系群半径，单位：Mpc */
  radius: number;
  
  /** 成员星系数量 */
  memberCount: number;
  
  /** 星系群丰度参数，范围：[0-255] */
  richness: number;
  
  /** 成员星系列表 */
  galaxies: SimpleGalaxy[];
}

/**
 * 星系团数据接口
 * 
 * @description 星系团的元数据和成员星系列表
 * 
 * @interface GalaxyCluster
 * 
 * @dataSource 2MRS survey (Two Micron All-Sky Redshift Survey)
 * 
 * @coordinateSystem 超星系坐标系 (Supergalactic Coordinate System)
 * 
 * @unit
 * - centerX, centerY, centerZ: Mpc (百万秒差距)
 * - radius: Mpc
 * - memberCount: 无量纲（星系数量）
 * - richness: 无量纲 [0-255]，表示星系团的丰度等级
 * 
 * @typicalValues
 * - memberCount: 50-2000 个星系
 * - radius: 1-5 Mpc
 * - richness: 100-255
 * 
 * @example
 * ```typescript
 * const virgoCluster: GalaxyCluster = {
 *   name: 'Virgo Cluster',
 *   centerX: 16.5, centerY: 0.0, centerZ: 0.0,
 *   radius: 2.2,
 *   memberCount: 1300,
 *   richness: 255,
 *   galaxies: [...]
 * };
 * ```
 */
export interface GalaxyCluster {
  /** 星系团名称（英文） */
  name: string;
  
  /** 星系团中心 X 坐标，单位：Mpc */
  centerX: number;
  
  /** 星系团中心 Y 坐标，单位：Mpc */
  centerY: number;
  
  /** 星系团中心 Z 坐标，单位：Mpc */
  centerZ: number;
  
  /** 星系团半径，单位：Mpc */
  radius: number;
  
  /** 成员星系数量 */
  memberCount: number;
  
  /** 星系团丰度参数，范围：[0-255] */
  richness: number;
  
  /** 成员星系列表 */
  galaxies: SimpleGalaxy[];
}

/**
 * 超星系团数据接口
 * 
 * @description 超星系团的元数据，包含可选的本动速度数据
 * 
 * @interface Supercluster
 * 
 * @dataSource Cosmicflows-3 dataset, Tully et al. (2014), Nature 513, 71-73
 * 
 * @coordinateSystem 超星系坐标系 (Supergalactic Coordinate System)
 * 
 * @unit
 * - centerX, centerY, centerZ: Mpc (百万秒差距)
 * - radius: Mpc
 * - memberCount: 无量纲（星系/星系群数量）
 * - richness: 无量纲 [0-255]，表示超星系团的丰度等级
 * - velocityX, velocityY, velocityZ: km/s (本动速度分量)
 * 
 * @typicalValues
 * - memberCount: 1000-100000 个星系
 * - radius: 50-200 Mpc
 * - richness: 150-255
 * - velocity: 100-1000 km/s
 * 
 * @peculiarVelocity
 * 本动速度（Peculiar Velocity）是星系相对于哈勃流的额外速度，
 * 反映了大尺度结构的引力作用。拉尼亚凯亚超星系团的本动速度
 * 指向巨引源（Great Attractor）方向。
 * 
 * @example
 * ```typescript
 * const laniakea: Supercluster = {
 *   name: 'Laniakea',
 *   centerX: 0.0, centerY: 0.0, centerZ: 0.0,
 *   radius: 80.0,
 *   memberCount: 100000,
 *   richness: 255,
 *   velocityX: 627,
 *   velocityY: -224,
 *   velocityZ: -302
 * };
 * ```
 */
export interface Supercluster {
  /** 超星系团名称（英文） */
  name: string;
  
  /** 超星系团中心 X 坐标，单位：Mpc */
  centerX: number;
  
  /** 超星系团中心 Y 坐标，单位：Mpc */
  centerY: number;
  
  /** 超星系团中心 Z 坐标，单位：Mpc */
  centerZ: number;
  
  /** 超星系团半径，单位：Mpc */
  radius: number;
  
  /** 成员星系/星系群数量 */
  memberCount: number;
  
  /** 超星系团丰度参数，范围：[0-255] */
  richness: number;
  
  /** 本动速度 X 分量，单位：km/s（可选） */
  velocityX?: number;
  
  /** 本动速度 Y 分量，单位：km/s（可选） */
  velocityY?: number;
  
  /** 本动速度 Z 分量，单位：km/s（可选） */
  velocityZ?: number;
}

/**
 * Cosmic structure types (walls, voids, filaments)
 */
export interface CosmicStructure {
  type: 'wall' | 'void' | 'filament';
  name: string;
  centerX: number;  // Structure center X in Mpc
  centerY: number;  // Structure center Y in Mpc
  centerZ: number;  // Structure center Z in Mpc
  sizeX: number;  // Structure size X in Mpc
  sizeY: number;  // Structure size Y in Mpc
  sizeZ: number;  // Structure size Z in Mpc
  redshift: number;  // Average redshift
}

/**
 * Filament generation parameters
 */
export interface FilamentParams {
  anchorPoints: THREE.Vector3[];  // Points to connect
  thickness: number;  // Filament thickness in Mpc
  density: number;  // Particle density along filament
}

/**
 * Level of Detail (LOD) configuration
 */
export interface LODLevel {
  distance: number;  // Camera distance threshold in AU
  particleRatio: number;  // Ratio of particles to render (0-1)
  textureSize: number;  // Texture resolution in pixels
}
