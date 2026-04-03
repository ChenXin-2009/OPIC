/**
 * CesiumEarthExtension - Cesium 地球扩展模块
 *
 * 架构层级：Cesium 子系统 → 门面层（Facade 模式）
 *
 * 职责：
 *   - 作为 CesiumAdapter 的薄包装层（门面），对外暴露更简洁的业务接口
 *   - 屏蔽 CesiumAdapter 的内部细节，使上层组件无需直接依赖 Cesium API
 *   - 转发错误和日志回调，统一错误处理入口
 *   - 管理 CesiumAdapter 实例的生命周期（创建、配置、销毁）
 *
 * 与 Three.js 的集成关系：
 *   - 通过 syncCamera / syncCameraFromCesium 在 Three.js 相机与 Cesium 相机之间同步视角
 *   - 不直接持有 Three.js 对象，仅透传相机参数给 CesiumAdapter
 *
 * 主要依赖：
 *   - CesiumAdapter：底层 Cesium 封装，负责实际渲染和相机同步
 *   - three：Three.js 相机类型定义
 */

import * as THREE from 'three';
import { CesiumAdapter, CesiumAdapterConfig } from './CesiumAdapter';

/**
 * CesiumEarthExtension - Cesium 地球扩展类
 *
 * 门面类（Facade），将 CesiumAdapter 的复杂接口简化为业务层所需的最小接口集。
 * 上层组件（如 React 组件、场景管理器）应通过此类与 Cesium 交互，
 * 而非直接操作 CesiumAdapter 或 Cesium 原生 API。
 */
export class CesiumEarthExtension {
  private adapter: CesiumAdapter;
  private errorCallback?: (error: Error) => void;
  private logCallback?: (level: 'info' | 'warn' | 'error', message: string) => void;
  
  /**
   * 创建 CesiumEarthExtension 实例
   *
   * 初始化流程：
   * 1. 创建底层 CesiumAdapter 实例，完成 Cesium Viewer 的初始化
   * 2. 注册错误事件转发监听器，将 CesiumAdapter 的错误事件转发给本类的错误回调
   *
   * @param config - Cesium 适配器配置，包含容器 ID、影像提供者等初始化参数
   */
  constructor(config: CesiumAdapterConfig) {
    // 创建底层 CesiumAdapter 实例，完成 Cesium Viewer 的初始化
    this.adapter = new CesiumAdapter(config);

    // 将 CesiumAdapter 的错误事件转发给本类的错误回调，
    // 使上层组件只需在 CesiumEarthExtension 上注册一次错误监听即可
    this.adapter.onError((error) => {
      if (this.errorCallback) {
        this.errorCallback(error);
      }
    });
  }
  
  /**
   * 渲染 Cesium 场景（每帧调用一次）
   *
   * 透传给 CesiumAdapter.render()，驱动 Cesium Viewer 执行一次完整渲染。
   */
  render(): void {
    this.adapter.render();
  }
  
  /**
   * 同步时间到 Cesium 内部时钟
   *
   * 使地球光照、大气散射等时间相关效果与外部场景时钟保持一致。
   *
   * @param date - 要同步的目标时间（UTC）
   */
  syncTime(date: Date): void {
    this.adapter.syncTime(date);
  }
  
  /**
   * 设置时间倍率
   *
   * 控制 Cesium 内部时钟的推进速度，影响光照角度等时间相关效果。
   *
   * @param multiplier - 时间倍率（以天/秒为单位；1.0 表示实时）
   */
  setTimeMultiplier(multiplier: number): void {
    this.adapter.setTimeMultiplier(multiplier);
  }
  
  /**
   * 同步相机（Three.js → Cesium）
   *
   * 将 Three.js 透视相机的视角同步到 Cesium，使地球渲染视角与 Three.js 场景一致。
   *
   * @param threeCamera - Three.js 透视相机（提供视图矩阵和 FOV）
   * @param earthPosition - 地球在 Three.js 世界坐标系中的位置（AU）
   */
  syncCamera(threeCamera: THREE.PerspectiveCamera, earthPosition: THREE.Vector3): void {
    this.adapter.syncCamera(threeCamera, earthPosition);
  }
  
  /**
   * 反向同步相机（Cesium → Three.js）
   *
   * 将 Cesium 相机的当前视角写回 Three.js 相机，
   * 用于"地球锁定"模式下由 Cesium 驱动视角的场景。
   *
   * @param threeCamera - 目标 Three.js 透视相机（将被修改）
   * @param earthPosition - 地球在 Three.js 世界坐标系中的位置（AU）
   */
  syncCameraFromCesium(threeCamera: THREE.PerspectiveCamera, earthPosition: THREE.Vector3): void {
    this.adapter.syncCameraFromCesium(threeCamera, earthPosition);
  }
  
  /**
   * 设置 Cesium 地球的可见性
   *
   * @param visible - `true` 显示地球，`false` 隐藏地球
   */
  setVisible(visible: boolean): void {
    this.adapter.setCanvasVisible(visible);
  }
  
  /**
   * 切换影像图层
   *
   * 运行时动态替换地球表面的影像图源（如卫星影像、街道地图、NASA GIBS 等）。
   *
   * @param provider - 新的 Cesium ImageryProvider 实例
   */
  setImageryProvider(provider: any): void {
    this.adapter.setImageryProvider(provider);
  }

  /**
   * 控制地球光照（白天/黑夜分界线）
   *
   * @param enabled - `true` 显示昼夜分界线阴影，`false` 关闭光照阴影（全部白天亮度）
   */
  setEnableLighting(enabled: boolean): void {
    this.adapter.setEnableLighting(enabled);
  }

  /**
   * 获取瓦片加载状态
   *
   * 可用于 UI 进度指示，判断地球瓦片是否已加载完毕。
   *
   * @returns 包含 `loaded`（已渲染瓦片数）和 `loading`（待加载瓦片数）的对象
   */
  getTileLoadingStats(): { loaded: number; loading: number } {
    return this.adapter.getTileLoadingStats();
  }
  
  /**
   * 注册错误回调
   *
   * 当底层 CesiumAdapter 发生错误时，会通过此回调通知上层组件。
   *
   * @param callback - 错误处理函数，接收具体的错误对象
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
  
  /**
   * 注册日志回调
   *
   * 将底层 CesiumAdapter 的 info/warn/error 日志转发给外部日志系统（如调试面板）。
   *
   * @param callback - 日志处理函数，接收日志级别和消息文本
   */
  onLog(callback: (level: 'info' | 'warn' | 'error', message: string) => void): void {
    this.logCallback = callback;
    this.adapter.onLog(callback);
  }
  
  /**
   * 清理资源，销毁底层 CesiumAdapter 及其持有的所有 DOM 元素和事件监听器
   *
   * 调用后此实例不可再使用。通常在组件卸载时调用。
   */
  dispose(): void {
    // 清理 CesiumAdapter
    this.adapter.dispose();
  }
}
