/**
 * MemoryManager.ts - 内存管理器
 * 
 * 管理渲染器的内存使用，自动释放远距离尺度的资源
 */

import { UniverseScale } from '../types/universeTypes';

/**
 * 内存管理器
 * 跟踪和管理渲染器的内存使用
 */
export class MemoryManager {
  private maxMemoryMB: number;
  private currentMemoryMB: number;
  private rendererMemory: Map<string, number>;

  /**
   * 创建内存管理器
   * 
   * @param maxMemoryMB - 最大内存限制（MB），默认 2000MB (2GB)
   */
  constructor(maxMemoryMB: number = 2000) {
    this.maxMemoryMB = maxMemoryMB;
    this.currentMemoryMB = 0;
    this.rendererMemory = new Map();
  }

  /**
   * 注册渲染器的内存使用
   * 
   * @param name - 渲染器名称
   * @param memoryMB - 内存使用量（MB）
   */
  registerRenderer(name: string, memoryMB: number): void {
    // 如果已注册，先注销
    if (this.rendererMemory.has(name)) {
      this.unregisterRenderer(name);
    }

    this.rendererMemory.set(name, memoryMB);
    this.currentMemoryMB += memoryMB;

    console.log(
      `Registered renderer "${name}": ${memoryMB}MB (Total: ${this.currentMemoryMB.toFixed(1)}MB / ${this.maxMemoryMB}MB)`
    );
  }

  /**
   * 注销渲染器的内存使用
   * 
   * @param name - 渲染器名称
   */
  unregisterRenderer(name: string): void {
    const memory = this.rendererMemory.get(name);
    if (memory !== undefined) {
      this.currentMemoryMB -= memory;
      this.rendererMemory.delete(name);

      console.log(
        `Unregistered renderer "${name}": ${memory}MB (Total: ${this.currentMemoryMB.toFixed(1)}MB / ${this.maxMemoryMB}MB)`
      );
    }
  }

  /**
   * 检查是否应该释放内存
   * 
   * @returns 是否应该释放内存
   */
  shouldReleaseMemory(): boolean {
    return this.currentMemoryMB > this.maxMemoryMB * 0.8;
  }

  /**
   * 释放远距离渲染器的内存
   * 
   * @param currentScale - 当前尺度
   */
  releaseDistantRenderers(currentScale: UniverseScale): void {
    const distantScales = this.getDistantScales(currentScale);

    console.log(`Releasing distant renderers from scale: ${currentScale}`);

    distantScales.forEach((scale) => {
      this.unregisterRenderer(scale);
    });
  }

  /**
   * 获取远距离尺度（距离 >= 3 级）
   * 
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

    return scales.filter((_, index) => {
      const distance = Math.abs(index - currentIndex);
      return distance >= 3;
    });
  }

  /**
   * 获取当前内存使用情况
   * 
   * @returns 内存使用信息
   */
  getMemoryUsage(): {
    current: number;
    max: number;
    percentage: number;
    renderers: Map<string, number>;
  } {
    return {
      current: this.currentMemoryMB,
      max: this.maxMemoryMB,
      percentage: (this.currentMemoryMB / this.maxMemoryMB) * 100,
      renderers: new Map(this.rendererMemory),
    };
  }

  /**
   * 设置最大内存限制
   * 
   * @param maxMemoryMB - 最大内存限制（MB）
   */
  setMaxMemory(maxMemoryMB: number): void {
    this.maxMemoryMB = maxMemoryMB;
  }

  /**
   * 获取内存使用百分比
   * 
   * @returns 内存使用百分比（0-100）
   */
  getMemoryPercentage(): number {
    return (this.currentMemoryMB / this.maxMemoryMB) * 100;
  }

  /**
   * 清空所有注册的渲染器
   */
  clear(): void {
    this.rendererMemory.clear();
    this.currentMemoryMB = 0;
  }

  /**
   * 获取内存使用报告（用于调试）
   * 
   * @returns 内存使用报告字符串
   */
  getMemoryReport(): string {
    const lines = [
      `Memory Usage: ${this.currentMemoryMB.toFixed(1)}MB / ${this.maxMemoryMB}MB (${this.getMemoryPercentage().toFixed(1)}%)`,
      'Renderers:',
    ];

    this.rendererMemory.forEach((memory, name) => {
      lines.push(`  - ${name}: ${memory.toFixed(1)}MB`);
    });

    return lines.join('\n');
  }
}
