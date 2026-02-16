/**
 * UniverseDataLoader.test.ts - 宇宙数据加载器单元测试
 */

import { UniverseDataLoader } from '../UniverseDataLoader';
import { UniverseScale } from '../../types/universeTypes';

// Mock fetch API
global.fetch = jest.fn();

describe('UniverseDataLoader', () => {
  let loader: UniverseDataLoader;

  beforeEach(() => {
    // 重置单例实例
    (UniverseDataLoader as any).instance = null;
    loader = UniverseDataLoader.getInstance();
    
    // 清除所有 mock
    jest.clearAllMocks();
    
    // 清空缓存
    loader.clearCache();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = UniverseDataLoader.getInstance();
      const instance2 = UniverseDataLoader.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('数据加载', () => {
    it('应该成功加载数据文件', async () => {
      const mockData = new ArrayBuffer(100);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockData,
      });

      const result = await loader.loadDataForScale(UniverseScale.LocalGroup);
      
      expect(result).toBe(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/data/universe/local-group.bin');
    });

    it('应该处理加载错误', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        loader.loadDataForScale(UniverseScale.LocalGroup)
      ).rejects.toThrow('Failed to load');
    });

    it('应该处理网络错误', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        loader.loadDataForScale(UniverseScale.LocalGroup)
      ).rejects.toThrow('Network error');
    });
  });

  describe('缓存机制', () => {
    it('应该缓存已加载的数据', async () => {
      const mockData = new ArrayBuffer(100);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockData,
      });

      // 第一次加载
      const result1 = await loader.loadDataForScale(UniverseScale.LocalGroup);
      
      // 第二次加载应该使用缓存
      const result2 = await loader.loadDataForScale(UniverseScale.LocalGroup);
      
      expect(result1).toBe(result2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('应该返回正确的缓存大小', async () => {
      const mockData = new ArrayBuffer(100);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockData,
      });

      await loader.loadDataForScale(UniverseScale.LocalGroup);
      
      const cacheSize = loader.getCacheSize();
      expect(cacheSize).toBe(100);
    });

    it('应该能够清空缓存', async () => {
      const mockData = new ArrayBuffer(100);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockData,
      });

      await loader.loadDataForScale(UniverseScale.LocalGroup);
      expect(loader.getCacheSize()).toBe(100);
      
      loader.clearCache();
      expect(loader.getCacheSize()).toBe(0);
    });
  });

  describe('并发加载', () => {
    it('应该避免重复请求', async () => {
      const mockData = new ArrayBuffer(100);
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              arrayBuffer: async () => mockData,
            });
          }, 100);
        });
      });

      // 同时发起多个加载请求
      const promise1 = loader.loadDataForScale(UniverseScale.LocalGroup);
      const promise2 = loader.loadDataForScale(UniverseScale.LocalGroup);
      const promise3 = loader.loadDataForScale(UniverseScale.LocalGroup);

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      // 应该返回相同的数据
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      
      // 只应该发起一次请求
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('预加载', () => {
    it('应该预加载相邻尺度的数据', async () => {
      const mockData = new ArrayBuffer(100);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockData,
      });

      await loader.preloadAdjacentScales(UniverseScale.LocalGroup);

      // 应该加载 Galaxy 和 NearbyGroups
      expect(global.fetch).toHaveBeenCalledWith('/data/universe/nearby-groups.bin');
      // Galaxy 没有数据文件，所以会失败但不应该抛出错误
    });

    it('预加载失败不应该阻塞', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      // 不应该抛出错误
      await expect(
        loader.preloadAdjacentScales(UniverseScale.LocalGroup)
      ).resolves.not.toThrow();
    });
  });

  describe('缓存释放', () => {
    it('应该释放远距离尺度的缓存', async () => {
      const mockData = new ArrayBuffer(100);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockData,
      });

      // 加载多个尺度的数据
      await loader.loadDataForScale(UniverseScale.LocalGroup);
      await loader.loadDataForScale(UniverseScale.NearbyGroups);
      await loader.loadDataForScale(UniverseScale.VirgoSupercluster);

      const initialSize = loader.getCacheSize();
      expect(initialSize).toBeGreaterThan(0);

      // 释放远距离尺度（从 LocalGroup 看，VirgoSupercluster 距离 >= 3）
      loader.releaseDistantScales(UniverseScale.LocalGroup);

      // 缓存大小应该减少
      const finalSize = loader.getCacheSize();
      expect(finalSize).toBeLessThan(initialSize);
    });
  });

  describe('数据解析', () => {
    it('应该正确解析本星系群数据', () => {
      // 创建模拟的二进制数据
      const buffer = new ArrayBuffer(1024);
      const view = new DataView(buffer);
      let offset = 0;

      // 名称表大小
      view.setUint16(offset, 2, true);
      offset += 2;

      // 名称表
      const name1 = 'Milky Way';
      view.setUint8(offset, name1.length);
      offset += 1;
      for (let i = 0; i < name1.length; i++) {
        view.setUint8(offset, name1.charCodeAt(i));
        offset += 1;
      }

      const name2 = 'Andromeda';
      view.setUint8(offset, name2.length);
      offset += 1;
      for (let i = 0; i < name2.length; i++) {
        view.setUint8(offset, name2.charCodeAt(i));
        offset += 1;
      }

      // 星系数量
      view.setUint16(offset, 2, true);
      offset += 2;

      // 第一个星系
      view.setFloat32(offset, 0.0, true); // x
      offset += 4;
      view.setFloat32(offset, 0.0, true); // y
      offset += 4;
      view.setFloat32(offset, 0.0, true); // z
      offset += 4;
      view.setUint8(offset, 255); // brightness
      offset += 1;
      view.setUint8(offset, 0); // type (Spiral)
      offset += 1;
      view.setUint8(offset, 0); // nameIndex
      offset += 1;
      view.setUint8(offset, 0); // colorIndex
      offset += 1;

      // 第二个星系
      view.setFloat32(offset, 0.78, true); // x (Andromeda distance)
      offset += 4;
      view.setFloat32(offset, 0.0, true); // y
      offset += 4;
      view.setFloat32(offset, 0.0, true); // z
      offset += 4;
      view.setUint8(offset, 200); // brightness
      offset += 1;
      view.setUint8(offset, 0); // type (Spiral)
      offset += 1;
      view.setUint8(offset, 1); // nameIndex
      offset += 1;
      view.setUint8(offset, 1); // colorIndex
      offset += 1;

      const galaxies = loader.parseLocalGroupData(buffer);

      expect(galaxies).toHaveLength(2);
      expect(galaxies[0].name).toBe('Milky Way');
      expect(galaxies[0].x).toBe(0.0);
      expect(galaxies[0].brightness).toBeCloseTo(1.0);
      
      expect(galaxies[1].name).toBe('Andromeda');
      expect(galaxies[1].x).toBeCloseTo(0.78);
      expect(galaxies[1].brightness).toBeCloseTo(200 / 255);
    });

    it('应该正确解析近邻星系群数据', () => {
      // 创建模拟的二进制数据
      const buffer = new ArrayBuffer(1024);
      const view = new DataView(buffer);
      let offset = 0;

      // 名称表大小
      view.setUint16(offset, 1, true);
      offset += 2;

      // 名称表
      const name = 'Sculptor Group';
      view.setUint8(offset, name.length);
      offset += 1;
      for (let i = 0; i < name.length; i++) {
        view.setUint8(offset, name.charCodeAt(i));
        offset += 1;
      }

      // 星系群数量
      view.setUint16(offset, 1, true);
      offset += 2;

      // 星系群元数据
      view.setFloat32(offset, 3.9, true); // centerX
      offset += 4;
      view.setFloat32(offset, 0.0, true); // centerY
      offset += 4;
      view.setFloat32(offset, 0.0, true); // centerZ
      offset += 4;
      view.setFloat32(offset, 1.0, true); // radius
      offset += 4;
      view.setUint16(offset, 2, true); // memberCount
      offset += 2;
      view.setUint8(offset, 5); // richness
      offset += 1;
      view.setUint8(offset, 0); // nameIndex
      offset += 1;

      // 成员星系
      view.setFloat32(offset, 3.8, true); // x
      offset += 4;
      view.setFloat32(offset, 0.1, true); // y
      offset += 4;
      view.setFloat32(offset, 0.0, true); // z
      offset += 4;

      view.setFloat32(offset, 4.0, true); // x
      offset += 4;
      view.setFloat32(offset, -0.1, true); // y
      offset += 4;
      view.setFloat32(offset, 0.0, true); // z
      offset += 4;

      const result = loader.parseNearbyGroupsData(buffer);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].name).toBe('Sculptor Group');
      expect(result.groups[0].centerX).toBeCloseTo(3.9);
      expect(result.groups[0].memberCount).toBe(2);
      
      expect(result.galaxies).toHaveLength(2);
      expect(result.galaxies[0].x).toBeCloseTo(3.8);
    });
  });
});
