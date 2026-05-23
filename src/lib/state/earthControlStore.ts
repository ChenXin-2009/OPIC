/**
 * Earth Control Store - 管理地球控制相关的全局状态
 * 
 * 存储 Cesium、地球锁定、地球光照等状态
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
  cesiumEnabled: true, // 默认开启 Cesium
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
