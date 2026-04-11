/**
 * @module 3d/CameraController
 * @description 3D 相机控制器
 * 
 * 本模块负责管理 Three.js 相机和 OrbitControls,提供平滑缩放、聚焦、跟踪等高级相机功能。
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
 * 2. 缩放计算：平滑缩放算法（指数衰减）
 * 3. 聚焦动画：Lerp 插值平滑移动
 * 4. 跟踪更新：实时跟随目标天体
 * 5. 防穿透约束：限制相机不穿透行星表面
 * 6. 阻尼更新：OrbitControls 惯性效果
 * 
 * @performance
 * - 使用指数衰减算法实现平滑缩放
 * - 使用 Lerp 插值避免突兀的相机移动
 * - 使用阻尼（damping）提供自然的惯性效果
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
  CAMERA_PENETRATION_CONFIG,
  QUICK_CAMERA_SETTINGS
} from '@/lib/config/cameraConfig';
import { cameraConfigManager, type CameraConfigType } from '@/lib/config/CameraConfigManager';

// Enhanced focus management
import { FocusManager, type CelestialObject, type FocusOptions } from './FocusManager';

// 兼容旧代码中对单一 CAMERA_CONFIG 的使用（现在直接使用新的统一配置）

/**
 * 相机控制模式枚举
 *
 * - `'free'`：自由模式，用户可自由旋转和缩放
 * - `'locked'`：锁定模式，相机跟随目标天体但不自动旋转
 * - `'follow'`：跟随模式，相机平滑跟随目标天体移动
 */
export type CameraMode = 'free' | 'locked' | 'follow';

/**
 * Three.js 相机控制器
 *
 * 封装 OrbitControls，提供太阳系场景所需的相机控制功能，包括：
 * - 鼠标/触摸缩放（指数衰减平滑）
 * - 防穿透约束（防止相机进入天体内部）
 * - 相机模式切换（自由/锁定/跟随）
 * - 聚焦目标天体（平滑过渡到目标位置）
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
  
  // 平滑缩放相关
  private smoothDistance: number = 0; // 当前平滑的距离
  private targetDistance: number = 0; // 目标距离
  private isZooming: boolean = false; // 是否正在缩放
  private lastDistance: number = 0; // 上一帧的距离
  
  // 事件监听器引用，用于清理
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private touchStartHandler: ((e: TouchEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  private touchEndHandler: ((e: TouchEvent) => void) | null = null;
  private domElement: HTMLElement;
  
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
  
  // Cesium 主导模式相关
  private cesiumPrimaryMode: boolean = false;
  private earthLockWasPaused: boolean = false; // 记录 Earth Lock 是否被暂停

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
    this.lastDistance = this.smoothDistance;
    
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
    
    // 步骤 7：立即绑定事件监听器（不延迟，确保事件监听器始终存在）
    // 即使 DOM 元素还没有连接到 DOM，事件监听器也会在元素准备好后自动生效
    this.setupWheelZoom(domElement);
    this.setupTouchZoom(domElement);
    
    // 备用方案：如果 DOM 元素尚未挂载，等待两帧后再次检查并补充绑定
    // （正常情况下上面的绑定已经足够，这里只是防御性处理）
    if (!domElement.isConnected) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 确保事件监听器已绑定（如果还没有绑定）
          if (domElement.isConnected) {
            if (!this.wheelHandler) {
              this.setupWheelZoom(domElement);
            }
            if (!this.touchStartHandler) {
              this.setupTouchZoom(domElement);
            }
          }
        });
      });
    }
    
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
    
    // 步骤 8：初始化角度平滑过渡状态（极角 polarAngle）
    this.isPolarAngleTransitioning = false;
    this.targetPolarAngle = 0;
    this.currentPolarAngle = 0;
    this.polarAngleTransitionSpeed = 0.08; // 角度过渡速度（0-1，越大越快；0.08 约需 30 帧完成过渡）
  }
  
  // 相机角度平滑过渡相关
  private isPolarAngleTransitioning: boolean = false;
  private targetPolarAngle: number = 0;
  private currentPolarAngle: number = 0;
  private polarAngleTransitionSpeed: number = 0.08; // 角度过渡速度（0-1，越大越快）
  
  // 左右角度（azimuthalAngle）平滑过渡相关
  private isAzimuthalAngleTransitioning: boolean = false;
  private targetAzimuthalAngle: number = 0;
  private currentAzimuthalAngle: number = 0;
  private azimuthalAngleTransitionSpeed: number = 0.08; // 角度过渡速度（0-1，越大越快）

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
    // 步骤 1：将输入角度标准化到 0-180° 范围
    // 允许任意角度值（包括负数），但最终会转换为 0 到 Math.PI 的范围
    let normalizedAngle = angle;
    // 负数角度处理：-45° 转换为 135°（从下方看的等效角度）
    if (normalizedAngle < 0) {
      normalizedAngle = 180 + normalizedAngle;
    }
    // 超过 360° 的角度：取模归一化
    if (normalizedAngle >= 360) {
      normalizedAngle = normalizedAngle % 360;
    }
    // 超过 180° 的角度：折叠到 0-180° 范围（利用对称性）
    if (normalizedAngle > 180) {
      normalizedAngle = 360 - normalizedAngle;
    }
    
    // 步骤 2：转换为弧度（OrbitControls 内部使用弧度）
    const angleRad = normalizedAngle * (Math.PI / 180);
    
    // 步骤 3：有效性检查（防止 NaN/Infinity 导致相机状态异常）
    if (!isFinite(angleRad)) {
      console.warn('CameraController.setPolarAngle: Invalid angle value', angle);
      return;
    }
    
    // 步骤 4：先调用 update() 确保 OrbitControls 内部的 spherical 对象被初始化
    this.controls.update();
    
    // 使用类型断言访问 spherical（OrbitControls 内部属性，未在公开 API 中暴露）
    const controlsAnyPol1 = this.controls as any;
    
    if (!smooth) {
      // 立即切换模式：直接修改 OrbitControls 的 spherical.phi（phi 就是 polarAngle）
      if (controlsAnyPol1.spherical) {
        // 主路径：直接设置球坐标的仰俯角分量
        controlsAnyPol1.spherical.phi = angleRad;
        this.controls.update();
      } else {
        // 备用路径：spherical 不存在时，通过重新计算相机位置来设置角度
        // 保持当前距离和方位角不变，只改变仰俯角
        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        const currentAzimuthalAngle = this.controls.getAzimuthalAngle();
        const newPosition = new THREE.Vector3();
        // 球坐标转笛卡尔坐标：x = r·sin(φ)·cos(θ), y = r·cos(φ), z = r·sin(φ)·sin(θ)
        newPosition.x = currentDistance * Math.sin(angleRad) * Math.cos(currentAzimuthalAngle);
        newPosition.y = currentDistance * Math.cos(angleRad);
        newPosition.z = currentDistance * Math.sin(angleRad) * Math.sin(currentAzimuthalAngle);
        newPosition.add(this.controls.target);
        this.camera.position.copy(newPosition);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      }
      // 同步内部状态，防止下一帧的过渡逻辑误判
      this.currentPolarAngle = angleRad;
      this.targetPolarAngle = angleRad;
      this.isPolarAngleTransitioning = false;
      return;
    }
    
    // 平滑过渡模式：设置目标角度，由 update() 每帧插值逼近
    this.targetPolarAngle = angleRad;
    this.isPolarAngleTransitioning = true;
    // 从 spherical.phi 读取当前角度（比 getPolarAngle() 更准确，避免阻尼引入的误差）
    const controlsAnyPol2 = this.controls as any;
    this.currentPolarAngle = controlsAnyPol2.spherical ? controlsAnyPol2.spherical.phi : this.controls.getPolarAngle();
  }

  /**
   * 设置相机水平角度（azimuthalAngle / 方位角）
   *
   * 角度标准化逻辑：
   * - 输入角度被标准化到 -180° 到 +180° 范围（对应 -π 到 +π 弧度）
   * - 立即切换时选择最短旋转路径，避免绕远路旋转（如从 170° 到 -170° 走 20° 而非 340°）
   * - 平滑过渡时同样选择最短路径，并在 update() 中逐帧插值
   *
   * @param angle 角度（度），0° = 正前方，90° = 右侧，-90° = 左侧，支持任意值
   * @param smooth 是否平滑过渡（默认 false，立即切换）
   */
  setAzimuthalAngle(angle: number, smooth = false) {
    // 步骤 1：将输入角度标准化到 -180° 到 +180° 范围
    // 允许任意角度值（包括负数），转换为 -Math.PI 到 Math.PI 的范围
    let normalizedAngle = angle;
    // 循环减法/加法，将角度归一化到 [-180, 180) 区间
    while (normalizedAngle < -180) normalizedAngle += 360;
    while (normalizedAngle >= 180) normalizedAngle -= 360;
    
    // 步骤 2：转换为弧度
    const angleRad = normalizedAngle * (Math.PI / 180);
    
    // 步骤 3：有效性检查
    if (!isFinite(angleRad)) {
      console.warn('CameraController.setAzimuthalAngle: Invalid angle value', angle);
      return;
    }
    
    // 步骤 4：先调用 update() 确保 OrbitControls 内部的 spherical 对象被初始化
    this.controls.update();
    
    // 使用类型断言访问 spherical（OrbitControls 内部属性，未在公开 API 中暴露）
    const controlsAnyAz1 = this.controls as any;
    
    if (!smooth) {
      // 立即切换模式：计算最短路径，然后设置角度
      // ⚠️ 关键修复：即使立即切换，也要选择最短路径，避免旋转方向错误
      if (controlsAnyAz1.spherical) {
        // 读取当前角度（theta 是方位角）
        const currentAngle = controlsAnyAz1.spherical.theta;
        // 将当前角度标准化到 -π 到 π 范围，确保差值计算正确
        let normalizedCurrent = currentAngle;
        while (normalizedCurrent > Math.PI) normalizedCurrent -= 2 * Math.PI;
        while (normalizedCurrent < -Math.PI) normalizedCurrent += 2 * Math.PI;
        
        // 计算角度差值，选择最短路径（差值绝对值不超过 π）
        let angleDiff = angleRad - normalizedCurrent;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;   // 顺时针更短
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;  // 逆时针更短
        
        // 最终目标角度 = 当前角度 + 最短路径差值
        const finalAngle = normalizedCurrent + angleDiff;
        
        // ⚠️ 关键修复：临时禁用阻尼，避免与自定义角度设置冲突
        // 阻尼会在 update() 中对角度施加额外的插值，导致设置的角度不准确
        const oldEnableDamping = this.controls.enableDamping;
        this.controls.enableDamping = false;
        
        controlsAnyAz1.spherical.theta = finalAngle;
        this.controls.update();
        
        // 恢复阻尼设置
        this.controls.enableDamping = oldEnableDamping;
      } else {
        // 备用路径：spherical 不存在时，通过重新计算相机位置来设置角度
        // 同样需要计算最短路径
        const currentAngle = this.controls.getAzimuthalAngle();
        let normalizedCurrent = currentAngle;
        while (normalizedCurrent > Math.PI) normalizedCurrent -= 2 * Math.PI;
        while (normalizedCurrent < -Math.PI) normalizedCurrent += 2 * Math.PI;
        
        let angleDiff = angleRad - normalizedCurrent;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        const finalAngle = normalizedCurrent + angleDiff;
        
        // 球坐标转笛卡尔坐标：保持距离和仰俯角不变，只改变方位角
        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        const currentPolarAngle = this.controls.getPolarAngle();
        const newPosition = new THREE.Vector3();
        newPosition.x = currentDistance * Math.sin(currentPolarAngle) * Math.cos(finalAngle);
        newPosition.y = currentDistance * Math.cos(currentPolarAngle);
        newPosition.z = currentDistance * Math.sin(currentPolarAngle) * Math.sin(finalAngle);
        newPosition.add(this.controls.target);
        this.camera.position.copy(newPosition);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      }
      // 同步内部状态
      this.currentAzimuthalAngle = angleRad;
      this.targetAzimuthalAngle = angleRad;
      this.isAzimuthalAngleTransitioning = false;
      return;
    }
    
    // 平滑过渡模式：设置目标角度，由 update() 每帧插值逼近
    this.targetAzimuthalAngle = angleRad;
    this.isAzimuthalAngleTransitioning = true;
    // 从 spherical.theta 读取当前角度（比 getAzimuthalAngle() 更准确）
    this.controls.update();
    const controlsAnyAz2 = this.controls as any;
    const currentAngle = controlsAnyAz2.spherical ? controlsAnyAz2.spherical.theta : this.controls.getAzimuthalAngle();
    // 将当前角度标准化到 -π 到 π 范围
    let normalizedCurrent = currentAngle;
    while (normalizedCurrent > Math.PI) normalizedCurrent -= 2 * Math.PI;
    while (normalizedCurrent < -Math.PI) normalizedCurrent += 2 * Math.PI;
    // 计算最短路径差值（处理角度环绕，如从 170° 到 -170° 走 20° 而非 340°）
    let angleDiff = angleRad - normalizedCurrent;
    // 如果差值超过 180°，选择另一条更短的路径
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    // 从标准化后的当前角度开始插值（确保插值方向正确）
    this.currentAzimuthalAngle = normalizedCurrent;
  }

  /**
   * 初始化鼠标滚轮缩放事件处理
   *
   * 事件处理逻辑：
   * 1. 阻止默认滚动行为（preventDefault），防止页面滚动与相机缩放冲突
   * 2. 若正在执行聚焦动画，立即中断并切换到用户控制模式
   * 3. 若正在跟踪目标，同步当前距离到缩放状态（允许跟踪时缩放）
   * 4. 根据 deltaY 方向和大小计算缩放增量，调用 zoom() 执行缩放
   *
   * 注意：OrbitControls 的内置缩放已被禁用（enableZoom = false），
   * 所有缩放操作均通过此处理器路由到自定义平滑缩放算法。
   *
   * @param domElement 绑定事件的 DOM 元素（renderer.domElement）
   */
  private setupWheelZoom(domElement: HTMLElement) {
    // 如果已经绑定过，先移除旧的监听器（防止重复绑定导致缩放速度翻倍）
    if (this.wheelHandler) {
      domElement.removeEventListener('wheel', this.wheelHandler);
    }
    
    this.wheelHandler = (e: WheelEvent) => {
      // 阻止默认行为（防止页面滚动）和事件冒泡（防止父元素响应）
      e.preventDefault();
      e.stopPropagation();
      
      // 中断聚焦动画：用户开始滚轮操作时，立即停止正在进行的聚焦过渡
      // 这样用户可以在聚焦动画未完成时就开始缩放，提升响应性
      if (this.isFocusing) {
        this.isFocusing = false;
        this.targetCameraPosition = null;
        this.targetControlsTarget = null;
        // 同步当前距离，确保缩放从当前位置开始（而非聚焦目标位置）
        const currentDist = this.camera.position.distanceTo(this.controls.target);
        if (isFinite(currentDist) && currentDist > 0) {
          this.smoothDistance = currentDist;
          this.targetDistance = currentDist;
        }
        // 重置最小距离（允许用户自由缩放）
        this.resetMinDistance();
      }
      
      // 跟踪模式下的缩放处理：不停止跟踪，允许在跟踪的同时调整距离
      // 同步 smoothDistance 和 trackingDistance，确保缩放从当前距离开始
      if (this.isTracking) {
        const currentDist = this.smoothDistance || this.camera.position.distanceTo(this.controls.target);
        if (isFinite(currentDist) && currentDist > 0) {
          this.smoothDistance = currentDist;
          this.targetDistance = currentDist;
          // 同步 trackingDistance，确保跟踪逻辑使用正确的距离
          this.trackingDistance = currentDist;
        }
      }
      
      // 标记缩放状态（确保 update() 中的缩放逻辑被激活）
      this.isZooming = true;
      
      // 计算缩放增量：
      // - scrollSpeed：将 deltaY 归一化到 [0, 3] 范围，避免高精度触控板产生过大增量
      // - zoomDelta：向下滚动（deltaY > 0）为负值（拉远），向上滚动（deltaY < 0）为正值（拉近）
      const scrollSpeed = Math.min(Math.abs(e.deltaY) / 100, 3); // 最大步长限制为 3
      // 向下滚动缩小（deltaY > 0），向上滚动放大（deltaY < 0）
      const zoomDelta = e.deltaY > 0 ? -scrollSpeed : scrollSpeed;
      this.zoom(zoomDelta);
    };
    
    // 绑定到 canvas 元素，使用 passive: false 以允许 preventDefault()
    domElement.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  /**
   * 初始化触摸捏合缩放事件处理（移动端双指缩放）
   *
   * 事件处理逻辑：
   * - touchstart：检测双指触摸，记录初始指间距离和平滑距离；中断聚焦动画
   * - touchmove：计算当前指间距离与初始距离的比值（scale），转换为缩放增量
   *   - 使用平方根函数放大小幅度手指移动的效果（提升灵敏度）
   *   - 限制更新频率（每 8ms 最多一次，约 120fps），避免过于频繁的计算
   *   - 每次处理后更新 initialDistance，实现连续缩放（而非相对初始位置的绝对缩放）
   * - touchend：重置捏合状态，但不立即停止缩放（保留惯性效果）
   *
   * @param domElement 绑定事件的 DOM 元素（renderer.domElement）
   */
  private setupTouchZoom(domElement: HTMLElement) {
    // 如果已经绑定过，先移除旧的监听器（防止重复绑定）
    if (this.touchStartHandler) {
      domElement.removeEventListener('touchstart', this.touchStartHandler);
      domElement.removeEventListener('touchmove', this.touchMoveHandler!);
      domElement.removeEventListener('touchend', this.touchEndHandler!);
    }
    
    let initialDistance = 0;       // 双指触摸开始时的指间距离（像素）
    let initialSmoothDistance = 0; // 双指触摸开始时的相机平滑距离（AU）
    let isPinching = false;        // 是否正在进行捏合缩放
    let lastUpdateTime = 0;        // 上次处理 touchmove 的时间戳（用于限频）

    this.touchStartHandler = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // 阻止默认的浏览器缩放行为（防止页面被放大）
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        // 计算两指间的欧几里得距离（像素）
        initialDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        initialSmoothDistance = this.smoothDistance;
        isPinching = true;
        lastUpdateTime = performance.now(); // 重置更新时间戳
        
        // 中断聚焦动画（与滚轮处理逻辑保持一致）
        if (this.isFocusing) {
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
        
        // 跟踪模式下同步距离（允许跟踪时缩放）
        if (this.isTracking) {
          const currentDist = this.smoothDistance || this.camera.position.distanceTo(this.controls.target);
          if (isFinite(currentDist) && currentDist > 0) {
            this.smoothDistance = currentDist;
            this.targetDistance = currentDist;
            this.trackingDistance = currentDist;
          }
        }
        
        this.isZooming = true;
      } else {
        // 非双指触摸时重置捏合状态（如单指触摸开始）
        isPinching = false;
        initialDistance = 0;
      }
    };

    this.touchMoveHandler = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching && initialDistance > 0) {
        e.preventDefault(); // 阻止默认的浏览器缩放行为
        
        // 限制更新频率：每 8ms 最多处理一次（约 120fps），改善大范围缩放的平滑度
        const currentTime = performance.now();
        if (currentTime - lastUpdateTime < 8) {
          return;
        }
        lastUpdateTime = currentTime;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        // 计算当前指间距离
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        // 最小距离检查（避免除零错误，且过小的距离变化无意义）
        if (currentDistance > 10 && initialDistance > 10) {
          // 计算缩放比例（当前距离 / 初始距离）
          const scale = currentDistance / initialDistance;
          
          // 计算缩放增量：
          // - scaleDiff > 0：两指张开（放大）
          // - scaleDiff < 0：两指合拢（缩小）
          const scaleDiff = scale - 1.0;
          
          // 使用平方根函数放大小幅度手指移动的效果：
          // - 小变化（如 scaleDiff = 0.01）：sqrt(0.01) * 3 = 0.3，放大了 30 倍
          // - 大变化（如 scaleDiff = 0.25）：sqrt(0.25) * 3 = 1.5，放大了 6 倍
          // 这样即使很小的手指移动也能产生明显的缩放效果，同时大幅度移动不会过于激进
          let zoomDelta;
          if (Math.abs(scaleDiff) > 0.001) {
            const sign = scaleDiff > 0 ? 1 : -1;
            const absScaleDiff = Math.abs(scaleDiff);
            zoomDelta = sign * Math.sqrt(absScaleDiff) * 3; // 灵敏度系数 3
          } else {
            zoomDelta = 0;
          }
          
          // 限制单次缩放的最大幅度（±6），防止手指快速移动时产生过大跳跃
          zoomDelta = Math.max(-6, Math.min(6, zoomDelta));
          
          // 调用统一的缩放方法（与滚轮缩放使用相同的算法）
          this.zoom(zoomDelta);
          
          // 更新初始距离，实现连续缩放（每帧相对上一帧计算，而非相对触摸开始位置）
          initialDistance = currentDistance;
          initialSmoothDistance = this.smoothDistance;
        }
      } else if (e.touches.length !== 2) {
        // 触摸点数量变化时重置捏合状态
        isPinching = false;
        initialDistance = 0;
      }
    };

    this.touchEndHandler = (e: TouchEvent) => {
      // 修复触控缩放惯性问题：不要立即停止缩放状态
      // 让缩放继续进行直到自然完成（isZooming 会在 update() 中自动清除），这样就有惯性效果
      if (e.touches.length < 2) {
        isPinching = false;
        initialDistance = 0;
        initialSmoothDistance = 0;
        lastUpdateTime = 0;
        // 注意：不设置 this.isZooming = false，让缩放自然完成（保留惯性）
      }
    };

    // 绑定事件监听器，touchstart/touchmove 使用 passive: false 以允许 preventDefault()
    domElement.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    domElement.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    domElement.addEventListener('touchend', this.touchEndHandler);
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
    let distToCenter = dir.length();
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
      
      const easedFactor = this.easeOutQuart(factor);
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
  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

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
    if (!this.currentTargetRadius) return proposedCameraPosition;

    const minSafeDistance = this.currentTargetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;
    const distanceToCenter = proposedCameraPosition.distanceTo(center);

    if (distanceToCenter < minSafeDistance) {
      // Calculate safe position on the ray from center to proposed position
      const direction = new THREE.Vector3()
        .subVectors(proposedCameraPosition, center)
        .normalize();
      
      if (direction.length() < 0.001) {
        direction.set(0, 0.5, 1).normalize();
      }

      return center.clone().add(direction.multiplyScalar(minSafeDistance));
    }

    return proposedCameraPosition;
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
   * 设置 Cesium 主导模式
   * 
   * 在 Cesium 主导模式下：
   * - 禁用 OrbitControls（Cesium 接管相机控制）
   * - 暂停聚焦动画
   * - 暂停地球锁定模式
   * 
   * @param enabled 是否启用 Cesium 主导模式
   */
  setCesiumPrimaryMode(enabled: boolean): void {
    this.cesiumPrimaryMode = enabled;
    
    if (enabled) {
      // 切换到 Cesium 主导模式
      console.log('[CameraController] Switching to Cesium primary mode');
      
      // 1. 禁用 OrbitControls
      this.controls.enabled = false;
      
      // 2. 暂停聚焦动画
      if (this.isFocusing) {
        this.isFocusing = false;
        this.targetCameraPosition = null;
        this.targetControlsTarget = null;
      }
      
      // 3. 暂停地球锁定模式（如果已启用）
      if (this.earthLockEnabled) {
        this.earthLockWasPaused = true;
        this.earthLockEnabled = false;
        console.log('[CameraController] Earth Lock paused for Cesium mode');
      }
    } else {
      // 切换回 Three.js 主导模式
      console.log('[CameraController] Switching to Three.js primary mode');
      
      // 1. 恢复 OrbitControls
      this.controls.enabled = true;
      
      // 2. 恢复地球锁定模式（如果之前被暂停）
      if (this.earthLockWasPaused) {
        this.earthLockEnabled = true;
        this.earthLockWasPaused = false;
        console.log('[CameraController] Earth Lock restored');
      }
    }
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
   * 手动缩放相机（带平滑效果和防穿透约束）
   *
   * 缩放算法：
   * - 使用距离自适应灵敏度：近距离时降低灵敏度（对数曲线），避免近距离时缩放过快
   * - 放大方向（delta > 0）：距离乘以 (1 - factor)，指数衰减
   * - 缩小方向（delta < 0）：距离乘以 (1 + factor)，指数增长
   * - 当距离被防穿透约束卡住时，自动切换到 FOV 缩放模式（光学变焦）
   * - 缩小时优先恢复 FOV 到默认值，再拉远距离（与放大方向对称）
   *
   * @param delta 缩放增量，正值放大（拉近），负值缩小（拉远）
   *              典型范围：[-3, 3]（来自滚轮事件的归一化值）
   */
  // 手动缩放方法（带平滑效果和增强的防穿透）
  zoom(delta: number) {
    if (this.isFocusing) {
      this.isFocusing = false;
      this.targetCameraPosition = null;
      this.targetControlsTarget = null;
    }

    const currentDistance = this.isTracking 
      ? this.smoothDistance || this.camera.position.distanceTo(this.controls.target)
      : this.camera.position.distanceTo(this.controls.target);
    
    if (!isFinite(currentDistance) || currentDistance <= 0) return;
    
    const baseFactor = this.currentConfig.zoomBaseFactor;
    const scrollSpeed = Math.min(Math.abs(delta), 2);

    // 缩放灵敏度：优先使用外部曲线，否则用对数距离曲线
    type CurveT = { anchors: {nx:number;ny:number}[]; yMin:number; yMax:number };
    const zoomCurve = this._zoomSensitivityCurve as CurveT | undefined;
    let distanceScale: number;
    if (zoomCurve && zoomCurve.anchors.length >= 2 && !this.fovZoomActive) {
      // 曲线只在距离模式下生效，FOV 模式走原有 effectiveFactor 逻辑
      distanceScale = CameraController.evalSensitivityCurve(zoomCurve, currentDistance);
    } else {
      const REF_DISTANCE_AU = 1.0;
      const LOG_RANGE = 5;
      const MIN_SCALE = 0.15;
      const logRatio = Math.log10(Math.max(currentDistance, 1e-12) / REF_DISTANCE_AU);
      distanceScale = Math.max(MIN_SCALE, Math.min(1.0, logRatio / LOG_RANGE + 1.0));
    }
    const effectiveFactor = baseFactor * distanceScale;

    const currentFov = this.camera.fov;
    const defaultFov = CameraController.FOV_DEFAULT;
    const minFov = CameraController.FOV_MIN;

    if (delta > 0) {
      // 放大方向
      // 计算如果正常缩放距离会变成多少
      const zoomFactor = 1 - (effectiveFactor * scrollSpeed);
      let newTargetDistance = currentDistance * zoomFactor;

      // 防穿透约束
      if (this.currentTargetRadius) {
        const minSafeDistance = this.currentTargetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;
        newTargetDistance = Math.max(newTargetDistance, minSafeDistance);
        if (currentDistance < minSafeDistance) {
          newTargetDistance = minSafeDistance;
          this.smoothDistance = minSafeDistance;
        }
      }
      newTargetDistance = Math.max(CAMERA_CONFIG.minDistance, Math.min(this.controls.maxDistance, newTargetDistance));

      // 检测距离是否被卡住（变化量小于 0.1%）：切换到 FOV 缩放
      const distanceStuck = newTargetDistance >= currentDistance * 0.999;
      if (distanceStuck) {
        this.fovZoomActive = true;
        // FOV 缩放灵敏度：FOV 越小时每步缩小比例越小，保持对数感知均匀
        // 使用固定比例缩放：每步缩小 FOV 的固定百分比（类似距离缩放的乘法模型）
        // 这样 FOV 从 45° 到 0.05° 的感知步数是均匀的
        const fovZoomFactor = 1 - effectiveFactor * scrollSpeed * this.getFovZoomSpeed();
        const newFov = Math.max(minFov, currentFov * fovZoomFactor);
        this.targetFov = newFov;
        this.isFovTransitioning = true;
        this.currentFov = currentFov;
        // 距离保持不变
        this.targetDistance = currentDistance;
        this.smoothDistance = currentDistance;
        this.isZooming = true;
        if (this.isTracking) this.trackingDistance = this.targetDistance;
        return;
      }

      this.targetDistance = newTargetDistance;
    } else {
      // 缩小方向
      if (this.fovZoomActive && currentFov < defaultFov - 0.1) {
        // 先恢复 FOV，再拉远距离（同样用固定比例，与放大对称）
        const fovZoomFactor = 1 + effectiveFactor * scrollSpeed * this.getFovZoomSpeed();
        const newFov = Math.min(defaultFov, currentFov * fovZoomFactor);
        this.targetFov = newFov;
        this.isFovTransitioning = true;
        this.currentFov = currentFov;
        if (newFov >= defaultFov - 0.1) {
          this.fovZoomActive = false;
        }
        this.targetDistance = currentDistance;
        this.smoothDistance = currentDistance;
        this.isZooming = true;
        if (this.isTracking) this.trackingDistance = this.targetDistance;
        return;
      }
      // FOV 已恢复，正常拉远
      this.fovZoomActive = false;
      const zoomFactor = 1 + (effectiveFactor * scrollSpeed);
      let newTargetDistance = currentDistance * zoomFactor;

      if (this.currentTargetRadius) {
        const minSafeDistance = this.currentTargetRadius * CAMERA_PENETRATION_CONFIG.safetyDistanceMultiplier;
        newTargetDistance = Math.max(newTargetDistance, minSafeDistance);
        if (currentDistance < minSafeDistance) {
          newTargetDistance = minSafeDistance;
          this.smoothDistance = minSafeDistance;
        }
      }

      this.targetDistance = Math.max(
        CAMERA_CONFIG.minDistance,
        Math.min(this.controls.maxDistance, newTargetDistance)
      );
    }
    
    // 同步平滑距离，确保缩放从当前位置开始
    this.smoothDistance = currentDistance;
    this.isZooming = true;
    
    // 如果正在跟踪，立即更新跟踪距离
    if (this.isTracking) {
      this.trackingDistance = this.targetDistance;
    }
  }

  /**
   * 每帧更新相机状态（动画循环主入口）
   *
   * 执行顺序（顺序不可随意调整）：
   * 1. 更新 FocusManager 的聚焦过渡进度
   * 2. 处理 FOV 平滑过渡（光学变焦动画）
   * 3. 应用防穿透约束（确保相机不进入天体内部）
   * 4. 处理方位角（左右）平滑过渡
   * 5. 处理极角（上下）平滑过渡
   * 6. 处理聚焦动画（Lerp 插值移动相机到目标位置）
   * 7. 处理跟随模式（follow mode）
   * 8. 执行平滑缩放（指数衰减逼近目标距离）
   * 9. 处理跟踪模式（持续跟随运动天体）
   * 10. 同步平滑距离（防止累积误差）
   * 11. 动态调整旋转/平移速度（基于距离和 FOV 的对数曲线）
   * 12. 调用 OrbitControls.update()（应用阻尼效果）
   * 13. 同步地球锁定的四元数（controls.update() 之后）
   *
   * @param deltaTime 当前帧时间步长（秒），用于帧率无关的动画计算
   */
  update(deltaTime: number) {
    // Cesium 主导模式：跳过大部分逻辑，仅保留必要的状态同步
    if (this.cesiumPrimaryMode) {
      // 在 Cesium 主导模式下，相机由 Cesium 控制
      // 仅保留必要的状态更新，避免与 Cesium 冲突
      return;
    }
    
    // Update focus manager transitions
    const focusProgress = this.focusManager.updateFocusTransition(deltaTime);
    if (focusProgress >= 0 && focusProgress < 1) {
      // Apply easing to focus transition
      const easedProgress = FocusManager.easeInOutCubic(focusProgress);
      // Focus transition is handled by existing isFocusing logic below
    }
    
    // Handle user interruption of focus transitions
    if (this.focusManager.isCurrentlyTransitioning() && (this.isZooming || this.isTracking)) {
      this.focusManager.interruptTransition();
    }
    
    // 处理 FOV 平滑过渡
    if (this.isFovTransitioning) {
      const fovDiff = this.targetFov - this.currentFov;
      if (Math.abs(fovDiff) > 0.1) {
        // 使用缓动函数实现平滑过渡
        this.currentFov += fovDiff * this.fovTransitionSpeed;
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
      } else {
        // 过渡完成
        this.currentFov = this.targetFov;
        this.camera.fov = this.targetFov;
        this.isFovTransitioning = false;
        this.camera.updateProjectionMatrix();
      }
    }
    
    
    // 每帧应用防穿透约束，确保相机不会进入行星内部
    this.applyPenetrationConstraint(deltaTime);    // 处理相机左右角度平滑过渡
    if (this.isAzimuthalAngleTransitioning) {
      // ⚠️ 重要：不要在每帧都从 spherical.theta 同步角度，这会导致振荡
      // 只在开始时读取一次，然后使用我们自己的插值逻辑
      
      // 计算角度差值，选择最短路径（处理角度环绕）
      let angleDiff = this.targetAzimuthalAngle - this.currentAzimuthalAngle;
      // 处理角度环绕：如果差值超过180度，选择另一条路径
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      if (Math.abs(angleDiff) > 0.01) {
        // 使用缓动函数实现平滑过渡
        this.currentAzimuthalAngle += angleDiff * this.azimuthalAngleTransitionSpeed;
        // 保持角度在 -Math.PI 到 Math.PI 范围内
        if (this.currentAzimuthalAngle > Math.PI) this.currentAzimuthalAngle -= 2 * Math.PI;
        if (this.currentAzimuthalAngle < -Math.PI) this.currentAzimuthalAngle += 2 * Math.PI;
        
        // 使用类型断言访问 spherical（OrbitControls 内部属性）
        const controlsAnyAz = this.controls as any;
        if (controlsAnyAz.spherical) {
          // ⚠️ 关键修复：临时禁用阻尼，避免与自定义插值冲突
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          
          controlsAnyAz.spherical.theta = this.currentAzimuthalAngle;
          
          // 更新但不允许阻尼修改角度
          this.controls.update();
          
          // 恢复阻尼设置
          this.controls.enableDamping = oldEnableDamping;
        } else {
          // 如果 spherical 不存在，使用备用方法
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentPolarAngle = this.controls.getPolarAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(currentPolarAngle) * Math.cos(this.currentAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(currentPolarAngle);
          newPosition.z = currentDistance * Math.sin(currentPolarAngle) * Math.sin(this.currentAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
      } else {
        // 过渡完成
        this.currentAzimuthalAngle = this.targetAzimuthalAngle;
        const controlsAnyAz = this.controls as any;
        if (controlsAnyAz.spherical) {
          // ⚠️ 关键修复：临时禁用阻尼，避免与自定义插值冲突
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          
          controlsAnyAz.spherical.theta = this.targetAzimuthalAngle;
          
          // 更新但不允许阻尼修改角度
          this.controls.update();
          
          // 恢复阻尼设置
          this.controls.enableDamping = oldEnableDamping;
        } else {
          // 如果 spherical 不存在，使用备用方法
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentPolarAngle = this.controls.getPolarAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(currentPolarAngle) * Math.cos(this.targetAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(currentPolarAngle);
          newPosition.z = currentDistance * Math.sin(currentPolarAngle) * Math.sin(this.targetAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
        this.isAzimuthalAngleTransitioning = false;
      }
    }
    
    // 处理相机上下角度平滑过渡
    if (this.isPolarAngleTransitioning) {
      // ⚠️ 重要：不要在每帧都从 spherical.phi 同步角度，这会导致振荡
      // 只在开始时读取一次，然后使用我们自己的插值逻辑
      
      const angleDiff = this.targetPolarAngle - this.currentPolarAngle;
      if (Math.abs(angleDiff) > 0.01) {
        // 使用缓动函数实现平滑过渡
        this.currentPolarAngle += angleDiff * this.polarAngleTransitionSpeed;
        // 确保角度在有效范围内（0 到 Math.PI），允许上下翻转
        this.currentPolarAngle = Math.max(0, Math.min(Math.PI, this.currentPolarAngle));
        
        // 使用类型断言访问 spherical（OrbitControls 内部属性）
        const controlsAnyPol = this.controls as any;
        if (controlsAnyPol.spherical) {
          // ⚠️ 关键修复：临时禁用阻尼，避免与自定义插值冲突
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          
          controlsAnyPol.spherical.phi = this.currentPolarAngle;
          
          // 更新但不允许阻尼修改角度
          this.controls.update();
          
          // 恢复阻尼设置
          this.controls.enableDamping = oldEnableDamping;
        } else {
          // 如果 spherical 不存在，使用备用方法：通过设置相机位置
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentAzimuthalAngle = this.controls.getAzimuthalAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(this.currentPolarAngle) * Math.cos(currentAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(this.currentPolarAngle);
          newPosition.z = currentDistance * Math.sin(this.currentPolarAngle) * Math.sin(currentAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
      } else {
        // 过渡完成
        this.currentPolarAngle = this.targetPolarAngle;
        const controlsAnyPol3 = this.controls as any;
        if (controlsAnyPol3.spherical) {
          // ⚠️ 关键修复：临时禁用阻尼，避免与自定义插值冲突
          const oldEnableDamping = this.controls.enableDamping;
          this.controls.enableDamping = false;
          
          controlsAnyPol3.spherical.phi = this.targetPolarAngle;
          
          // 更新但不允许阻尼修改角度
          this.controls.update();
          
          // 恢复阻尼设置
          this.controls.enableDamping = oldEnableDamping;
        } else {
          // 如果 spherical 不存在，使用备用方法
          const currentDistance = this.camera.position.distanceTo(this.controls.target);
          const currentAzimuthalAngle = this.controls.getAzimuthalAngle();
          const newPosition = new THREE.Vector3();
          newPosition.x = currentDistance * Math.sin(this.targetPolarAngle) * Math.cos(currentAzimuthalAngle);
          newPosition.y = currentDistance * Math.cos(this.targetPolarAngle);
          newPosition.z = currentDistance * Math.sin(this.targetPolarAngle) * Math.sin(currentAzimuthalAngle);
          newPosition.add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
        this.isPolarAngleTransitioning = false;
      }
    }
    
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
    // 平滑缩放实现（类似2D版本的缓动效果）
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
        // ⚠️ 关键修复：如果正在缩放，不要用 lerp 覆盖缩放效果
        // 直接使用缩放后的位置，只更新目标位置
        if (this.isZooming) {
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
          
          // 平滑移动相机和目标（跟随目标）
          this.camera.position.lerp(newCameraPosition, CAMERA_CONFIG.trackingLerpSpeed);
          this.controls.target.lerp(currentTargetPosition, CAMERA_CONFIG.trackingLerpSpeed);
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
      if (dragCurve && dragCurve.anchors.length >= 2 && !this.fovZoomActive) {
        // 曲线只在距离模式下生效，FOV 模式走原有逻辑
        scale = CameraController.evalSensitivityCurve(dragCurve, currentDist);
      } else {
        const REF_DISTANCE_AU = 1.0;
        const LOG_RANGE = 5;
        const MIN_SCALE = 0.04;
        const logRatio = Math.log10(Math.max(currentDist, 1e-12) / REF_DISTANCE_AU);
        const distScale = Math.max(MIN_SCALE, Math.min(1.0, logRatio / LOG_RANGE + 1.0));
        const fovScale = Math.max(0.005, this.camera.fov / CameraController.FOV_DEFAULT);
        scale = this.fovZoomActive
          ? fovScale * (this.currentConfig.fovDragSensitivity ?? 3.0)
          : Math.max(distScale, fovScale);
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
    const rotateScale = this.fovZoomActive ? fovScale : Math.max(distScale, fovScale);
    return {
      distance: currentDist,
      fov: this.camera.fov,
      fovDefault: CameraController.FOV_DEFAULT,
      fovMin: CameraController.FOV_MIN,
      fovZoomActive: this.fovZoomActive,
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
   * 根据灵敏度曲线配置和当前距离计算灵敏度倍率（Catmull-Rom 插值）
   * 与 SensitivityCurvePanel 的 querySensitivity 逻辑保持一致
   */
  static evalSensitivityCurve(
    curve: { anchors: { nx: number; ny: number }[]; yMin: number; yMax: number },
    distanceAU: number
  ): number {
    const LOG_MIN = -10, LOG_MAX = 0;
    const nx = Math.max(0, Math.min(1, (Math.log10(Math.max(distanceAU, 1e-12)) - LOG_MIN) / (LOG_MAX - LOG_MIN)));
    const sorted = [...curve.anchors].sort((a, b) => a.nx - b.nx);
    // 对数 Y 映射：ny(0~1) → 10^(logMin + ny*(logMax-logMin))
    const logMin = Math.log10(Math.max(curve.yMin, 1e-9));
    const logMax = Math.log10(Math.max(curve.yMax, 1e-9));
    const nyToVal = (ny: number) => Math.pow(10, logMin + Math.max(0, Math.min(1, ny)) * (logMax - logMin));
    if (sorted.length === 0) return 1;
    if (sorted.length === 1) return nyToVal(sorted[0].ny);
    if (nx <= sorted[0].nx) return nyToVal(sorted[0].ny);
    if (nx >= sorted[sorted.length - 1].nx) return nyToVal(sorted[sorted.length - 1].ny);

    let i = 1;
    while (i < sorted.length - 1 && sorted[i].nx < nx) i++;
    const p1 = sorted[i - 1], p2 = sorted[i];
    const p0 = sorted[i - 2] ?? { nx: p1.nx - (p2.nx - p1.nx), ny: p1.ny };
    const p3 = sorted[i + 1] ?? { nx: p2.nx + (p2.nx - p1.nx), ny: p2.ny };
    const t = (nx - p1.nx) / (p2.nx - p1.nx), t2 = t * t, t3 = t2 * t;
    const ny = Math.max(0, Math.min(1, 0.5 * (
      2 * p1.ny +
      (-p0.ny + p2.ny) * t +
      (2 * p0.ny - 5 * p1.ny + 4 * p2.ny - p3.ny) * t2 +
      (-p0.ny + 3 * p1.ny - 3 * p2.ny + p3.ny) * t3
    )));
    return nyToVal(ny);
  }

  /**
   * 获取底层 OrbitControls 实例（供外部直接访问控制器属性）
   *
   * @returns Three.js OrbitControls 实例
   */
  getControls(): OrbitControls {
    return this.controls;
  }

  // FOV 平滑过渡相关
  private targetFov: number = CAMERA_CONFIG.fov;
  private currentFov: number = CAMERA_CONFIG.fov;
  private isFovTransitioning: boolean = false;
  private fovTransitionSpeed: number = 0.15; // FOV 过渡速度（0-1，越大越快）

  // 灵敏度曲线配置（由用户调试后固化的参数）
  // X 轴：归一化对数距离（0 = 1e-10 AU，1 = 1 AU）
  // Y 轴：归一化对数灵敏度（0~1，映射到 yMin~yMax 的对数空间）
  private _zoomSensitivityCurve = {
    yMin: 0.001, yMax: 2,
    anchors: [
      { nx: 0.0024, ny: 0 },
      { nx: 0.5607, ny: 0.0102 },
      { nx: 0.5704, ny: 0.5765 },
      { nx: 0.6165, ny: 0.7449 },
      { nx: 0.7888, ny: 0.898 },
      { nx: 1,      ny: 1 },
    ],
  };
  private _dragSensitivityCurve = {
    yMin: 0.001, yMax: 2,
    anchors: [
      { nx: 0,      ny: 0.08 },
      { nx: 0.5583, ny: 0.2041 },
      { nx: 0.5728, ny: 0.5408 },
      { nx: 0.5922, ny: 0.7194 },
      { nx: 0.7816, ny: 0.9082 },
      { nx: 1,      ny: 1 },
    ],
  };

  // FOV 缩放（光学变焦）相关
  // 当距离无法继续缩小时（被防穿透或 minDistance 限制），改用 FOV 缩放实现超级放大
  private static readonly FOV_MIN = 0.05; // 最小 FOV（度），约等于 300mm 长焦镜头
  private static readonly FOV_DEFAULT = CAMERA_CONFIG.fov; // 默认 FOV（度）
  private fovZoomActive: boolean = false; // 是否处于 FOV 缩放模式

  /**
   * 设置相机视野角度（FOV）
   * @param fov 视野角度（度）
   * @param smooth 是否平滑过渡（默认 false，立即切换）
   */
  setFov(fov: number, smooth = false) {
    if (!isFinite(fov) || fov <= 0 || fov >= 180) {
      console.warn('CameraController.setFov: Invalid FOV value', fov);
      return;
    }
    
    if (smooth) {
      // 平滑过渡模式
      this.targetFov = fov;
      this.isFovTransitioning = true;
      this.currentFov = this.camera.fov; // 从当前 FOV 开始过渡
    } else {
      // 立即切换模式
      this.camera.fov = fov;
      this.currentFov = fov;
      this.targetFov = fov;
      this.isFovTransitioning = false;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * 获取当前相机视野角度（FOV）
   *
   * @returns 当前 FOV（度），范围 [FOV_MIN, 180)
   */
  getFov() {
    return this.camera.fov;
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
    
    // 清理事件监听器
    if (this.wheelHandler && this.domElement) {
      this.domElement.removeEventListener('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }
    
    if (this.touchStartHandler && this.domElement) {
      this.domElement.removeEventListener('touchstart', this.touchStartHandler);
      this.domElement.removeEventListener('touchmove', this.touchMoveHandler!);
      this.domElement.removeEventListener('touchend', this.touchEndHandler!);
      this.touchStartHandler = null;
      this.touchMoveHandler = null;
      this.touchEndHandler = null;
    }
    
    // OrbitControls 会自动处理其内部的事件监听器
    this.controls.dispose();
  }
}

