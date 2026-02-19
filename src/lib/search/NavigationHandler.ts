/**
 * NavigationHandler.ts - 天体导航处理器
 * 
 * 负责处理搜索结果的导航逻辑，支持太阳系天体和宇宙尺度天体的平滑导航
 * 
 * 导航策略：
 * - 太阳系天体：使用 CameraController 的 focusOnTarget 方法
 * - 宇宙尺度天体：使用对应渲染器的聚焦方法（如果可用）
 * - 平滑相机过渡动画
 * - 更新 Store 中的 selectedPlanet 状态
 */

import * as THREE from 'three';
import type { SceneManager } from '../3d/SceneManager';
import type { CameraController } from '../3d/CameraController';
import type { SolarSystemState } from '../state';
import type { IndexedCelestial } from './SearchIndex';
import { UniverseScale } from '../types/universeTypes';
import type { CelestialObject } from '../3d/FocusManager';

/**
 * 导航处理器类
 * 
 * 协调相机控制器和场景管理器，实现平滑的天体导航
 */
export class NavigationHandler {
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private store: SolarSystemState;

  constructor(
    sceneManager: SceneManager,
    cameraController: CameraController,
    store: SolarSystemState
  ) {
    this.sceneManager = sceneManager;
    this.cameraController = cameraController;
    this.store = store;
  }

  /**
   * 导航到指定天体
   * @param result - 搜索结果（索引中的天体数据）
   * @throws {Error} 当导航失败时抛出错误
   */
  async navigateTo(result: IndexedCelestial): Promise<void> {
    try {
      // 根据天体尺度选择导航策略
      switch (result.scale) {
        case UniverseScale.SolarSystem:
          this.navigateToSolarSystem(result);
          break;

        case UniverseScale.LocalGroup:
        case UniverseScale.NearbyGroups:
        case UniverseScale.VirgoSupercluster:
        case UniverseScale.LaniakeaSupercluster:
          this.navigateToUniverse(result);
          break;

        default:
          throw new Error(`不支持的天体尺度: ${result.scale}`);
      }

      // 更新 Store 状态
      this.store.selectPlanet(result.nameEn);

    } catch (error) {
      console.error('导航失败:', error);
      throw new Error(`无法导航到 ${result.nameZh || result.nameEn}: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 导航到太阳系天体
   * @param celestial - 天体数据
   * @private
   */
  private navigateToSolarSystem(celestial: IndexedCelestial): void {
    // 从 Store 中获取天体的详细信息
    const body = this.store.celestialBodies.find(b => b.name === celestial.nameEn);
    
    if (!body) {
      throw new Error(`未找到太阳系天体: ${celestial.nameEn}`);
    }

    // 构建 CelestialObject 用于 focusOnTarget
    const celestialObject: CelestialObject = {
      name: body.name,
      radius: body.radius,
      isSun: body.name === 'Sun',
      isSatellite: celestial.type === 'satellite',
    };

    // 获取天体的当前位置
    const targetPosition = new THREE.Vector3(body.x, body.y, body.z);

    // 创建跟踪函数，用于动态跟踪天体位置
    const trackingTargetGetter = () => {
      const currentBody = this.store.celestialBodies.find(b => b.name === celestial.nameEn);
      if (currentBody) {
        return new THREE.Vector3(currentBody.x, currentBody.y, currentBody.z);
      }
      return targetPosition;
    };

    // 使用 CameraController 的 focusOnTarget 方法
    this.cameraController.focusOnTarget(
      targetPosition,
      celestialObject,
      trackingTargetGetter
    );
  }

  /**
   * 导航到宇宙尺度天体
   * @param celestial - 天体数据
   * @private
   */
  private navigateToUniverse(celestial: IndexedCelestial): void {
    // 获取对应的渲染器
    let renderer: any = null;
    
    switch (celestial.scale) {
      case UniverseScale.LocalGroup:
        renderer = this.sceneManager.getLocalGroupRenderer();
        break;
      case UniverseScale.NearbyGroups:
        renderer = this.sceneManager.getNearbyGroupsRenderer();
        break;
      case UniverseScale.VirgoSupercluster:
        renderer = this.sceneManager.getVirgoSuperclusterRenderer();
        break;
      case UniverseScale.LaniakeaSupercluster:
        renderer = this.sceneManager.getLaniakeaSuperclusterRenderer();
        break;
    }

    if (!renderer) {
      throw new Error(`未找到 ${celestial.scale} 尺度的渲染器`);
    }

    // 使用 CameraController 的 focusOnTarget 方法进行导航
    // 对于宇宙尺度天体，我们不提供 CelestialObject，让系统使用默认距离
    const targetPosition = celestial.position.clone();
    
    // 根据天体类型和距离计算合适的观察距离
    const distance = this.calculateUniverseViewDistance(celestial);
    
    this.cameraController.focusOnTarget(
      targetPosition,
      undefined,
      undefined,
      { distance }
    );
  }

  /**
   * 计算宇宙尺度天体的观察距离
   * @param celestial - 天体数据
   * @returns 观察距离（AU）
   * @private
   */
  private calculateUniverseViewDistance(celestial: IndexedCelestial): number {
    // 基础距离倍数
    const baseMultiplier = 2.5;
    
    // 根据天体类型调整距离
    let typeMultiplier = 1.0;
    switch (celestial.type) {
      case 'galaxy':
        typeMultiplier = 1.5;
        break;
      case 'group':
        typeMultiplier = 2.0;
        break;
      case 'cluster':
        typeMultiplier = 2.5;
        break;
      case 'supercluster':
        typeMultiplier = 3.0;
        break;
    }

    // 如果有半径信息，使用半径计算距离
    if (celestial.metadata?.radius) {
      const radius = celestial.metadata.radius;
      // 将 Mpc 转换为 AU（假设 radius 是 Mpc）
      const MEGAPARSEC_TO_AU = 206264806.247;
      return radius * MEGAPARSEC_TO_AU * baseMultiplier * typeMultiplier;
    }

    // 如果有距离信息，使用距离的一定比例
    if (celestial.distance) {
      return celestial.distance * 0.1 * typeMultiplier;
    }

    // 默认距离
    return 1000 * typeMultiplier;
  }
}
