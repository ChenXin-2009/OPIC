/**
 * performanceConfig.ts - 性能优化配置
 * 
 * 功能：
 * - 定义性能优化相关的配置常量
 * - 环境相关的日志控制
 * - 性能阈值和调整参数
 * 
 * 使用：
 * - 导入 PERFORMANCE_CONFIG 使用配置
 * - 使用 isDevelopment() 判断环境
 * - 使用 logDebug() 输出开发环境日志
 */

/**
 * 性能配置接口
 */
export interface PerformanceConfig {
  /** 默认 SGP4 计算间隔（毫秒） */
  DEFAULT_UPDATE_INTERVAL: number;
  
  /** 默认插值方法 */
  DEFAULT_INTERPOLATION: 'linear' | 'cubic';
  
  /** 默认位置变化阈值（AU） */
  DEFAULT_POSITION_THRESHOLD: number;
  
  /** FPS 低阈值 */
  FPS_LOW_THRESHOLD: number;
  
  /** FPS 高阈值 */
  FPS_HIGH_THRESHOLD: number;
  
  /** FPS 样本大小（帧数） */
  FPS_SAMPLE_SIZE: number;
  
  /** 质量调整冷却时间（毫秒） */
  QUALITY_ADJUSTMENT_COOLDOWN: number;
  
  /** 低 FPS 持续时间（毫秒） */
  LOW_FPS_DURATION: number;
  
  /** 高 FPS 持续时间（毫秒） */
  HIGH_FPS_DURATION: number;
  
  /** 包围球更新阈值（百分比） */
  BOUNDING_SPHERE_UPDATE_THRESHOLD: number;
  
  /** 包围球最小更新间隔（毫秒） */
  BOUNDING_SPHERE_MIN_INTERVAL: number;
  
  /** 是否启用性能日志 */
  ENABLE_PERFORMANCE_LOGGING: boolean;
  
  /** 日志输出间隔（毫秒） */
  LOG_INTERVAL: number;
}

/**
 * 判断是否为开发环境
 * 
 * @returns 是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 输出调试日志（仅在开发环境）
 * 
 * @param message - 日志消息
 * @param args - 额外参数
 * 
 * @example
 * ```typescript
 * logDebug('[SatelliteLayer]', 'Updated', count, 'satellites');
 * ```
 */
export function logDebug(_message: string, ..._args: any[]): void {
  // 性能日志已禁用
}

/**
 * 输出错误日志（所有环境）
 * 
 * @param message - 错误消息
 * @param args - 额外参数
 */
export function logError(message: string, ...args: any[]): void {
  console.error(message, ...args);
}

/**
 * 性能配置常量
 */
export const PERFORMANCE_CONFIG: PerformanceConfig = {
  // 默认质量设置（优化：增加更新间隔减少计算频率）
  DEFAULT_UPDATE_INTERVAL: 2000,        // 2 秒（从1秒增加到2秒）
  DEFAULT_INTERPOLATION: 'linear',
  DEFAULT_POSITION_THRESHOLD: 0.0001,   // 0.0001 AU ≈ 15 km
  
  // 性能阈值
  FPS_LOW_THRESHOLD: 30,
  FPS_HIGH_THRESHOLD: 55,
  FPS_SAMPLE_SIZE: 60,                  // 60 帧平均
  
  // 自适应调整
  QUALITY_ADJUSTMENT_COOLDOWN: 5000,    // 5 秒
  LOW_FPS_DURATION: 2000,               // 2 秒
  HIGH_FPS_DURATION: 5000,              // 5 秒
  
  // 包围球
  BOUNDING_SPHERE_UPDATE_THRESHOLD: 0.1, // 10%
  BOUNDING_SPHERE_MIN_INTERVAL: 5000,    // 5 秒
  
  // 日志
  ENABLE_PERFORMANCE_LOGGING: isDevelopment(),
  LOG_INTERVAL: 1000,                    // 每秒输出一次
};
