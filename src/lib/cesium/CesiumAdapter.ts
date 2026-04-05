/**
 * CesiumAdapter - Cesium 适配器
 *
 * 架构层级：Cesium 子系统 → 底层适配器（Adapter 模式）
 *
 * 职责：
 *   - 封装 Cesium Viewer 的创建、配置与生命周期管理
 *   - 将 Three.js 相机状态同步到 Cesium 相机（单向或双向）
 *   - 管理 Cesium Canvas 的可见性与尺寸，确保与 Three.js Canvas 正确叠加
 *   - 提供影像图层切换、时间同步、光照控制等运行时接口
 *
 * 与 Three.js 的集成关系：
 *   - Cesium Canvas 以绝对定位叠加在 Three.js Canvas 之下（z-index 更低）
 *   - Three.js OrbitControls 负责相机交互，Cesium 内置相机控制器被禁用
 *   - 每帧由外部调用 render() 驱动，不使用 Cesium 自身的 requestAnimationFrame
 *   - 通过 CameraSynchronizer 将 Three.js 相机矩阵转换为 Cesium 相机参数
 *
 * 主要依赖：
 *   - cesium：地球渲染引擎
 *   - three：3D 场景渲染（相机参数来源）
 *   - CameraSynchronizer：Three.js ↔ Cesium 相机同步工具
 */

import * as THREE from 'three';

// 在导入 Cesium 之前设置基础 URL
if (typeof window !== 'undefined') {
  (window as any).CESIUM_BASE_URL = '/cesium';
}

import * as Cesium from 'cesium';
import { CameraSynchronizer } from './CameraSynchronizer';

/**
 * Cesium 适配器配置接口
 *
 * 传入 CesiumAdapter 构造函数，控制 Cesium Viewer 的初始化行为与渲染参数。
 */
export interface CesiumAdapterConfig {
  /** Cesium 容器 div 的 id，由适配器自动创建并挂载到 DOM */
  cesiumContainerId: string;
  /**
   * 挂载容器（默认 document.body）
   * 建议传入 Three.js canvas 的父容器，确保两者处于同一 stacking context，
   * 使 z-index 层叠关系正确生效
   */
  parentElement?: HTMLElement;
  /** 初始影像图层提供者；若不传则使用 Cesium 默认图源 */
  imageryProvider?: Cesium.ImageryProvider;
  /** 地形提供者；若不传则使用平坦地形（EllipsoidTerrainProvider） */
  terrainProvider?: Cesium.TerrainProvider;

  /**
   * Canvas 分辨率缩放系数（默认 1.0，范围 0.1 ~ 2.0）
   * 小于 1.0 可降低渲染分辨率以提升性能；大于 1.0 可提升清晰度（高 DPI 屏幕）
   */
  canvasResolutionScale?: number;
  /**
   * 瓦片 LOD 误差阈值（默认 2，单位：屏幕像素）
   * 值越小，加载的瓦片精度越高，但性能开销越大
   */
  maximumScreenSpaceError?: number;
  /**
   * 内存中最大缓存瓦片数量（默认 1000）
   * 超出后 Cesium 会自动淘汰最久未使用的瓦片
   */
  maximumNumberOfLoadedTiles?: number;

  /**
   * 深度合成策略（默认 'render-order'）
   * - 'render-order'：按渲染顺序决定前后关系（Cesium 在下，Three.js 在上）
   * - 'satellite-always-front'：卫星模型始终渲染在地球之上
   */
  depthCompositingStrategy?: 'render-order' | 'satellite-always-front';

  /** 性能监控对象（可选），用于记录每帧渲染耗时等指标 */
  performanceMonitor?: any;
}

/**
 * Cesium 初始化错误
 */
export class CesiumInitializationError extends Error {
  override cause?: Error;
  
  /**
   * 创建 Cesium 初始化错误实例
   * @param message - 错误描述信息
   * @param cause - 原始错误（可选），用于错误链追踪
   */
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'CesiumInitializationError';
    this.cause = cause;
  }
}

/**
 * Cesium 渲染错误
 */
export class CesiumRenderError extends Error {
  override cause?: Error;
  
  /**
   * 创建 Cesium 渲染错误实例
   * @param message - 错误描述信息
   * @param cause - 原始错误（可选），用于错误链追踪
   */
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'CesiumRenderError';
    this.cause = cause;
  }
}

/**
 * WebGL Context Lost 错误
 */
export class WebGLContextLostError extends Error {
  /**
   * 创建 WebGL 上下文丢失错误实例
   * @param message - 错误描述信息
   */
  constructor(message: string) {
    super(message);
    this.name = 'WebGLContextLostError';
  }
}

/**
 * CesiumAdapter - Cesium 适配器类
 *
 * 封装 Cesium Viewer 的完整生命周期，对外暴露简洁的渲染、同步和控制接口。
 * 内部持有 Cesium Viewer 实例，外部通过此类与 Cesium 交互，无需直接操作 Cesium API。
 */
export class CesiumAdapter {
  private viewer!: Cesium.Viewer;
  private container!: HTMLDivElement; // 改为 div 容器
  private cesiumCanvas!: HTMLCanvasElement; // Cesium 内部的 canvas
  private config: CesiumAdapterConfig;
  private isAvailable: boolean = true;
  private errorCallback?: (error: Error) => void;
  private performanceMonitor?: any;
  private logCallback?: (level: 'info' | 'warn' | 'error', message: string) => void;
  private boundHandleResize!: () => void;
  private boundHandleContextLost!: (e: Event) => void;
  
  /**
   * 创建 CesiumAdapter 实例并初始化 Cesium Viewer
   *
   * 初始化流程：
   * 1. 验证并存储配置参数
   * 2. 调用 `initializeCesium` 创建 Cesium Viewer 并配置渲染选项
   * 3. 调用 `setupEventListeners` 注册 resize 和 WebGL 上下文丢失事件监听器
   *
   * @param config - Cesium 适配器配置，包含容器 ID、影像提供者等初始化参数
   * @throws {CesiumInitializationError} 当 Cesium Viewer 初始化失败时抛出
   */
  constructor(config: CesiumAdapterConfig) {
    this.config = this.validateConfig(config);
    this.performanceMonitor = config.performanceMonitor;
    
    try {
      this.initializeCesium();
      this.setupEventListeners();
      
      // 初始化完成后输出日志
      this.log('info', 'CesiumAdapter initialized successfully');
    } catch (error) {
      this.handleInitializationError(error);
    }
  }
  
  /**
   * 验证并规范化配置参数
   */
  private validateConfig(config: CesiumAdapterConfig): CesiumAdapterConfig {
    return {
      ...config,
      canvasResolutionScale: Math.max(0.1, Math.min(2.0, config.canvasResolutionScale ?? 1.0)),
      maximumScreenSpaceError: Math.max(1, config.maximumScreenSpaceError ?? 2),
      maximumNumberOfLoadedTiles: Math.max(100, config.maximumNumberOfLoadedTiles ?? 1000),
      depthCompositingStrategy: config.depthCompositingStrategy ?? 'render-order'
    };
  }
  
  /**
   * 初始化 Cesium Viewer 和 Canvas
   */
  private initializeCesium(): void {
    // 创建独立的容器 div（Cesium 需要一个有尺寸的容器）
    this.container = document.createElement('div');
    this.container.id = this.config.cesiumContainerId;
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.pointerEvents = 'none'; // 默认不拦截事件，只有 globe 区域才响应
    this.container.style.zIndex = '0'; // 地球层在最底层，Three.js canvas 叠在上面
    this.container.style.display = 'none'; // 默认隐藏，等待 setCesiumEnabled(true) 调用
    
    // 设置容器尺寸（CSS 尺寸，Cesium 需要这个来确定 canvas 大小）
    const width = window.innerWidth * (this.config.canvasResolutionScale ?? 1.0);
    const height = window.innerHeight * (this.config.canvasResolutionScale ?? 1.0);
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
    
    // 挂载到指定父容器（默认 document.body）
    // 强烈建议传入 Three.js canvas 的父容器，确保在同一 stacking context 内
    // 这样 z-index 才能正确工作，UI 元素不会被 Cesium canvas 遮挡
    const parent = this.config.parentElement ?? document.body;
    parent.appendChild(this.container);
    
    // 创建 Cesium Viewer
    this.viewer = new Cesium.Viewer(this.container, {
      // 基础配置
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      
      // 透明背景：在构造时禁用 skyBox（必须在构造时传入，事后 show=false 不够）
      skyBox: false,
      skyAtmosphere: false,
      
      // 渲染配置
      scene3DOnly: true,
      // 关闭顺序无关半透明（OIT）：OIT 会引入额外的 FBO pass，与透明背景合成冲突
      orderIndependentTranslucency: false,
      contextOptions: {
        webgl: {
          alpha: true, // 启用透明背景，让 Three.js 场景可见
          depth: true,
          stencil: false,
          antialias: true,
          premultipliedAlpha: false, // false 才能正确透明合成
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance'
        }
      },
      
      // 性能配置
      requestRenderMode: false, // 每帧渲染
      maximumRenderTimeChange: Infinity,

      // 对数深度缓冲：解决近裁剪面裁切问题，允许相机贴近地球表面
      // 将深度值分布从线性改为对数，near/far 比值可达 1:10^10
      logarithmicDepthBuffer: true
    } as Cesium.Viewer.ConstructorOptions);
    

    
    // 确保 Globe 显示
    this.viewer.scene.globe.show = true;
    
    // 配置 Globe
    this.viewer.scene.globe.maximumScreenSpaceError = this.config.maximumScreenSpaceError ?? 2;
    this.viewer.scene.globe.tileCacheSize = this.config.maximumNumberOfLoadedTiles ?? 1000;
    

    
    // 配置 ImageryProvider（如果提供）
    if (this.config.imageryProvider) {
      this.viewer.imageryLayers.removeAll();
      this.viewer.imageryLayers.addImageryProvider(this.config.imageryProvider);
    }
    
    // 配置 TerrainProvider（如果提供）
    if (this.config.terrainProvider) {
      this.viewer.terrainProvider = this.config.terrainProvider;
    }
    
    // 禁用大气效果（由 Three.js 场景控制）
    if (this.viewer.scene.sun) {
      this.viewer.scene.sun.show = false;
    }
    if (this.viewer.scene.moon) {
      this.viewer.scene.moon.show = false;
    }
    
    // 透明背景关键设置：
    // 1. HDR 必须禁用，否则会破坏透明背景
    this.viewer.scene.highDynamicRange = false;
    // 2. 背景色设为透明
    this.viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
    // 3. 禁用地面大气层（会渲染到背景区域）
    this.viewer.scene.globe.showGroundAtmosphere = false;
    // 4. globe.baseColor 控制无瓦片区域底色，设为透明
    this.viewer.scene.globe.baseColor = Cesium.Color.TRANSPARENT;
    
    // 确保 globe 显示
    this.viewer.scene.globe.show = true;
    this.viewer.scene.globe.depthTestAgainstTerrain = false;
    
    // 启用太阳光照：产生白天/黑夜分界线效果
    this.viewer.scene.globe.enableLighting = true;
    
    // 获取 Cesium 内部创建的 canvas
    this.cesiumCanvas = this.viewer.scene.canvas;
    
    // 设置 canvas CSS 背景透明，确保 Three.js 场景可见
    this.cesiumCanvas.style.background = 'transparent';
    this.container.style.background = 'transparent';
    // 禁用 Cesium canvas 的鼠标事件：由 Three.js OrbitControls 统一处理相机
    this.cesiumCanvas.style.pointerEvents = 'none';
    this.container.style.pointerEvents = 'none';
    
    // 禁用 Cesium 内置相机控制器，相机由 Three.js OrbitControls 驱动
    this.viewer.scene.screenSpaceCameraController.enableInputs = false;
    
    // 手动调整 Cesium canvas 尺寸（Cesium 有时不能正确读取容器尺寸）
    const canvasWidth = window.innerWidth * (this.config.canvasResolutionScale ?? 1.0);
    const canvasHeight = window.innerHeight * (this.config.canvasResolutionScale ?? 1.0);
    this.cesiumCanvas.width = canvasWidth;
    this.cesiumCanvas.height = canvasHeight;
    
    // 通知 Cesium 场景尺寸已更改
    this.viewer.resize();

    // 将 viewer 暴露到 window，供 MOD 系统访问
    (window as unknown as Record<string, unknown>).__cesiumViewer = this.viewer;
    // 通知所有监听者 viewer 已就绪
    window.dispatchEvent(new CustomEvent('cesium:viewer-ready'));
  }

  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听 WebGL Context Lost（使用 Cesium 的 canvas）
    this.boundHandleContextLost = this.handleContextLost.bind(this);
    this.cesiumCanvas.addEventListener('webglcontextlost', this.boundHandleContextLost, false);
    
    // 监听窗口大小变化
    this.boundHandleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundHandleResize);
  }
  
  /**
   * 渲染 Cesium 场景（每帧调用一次）
   *
   * 驱动 Cesium Viewer 执行一次完整的场景渲染，将结果写入 Cesium Canvas。
   * 若适配器不可用（初始化失败或 WebGL context 丢失），则静默跳过。
   */
  render(): void {
    if (!this.isAvailable) {
      return;
    }
    
    try {
      const startTime = performance.now();
      
      // 渲染 Cesium 场景到 Canvas
      this.viewer.render();
      
      // 性能监控
      if (this.performanceMonitor) {
        const renderTime = performance.now() - startTime;
        this.performanceMonitor.recordCesiumRenderTime?.(renderTime);
      }
    } catch (error) {
      this.log('error', `Render error: ${error}`);
      this.handleRenderError(error);
    }
  }
  
  /**
   * 同步时间到 Cesium.Clock
   *
   * 将外部时间（通常来自 Three.js 场景的模拟时钟）写入 Cesium 内部时钟，
   * 使地球光照、大气散射等时间相关效果与场景保持一致。
   *
   * @param date - 要同步的目标时间（UTC）
   */
  syncTime(date: Date): void {
    if (!this.isAvailable) return;
    
    const julianDate = Cesium.JulianDate.fromDate(date);
    this.viewer.clock.currentTime = julianDate;
  }
  
  /**
   * 设置时间倍率
   *
   * 控制 Cesium 内部时钟的推进速度，影响光照角度等时间相关效果。
   *
   * @param multiplier - 时间倍率（以天/秒为单位；1.0 表示实时，86400 表示每秒推进一天）
   */
  setTimeMultiplier(multiplier: number): void {
    if (!this.isAvailable) return;
    
    // 转换为秒/秒（Cesium 使用秒作为单位）
    this.viewer.clock.multiplier = multiplier * 86400;
  }
  
  /**
   * 同步相机到 Cesium（Three.js → Cesium）
   *
   * 将 Three.js 透视相机的视图矩阵转换为 Cesium 相机参数，
   * 使 Cesium 地球的视角与 Three.js 场景保持一致。
   * 内部通过 CameraSynchronizer 完成坐标系转换（太阳系坐标 → ECEF）。
   *
   * @param threeCamera - Three.js 透视相机（提供视图矩阵和 FOV）
   * @param earthPosition - 地球在 Three.js 世界坐标系中的位置（AU）
   */
  syncCamera(threeCamera: THREE.PerspectiveCamera, earthPosition: THREE.Vector3): void {
    if (!this.isAvailable) return;
    
    try {
      CameraSynchronizer.syncViewMatrix(threeCamera, this.viewer.camera, earthPosition, this.viewer.clock.currentTime);
      
      // 临时调试：每隔2秒输出一次相机高度，确认位置同步是否正确
      const now = Date.now();
      if (!this._lastDebugTime || now - this._lastDebugTime > 2000) {
        this._lastDebugTime = now;
        const camPos = this.viewer.camera.position;
        const altitude = Cesium.Cartesian3.magnitude(camPos) - 6371000;
        const frustum = this.viewer.camera.frustum as any;
        console.log('[CesiumAdapter] camera altitude (m):', altitude.toFixed(0), 
          'near:', frustum?.near?.toFixed(1), 'far:', frustum?.far?.toFixed(0),
          'cesiumPos(m):', camPos.x.toFixed(0), camPos.y.toFixed(0), camPos.z.toFixed(0));
      }
    } catch (error) {
      console.error('[CesiumAdapter] Camera sync error:', error);
    }
  }
  private _lastDebugTime?: number; // 上次输出调试日志的时间戳（毫秒），用于限制日志频率（每 2 秒最多一次）
  
  /**
   * 反向同步相机（Cesium → Three.js）
   *
   * 将 Cesium 相机的当前位置和朝向反向写入 Three.js 相机，
   * 用于"地球锁定"模式下由 Cesium 驱动视角的场景。
   *
   * @param threeCamera - 目标 Three.js 透视相机（将被修改）
   * @param earthPosition - 地球在 Three.js 世界坐标系中的位置（AU）
   */
  syncCameraFromCesium(threeCamera: THREE.PerspectiveCamera, earthPosition: THREE.Vector3): void {
    if (!this.isAvailable) return;
    
    try {
      CameraSynchronizer.syncFromCesium(this.viewer.camera, threeCamera, earthPosition);
    } catch (error) {
      console.error('[CesiumAdapter] Reverse camera sync error:', error);
    }
  }
  
  /**
   * 设置 Cesium canvas 可见性
   *
   * 通过切换容器的 `display` 样式控制 Cesium 地球的显示与隐藏。
   * 重新显示时会自动修复 canvas 尺寸，避免 `display:none` 期间尺寸丢失导致的渲染错位。
   *
   * @param visible - `true` 显示地球，`false` 隐藏地球
   */
  setCanvasVisible(visible: boolean): void {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
      
      if (visible && this.isAvailable && this.viewer) {
        // 重新显示时强制 Cesium 重新计算 canvas 尺寸。
        // 原因：当容器处于 display:none 状态时，浏览器不会触发 resize 事件，
        // 导致 Cesium 内部的 WebGL viewport 与实际 canvas 尺寸不一致，
        // 重新显示后会出现渲染错位或黑屏。此处手动同步尺寸并调用 viewer.resize() 修复。
        try {
          // 保持 Cesium 相机控制器禁用（由 Three.js OrbitControls 驱动）
          this.viewer.scene.screenSpaceCameraController.enableInputs = false;
          // 重新设置容器和 canvas 尺寸（display:none 期间可能丢失）
          const parent = this.config.parentElement ?? document.body;
          const w = parent.clientWidth || window.innerWidth;
          const h = parent.clientHeight || window.innerHeight;
          this.container.style.width = `${w}px`;
          this.container.style.height = `${h}px`;
          this.cesiumCanvas.width = w;
          this.cesiumCanvas.height = h;
          this.viewer.resize();
          // 注意：不在这里 render()，让调用方在 syncCamera 之后再渲染
          // 避免用旧相机位置渲染出错误帧，影响 Cesium 内部 frustum 状态
        } catch (e) {
          console.warn('[CesiumAdapter] resize on show failed:', e);
        }
      }
    }
  }
  
  /**
   * 获取瓦片加载状态
   *
   * 读取 Cesium Globe 内部的瓦片队列，返回当前已渲染和正在加载的瓦片数量，
   * 可用于 UI 进度指示或性能监控。
   *
   * @returns 包含 `loaded`（已渲染瓦片数）和 `loading`（队列中待加载瓦片数）的对象
   */
  getTileLoadingStats(): { loaded: number; loading: number } {
    if (!this.isAvailable || !this.viewer) {
      return { loaded: 0, loading: 0 };
    }
    
    try {
      const surface = (this.viewer.scene.globe as any)._surface;
      if (!surface) {
        return { loaded: 0, loading: 0 };
      }
      
      const tilesToRender = surface._tilesToRender || [];
      const tileLoadQueueHigh = surface._tileLoadQueueHigh || [];
      const tileLoadQueueMedium = surface._tileLoadQueueMedium || [];
      const tileLoadQueueLow = surface._tileLoadQueueLow || [];
      
      return {
        loaded: tilesToRender.length,
        loading: tileLoadQueueHigh.length + tileLoadQueueMedium.length + tileLoadQueueLow.length
      };
    } catch (error) {
      return { loaded: 0, loading: 0 };
    }
  }
  
  /**
   * 获取当前适配器配置
   *
   * @returns 经过规范化处理后的配置对象（只读副本）
   */
  getConfig(): CesiumAdapterConfig {
    return this.config;
  }
  
  /**
   * 注册错误回调
   *
   * 当适配器发生初始化错误、渲染错误或 WebGL context 丢失时，
   * 会调用此回调通知上层组件进行处理（如显示错误提示或降级渲染）。
   *
   * @param callback - 错误处理函数，接收具体的错误对象
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
  
  /**
   * 注册日志回调
   *
   * 将适配器内部的 info/warn/error 日志转发给外部日志系统（如调试面板）。
   *
   * @param callback - 日志处理函数，接收日志级别和消息文本
   */
  onLog(callback: (level: 'info' | 'warn' | 'error', message: string) => void): void {
    this.logCallback = callback;
  }
  
  /**
   * 输出日志
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (this.logCallback) {
      this.logCallback(level, message);
    }
  }
  
  /**
   * 处理初始化错误
   */
  private handleInitializationError(error: unknown): void {
    console.error('[CesiumAdapter] Initialization error:', error);
    
    const cesiumError = new CesiumInitializationError(
      'Failed to initialize Cesium Viewer',
      error instanceof Error ? error : undefined
    );
    
    console.error(cesiumError);
    
    if (this.errorCallback) {
      this.errorCallback(cesiumError);
    }
    
    this.isAvailable = false;
  }
  
  /**
   * 处理渲染错误
   */
  private handleRenderError(error: unknown): void {
    const renderError = new CesiumRenderError(
      'Cesium render failed',
      error instanceof Error ? error : undefined
    );
    
    console.error(renderError);
    
    if (this.errorCallback) {
      this.errorCallback(renderError);
    }
  }
  
  /**
   * 处理 WebGL Context Lost
   */
  private handleContextLost(event: Event): void {
    event.preventDefault();
    
    const error = new WebGLContextLostError('WebGL context lost');
    console.error(error);
    
    // 完全重启引擎
    this.dispose();
    
    // 尝试重新初始化
    setTimeout(() => {
      try {
        this.initializeCesium();
        this.setupEventListeners();
      } catch (reinitError) {
        console.error('Failed to reinitialize Cesium after context loss:', reinitError);
        this.isAvailable = false;
      }
    }, 1000);
  }
  
  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    if (!this.isAvailable) return;
    
    const parent = this.config.parentElement ?? document.body;
    const width = (parent.clientWidth || window.innerWidth) * (this.config.canvasResolutionScale ?? 1.0);
    const height = (parent.clientHeight || window.innerHeight) * (this.config.canvasResolutionScale ?? 1.0);
    
    // 更新容器 CSS 尺寸
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
    
    // 同步更新 canvas 实际像素尺寸，并通知 Cesium 重新计算投影
    if (this.cesiumCanvas && this.viewer) {
      this.cesiumCanvas.width = width;
      this.cesiumCanvas.height = height;
      try {
        this.viewer.resize();
      } catch (e) {
        console.warn('[CesiumAdapter] resize failed:', e);
      }
    }
  }
  
  /**
   * 运行时切换影像图层
   *
   * 移除当前所有影像图层，并添加新的图层提供者。
   * 可在运行时动态切换卫星影像、街道地图等图源。
   *
   * @param provider - 新的 Cesium ImageryProvider 实例
   */
  setImageryProvider(provider: Cesium.ImageryProvider): void {
    if (!this.isAvailable || !this.viewer) return;
    try {
      this.viewer.imageryLayers.removeAll();
      this.viewer.imageryLayers.addImageryProvider(provider);
    } catch (e) {
      console.warn('[CesiumAdapter] setImageryProvider failed:', e);
    }
  }

  /**
   * 控制地球光照（白天/黑夜分界线）
   *
   * 启用后，地球表面会根据当前 Cesium 时钟时间显示昼夜阴影效果；
   * 禁用后，地球表面全部以白天亮度渲染，无阴影。
   *
   * @param enabled - `true` 显示昼夜分界线，`false` 关闭光照阴影
   */
  setEnableLighting(enabled: boolean): void {
    if (!this.isAvailable || !this.viewer) return;
    this.viewer.scene.globe.enableLighting = enabled;
  }

  /**
   * 清理资源，销毁 Cesium Viewer 并移除所有 DOM 元素和事件监听器
   *
   * 调用后适配器不可再使用。通常在组件卸载或页面销毁时调用。
   */
  dispose(): void {
    // 停止渲染循环
    this.isAvailable = false;
    
    // 销毁 Cesium Viewer（自动清理所有资源）
    if (this.viewer) {
      this.viewer.destroy();
    }
    
    // 释放容器
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // 移除事件监听器
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
    }
    if (this.boundHandleContextLost && this.cesiumCanvas) {
      this.cesiumCanvas.removeEventListener('webglcontextlost', this.boundHandleContextLost);
    }
    
    console.log('CesiumAdapter disposed');
  }
}
