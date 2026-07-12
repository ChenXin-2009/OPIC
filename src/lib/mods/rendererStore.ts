/**
 * @module mods/rendererStore
 * @description MOD渲染器全局存储，用于在 Overlay 和 Window 之间共享渲染器实例。
 * 每种 MOD 类型（航天发射、全球交通、天气灾害、航天飞行、重力网格）
 * 各维护一个渲染器引用，通过显式的 setter/getter 访问。
 */

import type { LaunchRenderer } from './space-launches/LaunchRenderer';
import type { TrafficRenderer } from './global-traffic/TrafficRenderer';
import type { DisasterRenderer } from './weather-disaster/DisasterRenderer';
import type { FlightRendererLayer } from './flight-renderer';
import type { GravityGridRenderer } from './gravity-grid/GravityGridRenderer';

/**
 * 渲染器存储的内部结构，每种 MOD 对应一个可空引用。
 */
interface RendererStore {
  /** 航天发射渲染器实例 */
  spaceLaunches: LaunchRenderer | null;
  /** 全球交通渲染器实例 */
  globalTraffic: TrafficRenderer | null;
  /** 天气灾害渲染器实例 */
  weatherDisaster: DisasterRenderer | null;
  /** 航天飞行渲染器实例 */
  spaceFlight: FlightRendererLayer | null;
  /** 重力网格渲染器实例 */
  gravityGrid: GravityGridRenderer | null;
}

const renderers: RendererStore = {
  spaceLaunches: null,
  globalTraffic: null,
  weatherDisaster: null,
  spaceFlight: null,
  gravityGrid: null,
};

export const rendererStore = {
  /**
   * 设置航天发射渲染器实例。
   * @param renderer - 渲染器实例，传入 null 表示清除
   */
  setSpaceLaunchesRenderer: (renderer: LaunchRenderer | null) => {
    renderers.spaceLaunches = renderer;
  },
  /** @returns 当前航天发射渲染器实例，未设置时返回 null */
  getSpaceLaunchesRenderer: () => renderers.spaceLaunches,

  /**
   * 设置全球交通渲染器实例。
   * @param renderer - 渲染器实例，传入 null 表示清除
   */
  setGlobalTrafficRenderer: (renderer: TrafficRenderer | null) => {
    renderers.globalTraffic = renderer;
  },
  /** @returns 当前全球交通渲染器实例，未设置时返回 null */
  getGlobalTrafficRenderer: () => renderers.globalTraffic,

  /**
   * 设置天气灾害渲染器实例。
   * @param renderer - 渲染器实例，传入 null 表示清除
   */
  setWeatherDisasterRenderer: (renderer: DisasterRenderer | null) => {
    renderers.weatherDisaster = renderer;
  },
  /** @returns 当前天气灾害渲染器实例，未设置时返回 null */
  getWeatherDisasterRenderer: () => renderers.weatherDisaster,

  /**
   * 设置航天飞行渲染器实例。
   * @param renderer - 渲染器实例，传入 null 表示清除
   */
  setSpaceFlightRenderer: (renderer: FlightRendererLayer | null) => {
    renderers.spaceFlight = renderer;
  },
  /** @returns 当前航天飞行渲染器实例，未设置时返回 null */
  getSpaceFlightRenderer: () => renderers.spaceFlight,

  /**
   * 设置重力网格渲染器实例。
   * @param renderer - 渲染器实例，传入 null 表示清除
   */
  setGravityGridRenderer: (renderer: GravityGridRenderer | null) => {
    renderers.gravityGrid = renderer;
  },
  /** @returns 当前重力网格渲染器实例，未设置时返回 null */
  getGravityGridRenderer: () => renderers.gravityGrid,
};
