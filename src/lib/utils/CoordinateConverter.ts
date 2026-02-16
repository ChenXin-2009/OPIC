/**
 * CoordinateConverter.ts - 天文坐标系统转换工具
 * 
 * 实现赤道坐标系、银道坐标系和超银道坐标系之间的转换
 * 以及红移到共动距离的转换
 */

import * as THREE from 'three';

/**
 * 坐标转换工具类
 * 所有方法都是静态方法，用于天文坐标系统之间的转换
 */
export class CoordinateConverter {
  // 北银极坐标（J2000.0）
  private static readonly NGP_RA = 192.859508;  // 度
  private static readonly NGP_DEC = 27.128336;  // 度
  private static readonly NGP_L = 122.932;  // 银道经度，度

  // 超银道坐标系原点（银道坐标）
  private static readonly SG_L0 = 137.37;  // 度
  private static readonly SG_B0 = 0.0;  // 度

  // 宇宙学参数
  private static readonly H0 = 70;  // 哈勃常数，km/s/Mpc
  private static readonly OMEGA_M = 0.3;  // 物质密度参数
  private static readonly OMEGA_L = 0.7;  // 暗能量密度参数
  private static readonly C = 299792.458;  // 光速，km/s

  /**
   * 将赤道坐标转换为银道坐标
   * @param ra - 赤经（度）
   * @param dec - 赤纬（度）
   * @returns 银道坐标 { l: 银经（度）, b: 银纬（度）}
   */
  static equatorialToGalactic(ra: number, dec: number): { l: number; b: number } {
    // 转换为弧度
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    const ngpRaRad = (this.NGP_RA * Math.PI) / 180;
    const ngpDecRad = (this.NGP_DEC * Math.PI) / 180;
    const ngpLRad = (this.NGP_L * Math.PI) / 180;

    // 计算银纬 b
    const sinB =
      Math.sin(decRad) * Math.sin(ngpDecRad) +
      Math.cos(decRad) * Math.cos(ngpDecRad) * Math.cos(raRad - ngpRaRad);
    const b = Math.asin(sinB);

    // 计算银经 l
    const y = Math.cos(decRad) * Math.sin(raRad - ngpRaRad);
    const x =
      Math.sin(decRad) * Math.cos(ngpDecRad) -
      Math.cos(decRad) * Math.sin(ngpDecRad) * Math.cos(raRad - ngpRaRad);
    let l = Math.atan2(y, x) + ngpLRad;

    // 归一化到 [0, 2π)
    while (l < 0) l += 2 * Math.PI;
    while (l >= 2 * Math.PI) l -= 2 * Math.PI;

    // 转换为度
    return {
      l: (l * 180) / Math.PI,
      b: (b * 180) / Math.PI,
    };
  }

  /**
   * 将银道坐标转换为超银道坐标（笛卡尔坐标）
   * @param l - 银经（度）
   * @param b - 银纬（度）
   * @param distance - 距离（Mpc）
   * @returns 超银道笛卡尔坐标（Mpc）
   */
  static galacticToSupergalactic(
    l: number,
    b: number,
    distance: number
  ): THREE.Vector3 {
    // 转换为弧度
    const lRad = (l * Math.PI) / 180;
    const bRad = (b * Math.PI) / 180;
    const l0Rad = (this.SG_L0 * Math.PI) / 180;
    const b0Rad = (this.SG_B0 * Math.PI) / 180;

    // 先转换为银道笛卡尔坐标
    const xGal = distance * Math.cos(bRad) * Math.cos(lRad);
    const yGal = distance * Math.cos(bRad) * Math.sin(lRad);
    const zGal = distance * Math.sin(bRad);

    // 旋转矩阵：从银道坐标系到超银道坐标系
    // 这是一个简化的转换，实际转换需要完整的旋转矩阵
    const phi = l0Rad;
    const theta = Math.PI / 2 - b0Rad;

    // 应用旋转
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // 绕 Z 轴旋转 phi
    const x1 = xGal * cosPhi - yGal * sinPhi;
    const y1 = xGal * sinPhi + yGal * cosPhi;
    const z1 = zGal;

    // 绕 Y 轴旋转 theta
    const xSG = x1 * cosTheta + z1 * sinTheta;
    const ySG = y1;
    const zSG = -x1 * sinTheta + z1 * cosTheta;

    return new THREE.Vector3(xSG, ySG, zSG);
  }

  /**
   * 将赤道坐标直接转换为超银道坐标
   * @param ra - 赤经（度）
   * @param dec - 赤纬（度）
   * @param distance - 距离（Mpc）
   * @returns 超银道笛卡尔坐标（Mpc）
   */
  static equatorialToSupergalactic(
    ra: number,
    dec: number,
    distance: number
  ): THREE.Vector3 {
    // 先转换为银道坐标
    const galactic = this.equatorialToGalactic(ra, dec);
    // 再转换为超银道坐标
    return this.galacticToSupergalactic(galactic.l, galactic.b, distance);
  }

  /**
   * 将红移转换为共动距离
   * @param z - 红移值
   * @returns 共动距离（Mpc）
   */
  static redshiftToComovingDistance(z: number): number {
    // 对于小红移，使用近似公式
    if (z < 0.1) {
      return (this.C * z) / this.H0;
    }

    // 对于大红移，使用数值积分
    // 积分 dz / E(z)，其中 E(z) = sqrt(Omega_M * (1+z)^3 + Omega_L)
    const steps = 100;
    const dz = z / steps;
    let sum = 0;

    for (let i = 0; i < steps; i++) {
      const z1 = i * dz;
      const z2 = (i + 1) * dz;

      // 使用梯形法则
      const E1 = Math.sqrt(
        this.OMEGA_M * Math.pow(1 + z1, 3) + this.OMEGA_L
      );
      const E2 = Math.sqrt(
        this.OMEGA_M * Math.pow(1 + z2, 3) + this.OMEGA_L
      );

      sum += (dz / 2) * (1 / E1 + 1 / E2);
    }

    // 共动距离 = (c/H0) * 积分值
    return (this.C / this.H0) * sum;
  }

  /**
   * 将共动距离转换为红移（近似）
   * @param distance - 共动距离（Mpc）
   * @returns 红移值
   */
  static comovingDistanceToRedshift(distance: number): number {
    // 使用迭代方法求解
    let z = distance * this.H0 / this.C;  // 初始猜测
    const tolerance = 1e-6;
    const maxIterations = 20;

    for (let i = 0; i < maxIterations; i++) {
      const d = this.redshiftToComovingDistance(z);
      const error = d - distance;

      if (Math.abs(error) < tolerance) {
        break;
      }

      // 使用数值导数进行牛顿迭代
      const dz = 0.001;
      const d2 = this.redshiftToComovingDistance(z + dz);
      const derivative = (d2 - d) / dz;

      z -= error / derivative;
    }

    return Math.max(0, z);
  }

  /**
   * 将笛卡尔坐标转换为球坐标
   * @param x - X 坐标
   * @param y - Y 坐标
   * @param z - Z 坐标
   * @returns 球坐标 { r: 距离, theta: 极角（弧度）, phi: 方位角（弧度）}
   */
  static cartesianToSpherical(
    x: number,
    y: number,
    z: number
  ): { r: number; theta: number; phi: number } {
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.acos(z / r);
    const phi = Math.atan2(y, x);

    return { r, theta, phi };
  }

  /**
   * 将球坐标转换为笛卡尔坐标
   * @param r - 距离
   * @param theta - 极角（弧度）
   * @param phi - 方位角（弧度）
   * @returns THREE.Vector3
   */
  static sphericalToCartesian(
    r: number,
    theta: number,
    phi: number
  ): THREE.Vector3 {
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    return new THREE.Vector3(x, y, z);
  }
}
