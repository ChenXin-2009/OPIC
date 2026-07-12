/**
 * Earth Control Store - 管理地球控制相关的全局状态
 *
 * 存储 Cesium 启用状态、地球锁定/光照、地球实体引用等状态。
 *
 * 设计意图：地球一直使用 Cesium 高精度 3D 地球渲染，
 * 仅在缩放至极远距离时动画循环自动切换为 Three.js 简模（SceneMode.THREE_DOMINANT）。
 * cesiumEnabled 控制 Cesium 适配器是否初始化（默认 true）。
 *
 * 地球锁定（earthLockEnabled）区分用户主动设定与系统自动设定：
 * - setEarthLockEnabled：同时更新 userEarthLockPreference（用户手动触发）
 * - setEarthLockEnabledAuto：仅改变当前状态，保留用户偏好
 * - setUserEarthLockPreference：显式设定用户偏好
 */

import { create } from 'zustand';

/**
 * Earth Control Store 的状态与操作接口
 */
interface EarthControlState {
  /** Cesium 地球适配器是否启用（默认 true） */
  cesiumEnabled: boolean;
  /** 当前地球锁定状态 */
  earthLockEnabled: boolean;
  /** 地球光照是否启用 */
  earthLightEnabled: boolean;
  /** Cesium 地球实体引用 */
  earthPlanet: any | null;
  /** 用户原始偏好（不受自动切换影响） */
  userEarthLockPreference: boolean;
  /**
   * 设置 Cesium 启用状态
   * @param enabled - 是否启用 Cesium
   */
  setCesiumEnabled: (enabled: boolean) => void;
  /**
   * 设置地球锁定（用户手动触发，同时更新偏好）
   * @param enabled - 是否锁定
   */
  setEarthLockEnabled: (enabled: boolean) => void;
  /**
   * 设置地球光照
   * @param enabled - 是否启用光照
   */
  setEarthLightEnabled: (enabled: boolean) => void;
  /**
   * 设置地球实体引用
   * @param planet - 地球实体对象
   */
  setEarthPlanet: (planet: any) => void;
  /**
   * 设置用户偏好（显式设定，仅当用户主动操作时调用）
   * @param enabled - 用户偏好的锁定状态
   */
  setUserEarthLockPreference: (enabled: boolean) => void;
  /**
   * 自动管理地球锁定（系统调用，不改变用户偏好）
   * @param enabled - 系统自动设定的锁定状态
   */
  setEarthLockEnabledAuto: (enabled: boolean) => void;
}

/** 地球控制全局状态 Store */
export const useEarthControlStore = create<EarthControlState>((set) => ({
  cesiumEnabled: true,
  earthLockEnabled: true,
  earthLightEnabled: true,
  earthPlanet: null,
  userEarthLockPreference: true,
  setCesiumEnabled: (enabled) => set({ cesiumEnabled: enabled }),
  setEarthLockEnabled: (enabled) => set({
    earthLockEnabled: enabled,
    userEarthLockPreference: enabled,
  }),
  setEarthLightEnabled: (enabled) => set({ earthLightEnabled: enabled }),
  setEarthPlanet: (planet) => set({ earthPlanet: planet }),
  setUserEarthLockPreference: (enabled) => set({
    userEarthLockPreference: enabled,
    earthLockEnabled: enabled,
  }),
  setEarthLockEnabledAuto: (enabled) => set({ earthLockEnabled: enabled }),
}));
