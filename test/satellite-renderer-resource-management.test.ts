/**
 * SatelliteRenderer 资源管理和优化测试
 * 
 * 测试内容:
 * - dispose() 方法正确清理资源
 * - 视锥剔除已启用
 * - 对象池复用 OrbitLine 对象
 */

import * as THREE from 'three';
import { SatelliteRenderer } from '../src/lib/3d/SatelliteRenderer';
import { SceneManager } from '../src/lib/3d/SceneManager';
import { SGP4Calculator } from '../src/lib/satellite/sgp4Calculator';
import { SatelliteState, OrbitType, SatelliteCategory } from '../src/lib/types/satellite';

describe('SatelliteRenderer - 资源管理和优化', () => {
  let sceneManager: SceneManager;
  let renderer: SatelliteRenderer;
  let calculator: SGP4Calculator;

  beforeEach(() => {
    // 创建场景管理器
    const canvas = document.createElement('canvas');
    sceneManager = new SceneManager(canvas);
    
    // 创建渲染器
    renderer = new SatelliteRenderer(sceneManager);
    
    // 创建计算器
    calculator = new SGP4Calculator();
  });

  afterEach(() => {
    // 清理资源
    renderer.dispose();
    calculator.dispose();
    sceneManager.dispose();
  });

  describe('dispose() 方法', () => {
    test('应该清理点云资源', () => {
      const scene = sceneManager.getScene();
      
      // 验证点云已添加到场景
      const pointCloud = scene.children.find(
        child => child.name === 'SatellitePointCloud'
      );
      expect(pointCloud).toBeDefined();
      
      // 调用 dispose
      renderer.dispose();
      
      // 验证点云已从场景移除
      const pointCloudAfter = scene.children.find(
        child => child.name === 'SatellitePointCloud'
      );
      expect(pointCloudAfter).toBeUndefined();
    });

    test('应该清理所有轨道曲线', async () => {
      const scene = sceneManager.getScene();
      
      // 创建测试卫星
      const satellite: SatelliteState = {
        noradId: 25544,
        name: 'ISS',
        position: new THREE.Vector3(6.8, 0, 0),
        velocity: new THREE.Vector3(0, 7.66, 0),
        altitude: 408,
        orbitType: OrbitType.LEO,
        category: SatelliteCategory.ISS,
        orbitalElements: {
          inclination: 51.6,
          eccentricity: 0.0001,
          meanMotion: 15.5,
          semiMajorAxis: 6778,
          period: 92.9,
          apogee: 410,
          perigee: 406,
        },
        lastUpdate: Date.now(),
      };
      
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, satellite);
      renderer.updatePositions(satellites);
      
      // Mock calculator.calculateOrbit
      jest.spyOn(calculator, 'calculateOrbit').mockResolvedValue([
        new THREE.Vector3(6.8, 0, 0),
        new THREE.Vector3(0, 6.8, 0),
        new THREE.Vector3(-6.8, 0, 0),
      ]);
      
      // 显示轨道
      await renderer.showOrbit(25544, calculator);
      
      // 验证轨道已添加
      const orbit = scene.children.find(
        child => child.name === 'SatelliteOrbit_25544'
      );
      expect(orbit).toBeDefined();
      
      // 调用 dispose
      renderer.dispose();
      
      // 验证轨道已移除
      const orbitAfter = scene.children.find(
        child => child.name === 'SatelliteOrbit_25544'
      );
      expect(orbitAfter).toBeUndefined();
    });

    test('应该清理对象池中的所有对象', async () => {
      // 创建测试卫星
      const satellite: SatelliteState = {
        noradId: 25544,
        name: 'ISS',
        position: new THREE.Vector3(6.8, 0, 0),
        velocity: new THREE.Vector3(0, 7.66, 0),
        altitude: 408,
        orbitType: OrbitType.LEO,
        category: SatelliteCategory.ISS,
        orbitalElements: {
          inclination: 51.6,
          eccentricity: 0.0001,
          meanMotion: 15.5,
          semiMajorAxis: 6778,
          period: 92.9,
          apogee: 410,
          perigee: 406,
        },
        lastUpdate: Date.now(),
      };
      
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, satellite);
      renderer.updatePositions(satellites);
      
      // Mock calculator.calculateOrbit
      jest.spyOn(calculator, 'calculateOrbit').mockResolvedValue([
        new THREE.Vector3(6.8, 0, 0),
        new THREE.Vector3(0, 6.8, 0),
      ]);
      
      // 显示并隐藏轨道多次,创建对象池
      await renderer.showOrbit(25544, calculator);
      renderer.hideOrbit(25544);
      
      // 此时对象池中应该有一个对象
      // dispose 应该清理它
      expect(() => renderer.dispose()).not.toThrow();
    });
  });

  describe('视锥剔除', () => {
    test('应该启用视锥剔除', () => {
      const scene = sceneManager.getScene();
      const pointCloud = scene.children.find(
        child => child.name === 'SatellitePointCloud'
      ) as THREE.Points;
      
      expect(pointCloud).toBeDefined();
      expect(pointCloud.frustumCulled).toBe(true);
    });

    test('应该在更新位置时计算包围球', () => {
      const satellite: SatelliteState = {
        noradId: 25544,
        name: 'ISS',
        position: new THREE.Vector3(6.8, 0, 0),
        velocity: new THREE.Vector3(0, 7.66, 0),
        altitude: 408,
        orbitType: OrbitType.LEO,
        category: SatelliteCategory.ISS,
        orbitalElements: {
          inclination: 51.6,
          eccentricity: 0.0001,
          meanMotion: 15.5,
          semiMajorAxis: 6778,
          period: 92.9,
          apogee: 410,
          perigee: 406,
        },
        lastUpdate: Date.now(),
      };
      
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, satellite);
      
      renderer.updatePositions(satellites);
      
      const scene = sceneManager.getScene();
      const pointCloud = scene.children.find(
        child => child.name === 'SatellitePointCloud'
      ) as THREE.Points;
      
      // 验证包围球已计算
      expect(pointCloud.geometry.boundingSphere).not.toBeNull();
    });
  });

  describe('对象池', () => {
    test('应该复用轨道线对象', async () => {
      // 创建测试卫星
      const satellite1: SatelliteState = {
        noradId: 25544,
        name: 'ISS',
        position: new THREE.Vector3(6.8, 0, 0),
        velocity: new THREE.Vector3(0, 7.66, 0),
        altitude: 408,
        orbitType: OrbitType.LEO,
        category: SatelliteCategory.ISS,
        orbitalElements: {
          inclination: 51.6,
          eccentricity: 0.0001,
          meanMotion: 15.5,
          semiMajorAxis: 6778,
          period: 92.9,
          apogee: 410,
          perigee: 406,
        },
        lastUpdate: Date.now(),
      };

      const satellite2: SatelliteState = {
        ...satellite1,
        noradId: 25545,
        name: 'HUBBLE',
      };
      
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, satellite1);
      satellites.set(25545, satellite2);
      renderer.updatePositions(satellites);
      
      // Mock calculator.calculateOrbit
      jest.spyOn(calculator, 'calculateOrbit').mockResolvedValue([
        new THREE.Vector3(6.8, 0, 0),
        new THREE.Vector3(0, 6.8, 0),
      ]);
      
      const scene = sceneManager.getScene();
      
      // 第一次显示轨道
      await renderer.showOrbit(25544, calculator);
      const orbit1 = scene.children.find(
        child => child.name === 'SatelliteOrbit_25544'
      ) as THREE.Line;
      expect(orbit1).toBeDefined();
      
      // 记录几何体和材质引用
      const geometry1 = orbit1.geometry;
      const material1 = orbit1.material;
      
      // 隐藏轨道(归还到对象池)
      renderer.hideOrbit(25544);
      
      // 显示另一个卫星的轨道(应该复用对象池中的对象)
      await renderer.showOrbit(25545, calculator);
      const orbit2 = scene.children.find(
        child => child.name === 'SatelliteOrbit_25545'
      ) as THREE.Line;
      expect(orbit2).toBeDefined();
      
      // 验证复用了相同的几何体和材质对象
      expect(orbit2.geometry).toBe(geometry1);
      expect(orbit2.material).toBe(material1);
    });

    test('应该在对象池为空时创建新对象', async () => {
      // 创建测试卫星
      const satellite: SatelliteState = {
        noradId: 25544,
        name: 'ISS',
        position: new THREE.Vector3(6.8, 0, 0),
        velocity: new THREE.Vector3(0, 7.66, 0),
        altitude: 408,
        orbitType: OrbitType.LEO,
        category: SatelliteCategory.ISS,
        orbitalElements: {
          inclination: 51.6,
          eccentricity: 0.0001,
          meanMotion: 15.5,
          semiMajorAxis: 6778,
          period: 92.9,
          apogee: 410,
          perigee: 406,
        },
        lastUpdate: Date.now(),
      };
      
      const satellites = new Map<number, SatelliteState>();
      satellites.set(25544, satellite);
      renderer.updatePositions(satellites);
      
      // Mock calculator.calculateOrbit
      jest.spyOn(calculator, 'calculateOrbit').mockResolvedValue([
        new THREE.Vector3(6.8, 0, 0),
        new THREE.Vector3(0, 6.8, 0),
      ]);
      
      // 对象池为空,应该创建新对象
      await renderer.showOrbit(25544, calculator);
      
      const scene = sceneManager.getScene();
      const orbit = scene.children.find(
        child => child.name === 'SatelliteOrbit_25544'
      );
      
      expect(orbit).toBeDefined();
    });

    test('应该限制最多10条轨道', async () => {
      // 创建11个测试卫星
      const satellites = new Map<number, SatelliteState>();
      for (let i = 0; i < 11; i++) {
        const satellite: SatelliteState = {
          noradId: 25544 + i,
          name: `SAT_${i}`,
          position: new THREE.Vector3(6.8, 0, 0),
          velocity: new THREE.Vector3(0, 7.66, 0),
          altitude: 408,
          orbitType: OrbitType.LEO,
          category: SatelliteCategory.ACTIVE,
          orbitalElements: {
            inclination: 51.6,
            eccentricity: 0.0001,
            meanMotion: 15.5,
            semiMajorAxis: 6778,
            period: 92.9,
            apogee: 410,
            perigee: 406,
          },
          lastUpdate: Date.now(),
        };
        satellites.set(25544 + i, satellite);
      }
      renderer.updatePositions(satellites);
      
      // Mock calculator.calculateOrbit
      jest.spyOn(calculator, 'calculateOrbit').mockResolvedValue([
        new THREE.Vector3(6.8, 0, 0),
        new THREE.Vector3(0, 6.8, 0),
      ]);
      
      // 显示11条轨道
      for (let i = 0; i < 11; i++) {
        await renderer.showOrbit(25544 + i, calculator);
      }
      
      const scene = sceneManager.getScene();
      
      // 验证只有10条轨道在场景中
      const orbits = scene.children.filter(
        child => child.name.startsWith('SatelliteOrbit_')
      );
      expect(orbits.length).toBe(10);
      
      // 验证第一条轨道已被移除
      const firstOrbit = scene.children.find(
        child => child.name === 'SatelliteOrbit_25544'
      );
      expect(firstOrbit).toBeUndefined();
      
      // 验证最后一条轨道存在
      const lastOrbit = scene.children.find(
        child => child.name === 'SatelliteOrbit_25554'
      );
      expect(lastOrbit).toBeDefined();
    });
  });
});
