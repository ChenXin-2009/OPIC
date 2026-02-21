/**
 * 后端服务验证测试
 * 
 * 验证内容:
 * 1. API端点可以成功返回卫星数据
 * 2. 缓存机制正常工作
 * 3. 数据格式正确
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('后端服务验证', () => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const API_ENDPOINT = `${API_BASE_URL}/api/satellites`;

  describe('1. API端点功能验证', () => {
    it('应该成功返回活跃卫星数据', async () => {
      const response = await fetch(`${API_ENDPOINT}?category=active`);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // 验证响应结构
      expect(data).toHaveProperty('satellites');
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('lastUpdate');
      expect(data).toHaveProperty('cacheExpiry');
      
      // 验证数据类型
      expect(Array.isArray(data.satellites)).toBe(true);
      expect(typeof data.count).toBe('number');
      expect(data.category).toBe('active');
      
      // 验证至少有一些卫星数据
      expect(data.satellites.length).toBeGreaterThan(0);
      expect(data.count).toBe(data.satellites.length);
      
      console.log(`✓ 成功获取 ${data.count} 颗活跃卫星数据`);
    }, 30000); // 30秒超时

    it('应该返回正确的TLE数据格式', async () => {
      const response = await fetch(`${API_ENDPOINT}?category=active`);
      const data = await response.json();
      
      // 检查第一颗卫星的数据格式
      const satellite = data.satellites[0];
      
      expect(satellite).toHaveProperty('name');
      expect(satellite).toHaveProperty('noradId');
      expect(satellite).toHaveProperty('line1');
      expect(satellite).toHaveProperty('line2');
      expect(satellite).toHaveProperty('category');
      expect(satellite).toHaveProperty('epoch');
      
      // 验证TLE行格式
      expect(satellite.line1).toMatch(/^1 /);
      expect(satellite.line1.length).toBe(69);
      expect(satellite.line2).toMatch(/^2 /);
      expect(satellite.line2.length).toBe(69);
      
      // 验证NORAD ID是数字
      expect(typeof satellite.noradId).toBe('number');
      expect(satellite.noradId).toBeGreaterThan(0);
      
      console.log(`✓ TLE数据格式正确: ${satellite.name} (NORAD ${satellite.noradId})`);
    }, 30000);

    it('应该支持不同的卫星类别', async () => {
      const categories = ['active', 'stations', 'gps-ops', 'weather'];
      
      for (const category of categories) {
        const response = await fetch(`${API_ENDPOINT}?category=${category}`);
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        expect(data.category).toBe(category);
        expect(data.satellites.length).toBeGreaterThan(0);
        
        console.log(`✓ 类别 ${category}: ${data.count} 颗卫星`);
      }
    }, 60000);

    it('应该包含正确的响应头', async () => {
      const response = await fetch(`${API_ENDPOINT}?category=active`);
      
      // 验证Content-Type
      expect(response.headers.get('content-type')).toContain('application/json');
      
      // 验证Cache-Control
      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toContain('public');
      
      // 验证Last-Modified
      const lastModified = response.headers.get('last-modified');
      expect(lastModified).toBeTruthy();
      
      console.log(`✓ 响应头正确: Cache-Control=${cacheControl}, Last-Modified=${lastModified}`);
    }, 30000);
  });

  describe('2. 缓存机制验证', () => {
    it('应该在第二次请求时返回缓存数据', async () => {
      // 第一次请求
      const response1 = await fetch(`${API_ENDPOINT}?category=active`);
      const data1 = await response1.json();
      const lastUpdate1 = data1.lastUpdate;
      
      // 等待1秒
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 第二次请求
      const response2 = await fetch(`${API_ENDPOINT}?category=active`);
      const data2 = await response2.json();
      const lastUpdate2 = data2.lastUpdate;
      
      // 验证返回的是缓存数据(lastUpdate应该相同)
      expect(lastUpdate1).toBe(lastUpdate2);
      expect(data1.count).toBe(data2.count);
      
      console.log(`✓ 缓存机制正常工作: lastUpdate=${lastUpdate1}`);
    }, 35000);

    it('应该包含缓存过期时间', async () => {
      const response = await fetch(`${API_ENDPOINT}?category=active`);
      const data = await response.json();
      
      expect(data.cacheExpiry).toBeTruthy();
      
      // 验证cacheExpiry是有效的ISO日期
      const expiryDate = new Date(data.cacheExpiry);
      expect(expiryDate.toString()).not.toBe('Invalid Date');
      
      // 验证过期时间在未来
      expect(expiryDate.getTime()).toBeGreaterThan(Date.now());
      
      // 验证过期时间大约是2小时后
      const twoHours = 2 * 60 * 60 * 1000;
      const timeDiff = expiryDate.getTime() - Date.now();
      expect(timeDiff).toBeGreaterThan(twoHours - 60000); // 允许1分钟误差
      expect(timeDiff).toBeLessThan(twoHours + 60000);
      
      console.log(`✓ 缓存过期时间正确: ${data.cacheExpiry}`);
    }, 30000);
  });

  describe('3. 错误处理验证', () => {
    it('应该处理无效的类别参数', async () => {
      const response = await fetch(`${API_ENDPOINT}?category=invalid`);
      
      // 应该返回默认类别(active)的数据,而不是错误
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.category).toBe('active');
      
      console.log(`✓ 无效类别参数处理正确,返回默认类别`);
    }, 30000);

    it('应该处理缺少类别参数的情况', async () => {
      const response = await fetch(API_ENDPOINT);
      
      // 应该返回默认类别(active)的数据
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.category).toBe('active');
      
      console.log(`✓ 缺少类别参数处理正确,返回默认类别`);
    }, 30000);
  });

  describe('4. 数据质量验证', () => {
    it('所有TLE数据应该通过验证', async () => {
      const response = await fetch(`${API_ENDPOINT}?category=active`);
      const data = await response.json();
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (const satellite of data.satellites) {
        // 验证必需字段
        if (
          satellite.name &&
          satellite.noradId > 0 &&
          satellite.line1 &&
          satellite.line2 &&
          satellite.line1.length === 69 &&
          satellite.line2.length === 69 &&
          satellite.line1.startsWith('1 ') &&
          satellite.line2.startsWith('2 ')
        ) {
          validCount++;
        } else {
          invalidCount++;
          console.warn(`无效的卫星数据: ${satellite.name}`);
        }
      }
      
      // 所有数据都应该有效
      expect(invalidCount).toBe(0);
      expect(validCount).toBe(data.satellites.length);
      
      console.log(`✓ 所有 ${validCount} 颗卫星数据都通过验证`);
    }, 30000);

    it('历元时间应该是合理的日期', async () => {
      const response = await fetch(`${API_ENDPOINT}?category=active`);
      const data = await response.json();
      
      const now = Date.now();
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      const oneMonthFromNow = now + 30 * 24 * 60 * 60 * 1000;
      
      for (const satellite of data.satellites) {
        const epochTime = new Date(satellite.epoch).getTime();
        
        // 历元时间应该在过去一年到未来一个月之间
        expect(epochTime).toBeGreaterThan(oneYearAgo);
        expect(epochTime).toBeLessThan(oneMonthFromNow);
      }
      
      console.log(`✓ 所有历元时间都在合理范围内`);
    }, 30000);
  });
});
