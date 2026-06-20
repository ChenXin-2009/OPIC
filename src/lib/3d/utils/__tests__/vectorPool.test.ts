import * as THREE from 'three';
import { Vector3Pool } from '../vectorPool';

describe('Vector3Pool', () => {
  it('should create a new Vector3 when acquiring from empty pool', () => {
    const pool = new Vector3Pool();
    const v = pool.acquire();
    expect(v).toBeInstanceOf(THREE.Vector3);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it('should reuse released Vector3 objects', () => {
    const pool = new Vector3Pool();
    const v1 = pool.acquire();
    v1.set(1, 2, 3);
    pool.release(v1);
    const v2 = pool.acquire();
    expect(v2).toBe(v1);
    expect(v2.x).toBe(0);
    expect(v2.y).toBe(0);
    expect(v2.z).toBe(0);
  });

  it('should reset Vector3 to zero on release', () => {
    const pool = new Vector3Pool();
    const v = pool.acquire();
    v.set(5, 10, 15);
    pool.release(v);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it('should respect maxSize limit', () => {
    const pool = new Vector3Pool(3);
    const v1 = pool.acquire();
    const v2 = pool.acquire();
    const v3 = pool.acquire();
    pool.release(v1);
    pool.release(v2);
    pool.release(v3);
    const v4 = pool.acquire();
    pool.release(v4);
    const discarded = new THREE.Vector3(9, 9, 9);
    pool.release(discarded);
    expect(pool.size()).toBe(3);
  });

  it('should not add to pool when at maxSize', () => {
    const pool = new Vector3Pool(2);
    const v1 = pool.acquire();
    const v2 = pool.acquire();
    pool.release(v1);
    pool.release(v2);
    const extra = pool.acquire();
    pool.release(extra);
    expect(pool.size()).toBe(2);
  });

  it('should empty pool on clear', () => {
    const pool = new Vector3Pool();
    const v1 = pool.acquire();
    const v2 = pool.acquire();
    pool.release(v1);
    pool.release(v2);
    expect(pool.size()).toBe(2);
    pool.clear();
    expect(pool.size()).toBe(0);
  });

  it('should track size correctly', () => {
    const pool = new Vector3Pool();
    expect(pool.size()).toBe(0);
    const v1 = pool.acquire();
    expect(pool.size()).toBe(0);
    pool.release(v1);
    expect(pool.size()).toBe(1);
    const v2 = pool.acquire();
    expect(pool.size()).toBe(0);
    pool.release(v2);
    expect(pool.size()).toBe(1);
    pool.clear();
    expect(pool.size()).toBe(0);
  });

  it('should not add when at maxSize', () => {
    const pool = new Vector3Pool(1);
    const v1 = pool.acquire();
    pool.release(v1);
    const v2 = pool.acquire();
    pool.release(v2);
    expect(pool.size()).toBe(1);
  });
});
