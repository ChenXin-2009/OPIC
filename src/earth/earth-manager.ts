/**
 * EarthManager - 地球管理器
 * 
 * 负责初始化和管理 Cesium Viewer，协调各子管理器的工作
 */

import * as Cesium from "cesium";

// 设置 Cesium 静态资源路径
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
}
import { LayerManager } from "./layer-manager";
import { TimeController } from "./time-controller";
import { CameraController } from "./camera-controller";

/**
 * 相机位置接口
 */
export interface CameraPosition {
  longitude: number;
  latitude: number;
  height: number;
}

/**
 * EarthManager 配置接口
 */
export interface EarthManagerConfig {
  container: HTMLElement;
  initialDate?: Date;
  initialCamera?: CameraPosition;
  enableUI?: boolean;
  performanceMode?: "high" | "balanced" | "low";
}

/**
 * 性能配置预设
 */
const PERFORMANCE_PRESETS = {
  high: {
    maximumScreenSpaceError: 2,
    targetFrameRate: 60,
  },
  balanced: {
    maximumScreenSpaceError: 3,
    targetFrameRate: 30,
  },
  low: {
    maximumScreenSpaceError: 4,
    targetFrameRate: 30,
  },
};

/**
 * EarthManager 类
 */
export class EarthManager {
  private config: EarthManagerConfig;
  private viewer: Cesium.Viewer | null = null;
  private _layerManager: LayerManager | null = null;
  private _timeController: TimeController | null = null;
  private _cameraController: CameraController | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private initialized = false;

  constructor(config: EarthManagerConfig) {
    this.config = config;
  }

  /**
   * 初始化 Cesium Viewer
   */
  async initialize(): Promise<void> {
    try {
      // 验证容器
      if (
        !this.config.container ||
        !(this.config.container instanceof HTMLElement)
      ) {
        throw new Error("Invalid container element");
      }

      // 检查 WebGL 支持
      if (!this.isWebGLSupported()) {
        throw new Error("WebGL is not supported");
      }

      // 获取性能配置
      const performanceMode = this.config.performanceMode || "balanced";
      const perfConfig = PERFORMANCE_PRESETS[performanceMode];

      // 初始化 Viewer
      this.viewer = new Cesium.Viewer(this.config.container, {
        // 禁用默认图层和 UI
        baseLayerPicker: false,
        imageryProvider: false,
        
        // UI 控件配置
        timeline: this.config.enableUI ?? false,
        animation: this.config.enableUI ?? false,
        fullscreenButton: this.config.enableUI ?? true,
        geocoder: false,
        homeButton: this.config.enableUI ?? true,
        sceneModePicker: false,
        navigationHelpButton: false,
        
        // 性能优化
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        targetFrameRate: perfConfig.targetFrameRate,
      });

      // 配置场景性能参数
      this.viewer.scene.globe.maximumScreenSpaceError = 2; // 提升清晰度，减少黑条

      // 设置初始相机位置（完整地球视图）
      if (this.config.initialCamera) {
        this.viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            this.config.initialCamera.longitude,
            this.config.initialCamera.latitude,
            this.config.initialCamera.height
          ),
        });
      } else {
        // 默认相机位置：显示完整地球
        this.viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
        });
      }

      // 初始化子管理器
      this._layerManager = new LayerManager(this.viewer);
      this._timeController = new TimeController(this._layerManager);
      this._cameraController = new CameraController(this.viewer);

      this.initialized = true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      throw err;
    }
  }

  /**
   * 销毁 Viewer 和清理资源
   */
  destroy(): void {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }

    this._layerManager = null;
    this._timeController = null;
    this._cameraController = null;
    this.initialized = false;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取 Viewer 实例
   */
  getViewer(): Cesium.Viewer | null {
    return this.viewer;
  }

  /**
   * 获取 LayerManager
   */
  get layerManager(): LayerManager {
    if (!this._layerManager) {
      throw new Error("EarthManager not initialized");
    }
    return this._layerManager;
  }

  /**
   * 获取 TimeController
   */
  get timeController(): TimeController {
    if (!this._timeController) {
      throw new Error("EarthManager not initialized");
    }
    return this._timeController;
  }

  /**
   * 获取 CameraController
   */
  get cameraController(): CameraController {
    if (!this._cameraController) {
      throw new Error("EarthManager not initialized");
    }
    return this._cameraController;
  }

  /**
   * 注册错误回调
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  /**
   * 检查 WebGL 支持
   */
  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );
    } catch (e) {
      return false;
    }
  }
}
