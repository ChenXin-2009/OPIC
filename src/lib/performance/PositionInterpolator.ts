/**
 * PositionInterpolator.ts - 卫星位置插值器
 * 
 * 功能：
 * - 在两次 SGP4 计算之间插值卫星位置
 * - 实现线性插值算法，实现平滑的 60fps 运动
 * - 支持批量插值计算
 * - 管理插值状态和进度
 * 
 * 使用：
 * - 当 SGP4 计算完成时，调用 setTarget() 设置新的目标位置
 * - 在每帧渲染时，调用 getInterpolatedPositions() 获取插值位置
 */

import { Vector3 } from 'three';

/**
 * 插值状态接口
 * 
 * 存储单个卫星的插值状态，包括起始位置、目标位置和时间信息
 */
export interface InterpolationState {
  /** 卫星 NORAD ID */
  noradId: number;
  /** 起始位置（上次计算结果） */
  startPosition: Vector3;
  /** 目标位置（最新计算结果） */
  endPosition: Vector3;
  /** 起始时间戳（毫秒） */
  startTime: number;
  /** 目标时间戳（毫秒） */
  endTime: number;
  /** 当前进度 [0.0, 1.0] */
  currentProgress: number;
}

/**
 * 插值方法类型
 */
export type InterpolationMethod = 'linear' | 'cubic';

/**
 * PositionInterpolator - 卫星位置插值器
 * 
 * 负责在两次 SGP4 计算之间插值卫星位置，实现平滑的 60fps 运动。
 * 使用线性插值算法：position = start + (end - start) * progress
 * 
 * 核心功能：
 * - 设置插值目标位置
 * - 计算单个卫星的插值位置
 * - 批量计算所有卫星的插值位置
 * - 管理插值状态
 * 
 * @example
 * ```typescript
 * const interpolator = new PositionInterpolator();
 * 
 * // 设置目标位置
 * interpolator.setTarget(25544, newPosition, Date.now() + 1000);
 * 
 * // 获取插值位置
 * const position = interpolator.getInterpolatedPosition(25544, Date.now());
 * 
 * // 批量获取所有插值位置
 * const positions = interpolator.getInterpolatedPositions(Date.now());
 * ```
 */
export class PositionInterpolator {
  /** 插值状态映射表 */
  private states: Map<number, InterpolationState>;
  
  /** 插值方法（默认线性插值） */
  private interpolationMethod: InterpolationMethod;
  
  /**
   * 创建位置插值器实例
   * 
   * @param interpolationMethod - 插值方法，默认 'linear'
   */
  constructor(interpolationMethod: InterpolationMethod = 'linear') {
    this.states = new Map();
    this.interpolationMethod = interpolationMethod;
  }
  
  /**
   * 设置新的目标位置
   * 
   * 当 SGP4 计算完成时调用此方法，设置新的插值目标。
   * 如果卫星已有插值状态，则将当前插值位置作为新的起始位置，
   * 实现平滑过渡。
   * 
   * @param noradId - 卫星 NORAD ID
   * @param newPosition - 新的目标位置
   * @param timestamp - 计算时间戳（毫秒）
   * 
   * @example
   * ```typescript
   * // SGP4 计算完成后
   * interpolator.setTarget(25544, new Vector3(6.8, 0, 0), Date.now() + 1000);
   * ```
   */
  setTarget(noradId: number, newPosition: Vector3, timestamp: number): void {
    const existingState = this.states.get(noradId);
    const currentTime = Date.now();
    
    if (existingState) {
      // 如果已有插值状态，使用当前插值位置作为新的起始位置
      const currentPosition = this.getInterpolatedPosition(noradId, currentTime);
      
      this.states.set(noradId, {
        noradId,
        startPosition: currentPosition,
        endPosition: newPosition.clone(),
        startTime: currentTime,
        endTime: timestamp,
        currentProgress: 0
      });
    } else {
      // 首次设置，直接使用新位置作为起始和目标（立即显示）
      // 这样卫星会立即出现在正确位置，下次更新时才开始插值
      this.states.set(noradId, {
        noradId,
        startPosition: newPosition.clone(),
        endPosition: newPosition.clone(),
        startTime: currentTime,
        endTime: timestamp,
        currentProgress: 1 // 设置为已完成，避免插值
      });
    }
  }
  
  /**
   * 获取当前插值位置
   * 
   * 根据当前时间计算插值进度，并返回插值后的位置。
   * 使用球面线性插值 (Slerp) 而不是线性插值，使卫星沿圆弧运动。
   * 
   * @param noradId - 卫星 NORAD ID
   * @param currentTime - 当前时间戳（毫秒）
   * @returns 插值后的位置
   * 
   * @example
   * ```typescript
   * const position = interpolator.getInterpolatedPosition(25544, Date.now());
   * ```
   */
  getInterpolatedPosition(noradId: number, currentTime: number): Vector3 {
    const state = this.states.get(noradId);
    
    if (!state) {
      // 如果没有插值状态，返回零向量
      return new Vector3(0, 0, 0);
    }
    
    // 计算插值进度
    const duration = state.endTime - state.startTime;
    
    if (duration <= 0) {
      // 如果时间间隔无效，返回目标位置
      return state.endPosition.clone();
    }
    
    const elapsed = currentTime - state.startTime;
    let progress = elapsed / duration;
    
    // 限制进度范围 [0, 1]
    progress = Math.max(0, Math.min(1, progress));
    
    // 更新状态中的进度
    state.currentProgress = progress;
    
    // 使用球面线性插值 (Slerp) 而不是线性插值
    // Slerp 使卫星沿着圆弧运动，而不是直线
    const interpolatedPosition = this.slerp(
      state.startPosition,
      state.endPosition,
      progress
    );
    
    return interpolatedPosition;
  }
  
  /**
   * 球面线性插值 (Slerp)
   * 
   * 在两个向量之间进行球面插值，使插值路径沿着圆弧。
   * 这对于轨道运动非常重要，因为卫星应该沿着轨道弧线运动，而不是直线。
   * 
   * @param start - 起始向量
   * @param end - 目标向量
   * @param t - 插值参数 [0, 1]
   * @returns 插值后的向量
   */
  private slerp(start: Vector3, end: Vector3, t: number): Vector3 {
    // 如果进度为 0 或 1，直接返回起点或终点
    if (t <= 0) return start.clone();
    if (t >= 1) return end.clone();
    
    // 计算向量长度（到地心的距离）
    const startLength = start.length();
    const endLength = end.length();
    
    // 如果任一向量长度为 0，回退到线性插值
    if (startLength === 0 || endLength === 0) {
      return new Vector3(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      );
    }
    
    // 归一化向量
    const startNorm = start.clone().normalize();
    const endNorm = end.clone().normalize();
    
    // 计算两个向量之间的夹角
    let dot = startNorm.dot(endNorm);
    
    // 限制 dot 在 [-1, 1] 范围内，避免数值误差
    dot = Math.max(-1, Math.min(1, dot));
    
    // 计算夹角
    const theta = Math.acos(dot);
    
    // 如果夹角很小（向量几乎平行），使用线性插值
    if (Math.abs(theta) < 0.001) {
      return new Vector3(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      );
    }
    
    // 球面线性插值公式
    const sinTheta = Math.sin(theta);
    const weight1 = Math.sin((1 - t) * theta) / sinTheta;
    const weight2 = Math.sin(t * theta) / sinTheta;
    
    // 计算插值方向
    const direction = new Vector3(
      startNorm.x * weight1 + endNorm.x * weight2,
      startNorm.y * weight1 + endNorm.y * weight2,
      startNorm.z * weight1 + endNorm.z * weight2
    );
    
    // 插值半径（到地心的距离）
    const radius = startLength + (endLength - startLength) * t;
    
    // 返回插值后的位置
    return direction.multiplyScalar(radius);
  }
  
  /**
   * 批量获取所有卫星的插值位置
   * 
   * 遍历所有插值状态，计算每个卫星的插值位置。
   * 这是渲染循环中每帧调用的主要方法。
   * 
   * @param currentTime - 当前时间戳（毫秒）
   * @returns 位置映射表，键为 NORAD ID，值为插值位置
   * 
   * @example
   * ```typescript
   * // 在渲染循环中
   * const positions = interpolator.getInterpolatedPositions(Date.now());
   * positions.forEach((position, noradId) => {
   *   // 更新渲染
   * });
   * ```
   */
  getInterpolatedPositions(currentTime: number): Map<number, Vector3> {
    const positions = new Map<number, Vector3>();
    
    this.states.forEach((_state, noradId) => {
      const position = this.getInterpolatedPosition(noradId, currentTime);
      positions.set(noradId, position);
    });
    
    return positions;
  }
  
  /**
   * 清除指定卫星的插值状态
   * 
   * 当卫星不再可见或被移除时调用。
   * 
   * @param noradId - 卫星 NORAD ID
   * 
   * @example
   * ```typescript
   * interpolator.clear(25544);
   * ```
   */
  clear(noradId: number): void {
    this.states.delete(noradId);
  }
  
  /**
   * 清除所有插值状态
   * 
   * 重置插值器，清空所有卫星的插值状态。
   * 
   * @example
   * ```typescript
   * interpolator.clearAll();
   * ```
   */
  clearAll(): void {
    this.states.clear();
  }
  
  /**
   * 获取插值状态数量
   * 
   * 返回当前管理的卫星数量。
   * 
   * @returns 插值状态数量
   */
  getStateCount(): number {
    return this.states.size;
  }
  
  /**
   * 获取指定卫星的插值状态
   * 
   * 用于调试和监控。
   * 
   * @param noradId - 卫星 NORAD ID
   * @returns 插值状态，如果不存在则返回 undefined
   */
  getState(noradId: number): InterpolationState | undefined {
    return this.states.get(noradId);
  }
  
  /**
   * 设置插值方法
   * 
   * 动态切换插值算法（当前仅支持线性插值）。
   * 
   * @param method - 插值方法
   */
  setInterpolationMethod(method: InterpolationMethod): void {
    this.interpolationMethod = method;
  }
  
  /**
   * 获取当前插值方法
   * 
   * @returns 插值方法
   */
  getInterpolationMethod(): InterpolationMethod {
    return this.interpolationMethod;
  }
}
