/**
 * @module mod-manager/api/SatelliteAPI
 * @description 卫星API实现
 * 
 * 提供MOD对卫星数据的访问。
 */

import type { SatelliteAPI as ISatelliteAPI, SatelliteData } from '../types';
import { getEventBus } from '../core/EventBus';

/**
 * 卫星API实现类
 */
export class SatelliteAPIImpl implements ISatelliteAPI {
  private eventBus = getEventBus();
  private satellitesListeners: Set<(satellites: SatelliteData[]) => void> = new Set();

  // 卫星数据缓存
  private _satellites: SatelliteData[] = [];
  private _loading: boolean = false;
  private _error: Error | null = null;

  /**
   * 获取所有卫星
   */
  get satellites(): SatelliteData[] {
    return [...this._satellites];
  }

  /**
   * 获取可见卫星
   */
  get visibleSatellites(): SatelliteData[] {
    // 简化实现：返回有位置数据的卫星
    return this._satellites.filter(s => s.position !== undefined);
  }

  /**
   * 加载卫星数据
   * 
   * 委托给 useSatelliteStore 进行实际的数据加载
   */
  async fetchSatellites(source?: string): Promise<void> {
    if (this._loading) return;

    this._loading = true;
    this._error = null;

    try {
      // 动态导入 useSatelliteStore 以避免循环依赖
      const { useSatelliteStore } = await import('../../store/useSatelliteStore');
      const { SatelliteCategory } = await import('../../types/satellite');
      
      // 根据 source 参数确定类别，默认为 ACTIVE
      let category = SatelliteCategory.ACTIVE;
      if (source) {
        // 如果 source 是一个类别名称，使用它
        const categoryMap: Record<string, any> = {
          'active': SatelliteCategory.ACTIVE,
          'stations': SatelliteCategory.ISS,
          'iss': SatelliteCategory.ISS,
          'gps': SatelliteCategory.GPS,
          'gps-ops': SatelliteCategory.GPS,
          'geo': SatelliteCategory.COMMUNICATION,
          'communication': SatelliteCategory.COMMUNICATION,
          'weather': SatelliteCategory.WEATHER,
          'science': SatelliteCategory.SCIENCE,
          'other': SatelliteCategory.OTHER,
        };
        category = categoryMap[source.toLowerCase()] || SatelliteCategory.ACTIVE;
      }
      
      // 调用 store 的 fetchSatellites 方法
      await useSatelliteStore.getState().fetchSatellites(category);
      
      console.log('[SatelliteAPI] 卫星数据加载完成');
    } catch (error) {
      this._error = error as Error;
      this.eventBus.emit('satellite:error', { error });
      console.error('[SatelliteAPI] 卫星数据加载失败:', error);
      throw error;
    } finally {
      this._loading = false;
    }
  }

  /**
   * 选择卫星
   */
  selectSatellite(noradId: number): SatelliteData | null {
    return this._satellites.find(s => s.noradId === noradId) || null;
  }

  /**
   * 计算卫星位置
   * 
   * 简化实现，实际应用中需要使用SGP4算法
   */
  calculateSatellitePosition(
    noradId: number,
    time: Date
  ): { x: number; y: number; z: number } | null {
    const satellite = this.selectSatellite(noradId);
    if (!satellite?.tle) return null;

    // 简化实现：返回缓存的位置或null
    // 实际应用中需要实现SGP4算法
    return satellite.position || null;
  }

  /**
   * 订阅卫星更新
   */
  onSatellitesUpdate(callback: (satellites: SatelliteData[]) => void): () => void {
    this.satellitesListeners.add(callback);
    return () => this.satellitesListeners.delete(callback);
  }

  /**
   * 通知卫星更新
   */
  private notifySatellitesUpdate(): void {
    const satellites = this.satellites;
    this.satellitesListeners.forEach(cb => {
      try {
        cb(satellites);
      } catch {
        // 忽略回调错误
      }
    });
    this.eventBus.emit('satellites:update', { satellites });
  }

  /**
   * 内部方法：设置卫星数据
   */
  _setSatellites(satellites: SatelliteData[]): void {
    this._satellites = [...satellites];
    this.notifySatellitesUpdate();
  }

  /**
   * 获取加载状态
   */
  isLoading(): boolean {
    return this._loading;
  }

  /**
   * 获取错误信息
   */
  getError(): Error | null {
    return this._error;
  }
}

// 单例实例
let satelliteApiInstance: SatelliteAPIImpl | null = null;

/**
 * 获取卫星API单例
 */
export function getSatelliteAPI(): SatelliteAPIImpl {
  if (!satelliteApiInstance) {
    satelliteApiInstance = new SatelliteAPIImpl();
  }
  return satelliteApiInstance;
}

/**
 * 重置卫星API（仅用于测试）
 */
export function resetSatelliteAPI(): void {
  satelliteApiInstance = null;
}