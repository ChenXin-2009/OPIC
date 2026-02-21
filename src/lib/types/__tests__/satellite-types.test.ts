/**
 * 卫星类型系统验证测试
 * 验证所有类型定义和配置是否正确导出和使用
 */

import {
  OrbitType,
  SatelliteCategory,
  TLEData,
  SatelliteState,
  OrbitalElements,
  SatelliteAPIResponse,
  ECIPosition,
  PropagationResult,
  SatelliteConfig
} from '../index';

import {
  satelliteConfig,
  EARTH_RADIUS,
  ORBIT_ALTITUDE_THRESHOLDS,
  getOrbitType
} from '../../config/satelliteConfig';

describe('卫星类型系统验证', () => {
  describe('枚举类型', () => {
    test('OrbitType枚举应包含所有轨道类型', () => {
      expect(OrbitType.LEO).toBe('LEO');
      expect(OrbitType.MEO).toBe('MEO');
      expect(OrbitType.GEO).toBe('GEO');
      expect(OrbitType.HEO).toBe('HEO');
    });

    test('SatelliteCategory枚举应包含所有卫星类别', () => {
      expect(SatelliteCategory.ACTIVE).toBe('active');
      expect(SatelliteCategory.ISS).toBe('stations');
      expect(SatelliteCategory.GPS).toBe('gps-ops');
      expect(SatelliteCategory.COMMUNICATION).toBe('geo');
      expect(SatelliteCategory.WEATHER).toBe('weather');
      expect(SatelliteCategory.SCIENCE).toBe('science');
      expect(SatelliteCategory.OTHER).toBe('other');
    });
  });

  describe('配置验证', () => {
    test('satelliteConfig应包含所有必需的配置项', () => {
      expect(satelliteConfig.api).toBeDefined();
      expect(satelliteConfig.rendering).toBeDefined();
      expect(satelliteConfig.computation).toBeDefined();
      expect(satelliteConfig.ui).toBeDefined();
    });

    test('API配置应有合理的默认值', () => {
      expect(satelliteConfig.api.endpoint).toBe('/api/satellites');
      expect(satelliteConfig.api.cacheTime).toBe(2 * 60 * 60 * 1000);
      expect(satelliteConfig.api.retryAttempts).toBe(3);
      expect(satelliteConfig.api.timeout).toBe(10000);
    });

    test('渲染配置应有合理的默认值', () => {
      expect(satelliteConfig.rendering.maxSatellites).toBe(100000);
      expect(satelliteConfig.rendering.pointSize).toBe(0.05);
      expect(satelliteConfig.rendering.opacity).toBe(0.8);
      expect(satelliteConfig.rendering.lodDistances).toEqual([10, 50, 100]);
    });

    test('颜色配置应为所有轨道类型定义颜色', () => {
      expect(satelliteConfig.rendering.colors[OrbitType.LEO]).toBe('#00aaff');
      expect(satelliteConfig.rendering.colors[OrbitType.MEO]).toBe('#00ff00');
      expect(satelliteConfig.rendering.colors[OrbitType.GEO]).toBe('#ff0000');
      expect(satelliteConfig.rendering.colors[OrbitType.HEO]).toBe('#ffffff');
    });

    test('计算配置应有合理的默认值', () => {
      expect(satelliteConfig.computation.maxBatchSize).toBe(1000);
      expect(satelliteConfig.computation.workerCount).toBe(1);
      expect(satelliteConfig.computation.cacheSize).toBe(10000);
    });

    test('UI配置应有合理的默认值', () => {
      expect(satelliteConfig.ui.maxOrbits).toBe(10);
      expect(satelliteConfig.ui.searchDebounce).toBe(300);
      expect(satelliteConfig.ui.updateInterval).toBe(16);
    });
  });

  describe('常量验证', () => {
    test('EARTH_RADIUS应为6371km', () => {
      expect(EARTH_RADIUS).toBe(6371);
    });

    test('ORBIT_ALTITUDE_THRESHOLDS应定义所有阈值', () => {
      expect(ORBIT_ALTITUDE_THRESHOLDS.LEO_MAX).toBe(2000);
      expect(ORBIT_ALTITUDE_THRESHOLDS.MEO_MAX).toBe(35786);
      expect(ORBIT_ALTITUDE_THRESHOLDS.GEO_ALTITUDE).toBe(35786);
      expect(ORBIT_ALTITUDE_THRESHOLDS.GEO_TOLERANCE).toBe(100);
    });
  });

  describe('getOrbitType函数', () => {
    test('应正确识别LEO轨道', () => {
      expect(getOrbitType(500, 0.01)).toBe(OrbitType.LEO);
      expect(getOrbitType(1500, 0.05)).toBe(OrbitType.LEO);
    });

    test('应正确识别MEO轨道', () => {
      expect(getOrbitType(10000, 0.01)).toBe(OrbitType.MEO);
      expect(getOrbitType(20000, 0.05)).toBe(OrbitType.MEO);
    });

    test('应正确识别GEO轨道', () => {
      expect(getOrbitType(35786, 0.01)).toBe(OrbitType.GEO);
      expect(getOrbitType(35786 + 50, 0.01)).toBe(OrbitType.GEO);
      expect(getOrbitType(35786 - 50, 0.01)).toBe(OrbitType.GEO);
    });

    test('应正确识别HEO轨道(基于偏心率)', () => {
      expect(getOrbitType(10000, 0.3)).toBe(OrbitType.HEO);
      expect(getOrbitType(20000, 0.5)).toBe(OrbitType.HEO);
    });

    test('应正确识别HEO轨道(基于高度)', () => {
      expect(getOrbitType(40000, 0.01)).toBe(OrbitType.HEO);
      expect(getOrbitType(50000, 0.05)).toBe(OrbitType.HEO);
    });
  });

  describe('类型接口验证', () => {
    test('TLEData接口应可正确实例化', () => {
      const tleData: TLEData = {
        name: 'ISS (ZARYA)',
        noradId: 25544,
        line1: '1 25544U 98067A   21001.00000000  .00002182  00000-0  41420-4 0  9990',
        line2: '2 25544  51.6461 339.8014 0002571  34.5857 120.4689 15.48919393265019',
        category: SatelliteCategory.ISS,
        epoch: new Date('2021-01-01')
      };

      expect(tleData.name).toBe('ISS (ZARYA)');
      expect(tleData.noradId).toBe(25544);
      expect(tleData.category).toBe(SatelliteCategory.ISS);
    });

    test('OrbitalElements接口应可正确实例化', () => {
      const elements: OrbitalElements = {
        inclination: 51.6,
        eccentricity: 0.0002,
        meanMotion: 15.5,
        semiMajorAxis: 6800,
        period: 92.5,
        apogee: 420,
        perigee: 410
      };

      expect(elements.inclination).toBe(51.6);
      expect(elements.period).toBe(92.5);
    });

    test('ECIPosition接口应可正确实例化', () => {
      const position: ECIPosition = {
        x: 6800,
        y: 0,
        z: 0
      };

      expect(position.x).toBe(6800);
    });
  });
});
