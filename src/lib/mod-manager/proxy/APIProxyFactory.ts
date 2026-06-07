/**
 * @module mod-manager/proxy/APIProxyFactory
 * @description API 代理工厂
 */

import type {
  TimeAPI,
  CameraAPI,
  CelestialAPI,
  SatelliteAPI,
  RenderAPI,
  ModContext,
} from '../types';
import type { PermissionSystem } from '../permission/PermissionSystem';
import type { Sandbox } from '../sandbox/Sandbox';
import type { CoreAPIs } from './types';
import { APICallLogger } from './APICallLogger';
import { getErrorLogger } from '../error/ErrorLogger';
import { getRegistry } from '../core/ModRegistry';

/**
 * 错误阈值配置
 */
const ERROR_THRESHOLD = 10; // 错误次数阈值
const ERROR_WINDOW_MS = 60000; // 错误时间窗口 (1分钟)

/**
 * API 代理工厂
 * 
 * 为每个 MOD 创建独立的 API 代理实例，集成权限验证和资源配额检查。
 */
export class APIProxyFactory {
  private logger: APICallLogger;
  private errorLogger = getErrorLogger();
  private errorCounts: Map<string, { count: number; firstError: number }> = new Map();

  constructor(
    private permissionSystem: PermissionSystem,
    private sandbox: Sandbox,
    private coreAPIs: CoreAPIs
  ) {
    this.logger = new APICallLogger();
  }

  /**
   * 创建 MOD 的 API 代理
   * 
   * @param modId - MOD ID
   * @returns 代理后的 API 集合
   */
  createProxy(modId: string): Pick<ModContext, 'time' | 'camera' | 'celestial' | 'satellite' | 'render'> {
    return {
      time: this.createTimeAPIProxy(modId),
      camera: this.createCameraAPIProxy(modId),
      celestial: this.createCelestialAPIProxy(modId),
      satellite: this.createSatelliteAPIProxy(modId),
      render: this.createRenderAPIProxy(modId),
    };
  }

  /**
   * 创建 TimeAPI 代理
   */
  private createTimeAPIProxy(modId: string): TimeAPI {
    const coreAPI = this.coreAPIs.time;
    const self = this;

    return {
      get currentTime() {
        self.checkPermission(modId, 'time:read', 'time', 'currentTime');
        return coreAPI.currentTime;
      },

      get isPlaying() {
        self.checkPermission(modId, 'time:read', 'time', 'isPlaying');
        return coreAPI.isPlaying;
      },

      get timeSpeed() {
        self.checkPermission(modId, 'time:read', 'time', 'timeSpeed');
        return coreAPI.timeSpeed;
      },

      get playDirection() {
        self.checkPermission(modId, 'time:read', 'time', 'playDirection');
        return coreAPI.playDirection;
      },

      setCurrentTime: (date: Date) => {
        return self.wrapAPICall(
          modId,
          'time',
          'setCurrentTime',
          'time:write',
          () => coreAPI.setCurrentTime(date)
        );
      },

      togglePlayPause: () => {
        return self.wrapAPICall(
          modId,
          'time',
          'togglePlayPause',
          'time:write',
          () => coreAPI.togglePlayPause()
        );
      },

      setTimeSpeed: (speed: number) => {
        return self.wrapAPICall(
          modId,
          'time',
          'setTimeSpeed',
          'time:write',
          () => coreAPI.setTimeSpeed(speed)
        );
      },

      setPlayDirection: (direction: 'forward' | 'backward') => {
        return self.wrapAPICall(
          modId,
          'time',
          'setPlayDirection',
          'time:write',
          () => coreAPI.setPlayDirection(direction)
        );
      },

      onTimeChange: (callback: (time: Date) => void) => {
        self.checkPermission(modId, 'time:read', 'time', 'onTimeChange');
        self.sandbox.trackEventListener(modId);
        
        const unsubscribe = coreAPI.onTimeChange(callback);
        
        return () => {
          self.sandbox.untrackEventListener(modId);
          unsubscribe();
        };
      },
    };
  }

  /**
   * 创建 CameraAPI 代理
   */
  private createCameraAPIProxy(modId: string): CameraAPI {
    const coreAPI = this.coreAPIs.camera;
    const self = this;

    return {
      get cameraDistance() {
        self.checkPermission(modId, 'camera:read', 'camera', 'cameraDistance');
        return coreAPI.cameraDistance;
      },

      get viewOffset() {
        self.checkPermission(modId, 'camera:read', 'camera', 'viewOffset');
        return coreAPI.viewOffset;
      },

      get zoom() {
        self.checkPermission(modId, 'camera:read', 'camera', 'zoom');
        return coreAPI.zoom;
      },

      setCameraDistance: (distance: number) => {
        return self.wrapAPICall(
          modId,
          'camera',
          'setCameraDistance',
          'camera:write',
          () => coreAPI.setCameraDistance(distance)
        );
      },

      setViewOffset: (offset) => {
        return self.wrapAPICall(
          modId,
          'camera',
          'setViewOffset',
          'camera:write',
          () => coreAPI.setViewOffset(offset)
        );
      },

      setZoom: (zoom: number) => {
        return self.wrapAPICall(
          modId,
          'camera',
          'setZoom',
          'camera:write',
          () => coreAPI.setZoom(zoom)
        );
      },

      centerOnPlanet: (name: string) => {
        return self.wrapAPICall(
          modId,
          'camera',
          'centerOnPlanet',
          'camera:write',
          () => coreAPI.centerOnPlanet(name)
        );
      },

      onCameraChange: (callback) => {
        self.checkPermission(modId, 'camera:read', 'camera', 'onCameraChange');
        self.sandbox.trackEventListener(modId);
        
        const unsubscribe = coreAPI.onCameraChange(callback);
        
        return () => {
          self.sandbox.untrackEventListener(modId);
          unsubscribe();
        };
      },
    };
  }

  /**
   * 创建 CelestialAPI 代理
   */
  private createCelestialAPIProxy(modId: string): CelestialAPI {
    const coreAPI = this.coreAPIs.celestial;
    const self = this;

    return {
      getCelestialBodies: () => {
        return self.wrapAPICall(
          modId,
          'celestial',
          'getCelestialBodies',
          'celestial:read',
          () => coreAPI.getCelestialBodies()
        );
      },

      getOrbitalElements: (bodyName: string) => {
        return self.wrapAPICall(
          modId,
          'celestial',
          'getOrbitalElements',
          'celestial:read',
          () => coreAPI.getOrbitalElements(bodyName)
        );
      },

      calculatePosition: (elements, jd) => {
        return self.wrapAPICall(
          modId,
          'celestial',
          'calculatePosition',
          'celestial:execute',
          () => coreAPI.calculatePosition(elements, jd)
        );
      },

      get ORBITAL_ELEMENTS() {
        self.checkPermission(modId, 'celestial:read', 'celestial', 'ORBITAL_ELEMENTS');
        return coreAPI.ORBITAL_ELEMENTS;
      },

      get CELESTIAL_BODIES() {
        self.checkPermission(modId, 'celestial:read', 'celestial', 'CELESTIAL_BODIES');
        return coreAPI.CELESTIAL_BODIES;
      },

      dateToJulianDay: (date: Date) => {
        return self.wrapAPICall(
          modId,
          'celestial',
          'dateToJulianDay',
          'celestial:execute',
          () => coreAPI.dateToJulianDay(date)
        );
      },

      julianDayToDate: (jd: number) => {
        return self.wrapAPICall(
          modId,
          'celestial',
          'julianDayToDate',
          'celestial:execute',
          () => coreAPI.julianDayToDate(jd)
        );
      },

      onBodiesUpdate: (callback) => {
        self.checkPermission(modId, 'celestial:read', 'celestial', 'onBodiesUpdate');
        self.sandbox.trackEventListener(modId);
        
        const unsubscribe = coreAPI.onBodiesUpdate(callback);
        
        return () => {
          self.sandbox.untrackEventListener(modId);
          unsubscribe();
        };
      },
    };
  }

  /**
   * 创建 SatelliteAPI 代理
   */
  private createSatelliteAPIProxy(modId: string): SatelliteAPI {
    const coreAPI = this.coreAPIs.satellite;
    const self = this;

    return {
      get satellites() {
        self.checkPermission(modId, 'satellite:read', 'satellite', 'satellites');
        return coreAPI.satellites;
      },

      get visibleSatellites() {
        self.checkPermission(modId, 'satellite:read', 'satellite', 'visibleSatellites');
        return coreAPI.visibleSatellites;
      },

      fetchSatellites: (source?: string) => {
        return self.wrapAPICall(
          modId,
          'satellite',
          'fetchSatellites',
          'satellite:write',
          () => coreAPI.fetchSatellites(source)
        );
      },

      selectSatellite: (noradId: number) => {
        return self.wrapAPICall(
          modId,
          'satellite',
          'selectSatellite',
          'satellite:read',
          () => coreAPI.selectSatellite(noradId)
        );
      },

      calculateSatellitePosition: (noradId: number, time: Date) => {
        return self.wrapAPICall(
          modId,
          'satellite',
          'calculateSatellitePosition',
          'satellite:execute',
          () => coreAPI.calculateSatellitePosition(noradId, time)
        );
      },

      onSatellitesUpdate: (callback) => {
        self.checkPermission(modId, 'satellite:read', 'satellite', 'onSatellitesUpdate');
        self.sandbox.trackEventListener(modId);
        
        const unsubscribe = coreAPI.onSatellitesUpdate(callback);
        
        return () => {
          self.sandbox.untrackEventListener(modId);
          unsubscribe();
        };
      },
    };
  }

  /**
   * 创建 RenderAPI 代理
   */
  private createRenderAPIProxy(modId: string): RenderAPI {
    const coreAPI = this.coreAPIs.render;
    const self = this;

    return {
      registerRenderer: (id: string, factory) => {
        return self.wrapAPICall(
          modId,
          'render',
          'registerRenderer',
          'render:write',
          () => {
            self.sandbox.trackRenderObject(modId);
            return coreAPI.registerRenderer(id, factory);
          }
        );
      },

      unregisterRenderer: (id: string) => {
        return self.wrapAPICall(
          modId,
          'render',
          'unregisterRenderer',
          'render:write',
          () => {
            self.sandbox.untrackRenderObject(modId);
            return coreAPI.unregisterRenderer(id);
          }
        );
      },

      getScene: () => {
        return self.wrapAPICall(
          modId,
          'render',
          'getScene',
          'render:read',
          () => coreAPI.getScene()
        );
      },

      getCamera: () => {
        return self.wrapAPICall(
          modId,
          'render',
          'getCamera',
          'render:read',
          () => coreAPI.getCamera()
        );
      },

      getRenderer: () => {
        return self.wrapAPICall(
          modId,
          'render',
          'getRenderer',
          'render:read',
          () => coreAPI.getRenderer()
        );
      },

      registerCesiumLayer: (options) => {
        return self.wrapAPICall(
          modId,
          'render',
          'registerCesiumLayer',
          'render:write',
          () => coreAPI.registerCesiumLayer(options)
        );
      },

      unregisterCesiumLayer: (id: string) => {
        return self.wrapAPICall(
          modId,
          'render',
          'unregisterCesiumLayer',
          'render:write',
          () => coreAPI.unregisterCesiumLayer(id)
        );
      },

      onBeforeRender: (callback: () => void) => {
        self.checkPermission(modId, 'render:execute', 'render', 'onBeforeRender');
        self.sandbox.trackEventListener(modId);
        
        const unsubscribe = coreAPI.onBeforeRender(callback);
        
        return () => {
          self.sandbox.untrackEventListener(modId);
          unsubscribe();
        };
      },

      onAfterRender: (callback: () => void) => {
        self.checkPermission(modId, 'render:execute', 'render', 'onAfterRender');
        self.sandbox.trackEventListener(modId);
        
        const unsubscribe = coreAPI.onAfterRender(callback);
        
        return () => {
          self.sandbox.untrackEventListener(modId);
          unsubscribe();
        };
      },
    };
  }

  /**
   * 检查权限（用于属性访问）
   */
  private checkPermission(
    modId: string,
    permission: string,
    api: string,
    method: string
  ): void {
    try {
      this.permissionSystem.requirePermission(modId, permission);
    } catch (error) {
      console.error(`[API Proxy] Permission denied for ${modId}.${api}.${method}:`, error);
      throw error;
    }
  }

  /**
   * 包装 API 调用（用于方法调用）
   */
  private wrapAPICall<T>(
    modId: string,
    api: string,
    method: string,
    permission: string,
    fn: () => T
  ): T {
    const startTime = performance.now();
    let success = false;
    let error: Error | undefined;

    try {
      // 权限检查
      this.permissionSystem.requirePermission(modId, permission);

      // 配额检查
      this.sandbox.checkQuota(modId, 'apiCallsLastSecond');

      // 执行 API 调用
      const result = fn();
      success = true;
      return result;
    } catch (err) {
      error = err as Error;
      
      // 记录错误到错误日志
      this.errorLogger.log(modId, error, {
        api,
        method,
        permission,
      });
      
      // 更新错误计数
      this.recordError(modId);
      
      // 检查是否需要自动禁用 MOD
      this.checkErrorThreshold(modId);
      
      throw err;
    } finally {
      // 记录日志
      const duration = performance.now() - startTime;
      this.logger.log({
        modId,
        api,
        method,
        timestamp: new Date(),
        duration,
        success,
        error: error?.message,
      });
    }
  }

  /**
   * 记录错误
   */
  private recordError(modId: string): void {
    const now = Date.now();
    const errorInfo = this.errorCounts.get(modId);

    if (!errorInfo) {
      // 首次错误
      this.errorCounts.set(modId, { count: 1, firstError: now });
    } else {
      // 检查是否在时间窗口内
      if (now - errorInfo.firstError > ERROR_WINDOW_MS) {
        // 超出时间窗口，重置计数
        this.errorCounts.set(modId, { count: 1, firstError: now });
      } else {
        // 在时间窗口内，增加计数
        errorInfo.count++;
      }
    }
  }

  /**
   * 检查错误阈值并自动禁用 MOD
   */
  private checkErrorThreshold(modId: string): void {
    const errorInfo = this.errorCounts.get(modId);
    if (!errorInfo) return;

    if (errorInfo.count >= ERROR_THRESHOLD) {
      console.error(
        `[API Proxy] MOD "${modId}" 在 ${ERROR_WINDOW_MS / 1000} 秒内发生 ${errorInfo.count} 次错误，` +
        `已达到阈值 ${ERROR_THRESHOLD}，将自动禁用该 MOD`
      );

      // 自动禁用 MOD
      this.disableMod(modId);

      // 重置错误计数
      this.errorCounts.delete(modId);
    }
  }

  /**
   * 禁用 MOD
   */
  private async disableMod(modId: string): Promise<void> {
    try {
      getRegistry();
      const { getModLifecycle } = await import('../core/ModLifecycle');
      const lifecycle = getModLifecycle();
      
      await lifecycle.disable(modId);
      
      console.warn(`[API Proxy] MOD "${modId}" 已被自动禁用`);
    } catch (error) {
      console.error(`[API Proxy] 禁用 MOD "${modId}" 失败:`, error);
    }
  }

  /**
   * 重置错误计数
   */
  resetErrorCount(modId: string): void {
    this.errorCounts.delete(modId);
  }

  /**
   * 获取错误计数
   */
  getErrorCount(modId: string): number {
    return this.errorCounts.get(modId)?.count || 0;
  }

  /**
   * 获取日志记录器
   */
  getLogger(): APICallLogger {
    return this.logger;
  }
}
