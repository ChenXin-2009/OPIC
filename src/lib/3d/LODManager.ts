/**
 * @module 3d/LODManager
 * @description LOD（Level of Detail）细节层次管理器
 * 
 * 本模块根据相机距离动态调整渲染质量,优化大规模宇宙可视化的性能。
 * 使用分级策略在不同距离下使用不同的粒子密度和纹理分辨率。
 * 
 * @architecture
 * - 所属子系统：3D 渲染
 * - 架构层级：优化层
 * - 职责边界：负责 LOD 级别计算和渲染器配置,不负责具体的渲染逻辑
 * 
 * @dependencies
 * - 直接依赖：config/galaxyConfig, types/universeTypes
 * - 被依赖：3d/SceneManager, 3d/BaseUniverseRenderer
 * - 循环依赖：无
 * 
 * @renderPipeline
 * LOD 管理管线：
 * 1. 距离计算：获取相机到场景中心的距离
 * 2. 级别查找：二分查找确定当前 LOD 级别
 * 3. 参数应用：更新渲染器的粒子比例和纹理大小
 * 4. 性能优化：减少远距离时的渲染负载
 * 
 * @performance
 * - 使用二分查找算法（O(log n)）快速定位 LOD 级别
 * - 4 个 LOD 级别覆盖从太阳系到宇宙尺度
 * - 粒子比例从 100% 降至 5%（20倍性能提升）
 * - 纹理大小从 512px 降至 64px（64倍内存节省）
 * 
 * @unit
 * - 距离：AU（天文单位）
 * - 粒子比例：0.0-1.0（百分比）
 * - 纹理大小：像素（px）
 * 
 * @note
 * - LOD 级别定义：
 *   - Level 0: 0 AU, 100% 粒子, 512px 纹理
 *   - Level 1: 1亿光年, 50% 粒子, 256px 纹理
 *   - Level 2: 5亿光年, 20% 粒子, 128px 纹理
 *   - Level 3: 10亿光年, 5% 粒子, 64px 纹理
 * - 支持自定义 LOD 级别配置
 * - 渲染器需要实现 setParticleRatio() 和 setTextureSize() 方法
 * 
 * @example
 * ```typescript
 * import { LODManager } from '@/lib/3d';
 * 
 * const lodManager = new LODManager();
 * 
 * // 在动画循环中
 * const cameraDistance = camera.position.length();
 * const currentLOD = lodManager.getCurrentLOD(cameraDistance);
 * 
 * // 应用到渲染器
 * lodManager.updateRendererLOD(galaxyRenderer, currentLOD);
 * ```
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
