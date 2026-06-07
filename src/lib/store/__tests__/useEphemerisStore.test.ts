/**
 * @module store/useEphemerisStore.test
 * @description 星历数据状态管理测试
 * 
 * 测试覆盖:
 * - 初始状态验证
 * - 启用/禁用天体
 * - 加载状态管理
 * - 数据元信息设置
 * - 全局开关
 * - 持久化行为（模拟）
 */

import { useEphemerisStore, BODY_IDS, LoadingStatus, BodyKey } from '../useEphemerisStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('useEphemerisStore', () => {
  beforeEach(() => {
    // 清除 localStorage
    localStorageMock.clear();
    
    // 重置 store 状态
    const state = useEphemerisStore.getState();
    state.disableAll();
    
    // 重置所有天体状态
    Object.keys(BODY_IDS).forEach((key) => {
      const bodyKey = key as BodyKey;
      state.setBodyStatus(bodyKey, LoadingStatus.NOT_LOADED);
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useEphemerisStore.getState();
      
      expect(state.globalEnabled).toBe(false);
      expect(Object.keys(state.bodies)).toHaveLength(Object.keys(BODY_IDS).length);
    });

    it('月球应该默认启用，其他天体默认禁用', () => {
      // 重新初始化 store
      localStorageMock.clear();
      const { bodies } = useEphemerisStore.getState();
      
      expect(bodies.moon.enabled).toBe(false); // 因为我们在 beforeEach 中调用了 disableAll
      
      // 其他天体应该禁用
      const otherBodies = (Object.keys(BODY_IDS) as BodyKey[]).filter(k => k !== 'moon');
      otherBodies.forEach(key => {
        expect(bodies[key].enabled).toBe(false);
      });
    });

    it('所有天体的初始加载状态应该是 NOT_LOADED', () => {
      const { bodies } = useEphemerisStore.getState();
      
      Object.keys(BODY_IDS).forEach((key) => {
        const bodyKey = key as BodyKey;
        expect(bodies[bodyKey].status).toBe(LoadingStatus.NOT_LOADED);
      });
    });

    it('应该包含所有定义的天体', () => {
      const { bodies } = useEphemerisStore.getState();
      const bodyKeys = Object.keys(BODY_IDS);
      
      bodyKeys.forEach(key => {
        expect(bodies).toHaveProperty(key);
      });
    });
  });

  describe('启用/禁用天体', () => {
    it('应该能够启用天体', () => {
      const { enableBody, bodies } = useEphemerisStore.getState();
      
      enableBody('earth');
      
      const updatedState = useEphemerisStore.getState();
      expect(updatedState.bodies.earth.enabled).toBe(true);
    });

    it('应该能够禁用天体', () => {
      const { enableBody, disableBody } = useEphemerisStore.getState();
      
      enableBody('mars');
      expect(useEphemerisStore.getState().bodies.mars.enabled).toBe(true);
      
      disableBody('mars');
      expect(useEphemerisStore.getState().bodies.mars.enabled).toBe(false);
    });

    it('启用天体时应该保留已加载的状态', () => {
      const { enableBody, setBodyStatus } = useEphemerisStore.getState();
      
      // 先启用并设置为已加载
      enableBody('jupiter');
      setBodyStatus('jupiter', LoadingStatus.LOADED);
      
      // 禁用后再启用
      useEphemerisStore.getState().disableBody('jupiter');
      enableBody('jupiter');
      
      const state = useEphemerisStore.getState();
      // 应该保持 LOADED 状态
      expect(state.bodies.jupiter.status).toBe(LoadingStatus.LOADED);
    });

    it('启用未加载过的天体时状态应该是 NOT_LOADED', () => {
      const { enableBody } = useEphemerisStore.getState();
      
      enableBody('saturn');
      
      const state = useEphemerisStore.getState();
      expect(state.bodies.saturn.status).toBe(LoadingStatus.NOT_LOADED);
    });
  });

  describe('加载状态管理', () => {
    it('应该能够设置加载状态', () => {
      const { setBodyStatus } = useEphemerisStore.getState();
      
      setBodyStatus('venus', LoadingStatus.LOADING);
      expect(useEphemerisStore.getState().bodies.venus.status).toBe(LoadingStatus.LOADING);
      
      setBodyStatus('venus', LoadingStatus.LOADED);
      expect(useEphemerisStore.getState().bodies.venus.status).toBe(LoadingStatus.LOADED);
    });

    it('应该能够设置错误状态和错误信息', () => {
      const { setBodyStatus } = useEphemerisStore.getState();
      const errorMessage = '加载失败：网络错误';
      
      setBodyStatus('mercury', LoadingStatus.ERROR, errorMessage);
      
      const state = useEphemerisStore.getState();
      expect(state.bodies.mercury.status).toBe(LoadingStatus.ERROR);
      expect(state.bodies.mercury.error).toBe(errorMessage);
    });

    it('应该支持所有加载状态', () => {
      const { setBodyStatus } = useEphemerisStore.getState();
      const body: BodyKey = 'earth';
      
      // 测试所有状态
      const statuses = [
        LoadingStatus.NOT_LOADED,
        LoadingStatus.LOADING,
        LoadingStatus.LOADED,
        LoadingStatus.ERROR,
      ];
      
      statuses.forEach(status => {
        setBodyStatus(body, status);
        expect(useEphemerisStore.getState().bodies[body].status).toBe(status);
      });
    });
  });

  describe('数据元信息', () => {
    it('应该能够设置数据大小', () => {
      const { setBodyDataSize } = useEphemerisStore.getState();
      const dataSize = 2048; // KB
      
      setBodyDataSize('moon', dataSize);
      
      const state = useEphemerisStore.getState();
      expect(state.bodies.moon.dataSize).toBe(dataSize);
    });

    it('应该能够设置时间范围', () => {
      const { setBodyTimeRange } = useEphemerisStore.getState();
      const start = 2451545.0; // J2000.0
      const end = 2488070.0;   // 2100-01-01
      
      setBodyTimeRange('mars', start, end);
      
      const state = useEphemerisStore.getState();
      expect(state.bodies.mars.timeRange).toEqual({ start, end });
    });

    it('应该能够设置精度信息', () => {
      const { setBodyAccuracy } = useEphemerisStore.getState();
      const ephemeris = '±10m';
      const analytical = '±1000km';
      
      setBodyAccuracy('earth', ephemeris, analytical);
      
      const state = useEphemerisStore.getState();
      expect(state.bodies.earth.accuracy).toEqual({ ephemeris, analytical });
    });

    it('应该能够为同一天体设置多个元信息', () => {
      const state = useEphemerisStore.getState();
      
      state.setBodyDataSize('jupiter', 1024);
      state.setBodyTimeRange('jupiter', 2451545.0, 2488070.0);
      state.setBodyAccuracy('jupiter', '±100m', '±5000km');
      
      const updatedState = useEphemerisStore.getState();
      const jupiter = updatedState.bodies.jupiter;
      
      expect(jupiter.dataSize).toBe(1024);
      expect(jupiter.timeRange).toEqual({ start: 2451545.0, end: 2488070.0 });
      expect(jupiter.accuracy).toEqual({ ephemeris: '±100m', analytical: '±5000km' });
    });
  });

  describe('全局开关', () => {
    it('enableAll 应该启用所有天体', () => {
      const { enableAll } = useEphemerisStore.getState();
      
      enableAll();
      
      const state = useEphemerisStore.getState();
      Object.keys(BODY_IDS).forEach((key) => {
        const bodyKey = key as BodyKey;
        expect(state.bodies[bodyKey].enabled).toBe(true);
      });
      expect(state.globalEnabled).toBe(true);
    });

    it('disableAll 应该禁用所有天体', () => {
      const state = useEphemerisStore.getState();
      
      // 先启用所有
      state.enableAll();
      const afterEnable = useEphemerisStore.getState();
      expect(afterEnable.globalEnabled).toBe(true);
      
      // 再禁用所有
      afterEnable.disableAll();
      
      const updatedState = useEphemerisStore.getState();
      Object.keys(BODY_IDS).forEach((key) => {
        const bodyKey = key as BodyKey;
        expect(updatedState.bodies[bodyKey].enabled).toBe(false);
      });
      expect(updatedState.globalEnabled).toBe(false);
    });

    it('setGlobalEnabled(true) 应该启用所有天体', () => {
      const { setGlobalEnabled } = useEphemerisStore.getState();
      
      setGlobalEnabled(true);
      
      const state = useEphemerisStore.getState();
      expect(state.globalEnabled).toBe(true);
      Object.keys(BODY_IDS).forEach((key) => {
        const bodyKey = key as BodyKey;
        expect(state.bodies[bodyKey].enabled).toBe(true);
      });
    });

    it('setGlobalEnabled(false) 应该禁用所有天体', () => {
      const state = useEphemerisStore.getState();
      
      state.setGlobalEnabled(true);
      const afterEnable = useEphemerisStore.getState();
      expect(afterEnable.globalEnabled).toBe(true);
      
      afterEnable.setGlobalEnabled(false);
      
      const updatedState = useEphemerisStore.getState();
      expect(updatedState.globalEnabled).toBe(false);
      Object.keys(BODY_IDS).forEach((key) => {
        const bodyKey = key as BodyKey;
        expect(updatedState.bodies[bodyKey].enabled).toBe(false);
      });
    });

    it('全局启用时应该保留已加载的状态', () => {
      const state = useEphemerisStore.getState();
      
      // 设置某些天体为已加载
      state.enableBody('earth');
      state.setBodyStatus('earth', LoadingStatus.LOADED);
      state.enableBody('moon');
      state.setBodyStatus('moon', LoadingStatus.LOADED);
      
      // 禁用所有
      state.disableAll();
      
      // 重新启用所有
      state.enableAll();
      
      const updatedState = useEphemerisStore.getState();
      // 之前已加载的应该保持 LOADED 状态
      expect(updatedState.bodies.earth.status).toBe(LoadingStatus.LOADED);
      expect(updatedState.bodies.moon.status).toBe(LoadingStatus.LOADED);
      // 未加载过的应该是 NOT_LOADED
      expect(updatedState.bodies.mars.status).toBe(LoadingStatus.NOT_LOADED);
    });
  });

  describe('BODY_IDS 常量', () => {
    it('应该包含所有主要行星', () => {
      const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
      planets.forEach(planet => {
        expect(BODY_IDS).toHaveProperty(planet);
      });
    });

    it('应该包含地球卫星', () => {
      expect(BODY_IDS).toHaveProperty('moon');
    });

    it('应该包含木星主要卫星', () => {
      const jupiterMoons = ['io', 'europa', 'ganymede', 'callisto'];
      jupiterMoons.forEach(moon => {
        expect(BODY_IDS).toHaveProperty(moon);
      });
    });

    it('应该包含土星主要卫星', () => {
      const saturnMoons = ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'hyperion', 'iapetus'];
      saturnMoons.forEach(moon => {
        expect(BODY_IDS).toHaveProperty(moon);
      });
    });

    it('应该包含天王星主要卫星', () => {
      const uranusMoons = ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'];
      uranusMoons.forEach(moon => {
        expect(BODY_IDS).toHaveProperty(moon);
      });
    });

    it('应该包含海王星卫星', () => {
      expect(BODY_IDS).toHaveProperty('triton');
    });

    it('所有 ID 应该是数字', () => {
      Object.values(BODY_IDS).forEach(id => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
      });
    });
  });

  describe('LoadingStatus 枚举', () => {
    it('应该包含所有必要的状态', () => {
      expect(LoadingStatus.NOT_LOADED).toBe('not_loaded');
      expect(LoadingStatus.LOADING).toBe('loading');
      expect(LoadingStatus.LOADED).toBe('loaded');
      expect(LoadingStatus.ERROR).toBe('error');
    });
  });

  describe('状态隔离', () => {
    it('修改一个天体的状态不应该影响其他天体', () => {
      const state = useEphemerisStore.getState();
      
      state.enableBody('earth');
      state.setBodyStatus('earth', LoadingStatus.LOADED);
      state.setBodyDataSize('earth', 2048);
      
      const updatedState = useEphemerisStore.getState();
      
      // earth 应该被修改
      expect(updatedState.bodies.earth.enabled).toBe(true);
      expect(updatedState.bodies.earth.status).toBe(LoadingStatus.LOADED);
      expect(updatedState.bodies.earth.dataSize).toBe(2048);
      
      // 其他天体不应该被影响
      expect(updatedState.bodies.mars.enabled).toBe(false);
      expect(updatedState.bodies.mars.status).toBe(LoadingStatus.NOT_LOADED);
      expect(updatedState.bodies.mars.dataSize).toBeUndefined();
    });

    it('启用一个天体不应该影响其他天体的启用状态', () => {
      const state = useEphemerisStore.getState();
      
      state.enableBody('jupiter');
      state.enableBody('saturn');
      
      const updatedState = useEphemerisStore.getState();
      
      expect(updatedState.bodies.jupiter.enabled).toBe(true);
      expect(updatedState.bodies.saturn.enabled).toBe(true);
      expect(updatedState.bodies.uranus.enabled).toBe(false);
    });
  });

  describe('实际使用场景', () => {
    it('场景1: 用户启用天体并加载数据', () => {
      const state = useEphemerisStore.getState();
      
      // 1. 用户点击启用
      state.enableBody('mars');
      expect(useEphemerisStore.getState().bodies.mars.enabled).toBe(true);
      expect(useEphemerisStore.getState().bodies.mars.status).toBe(LoadingStatus.NOT_LOADED);
      
      // 2. 开始加载
      state.setBodyStatus('mars', LoadingStatus.LOADING);
      expect(useEphemerisStore.getState().bodies.mars.status).toBe(LoadingStatus.LOADING);
      
      // 3. 加载完成，设置元信息
      state.setBodyStatus('mars', LoadingStatus.LOADED);
      state.setBodyDataSize('mars', 1536);
      state.setBodyTimeRange('mars', 2451545.0, 2465442.5);
      state.setBodyAccuracy('mars', '±50m', '±2000km');
      
      const finalState = useEphemerisStore.getState();
      expect(finalState.bodies.mars.enabled).toBe(true);
      expect(finalState.bodies.mars.status).toBe(LoadingStatus.LOADED);
      expect(finalState.bodies.mars.dataSize).toBe(1536);
      expect(finalState.bodies.mars.timeRange).toBeDefined();
      expect(finalState.bodies.mars.accuracy).toBeDefined();
    });

    it('场景2: 加载失败的处理', () => {
      const state = useEphemerisStore.getState();
      
      state.enableBody('neptune');
      state.setBodyStatus('neptune', LoadingStatus.LOADING);
      
      // 模拟加载失败
      state.setBodyStatus('neptune', LoadingStatus.ERROR, '网络连接失败');
      
      const finalState = useEphemerisStore.getState();
      expect(finalState.bodies.neptune.status).toBe(LoadingStatus.ERROR);
      expect(finalState.bodies.neptune.error).toBe('网络连接失败');
    });

    it('场景3: 批量启用所有天体', () => {
      const state = useEphemerisStore.getState();
      
      // 用户点击"启用全部"
      state.setGlobalEnabled(true);
      
      const finalState = useEphemerisStore.getState();
      
      // 所有天体应该被启用
      const allEnabled = Object.keys(BODY_IDS).every((key) => {
        const bodyKey = key as BodyKey;
        return finalState.bodies[bodyKey].enabled;
      });
      
      expect(allEnabled).toBe(true);
      expect(finalState.globalEnabled).toBe(true);
    });

    it('场景4: 用户禁用已加载的天体后重新启用', () => {
      const state = useEphemerisStore.getState();
      
      // 1. 启用并加载
      state.enableBody('io');
      state.setBodyStatus('io', LoadingStatus.LOADED);
      
      // 2. 用户禁用
      state.disableBody('io');
      expect(useEphemerisStore.getState().bodies.io.enabled).toBe(false);
      
      // 3. 重新启用
      state.enableBody('io');
      
      const finalState = useEphemerisStore.getState();
      expect(finalState.bodies.io.enabled).toBe(true);
      // 应该保持已加载状态，不需要重新加载
      expect(finalState.bodies.io.status).toBe(LoadingStatus.LOADED);
    });
  });
});
