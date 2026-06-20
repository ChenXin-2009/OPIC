/**
 * @module 3d/LODManager
 * @description LOD（Level of Detail）细节层次管理器
 * 
 * 根据相机距离动态调整渲染质量,优化大规模宇宙可视化的性能。
 * 同时提供基于屏幕像素占比的天体几何体 LOD 计算。
 * 
 * @architecture
 * - 所属子系统：3D 渲染
 * - 架构层级：优化层
 * - 职责边界：负责 LOD 级别计算和渲染器配置,不负责具体的渲染逻辑
 */

import { LIGHT_YEAR_TO_AU } from '../config/galaxyConfig';
import type { LODLevel, UniverseScaleRenderer } from '../types/universeTypes';
import * as THREE from 'three';

// 屏幕像素占比 LOD 类型（新增）
export type PixelLODLevel = 'high' | 'medium' | 'low' | 'sprite';

export interface PixelLODResult {
  level: PixelLODLevel;
  segments: number;
  useBillboard: boolean;
  screenCoverage: number;
}

const PIXEL_LOD_CONFIG = {
  HIGH_THRESHOLD: 0.05,
  MEDIUM_THRESHOLD: 0.01,
  LOW_THRESHOLD: 0.002,
  HIGH_SEGMENTS: 128,
  MEDIUM_SEGMENTS: 64,
  LOW_SEGMENTS: 32,
  SPRITE_SEGMENTS: 8,
  BILLBOARD_MAX_PIXELS: 8,
};

/**
 * LOD 管理器
 * 
 * 两大功能：
 * 1. 宇宙尺度距离 LOD — getCurrentLOD() / updateRendererLOD() （原有 API）
 * 2. 像素占比几何体 LOD — computeLOD() / getRecommendedSegments() （新增）
 */
export class LODManager {
  private lodLevels: LODLevel[];

  constructor() {
    this.lodLevels = [
      {
        distance: 0,
        particleRatio: 1.0,
        textureSize: 512,
      },
      {
        distance: 100e6 * LIGHT_YEAR_TO_AU,
        particleRatio: 0.5,
        textureSize: 256,
      },
      {
        distance: 500e6 * LIGHT_YEAR_TO_AU,
        particleRatio: 0.2,
        textureSize: 128,
      },
      {
        distance: 1000e6 * LIGHT_YEAR_TO_AU,
        particleRatio: 0.05,
        textureSize: 64,
      },
    ];
  }

  // ============================================================
  // 宇宙尺度距离 LOD（原有 API — LaniakeaSuperclusterRenderer 等使用）
  // ============================================================

  /**
   * 获取当前相机距离对应的 LOD 级别
   */
  getCurrentLOD(cameraDistance: number): LODLevel {
    for (let i = this.lodLevels.length - 1; i >= 0; i--) {
      if (cameraDistance >= this.lodLevels[i].distance) {
        return this.lodLevels[i];
      }
    }
    return this.lodLevels[0];
  }

  /**
   * 更新渲染器的 LOD 设置
   */
  updateRendererLOD(renderer: UniverseScaleRenderer, lod: LODLevel): void {
    if (typeof (renderer as any).setParticleRatio === 'function') {
      (renderer as any).setParticleRatio(lod.particleRatio);
    }
    if (typeof (renderer as any).setTextureSize === 'function') {
      (renderer as any).setTextureSize(lod.textureSize);
    }
  }

  /**
   * 获取所有 LOD 级别
   */
  getLODLevels(): LODLevel[] {
    return [...this.lodLevels];
  }

  /**
   * 设置自定义 LOD 级别
   */
  setLODLevels(levels: LODLevel[]): void {
    this.lodLevels = [...levels].sort((a, b) => a.distance - b.distance);
  }

  /**
   * 获取 LOD 级别索引
   */
  getLODIndex(cameraDistance: number): number {
    const currentLOD = this.getCurrentLOD(cameraDistance);
    return this.lodLevels.indexOf(currentLOD);
  }

  /**
   * 获取 LOD 信息字符串（用于调试）
   */
  getLODInfo(cameraDistance: number): string {
    const lod = this.getCurrentLOD(cameraDistance);
    const index = this.getLODIndex(cameraDistance);
    return `LOD ${index}: Particle Ratio ${(lod.particleRatio * 100).toFixed(0)}%, Texture ${lod.textureSize}px`;
  }

  // ============================================================
  // 像素占比几何体 LOD（新增 API — Planet 等天体可用）
  // ============================================================

  /**
   * 根据天体半径、距离和相机计算像素 LOD 级别
   *
   * @param radius - 天体实际半径（世界单位）
   * @param distanceToCamera - 天体中心到相机距离（世界单位）
   * @param camera - 透视相机
   * @param fovScale - 可选的 FOV 缩放因子（默认 1.0）
   */
  computePixelLOD(
    radius: number,
    distanceToCamera: number,
    camera: THREE.PerspectiveCamera,
    fovScale: number = 1.0,
  ): PixelLODResult {
    const fov = (camera.fov * fovScale * Math.PI) / 180;
    const viewHeight = 2 * Math.tan(fov / 2) * distanceToCamera;
    const screenCoverage = (radius * 2) / viewHeight;

    const screenHeight =
      camera.view?.height ??
      (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const pixelDiameter = screenCoverage * screenHeight;

    if (screenCoverage > PIXEL_LOD_CONFIG.HIGH_THRESHOLD) {
      return {
        level: 'high',
        segments: PIXEL_LOD_CONFIG.HIGH_SEGMENTS,
        useBillboard: false,
        screenCoverage,
      };
    }
    if (screenCoverage > PIXEL_LOD_CONFIG.MEDIUM_THRESHOLD) {
      return {
        level: 'medium',
        segments: PIXEL_LOD_CONFIG.MEDIUM_SEGMENTS,
        useBillboard: false,
        screenCoverage,
      };
    }
    if (screenCoverage > PIXEL_LOD_CONFIG.LOW_THRESHOLD) {
      return {
        level: 'low',
        segments: PIXEL_LOD_CONFIG.LOW_SEGMENTS,
        useBillboard: false,
        screenCoverage,
      };
    }
    return {
      level: 'sprite',
      segments: PIXEL_LOD_CONFIG.SPRITE_SEGMENTS,
      useBillboard: pixelDiameter < PIXEL_LOD_CONFIG.BILLBOARD_MAX_PIXELS,
      screenCoverage,
    };
  }

  /**
   * 获取推荐的球体几何体分段数
   */
  getRecommendedSegments(
    radius: number,
    distanceToCamera: number,
    camera: THREE.PerspectiveCamera,
  ): number {
    return this.computePixelLOD(radius, distanceToCamera, camera).segments;
  }

  /**
   * 判断是否应该使用 Billboard
   */
  shouldUseBillboard(
    radius: number,
    distanceToCamera: number,
    camera: THREE.PerspectiveCamera,
  ): boolean {
    return this.computePixelLOD(radius, distanceToCamera, camera).useBillboard;
  }
}

/** 便捷单例导出 — 兼容新增用法 */
export const lodManager = LODManager.prototype;
