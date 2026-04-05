/**
 * @module mod-manager/api/RenderAPI
 * @description 渲染API实现
 * 
 * 提供MOD对渲染系统的访问。
 */

import type {
  RenderAPI as IRenderAPI,
  RendererFactory,
  CesiumLayerOptions,
  ModContext,
} from '../types';
import { getEventBus } from '../core/EventBus';

/**
 * 渲染器注册信息
 */
interface RendererRegistration {
  id: string;
  modId: string;
  factory: RendererFactory;
  object3D: unknown;
}

/**
 * 渲染API实现类
 */
export class RenderAPIImpl implements IRenderAPI {
  private eventBus = getEventBus();
  private renderers: Map<string, RendererRegistration> = new Map();
  private cesiumLayers: Map<string, CesiumLayerOptions> = new Map();
  private beforeRenderCallbacks: Set<() => void> = new Set();
  private afterRenderCallbacks: Set<() => void> = new Set();

  // Three.js 场景引用（由主应用设置）
  private _scene: unknown = null;
  private _camera: unknown = null;
  private _renderer: unknown = null;

  // 当前MOD上下文（用于注册时获取modId）
  private _currentModId: string = '';

  /**
   * 注册渲染器
   */
  registerRenderer(id: string, factory: RendererFactory): void {
    const modId = this._currentModId;
    const fullId = `${modId}:${id}`;

    if (this.renderers.has(fullId)) {
      console.warn(`渲染器 ${fullId} 已存在，将被覆盖`);
    }

    // 创建3D对象
    let object3D: unknown = null;
    if (this._scene) {
      try {
        object3D = factory({} as ModContext); // 简化：实际需要完整上下文
        if (object3D && this._scene && typeof this._scene === 'object' && 'add' in this._scene) {
          (this._scene as { add: (obj: unknown) => void }).add(object3D);
        }
      } catch (error) {
        console.error(`创建渲染器 ${fullId} 失败:`, error);
        return;
      }
    }

    this.renderers.set(fullId, {
      id: fullId,
      modId,
      factory,
      object3D,
    });

    this.eventBus.emit('renderer:registered', { id: fullId, modId });
  }

  /**
   * 注销渲染器
   */
  unregisterRenderer(id: string): void {
    const fullId = id.includes(':') ? id : `${this._currentModId}:${id}`;
    const registration = this.renderers.get(fullId);

    if (!registration) return;

    // 从场景移除
    if (registration.object3D && this._scene && typeof this._scene === 'object' && 'remove' in this._scene) {
      (this._scene as { remove: (obj: unknown) => void }).remove(registration.object3D);
      // 清理资源
      if (registration.object3D && typeof registration.object3D === 'object' && 'dispose' in registration.object3D) {
        (registration.object3D as { dispose: () => void }).dispose();
      }
    }

    this.renderers.delete(fullId);
    this.eventBus.emit('renderer:unregistered', { id: fullId });
  }

  /**
   * 获取场景
   */
  getScene(): unknown {
    if (!this._scene) {
      throw new Error('场景未初始化');
    }
    return this._scene;
  }

  /**
   * 获取相机
   */
  getCamera(): unknown {
    if (!this._camera) {
      throw new Error('相机未初始化');
    }
    return this._camera;
  }

  /**
   * 获取渲染器
   */
  getRenderer(): unknown {
    if (!this._renderer) {
      throw new Error('渲染器未初始化');
    }
    return this._renderer;
  }

  /**
   * 注册Cesium图层
   */
  registerCesiumLayer(options: CesiumLayerOptions): void {
    if (this.cesiumLayers.has(options.id)) {
      console.warn(`Cesium图层 ${options.id} 已存在，将被覆盖`);
    }

    this.cesiumLayers.set(options.id, options);
    this.eventBus.emit('cesium:layer-registered', options);
  }

  /**
   * 注销Cesium图层
   */
  unregisterCesiumLayer(id: string): void {
    if (this.cesiumLayers.delete(id)) {
      this.eventBus.emit('cesium:layer-unregistered', { id });
    }
  }

  /**
   * 注册渲染前回调
   */
  onBeforeRender(callback: () => void): () => void {
    this.beforeRenderCallbacks.add(callback);
    return () => this.beforeRenderCallbacks.delete(callback);
  }

  /**
   * 注册渲染后回调
   */
  onAfterRender(callback: () => void): () => void {
    this.afterRenderCallbacks.add(callback);
    return () => this.afterRenderCallbacks.delete(callback);
  }

  /**
   * 内部方法：设置Three.js引用
   */
  _setThreeContext(
    scene: unknown,
    camera: unknown,
    renderer: unknown
  ): void {
    this._scene = scene;
    this._camera = camera;
    this._renderer = renderer;
  }

  /**
   * 内部方法：设置当前MOD ID
   */
  _setCurrentModId(modId: string): void {
    this._currentModId = modId;
  }

  /**
   * 内部方法：执行渲染前回调
   */
  _executeBeforeRender(): void {
    this.beforeRenderCallbacks.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('渲染前回调错误:', error);
      }
    });
  }

  /**
   * 内部方法：执行渲染后回调
   */
  _executeAfterRender(): void {
    this.afterRenderCallbacks.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('渲染后回调错误:', error);
      }
    });
  }

  /**
   * 内部方法：清理MOD的所有渲染器
   */
  _cleanupMod(modId: string): void {
    // 移除该MOD的所有渲染器
    for (const [fullId, registration] of this.renderers) {
      if (registration.modId === modId) {
        this.unregisterRenderer(fullId);
      }
    }
  }

  /**
   * 获取所有渲染器ID
   */
  getRendererIds(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * 获取所有Cesium图层ID
   */
  getCesiumLayerIds(): string[] {
    return Array.from(this.cesiumLayers.keys());
  }
}

// 单例实例
let renderApiInstance: RenderAPIImpl | null = null;

/**
 * 获取渲染API单例
 */
export function getRenderAPI(): RenderAPIImpl {
  if (!renderApiInstance) {
    renderApiInstance = new RenderAPIImpl();
  }
  return renderApiInstance;
}

/**
 * 重置渲染API（仅用于测试）
 */
export function resetRenderAPI(): void {
  renderApiInstance = null;
}