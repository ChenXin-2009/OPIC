/**
 * @module mod-manager/api/CameraAPI
 * @description 相机API实现
 * 
 * 提供MOD对相机系统的访问和控制。
 */

import type { CameraAPI as ICameraAPI, ViewOffset, CameraState } from '../types';
import { ZOOM_BOUNDS } from '../types';
import { getEventBus } from '../core/EventBus';

/**
 * 相机API实现类
 */
export class CameraAPIImpl implements ICameraAPI {
  private eventBus = getEventBus();
  private cameraListeners: Set<(state: CameraState) => void> = new Set();

  // 内部状态
  private _cameraDistance: number = 50; // AU
  private _viewOffset: ViewOffset = { x: 0, y: 0 }; // AU
  private _zoom: number = 100;
  private _focusedPlanet: string | null = null;

  /**
   * 获取相机距离（AU）
   */
  get cameraDistance(): number {
    return this._cameraDistance;
  }

  /**
   * 获取视图偏移
   */
  get viewOffset(): ViewOffset {
    return { ...this._viewOffset };
  }

  /**
   * 获取缩放级别
   */
  get zoom(): number {
    return this._zoom;
  }

  /**
   * 设置相机距离
   */
  setCameraDistance(distance: number): void {
    this._cameraDistance = Math.max(0.1, distance);
    this.notifyCameraChange();
  }

  /**
   * 设置视图偏移
   */
  setViewOffset(offset: ViewOffset): void {
    this._viewOffset = { ...offset };
    this.notifyCameraChange();
  }

  /**
   * 设置缩放级别
   */
  setZoom(zoom: number): void {
    // 边界限制
    const clampedZoom = Math.max(
      ZOOM_BOUNDS.MIN,
      Math.min(ZOOM_BOUNDS.MAX, zoom)
    );
    this._zoom = clampedZoom;
    this.notifyCameraChange();
  }

  /**
   * 聚焦到行星
   */
  centerOnPlanet(name: string): boolean {
    // 实际应用中需要查找行星位置并移动相机
    // 这里简化实现
    this._focusedPlanet = name;
    this.eventBus.emit('camera:focus', { planet: name });
    this.notifyCameraChange();
    return true;
  }

  /**
   * 订阅相机变化
   */
  onCameraChange(callback: (state: CameraState) => void): () => void {
    this.cameraListeners.add(callback);
    return () => this.cameraListeners.delete(callback);
  }

  /**
   * 通知相机变化
   */
  private notifyCameraChange(): void {
    const state: CameraState = {
      distance: this._cameraDistance,
      offset: this.viewOffset,
      zoom: this._zoom,
      focusedPlanet: this._focusedPlanet,
    };

    this.cameraListeners.forEach(cb => {
      try {
        cb(state);
      } catch {
        // 忽略回调错误
      }
    });

    this.eventBus.emit('camera:change', state);
  }

  /**
   * 内部方法：更新相机状态（由主应用调用）
   */
  _updateState(state: Partial<CameraState>): void {
    if (state.distance !== undefined) this._cameraDistance = state.distance;
    if (state.offset !== undefined) this._viewOffset = { ...state.offset };
    if (state.zoom !== undefined) this._zoom = state.zoom;
    if (state.focusedPlanet !== undefined) this._focusedPlanet = state.focusedPlanet;
    this.notifyCameraChange();
  }
}

// 单例实例
let cameraApiInstance: CameraAPIImpl | null = null;

/**
 * 获取相机API单例
 */
export function getCameraAPI(): CameraAPIImpl {
  if (!cameraApiInstance) {
    cameraApiInstance = new CameraAPIImpl();
  }
  return cameraApiInstance;
}

/**
 * 重置相机API（仅用于测试）
 */
export function resetCameraAPI(): void {
  cameraApiInstance = null;
}