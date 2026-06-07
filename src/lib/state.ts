/**
 * Zustand 全局状态管理 - 太阳系模拟状态中心
 * 
 * 核心职责：
 * - 管理太阳系模拟的时间系统（当前时间、播放速度、方向）
 * - 维护所有天体的位置和轨道数据
 * - 处理相机视图和缩放状态
 * - 提供国际化语言切换
 * - 响应用户交互和自动更新
 * 
 * 架构说明：
 * 采用 Zustand 轻量级状态管理方案，特点：
 * - 无需 Provider 包裹，全局可访问
 * - 选择性订阅，只重渲染关心的组件
 * - TypeScript 类型安全
 * - 支持中间件扩展
 * 
 * 时间系统设计：
 * - timeSpeed 单位：天/秒（每秒前进多少天）
 *   例如：1/86400 = 实时（1秒/秒 = 1/86400天/秒）
 *         1 = 快进1天/秒
 *         365 = 快进1年/秒
 * - 支持正向和反向播放
 * - 帧驱动更新，通过 tick() 方法推进时间
 * 
 * 天体数据管理：
 * - 使用高精度历表计算（NASA JPL DE440/DE441）
 * - 按需加载历表数据，避免初始加载过大
 * - 缓存机制避免重复计算
 * - 异步更新确保界面流畅
 * 
 * 性能优化：
 * - 使用 React.memo 和选择性订阅减少重渲染
 * - 天体位置计算采用 Web Worker（可选）
 * - 缓存最近计算的位置数据
 * - 防抖/节流处理高频更新
 * 
 * 采样混叠问题修复（CRITICAL）：
 * 对于短周期卫星（如土卫二Enceladus，轨道周期1.37天），
 * 必须确保每帧都更新位置，避免出现：
 * - 轨道跳跃或闪烁
 * - 位置延迟
 * - 轨迹断裂
 * 
 * 解决方案：
 * - tick() 中立即更新时间
 * - 优先使用缓存的位置数据
 * - 异步计算不阻塞渲染
 * 
 * @example
 * ```typescript
 * // 订阅特定状态
 * const currentTime = useSolarSystemStore(state => state.currentTime);
 * 
 * // 调用方法
 * const setTimeSpeed = useSolarSystemStore(state => state.setTimeSpeed);
 * setTimeSpeed(365); // 快进1年/秒
 * 
 * // 订阅多个状态
 * const { isPlaying, togglePlayPause } = useSolarSystemStore(
 *   state => ({ 
 *     isPlaying: state.isPlaying, 
 *     togglePlayPause: state.togglePlayPause 
 *   })
 * );
 * ```
 */

import { create } from 'zustand';
import { CelestialBody, getCelestialBodies, initializeAllBodiesCalculator } from './astronomy/orbit';
import { dateToJulianDay } from './astronomy/time';

// NOTE: Ephemeris calculator initialization is now on-demand
// It will be initialized only when user enables high-precision mode for a body
// This prevents automatic download of 50MB+ ephemeris data on page load
// See: src/lib/store/useEphemerisStore.ts for user settings
// See: src/lib/astronomy/orbit.ts for lazy initialization logic

/**
 * 视图偏移量接口
 * 
 * 定义2D视图的平移偏移量，用于相机位置控制。
 * 
 * 单位说明：
 * - AU (Astronomical Unit，天文单位)
 * - 1 AU ≈ 1.496亿公里（地球到太阳的平均距离）
 * 
 * 坐标系统：
 * - X轴：指向春分点方向（黄道坐标系）
 * - Y轴：垂直于X轴的黄道平面方向
 * - 原点：太阳中心
 * 
 * 使用场景：
 * - 跟随特定天体（centerOnPlanet）
 * - 手动拖拽视图
 * - 缩放时保持焦点位置
 */
export interface ViewOffset {
  x: number; // X轴偏移量 (AU)，正值向右
  y: number; // Y轴偏移量 (AU)，正值向上
}

/**
 * 支持的语言类型
 * 
 * 目前支持的语言：
 * - 'zh': 简体中文（默认）
 * - 'en': English
 * 
 * 扩展语言支持：
 * 1. 在此类型中添加新语言代码
 * 2. 在 src/lib/i18n/translations/ 中添加对应的翻译文件
 * 3. 更新 LanguageDetector 组件的检测逻辑
 */
export type Language = 'en' | 'zh';

/**
 * 太阳系状态接口
 * 
 * 定义了太阳系模拟器的完整状态结构和操作方法。
 * 
 * 状态分类：
 * 1. 时间状态 - 控制模拟的时间流动
 * 2. 天体数据 - 所有天体的位置和属性
 * 3. 视图状态 - 相机位置、缩放级别
 * 4. 用户偏好 - 语言设置等
 * 
 * 方法分类：
 * 1. 时间控制 - 播放/暂停、速度调整、时间跳转
 * 2. 视图控制 - 缩放、平移、聚焦
 * 3. 交互响应 - 选择天体、重置状态
 * 4. 配置管理 - 语言切换等
 */
export interface SolarSystemState {
  // ========== 时间状态 ==========
  /** 当前模拟时间 */
  currentTime: Date;
  
  /** 是否正在播放（自动推进时间） */
  isPlaying: boolean;
  
  /** 
   * 时间流速（单位：天/秒）
   * 
   * 常用值：
   * - 1/86400 = 实时（1秒模拟1秒）
   * - 1 = 每秒前进1天
   * - 365 = 每秒前进1年
   * - 10 = 快进10天/秒
   * 
   * 范围限制：
   * - 最小：1/86400（实时）
   * - 最大：1095（3年/秒）
   */
  timeSpeed: number;
  
  /** 
   * 播放方向
   * - 'forward': 时间正向流动（未来）
   * - 'backward': 时间反向流动（过去）
   */
  playDirection: 'forward' | 'backward';
  
  // ========== 天体数据 ==========
  /** 
   * 所有天体的当前状态数组
   * 包含：太阳、行星、卫星、小行星等
   * 每个天体包含：位置、速度、轨道参数、物理属性
   */
  celestialBodies: CelestialBody[];
  
  /** 
   * 当前选中的天体名称
   * null 表示未选中任何天体
   * 用于高亮显示和信息面板
   */
  selectedPlanet: string | null;
  
  // ========== 视图状态 ==========
  /** 
   * 视图偏移量（相机位置）
   * 单位：AU（天文单位）
   * 用于平移和跟随天体
   */
  viewOffset: ViewOffset;
  
  /** 
   * 缩放级别
   * 
   * 范围：10 - 200
   * - 较小值：视野更广，看到更多天体
   * - 较大值：视野更窄，看到更多细节
   */
  zoom: number;
  
  /** 
   * 相机距离（仅用于3D模式）
   * 单位：AU（天文单位）
   * 控制相机到焦点的距离
   */
  cameraDistance: number;

  // ========== 语言设置 ==========
  /** 当前界面语言 */
  lang: Language;
  
  /** 切换界面语言 */
  setLang: (lang: Language) => void;

  // ========== 时间控制方法 ==========
  /** 
   * 设置当前时间
   * 会触发所有天体位置的重新计算
   * @param date - 要设置的日期时间
   */
  setCurrentTime: (date: Date) => void;
  
  /** 切换播放/暂停状态 */
  togglePlayPause: () => void;
  
  /** 
   * 设置时间流速
   * @param speed - 新的时间流速（天/秒），会被限制在合理范围内
   */
  setTimeSpeed: (speed: number) => void;
  
  /** 
   * 设置播放方向
   * @param direction - 'forward' 正向或 'backward' 反向
   */
  setPlayDirection: (direction: 'forward' | 'backward') => void;
  
  /** 
   * 开始播放并设置速度和方向
   * @param speed - 时间流速（天/秒）
   * @param direction - 播放方向
   */
  startPlaying: (speed: number, direction: 'forward' | 'backward') => void;
  
  /** 
   * 时间推进（每帧调用）
   * 
   * 根据当前时间流速和播放方向，推进模拟时间并更新天体位置。
   * 这是动画的核心驱动方法。
   * 
   * @param deltaSeconds - 距离上一帧的真实时间差（秒）
   */
  tick: (deltaSeconds: number) => void;
  
  // ========== 视图控制方法 ==========
  /** 
   * 选择天体
   * @param name - 天体名称，null 表示取消选择
   */
  selectPlanet: (name: string | null) => void;
  
  /** 
   * 设置视图偏移
   * @param offset - 新的偏移量（AU）
   */
  setViewOffset: (offset: ViewOffset) => void;
  
  /** 
   * 设置缩放级别
   * @param zoom - 新的缩放级别，会被限制在 10-200 范围内
   */
  setZoom: (zoom: number) => void;
  
  /** 
   * 设置相机距离（3D模式）
   * @param distance - 新的相机距离（AU）
   */
  setCameraDistance: (distance: number) => void;
  
  /** 
   * 将视图中心移动到指定天体
   * @param name - 天体名称
   */
  centerOnPlanet: (name: string) => void;
  
  // ========== 重置方法 ==========
  /** 重置时间到当前现实时间并暂停 */
  resetToNow: () => void;
  
  /** 重置视图到默认状态（缩放、偏移、取消选择） */
  resetView: () => void;
}

/**
 * 缩放级别常量
 * 
 * 这些值经过精心调整以提供最佳的可视化体验：
 * - DEFAULT_ZOOM (50): 能够同时看到内行星和外行星的平衡值
 * - MIN_ZOOM (10): 最大视野，可以看到整个太阳系包括外行星
 * - MAX_ZOOM (200): 最小视野，适合观察内行星的详细轨道
 * 
 * 调整建议：
 * - 观察水星、金星、地球、火星 → 使用较大缩放值 (100-200)
 * - 观察木星、土星 → 使用中等缩放值 (30-60)
 * - 观察天王星、海王星 → 使用较小缩放值 (10-30)
 */
const DEFAULT_ZOOM = 50;  // 默认缩放级别
const MIN_ZOOM = 10;      // 最小缩放（最广视野）
const MAX_ZOOM = 200;     // 最大缩放（最窄视野）

/**
 * 创建 Zustand Store
 */
export const useSolarSystemStore = create<SolarSystemState>((set, get) => {
  const initialTime = new Date();
  const initialJD = dateToJulianDay(initialTime);
  
  // Initialize with empty bodies, will be populated asynchronously
  const initialState = {
    // ========== 初始状态 ==========
    currentTime: initialTime,
    isPlaying: true, // 默认开始播放
    timeSpeed: 1 / 86400, // 默认实时播放：每秒前进1秒 = 1/86400天
    playDirection: 'forward' as const,
    celestialBodies: [] as CelestialBody[],
    selectedPlanet: null,
    viewOffset: { x: 0, y: 0 },
    zoom: DEFAULT_ZOOM,
    cameraDistance: 100, // 默认相机距离
    
    // ========== 语言 ==========
    lang: 'zh' as Language, // 默认中文
    setLang: (lang: Language) => set({ lang }),

    // ========== 方法 ==========
    /**
     * 设置当前时间
     * 
     * 核心时间更新方法，会触发所有天体位置的重新计算。
     * 
     * 执行流程：
     * 1. 将日期转换为儒略日（JD）
     * 2. 异步获取该时刻所有天体的位置
     * 3. 更新状态（时间和天体数据）
     * 
     * 性能优化：
     * - 异步执行，不阻塞UI渲染
     * - 使用缓存避免重复计算
     * - 立即返回，Promise在后台解析
     * 
     * 错误处理：
     * - 计算失败时保持当前天体数据
     * - 发出错误事件通知加载监控器
     * - 避免因错误导致界面卡死
     * 
     * 事件通知：
     * - 成功：'ephemeris:bodies:ready' (在 calculateBodiesNow 中发出)
     * - 失败：'ephemeris:bodies:ready' with error flag
     * 
     * @param date - 要设置的新时间
     */
    setCurrentTime: (date: Date) => {
      const jd = dateToJulianDay(date);
      
      // 异步获取天体位置，不等待完成（避免阻塞）
      // 位置数据就绪后会自动更新状态
      getCelestialBodies(jd).then(bodies => {
        set({ currentTime: date, celestialBodies: bodies });
        // 注意：ephemeris:bodies:ready 事件在 calculateBodiesNow() 中发出
      }).catch(error => {
        console.error('Failed to get celestial bodies:', error);
        // 失败时保持当前天体数据，只更新时间
        set({ currentTime: date });
        
        // 发出错误事件，解除加载屏幕的阻塞
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
            detail: { stage: 'bodies', error: true }
          }));
        }
      });
    },
    
    /**
     * 切换播放/暂停状态
     * 
     * 简单的布尔值切换，不影响其他状态（时间、速度等）。
     * 
     * 使用场景：
     * - 用户点击播放/暂停按钮
     * - 空格键快捷键
     * - 程序控制暂停（如打开设置面板）
     */
    togglePlayPause: () => {
      set((state) => ({ isPlaying: !state.isPlaying }));
    },
    
    /**
     * 设置时间流速
     * 
     * 控制模拟时间相对于真实时间的流逝速度。
     * 
     * 速度说明：
     * - speed = 1/86400 → 实时（1秒模拟1秒）
     * - speed = 1 → 每秒前进1天
     * - speed = 365 → 每秒前进1年
     * 
     * 范围限制（0.1 - 365天/秒）：
     * - 最小：0.1天/秒 = 2.4小时/秒（慢速观察短周期现象）
     * - 最大：365天/秒 = 1年/秒（快速观察长周期现象）
     * 
     * 注意：原注释中的范围不正确，已在此修复
     * 
     * 使用建议：
     * - 观察月球：1-10天/秒
     * - 观察行星：10-100天/秒
     * - 观察外行星：100-365天/秒
     * 
     * @param speed - 期望的时间流速（天/秒），会被限制在合理范围内
     */
    setTimeSpeed: (speed: number) => {
      // 限制速度在合理范围内（以天为单位）
      const clampedSpeed = Math.max(0.1, Math.min(365, speed));
      set({ timeSpeed: clampedSpeed });
    },
    
    /**
     * 设置播放方向
     * 
     * 控制时间流动的方向。
     * 
     * 方向说明：
     * - 'forward': 时间正向流动，模拟未来场景
     * - 'backward': 时间反向流动，回溯历史状态
     * 
     * 应用场景：
     * - forward: 预测未来的天文现象（日食、行星合相等）
     * - backward: 验证历史天文记录、考古天文学研究
     * 
     * @param direction - 'forward' 或 'backward'
     */
    setPlayDirection: (direction: 'forward' | 'backward') => {
      set({ playDirection: direction });
    },
    
    /**
     * 开始播放并设置速度和方向
     * 
     * 一次性设置所有播放相关参数的便捷方法。
     * 
     * 速度范围（1/86400 - 1095天/秒）：
     * - 最小：1/86400天/秒 = 实时（1秒模拟1秒）
     *   86400 = 一天的秒数 (24×60×60)
     * - 最大：1095天/秒 = 3年/秒
     *   1095 = 365 × 3
     * 
     * 使用场景：
     * - 用户通过滑块选择速度并点击播放
     * - 快捷键触发特定速度播放
     * - 程序自动播放特定场景
     * 
     * 相比分别调用三个方法的优势：
     * - 原子操作，避免中间状态
     * - 只触发一次状态更新和重渲染
     * 
     * @param speed - 时间流速（天/秒）
     * @param direction - 播放方向
     */
    startPlaying: (speed: number, direction: 'forward' | 'backward') => {
      // 确保速度在合理范围（以天为单位）
      // 最小速度：1秒/秒 = 1/86400天/秒（实时）
      // 最大速度：3年/秒 = 1095天/秒
      const clampedSpeed = Math.max(1/86400, Math.min(1095, speed));
      set({ timeSpeed: clampedSpeed, playDirection: direction, isPlaying: true });
    },
    
    /**
     * 时间推进（每帧调用）
     * 
     * 这是整个模拟系统的核心驱动方法，负责：
     * 1. 根据时间流速计算时间增量
     * 2. 更新当前模拟时间
     * 3. 触发所有天体位置的更新
     * 
     * 调用时机：
     * - 在动画循环（requestAnimationFrame）中每帧调用
     * - 典型频率：60fps（每秒60次）
     * - 暂停时不调用（isPlaying === false）
     * 
     * 时间计算流程：
     * 1. 检查播放状态（已暂停则立即返回）
     * 2. 计算方向系数（正向=1，反向=-1）
     * 3. 根据流速计算时间增量（天）
     * 4. 转换为毫秒并更新时间
     * 5. 异步更新天体位置
     * 
     * 【关键问题】采样混叠修复（CRITICAL FIX）：
     * 
     * 问题背景：
     * 对于短周期天体（如土卫二Enceladus，轨道周期1.37天），
     * 如果更新频率低于其轨道频率，会出现：
     * - 轨道跳跃或闪烁
     * - 位置更新延迟
     * - 轨迹出现断裂
     * 
     * 解决策略：
     * 1. 立即更新时间（同步操作）
     * 2. 异步获取位置但不等待
     * 3. 优先使用缓存的位置数据
     * 4. 确保每帧都有位置更新
     * 
     * 性能优化：
     * - 天体位置计算在后台异步进行
     * - 使用缓存避免重复计算
     * - 不阻塞渲染线程
     * - getCelestialBodies 内部有缓存机制
     * 
     * 错误处理：
     * - 计算失败时记录错误但不中断
     * - 继续使用上一帧的位置数据
     * - 避免因单次错误导致整个模拟停止
     * 
     * 时间精度：
     * - 使用毫秒精度的时间戳计算
     * - 避免浮点数累积误差
     * - 每次都基于 currentTime 计算新时间
     * 
     * @param deltaSeconds - 距离上一帧的真实时间差（秒）
     *                       通常约为 1/60 ≈ 0.0167秒（60fps时）
     * 
     * @example
     * ```typescript
     * // 在动画循环中使用
     * let lastTime = performance.now();
     * 
     * function animate() {
     *   const currentTime = performance.now();
     *   const deltaSeconds = (currentTime - lastTime) / 1000;
     *   lastTime = currentTime;
     *   
     *   // 推进模拟时间
     *   useSolarSystemStore.getState().tick(deltaSeconds);
     *   
     *   // 渲染场景
     *   render();
     *   
     *   requestAnimationFrame(animate);
     * }
     * ```
     */
    tick: (deltaSeconds: number) => {
      const state = get();
      
      // 如果已暂停，不执行任何操作
      if (!state.isPlaying) return;
      
      // 计算方向系数：正向播放=1，反向播放=-1
      const direction = state.playDirection === 'forward' ? 1 : -1;
      
      // 计算时间增量（天）
      // timeSpeed 的单位是 天/秒，deltaSeconds 的单位是 秒
      // 所以 deltaTimeDays = (天/秒) × 秒 = 天
      const deltaTimeDays = deltaSeconds * state.timeSpeed * direction;
      
      // 转换为毫秒
      // 1天 = 24小时 × 60分钟 × 60秒 × 1000毫秒 = 86,400,000毫秒
      const deltaTimeMs = deltaTimeDays * 24 * 60 * 60 * 1000;
      
      // 计算新时间
      // 使用时间戳算术避免日期对象的复杂性和潜在的时区问题
      const newTime = new Date(state.currentTime.getTime() + deltaTimeMs);
      
      // 【CRITICAL FIX】采样混叠修复：
      // 对于短周期卫星（如Enceladus: 1.37天轨道周期），
      // 我们必须确保每帧都有流畅的位置更新。
      // 
      // 策略：
      // 1. 立即更新时间（同步）- 确保时间推进不延迟
      // 2. 异步获取位置 - 不阻塞渲染
      // 3. 使用缓存优先 - getCelestialBodies 内部缓存确保快速响应
      
      // 转换为儒略日
      const jd = dateToJulianDay(newTime);
      
      // 立即更新时间，确保时间轴同步
      set({ currentTime: newTime });
      
      // 异步获取天体位置，优先使用缓存
      // getCelestialBodies 内部的缓存机制确保：
      // - 相同时间的请求直接返回缓存结果
      // - 短时间内的请求可以复用近期计算
      // - 不会对每帧都进行完整的轨道计算
      getCelestialBodies(jd).then(bodies => {
        // 位置就绪后立即更新
        // 由于每帧都调用，这确保了连续的位置更新流
        set({ celestialBodies: bodies });
      }).catch(error => {
        // 错误时记录但不中断模拟
        // 继续使用上一帧的位置数据
        console.error('Failed to get celestial bodies:', error);
      });
    },
    
    /**
     * 选择天体
     * 
     * 高亮显示并跟踪指定的天体。
     * 
     * 效果：
     * - 在渲染中高亮显示该天体
     * - 在信息面板中显示详细信息
     * - 可能触发相机跟随行为（取决于UI设置）
     * 
     * @param name - 天体名称（如 'Earth', 'Mars'），null 取消选择
     */
    selectPlanet: (name: string | null) => {
      set({ selectedPlanet: name });
    },
    
    /**
     * 设置视图偏移
     * 
     * 直接设置相机的偏移位置。
     * 
     * 使用场景：
     * - 用户拖拽视图
     * - 程序控制相机移动
     * - 动画过渡效果
     * 
     * @param offset - 新的偏移量（单位：AU）
     */
    setViewOffset: (offset: ViewOffset) => set({ viewOffset: offset }),
    
    /**
     * 设置缩放级别
     * 
     * 控制视图的缩放程度，值越大视野越窄。
     * 
     * 自动限制：
     * - 最小值：MIN_ZOOM (10) - 最广视野
     * - 最大值：MAX_ZOOM (200) - 最窄视野
     * 
     * 使用建议：
     * - 10-30: 观察整个太阳系
     * - 30-100: 观察内行星和部分外行星
     * - 100-200: 观察内行星细节
     * 
     * @param zoom - 期望的缩放级别，会被自动限制在有效范围内
     */
    setZoom: (zoom: number) => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      set({ zoom: clampedZoom });
    },
    
    /**
     * 设置相机距离（3D模式专用）
     * 
     * 在3D渲染模式下控制相机到焦点的距离。
     * 
     * 与 zoom 的区别：
     * - zoom: 2D视图的缩放比例
     * - cameraDistance: 3D场景中相机的实际距离
     * 
     * 单位：AU（天文单位）
     * 
     * @param distance - 相机距离（AU）
     */
    setCameraDistance: (distance: number) => {
      set({ cameraDistance: distance });
    },
    
    /**
     * 将视图中心对准指定天体
     * 
     * 同时执行两个操作：
     * 1. 选中该天体（高亮显示）
     * 2. 移动视图偏移使其位于屏幕中央
     * 
     * 坐标变换：
     * - 天体的坐标：(body.x, body.y)
     * - 视图偏移：(-body.x, -body.y)
     * - 效果：天体移动到原点（屏幕中心）
     * 
     * 使用场景：
     * - 用户在搜索框中选择天体
     * - 点击天体列表项
     * - 快捷键跳转到特定天体
     * 
     * @param name - 天体名称
     */
    centerOnPlanet: (name: string) => {
      const state = get();
      const body = state.celestialBodies.find((b) => b.name === name);
      if (body) {
        set({ selectedPlanet: name, viewOffset: { x: -body.x, y: -body.y } });
      }
    },
    
    /**
     * 重置时间到当前现实时间
     * 
     * 将模拟时间跳转到当前真实世界时间，并自动暂停播放。
     * 
     * 执行操作：
     * 1. 创建新的 Date 对象（当前时刻）
     * 2. 调用 setCurrentTime 更新时间和天体位置
     * 3. 设置 isPlaying = false（暂停）
     * 
     * 使用场景：
     * - 用户点击"现在"按钮
     * - 从历史或未来时间快速返回当前
     * - 重置模拟状态
     * 
     * 注意：只重置时间，不影响视图状态（缩放、偏移等）
     */
    resetToNow: () => {
      const now = new Date();
      get().setCurrentTime(now);
      set({ isPlaying: false });
    },
    
    /**
     * 重置视图到默认状态
     * 
     * 恢复视图的所有可视化设置到初始值。
     * 
     * 重置内容：
     * - viewOffset: 回到原点 (0, 0)
     * - zoom: 恢复到默认缩放级别 (50)
     * - selectedPlanet: 取消选择 (null)
     * 
     * 不重置的内容：
     * - 时间相关状态（currentTime, timeSpeed, isPlaying）
     * - 天体数据（celestialBodies）
     * - 用户偏好（lang）
     * - 相机距离（cameraDistance）
     * 
     * 使用场景：
     * - 用户点击"重置视图"按钮
     * - 视图混乱时快速恢复
     * - 在不同观察模式间切换
     */
    resetView: () => {
      set({
        viewOffset: { x: 0, y: 0 },
        zoom: DEFAULT_ZOOM,
        selectedPlanet: null
      });
    }
  };
  
  // Load initial celestial bodies asynchronously
  // CRITICAL: This must complete before the loading page disappears
  // to avoid black screen on mobile devices
  if (typeof window !== 'undefined') {
    console.log('Initializing celestial bodies...');
    
    // Start loading immediately (don't await here to avoid blocking store creation)
    getCelestialBodies(initialJD).then(bodies => {
      console.log(`Loaded ${bodies.length} celestial bodies`);
      set({ celestialBodies: bodies });
      
      // Note: The ephemeris:bodies:ready event is already emitted
      // in calculateBodiesNow() inside getCelestialBodies()
      // This ensures the EphemerisMonitor knows the bodies are ready
    }).catch(error => {
      console.error('Failed to load initial celestial bodies:', error);
      
      // Even on error, emit the bodies:ready event to prevent infinite loading
      // The scene will use analytical models as fallback
      window.dispatchEvent(new CustomEvent('ephemeris:bodies:ready', {
        detail: { stage: 'bodies', error: true }
      }));
    });
  }
  
  return initialState;
});

// 文件末尾修改为：
export type { CelestialBody };

