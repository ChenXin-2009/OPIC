/**
 * CameraController - 相机控制器
 * 
 * 负责管理 Cesium 相机的位置、动画和交互控制
 */

import * as Cesium from "cesium";
import { CameraPosition } from "./earth-manager";

/**
 * 飞行选项接口
 */
export interface FlyToOptions {
  duration?: number;
  offset?: Cesium.HeadingPitchRange;
}

/**
 * CameraController 类
 */
export class CameraController {
  private viewer: Cesium.Viewer;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  /**
   * 设置相机位置
   */
  setPosition(position: CameraPosition, options?: FlyToOptions): void {
    const destination = Cesium.Cartesian3.fromDegrees(
      position.longitude,
      position.latitude,
      position.height
    );

    if (options?.duration) {
      this.viewer.camera.flyTo({
        destination,
        duration: options.duration / 1000,
        offset: options.offset,
      });
    } else {
      this.viewer.camera.setView({
        destination,
        orientation: options?.offset
          ? {
              heading: options.offset.heading,
              pitch: options.offset.pitch,
              roll: 0,
            }
          : undefined,
      });
    }
  }

  /**
   * 获取相机位置
   */
  getPosition(): CameraPosition {
    const cartographic = Cesium.Cartographic.fromCartesian(
      this.viewer.camera.position
    );

    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height,
    };
  }

  /**
   * 飞行到全球视图
   */
  flyToGlobal(options?: FlyToOptions): void {
    this.setPosition(
      {
        longitude: 0,
        latitude: 0,
        height: 20000000,
      },
      options
    );
  }

  /**
   * 飞行到指定位置
   */
  flyToLocation(
    lon: number,
    lat: number,
    height: number,
    options?: FlyToOptions
  ): void {
    this.setPosition({ longitude: lon, latitude: lat, height }, options);
  }

  /**
   * 设置最小缩放距离
   */
  setMinZoomDistance(distance: number): void {
    this.viewer.scene.screenSpaceCameraController.minimumZoomDistance = distance;
  }

  /**
   * 设置最大缩放距离
   */
  setMaxZoomDistance(distance: number): void {
    this.viewer.scene.screenSpaceCameraController.maximumZoomDistance = distance;
  }

  /**
   * 启用/禁用旋转
   */
  enableRotation(enable: boolean): void {
    this.viewer.scene.screenSpaceCameraController.enableRotate = enable;
  }

  /**
   * 启用/禁用缩放
   */
  enableZoom(enable: boolean): void {
    this.viewer.scene.screenSpaceCameraController.enableZoom = enable;
  }

  /**
   * 启用/禁用平移
   */
  enablePan(enable: boolean): void {
    this.viewer.scene.screenSpaceCameraController.enableTranslate = enable;
  }
}
