/**
 * 卫星可视化系统的核心类型定义
 * 
 * 本文件定义了卫星轨道计算、渲染和状态管理所需的所有TypeScript类型和接口
 */

import { Vector3 } from 'three';

// ============ 枚举类型 ============

/**
 * 轨道类型分类
 * 基于轨道高度划分
 */
export enum OrbitType {
  /** 低地球轨道 (<2000km) */
  LEO = 'LEO',
  /** 中地球轨道 (2000-35786km) */
  MEO = 'MEO',
  /** 地球同步轨道 (~35786km) */
  GEO = 'GEO',
  /** 高椭圆轨道 */
  HEO = 'HEO'
}

/**
 * 卫星类别
 * 对应Celestrak API的不同数据集
 */
export enum SatelliteCategory {
  /** 活跃卫星 */
  ACTIVE = 'active',
  /** 国际空间站 */
  ISS = 'stations',
  /** GPS卫星 */
  GPS = 'gps-ops',
  /** 通信卫星(地球同步轨道) */
  COMMUNICATION = 'geo',
  /** 气象卫星 */
  WEATHER = 'weather',
  /** 科学卫星 */
  SCIENCE = 'science',
  /** 其他类别 */
  OTHER = 'other'
}

// ============ 核心数据模型 ============

/**
 * TLE(Two-Line Element)原始数据
 * 描述卫星轨道的标准格式
 */
export interface TLEData {
  /** 卫星名称 */
  name: string;
  /** NORAD卫星编目号 */
  noradId: number;
  /** TLE第一行数据 */
  line1: string;
  /** TLE第二行数据 */
  line2: string;
  /** 卫星类别 */
  category: SatelliteCategory;
  /** 历元时间(TLE数据的参考时间) */
  epoch: Date;
}

/**
 * 轨道参数
 * 从TLE数据解析得到的轨道要素
 */
export interface OrbitalElements {
  /** 轨道倾角(度) */
  inclination: number;
  /** 轨道偏心率 */
  eccentricity: number;
  /** 平均运动(圈/天) */
  meanMotion: number;
  /** 半长轴(km) */
  semiMajorAxis: number;
  /** 轨道周期(分钟) */
  period: number;
  /** 远地点高度(km) */
  apogee: number;
  /** 近地点高度(km) */
  perigee: number;
}

/**
 * 卫星实时状态
 * 包含位置、速度和轨道信息
 */
export interface SatelliteState {
  /** NORAD卫星编目号 */
  noradId: number;
  /** 卫星名称 */
  name: string;
  /** Three.js坐标系中的位置(单位:1000km) */
  position: Vector3;
  /** 速度向量(km/s) */
  velocity: Vector3;
  /** 轨道高度(km) */
  altitude: number;
  /** 轨道类型 */
  orbitType: OrbitType;
  /** 卫星类别 */
  category: SatelliteCategory;
  /** 轨道参数 */
  orbitalElements: OrbitalElements;
  /** 最后更新时间戳 */
  lastUpdate: number;
}

// ============ API模型 ============

/**
 * 卫星API响应格式
 */
export interface SatelliteAPIResponse {
  /** 卫星TLE数据数组 */
  satellites: TLEData[];
  /** 卫星数量 */
  count: number;
  /** 请求的类别 */
  category: string;
  /** 数据最后更新时间(ISO 8601格式) */
  lastUpdate: string;
  /** 缓存过期时间(ISO 8601格式) */
  cacheExpiry: string;
}

/**
 * API错误响应
 */
export interface APIError {
  /** 错误类型 */
  error: string;
  /** 错误消息 */
  message: string;
  /** HTTP状态码 */
  statusCode: number;
}

// ============ 计算模型 ============

/**
 * ECI(地心惯性)坐标系位置
 * 单位:km
 */
export interface ECIPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * ECI坐标系速度
 * 单位:km/s
 */
export interface ECIVelocity {
  x: number;
  y: number;
  z: number;
}

/**
 * SGP4传播计算结果
 */
export interface PropagationResult {
  /** ECI坐标系位置 */
  position: ECIPosition;
  /** ECI坐标系速度 */
  velocity: ECIVelocity;
  /** 错误信息(如果计算失败) */
  error?: string;
}

// ============ 渲染模型 ============

/**
 * 渲染配置
 */
export interface RenderConfig {
  /** 最大卫星数量 */
  maxSatellites: number;
  /** 点大小 */
  pointSize: number;
  /** 透明度 */
  opacity: number;
  /** LOD距离阈值 */
  lodDistances: number[];
  /** 轨道类型颜色映射 */
  colors: Record<OrbitType, string>;
}

/**
 * 轨道轨迹数据
 */
export interface OrbitTrajectory {
  /** 卫星NORAD ID */
  noradId: number;
  /** 轨道路径点 */
  points: Vector3[];
  /** 轨道颜色 */
  color: string;
  /** 线宽 */
  lineWidth: number;
}

// ============ 配置模型 ============

/**
 * 卫星系统完整配置
 */
export interface SatelliteConfig {
  /** API配置 */
  api: {
    /** API端点 */
    endpoint: string;
    /** 缓存时间(毫秒) */
    cacheTime: number;
    /** 重试次数 */
    retryAttempts: number;
    /** 请求超时(毫秒) */
    timeout: number;
  };
  /** 渲染配置 */
  rendering: RenderConfig;
  /** 计算配置 */
  computation: {
    /** 每批最大计算数量 */
    maxBatchSize: number;
    /** Worker数量 */
    workerCount: number;
    /** 缓存大小 */
    cacheSize: number;
  };
  /** UI配置 */
  ui: {
    /** 最大轨道显示数量 */
    maxOrbits: number;
    /** 搜索防抖时间(毫秒) */
    searchDebounce: number;
    /** 更新间隔(毫秒) */
    updateInterval: number;
  };
}

// ============ Web Worker消息接口 ============

/**
 * Worker请求消息
 */
export interface WorkerMessage {
  /** 消息类型 */
  type: 'calculate' | 'orbit';
  /** 消息负载 */
  payload: {
    /** TLE数据数组 */
    tles: TLEData[];
    /** Julian日期 */
    julianDate: number;
    /** 轨道计算步数(可选) */
    steps?: number;
  };
}

/**
 * Worker响应消息
 */
export interface WorkerResponse {
  /** 响应类型 */
  type: 'result' | 'error';
  /** 响应负载 */
  payload: {
    /** 计算结果位置数组 */
    positions: PropagationResult[];
    /** 错误信息数组(可选) */
    errors?: string[];
  };
}
