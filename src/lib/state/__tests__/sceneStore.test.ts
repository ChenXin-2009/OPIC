/**
 * @module state/sceneStore.test
 * @description 3D 场景状态管理测试
 * 
 * 测试覆盖:
 * - 初始状态验证
 * - SceneManager 设置
 * - CameraController 设置
 * - 状态独立性
 */

import { useSceneStore } from '../sceneStore';

// Mock SceneManager 和 CameraController
const mockSceneManager = {
  name: 'MockSceneManager',
  dispose: jest.fn(),
  update: jest.fn(),
} as any;

const mockCameraController = {
  name: 'MockCameraController',
  update: jest.fn(),
  reset: jest.fn(),
} as any;

describe('useSceneStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useSceneStore.setState({
      sceneManager: null,
      cameraController: null,
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useSceneStore.getState();
      
      expect(state.sceneManager).toBeNull();
      expect(state.cameraController).toBeNull();
    });

    it('应该有 setSceneManager 方法', () => {
      const state = useSceneStore.getState();
      expect(typeof state.setSceneManager).toBe('function');
    });

    it('应该有 setCameraController 方法', () => {
      const state = useSceneStore.getState();
      expect(typeof state.setCameraController).toBe('function');
    });
  });

  describe('setSceneManager', () => {
    it('应该能够设置 SceneManager', () => {
      const state = useSceneStore.getState();
      
      state.setSceneManager(mockSceneManager);
      
      const updatedState = useSceneStore.getState();
      expect(updatedState.sceneManager).toBe(mockSceneManager);
    });

    it('应该能够更新 SceneManager', () => {
      const state = useSceneStore.getState();
      
      const firstManager = { ...mockSceneManager, name: 'First' } as any;
      const secondManager = { ...mockSceneManager, name: 'Second' } as any;
      
      state.setSceneManager(firstManager);
      expect(useSceneStore.getState().sceneManager).toBe(firstManager);
      
      state.setSceneManager(secondManager);
      expect(useSceneStore.getState().sceneManager).toBe(secondManager);
    });

    it('应该能够清除 SceneManager', () => {
      const state = useSceneStore.getState();
      
      state.setSceneManager(mockSceneManager);
      expect(useSceneStore.getState().sceneManager).not.toBeNull();
      
      state.setSceneManager(null as any);
      expect(useSceneStore.getState().sceneManager).toBeNull();
    });
  });

  describe('setCameraController', () => {
    it('应该能够设置 CameraController', () => {
      const state = useSceneStore.getState();
      
      state.setCameraController(mockCameraController);
      
      const updatedState = useSceneStore.getState();
      expect(updatedState.cameraController).toBe(mockCameraController);
    });

    it('应该能够更新 CameraController', () => {
      const state = useSceneStore.getState();
      
      const firstController = { ...mockCameraController, name: 'First' } as any;
      const secondController = { ...mockCameraController, name: 'Second' } as any;
      
      state.setCameraController(firstController);
      expect(useSceneStore.getState().cameraController).toBe(firstController);
      
      state.setCameraController(secondController);
      expect(useSceneStore.getState().cameraController).toBe(secondController);
    });

    it('应该能够清除 CameraController', () => {
      const state = useSceneStore.getState();
      
      state.setCameraController(mockCameraController);
      expect(useSceneStore.getState().cameraController).not.toBeNull();
      
      state.setCameraController(null as any);
      expect(useSceneStore.getState().cameraController).toBeNull();
    });
  });

  describe('状态独立性', () => {
    it('设置 SceneManager 不应该影响 CameraController', () => {
      const state = useSceneStore.getState();
      
      state.setCameraController(mockCameraController);
      state.setSceneManager(mockSceneManager);
      
      const updatedState = useSceneStore.getState();
      expect(updatedState.sceneManager).toBe(mockSceneManager);
      expect(updatedState.cameraController).toBe(mockCameraController);
    });

    it('设置 CameraController 不应该影响 SceneManager', () => {
      const state = useSceneStore.getState();
      
      state.setSceneManager(mockSceneManager);
      state.setCameraController(mockCameraController);
      
      const updatedState = useSceneStore.getState();
      expect(updatedState.sceneManager).toBe(mockSceneManager);
      expect(updatedState.cameraController).toBe(mockCameraController);
    });

    it('清除 SceneManager 不应该影响 CameraController', () => {
      const state = useSceneStore.getState();
      
      state.setSceneManager(mockSceneManager);
      state.setCameraController(mockCameraController);
      
      state.setSceneManager(null as any);
      
      const updatedState = useSceneStore.getState();
      expect(updatedState.sceneManager).toBeNull();
      expect(updatedState.cameraController).toBe(mockCameraController);
    });
  });

  describe('实际使用场景', () => {
    it('场景1: 应用初始化时设置实例', () => {
      const state = useSceneStore.getState();
      
      // 1. 创建 SceneManager
      state.setSceneManager(mockSceneManager);
      expect(useSceneStore.getState().sceneManager).not.toBeNull();
      
      // 2. 创建 CameraController
      state.setCameraController(mockCameraController);
      expect(useSceneStore.getState().cameraController).not.toBeNull();
      
      // 3. 两者都可用
      const finalState = useSceneStore.getState();
      expect(finalState.sceneManager).toBe(mockSceneManager);
      expect(finalState.cameraController).toBe(mockCameraController);
    });

    it('场景2: 应用卸载时清理实例', () => {
      const state = useSceneStore.getState();
      
      // 设置实例
      state.setSceneManager(mockSceneManager);
      state.setCameraController(mockCameraController);
      
      // 清理
      state.setSceneManager(null as any);
      state.setCameraController(null as any);
      
      const finalState = useSceneStore.getState();
      expect(finalState.sceneManager).toBeNull();
      expect(finalState.cameraController).toBeNull();
    });

    it('场景3: 热重载时替换实例', () => {
      const state = useSceneStore.getState();
      
      // 初始实例
      const oldManager = { ...mockSceneManager, version: 1 } as any;
      const oldController = { ...mockCameraController, version: 1 } as any;
      
      state.setSceneManager(oldManager);
      state.setCameraController(oldController);
      
      // 替换为新实例
      const newManager = { ...mockSceneManager, version: 2 } as any;
      const newController = { ...mockCameraController, version: 2 } as any;
      
      state.setSceneManager(newManager);
      state.setCameraController(newController);
      
      const finalState = useSceneStore.getState();
      expect(finalState.sceneManager).toBe(newManager);
      expect(finalState.cameraController).toBe(newController);
    });
  });

  describe('类型安全', () => {
    it('应该接受符合接口的对象', () => {
      const state = useSceneStore.getState();
      
      const validManager = {
        getScene: () => ({}),
        getCamera: () => ({}),
        update: () => {},
      } as any;
      
      expect(() => {
        state.setSceneManager(validManager);
      }).not.toThrow();
      
      expect(useSceneStore.getState().sceneManager).toBe(validManager);
    });

    it('应该接受 null', () => {
      const state = useSceneStore.getState();
      
      state.setSceneManager(mockSceneManager);
      
      expect(() => {
        state.setSceneManager(null as any);
      }).not.toThrow();
      
      expect(useSceneStore.getState().sceneManager).toBeNull();
    });
  });
});
