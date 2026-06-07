/**
 * @module store/useExoplanetStore.test
 * @description 系外行星状态管理测试
 * 
 * 测试覆盖:
 * - 初始状态验证
 * - 选择和悬停状态管理
 * - 状态清除
 * 
 * 注意：由于 fetchIndex 和 selectHost 涉及模块级缓存和复杂的异步行为，
 * 这些功能的集成测试更适合在 E2E 测试中进行。
 */

import { useExoplanetStore } from '../useExoplanetStore';
import type { ExoplanetSystemDetails } from '@/lib/types/exoplanet';

describe('useExoplanetStore - 基础功能', () => {
  const mockSystemDetails: ExoplanetSystemDetails = {
    hostname: 'Kepler-186',
    ra: 287.4,
    dec: 43.9,
    distance: 178.5,
    star: {
      name: 'Kepler-186',
      mass: 0.48,
      radius: 0.47,
      temp: 3755,
    },
    planets: [
      {
        name: 'Kepler-186 f',
        orbitalPeriod: 129.9,
        semiMajorAxis: 0.432,
        radius: 1.17,
        mass: null,
        eqTemp: 188,
      },
    ],
  };

  beforeEach(() => {
    // 重置 store 到初始状态
    useExoplanetStore.getState().clearSelection();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useExoplanetStore.getState();
      
      expect(state.selectedHostName).toBeNull();
      expect(state.selectedSystem).toBeNull();
      expect(state.selectedBody).toBeNull();
      expect(state.loadingSystem).toBe(false);
      expect(state.systemError).toBeNull();
      expect(state.hoveredHostName).toBeNull();
      expect(state.hoveredPlanetName).toBeNull();
    });
  });

  describe('选择状态管理', () => {
    it('应该能够设置选中的主恒星（模拟）', () => {
      useExoplanetStore.setState({
        selectedHostName: 'Kepler-186',
        selectedSystem: mockSystemDetails,
        selectedBody: { type: 'star', hostname: 'Kepler-186' },
      });

      const state = useExoplanetStore.getState();
      expect(state.selectedHostName).toBe('Kepler-186');
      expect(state.selectedSystem).toEqual(mockSystemDetails);
      expect(state.selectedBody).toEqual({ type: 'star', hostname: 'Kepler-186' });
    });

    it('selectPlanet 应该选择行星', () => {
      const state = useExoplanetStore.getState();
      
      // 先设置主恒星
      useExoplanetStore.setState({ 
        selectedHostName: 'Kepler-186',
        selectedSystem: mockSystemDetails,
      });

      // 选择行星
      state.selectPlanet('Kepler-186 f');

      const updatedState = useExoplanetStore.getState();
      expect(updatedState.selectedBody).toEqual({
        type: 'planet',
        hostname: 'Kepler-186',
        planetName: 'Kepler-186 f',
      });
      expect(updatedState.hoveredPlanetName).toBe('Kepler-186 f');
    });

    it('没有选择主恒星时 selectPlanet 不应该选择行星', () => {
      const state = useExoplanetStore.getState();
      
      state.selectPlanet('Some Planet');

      const updatedState = useExoplanetStore.getState();
      expect(updatedState.selectedBody).toBeNull();
      expect(updatedState.hoveredPlanetName).toBeNull();
    });
  });

  describe('悬停状态', () => {
    it('应该设置悬停的主恒星', () => {
      const state = useExoplanetStore.getState();
      
      state.setHoveredHost('TRAPPIST-1');
      expect(useExoplanetStore.getState().hoveredHostName).toBe('TRAPPIST-1');
      
      state.setHoveredHost(null);
      expect(useExoplanetStore.getState().hoveredHostName).toBeNull();
    });

    it('应该设置悬停的行星', () => {
      const state = useExoplanetStore.getState();
      
      state.setHoveredPlanet('Kepler-186 f');
      expect(useExoplanetStore.getState().hoveredPlanetName).toBe('Kepler-186 f');
      
      state.setHoveredPlanet(null);
      expect(useExoplanetStore.getState().hoveredPlanetName).toBeNull();
    });

    it('悬停状态应该独立于选择状态', () => {
      const state = useExoplanetStore.getState();
      
      // 设置选中状态
      useExoplanetStore.setState({
        selectedHostName: 'Kepler-186',
        selectedBody: { type: 'star', hostname: 'Kepler-186' },
      });

      // 设置不同的悬停状态
      state.setHoveredHost('TRAPPIST-1');

      const updatedState = useExoplanetStore.getState();
      expect(updatedState.selectedHostName).toBe('Kepler-186');
      expect(updatedState.hoveredHostName).toBe('TRAPPIST-1');
    });
  });

  describe('clearSelection', () => {
    it('应该清除所有选择和悬停状态', () => {
      // 设置各种状态
      useExoplanetStore.setState({
        selectedHostName: 'Kepler-186',
        selectedSystem: mockSystemDetails,
        selectedBody: { type: 'star', hostname: 'Kepler-186' },
        loadingSystem: false,
        systemError: null,
        hoveredHostName: 'TRAPPIST-1',
        hoveredPlanetName: 'Kepler-186 f',
      });

      const state = useExoplanetStore.getState();
      state.clearSelection();

      const updatedState = useExoplanetStore.getState();
      expect(updatedState.selectedHostName).toBeNull();
      expect(updatedState.selectedSystem).toBeNull();
      expect(updatedState.selectedBody).toBeNull();
      expect(updatedState.loadingSystem).toBe(false);
      expect(updatedState.systemError).toBeNull();
      expect(updatedState.hoveredHostName).toBeNull();
      expect(updatedState.hoveredPlanetName).toBeNull();
    });

    it('清除选择不应该影响索引数据', () => {
      // 模拟有索引数据
      useExoplanetStore.setState({
        systems: [{ hostname: 'Test', ra: 0, dec: 0, distance: 100, planetCount: 1, starTemp: 5000 }],
        selectedHostName: 'Test',
      });

      const state = useExoplanetStore.getState();
      state.clearSelection();

      const updatedState = useExoplanetStore.getState();
      expect(updatedState.systems).toHaveLength(1); // 索引数据保留
      expect(updatedState.selectedHostName).toBeNull(); // 选择被清除
    });
  });

  describe('状态隔离', () => {
    it('修改选择状态不应该影响索引状态', () => {
      useExoplanetStore.setState({
        systems: [{ hostname: 'System1', ra: 0, dec: 0, distance: 100, planetCount: 1, starTemp: 5000 }],
        loadingIndex: false,
        indexError: null,
      });

      // 修改选择状态
      useExoplanetStore.setState({
        selectedHostName: 'Kepler-186',
        selectedBody: { type: 'star', hostname: 'Kepler-186' },
      });

      const state = useExoplanetStore.getState();
      // 索引状态不变
      expect(state.systems).toHaveLength(1);
      expect(state.loadingIndex).toBe(false);
      expect(state.indexError).toBeNull();
      // 选择状态已更新
      expect(state.selectedHostName).toBe('Kepler-186');
    });
  });

  describe('实际使用场景', () => {
    it('场景1: 用户选择恒星然后选择行星', () => {
      const state = useExoplanetStore.getState();

      // 1. 选择恒星
      useExoplanetStore.setState({
        selectedHostName: 'Kepler-186',
        selectedSystem: mockSystemDetails,
        selectedBody: { type: 'star', hostname: 'Kepler-186' },
      });

      expect(useExoplanetStore.getState().selectedBody?.type).toBe('star');

      // 2. 选择行星
      state.selectPlanet('Kepler-186 f');

      const finalState = useExoplanetStore.getState();
      expect(finalState.selectedBody?.type).toBe('planet');
      if (finalState.selectedBody?.type === 'planet') {
        expect(finalState.selectedBody.planetName).toBe('Kepler-186 f');
      }
    });

    it('场景2: 用户悬停然后点击', () => {
      const state = useExoplanetStore.getState();

      // 1. 悬停
      state.setHoveredHost('Kepler-186');
      expect(useExoplanetStore.getState().hoveredHostName).toBe('Kepler-186');

      // 2. 点击选择
      useExoplanetStore.setState({
        selectedHostName: 'Kepler-186',
        selectedBody: { type: 'star', hostname: 'Kepler-186' },
      });

      const finalState = useExoplanetStore.getState();
      expect(finalState.selectedHostName).toBe('Kepler-186');
      expect(finalState.hoveredHostName).toBe('Kepler-186');
    });

    it('场景3: 用户清除选择', () => {
      const state = useExoplanetStore.getState();

      // 设置完整的选择状态
      useExoplanetStore.setState({
        selectedHostName: 'Kepler-186',
        selectedSystem: mockSystemDetails,
        selectedBody: { type: 'planet', hostname: 'Kepler-186', planetName: 'Kepler-186 f' },
        hoveredHostName: 'TRAPPIST-1',
        hoveredPlanetName: 'Kepler-186 f',
      });

      // 清除
      state.clearSelection();

      const finalState = useExoplanetStore.getState();
      expect(finalState.selectedHostName).toBeNull();
      expect(finalState.selectedSystem).toBeNull();
      expect(finalState.selectedBody).toBeNull();
      expect(finalState.hoveredHostName).toBeNull();
      expect(finalState.hoveredPlanetName).toBeNull();
    });
  });
});

