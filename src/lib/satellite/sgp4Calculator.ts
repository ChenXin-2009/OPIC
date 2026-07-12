/**
 * SGP4Calculator - 卫星轨道计算引擎
 * 
 * 使用Web Worker执行SGP4算法计算卫星位置,避免阻塞主线程
 * 实现批量计算、轨道轨迹生成和坐标系转换功能
 * 
 * 坐标系转换（参见 src/lib/coordinates/README.md RenderWorld 约定）：
 * - ECI/TEME-like 坐标系：地心赤道惯性系，X 指向春分点，Z 指向北极，单位 km
 * - OPIC RenderWorld：J2000 mean ecliptic，X 春分点 · Y 黄道面内 90° · Z 黄道北极，单位 AU
 * - 内置了 (x_ECI, z_ECI, -y_ECI) 轴重映射作为过渡方案，
 *   计划迁移到 frames/teme.ts（见 COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §4 阶段 4）
 */

import { Vector3 } from 'three';
import {
  OrbitalElements,
  PropagationResult,
  SatelliteState,
  TLEData,
  WorkerMessage
} from '../types/satellite';
import { EARTH_RADIUS, getOrbitType, satelliteConfig } from '../config/satelliteConfig';

/**
 * 卫星记录缓存项
 */
interface SatelliteRecord {
  tle: TLEData;
  lastCalculated: number;
  cachedState?: SatelliteState;
}

  /**
   * SGP4计算器类
   * 
   * 负责卫星位置计算、轨道轨迹生成和坐标系转换。
   * 内部使用 Web Worker 执行 SGP4 算法，避免阻塞主线程。
   * 支持批量计算、TLECache 缓存以及 ECI→Three.js 坐标系转换。
   *
   * @example
   * ```ts
   * const calc = new SGP4Calculator();
   * calc.updateTLECache(tles);
   * const states = await calc.calculatePositions([25544]);
   * ```
   */
  export class SGP4Calculator {
  private worker: Worker | null = null;
  private tleCache: Map<number, SatelliteRecord> = new Map();
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = new Map();
  private requestIdCounter = 0;
  private isInitialized = false;

  /**
   * 构造函数
   * 初始化Web Worker
   */
  constructor() {
    this.initWorker();
  }

  /**
   * 初始化Web Worker（优先使用 WASM 版，回退 JS 版）
   */
  private initWorker(): void {
    try {
      this.worker = new Worker('/workers/sgp4.worker.js');
      
      // 监听Worker消息
      this.worker.onmessage = (e: MessageEvent) => {
        this.handleWorkerMessage(e.data);
      };

      // 监听Worker错误
      this.worker.onerror = (error: ErrorEvent) => {
        console.error('SGP4 Worker错误:', error);
        this.rejectAllPending(new Error('Worker执行错误'));
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('无法初始化SGP4 Worker:', error);
      this.isInitialized = false;
    }
  }

  /**
   * 处理Worker响应消息
   */
  private handleWorkerMessage(response: any): void {
    // 处理Worker就绪消息
    if (response.type === 'ready') {
      console.log('SGP4 Worker已就绪');
      return;
    }

    // 按 requestId 精确匹配，避免串扰
    const requestId = response.requestId;
    if (requestId !== undefined) {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        if (response.type === 'result') {
          pending.resolve(response.payload);
        } else if (response.type === 'error') {
          pending.reject(new Error(response.payload.errors?.join(', ') || '计算失败'));
        }
        this.pendingRequests.delete(requestId);
      }
      return;
    }

    // 兼容旧版 Worker（无 requestId）：resolve 最早的一个请求
    const firstEntry = this.pendingRequests.entries().next().value;
    if (firstEntry) {
      const [id, pending] = firstEntry;
      if (response.type === 'result') {
        pending.resolve(response.payload);
      } else if (response.type === 'error') {
        pending.reject(new Error(response.payload.errors?.join(', ') || '计算失败'));
      }
      this.pendingRequests.delete(id);
    }
  }

  /**
   * 拒绝所有待处理的请求
   */
  private rejectAllPending(error: Error): void {
    this.pendingRequests.forEach((pending) => {
      pending.reject(error);
    });
    this.pendingRequests.clear();
  }

  /**
   * 发送消息到Worker并等待响应
   */
  private sendToWorker(message: WorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.isInitialized) {
        reject(new Error('Worker未初始化'));
        return;
      }

      const requestId = this.requestIdCounter++;
      this.pendingRequests.set(requestId, { resolve, reject });

      try {
        // 把 requestId 带进消息，Worker 回传时用于精确匹配
        this.worker.postMessage({ ...message, requestId });
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * 将JavaScript Date转换为Julian日期
   */
  private dateToJulianDate(date: Date | number): number {
    const timestamp = typeof date === 'number' ? date : date.getTime();
    return timestamp / 86400000 + 2440587.5;
  }

  /**
   * 将ECI坐标转换为Three.js坐标系
   * ECI: (x, y, z) km, Z轴指向北极
   * Three.js: (x, y, z) 单位AU, Y轴向上
   * 转换: (x_Three, y_Three, z_Three) = (x_ECI, z_ECI, -y_ECI) / AU_TO_KM
   */
  private eciToThreeJS(eciPos: { x: number; y: number; z: number }): Vector3 {
    const AU_TO_KM = 149597870.7; // 1 AU = 149,597,870.7 km
    return new Vector3(
      eciPos.x / AU_TO_KM,
      eciPos.z / AU_TO_KM,
      -eciPos.y / AU_TO_KM
    );
  }

  /**
   * 计算轨道参数
   */
  private calculateOrbitalElements(
    _position: Vector3,
    _velocity: Vector3,
    tle: TLEData
  ): OrbitalElements {
    // 从TLE第二行解析轨道参数
    const line2Parts = tle.line2.trim().split(/\s+/);
    
    // 倾角(度)
    const inclination = parseFloat(line2Parts[2]);
    
    // 偏心率(前面补0)
    const eccentricityStr = '0.' + line2Parts[4];
    const eccentricity = parseFloat(eccentricityStr);
    
    // 平均运动(圈/天)
    const meanMotion = parseFloat(line2Parts[7]);
    
    // 计算轨道周期(分钟)
    const period = 1440 / meanMotion; // 1440分钟 = 1天
    
    // 计算半长轴(km)
    // 使用开普勒第三定律: T^2 = (4π^2 / μ) * a^3
    // μ = 398600.4418 km^3/s^2 (地球引力常数)
    const mu = 398600.4418;
    const periodSeconds = period * 60;
    const semiMajorAxis = ((mu * periodSeconds * periodSeconds) / (4 * Math.PI * Math.PI)) ** (1/3);
    
    // 计算远地点和近地点高度(km)
    const apogee = semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS;
    const perigee = semiMajorAxis * (1 - eccentricity) - EARTH_RADIUS;
    
    return {
      inclination,
      eccentricity,
      meanMotion,
      semiMajorAxis,
      period,
      apogee,
      perigee
    };
  }

  /**
   * 更新 TLE 缓存
   *
   * 将 TLE 数据存入内部缓存，供后续 calculatePositions / calculateOrbit 使用。
   *
   * @param tles - TLE 数据数组，每项包含卫星的轨道根数和元信息
   */
  updateTLECache(tles: TLEData[]): void {
    tles.forEach(tle => {
      this.tleCache.set(tle.noradId, {
        tle,
        lastCalculated: 0
      });
    });
  }

  /**
   * 批量计算卫星位置
   *
   * 按自适应批次大小向 Worker 分发计算任务，结果自动经过 ECI→Three.js 坐标转换，
   * 并附带轨道参数 (OrbitalElements) 和轨道类型分类。
   *
   * @param noradIds - 要计算的卫星 NORAD ID 数组
   * @param julianDate - 儒略日（可选，默认当前时间）
   * @returns 卫星状态 Map，key 为 NORAD ID，value 为 SatelliteState
   * @throws 当 Worker 未初始化时抛出错误
   */
  async calculatePositions(
    noradIds: number[],
    julianDate?: number
  ): Promise<Map<number, SatelliteState>> {
    const jd = julianDate || this.dateToJulianDate(Date.now());
    const results = new Map<number, SatelliteState>();

    // 自适应批次大小：卫星数量越多，批次越大，减少Worker通信开销
    let batchSize = satelliteConfig.computation.maxBatchSize;
    if (noradIds.length > 10000) {
      batchSize = 10000; // 超过1万颗卫星，使用1万的批次
    } else if (noradIds.length > 5000) {
      batchSize = 5000; // 超过5千颗卫星，使用5千的批次
    }
    
    for (let i = 0; i < noradIds.length; i += batchSize) {
      const batchIds = noradIds.slice(i, i + batchSize);
      const batchTLEs: TLEData[] = [];
      
      // 收集这批卫星的TLE数据
      for (const noradId of batchIds) {
        const record = this.tleCache.get(noradId);
        if (record) {
          batchTLEs.push(record.tle);
        }
      }

      if (batchTLEs.length === 0) {
        continue;
      }

      try {
        // 发送到Worker计算
        const response = await this.sendToWorker({
          type: 'calculate',
          payload: {
            tles: batchTLEs,
            julianDate: jd
          }
        });

        // 处理计算结果
        const positions: PropagationResult[] = response.positions || [];
        
        positions.forEach((result: any) => {
          if (!result.position || !result.velocity || result.error) {
            // 跳过计算失败的卫星
            return;
          }

          const record = this.tleCache.get(result.noradId);
          if (!record) return;

          // 转换坐标系
          const position = this.eciToThreeJS(result.position);
          const velocity = this.eciToThreeJS(result.velocity);

          // 计算轨道高度（position是AU单位，需要转换为km）
          const AU_TO_KM = 149597870.7;
          const altitude = position.length() * AU_TO_KM - EARTH_RADIUS;

          // 计算轨道参数
          const orbitalElements = this.calculateOrbitalElements(
            position,
            velocity,
            record.tle
          );

          // 确定轨道类型
          const orbitType = getOrbitType(altitude, orbitalElements.eccentricity);

          // 创建卫星状态
          const state: SatelliteState = {
            noradId: result.noradId,
            name: record.tle.name,
            position,
            velocity,
            altitude,
            orbitType,
            category: record.tle.category,
            orbitalElements,
            lastUpdate: Date.now()
          };

          // 更新缓存
          record.cachedState = state;
          record.lastCalculated = Date.now();

          results.set(result.noradId, state);
        });

        // 记录错误
        if (response.errors && response.errors.length > 0) {
          console.warn('SGP4计算警告:', response.errors);
        }

      } catch (error) {
        console.error('批量计算失败:', error);
      }
    }

    return results;
  }

  /**
   * 计算单颗卫星的轨道轨迹
   *
   * 生成指定卫星在给定时间段内的轨道轨迹点，结果已转换为 Three.js 坐标系。
   *
   * @param noradId - 卫星 NORAD ID
   * @param startTime - 起始时间（毫秒时间戳）
   * @param _duration - 持续时间（秒，当前未使用，预留参数）
   * @param steps - 计算步数（默认 100）
   * @returns 轨道轨迹点数组（Three.js Vector3，单位 AU）
   * @throws 当 Worker 未初始化时抛出错误
   */
  async calculateOrbit(
    noradId: number,
    startTime: number,
    _duration: number,
    steps: number = 100
  ): Promise<Vector3[]> {
    const record = this.tleCache.get(noradId);
    if (!record) {
      console.error(`未找到卫星 ${noradId} 的TLE数据`);
      return [];
    }

    const startJulianDate = this.dateToJulianDate(startTime);

    try {
      // 发送到Worker计算轨道
      const response = await this.sendToWorker({
        type: 'orbit',
        payload: {
          tles: [record.tle],
          julianDate: startJulianDate,
          steps
        }
      });

      // 转换坐标系
      const points: Vector3[] = [];
      const positions = response.positions || [];

      positions.forEach((pos: { x: number; y: number; z: number }) => {
        const point = this.eciToThreeJS(pos);
        points.push(point);
      });

      // 记录错误
      if (response.errors && response.errors.length > 0) {
        console.warn('轨道计算警告:', response.errors);
      }

      return points;

    } catch (error) {
      console.error('轨道计算失败:', error);
      return [];
    }
  }

  /**
   * 获取缓存的卫星状态
   *
   * @param noradId - 卫星 NORAD ID
   * @returns 缓存的卫星状态，若未缓存则返回 undefined
   */
  getCachedState(noradId: number): SatelliteState | undefined {
    return this.tleCache.get(noradId)?.cachedState;
  }

  /**
   * 清除 TLE 缓存
   *
   * 移除所有已缓存的 TLE 数据和卫星状态，下次计算时需重新提供 TLE。
   */
  clearCache(): void {
    this.tleCache.clear();
  }

  /**
   * 清理资源
   *
   * 终止 Web Worker、清空 TLE 缓存和待处理请求队列。
   * 方法调用后当前实例不应再被使用。
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.tleCache.clear();
    this.pendingRequests.clear();
    this.isInitialized = false;
  }
}
