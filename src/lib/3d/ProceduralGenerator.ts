/**
 * ProceduralGenerator.ts - 程序化生成器
 * 
 * 基于真实数据程序化生成额外的星系以增强视觉效果
 */

import * as THREE from 'three';

/**
 * 星系团元数据接口
 */
export interface ClusterMetadata {
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
  memberCount: number;
  richness: number;
}

/**
 * 简单星系接口
 */
export interface SimpleGalaxy {
  x: number;
  y: number;
  z: number;
  brightness: number;
}

/**
 * 程序化生成器
 * 使用 NFW 分布生成星系
 */
export class ProceduralGenerator {
  private worker: Worker | null = null;

  constructor() {
    // 检查 Worker 支持
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker('/workers/galaxy-generator.js');
      } catch (error) {
        console.warn('Failed to create Worker:', error);
        this.worker = null;
      }
    }
  }

  /**
   * 生成星系（基于真实数据增强）
   * 
   * @param clusterMetadata - 星系团元数据
   * @param realGalaxies - 真实星系数据
   * @returns 生成的星系数组
   */
  async generateGalaxies(
    clusterMetadata: ClusterMetadata,
    realGalaxies: SimpleGalaxy[]
  ): Promise<SimpleGalaxy[]> {
    if (this.worker) {
      // 使用 Worker 进行生成
      return this.generateWithWorker(clusterMetadata, realGalaxies);
    } else {
      // 在主线程生成
      return this.generateInMainThread(clusterMetadata, realGalaxies);
    }
  }

  /**
   * 使用 Worker 生成星系
   */
  private generateWithWorker(
    clusterMetadata: ClusterMetadata,
    realGalaxies: SimpleGalaxy[]
  ): Promise<SimpleGalaxy[]> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'));
      }, 5000);

      this.worker.onmessage = (e) => {
        clearTimeout(timeout);
        if (e.data.type === 'result') {
          resolve(e.data.galaxies);
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.message));
        }
      };

      this.worker.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.worker.postMessage({
        type: 'generate',
        clusterMetadata,
        realGalaxies,
      });
    });
  }

  /**
   * 在主线程生成星系
   */
  private generateInMainThread(
    clusterMetadata: ClusterMetadata,
    realGalaxies: SimpleGalaxy[]
  ): Promise<SimpleGalaxy[]> {
    return new Promise((resolve) => {
      const center = new THREE.Vector3(
        clusterMetadata.centerX,
        clusterMetadata.centerY,
        clusterMetadata.centerZ
      );

      const targetCount = clusterMetadata.memberCount;
      const needGenerate = Math.max(0, targetCount - realGalaxies.length);

      const generated = ProceduralGenerator.nfwDistribution(
        center,
        clusterMetadata.radius,
        needGenerate
      );

      // 过滤掉与真实星系太近的点
      const minDistance = clusterMetadata.radius * 0.05;
      const filtered = generated.filter((pos) => {
        return !realGalaxies.some((real) => {
          const dx = pos.x - real.x;
          const dy = pos.y - real.y;
          const dz = pos.z - real.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          return dist < minDistance;
        });
      });

      // 转换为 SimpleGalaxy 格式
      const galaxies: SimpleGalaxy[] = filtered.map((pos) => ({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        brightness: 0.5 + Math.random() * 0.5,
      }));

      resolve(galaxies);
    });
  }

  /**
   * NFW 分布（Navarro-Frenk-White profile）
   * 用于生成符合暗物质晕分布的星系位置
   * 
   * @param center - 中心位置
   * @param radius - 半径
   * @param count - 生成数量
   * @returns 位置数组
   */
  static nfwDistribution(
    center: THREE.Vector3,
    radius: number,
    count: number
  ): THREE.Vector3[] {
    const galaxies: THREE.Vector3[] = [];
    const rs = radius * 0.2; // 特征半径

    for (let i = 0; i < count; i++) {
      // 使用拒绝采样生成 NFW 分布的径向距离
      let r: number;
      let attempts = 0;
      const maxAttempts = 100;

      do {
        r = Math.random() * radius;
        const probability = ProceduralGenerator.nfwProbability(r, rs);
        attempts++;
        
        if (attempts > maxAttempts) {
          // 如果尝试次数过多，使用均匀分布
          r = Math.random() * radius;
          break;
        }
        
        if (Math.random() < probability) {
          break;
        }
      } while (true);

      // 随机方向（球坐标）
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      // 转换为笛卡尔坐标
      const x = center.x + r * Math.sin(phi) * Math.cos(theta);
      const y = center.y + r * Math.sin(phi) * Math.sin(theta);
      const z = center.z + r * Math.cos(phi);

      galaxies.push(new THREE.Vector3(x, y, z));
    }

    return galaxies;
  }

  /**
   * NFW 概率密度函数
   * 
   * @param r - 径向距离
   * @param rs - 特征半径
   * @returns 概率密度（归一化）
   */
  static nfwProbability(r: number, rs: number): number {
    if (r <= 0) return 0;
    
    const x = r / rs;
    // NFW profile: ρ(r) ∝ 1 / (x * (1 + x)²)
    const density = 1 / (x * Math.pow(1 + x, 2));
    
    // 归一化到 [0, 1]
    const maxDensity = 1 / (0.01 * Math.pow(1.01, 2)); // 在 x=0.01 处的最大值
    return Math.min(1, density / maxDensity);
  }

  /**
   * 生成均匀分布的星系（用于测试）
   * 
   * @param center - 中心位置
   * @param radius - 半径
   * @param count - 生成数量
   * @returns 星系数组
   */
  static uniformDistribution(
    center: THREE.Vector3,
    radius: number,
    count: number
  ): SimpleGalaxy[] {
    const galaxies: SimpleGalaxy[] = [];

    for (let i = 0; i < count; i++) {
      // 随机径向距离（立方根分布以保持体积均匀）
      const r = radius * Math.cbrt(Math.random());

      // 随机方向
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      galaxies.push({
        x: center.x + r * Math.sin(phi) * Math.cos(theta),
        y: center.y + r * Math.sin(phi) * Math.sin(theta),
        z: center.z + r * Math.cos(phi),
        brightness: 0.5 + Math.random() * 0.5,
      });
    }

    return galaxies;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
