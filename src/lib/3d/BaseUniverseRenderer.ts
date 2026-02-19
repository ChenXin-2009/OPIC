/**
 * BaseUniverseRenderer - 宇宙尺度渲染器基类
 * 
 * 提供所有宇宙尺度渲染器的公共功能和接口
 * 子类只需实现特定的数据加载和渲染逻辑
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
