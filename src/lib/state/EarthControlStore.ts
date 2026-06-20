/**
 * Earth Control Store - 管理地球控制相关的全局状态
 * 
 * 存储 Cesium、地球锁定、地球光照等状态
 * 
 * 设计意图：地球一直使用 Cesium 高精度 3D 地球渲染，
 * 仅在缩放至极远距离时动画循环自动切换为 Three.js 简模（SceneMode.THREE_DOMINANT）。
 * cesiumEnabled 控制 Cesium 适配器是否初始化（默认 true）。
 */

import { create } from 'zustand';

interface EarthControlState {
  cesiumEnabled: boolean;
  earthLockEnabled: boolean;
  earthLightEnabled: boolean;
  earthPlanet: any | null;
  // 保存用户原始设置
  userEarthLockPreference: boolean;
  setCesiumEnabled: (enabled: boolean) => void;
  setEarthLockEnabled: (enabled: boolean) => void;
  setEarthLightEnabled: (enabled: boolean) => void;
  setEarthPlanet: (planet: any) => void;
  // 设置用户偏好（用户手动切换时调用）
  setUserEarthLockPreference: (enabled: boolean) => void;
  // 自动管理地球锁定（系统调用，不改变用户偏好）
  setEarthLockEnabledAuto: (enabled: boolean) => void;
}

export const useEarthControlStore = create<EarthControlState>((set) => ({
  cesiumEnabled: true, // 默认开启 Cesium — 地球一直使用 Cesium 渲染
  earthLockEnabled: true,
  earthLightEnabled: true,
  earthPlanet: null,
  userEarthLockPreference: true, // 默认用户偏好为开启
  setCesiumEnabled: (enabled) => set({ cesiumEnabled: enabled }),
  setEarthLockEnabled: (enabled) => set({ 
    earthLockEnabled: enabled,
    userEarthLockPreference: enabled, // 用户手动设置时，同时更新偏好
  }),
  setEarthLightEnabled: (enabled) => set({ earthLightEnabled: enabled }),
  setEarthPlanet: (planet) => set({ earthPlanet: planet }),
  setUserEarthLockPreference: (enabled) => set({ 
    userEarthLockPreference: enabled,
    earthLockEnabled: enabled,
  }),
  setEarthLockEnabledAuto: (enabled) => set({ earthLockEnabled: enabled }), // 只改变当前状态，不改变用户偏好
}));
