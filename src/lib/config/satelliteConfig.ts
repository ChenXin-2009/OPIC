/**
 * 卫星可视化系统配置
 * 
 * 包含API、渲染、计算和UI的所有配置参数
 */

import { SatelliteConfig, OrbitType } from '../types/satellite';

/**
 * 卫星系统默认配置
 */
export const satelliteConfig: SatelliteConfig = {
  // API配置
  api: {
    // API端点路径
    endpoint: '/api/satellites',
    // 缓存时间: 2小时
    cacheTime: 2 * 60 * 60 * 1000,
    // 失败重试次数
    retryAttempts: 3,
    // 请求超时: 10秒
    timeout: 10000
  },

  // 渲染配置
  rendering: {
    // 支持最多100,000颗卫星
    maxSatellites: 100000,
    // 默认点大小（像素）
    pointSize: 5,
    // 透明度
    opacity: 1,
    // LOD距离阈值(单位:1000km)
    // [近距离阈值, 中距离阈值, 远距离阈值]
    lodDistances: [10, 50, 100],
    // 轨道类型颜色映射
    colors: {
      [OrbitType.LEO]: '#00aaff',  // 低轨 - 蓝色
      [OrbitType.MEO]: '#00ff00',  // 中轨 - 绿色
      [OrbitType.GEO]: '#ff0000',  // 高轨 - 红色
      [OrbitType.HEO]: '#ffffff'   // 高椭圆轨道 - 白色
    }
  },

  // 计算配置
  computation: {
    // 每批最多计算1000颗卫星
    maxBatchSize: 1000,
    // Web Worker数量
    workerCount: 1,
    // 缓存最多10000个计算结果
    cacheSize: 10000
  },

  // UI配置
  ui: {
    // 最多同时显示10条轨道
    maxOrbits: 10,
    // 搜索输入防抖时间: 300ms
    searchDebounce: 300,
    // 位置更新间隔: 16ms (约60fps)
    updateInterval: 16
  }
};

/**
 * 地球半径(km)
 * 用于计算轨道高度
 */
export const EARTH_RADIUS = 6371;

/**
 * 轨道类型高度阈值(km)
 */
export const ORBIT_ALTITUDE_THRESHOLDS = {
  /** LEO上限 */
  LEO_MAX: 2000,
  /** MEO上限 */
  MEO_MAX: 35786,
  /** GEO标准高度(±100km容差) */
  GEO_ALTITUDE: 35786,
  GEO_TOLERANCE: 100
};

/**
 * 根据轨道高度判断轨道类型
 * @param altitude 轨道高度(km)
 * @param eccentricity 轨道偏心率
 * @returns 轨道类型
 */
export function getOrbitType(altitude: number, eccentricity: number): OrbitType {
  // 高椭圆轨道判断(偏心率 > 0.25)
  if (eccentricity > 0.25) {
    return OrbitType.HEO;
  }

  // 地球同步轨道判断(高度在GEO标准高度±容差范围内)
  if (Math.abs(altitude - ORBIT_ALTITUDE_THRESHOLDS.GEO_ALTITUDE) < ORBIT_ALTITUDE_THRESHOLDS.GEO_TOLERANCE) {
    return OrbitType.GEO;
  }

  // 低地球轨道
  if (altitude < ORBIT_ALTITUDE_THRESHOLDS.LEO_MAX) {
    return OrbitType.LEO;
  }

  // 中地球轨道
  if (altitude < ORBIT_ALTITUDE_THRESHOLDS.MEO_MAX) {
    return OrbitType.MEO;
  }

  // 默认为高椭圆轨道
  return OrbitType.HEO;
}
