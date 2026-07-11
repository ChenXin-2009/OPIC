/**
 * @module data/__tests__/launch-sites.test
 * @description 发射场数据库与坐标转换测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  LAUNCH_SITES,
  geodeticToECEF,
  ecefToECI,
  launchSiteToInitialState,
  getLaunchSiteById,
  validateLaunchSites,
  computeGMST,
} from '../launch-sites';
import { vecMagnitude } from '@/lib/flight-dynamics/state';
import { EARTH_RADIUS_M } from '@/lib/flight-dynamics/integrator';

describe('发射场数据库', () => {
  it('包含至少 5 个发射场', () => {
    expect(LAUNCH_SITES.length).toBeGreaterThanOrEqual(5);
  });

  it('包含必需的发射场：Cape Canaveral、拜科努尔、库鲁、酒泉、文昌', () => {
    const requiredIds = ['cape-canaveral', 'baikonur', 'kourou', 'jiuquan', 'wenchang'];
    for (const id of requiredIds) {
      const site = getLaunchSiteById(id);
      expect(site).toBeDefined();
      expect(site!.name).toBeTruthy();
      expect(site!.country).toBeTruthy();
    }
  });

  it('每个发射场都有完整的字段', () => {
    for (const site of LAUNCH_SITES) {
      expect(site.id).toBeTruthy();
      expect(site.name).toBeTruthy();
      expect(site.country).toBeTruthy();
      expect(site.lat).toBeGreaterThanOrEqual(-90);
      expect(site.lat).toBeLessThanOrEqual(90);
      expect(site.lon).toBeGreaterThanOrEqual(-180);
      expect(site.lon).toBeLessThanOrEqual(180);
      expect(site.altitude).toBeGreaterThanOrEqual(-500);
      expect(site.altitude).toBeLessThan(10000);
    }
  });

  it('validateLaunchSites 通过', () => {
    const result = validateLaunchSites();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('坐标转换 LLA → ECEF → ECI', () => {
  it('geodeticToECEF：赤道海平面点 x ≈ WGS84_A', () => {
    // lat=0, lon=0, alt=0 → ECEF [a, 0, 0]
    const ecef = geodeticToECEF(0, 0, 0);
    expect(ecef[0]).toBeCloseTo(6_378_137.0, -1);
    expect(ecef[1]).toBeCloseTo(0, -1);
    expect(ecef[2]).toBeCloseTo(0, -1);
  });

  it('geodeticToECEF：北极点 z ≈ 极半径', () => {
    // lat=90°, alt=0 → z ≈ b = a*(1-f)
    const ecef = geodeticToECEF(Math.PI / 2, 0, 0);
    const b = 6_378_137.0 * (1 - 1 / 298.257223563);
    expect(ecef[2]).toBeCloseTo(b, -1);
    expect(ecef[0]).toBeCloseTo(0, -1);
    expect(ecef[1]).toBeCloseTo(0, -1);
  });

  it('ecefToECI：GMST=0 时 ECEF = ECI', () => {
    const ecef = [7_000_000, 0, 0];
    const eci = ecefToECI(ecef, 0);
    expect(eci[0]).toBeCloseTo(ecef[0]);
    expect(eci[1]).toBeCloseTo(ecef[1]);
    expect(eci[2]).toBeCloseTo(ecef[2]);
  });

  it('ecefToECI：GMST=π/2 时绕 Z 轴旋转 90°', () => {
    const ecef = [7_000_000, 0, 0];
    const eci = ecefToECI(ecef, Math.PI / 2);
    expect(eci[0]).toBeCloseTo(0, -1);
    expect(eci[1]).toBeCloseTo(7_000_000, -1);
    expect(eci[2]).toBeCloseTo(0, -1);
  });

  it('computeGMST：J2000 历元 GMST ≈ 280.46°', () => {
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const gmst = computeGMST(j2000);
    const gmstDeg = (gmst * 180) / Math.PI;
    expect(gmstDeg).toBeGreaterThan(280);
    expect(gmstDeg).toBeLessThan(281);
  });
});

describe('launchSiteToInitialState', () => {
  it('发射场初始位置模长 ≈ 地球半径 + 海拔', () => {
    const site = getLaunchSiteById('cape-canaveral')!;
    const date = new Date(Date.UTC(2025, 0, 1, 12, 0, 0));
    const state = launchSiteToInitialState(site, date);

    const rMag = vecMagnitude(state.position);
    const expectedR = EARTH_RADIUS_M + site.altitude;
    // 球面近似 vs WGS84 椭球，容差 20 km
    expect(Math.abs(rMag - expectedR)).toBeLessThan(20_000);
  });

  it('发射场初始速度来自地球自转（赤道附近 ≈ 465 m/s）', () => {
    const site = getLaunchSiteById('kourou')!; // 纬度 ~5°，接近赤道
    const date = new Date(Date.UTC(2025, 0, 1, 12, 0, 0));
    const state = launchSiteToInitialState(site, date);

    const vMag = vecMagnitude(state.velocity);
    // 赤道自转速度 ≈ 465 m/s，库鲁纬度 5° 应略低
    expect(vMag).toBeGreaterThan(450);
    expect(vMag).toBeLessThan(470);
  });

  it('高纬度发射场自转速度较低（拜科努尔 ≈ 320 m/s）', () => {
    const site = getLaunchSiteById('baikonur')!; // 纬度 ~46°
    const date = new Date(Date.UTC(2025, 0, 1, 12, 0, 0));
    const state = launchSiteToInitialState(site, date);

    const vMag = vecMagnitude(state.velocity);
    // cos(46°) × 465 ≈ 323 m/s
    expect(vMag).toBeGreaterThan(310);
    expect(vMag).toBeLessThan(340);
  });

  it('同一发射场不同时刻的 ECI 位置不同（地球自转）', () => {
    const site = getLaunchSiteById('wenchang')!;
    const t1 = new Date(Date.UTC(2025, 0, 1, 0, 0, 0));
    const t2 = new Date(Date.UTC(2025, 0, 1, 6, 0, 0)); // 6 小时后

    const s1 = launchSiteToInitialState(site, t1);
    const s2 = launchSiteToInitialState(site, t2);

    // 6 小时 = 90° 旋转，位置应该明显不同
    const dx = s1.position[0] - s2.position[0];
    const dy = s1.position[1] - s2.position[1];
    expect(Math.hypot(dx, dy)).toBeGreaterThan(1_000_000);
  });
});
