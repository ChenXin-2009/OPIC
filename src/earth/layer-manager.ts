/**
 * LayerManager - 图层管理器
 * 
 * 负责管理 CesiumJS 影像图层的添加、移除和属性设置
 */

import * as Cesium from "cesium";
import { GIBSProviderFactory } from "./gibs-provider-factory";

/**
 * 图层配置接口
 */
export interface LayerConfig {
  layerName: string;
  date: Date;
  alpha?: number;
  show?: boolean;
}

/**
 * 图层加载事件接口
 */
export interface LayerLoadEvent {
  layer: Cesium.ImageryLayer;
  tilesLoaded: number;
  totalTiles: number;
}

/**
 * LayerManager 类
 */
export class LayerManager {
  private viewer: Cesium.Viewer;
  private layerAddedCallbacks: ((layer: Cesium.ImageryLayer) => void)[] = [];
  private layerLoadingCallbacks: ((event: LayerLoadEvent) => void)[] = [];
  private layerErrorCallbacks: ((error: Error) => void)[] = [];

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  /**
   * 添加图层
   */
  async addLayer(config: LayerConfig): Promise<Cesium.ImageryLayer> {
    try {
      const provider = GIBSProviderFactory.createProvider({
        layer: config.layerName,
        date: config.date,
      });

      const layer = this.viewer.imageryLayers.addImageryProvider(provider);

      // 设置图层属性
      if (config.alpha !== undefined) {
        layer.alpha = config.alpha;
      }
      if (config.show !== undefined) {
        layer.show = config.show;
      }

      // 设置错误事件监听器
      this.setupErrorHandling(layer);

      // 主动触发渲染（requestRenderMode 下需要）
      this.viewer.scene.requestRender();

      return layer;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.layerErrorCallbacks.forEach((callback) => callback(err));
      throw err;
    }
  }

  /**
   * 移除图层
   */
  removeLayer(layer: Cesium.ImageryLayer): void {
    this.viewer.imageryLayers.remove(layer);
    this.viewer.scene.requestRender();
  }

  /**
   * 移除所有图层
   */
  removeAllLayers(): void {
    this.viewer.imageryLayers.removeAll();
    this.viewer.scene.requestRender();
  }

  /**
   * 设置图层透明度
   */
  setLayerAlpha(layer: Cesium.ImageryLayer, alpha: number): void {
    layer.alpha = alpha;
    this.viewer.scene.requestRender();
  }

  /**
   * 设置图层可见性
   */
  setLayerVisibility(layer: Cesium.ImageryLayer, show: boolean): void {
    layer.show = show;
    this.viewer.scene.requestRender();
  }

  /**
   * 获取所有图层
   */
  getLayers(): Cesium.ImageryLayer[] {
    const layers: Cesium.ImageryLayer[] = [];
    for (let i = 0; i < this.viewer.imageryLayers.length; i++) {
      layers.push(this.viewer.imageryLayers.get(i));
    }
    return layers;
  }

  /**
   * 获取活动图层（最上层）
   */
  getActiveLayer(): Cesium.ImageryLayer | null {
    const length = this.viewer.imageryLayers.length;
    return length > 0 ? this.viewer.imageryLayers.get(length - 1) : null;
  }

  /**
   * 注册图层添加回调
   */
  onLayerAdded(callback: (layer: Cesium.ImageryLayer) => void): void {
    this.layerAddedCallbacks.push(callback);
  }

  /**
   * 注册图层加载回调
   */
  onLayerLoading(callback: (event: LayerLoadEvent) => void): void {
    this.layerLoadingCallbacks.push(callback);
  }

  /**
   * 注册图层错误回调
   */
  onLayerError(callback: (error: Error) => void): void {
    this.layerErrorCallbacks.push(callback);
  }

  /**
   * 设置错误事件处理
   */
  private setupErrorHandling(layer: Cesium.ImageryLayer): void {
    const provider = layer.imageryProvider;

    if (provider.errorEvent) {
      provider.errorEvent.addEventListener((error: any) => {
        const err = new Error(`Tile load failed: ${error.message || "Unknown error"}`);
        this.layerErrorCallbacks.forEach((callback) => callback(err));
      });
    }
  }
}
