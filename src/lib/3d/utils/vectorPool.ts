/**
 * Vector3Pool.ts - Vector3 对象池
 * 
 * 功能：
 * - 复用 Vector3 对象，减少垃圾回收压力
 * - 优化每帧创建大量临时向量的性能
 */

import * as THREE from 'three';

/**
 * Vector3 对象池
 */
export class Vector3Pool {
  private pool: THREE.Vector3[] = [];
  private readonly maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  /**
   * 从池中获取 Vector3 对象
   */
  acquire(): THREE.Vector3 {
    return this.pool.pop() || new THREE.Vector3();
  }
  
  /**
   * 将 Vector3 对象释放回池中
   */
  release(v: THREE.Vector3): void {
    if (this.pool.length < this.maxSize) {
      v.set(0, 0, 0);
      this.pool.push(v);
    }
  }
  
  /**
   * 清空池中所有对象
   */
  clear(): void {
    this.pool = [];
  }
  
  /**
   * 获取池中当前对象数量
   */
  size(): number {
    return this.pool.length;
  }
}

/**
 * 全局 Vector3 对象池实例
 */
export const vectorPool = new Vector3Pool(100);
