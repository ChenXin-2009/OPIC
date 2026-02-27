/**
 * QualityController.ts - 自适应质量控制器
 * 
 * 功能：
 * - 根据性能指标自适应调整渲染质量
 * - 监控 FPS，自动降低或提升质量
 * - 管理质量设置（更新间隔、插值方法等）
 * - 实现调整冷却机制，避免频繁调整
 * 
 * 使用：
 * - 每帧调用 adjustQuality() 检查并调整质量
 * - 通过 getSettings() 获取当前质量设置
 * - 使用 setSettings() 手动设置质量
 */

import { PerformanceMonitor } from './PerformanceMonitor';
import { PERFORMANCE_CONFIG } from './performanceConfig';
import type { InterpolationMethod } from './PositionInterpolator';

/**
 * 质量设置接口
 */
export interface QualitySettings {
  /** SGP4 计算间隔（毫秒） */
  updateInterval: number;
  
  /** 插值方法 */
  interpolationMethod: InterpolationMethod;
  
  /** 最大卫星数量 */
  maxSatellites: number;
  
  /** 是否启用包围球优化 */
  enableBoundingSphere: boolean;
  
  /** 位置变化阈值（AU） */
  positionThreshold: number;
  
  /** 包围球更新阈值（百分比） */
  boundingSphereUpdateThreshold: number;
}

/**
 * 质量级别枚举
 */
export enum QualityLevel {
  /** 低质量 */
  LOW = 'low',
  /** 中质量 */
  MEDIUM = 'medium',
  /** 高质量 */
  HIGH = 'high'
}

/**
 * QualityController - 自适应质量控制器
 * 
 * 负责根据性能指标自动调整渲染质量。
 * 监控平均 FPS，低于阈值时降低质量，高于阈值时提升质量。
 * 
 * 核心功能：
 * - FPS 监控（基于 PerformanceMonitor）
 * - 质量调整（更新间隔、插值方法）
 * - 冷却机制（避免频繁调整）
 * - 质量级别管理
 * 
 * @example
 * ```typescript
 * const controller = new QualityController(performanceMonitor);
 * 
 * // 在渲染循环中
 * controller.adjustQuality();
 * 
 * // 获取当前设置
 * const settings = controller.getSettings();
 * ```
 */
export class QualityController {
  /** 当前质量设置 */
  private currentSettings: QualitySettings;
  
  /** 性能监控器 */
  private performanceMonitor: PerformanceMonitor;
  
  /** FPS 阈值 */
  private fpsThresholds: { low: number; high: number };
  
  /** 调整冷却时间（毫秒） */
  private adjustmentCooldown: number;
  
  /** 最后调整时间 */
  private lastAdjustmentTime: number;
  
  /** 低 FPS 开始时间 */
  private lowFpsStartTime: number;
  
  /** 高 FPS 开始时间 */
  private highFpsStartTime: number;
  
  /** 低 FPS 持续时间阈值（毫秒） */
  private lowFpsDuration: number;
  
  /** 高 FPS 持续时间阈值（毫秒） */
  private highFpsDuration: number;
  
  /** 当前质量级别 */
  private currentQualityLevel: QualityLevel;
  
  /**
   * 创建质量控制器实例
   * 
   * @param performanceMonitor - 性能监控器实例
   */
  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor;
    
    // 初始化 FPS 阈值
    this.fpsThresholds = {
      low: PERFORMANCE_CONFIG.FPS_LOW_THRESHOLD,
      high: PERFORMANCE_CONFIG.FPS_HIGH_THRESHOLD
    };
    
    // 初始化冷却时间
    this.adjustmentCooldown = PERFORMANCE_CONFIG.QUALITY_ADJUSTMENT_COOLDOWN;
    this.lastAdjustmentTime = 0;
    
    // 初始化持续时间阈值
    this.lowFpsDuration = PERFORMANCE_CONFIG.LOW_FPS_DURATION;
    this.highFpsDuration = PERFORMANCE_CONFIG.HIGH_FPS_DURATION;
    
    // 初始化时间戳
    this.lowFpsStartTime = 0;
    this.highFpsStartTime = 0;
    
    // 初始化质量级别
    this.currentQualityLevel = QualityLevel.MEDIUM;
    
    // 初始化默认质量设置
    this.currentSettings = {
      updateInterval: PERFORMANCE_CONFIG.DEFAULT_UPDATE_INTERVAL,
      interpolationMethod: PERFORMANCE_CONFIG.DEFAULT_INTERPOLATION,
      maxSatellites: 100000,
      enableBoundingSphere: true,
      positionThreshold: PERFORMANCE_CONFIG.DEFAULT_POSITION_THRESHOLD,
      boundingSphereUpdateThreshold: PERFORMANCE_CONFIG.BOUNDING_SPHERE_UPDATE_THRESHOLD
    };
  }
  
  /**
   * 根据性能指标调整质量
   * 
   * 监控平均 FPS，根据阈值和持续时间决定是否调整质量。
   * 使用冷却机制避免频繁调整。
   * 
   * @example
   * ```typescript
   * // 在渲染循环中
   * function animate() {
   *   // ... 渲染操作 ...
   *   controller.adjustQuality();
   * }
   * ```
   */
  adjustQuality(): void {
    const now = Date.now();
    
    // 检查冷却时间
    if (now - this.lastAdjustmentTime < this.adjustmentCooldown) {
      return;
    }
    
    const avgFps = this.performanceMonitor.getAverageFPS();
    
    // 检查低 FPS
    if (avgFps < this.fpsThresholds.low) {
      if (this.lowFpsStartTime === 0) {
        this.lowFpsStartTime = now;
      } else if (now - this.lowFpsStartTime >= this.lowFpsDuration) {
        // 低 FPS 持续超过阈值，降低质量
        this.decreaseQuality();
        this.lowFpsStartTime = 0;
        this.highFpsStartTime = 0;
        this.lastAdjustmentTime = now;
      }
    } else {
      // 重置低 FPS 计时
      this.lowFpsStartTime = 0;
    }
    
    // 检查高 FPS
    if (avgFps > this.fpsThresholds.high) {
      if (this.highFpsStartTime === 0) {
        this.highFpsStartTime = now;
      } else if (now - this.highFpsStartTime >= this.highFpsDuration) {
        // 高 FPS 持续超过阈值，提升质量
        this.increaseQuality();
        this.lowFpsStartTime = 0;
        this.highFpsStartTime = 0;
        this.lastAdjustmentTime = now;
      }
    } else {
      // 重置高 FPS 计时
      this.highFpsStartTime = 0;
    }
  }
  
  /**
   * 降低渲染质量
   * 
   * 调整策略：
   * - 增加更新间隔（2000ms → 4000ms → 8000ms）
   * - 切换到线性插值
   * - 降低位置阈值
   */
  private decreaseQuality(): void {
    if (this.currentQualityLevel === QualityLevel.LOW) {
      // 已经是最低质量，无法继续降低
      return;
    }
    
    if (this.currentQualityLevel === QualityLevel.HIGH) {
      // 从高质量降到中质量
      this.currentQualityLevel = QualityLevel.MEDIUM;
      this.currentSettings.updateInterval = 2000;
      this.currentSettings.interpolationMethod = 'linear';
    } else if (this.currentQualityLevel === QualityLevel.MEDIUM) {
      // 从中质量降到低质量（优化：大幅增加更新间隔）
      this.currentQualityLevel = QualityLevel.LOW;
      this.currentSettings.updateInterval = 4000; // 4秒（从2秒增加）
      this.currentSettings.interpolationMethod = 'linear';
      this.currentSettings.positionThreshold = 0.0002; // 降低精度
    }
  }
  
  /**
   * 提升渲染质量
   * 
   * 调整策略：
   * - 减少更新间隔（8000ms → 4000ms → 1000ms）
   * - 切换到三次插值（如果支持）
   * - 提高位置阈值
   */
  private increaseQuality(): void {
    if (this.currentQualityLevel === QualityLevel.HIGH) {
      // 已经是最高质量，无法继续提升
      return;
    }
    
    if (this.currentQualityLevel === QualityLevel.LOW) {
      // 从低质量升到中质量
      this.currentQualityLevel = QualityLevel.MEDIUM;
      this.currentSettings.updateInterval = 2000;
      this.currentSettings.interpolationMethod = 'linear';
      this.currentSettings.positionThreshold = 0.0001;
    } else if (this.currentQualityLevel === QualityLevel.MEDIUM) {
      // 从中质量升到高质量
      this.currentQualityLevel = QualityLevel.HIGH;
      this.currentSettings.updateInterval = 1000;
      this.currentSettings.interpolationMethod = 'linear'; // 暂时保持线性插值
    }
  }
  
  /**
   * 获取当前质量设置
   * 
   * @returns 质量设置
   * 
   * @example
   * ```typescript
   * const settings = controller.getSettings();
   * console.log(`Update Interval: ${settings.updateInterval}ms`);
   * ```
   */
  getSettings(): QualitySettings {
    return { ...this.currentSettings };
  }
  
  /**
   * 手动设置质量
   * 
   * @param settings - 部分质量设置
   * 
   * @example
   * ```typescript
   * controller.setSettings({
   *   updateInterval: 1500,
   *   interpolationMethod: 'linear'
   * });
   * ```
   */
  setSettings(settings: Partial<QualitySettings>): void {
    this.currentSettings = {
      ...this.currentSettings,
      ...settings
    };
    
    // 重置调整时间
    this.lastAdjustmentTime = Date.now();
  }
  
  /**
   * 获取当前质量级别
   * 
   * @returns 质量级别
   */
  getQualityLevel(): QualityLevel {
    return this.currentQualityLevel;
  }
  
  /**
   * 设置质量级别
   * 
   * @param level - 质量级别
   */
  setQualityLevel(level: QualityLevel): void {
    this.currentQualityLevel = level;
    
    // 根据质量级别设置参数（优化：调整更新间隔）
    switch (level) {
      case QualityLevel.LOW:
        this.currentSettings.updateInterval = 4000; // 4秒
        this.currentSettings.interpolationMethod = 'linear';
        this.currentSettings.positionThreshold = 0.0002;
        break;
      case QualityLevel.MEDIUM:
        this.currentSettings.updateInterval = 2000; // 2秒
        this.currentSettings.interpolationMethod = 'linear';
        this.currentSettings.positionThreshold = 0.0001;
        break;
      case QualityLevel.HIGH:
        this.currentSettings.updateInterval = 1000; // 1秒
        this.currentSettings.interpolationMethod = 'linear';
        this.currentSettings.positionThreshold = 0.0001;
        break;
    }
    
    // 重置调整时间
    this.lastAdjustmentTime = Date.now();
  }
  
  /**
   * 判断是否为最低质量
   * 
   * @returns 是否为最低质量
   */
  isAtLowestQuality(): boolean {
    return this.currentQualityLevel === QualityLevel.LOW;
  }
  
  /**
   * 判断是否为最高质量
   * 
   * @returns 是否为最高质量
   */
  isAtHighestQuality(): boolean {
    return this.currentQualityLevel === QualityLevel.HIGH;
  }
  
  /**
   * 设置 FPS 阈值
   * 
   * @param low - 低 FPS 阈值
   * @param high - 高 FPS 阈值
   */
  setFpsThresholds(low: number, high: number): void {
    this.fpsThresholds = { low, high };
  }
  
  /**
   * 获取 FPS 阈值
   * 
   * @returns FPS 阈值
   */
  getFpsThresholds(): { low: number; high: number } {
    return { ...this.fpsThresholds };
  }
  
  /**
   * 设置调整冷却时间
   * 
   * @param cooldown - 冷却时间（毫秒）
   */
  setAdjustmentCooldown(cooldown: number): void {
    this.adjustmentCooldown = cooldown;
  }
  
  /**
   * 获取调整冷却时间
   * 
   * @returns 冷却时间（毫秒）
   */
  getAdjustmentCooldown(): number {
    return this.adjustmentCooldown;
  }
  
  /**
   * 重置质量控制器
   * 
   * 恢复到默认设置。
   */
  reset(): void {
    this.currentQualityLevel = QualityLevel.MEDIUM;
    this.lastAdjustmentTime = 0;
    this.lowFpsStartTime = 0;
    this.highFpsStartTime = 0;
    
    this.currentSettings = {
      updateInterval: PERFORMANCE_CONFIG.DEFAULT_UPDATE_INTERVAL,
      interpolationMethod: PERFORMANCE_CONFIG.DEFAULT_INTERPOLATION,
      maxSatellites: 100000,
      enableBoundingSphere: true,
      positionThreshold: PERFORMANCE_CONFIG.DEFAULT_POSITION_THRESHOLD,
      boundingSphereUpdateThreshold: PERFORMANCE_CONFIG.BOUNDING_SPHERE_UPDATE_THRESHOLD
    };
  }
}
