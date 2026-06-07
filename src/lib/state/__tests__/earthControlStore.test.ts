/**
 * @module state/earthControlStore.test
 * @description 地球控制状态管理测试
 * 
 * 测试覆盖:
 * - 初始状态验证
 * - Cesium 控制
 * - 地球锁定控制
 * - 地球光照控制
 * - 用户偏好管理
 * - 自动与手动锁定的区别
 */

import { useEarthControlStore } from '../earthControlStore';

describe('useEarthControlStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useEarthControlStore.setState({
      cesiumEnabled: true,
      earthLockEnabled: true,
      earthLightEnabled: true,
      earthPlanet: null,
      userEarthLockPreference: true,
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useEarthControlStore.getState();
      
      expect(state.cesiumEnabled).toBe(true);
      expect(state.earthLockEnabled).toBe(true);
      expect(state.earthLightEnabled).toBe(true);
      expect(state.earthPlanet).toBeNull();
      expect(state.userEarthLockPreference).toBe(true);
    });

    it('应该有所有必要的方法', () => {
      const state = useEarthControlStore.getState();
      
      expect(typeof state.setCesiumEnabled).toBe('function');
      expect(typeof state.setEarthLockEnabled).toBe('function');
      expect(typeof state.setEarthLightEnabled).toBe('function');
      expect(typeof state.setEarthPlanet).toBe('function');
      expect(typeof state.setUserEarthLockPreference).toBe('function');
      expect(typeof state.setEarthLockEnabledAuto).toBe('function');
    });
  });

  describe('Cesium 控制', () => {
    it('应该能够启用 Cesium', () => {
      const state = useEarthControlStore.getState();
      
      state.setCesiumEnabled(false);
      expect(useEarthControlStore.getState().cesiumEnabled).toBe(false);
      
      state.setCesiumEnabled(true);
      expect(useEarthControlStore.getState().cesiumEnabled).toBe(true);
    });

    it('应该能够禁用 Cesium', () => {
      const state = useEarthControlStore.getState();
      
      state.setCesiumEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.cesiumEnabled).toBe(false);
    });

    it('Cesium 状态应该独立于其他状态', () => {
      const state = useEarthControlStore.getState();
      
      state.setCesiumEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.cesiumEnabled).toBe(false);
      expect(updatedState.earthLockEnabled).toBe(true);
      expect(updatedState.earthLightEnabled).toBe(true);
    });
  });

  describe('地球锁定控制', () => {
    it('setEarthLockEnabled 应该同时更新状态和用户偏好', () => {
      const state = useEarthControlStore.getState();
      
      state.setEarthLockEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.earthLockEnabled).toBe(false);
      expect(updatedState.userEarthLockPreference).toBe(false);
    });

    it('setEarthLockEnabled 应该能够重新启用', () => {
      const state = useEarthControlStore.getState();
      
      state.setEarthLockEnabled(false);
      expect(useEarthControlStore.getState().earthLockEnabled).toBe(false);
      
      state.setEarthLockEnabled(true);
      expect(useEarthControlStore.getState().earthLockEnabled).toBe(true);
      expect(useEarthControlStore.getState().userEarthLockPreference).toBe(true);
    });

    it('setUserEarthLockPreference 应该同时更新两个字段', () => {
      const state = useEarthControlStore.getState();
      
      state.setUserEarthLockPreference(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.earthLockEnabled).toBe(false);
      expect(updatedState.userEarthLockPreference).toBe(false);
    });

    it('setEarthLockEnabledAuto 只应该更新当前状态', () => {
      const state = useEarthControlStore.getState();
      
      // 用户偏好为 true
      expect(state.userEarthLockPreference).toBe(true);
      
      // 系统自动禁用（例如，用户缩放到太空视图）
      state.setEarthLockEnabledAuto(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.earthLockEnabled).toBe(false);
      expect(updatedState.userEarthLockPreference).toBe(true); // 用户偏好保持不变
    });

    it('自动与手动锁定的区别', () => {
      const state = useEarthControlStore.getState();
      
      // 场景：用户手动禁用锁定
      state.setEarthLockEnabled(false);
      expect(useEarthControlStore.getState().userEarthLockPreference).toBe(false);
      
      // 重置
      state.setEarthLockEnabled(true);
      
      // 场景：系统自动禁用（如缩放）
      state.setEarthLockEnabledAuto(false);
      const autoState = useEarthControlStore.getState();
      expect(autoState.earthLockEnabled).toBe(false);
      expect(autoState.userEarthLockPreference).toBe(true); // 偏好保持
    });
  });

  describe('地球光照控制', () => {
    it('应该能够启用地球光照', () => {
      const state = useEarthControlStore.getState();
      
      state.setEarthLightEnabled(false);
      expect(useEarthControlStore.getState().earthLightEnabled).toBe(false);
      
      state.setEarthLightEnabled(true);
      expect(useEarthControlStore.getState().earthLightEnabled).toBe(true);
    });

    it('应该能够禁用地球光照', () => {
      const state = useEarthControlStore.getState();
      
      state.setEarthLightEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.earthLightEnabled).toBe(false);
    });

    it('光照状态应该独立于其他状态', () => {
      const state = useEarthControlStore.getState();
      
      state.setEarthLightEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.earthLightEnabled).toBe(false);
      expect(updatedState.cesiumEnabled).toBe(true);
      expect(updatedState.earthLockEnabled).toBe(true);
    });
  });

  describe('地球行星实例', () => {
    it('应该能够设置地球行星实例', () => {
      const state = useEarthControlStore.getState();
      const mockPlanet = { name: 'Earth', radius: 6371 };
      
      state.setEarthPlanet(mockPlanet);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.earthPlanet).toBe(mockPlanet);
    });

    it('应该能够清除地球行星实例', () => {
      const state = useEarthControlStore.getState();
      const mockPlanet = { name: 'Earth', radius: 6371 };
      
      state.setEarthPlanet(mockPlanet);
      expect(useEarthControlStore.getState().earthPlanet).not.toBeNull();
      
      state.setEarthPlanet(null);
      expect(useEarthControlStore.getState().earthPlanet).toBeNull();
    });

    it('应该能够替换地球行星实例', () => {
      const state = useEarthControlStore.getState();
      const firstPlanet = { name: 'Earth1', radius: 6371 };
      const secondPlanet = { name: 'Earth2', radius: 6371 };
      
      state.setEarthPlanet(firstPlanet);
      expect(useEarthControlStore.getState().earthPlanet).toBe(firstPlanet);
      
      state.setEarthPlanet(secondPlanet);
      expect(useEarthControlStore.getState().earthPlanet).toBe(secondPlanet);
    });
  });

  describe('状态组合', () => {
    it('应该能够同时设置多个状态', () => {
      const state = useEarthControlStore.getState();
      const mockPlanet = { name: 'Earth', radius: 6371 };
      
      state.setCesiumEnabled(false);
      state.setEarthLockEnabled(false);
      state.setEarthLightEnabled(false);
      state.setEarthPlanet(mockPlanet);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.cesiumEnabled).toBe(false);
      expect(updatedState.earthLockEnabled).toBe(false);
      expect(updatedState.earthLightEnabled).toBe(false);
      expect(updatedState.earthPlanet).toBe(mockPlanet);
    });

    it('状态之间应该互不影响', () => {
      const state = useEarthControlStore.getState();
      
      state.setCesiumEnabled(false);
      state.setEarthLightEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.cesiumEnabled).toBe(false);
      expect(updatedState.earthLockEnabled).toBe(true); // 未改变
      expect(updatedState.earthLightEnabled).toBe(false);
    });
  });

  describe('实际使用场景', () => {
    it('场景1: 用户手动切换地球锁定', () => {
      const state = useEarthControlStore.getState();
      
      // 用户点击地球锁定按钮
      state.setEarthLockEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.earthLockEnabled).toBe(false);
      expect(updatedState.userEarthLockPreference).toBe(false);
      
      // 下次应用启动时，应该记住用户偏好
      expect(updatedState.userEarthLockPreference).toBe(false);
    });

    it('场景2: 用户缩放导致自动解锁', () => {
      const state = useEarthControlStore.getState();
      
      // 用户偏好是开启的
      expect(state.userEarthLockPreference).toBe(true);
      expect(state.earthLockEnabled).toBe(true);
      
      // 用户缩放到太空视图，系统自动解锁
      state.setEarthLockEnabledAuto(false);
      
      const duringZoom = useEarthControlStore.getState();
      expect(duringZoom.earthLockEnabled).toBe(false);
      expect(duringZoom.userEarthLockPreference).toBe(true); // 偏好保持
      
      // 用户缩放回地球，系统自动恢复锁定
      state.setEarthLockEnabledAuto(true);
      
      const afterZoom = useEarthControlStore.getState();
      expect(afterZoom.earthLockEnabled).toBe(true);
      expect(afterZoom.userEarthLockPreference).toBe(true);
    });

    it('场景3: 初始化场景', () => {
      const state = useEarthControlStore.getState();
      const mockPlanet = { name: 'Earth', radius: 6371 };
      
      // 1. 启用 Cesium
      state.setCesiumEnabled(true);
      
      // 2. 设置地球实例
      state.setEarthPlanet(mockPlanet);
      
      // 3. 启用地球锁定
      state.setEarthLockEnabled(true);
      
      // 4. 启用地球光照
      state.setEarthLightEnabled(true);
      
      const finalState = useEarthControlStore.getState();
      expect(finalState.cesiumEnabled).toBe(true);
      expect(finalState.earthPlanet).toBe(mockPlanet);
      expect(finalState.earthLockEnabled).toBe(true);
      expect(finalState.earthLightEnabled).toBe(true);
    });

    it('场景4: 切换到纯 Three.js 模式', () => {
      const state = useEarthControlStore.getState();
      
      // 禁用 Cesium
      state.setCesiumEnabled(false);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.cesiumEnabled).toBe(false);
      
      // 其他功能应该仍然可用
      expect(updatedState.earthLockEnabled).toBe(true);
      expect(updatedState.earthLightEnabled).toBe(true);
    });

    it('场景5: 恢复用户偏好', () => {
      const state = useEarthControlStore.getState();
      
      // 模拟：用户之前设置过不启用锁定
      state.setUserEarthLockPreference(false);
      
      // 系统应该记住这个偏好
      const savedState = useEarthControlStore.getState();
      expect(savedState.userEarthLockPreference).toBe(false);
      expect(savedState.earthLockEnabled).toBe(false);
      
      // 即使系统自动尝试启用，也不应该覆盖用户偏好
      // （实际代码中应该检查 userEarthLockPreference）
    });
  });

  describe('边界情况', () => {
    it('应该处理快速连续切换', () => {
      const state = useEarthControlStore.getState();
      
      state.setEarthLockEnabled(false);
      state.setEarthLockEnabled(true);
      state.setEarthLockEnabled(false);
      state.setEarthLockEnabled(true);
      
      const finalState = useEarthControlStore.getState();
      expect(finalState.earthLockEnabled).toBe(true);
      expect(finalState.userEarthLockPreference).toBe(true);
    });

    it('应该处理设置相同的值', () => {
      const state = useEarthControlStore.getState();
      
      state.setCesiumEnabled(true);
      state.setCesiumEnabled(true);
      
      const updatedState = useEarthControlStore.getState();
      expect(updatedState.cesiumEnabled).toBe(true);
    });

    it('应该处理 null 和 undefined', () => {
      const state = useEarthControlStore.getState();
      
      expect(() => {
        state.setEarthPlanet(null);
      }).not.toThrow();
      
      expect(() => {
        state.setEarthPlanet(undefined as any);
      }).not.toThrow();
    });
  });
});
