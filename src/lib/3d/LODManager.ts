/**
 * LODManager.ts - LOD（细节层次）管理器
 * 
 * 根据相机距离动态调整渲染质量以优化性能
 */

import { LIGHT_YEAR_TO_AU } from '../config/galaxyConfig';
import type { LODLevel, UniverseScaleRenderer } from '../types/universeTypes';

/**
 * LOD 管理器
 * 根据相机距离自动调整渲染质量
 */
export class LODManager {
  private lodLevels: LODLevel[];

  constructor() {
    // 定义 4 个 LOD 级别
    this.lodLevels = [
      {
        distance: 0,
        particleRatio: 1.0,
        textureSize: 512,
      },
      {
        distance: 100e6 * LIGHT_YEAR_TO_AU, // 1亿光年
        particleRatio: 0.5,
        textureSize: 256,
      },
      {
        distance: 500e6 * LIGHT_YEAR_TO_AU, // 5亿光年
        particleRatio: 0.2,
        textureSize: 128,
      },
      {
        distance: 1000e6 * LIGHT_YEAR_TO_AU, // 10亿光年
        particleRatio: 0.05,
        textureSize: 64,
      },
    ];
  }

  /**
   * 获取当前相机距离对应的 LOD 级别
   * 使用二分查找优化性能
   * 
   * @param cameraDistance - 相机距离（AU）
   * @returns LOD 级别
   */
  getCurrentLOD(cameraDistance: number): LODLevel {
    // 二分查找
    let left = 0;
    let right = this.lodLevels.length - 1;
    let result = this.lodLevels[0];

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const level = this.lodLevels[mid];

      if (cameraDistance >= level.distance) {
        result = level;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }

  /**
   * 更新渲染器的 LOD 设置
   * 
   * @param renderer - 宇宙尺度渲染器
   * @param lod - LOD 级别
   */
  updateRendererLOD(renderer: UniverseScaleRenderer, lod: LODLevel): void {
    // 检查渲染器是否支持 LOD 设置
    if (typeof (renderer as any).setParticleRatio === 'function') {
      (renderer as any).setParticleRatio(lod.particleRatio);
    }

    if (typeof (renderer as any).setTextureSize === 'function') {
      (renderer as any).setTextureSize(lod.textureSize);
    }
  }

  /**
   * 获取所有 LOD 级别
   * 
   * @returns LOD 级别数组
   */
  getLODLevels(): LODLevel[] {
    return [...this.lodLevels];
  }

  /**
   * 设置自定义 LOD 级别
   * 
   * @param levels - LOD 级别数组
   */
  setLODLevels(levels: LODLevel[]): void {
    // 按距离排序
    this.lodLevels = [...levels].sort((a, b) => a.distance - b.distance);
  }

  /**
   * 获取 LOD 级别索引
   * 
   * @param cameraDistance - 相机距离（AU）
   * @returns LOD 级别索引（0-3）
   */
  getLODIndex(cameraDistance: number): number {
    const currentLOD = this.getCurrentLOD(cameraDistance);
    return this.lodLevels.indexOf(currentLOD);
  }

  /**
   * 获取 LOD 信息字符串（用于调试）
   * 
   * @param cameraDistance - 相机距离（AU）
   * @returns LOD 信息字符串
   */
  getLODInfo(cameraDistance: number): string {
    const lod = this.getCurrentLOD(cameraDistance);
    const index = this.getLODIndex(cameraDistance);
    
    return `LOD ${index}: Particle Ratio ${(lod.particleRatio * 100).toFixed(0)}%, Texture ${lod.textureSize}px`;
  }
}
