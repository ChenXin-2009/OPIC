/**
 * @module 3d/BaseUniverseRenderer
 * @description 宇宙尺度渲染器抽象基类
 * 
 * 本模块为所有宇宙尺度渲染器（本星系群、近邻星系群、室女座超星系团、拉尼亚凯亚超星系团）
 * 提供统一的接口和公共功能。使用模板方法模式,子类只需实现特定的数据加载和渲染逻辑。
 * 
 * @architecture
 * - 所属子系统：3D 渲染
 * - 架构层级：核心层（抽象基类）
 * - 职责边界：定义宇宙尺度渲染器的通用接口,不负责具体数据格式和渲染细节
 * - 设计模式：模板方法模式（Template Method Pattern）
 * 
 * @dependencies
 * - 直接依赖：three, types/universeTypes
 * - 被依赖：3d/LocalGroupRenderer, 3d/NearbyGroupsRenderer, 3d/VirgoSuperclusterRenderer, 3d/LaniakeaSuperclusterRenderer
 * - 循环依赖：无
 * 
 * @renderPipeline
 * 渲染管线阶段：
 * 1. 初始化：创建 Three.js Group 容器
 * 2. 数据加载：子类实现 loadData() 加载特定数据
 * 3. 透明度计算：根据相机距离计算淡入淡出效果
 * 4. 可见性更新：动态显示/隐藏渲染组
 * 5. 亮度调整：子类实现 setBrightness() 调整视觉效果
 * 6. 资源清理：dispose() 释放 WebGL 资源
 * 
 * @performance
 * - 基于距离的透明度计算避免突兀的显示/隐藏
 * - 可见性判断优化渲染性能（不可见时跳过渲染）
 * - 统一的资源管理接口便于内存优化
 * 
 * @coordinateSystem
 * - 使用超星系团坐标系（Supergalactic Coordinate System）
 * - 原点：本星系群质心
 * - 单位：Mpc（百万秒差距）
 * 
 * @note
 * - 这是一个抽象基类,不能直接实例化
 * - 子类必须实现 loadData() 和 setBrightness() 方法
 * - 透明度配置（fadeStart, showStart, showFull）控制多尺度视图切换
 * 
 * @example
 * ```typescript
 * // 子类实现示例
 * class LocalGroupRenderer extends BaseUniverseRenderer {
 *   constructor() {
 *     super('LocalGroup', {
 *       fadeStart: 1000,
 *       showStart: 2000,
 *       showFull: 5000
 *     });
 *   }
 * 
 *   async loadData(dataUrl: string): Promise<void> {
 *     // 加载本星系群数据
 *   }
 * 
 *   setBrightness(brightness: number): void {
 *     // 调整星系亮度
 *   }
 * }
 * ```
 */

import * as THREE from 'three';
import type { UniverseScaleRenderer } from '../types/universeTypes';

export interface OpacityConfig {
  fadeStart: number;
  showStart: number;
  showFull: number;
}

/**
 * 宇宙渲染器抽象基类
 */
export abstract class BaseUniverseRenderer implements UniverseScaleRenderer {
  protected group: THREE.Group;
  protected opacity: number = 0;
  protected isVisible: boolean = false;
  protected opacityConfig: OpacityConfig;

  constructor(name: string, opacityConfig: OpacityConfig) {
    this.group = new THREE.Group();
    this.group.name = name;
    this.opacityConfig = opacityConfig;
  }

  /**
   * 获取渲染组
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * 获取当前透明度
   */
  getOpacity(): number {
    return this.opacity;
  }

  /**
   * 获取可见性状态
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * 计算基于距离的透明度
   * 使用配置的淡入淡出距离
   */
  protected calculateOpacity(cameraDistance: number): number {
    const { fadeStart, showStart, showFull } = this.opacityConfig;

    if (cameraDistance < fadeStart) {
      return 0;
    } else if (cameraDistance < showStart) {
      return (cameraDistance - fadeStart) / (showStart - fadeStart);
    } else if (cameraDistance < showFull) {
      return 1;
    } else {
      return 1;
    }
  }

  /**
   * 更新渲染器状态
   * 子类可以重写此方法添加额外逻辑
   */
  update(cameraDistance: number, deltaTime: number): void {
    this.opacity = this.calculateOpacity(cameraDistance);
    this.isVisible = this.opacity > 0.01;
    this.group.visible = this.isVisible;
  }

  /**
   * 设置亮度
   * 子类必须实现此方法
   */
  abstract setBrightness(brightness: number): void;

  /**
   * 加载数据
   * 子类必须实现此方法
   */
  abstract loadData(...args: any[]): Promise<void>;

  /**
   * 清理资源
   * 子类应该重写此方法清理特定资源
   */
  dispose(): void {
    this.group.clear();
  }
}
