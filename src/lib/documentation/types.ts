/**
 * @module documentation/types
 * @description 代码注释系统的类型定义
 * 
 * @architecture
 * - 所属子系统：文档系统
 * - 架构层级：核心层
 * - 职责边界：定义注释元数据、覆盖率统计、领域知识等类型，不负责具体的注释解析和验证逻辑
 * 
 * @dependencies
 * - 直接依赖：无
 * - 被依赖：documentation/validator, documentation/coverage
 * - 循环依赖：无
 */

/**
 * 注释元数据
 * 用于跟踪注释的质量和覆盖率
 * 
 * @description 记录单个代码元素（文件、函数、类型）的注释信息
 */
export interface CommentMetadata {
  /** 文件路径（相对于项目根目录） */
  filePath: string;
  
  /** 模块名称 */
  moduleName: string;
  
  /** 注释类型 */
  commentType: 'module' | 'function' | 'type' | 'inline';
  
  /** 是否包含示例代码 */
  hasExample: boolean;
  
  /** 是否包含架构信息 */
  hasArchitecture: boolean;
  
  /** 是否包含性能信息 */
  hasPerformance: boolean;
  
  /** 最后更新时间 */
  lastUpdated: Date;
  
  /** 注释质量评分 (0-100)，基于完整性、准确性、可读性等指标 */
  qualityScore: number;
}

/**
 * 模块注释覆盖率统计
 * 
 * @description 统计整个项目或特定目录的注释覆盖情况
 */
export interface CoverageStats {
  /** 总文件数 */
  totalFiles: number;
  
  /** 已注释文件数 */
  documentedFiles: number;
  
  /** 总函数数 */
  totalFunctions: number;
  
  /** 已注释函数数 */
  documentedFunctions: number;
  
  /** 总类型数（接口、类型别名、枚举） */
  totalTypes: number;
  
  /** 已注释类型数 */
  documentedTypes: number;
  
  /** 覆盖率百分比 (0-100) */
  coveragePercentage: number;
}

/**
 * 坐标系统定义
 * 
 * @description 天文学中使用的坐标系统信息，用于注释中标注坐标系统类型
 * 
 * @unit 坐标轴通常使用无量纲单位向量或天文单位（AU）
 */
export interface CoordinateSystemInfo {
  /** 
   * 坐标系名称
   * - ICRS: 国际天球参考系（International Celestial Reference System）
   * - Ecliptic: 黄道坐标系
   * - Galactic: 银河坐标系
   * - Horizontal: 地平坐标系
   * - ECI: 地心惯性坐标系（Earth-Centered Inertial）
   */
  name: 'ICRS' | 'Ecliptic' | 'Galactic' | 'Horizontal' | 'ECI';
  
  /** 坐标系描述（中文） */
  description: string;
  
  /** 原点位置描述 */
  origin: string;
  
  /** 
   * 坐标轴定义
   * 描述 x、y、z 轴的指向
   */
  axes: {
    /** X 轴指向 */
    x: string;
    /** Y 轴指向 */
    y: string;
    /** Z 轴指向 */
    z: string;
  };
  
  /** 常用转换方法列表 */
  conversions: string[];
}

/**
 * 物理单位定义
 * 
 * @description 天文学和物理学中使用的单位信息，用于注释中标注物理量的单位
 */
export interface PhysicalUnit {
  /** 单位符号（如 AU, km, rad, deg） */
  symbol: string;
  
  /** 单位名称（中文） */
  nameCN: string;
  
  /** 单位名称（英文） */
  nameEN: string;
  
  /** 
   * 单位类型
   * - length: 长度
   * - time: 时间
   * - angle: 角度
   * - velocity: 速度
   * - mass: 质量
   */
  type: 'length' | 'time' | 'angle' | 'velocity' | 'mass';
  
  /** 转换到 SI 单位的系数（如 1 AU = 1.495978707e11 米） */
  toSI: number;
  
  /** 使用场景描述 */
  usage: string;
}

/**
 * 天文常数定义
 * 
 * @description 天文计算中使用的物理常数和天文常数
 */
export interface AstronomicalConstant {
  /** 常数名称（中文） */
  name: string;
  
  /** 常数值 */
  value: number;
  
  /** 单位 */
  unit: string;
  
  /** 精度/不确定度（可选） */
  uncertainty?: number;
  
  /** 来源/参考（如 IAU 2012, DE440） */
  source: string;
  
  /** 使用说明 */
  description: string;
}
