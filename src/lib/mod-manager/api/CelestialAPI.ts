/**
 * @module mod-manager/api/CelestialAPI
 * @description 天体API实现
 * 
 * 提供MOD对天体数据的访问。
 */

import type {
  CelestialAPI as ICelestialAPI,
  CelestialBodyData,
  OrbitalElementsData,
} from '../types';
import { getEventBus } from '../core/EventBus';

/**
 * 天体API实现类
 */
export class CelestialAPIImpl implements ICelestialAPI {
  private eventBus = getEventBus();
  private bodiesListeners: Set<(bodies: CelestialBodyData[]) => void> = new Set();

  // 轨道元素数据（简化版，实际应用中从数据文件加载）
  private _orbitalElements: Record<string, OrbitalElementsData> = {};

  // 天体数据缓存
  private _celestialBodies: CelestialBodyData[] = [];

  /**
   * 获取天体列表
   */
  getCelestialBodies(): CelestialBodyData[] {
    return [...this._celestialBodies];
  }

  /**
   * 获取轨道元素
   */
  getOrbitalElements(bodyName: string): OrbitalElementsData | null {
    return this._orbitalElements[bodyName] || null;
  }

  /**
   * 计算天体位置
   * 
   * 使用简化的开普勒轨道计算
   */
  calculatePosition(
    elements: OrbitalElementsData,
    jd: number
  ): { x: number; y: number; z: number; r: number } {
    // 简化计算（实际应用中需要更精确的算法）
    const T = (jd - 2451545.0) / 36525.0; // 世纪数

    // 平近点角
    const M = (elements.L - elements.w_bar + (0.9856474 * T * 365.25)) % (2 * Math.PI);

    // 偏近点角（简化迭代）
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = M + elements.e * Math.sin(E);
    }

    // 真近点角
    const v = 2 * Math.atan(
      Math.sqrt((1 + elements.e) / (1 - elements.e)) * Math.tan(E / 2)
    );

    // 日心距离
    const r = elements.a * (1 - elements.e * Math.cos(E));

    // 黄道坐标
    const lambda = v + elements.w_bar;

    // 转换为日心直角坐标（简化，忽略轨道倾角）
    const x = r * Math.cos(lambda);
    const y = r * Math.sin(lambda);
    const z = 0;

    return { x, y, z, r };
  }

  /**
   * 获取轨道元素常量
   */
  get ORBITAL_ELEMENTS(): Record<string, OrbitalElementsData> {
    return { ...this._orbitalElements };
  }

  /**
   * 获取天体常量
   */
  get CELESTIAL_BODIES(): Record<string, unknown> {
    return {};
  }

  /**
   * 日期转儒略日
   */
  dateToJulianDay(date: Date): number {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate() +
      date.getUTCHours() / 24 +
      date.getUTCMinutes() / 1440 +
      date.getUTCSeconds() / 86400;

    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;

    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 +
      Math.floor(y2 / 4) - Math.floor(y2 / 100) +
      Math.floor(y2 / 400) - 32045;
  }

  /**
   * 儒略日转日期
   */
  julianDayToDate(jd: number): Date {
    const z = Math.floor(jd + 0.5);
    const f = jd + 0.5 - z;

    let a: number;
    if (z < 2299161) {
      a = z;
    } else {
      const alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(alpha / 4);
    }

    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);

    const day = b - d - Math.floor(30.6001 * e);
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;

    const hours = Math.floor(f * 24);
    const minutes = Math.floor((f * 24 - hours) * 60);
    const seconds = Math.floor(((f * 24 - hours) * 60 - minutes) * 60);

    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  }

  /**
   * 订阅天体更新
   */
  onBodiesUpdate(callback: (bodies: CelestialBodyData[]) => void): () => void {
    this.bodiesListeners.add(callback);
    return () => this.bodiesListeners.delete(callback);
  }

  /**
   * 内部方法：设置轨道元素数据
   */
  _setOrbitalElements(elements: Record<string, OrbitalElementsData>): void {
    this._orbitalElements = { ...elements };
  }

  /**
   * 内部方法：更新天体数据
   */
  _updateBodies(bodies: CelestialBodyData[]): void {
    this._celestialBodies = [...bodies];
    this.bodiesListeners.forEach(cb => {
      try {
        cb(this._celestialBodies);
      } catch {
        // 忽略回调错误
      }
    });
    this.eventBus.emit('bodies:update', { bodies });
  }
}

// 单例实例
let celestialApiInstance: CelestialAPIImpl | null = null;

/**
 * 获取天体API单例
 */
export function getCelestialAPI(): CelestialAPIImpl {
  if (!celestialApiInstance) {
    celestialApiInstance = new CelestialAPIImpl();
  }
  return celestialApiInstance;
}

/**
 * 重置天体API（仅用于测试）
 */
export function resetCelestialAPI(): void {
  celestialApiInstance = null;
}