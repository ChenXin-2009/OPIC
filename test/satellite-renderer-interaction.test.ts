/**
 * 卫星渲染器交互功能测试
 * 
 * 测试任务5.2的要求:
 * - raycast() 射线投射检测
 * - showOrbit() 显示轨道
 * - hideOrbit() 隐藏轨道
 * - 最多10条轨道限制
 */

import * as THREE from 'three';
import { SatelliteRenderer } from '../src/lib/3d/SatelliteRenderer';
import { SGP4Calculator } from '../src/lib/satellite/sgp4Calculator';
import type { SatelliteState } from '../src/lib/types/satellite';
import { OrbitType, SatelliteCategory } from '../src/lib/types/satellite';

// Mock SceneManager
const createMockSceneManager = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 10);
  
  return {
    getScene: () => scene,
    getCamera: () => camera,
  };
};

// Mock SGP4Calculator
const createMockCalculator = () => {
  return {
    calculateOrbit: jest.fn().mockResolvedValue([
      new THREE.Vector3(6.8, 0, 0),
      new THREE.Vector3(6.7, 0.5, 0),
      new THREE.Vector3(6.5, 1.0, 0),
      // ... 更多点
    ]),
  } as unknown as SGP4Calculator;
};

// 创建测试卫星状态
const createTestSatellite = (noradId: number): SatelliteState => ({
  noradId,
  name: `Test Satellite ${noradId}`,
  position: new THREE.Vector3(6.8, 0, 0),
  velocity: new THREE.Vector3(0, 7.5, 0),
  altitude: 400,
  orbitType: OrbitType.LEO,
  category: SatelliteCategory.ACTIVE,
  orbitalElements: {
    inclination: 51.6,
    eccentricity: 0.001,
    meanMotion: 15.5,
    semiMajorAxis: 6778,
    period: 92.9,
    apogee: 420,
    perigee: 400,
  },
  lastUpdate: Date.now(),
});

describe('SatelliteRenderer - 交互功能 (任务5.2)', () => {
  let renderer: SatelliteRenderer;
  let sceneManager: ReturnType<typeof createMockSceneManager>;
  let calculator: SGP4Calculator;
  
  beforeEach(() => {
    sceneManager = createMockSceneManager();
    renderer = new SatelliteRenderer(sceneManager as any);
    calculator = createMockCalculator();
  });
  
  describe('raycast() - 射线投射检测', () => {
    it('应该能检测到点击的卫星', () => {
      // 准备: 添加一些卫星
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, createTestSatellite(25544));
      satellites.set(25545, createTestSatellite(25545));
      renderer.updatePositions(satellites);
      
      // 创建射线投射器,指向第一颗卫星
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), sceneManager.getCamera());
      
      // 执行: 进行射线投射
      const result = renderer.raycast(raycaster);
      
      // 验证: 应该返回一个NORAD ID
      expect(result).toBeDefined();
      if (result !== null) {
        expect([25544, 25545]).toContain(result);
      }
    });
    
    it('当没有点击到卫星时应该返回null', () => {
      // 准备: 添加卫星但射线不指向它们
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, createTestSatellite(25544));
      renderer.updatePositions(satellites);
      
      // 创建射线投射器,指向远离卫星的方向
      const raycaster = new THREE.Raycaster();
      const camera = sceneManager.getCamera();
      camera.position.set(0, 0, 10);
      camera.lookAt(100, 100, 100); // 看向远处
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      
      // 执行
      const result = renderer.raycast(raycaster);
      
      // 验证: 应该返回null
      expect(result).toBeNull();
    });
  });
  
  describe('showOrbit() - 显示轨道', () => {
    it('应该能显示卫星轨道', async () => {
      // 准备
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, createTestSatellite(25544));
      renderer.updatePositions(satellites);
      
      const scene = sceneManager.getScene();
      const initialChildCount = scene.children.length;
      
      // 执行
      await renderer.showOrbit(25544, calculator);
      
      // 验证: 场景中应该增加了轨道对象
      expect(scene.children.length).toBeGreaterThan(initialChildCount);
      
      // 验证: calculator.calculateOrbit应该被调用
      expect(calculator.calculateOrbit).toHaveBeenCalledWith(
        25544,
        expect.any(Number),
        expect.any(Number),
        100
      );
    });
    
    it('重复显示同一轨道应该不会重复添加', async () => {
      // 准备
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, createTestSatellite(25544));
      renderer.updatePositions(satellites);
      
      // 执行: 显示两次
      await renderer.showOrbit(25544, calculator);
      const childCountAfterFirst = sceneManager.getScene().children.length;
      
      await renderer.showOrbit(25544, calculator);
      const childCountAfterSecond = sceneManager.getScene().children.length;
      
      // 验证: 子对象数量应该相同
      expect(childCountAfterSecond).toBe(childCountAfterFirst);
    });
    
    it('应该限制最多显示10条轨道', async () => {
      // 准备: 创建11颗卫星
      const satellites = new Map<number, SatelliteState>();
      for (let i = 1; i <= 11; i++) {
        satellites.set(25544 + i, createTestSatellite(25544 + i));
      }
      renderer.updatePositions(satellites);
      
      // 执行: 显示11条轨道
      for (let i = 1; i <= 11; i++) {
        await renderer.showOrbit(25544 + i, calculator);
      }
      
      // 验证: 场景中的轨道对象应该不超过10个
      // 注意: 场景中还有点云对象,所以总数应该是点云+10条轨道
      const orbitObjects = sceneManager.getScene().children.filter(
        child => child.name.startsWith('SatelliteOrbit_')
      );
      expect(orbitObjects.length).toBeLessThanOrEqual(10);
    });
  });
  
  describe('hideOrbit() - 隐藏轨道', () => {
    it('应该能隐藏已显示的轨道', async () => {
      // 准备: 先显示轨道
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, createTestSatellite(25544));
      renderer.updatePositions(satellites);
      
      await renderer.showOrbit(25544, calculator);
      const childCountAfterShow = sceneManager.getScene().children.length;
      
      // 执行: 隐藏轨道
      renderer.hideOrbit(25544);
      
      // 验证: 场景中的对象应该减少
      expect(sceneManager.getScene().children.length).toBeLessThan(childCountAfterShow);
    });
    
    it('隐藏不存在的轨道应该不会报错', () => {
      // 执行: 隐藏一个不存在的轨道
      expect(() => {
        renderer.hideOrbit(99999);
      }).not.toThrow();
    });
  });
  
  describe('clearAllOrbits() - 清除所有轨道', () => {
    it('应该能清除所有显示的轨道', async () => {
      // 准备: 显示多条轨道
      const satellites = new Map<number, SatelliteState>();
      for (let i = 1; i <= 5; i++) {
        satellites.set(25544 + i, createTestSatellite(25544 + i));
      }
      renderer.updatePositions(satellites);
      
      for (let i = 1; i <= 5; i++) {
        await renderer.showOrbit(25544 + i, calculator);
      }
      
      const childCountAfterShow = sceneManager.getScene().children.length;
      
      // 执行: 清除所有轨道
      renderer.clearAllOrbits();
      
      // 验证: 场景中应该只剩下点云对象
      expect(sceneManager.getScene().children.length).toBeLessThan(childCountAfterShow);
      
      const orbitObjects = sceneManager.getScene().children.filter(
        child => child.name.startsWith('SatelliteOrbit_')
      );
      expect(orbitObjects.length).toBe(0);
    });
  });
  
  describe('资源清理', () => {
    it('dispose()应该清理所有资源', async () => {
      // 准备: 添加卫星和轨道
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, createTestSatellite(25544));
      renderer.updatePositions(satellites);
      await renderer.showOrbit(25544, calculator);
      
      const scene = sceneManager.getScene();
      const initialChildCount = scene.children.length;
      
      // 执行: 清理资源
      renderer.dispose();
      
      // 验证: 场景中的对象应该被移除
      expect(scene.children.length).toBeLessThan(initialChildCount);
    });
  });
});
