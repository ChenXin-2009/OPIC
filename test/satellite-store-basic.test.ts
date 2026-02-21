/**
 * 卫星状态Store基础功能测试
 * 
 * 测试Store的基本状态管理功能
 */

import { useSatelliteStore } from '../src/lib/store/useSatelliteStore';
import { SatelliteCategory } from '../src/lib/types/satellite';

describe('SatelliteStore - 基础功能', () => {
  beforeEach(() => {
    // 重置Store状态
    const store = useSatelliteStore.getState();
    store.setSelectedCategories(new Set([SatelliteCategory.ACTIVE]));
    store.setSearchQuery('');
    store.clearAllOrbits();
    store.selectSatellite(null);
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useSatelliteStore.getState();

      expect(state.tleData.size).toBe(0);
      expect(state.satellites.size).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.lastUpdate).toBe(null);
      expect(state.selectedCategories.has(SatelliteCategory.ACTIVE)).toBe(true);
      expect(state.searchQuery).toBe('');
      expect(state.visibleSatellites.size).toBe(0);
      expect(state.selectedSatellite).toBe(null);
      expect(state.hoveredSatellite).toBe(null);
      expect(state.showOrbits.size).toBe(0);
      expect(state.showSatellites).toBe(true);
      expect(state.showInfoPanel).toBe(false);
    });
  });

  describe('类别筛选', () => {
    it('应该能够设置选中的类别', () => {
      const store = useSatelliteStore.getState();
      const categories = new Set([SatelliteCategory.GPS, SatelliteCategory.ISS]);

      store.setSelectedCategories(categories);

      const state = useSatelliteStore.getState();
      expect(state.selectedCategories.size).toBe(2);
      expect(state.selectedCategories.has(SatelliteCategory.GPS)).toBe(true);
      expect(state.selectedCategories.has(SatelliteCategory.ISS)).toBe(true);
    });

    it('应该支持多选类别', () => {
      const store = useSatelliteStore.getState();
      const categories = new Set([
        SatelliteCategory.ACTIVE,
        SatelliteCategory.GPS,
        SatelliteCategory.WEATHER,
      ]);

      store.setSelectedCategories(categories);

      const state = useSatelliteStore.getState();
      expect(state.selectedCategories.size).toBe(3);
    });
  });

  describe('搜索功能', () => {
    it('应该能够设置搜索查询', () => {
      const store = useSatelliteStore.getState();

      store.setSearchQuery('ISS');

      const state = useSatelliteStore.getState();
      expect(state.searchQuery).toBe('ISS');
    });

    it('应该能够清空搜索查询', () => {
      const store = useSatelliteStore.getState();

      store.setSearchQuery('test');
      store.setSearchQuery('');

      const state = useSatelliteStore.getState();
      expect(state.searchQuery).toBe('');
    });
  });

  describe('卫星选择', () => {
    it('应该能够选择卫星', () => {
      const store = useSatelliteStore.getState();
      const noradId = 25544; // ISS

      store.selectSatellite(noradId);

      const state = useSatelliteStore.getState();
      expect(state.selectedSatellite).toBe(noradId);
      expect(state.showInfoPanel).toBe(true);
    });

    it('应该能够取消选择卫星', () => {
      const store = useSatelliteStore.getState();

      store.selectSatellite(25544);
      store.selectSatellite(null);

      const state = useSatelliteStore.getState();
      expect(state.selectedSatellite).toBe(null);
      expect(state.showInfoPanel).toBe(false);
    });
  });

  describe('轨道显示', () => {
    it('应该能够切换轨道显示', () => {
      const store = useSatelliteStore.getState();
      const noradId = 25544;

      store.toggleOrbit(noradId);

      let state = useSatelliteStore.getState();
      expect(state.showOrbits.has(noradId)).toBe(true);

      store.toggleOrbit(noradId);

      state = useSatelliteStore.getState();
      expect(state.showOrbits.has(noradId)).toBe(false);
    });

    it('应该限制最多10条轨道', () => {
      const store = useSatelliteStore.getState();

      // 添加11条轨道
      for (let i = 1; i <= 11; i++) {
        store.toggleOrbit(i);
      }

      const state = useSatelliteStore.getState();
      expect(state.showOrbits.size).toBe(10);
      expect(state.showOrbits.has(1)).toBe(false); // 第一条应该被移除
      expect(state.showOrbits.has(11)).toBe(true); // 最后一条应该存在
    });

    it('应该能够清除所有轨道', () => {
      const store = useSatelliteStore.getState();

      // 添加多条轨道
      store.toggleOrbit(1);
      store.toggleOrbit(2);
      store.toggleOrbit(3);

      store.clearAllOrbits();

      const state = useSatelliteStore.getState();
      expect(state.showOrbits.size).toBe(0);
    });
  });

  describe('可见性控制', () => {
    it('应该能够切换卫星图层可见性', () => {
      const store = useSatelliteStore.getState();

      store.setShowSatellites(false);

      let state = useSatelliteStore.getState();
      expect(state.showSatellites).toBe(false);

      store.setShowSatellites(true);

      state = useSatelliteStore.getState();
      expect(state.showSatellites).toBe(true);
    });

    it('应该能够切换信息面板可见性', () => {
      const store = useSatelliteStore.getState();

      store.setShowInfoPanel(true);

      let state = useSatelliteStore.getState();
      expect(state.showInfoPanel).toBe(true);

      store.setShowInfoPanel(false);

      state = useSatelliteStore.getState();
      expect(state.showInfoPanel).toBe(false);
      expect(state.selectedSatellite).toBe(null); // 关闭面板应清除选择
    });
  });

  describe('悬停状态', () => {
    it('应该能够设置悬停卫星', () => {
      const store = useSatelliteStore.getState();
      const noradId = 25544;

      store.setHoveredSatellite(noradId);

      const state = useSatelliteStore.getState();
      expect(state.hoveredSatellite).toBe(noradId);
    });

    it('应该能够清除悬停状态', () => {
      const store = useSatelliteStore.getState();

      store.setHoveredSatellite(25544);
      store.setHoveredSatellite(null);

      const state = useSatelliteStore.getState();
      expect(state.hoveredSatellite).toBe(null);
    });
  });
});
