/**
 * OrbitalInterpolator.ts - 基于轨道动力学的卫星位置插值器
 * 
 * 功能：
 * - 在两次 SGP4 计算之间使用轨道动力学插值
 * - 基于开普勒轨道参数计算真实的轨道弧线
 * - 比简单的线性插值更符合物理规律
 * - 避免"瞬移"感，提供丝滑的运动效果
 * 
 * 原理：
 * - 使用两次SGP4计算结果推导轨道参数
 * - 在插值时刻使用开普勒方程计算真实位置
 * - 结合Slerp作为fallback，确保稳定性
 */

import { Vector3 } from 'three';

/**
 * 轨道插值状态
 */
export interface OrbitalInterpolationState {
  /** 卫星 NORAD ID */
  noradId: number;
  /** 起始位置 */
  startPosition: Vector3;
  /** 起始速度 */
  startVelocity: Vector3;
  /** 目标位置 */
  endPosition: Vector3;
  /** 目标速度 */
  endVelocity: Vector3;
  /** 起始时间戳（毫秒） */
  startTime: number;
  /** 目标时间戳（毫秒） */
  endTime: number;
  /** 轨道参数（缓存） */
  orbitalParams?: OrbitalParameters;
}

/**
 * 轨道参数
 */
interface OrbitalParameters {
  /** 半长轴 (AU) */
  semiMajorAxis: number;
  /** 偏心率 */
  eccentricity: number;
  /** 轨道周期 (秒) */
  period: number;
  /** 平近点角在起始时刻 (弧度) */
  meanAnomalyStart: number;
  /** 平均角速度 (弧度/秒) */
  meanMotion: number;
  /** 轨道法向量 */
  normal: Vector3;
  /** 近地点方向 */
  periapsisDirection: Vector3;
}

/**
 * OrbitalInterpolator - 基于轨道动力学的插值器
 * 
 * 使用开普勒轨道方程在两次SGP4计算之间插值，
 * 提供更符合物理规律的卫星运动。
 */
export class OrbitalInterpolator {
  private states: Map<number, OrbitalInterpolationState>;

  private readonly MU = 1.327e20 / (1.496e11 ** 3);

  private enableOrbitalDynamics: boolean;

  private scratchV = new Vector3();
  private scratchV2 = new Vector3();
  private scratchV3 = new Vector3();
  private scratchV4 = new Vector3();
  private reusablePositions = new Map<number, Vector3>();

  constructor(enableOrbitalDynamics: boolean = true) {
    this.states = new Map();
    this.enableOrbitalDynamics = enableOrbitalDynamics;
  }
  
  /**
   * 设置新的目标位置和速度
   * 
   * @param noradId - 卫星 NORAD ID
   * @param newPosition - 新的目标位置
   * @param newVelocity - 新的目标速度
   * @param timestamp - 计算时间戳（毫秒）
   */
  setTarget(
    noradId: number,
    newPosition: Vector3,
    newVelocity: Vector3,
    timestamp: number
  ): void {
    const existingState = this.states.get(noradId);
    const currentTime = Date.now();

    if (existingState) {
      const currentPosition = this.getInterpolatedPosition(noradId, currentTime);

      const dt = (currentTime - existingState.startTime) / 1000;
      const currentVelocity = dt > 0
        ? this.scratchV.set(
            (currentPosition.x - existingState.startPosition.x) / dt,
            (currentPosition.y - existingState.startPosition.y) / dt,
            (currentPosition.z - existingState.startPosition.z) / dt
          )
        : existingState.startVelocity;

      const startVel = dt > 0 ? currentVelocity.clone() : existingState.startVelocity.clone();

      const newState: OrbitalInterpolationState = {
        noradId,
        startPosition: currentPosition.clone(),
        startVelocity: startVel,
        endPosition: newPosition.clone(),
        endVelocity: newVelocity.clone(),
        startTime: currentTime,
        endTime: timestamp,
      };

      if (this.enableOrbitalDynamics) {
        newState.orbitalParams = this.calculateOrbitalParameters(
          currentPosition,
          startVel
        );
      }

      this.states.set(noradId, newState);
    } else {
      const newState: OrbitalInterpolationState = {
        noradId,
        startPosition: newPosition.clone(),
        startVelocity: newVelocity.clone(),
        endPosition: newPosition.clone(),
        endVelocity: newVelocity.clone(),
        startTime: currentTime,
        endTime: timestamp,
      };

      if (this.enableOrbitalDynamics) {
        newState.orbitalParams = this.calculateOrbitalParameters(
          newPosition,
          newVelocity
        );
      }

      this.states.set(noradId, newState);
    }
  }
  
  /**
   * 计算轨道参数
   * 
   * 基于位置和速度向量计算开普勒轨道参数
   */
  private calculateOrbitalParameters(
    position: Vector3,
    velocity: Vector3
  ): OrbitalParameters | undefined {
    try {
      const r = position.length();
      const v = velocity.length();
      
      // 避免除零
      if (r < 1e-10 || v < 1e-10) {
        return undefined;
      }
      
      // 计算轨道角动量向量
      const h = new Vector3().crossVectors(position, velocity);
      const hMag = h.length();
      
      if (hMag < 1e-10) {
        return undefined;
      }
      
      // 轨道法向量
      const normal = h.clone().normalize();
      
      // 计算偏心率向量
      const eVec = new Vector3();
      const vCrossH = new Vector3().crossVectors(velocity, h);
      eVec.copy(vCrossH).divideScalar(this.MU);
      eVec.sub(position.clone().normalize());
      
      const eccentricity = eVec.length();
      
      // 计算半长轴
      const energy = (v * v) / 2 - this.MU / r;
      const semiMajorAxis = -this.MU / (2 * energy);
      
      // 避免无效的轨道参数
      if (semiMajorAxis <= 0 || eccentricity >= 1) {
        return undefined;
      }
      
      // 计算轨道周期
      const period = 2 * Math.PI * Math.sqrt((semiMajorAxis ** 3) / this.MU);
      
      // 平均角速度
      const meanMotion = 2 * Math.PI / period;
      
      // 近地点方向
      const periapsisDirection = eccentricity > 1e-6
        ? eVec.clone().normalize()
        : new Vector3(1, 0, 0); // 圆轨道时使用任意方向
      
      // 计算当前平近点角
      // 使用真近点角和偏近点角的关系
      const cosNu = position.clone().normalize().dot(periapsisDirection);
      const sinNu = position.clone().cross(periapsisDirection).dot(normal);
      const nu = Math.atan2(sinNu, cosNu); // 真近点角
      
      // 真近点角 → 偏近点角
      const E = 2 * Math.atan(
        Math.sqrt((1 - eccentricity) / (1 + eccentricity)) * Math.tan(nu / 2)
      );
      
      // 偏近点角 → 平近点角
      const meanAnomalyStart = E - eccentricity * Math.sin(E);
      
      return {
        semiMajorAxis,
        eccentricity,
        period,
        meanAnomalyStart,
        meanMotion,
        normal,
        periapsisDirection
      };
    } catch (error) {
      console.warn('[OrbitalInterpolator] 轨道参数计算失败:', error);
      return undefined;
    }
  }
  
  /**
   * 使用开普勒方程计算插值位置
   */
  private calculateOrbitalPosition(
    state: OrbitalInterpolationState,
    elapsedTime: number
  ): Vector3 | null {
    const params = state.orbitalParams;
    if (!params) return null;

    try {
      const M = params.meanAnomalyStart + params.meanMotion * elapsedTime;

      let E = M;
      for (let i = 0; i < 10; i++) {
        const dE = (E - params.eccentricity * Math.sin(E) - M) /
                   (1 - params.eccentricity * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 1e-8) break;
      }

      const nu = 2 * Math.atan(
        Math.sqrt((1 + params.eccentricity) / (1 - params.eccentricity)) *
        Math.tan(E / 2)
      );

      const r = params.semiMajorAxis * (1 - params.eccentricity * Math.cos(E));

      this.scratchV.copy(params.periapsisDirection);
      this.scratchV2.crossVectors(params.normal, this.scratchV).normalize();

      this.scratchV3.copy(this.scratchV).multiplyScalar(r * Math.cos(nu));
      this.scratchV3.addScaledVector(this.scratchV2, r * Math.sin(nu));

      return this.scratchV3.clone();
    } catch (error) {
      console.warn('[OrbitalInterpolator] 轨道位置计算失败:', error);
      return null;
    }
  }
  
  /**
   * 球面线性插值 (Slerp) - 作为fallback
   */
  private slerp(start: Vector3, end: Vector3, t: number): Vector3 {
    if (t <= 0) return start.clone();
    if (t >= 1) return end.clone();

    const startLen = start.length();
    const endLen = end.length();

    if (startLen === 0 || endLen === 0) {
      this.scratchV.set(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      );
      return this.scratchV.clone();
    }

    this.scratchV.copy(start).normalize();
    this.scratchV2.copy(end).normalize();

    let dot = this.scratchV.dot(this.scratchV2);
    dot = Math.max(-1, Math.min(1, dot));

    const theta = Math.acos(dot);

    if (Math.abs(theta) < 0.001) {
      this.scratchV3.set(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      );
      return this.scratchV3.clone();
    }

    const sinTheta = Math.sin(theta);
    const w1 = Math.sin((1 - t) * theta) / sinTheta;
    const w2 = Math.sin(t * theta) / sinTheta;

    this.scratchV3.set(
      this.scratchV.x * w1 + this.scratchV2.x * w2,
      this.scratchV.y * w1 + this.scratchV2.y * w2,
      this.scratchV.z * w1 + this.scratchV2.z * w2
    );

    const radius = startLen + (endLen - startLen) * t;

    return this.scratchV3.multiplyScalar(radius).clone();
  }
  
  /**
   * 获取当前插值位置
   */
  getInterpolatedPosition(noradId: number, currentTime: number): Vector3 {
    const state = this.states.get(noradId);

    if (!state) {
      return new Vector3(0, 0, 0);
    }

    const duration = state.endTime - state.startTime;

    if (duration <= 0) {
      return state.endPosition.clone();
    }

    const elapsed = currentTime - state.startTime;
    let progress = elapsed / duration;
    progress = Math.max(0, Math.min(1, progress));

    if (this.enableOrbitalDynamics && state.orbitalParams) {
      const orbitalPosition = this.calculateOrbitalPosition(state, elapsed / 1000);

      if (orbitalPosition) {
        const blendFactor = progress * progress;
        this.scratchV.set(
          orbitalPosition.x * (1 - blendFactor) + state.endPosition.x * blendFactor,
          orbitalPosition.y * (1 - blendFactor) + state.endPosition.y * blendFactor,
          orbitalPosition.z * (1 - blendFactor) + state.endPosition.z * blendFactor
        );
        return this.scratchV.clone();
      }
    }

    return this.slerp(state.startPosition, state.endPosition, progress);
  }
  
  /**
   * 批量获取所有卫星的插值位置
   */
  getInterpolatedPositions(currentTime: number): Map<number, Vector3> {
    this.reusablePositions.clear();
    this.states.forEach((_state, noradId) => {
      const position = this.getInterpolatedPosition(noradId, currentTime);
      this.reusablePositions.set(noradId, position);
    });
    return this.reusablePositions;
  }
  
  /**
   * 清除指定卫星的插值状态
   */
  clear(noradId: number): void {
    this.states.delete(noradId);
  }
  
  /**
   * 清除所有插值状态
   */
  clearAll(): void {
    this.states.clear();
  }
  
  /**
   * 获取插值状态数量
   */
  getStateCount(): number {
    return this.states.size;
  }
  
  /**
   * 启用/禁用轨道动力学插值
   */
  setEnableOrbitalDynamics(enable: boolean): void {
    this.enableOrbitalDynamics = enable;
  }
  
  /**
   * 获取轨道动力学插值状态
   */
  isOrbitalDynamicsEnabled(): boolean {
    return this.enableOrbitalDynamics;
  }
}
