/**
 * SceneModeManager - 场景模式管理器
 * 
 * 负责管理 Three.js 主导模式和 Cesium 主导模式之间的切换
 * 
 * 模式说明：
 * - THREE_DOMINANT: Three.js 主场景，Cesium canvas 作为嵌入元素（默认模式）
 * - CESIUM_DOMINANT: Cesium 主场景，Three.js 作为嵌入元素，使用原生 Cesium 相机
 * 
 * 切换触发条件：
 * - 距离地球 < CESIUM_MODE_DISTANCE_THRESHOLD 时自动切换到 CESIUM_DOMINANT
 * - 距离地球 > THREE_MODE_DISTANCE_THRESHOLD 时自动切换回 THREE_DOMINANT
 */

/**
 * 场景模式枚举
 */
export enum SceneMode {
  /** Three.js 主导模式（默认） */
  THREE_DOMINANT = 'THREE_DOMINANT',
  /** Cesium 主导模式（靠近地球时） */
  CESIUM_DOMINANT = 'CESIUM_DOMINANT',
}

/**
 * 场景模式配置
 */
export interface SceneModeConfig {
  /** 切换到 Cesium 模式的距离阈值（AU） */
  cesiumModeDistanceThreshold: number;
  /** 切换回 Three.js 模式的距离阈值（AU） */
  threeModeDistanceThreshold: number;
  /** 是否启用自动切换 */
  autoSwitch: boolean;
  /** 过渡动画时长（毫秒） */
  transitionDuration: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SceneModeConfig = {
  // 0.0001 AU ≈ 15,000 km（约地球半径的 2.3 倍）
  cesiumModeDistanceThreshold: 0.0001,
  // 0.0002 AU ≈ 30,000 km（避免频繁切换的滞后阈值）
  threeModeDistanceThreshold: 0.0002,
  autoSwitch: true,
  transitionDuration: 0, // 即时切换，无过渡动画
};

/**
 * 场景模式管理器
 */
export class SceneModeManager {
  private currentMode: SceneMode = SceneMode.THREE_DOMINANT;
  private config: SceneModeConfig;
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private modeChangeCallbacks: Array<(mode: SceneMode) => void> = [];
  
  constructor(config?: Partial<SceneModeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 获取当前场景模式
   */
  getCurrentMode(): SceneMode {
    return this.currentMode;
  }
  
  /**
   * 检查是否处于过渡状态
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }
  
  /**
   * 获取过渡进度（0-1）
   */
  getTransitionProgress(): number {
    if (!this.isTransitioning) return 1;
    
    const elapsed = Date.now() - this.transitionStartTime;
    const progress = Math.min(1, elapsed / this.config.transitionDuration);
    
    if (progress >= 1) {
      this.isTransitioning = false;
    }
    
    return progress;
  }
  
  /**
   * 根据距离地球的距离更新场景模式
   * 
   * @param distanceToEarth 相机到地球的距离（AU）
   * @returns 是否发生了模式切换
   */
  updateModeByDistance(distanceToEarth: number): boolean {
    if (!this.config.autoSwitch) return false;
    
    // 每帧刷新过渡状态，确保过渡完成后 isTransitioning 被重置
    // 否则 switchMode 中的 isTransitioning 锁会永久阻止后续切换
    this.getTransitionProgress();
    
    const { cesiumModeDistanceThreshold, threeModeDistanceThreshold } = this.config;
    
    // 使用滞后阈值避免频繁切换
    if (this.currentMode === SceneMode.THREE_DOMINANT) {
      // 当前是 Three.js 模式，检查是否应该切换到 Cesium 模式
      if (distanceToEarth < cesiumModeDistanceThreshold) {
        return this.switchMode(SceneMode.CESIUM_DOMINANT);
      }
    } else {
      // 当前是 Cesium 模式，检查是否应该切换回 Three.js 模式
      if (distanceToEarth > threeModeDistanceThreshold) {
        return this.switchMode(SceneMode.THREE_DOMINANT);
      }
    }
    
    return false;
  }
  
  /**
   * 手动切换场景模式
   * 
   * @param mode 目标模式
   * @returns 是否成功切换
   */
  switchMode(mode: SceneMode): boolean {
    if (this.currentMode === mode) return false;
    if (this.isTransitioning) return false;
    
    console.log(`[SceneModeManager] Switching from ${this.currentMode} to ${mode}`);
    
    this.currentMode = mode;
    this.isTransitioning = true;
    this.transitionStartTime = Date.now();
    
    // 触发回调
    this.modeChangeCallbacks.forEach(callback => callback(mode));
    
    return true;
  }
  
  /**
   * 注册模式切换回调
   * 
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  onModeChange(callback: (mode: SceneMode) => void): () => void {
    this.modeChangeCallbacks.push(callback);
    
    // 返回取消注册函数
    return () => {
      const index = this.modeChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.modeChangeCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<SceneModeConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): SceneModeConfig {
    return { ...this.config };
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    this.modeChangeCallbacks = [];
  }
}
