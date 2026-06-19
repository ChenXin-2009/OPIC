/**
 * @module 3d/CameraController
 * @description 3D 相机控制器
 * 
 * 本模块负责管理 Three.js 相机和 OrbitControls,提供即时缩放、聚焦、跟踪等高级相机功能。
 * 支持多种相机模式（自由、锁定、跟随）和动态配置管理。
 * 
 * @architecture
 * - 所属子系统：3D 渲染
 * - 架构层级：核心层
 * - 职责边界：负责相机控制和视角管理,不负责场景渲染或天体计算
 * 
 * @dependencies
 * - 直接依赖：three, three/addons/controls/OrbitControls, 3d/FocusManager, config/cameraConfig, config/CameraConfigManager
 * - 被依赖：components/UniverseVisualization
 * - 循环依赖：无
 * 
 * @renderPipeline
 * 相机控制管线：
 * 1. 输入处理：鼠标滚轮、触摸手势
 * 2. 缩放计算：即时缩放（无缓动）
 * 3. 聚焦动画：Lerp 插值平滑移动
 * 4. 跟踪更新：实时跟随目标天体
 * 5. 防穿透约束：限制相机不穿透行星表面
 * 6. 阻尼更新：OrbitControls 惯性效果
 * 
 * @performance
 * - 使用即时算法实现零延迟缩放
 * - 使用 Lerp 插值避免突兀的聚焦移动
 * - 使用阻尼（damping）提供自然的旋转惯性效果
 * - 动态配置管理支持运行时调整参数
 * 
 * @coordinateSystem
 * - 相机位置：世界坐标系（与场景坐标系一致）
 * - 控制目标：世界坐标系中的点
 * - 距离计算：欧几里得距离
 * 
 * @note
 * - 相机模式：free（自由）、locked（锁定）、follow（跟随）
 * - 防穿透约束基于目标天体的真实半径
 * - 支持快速预设配置（QUICK_CAMERA_SETTINGS）
 * - 使用 FocusManager 管理复杂的聚焦逻辑
 * 
 * @example
 * ```typescript
 * import { CameraController } from '@/lib/3d';
 * 
 * const cameraController = new CameraController(camera, domElement);
 * 
 * // 聚焦到地球
 * cameraController.focusOnBody(earthMesh, {
 *   distance: 0.05,
 *   duration: 2000
 * });
 * 
 * // 跟踪月球
 * cameraController.trackBody(() => moonPosition, 0.1);
 * 
 * // 在动画循环中更新
 * cameraController.update(deltaTime);
 * ```
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CAMERA_CONFIG,
  CAMERA_PENETRATION_CONFIG
} from '@/lib/config/cameraConfig';
import { cameraConfigManager, type CameraConfigType } from '@/lib/config/CameraConfigManager';

import { FocusManager, type CelestialObject, type FocusOptions } from './FocusManager';
import type { CameraMode } from './camera/CameraTypes';
import { evalSensitivityCurve, DEFAULT_DRAG_CURVE } from './camera/SensitivityCurve';
import { easeOutQuart, preventPenetrationDuringInput } from './camera/PenetrationUtils';
import { CameraAnimator } from './camera/CameraAnimator';
import { CameraInputHandler } from './camera/CameraInputHandler';

export type { CameraMode } from './camera/CameraTypes';

/**
 * Three.js 相机控制器
 *
 * 封装 OrbitControls，提供太阳系场景所需的相机控制功能，包括：
 * - 鼠标/触摸缩放（即时响应，统一距离缩放，无 FOV 光学变焦层）
 * - 防穿透约束（防止相机进入天体内部）
 * - 相机模式切换（自由/锁定/跟随）
 * - 聚焦目标天体（平滑过渡到目标位置）
 * 
 * 缩放架构（2 层）：
 * - Three.js 距离缩放：所有距离统一行为，灵敏度恒定
 * - Cesium 原生相机：极近地球时由 SceneModeManager 自动切换
 */
export class CameraController {
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'free';
  private targetBody: THREE.Object3D | null = null;
  private followSpeed: number = 0.1; // 跟随缓动速度
  
  // Enhanced focus management
  private focusManager: FocusManager;
  
  // 实时配置管理
  private currentConfig: CameraConfigType;
  private configUnsubscribe: (() => void) | null = null;
  
  // 即时缩放相关
  private smoothDistance: number = 0; // 当前缩放距离
  private targetDistance: number = 0; // 目标距离（即时响应）
  private isZooming: boolean = false; // 是否正在缩放
  
  private domElement: HTMLElement;

  private animator: CameraAnimator;
  private inputHandler: CameraInputHandler;
  
  // 聚焦相关
  private targetCameraPosition: THREE.Vector3 | null = null;
  private targetControlsTarget: THREE.Vector3 | null = null;
  private isFocusing: boolean = false;
  // 当前聚焦目标的真实半径（AU），用于防穿透约束
  private currentTargetRadius: number | null = null;
  
  // 跟踪相关
  private isTracking: boolean = false; // 是否正在跟踪目标
  private trackingTargetGetter: (() => THREE.Vector3) | null = null; // 获取跟踪目标位置的函数
  private trackingDistance: number = 5; // 跟踪时的相机距离

  // 地球锁定相机模式
  private earthLockEnabled: boolean = false;
  // controls.update() 之后需要同步的 up 向量
  private _pendingUpForQuat: THREE.Vector3 | null = null;

  /**
   * 构造函数：初始化相机控制器
   *
   * 初始化流程：
   * 1. 保存相机和 DOM 元素引用，读取初始配置
   * 2. 初始化 FocusManager（聚焦逻辑管理器）
   * 3. 应用 FOV 配置并创建 OrbitControls 实例
   * 4. 在 OrbitControls 创建完成后注册配置变更监听器（顺序不可颠倒）
   * 5. 配置 OrbitControls 各项参数（阻尼、距离限制、触摸手势等）
   * 6. 初始化平滑缩放距离状态
   * 7. 绑定滚轮和触摸缩放事件监听器
   * 8. 初始化角度平滑过渡状态
   *
   * @param camera Three.js 透视相机实例
   * @param domElement 用于绑定鼠标/触摸事件的 DOM 元素（通常为 renderer.domElement）
   */
  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    // 步骤 1：初始化配置管理（但暂不设置监听器，需等 OrbitControls 创建完毕）
    this.currentConfig = cameraConfigManager.getConfig();
    
    // 步骤 2：初始化增强聚焦管理器（负责聚焦距离计算和过渡动画）
    this.focusManager = new FocusManager();
    
    // 步骤 3a：应用 FOV 配置（视野角度，影响透视感）
    this.camera.fov = CAMERA_CONFIG.fov;
    this.camera.updateProjectionMatrix();
    
    // 步骤 3b：创建 OrbitControls 实例（绑定到相机和 DOM 元素）
    this.controls = new OrbitControls(camera, domElement);
    
    // 步骤 4：在 OrbitControls 初始化后再设置配置监听器
    // ⚠️ 重要：必须在 OrbitControls 创建之后注册，否则 applyConfigChanges 中访问 this.controls 会报错
    this.setupConfigListener();
    
    // 步骤 5a：配置 OrbitControls 阻尼（惯性效果）
    this.controls.enableDamping = true; // 启用阻尼（惯性效果）
    // 阻尼系数：值越小，缓动越明显（每次只衰减一小部分速度，所以会持续更久）
    // 0.05 表示每帧保留 95% 的速度，衰减 5%，会产生明显的惯性效果
    this.controls.dampingFactor = CAMERA_CONFIG.dampingFactor;
    
    // 步骤 5b：启用旋转，禁用平移（防止焦点漂移）
    this.controls.enableRotate = true;
    // 🔧 禁用平移功能，防止焦点漂移（Ctrl/Shift+拖动、双指平移均被禁用）
    this.controls.enablePan = false;
    
    // 步骤 6：初始化平滑缩放距离状态（三个变量保持同步，避免初始跳跃）
    this.smoothDistance = this.camera.position.distanceTo(this.controls.target);
    this.targetDistance = this.smoothDistance;
    
    // 步骤 5c：配置距离限制
    // 将 minDistance 设为 0，避免在聚焦/滚轮时被瞬间限制回较远距离
    // 实际最小距离由防穿透约束动态控制
    this.controls.minDistance = 0;
    this.controls.maxDistance = CAMERA_CONFIG.maxDistance;
    
    // 步骤 5d：配置各操作速度参数
    // 🔧 再次确认禁用平移（防止 enablePan 被其他逻辑意外开启）
    this.controls.enablePan = false;
    this.controls.enableRotate = true; // 启用旋转
    
    // 缩放/平移/旋转速度（基础值，update() 中会根据距离动态调整）
    this.controls.zoomSpeed = CAMERA_CONFIG.zoomSpeed;
    this.controls.panSpeed = CAMERA_CONFIG.panSpeed;
    this.controls.rotateSpeed = CAMERA_CONFIG.rotateSpeed;
    
    // 步骤 5e：禁用 OrbitControls 内置缩放，改用自定义平滑缩放算法
    // 原因：OrbitControls 的缩放是线性的，缺乏近距离时的精细控制
    this.controls.enableZoom = false;
    
    // 步骤 5f：移动端触摸手势配置
    // 🔧 双指只缩放+旋转，不平移，防止焦点漂移
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,        // 单指旋转
      TWO: THREE.TOUCH.DOLLY_ROTATE,  // 双指缩放+旋转，不平移
    };
    
    // 初始化动画管理器（角度过渡 + FOV 过渡）
    this.animator = new CameraAnimator(camera, this.controls, CAMERA_CONFIG.fov);
    
    // 初始化输入事件处理器（滚轮缩放 + 触摸捏合缩放）
    this.inputHandler = new CameraInputHandler(domElement, {
      zoom: (delta) => this.zoom(delta),
      interruptFocusZoom: () => this.interruptFocusZoom(),
      interruptTrackingZoom: () => this.interruptTrackingZoom(),
    });
    
    // 步骤 5g：平移模式和极角限制配置
    this.controls.screenSpacePanning = false; // 使用球面平移，更自然（沿球面移动而非屏幕平面）
    
    // 允许完整的上下旋转（0 到 π，即从正上方到正下方）
    // 不限制极角，支持翻转视角（如从地球南极方向观察）
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    
    // ⚠️ 关键修复：禁用 OrbitControls 的方位角范围限制，避免双重 wrap
    // 若设置了有限范围，OrbitControls 会自己 wrap 一次，我们再 wrap 一次会导致角度跳跃
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    
    // 自动旋转（默认关闭，可通过外部调用开启）
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 2.0; // 自动旋转速度（度/秒）
    
  }

  /**
   * 设置相机垂直角度（polarAngle / 仰俯角）
   *
   * OrbitControls 的 polarAngle（phi）定义：
   * - polarAngle = 0°   → 从 +Y 轴往下看（纯俯视，正上方）
   * - polarAngle = 90°  → 在地平线上（水平视角）
   * - polarAngle > 90°  → 仰视（从下方往上看）
   * - polarAngle = 180° → 从 -Y 轴往上看（纯仰视，正下方）
   *
   * 角度标准化逻辑：
   * - 负数角度：-45° → 135°（等效于从下方看）
   * - 超过 360°：取模后再标准化
   * - 超过 180°：折叠到 0-180° 范围（360° - angle）
   *
   * @param angle 角度（度），0° = 俯视，90° = 水平，支持负数和超过 360° 的值
   * @param smooth 是否平滑过渡（默认 false，立即切换）
   */
  setPolarAngle(angle: number, smooth = false) {
    this.animator.setPolarAngle(angle, smooth);
  }

  /**
   * 设置相机水平角度（azimuthalAngle / 方位角）
   *
   * @param angle 角度（度），0° = 正前方，90° = 右侧，-90° = 左侧，支持任意值
   * @param smooth 是否平滑过渡（默认 false，立即切换）
   */
  setAzimuthalAngle(angle: number, smooth = false) {
    this.animator.setAzimuthalAngle(angle, smooth);
  }

  /**
   * 设置相机控制模式
   *
   * - `free`：自由模式，用户可以自由旋转和缩放，OrbitControls 完全启用
   * - `locked`：锁定模式，OrbitControls 启用但相机锁定到目标天体（TODO）
   * - `follow`：跟随模式，OrbitControls 禁用，相机自动跟随目标天体移动
   *
   * @param mode 相机模式（'free' | 'locked' | 'follow'）
   */
  setMode(mode: CameraMode) {
    this.mode = mode;
    
    switch (mode) {
      case 'free':
        this.controls.enabled = true;
        break;
      case 'locked':
        this.controls.enabled = true;
        // TODO: 锁定到目标天体
        break;
      case 'follow':
        this.controls.enabled = false;
        // TODO: 跟随目标
        break;
    }
  }

  private interruptFocusZoom(): void {
    if (!this.isFocusing) return;
    this.isFocusing = false;
    this.targetCameraPosition = null;
    this.targetControlsTarget = null;
    const currentDist = this.camera.position.distanceTo(this.controls.target);
    if (isFinite(currentDist) && currentDist > 0) {
      this.smoothDistance = currentDist;
      this.targetDistance = currentDist;
    }
    this.resetMinDistance();
  }

  private interruptTrackingZoom(): void {
    if (!this.isTracking) return;
    const currentDist = this.smoothDistance || this.camera.position.distanceTo(this.controls.target);
    if (isFinite(currentDist) && currentDist > 0) {
      this.smoothDistance = currentDist;
      this.targetDistance = currentDist;
      this.trackingDistance = currentDist;
    }
  }

  /**
   * 设置相机跟随的目标天体
   *
   * 将 OrbitControls 的观察目标点（target）立即移动到目标天体的当前位置。
   * 通常在切换到 `locked` 或 `follow` 模式前调用。
   *
   * @param body 目标天体的 Three.js 对象（其 position 属性将作为观察中心）
   */
  setTarget(body: THREE.Object3D) {
    this.targetBody = body;
    if (body) {
      this.controls.target.copy(body.position);
      this.controls.update();
    }
  }
  
  /**
   * 聚焦到目标天体（增强版，使用 FocusManager 智能计算聚焦距离）
   *
   * 聚焦距离计算流程：
   * 1. 若提供了 `celestialObject`，调用 FocusManager 根据天体半径和类型计算最优聚焦距离
   *    （例如：地球半径约 0.0426 AU，聚焦距离约为半径的 3-5 倍）
   * 2. 若未提供天体信息，使用 `options.distance` 或默认值 5 AU
   * 3. 根据当前相机方向（从 controls.target 指向 camera.position）计算新相机位置
   * 4. 对新相机位置应用防穿透约束（确保不进入天体内部）
   * 5. 同步平滑缩放距离，启动聚焦过渡动画（由 update() 每帧 Lerp 插值完成）
   *
   * 若提供了 `trackingTargetGetter`，聚焦完成后将持续跟踪目标位置（适用于运动天体）。
   *
   * @param targetPosition 目标天体的初始世界坐标（AU）
   * @param celestialObject 目标天体的属性（名称、半径等），用于智能距离计算
   * @param trackingTargetGetter 可选的跟踪函数，每帧调用以获取目标最新位置（用于运动天体）
   * @param options 可选的聚焦参数（距离、动画时长等）
   */
  focusOnTarget(
    targetPosition: THREE.Vector3, 
    celestialObject?: CelestialObject, 
    trackingTargetGetter?: () => THREE.Vector3,
    options?: FocusOptions
  ): void {
    // Stop previous focus animation
    this.isFocusing = false;
    
    // Calculate optimal focus distance using enhanced system
    let targetDistance = 5; // Default fallback
    
    if (celestialObject) {
      targetDistance = this.focusManager.calculateFocusDistance(celestialObject, options);
      
      // Start focus transition tracking
      this.focusManager.startFocusTransition(celestialObject, options);
      
      // Store target radius for penetration prevention
      this.currentTargetRadius = celestialObject.radius;
    } else {
      // Legacy support - use provided distance or default
      targetDistance = options?.distance || 5;
      this.currentTargetRadius = null;
    }
    
    // Set tracking mode
    if (trackingTargetGetter) {
      this.isTracking = true;
      this.trackingTargetGetter = trackingTargetGetter;
      this.trackingDistance = targetDistance;
    } else {
      this.isTracking = false;
      this.trackingTargetGetter = null;
    }

    // Calculate camera direction (from target to camera)
    const currentDirection = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();
    
    // Use default direction if invalid
    if (currentDirection.length() < 0.001) {
      currentDirection.set(0, 0.5, 1).normalize();
    }
    
    // Calculate safe camera position
    let newCameraPosition = new THREE.Vector3()
      .copy(targetPosition)
      .add(currentDirection.multiplyScalar(targetDistance));
    
    // Apply penetration constraints if object is provided
    if (celestialObject) {
      newCameraPosition = this.focusManager.applyPenetrationConstraints(
        newCameraPosition, 
        targetPosition, 
        celestialObject.radius
      );
      
      // Recalculate actual distance after constraint application
      targetDistance = newCameraPosition.distanceTo(targetPosition);
    }
    
    // Sync smooth distance for zoom continuity
    this.smoothDistance = targetDistance;
    this.targetDistance = targetDistance;
    
    // Set transition targets
    this.targetCameraPosition = newCameraPosition;
    this.targetControlsTarget = targetPosition.clone();
    this.isFocusing = true;
  }

  /**
   * 向后兼容的聚焦方法（旧版接口，新代码请使用 focusOnTarget）
   *
   * 将参数转换为 CelestialObject 格式后委托给 focusOnTarget 处理。
   *
   * @param targetPosition 目标天体的世界坐标（AU）
   * @param targetDistance 聚焦距离（AU），默认 5 AU
   * @param trackingTargetGetter 可选的跟踪函数，每帧调用以获取目标最新位置
   * @param planetRadius 目标天体半径（AU），用于防穿透约束
   */
  focusOnTargetLegacy(targetPosition: THREE.Vector3, targetDistance = 5, trackingTargetGetter?: () => THREE.Vector3, planetRadius?: number): void {
    const celestialObject: CelestialObject | undefined = planetRadius ? {
      name: 'unknown',
      radius: planetRadius
    } : undefined;
    
    this.focusOnTarget(targetPosition, celestialObject, trackingTargetGetter, { distance: targetDistance });
  }
  
  /**
   * 设置配置监听器（在 OrbitControls 初始化后调用）
   *
   * 订阅 CameraConfigManager 的配置变更事件，当用户通过调试面板修改参数时，
   * 自动将新配置应用到 OrbitControls（如阻尼系数等）。
   * 返回的取消订阅函数保存在 configUnsubscribe 中，由 dispose() 调用清理。
   */
  private setupConfigListener() {
    this.configUnsubscribe = cameraConfigManager.addListener((newConfig) => {
      this.currentConfig = newConfig;
      this.applyConfigChanges(newConfig);
    });
  }

  /**
   * 将配置变更应用到 OrbitControls（配置监听器的回调函数）
   *
   * 目前仅同步阻尼系数（dampingFactor），后续可扩展其他参数。
   *
   * @param config 新的相机配置对象
   */
  private applyConfigChanges(config: CameraConfigType) {
    if (!this.controls) return;
    this.controls.dampingFactor = config.dampingFactor;
  }

  /**
   * 重置最小距离限制到默认值（取消聚焦或停止跟踪时调用）
   *
   * 将 OrbitControls.minDistance 重置为 0，允许用户自由缩放到任意近距离。
   * 实际的最小距离由防穿透约束动态控制，而非 OrbitControls 的静态限制。
   */
  resetMinDistance() {
    // 将 minDistance 重置为 0（不再限制最小距离）
    this.controls.minDistance = 0;
  }

  /**
   * 防穿透约束系统（实时检测，每帧调用）
   *
   * 安全距离计算依据：
   * - 最小安全距离 = 目标天体半径 × safetyDistanceMultiplier
   * - safetyDistanceMultiplier 默认为 1.000001（来自 CAMERA_PENETRATION_CONFIG）
   *   对应地球表面上方约 6m（地球半径 6371km × 0.000001 ≈ 6.37m）
   * - 这个微小的安全余量确保相机始终在天体表面外侧，避免 Z-fighting 和穿透视觉问题
   *
   * 修正策略：
   * - 穿透深度比例 > 0.7（深度穿透）：立即强制修正（forceSnap），避免相机卡在天体内部
   * - 穿透深度比例 ≤ 0.7（轻微穿透）：平滑修正，使用 easeOutQuart 缓动函数逐渐推出
   *   - 自适应平滑系数：穿透越深，修正越快（adaptiveSmoothness = baseSmoothness × (1 + penetrationRatio)）
   *
   * @param deltaTime 当前帧时间步长（秒），用于帧率无关的平滑修正
   */
  applyPenetrationConstraint(deltaTime: number) {
    // 仅在已知目标半径时启用防穿透逻辑
    if (!this.currentTargetRadius) return;

    // 确定参考中心（优先使用跟踪获取器，其次是设置的 targetBody，再次使用 controls.target）
    let center: THREE.Vector3 | null = null;
    if (this.trackingTargetGetter) {
      center = this.trackingTargetGetter();
    } else if (this.targetBody) {
      center = this.targetBody.position;
    } else if (this.targetControlsTarget) {
      center = this.targetControlsTarget.clone();
    } else {
      center = this.controls.target.clone();
    }

    if (!center) return;

    const camPos = this.camera.position.clone();
    const dir = new THREE.Vector3().subVectors(camPos, center);
    const distToCenter = dir.length();
    if (!isFinite(distToCenter) || distToCenter <= 0) return;

    const minAllowedFromCenter = this.currentTargetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;

    // Enhanced real-time penetration detection
    const penetrationDepth = Math.max(0, minAllowedFromCenter - distToCenter);
    const isPenetrating = penetrationDepth > 0;
    
    // 如果距离已经安全，则无需处理
    if (!isPenetrating) return;

    // Calculate penetration severity for adaptive response
    // 穿透比例 = 穿透深度 / 最小安全距离（0 = 刚好接触，1 = 完全在中心）
    const penetrationRatio = penetrationDepth / minAllowedFromCenter;
    const isDeepPenetration = penetrationRatio > 0.7; // 提高深度穿透阈值

    // 计算安全的相机位置（保持当前方向，但调整距离）
    const dirNorm = dir.length() > 1e-6 ? dir.normalize() : new THREE.Vector3(0, 1, 0);
    
    // ⚠️ 关键修复：只调整相机位置，不修改 controls.target
    // 这样用户仍然可以自由旋转视角，只是不能穿透星球
    if (CAMERA_PENETRATION_CONFIG.forceSnap && isDeepPenetration) {
      // 立即修正：直接设置相机位置到安全距离（仅用 minAllowedFromCenter，不用 smoothDistance）
      const safeCamPos = center.clone().add(dirNorm.clone().multiplyScalar(minAllowedFromCenter));
      this.camera.position.copy(safeCamPos);
      this.smoothDistance = minAllowedFromCenter;
      this.targetDistance = minAllowedFromCenter;
      
      // 如果正在跟踪，同步跟踪距离
      if (this.isTracking) {
        this.trackingDistance = minAllowedFromCenter;
      }
      
      this.controls.update();
    } else {
      // 平滑修正：逐渐将相机移动到安全距离（仅推到 minAllowedFromCenter，不多推）
      const baseSmoothness = CAMERA_PENETRATION_CONFIG.constraintSmoothness;
      const adaptiveSmoothness = baseSmoothness * (1 + penetrationRatio);
      const factor = Math.min(1, adaptiveSmoothness * Math.max(0.0001, deltaTime * 60));
      
      const easedFactor = easeOutQuart(factor);
      const safeCamPos = center.clone().add(dirNorm.clone().multiplyScalar(minAllowedFromCenter));
      this.camera.position.lerp(safeCamPos, easedFactor);
      
      // Update smooth distance gradually
      const currentDist = this.camera.position.distanceTo(center);
      this.smoothDistance = THREE.MathUtils.lerp(this.smoothDistance, currentDist, easedFactor);
      this.targetDistance = Math.max(this.targetDistance, minAllowedFromCenter);
      
      // 如果正在跟踪，同步跟踪距离
      if (this.isTracking) {
        this.trackingDistance = this.smoothDistance;
      }

      this.controls.update();
    }

    if (CAMERA_PENETRATION_CONFIG.debugMode) {
      // debug logging removed
    }
  }

  /**
   * 四次方缓出（easeOutQuart）缓动函数
   *
   * 数学原理：`f(t) = 1 - (1 - t)^4`
   * - 当 t = 0 时，f(0) = 0（起始点，速度最快）
   * - 当 t = 1 时，f(1) = 1（终止点，速度为零）
   * - 函数在 t 接近 1 时急剧减速（四次方衰减），产生"快进慢出"的视觉效果
   * - 相比线性插值（Lerp），缓出函数使防穿透修正在接近安全距离时更加平滑，
   *   避免相机在边界处产生抖动
   *
   * @param t 插值参数，范围 [0, 1]
   * @returns 缓动后的插值系数，范围 [0, 1]
   */
  /**
   * 输入操作期间的实时防穿透检测（缩放和旋转时调用）
   *
   * 在用户主动缩放时，对计算出的新相机位置进行防穿透检查。
   * 若新位置在安全距离内，则将其推回到安全距离处（保持方向不变）。
   * 这是 applyPenetrationConstraint 的补充，专门处理缩放操作中的即时约束。
   *
   * @param proposedCameraPosition 缩放计算出的候选相机位置（世界坐标，AU）
   * @param center 目标天体的中心位置（世界坐标，AU）
   * @returns 经过防穿透约束后的安全相机位置
   */
  private preventPenetrationDuringInput(proposedCameraPosition: THREE.Vector3, center: THREE.Vector3): THREE.Vector3 {
    return preventPenetrationDuringInput(
      proposedCameraPosition,
      center,
      this.currentTargetRadius,
      CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier,
    );
  }
  
  /**
   * 停止跟踪目标，切换回自由相机模式
   *
   * 清除跟踪状态和跟踪目标获取函数。
   * 若当前不在缩放状态，同时重置最小距离限制（允许用户自由缩放）。
   * 在双指缩放时不重置最小距离，避免相机位置跳跃。
   */
  stopTracking() {
    this.isTracking = false;
    this.trackingTargetGetter = null;
    // 在双指缩放时不重置最小距离，避免相机跳跃
    if (!this.isZooming) {
      this.resetMinDistance();
    }
  }

  /**
   * 获取当前跟踪目标的位置和半径（供外部调整 near/far 平面使用）
   * @returns 跟踪目标的位置和半径，未跟踪时返回 null
   */
  getTrackingInfo(): { position: THREE.Vector3; radius: number } | null {
    if (!this.isTracking || !this.trackingTargetGetter || !this.currentTargetRadius) {
      return null;
    }
    return {
      position: this.trackingTargetGetter(),
      radius: this.currentTargetRadius,
    };
  }

  /**
   * 设置地球锁定相机模式（启用/禁用标志）
   *
   * 地球锁定模式下，相机会随地球自转同步旋转，使地球在视觉上保持静止。
   * 启用后需配合 applyEarthLockDelta() 每帧传入自转增量四元数。
   *
   * @param enabled 是否启用地球锁定模式
   */
  setEarthLockMode(enabled: boolean): void {
    this.earthLockEnabled = enabled;
  }

  /**
   * 获取地球锁定模式的当前状态
   *
   * @returns 是否处于地球锁定模式
   */
  getEarthLockEnabled(): boolean {
    return this.earthLockEnabled;
  }

  /**
   * 应用地球自转增量到相机（由动画循环每帧调用）
   * @param deltaQ 本帧地球自转的增量四元数（newQ * inverse(oldQ)）
   * @param earthPos 地球世界坐标
   */
  applyEarthLockDelta(deltaQ: THREE.Quaternion, earthPos: THREE.Vector3): void {
    this._applyEarthLockV9(deltaQ, earthPos);
  }

  /**
   * 地球锁定算法 V9：将相机随地球自转同步旋转，同时保持 camera.up 对齐地球北极方向
   *
   * 算法步骤：
   * 1. 将相机位置（相对地球中心）应用自转增量四元数，使相机随地球转动
   * 2. 将 controls.target（相对地球中心）同样应用四元数，保持观察方向不变
   * 3. 将 camera.up 应用四元数，使 up 向量跟随地球自转轴旋转
   * 4. 将 earthAxis（自转轴方向）投影到垂直于视线的平面，作为修正后的 up 向量
   *    - 这样 up 始终"朝向地球北极"，视觉上地球不会滚动
   *    - 拖动旋转时方向也正确（因为 up 与视线垂直）
   * 5. 将修正后的 up 存入 _pendingUpForQuat，等 controls.update() 之后再同步 _quat
   *    - 必须在 controls.update() 之后同步，否则 OrbitControls 会用旧的 _quat 覆盖
   *
   * @param deltaQ 本帧地球自转的增量四元数（newQ × inverse(oldQ)）
   * @param earthPos 地球世界坐标（AU）
   */
  private _applyEarthLockV9(deltaQ: THREE.Quaternion, earthPos: THREE.Vector3): void {
    // 旋转相机位置
    const camRelative = new THREE.Vector3().subVectors(this.camera.position, earthPos);
    camRelative.applyQuaternion(deltaQ);
    this.camera.position.copy(earthPos).add(camRelative);

    // 旋转 target
    const targetRelative = new THREE.Vector3().subVectors(this.controls.target, earthPos);
    targetRelative.applyQuaternion(deltaQ);
    this.controls.target.copy(earthPos).add(targetRelative);

    // 地球自转轴方向：用当前 camera.up 经过 deltaQ 旋转后的方向
    // （camera.up 初始化时已经对齐到地球自转轴，每帧跟着转）
    const earthAxis = this.camera.up.clone().applyQuaternion(deltaQ).normalize();
    this.camera.up.copy(earthAxis);

    // 把 earthAxis 投影到垂直于视线的平面，作为修正后的 up
    const viewDir = new THREE.Vector3()
      .subVectors(this.controls.target, this.camera.position)
      .normalize();
    const dot = earthAxis.dot(viewDir);
    const upProjected = earthAxis.clone()
      .sub(viewDir.clone().multiplyScalar(dot))
      .normalize();

    if (upProjected.length() > 0.1) {
      this.camera.up.copy(upProjected);
    }

    // 存储新 up，等 controls.update() 之后再同步 _quat
    this._pendingUpForQuat = this.camera.up.clone();
  }

  /**
   * 手动缩放相机 — 惯性缓动
   *
   * 算法：当前距离 × (1 ± effectiveFactor) → 设置 targetDistance
   * 实际相机位置由 update() 循环通过 zoomEasingSpeed 平滑插值
   * 防穿透约束：距离不低于 minSafeDistance
   */
  zoom(delta: number) {
    if (this.isFocusing) {
      this.isFocusing = false;
      this.targetCameraPosition = null;
      this.targetControlsTarget = null;
    }

    // 始终从相机实际位置读取距离，避免 smoothDistance 过时导致跳跃
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    
    if (!isFinite(currentDistance) || currentDistance <= 0) return;
    
    const baseFactor = this.currentConfig.zoomBaseFactor;
    const scrollSpeed = Math.min(Math.abs(delta), 2);
    const effectiveFactor = baseFactor;

    if (delta > 0) {
      // 放大方向
      const zoomFactor = 1 - (effectiveFactor * scrollSpeed);
      let newTargetDistance = currentDistance * zoomFactor;

      if (this.currentTargetRadius) {
        const minSafeDistance = this.currentTargetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;
        newTargetDistance = Math.max(newTargetDistance, minSafeDistance);
        if (currentDistance < minSafeDistance) {
          newTargetDistance = minSafeDistance;
        }
      }
      newTargetDistance = Math.max(CAMERA_CONFIG.minDistance, Math.min(this.controls.maxDistance, newTargetDistance));
      this.targetDistance = newTargetDistance;
    } else {
      // 缩小方向
      const zoomFactor = 1 + (effectiveFactor * scrollSpeed);
      let newTargetDistance = currentDistance * zoomFactor;

      if (this.currentTargetRadius) {
        const minSafeDistance = this.currentTargetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;
        newTargetDistance = Math.max(newTargetDistance, minSafeDistance);
        if (currentDistance < minSafeDistance) {
          newTargetDistance = minSafeDistance;
        }
      }

      this.targetDistance = Math.max(
        CAMERA_CONFIG.minDistance,
        Math.min(this.controls.maxDistance, newTargetDistance)
      );
    }
    
    // 惯性缓动：仅设置 targetDistance，由 update() 循环平滑插值
    // smoothDistance 沿当前相机方向逐步逼近 targetDistance，产生惯性缓动效果
    this.isZooming = true;
    this._justZoomed = true; // 标记本帧刚缩放，防止跟踪 lerp 覆盖
    
    if (this.isTracking) {
      this.trackingDistance = this.targetDistance;
    }
    // 注意：不在此处直接设置相机位置，由 update() 循环中的平滑缩放逻辑处理实际过渡
  }

  /**
   * 每帧更新相机状态（动画循环主入口）
   *
 * 执行顺序（顺序不可随意调整）：
 * 1. 更新 FocusManager 的聚焦过渡进度
 * 2. FOV 过渡（仅 setFov() 触发）
 * 3. 应用防穿透约束（确保相机不进入天体内部）
 * 4. 处理方位角（左右）平滑过渡
 * 5. 处理极角（上下）平滑过渡
 * 6. 处理聚焦动画（Lerp 插值移动相机到目标位置）
 * 7. 处理跟随模式（follow mode）
 * 8. 执行即时缩放（统一距离缩放，无缓动）
 * 9. 处理跟踪模式（持续跟随运动天体）
 * 10. 同步平滑距离（防止累积误差）
 * 11. 动态调整旋转/平移速度（基于距离和 FOV 的对数曲线）
 * 12. 调用 OrbitControls.update()（应用阻尼效果）
 * 13. 同步地球锁定的四元数（controls.update() 之后）
   *
   * @param deltaTime 当前帧时间步长（秒），用于帧率无关的动画计算
   */
  update(deltaTime: number) {
    // Update focus manager transitions
    const focusProgress = this.focusManager.updateFocusTransition(deltaTime);
    if (focusProgress >= 0 && focusProgress < 1) {
      // Focus transition is handled by existing isFocusing logic below
    }
    
    // Handle user interruption of focus transitions
    if (this.focusManager.isCurrentlyTransitioning() && (this.isZooming || this.isTracking)) {
      this.focusManager.interruptTransition();
    }
    
    // 代理角度 + FOV 过渡到 CameraAnimator
    this.animator.update(deltaTime);
    
    // 每帧应用防穿透约束，确保相机不会进入行星内部
    this.applyPenetrationConstraint(deltaTime);
    
    // 处理聚焦动画（仅在非跟踪模式下）
    if (!this.isTracking && this.isFocusing && this.targetCameraPosition && this.targetControlsTarget) {
      const cameraLerpSpeed = CAMERA_CONFIG.focusLerpSpeed;
      const targetLerpSpeed = CAMERA_CONFIG.focusLerpSpeed;
      
      this.camera.position.lerp(this.targetCameraPosition, cameraLerpSpeed);
      this.controls.target.lerp(this.targetControlsTarget, targetLerpSpeed);
      
      // 检查是否到达目标位置
      const cameraDist = this.camera.position.distanceTo(this.targetCameraPosition);
      const targetDist = this.controls.target.distanceTo(this.targetControlsTarget);
      
      if (cameraDist < CAMERA_CONFIG.focusThreshold && targetDist < CAMERA_CONFIG.focusThreshold) {
        // 到达目标位置后，停止聚焦动画，允许用户自由移动视角
        this.isFocusing = false;
        this.targetCameraPosition = null;
        this.targetControlsTarget = null;
        // 同步平滑距离，确保缩放从当前位置开始
        this.smoothDistance = this.camera.position.distanceTo(this.controls.target);
        this.targetDistance = this.smoothDistance;
        // 如果正在跟踪，同步跟踪距离
        if (this.isTracking) {
          this.trackingDistance = this.smoothDistance;
        }
        // 确保缩放功能启用（重置缩放状态，允许新的缩放操作）
        this.isZooming = false;
        // 更新 controls 以确保相机位置正确
        this.controls.update();
        // 继续执行后续逻辑，允许缩放和旋转（不返回，继续执行）
      } else {
        // 聚焦动画中，更新 controls
        this.controls.update();
        // 聚焦动画中，仍然允许缩放（滚轮事件已经在 wheelHandler 中处理了停止聚焦）
        // 不返回，继续执行后续的缩放逻辑，这样滚轮缩放才能正常工作
      }
    }
    
    if (this.mode === 'follow' && this.targetBody) {
      // 跟随模式：平滑移动相机到目标位置
      const targetPos = this.targetBody.position.clone();
      this.camera.position.lerp(targetPos.clone().add(new THREE.Vector3(0, 0, 10)), this.followSpeed);
      this.controls.target.lerp(targetPos, this.followSpeed);
    }
    
    // ⚠️ 关键优化：只有在真正需要缩放时才执行缩放逻辑
    // 即时缩放实现（无缓动效果）
    // ⚠️ 重要：缩放逻辑必须在跟踪逻辑之前执行，这样跟踪逻辑才能使用缩放后的距离
    if (this.isZooming) {
      const distanceDiff = this.targetDistance - this.smoothDistance;
      
      // ⚠️ 性能优化：使用自适应完成阈值，大距离时使用更大的阈值
      const adaptiveThreshold = Math.max(0.001, Math.min(0.1, this.smoothDistance * 0.001));
      
      if (Math.abs(distanceDiff) > adaptiveThreshold) {
        // ⚠️ 简化缩放算法：统一的缓动速度，不区分大小范围
        const baseSpeed = this.currentConfig.zoomEasingSpeed;
        const adaptiveSpeed = baseSpeed;
        
        this.smoothDistance += distanceDiff * adaptiveSpeed;
        
        // 如果正在跟踪，更新跟踪距离（让跟踪逻辑使用缩放后的距离）
        if (this.isTracking) {
          this.trackingDistance = this.smoothDistance;
        }
        
        // ⚠️ 性能优化：减少不必要的向量计算
        // 应用平滑缩放：调整相机位置以匹配平滑距离
        const direction = new THREE.Vector3()
          .subVectors(this.camera.position, this.controls.target);
        
        const directionLength = direction.length();
        
        // 如果方向无效，使用默认方向
        if (directionLength < 0.001 || !isFinite(directionLength)) {
          direction.set(0, 0.5, 1).normalize();
        } else {
          direction.normalize();
        }
        
        // 防止 NaN 和无效值
        if (!isFinite(this.smoothDistance) || this.smoothDistance <= 0) {
          console.warn('CameraController.update: Invalid smoothDistance', this.smoothDistance);
          this.isZooming = false;
          return;
        }
        
        // 计算新的相机位置
        let newPosition = new THREE.Vector3()
          .copy(this.controls.target)
          .add(direction.multiplyScalar(this.smoothDistance));
        
        // Enhanced penetration prevention during smooth zoom
        if (this.currentTargetRadius) {
          const center = this.trackingTargetGetter ? this.trackingTargetGetter() : this.controls.target;
          newPosition = this.preventPenetrationDuringInput(newPosition, center);
          
          // Update smooth distance if position was corrected
          const correctedDistance = newPosition.distanceTo(this.controls.target);
          if (Math.abs(correctedDistance - this.smoothDistance) > 0.01) {
            this.smoothDistance = correctedDistance;
            this.targetDistance = Math.max(this.targetDistance, this.smoothDistance);
          }
        }
        
        // ⚠️ 关键修复：如果正在跟踪，直接设置位置（不使用 lerp，避免被跟踪逻辑覆盖）
        // 如果不在跟踪，也可以直接设置（因为我们已经有平滑距离）
        this.camera.position.copy(newPosition);
        
        // 如果正在跟踪，同步更新 trackingDistance，确保跟踪逻辑使用正确的距离
        if (this.isTracking) {
          this.trackingDistance = this.smoothDistance;
        }
      } else {
        // 缩放完成
        this.isZooming = false;
        this.smoothDistance = this.targetDistance;
        // 如果正在跟踪，同步跟踪距离
        if (this.isTracking) {
          this.trackingDistance = this.smoothDistance;
        }
      }
    }
    
    // 处理跟踪模式（如果正在跟踪目标）
    // ⚠️ 重要：跟踪逻辑在缩放逻辑之后执行，使用缩放后的距离
    if (this.isTracking && this.trackingTargetGetter) {
      const currentTargetPosition = this.trackingTargetGetter();
      if (currentTargetPosition) {
        // ⚠️ 关键修复：如果刚缩放或正在缩放，不要用 lerp 覆盖缩放效果
        const justZoomed = this._justZoomed;
        this._justZoomed = false;
        
        if (this.isZooming || justZoomed) {
          // 缩放中：只更新 controls.target，保持相机位置不变（由缩放逻辑控制）
          this.controls.target.lerp(currentTargetPosition, CAMERA_CONFIG.trackingLerpSpeed);
          // 同步更新 trackingDistance，确保缩放完成后使用正确的距离
          this.trackingDistance = this.smoothDistance;
        } else {
          // 缩放完成：正常跟踪，使用 trackingDistance
          // 计算相机应该保持的方向（从目标指向相机）
          const currentDirection = new THREE.Vector3()
            .subVectors(this.camera.position, this.controls.target)
            .normalize();
          
          // 如果方向无效，使用默认方向
          if (currentDirection.length() < 0.001 || !isFinite(currentDirection.x)) {
            currentDirection.set(0, 0.5, 1).normalize();
          }
          
          // 使用 trackingDistance（如果缩放完成，应该等于 smoothDistance）
          const trackingDist = this.trackingDistance || this.smoothDistance;
          
          // 防止 NaN 和无效值
          if (!isFinite(trackingDist) || trackingDist <= 0) {
            console.warn('CameraController.update: Invalid trackingDistance', trackingDist);
            this.controls.update();
            return;
          }
          
          // 计算新的相机位置（保持距离和方向）
          const newCameraPosition = new THREE.Vector3()
            .copy(currentTargetPosition)
            .add(currentDirection.multiplyScalar(trackingDist));
          
          // ⚠️ 关键修复：使用更小的 lerp 速度，减少抖动
          // 对于远距离恒星，使用更小的跟踪速度以减少抖动
          const distance = this.camera.position.distanceTo(currentTargetPosition);
          const adaptiveTrackingSpeed = distance > 10000 
            ? CAMERA_CONFIG.trackingLerpSpeed * 0.3  // 远距离：降低到30%
            : CAMERA_CONFIG.trackingLerpSpeed;
          
          // 平滑移动相机和目标（跟随目标）
          this.camera.position.lerp(newCameraPosition, adaptiveTrackingSpeed);
          this.controls.target.lerp(currentTargetPosition, adaptiveTrackingSpeed);
        }
        
        // 更新 controls
        this.controls.update();
        // 继续执行后续逻辑，允许缩放和旋转
      }
    }
    
    // ⚠️ 性能优化：只在必要时同步距离
    // 确保平滑距离始终与当前距离同步（防止累积误差）
    if (!this.isZooming && !this.isTracking) {
      const currentDistance = this.camera.position.distanceTo(this.controls.target);
      if (Math.abs(currentDistance - this.smoothDistance) > 0.1) {
        this.smoothDistance = currentDistance;
        this.targetDistance = currentDistance;
      }
    }
    
    // 更新 OrbitControls（这会应用旋转和平移的阻尼效果）
    // 动态调整 panSpeed + rotateSpeed：
    // - 优先使用外部注入的移动灵敏度曲线（_dragSensitivityCurve）
    // - 正常模式：基于距离的对数曲线，近距离时降低灵敏度
    // - FOV 缩放模式：基于 FOV 比例，FOV 越小灵敏度越低
    {
      const currentDist = this.camera.position.distanceTo(this.controls.target);
      type CurveT = { anchors: {nx:number;ny:number}[]; yMin:number; yMax:number };
      const dragCurve = this._dragSensitivityCurve as CurveT | undefined;
      let scale: number;
      if (dragCurve && dragCurve.anchors.length >= 2) {
        scale = evalSensitivityCurve(dragCurve, currentDist);
      } else {
        const REF_DISTANCE_AU = 1.0;
        const LOG_RANGE = 5;
        const MIN_SCALE = 0.04;
        const logRatio = Math.log10(Math.max(currentDist, 1e-12) / REF_DISTANCE_AU);
        const distScale = Math.max(MIN_SCALE, Math.min(1.0, logRatio / LOG_RANGE + 1.0));
        const fovScale = Math.max(0.005, this.camera.fov / CameraController.FOV_DEFAULT);
        scale = Math.max(distScale, fovScale);
      }
      this.controls.panSpeed = CAMERA_CONFIG.panSpeed * scale;
      this.controls.rotateSpeed = CAMERA_CONFIG.rotateSpeed * scale;
    }
    this.controls.update();
    // V8: controls.update() 之后同步 _quat/_quatInverse
    // 这样当前帧 update() 用旧 _quat（锁定正确），下一帧拖动用新 _quat（方向正确）
    if (this._pendingUpForQuat) {
      const controlsAny = this.controls as any;
      if (controlsAny._quat && controlsAny._quatInverse) {
        controlsAny._quat.setFromUnitVectors(this._pendingUpForQuat, new THREE.Vector3(0, 1, 0));
        controlsAny._quatInverse.copy(controlsAny._quat).invert();
      }
      this._pendingUpForQuat = null;
    }
  }

  /**
   * 获取调试信息（供调试面板使用）
   *
   * 返回当前相机状态的快照，包括距离、FOV、缩放状态、速度缩放系数等，
   * 用于 CameraDebugPanel 实时显示和参数调试。
   *
   * @returns 包含相机调试信息的对象
   */
  getDebugInfo() {
    const currentDist = this.camera.position.distanceTo(this.controls.target);
    const REF_DISTANCE_AU = 1.0;
    const LOG_RANGE = 5;
    const logRatio = Math.log10(Math.max(currentDist, 1e-12) / REF_DISTANCE_AU);
    const distScale = Math.max(0.04, Math.min(1.0, logRatio / LOG_RANGE + 1.0));
    const fovScale = Math.max(0.005, this.camera.fov / CameraController.FOV_DEFAULT);
    const rotateScale = Math.max(distScale, fovScale);
    return {
      distance: currentDist,
      fov: this.camera.fov,
      fovDefault: CameraController.FOV_DEFAULT,
      fovMin: CameraController.FOV_MIN,
      fovZoomActive: false, // 已移除 FOV 光学变焦层，始终为 false
      smoothDistance: this.smoothDistance,
      targetDistance: this.targetDistance,
      isZooming: this.isZooming,
      isTracking: this.isTracking,
      distScale,
      fovScale,
      rotateScale,
      panSpeed: this.controls.panSpeed,
      rotateSpeed: this.controls.rotateSpeed,
      zoomBaseFactor: this.currentConfig.zoomBaseFactor,
      zoomEasingSpeed: this.currentConfig.zoomEasingSpeed,
      fovDragSensitivity: this.currentConfig.fovDragSensitivity ?? 3.0,
    };
  }

  /**
   * 动态更新缩放/灵敏度参数（供调试面板使用）
   *
   * 支持的参数键：
   * - `zoomBaseFactor`：缩放基础系数（影响每次滚轮的缩放幅度）
   * - `zoomEasingSpeed`：缩放缓动速度（影响平滑缩放的响应速度）
   * - `fovZoomSpeed`：FOV 缩放速度（影响光学变焦的速度）
   * - `fovDragSensitivity`：FOV 模式下的拖动灵敏度
   * - `dampingFactor`：OrbitControls 阻尼系数（影响惯性效果）
   *
   * @param key 参数名称
   * @param value 参数值
   */
  setDebugParam(key: string, value: number) {
    switch (key) {
      case 'zoomBaseFactor':
        this.currentConfig = { ...this.currentConfig, zoomBaseFactor: value };
        break;
      case 'zoomEasingSpeed':
        this.currentConfig = { ...this.currentConfig, zoomEasingSpeed: value };
        break;
      case 'fovZoomSpeed':
        // 存储到实例变量，zoom() 里读取
        (this as any)._fovZoomSpeed = value;
        break;
      case 'fovDragSensitivity':
        this.currentConfig = { ...this.currentConfig, fovDragSensitivity: value };
        break;
      case 'dampingFactor':
        this.controls.dampingFactor = value;
        this.currentConfig = { ...this.currentConfig, dampingFactor: value };
        break;
    }
  }

  /**
   * 获取当前 FOV 缩放速度（光学变焦速度系数）
   *
   * 优先返回通过 setDebugParam('fovZoomSpeed', ...) 设置的自定义值，
   * 否则返回默认值 3.5。
   *
   * @returns FOV 缩放速度系数（默认 3.5）
   */
  getFovZoomSpeed(): number {
    return (this as any)._fovZoomSpeed ?? 3.5;
  }

  /**
   * 获取底层 OrbitControls 实例（供外部直接访问控制器属性）
   *
   * @returns Three.js OrbitControls 实例
   */
  getControls(): OrbitControls {
    return this.controls;
  }

  private _dragSensitivityCurve = DEFAULT_DRAG_CURVE;

  // FOV（视野角度）相关 — setFov() 保留，用于程序化设置；缩放中不再使用 FOV 光学变焦
  // 当距离无法继续缩小时（被防穿透或 minDistance 限制），缩放直接停止
  private static readonly FOV_MIN = 0.05; // 最小 FOV（度），约等于 300mm 长焦镜头
  private static readonly FOV_DEFAULT = CAMERA_CONFIG.fov; // 默认 FOV（度）
  // 缩放-跟踪协调：防止跟踪 lerp 覆盖即时缩放
  private _justZoomed: boolean = false;

  /**
   * 设置相机视野角度（FOV）
   * @param fov 视野角度（度）
   * @param smooth 是否平滑过渡（默认 false，立即切换）
   */
  setFov(fov: number, smooth = false) {
    this.animator.setFov(fov, smooth);
  }

  /**
   * 从当前相机位置同步内部状态（smoothDistance / targetDistance / trackingDistance）
   *
   * 在相机被外部系统修改后（如退出 Cesium 模式后从 Cesium 同步回 Three.js），
   * 必须调用此方法，否则跟踪 lerp 会基于过时距离将相机拽回错误位置。
   */
  syncStateFromCamera(): void {
    const dist = this.camera.position.distanceTo(this.controls.target);
    if (isFinite(dist) && dist > 0) {
      this.smoothDistance = dist;
      this.targetDistance = dist;
      if (this.isTracking) {
        this.trackingDistance = dist;
      }
    }
  }

  /**
   * 获取当前相机视野角度（FOV）
   *
   * @returns 当前 FOV（度），范围 [FOV_MIN, 180)
   */
  getFov() {
    return this.animator.getFov();
  }

  /**
   * 销毁相机控制器，释放所有资源
   *
   * 清理顺序：
   * 1. 取消配置变更监听器订阅
   * 2. 移除滚轮事件监听器
   * 3. 移除触摸事件监听器（touchstart、touchmove、touchend）
   * 4. 调用 OrbitControls.dispose() 清理其内部事件监听器
   *
   * 在组件卸载时必须调用此方法，否则会导致内存泄漏。
   */
  dispose(): void {
    // 清理配置监听器
    if (this.configUnsubscribe) {
      this.configUnsubscribe();
      this.configUnsubscribe = null;
    }
    
    // 清理事件监听器（通过 CameraInputHandler）
    this.inputHandler.dispose();
    
    // OrbitControls 会自动处理其内部的事件监听器
    this.controls.dispose();
  }
}

