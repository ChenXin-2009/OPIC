/**
 * Celestrak客户端单元测试
 */

import { describe, it, expect } from '@jest/globals';
import { CelestrakClient } from '@/lib/server/celestrakClient';
import { SatelliteCategory } from '@/lib/types/satellite';

describe('CelestrakClient', () => {
  const client = new CelestrakClient();

  describe('TLE验证', () => {
    it('应该验证有效的TLE数据', () => {
      const validTLE = {
        name: 'ISS (ZARYA)',
        line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
        line2: '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50030900000000'
      };

      const result = client.validateTLE(validTLE);
      expect(result).toBe(true);
    });

    it('应该拒绝空名称', () => {
      const invalidTLE = {
        name: '',
        line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
        line2: '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50030900000000'
      };

      const result = client.validateTLE(invalidTLE);
      expect(result).toBe(false);
    });

    it('应该拒绝长度不正确的TLE行', () => {
      const invalidTLE = {
        name: 'TEST',
        line1: '1 25544U',
        line2: '2 25544'
      };

      const result = client.validateTLE(invalidTLE);
      expect(result).toBe(false);
    });

    it('应该拒绝不以"1 "开头的第一行', () => {
      const invalidTLE = {
        name: 'TEST',
        line1: '2 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
        line2: '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50030900000000'
      };

      const result = client.validateTLE(invalidTLE);
      expect(result).toBe(false);
    });

    it('应该拒绝不以"2 "开头的第二行', () => {
      const invalidTLE = {
        name: 'TEST',
        line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
        line2: '1 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50030900000000'
      };

      const result = client.validateTLE(invalidTLE);
      expect(result).toBe(false);
    });
  });

  describe('TLE解析', () => {
    it('应该正确解析TLE数据', () => {
      const rawTLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005
2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50030900000000`;

      const result = client.parseTLE(rawTLE, SatelliteCategory.ISS);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ISS (ZARYA)');
      expect(result[0].noradId).toBe(25544);
      expect(result[0].category).toBe(SatelliteCategory.ISS);
      expect(result[0].line1).toContain('1 25544U');
      expect(result[0].line2).toContain('2 25544');
    });

    it('应该解析多颗卫星', () => {
      const rawTLE = `SATELLITE 1
1 00001U 00000A   24001.50000000  .00000000  00000-0  00000-0 0  9990
2 00001  00.0000 000.0000 0000000 000.0000 000.0000 01.00000000000009
SATELLITE 2
1 00002U 00000B   24001.50000000  .00000000  00000-0  00000-0 0  9998
2 00002  00.0000 000.0000 0000000 000.0000 000.0000 01.00000000000007`;

      const result = client.parseTLE(rawTLE, SatelliteCategory.ACTIVE);

      expect(result).toHaveLength(2);
      expect(result[0].noradId).toBe(1);
      expect(result[1].noradId).toBe(2);
    });

    it('应该过滤无效的TLE条目', () => {
      const rawTLE = `VALID SATELLITE
1 00001U 00000A   24001.50000000  .00000000  00000-0  00000-0 0  9990
2 00001  00.0000 000.0000 0000000 000.0000 000.0000 01.00000000000009
INVALID SATELLITE
1 INVALID LINE
2 INVALID LINE`;

      const result = client.parseTLE(rawTLE, SatelliteCategory.ACTIVE);

      // 应该只返回有效的卫星
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('VALID SATELLITE');
    });

    it('应该处理空数据', () => {
      const result = client.parseTLE('', SatelliteCategory.ACTIVE);
      expect(result).toHaveLength(0);
    });

    it('应该处理不完整的TLE组', () => {
      const rawTLE = `INCOMPLETE
1 00001U 00000A   24001.50000000  .00000000  00000-0  00000-0 0  9990`;

      const result = client.parseTLE(rawTLE, SatelliteCategory.ACTIVE);
      expect(result).toHaveLength(0);
    });
  });

  describe('数据获取', () => {
    it('应该能够从Celestrak获取活跃卫星数据', async () => {
      const result = await client.fetchTLE(SatelliteCategory.ACTIVE);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // 验证第一颗卫星的数据结构
      const first = result[0];
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('noradId');
      expect(first).toHaveProperty('line1');
      expect(first).toHaveProperty('line2');
      expect(first).toHaveProperty('category');
      expect(first).toHaveProperty('epoch');
      
      expect(typeof first.name).toBe('string');
      expect(typeof first.noradId).toBe('number');
      expect(first.noradId).toBeGreaterThan(0);
      expect(first.line1.length).toBe(69);
      expect(first.line2.length).toBe(69);
    }, 30000);

    it('应该能够获取ISS数据', async () => {
      const result = await client.fetchTLE(SatelliteCategory.ISS);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // ISS应该在结果中
      const iss = result.find(sat => sat.noradId === 25544);
      expect(iss).toBeDefined();
      if (iss) {
        expect(iss.name).toContain('ISS');
      }
    }, 30000);
  });
});
