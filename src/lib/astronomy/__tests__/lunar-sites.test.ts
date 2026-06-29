/**
 * 月球地表特征数据测试 (Lunar Sites Tests)
 *
 * 验证所有 Apollo 着陆点、环形山、月海的坐标有效性。
 * 所有断言为纯数值验证，AI 可直接确认数据正确性。
 */

import {
  APOLLO_LANDING_SITES,
  OTHER_LANDING_SITES,
  MAJOR_CRATERS,
  MAJOR_MARIA,
  ALL_LUNAR_SITES,
  validateSites,
  lunarCoordToCartesian,
  type LunarSite,
} from '../lunar-sites';

describe('lunar-sites — Apollo 着陆点', () => {
  it('should have 6 Apollo landing sites', () => {
    expect(APOLLO_LANDING_SITES).toHaveLength(6);
  });

  it('should have unique names', () => {
    const names = APOLLO_LANDING_SITES.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should have correct type "landing"', () => {
    APOLLO_LANDING_SITES.forEach(site => {
      expect(site.type).toBe('landing');
    });
  });

  it('should have valid coordinates within range', () => {
    const result = validateSites(APOLLO_LANDING_SITES);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should have years in chronological order', () => {
    const years = APOLLO_LANDING_SITES.map(s => s.year!);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBeGreaterThanOrEqual(years[i - 1]);
    }
  });

  it('should have Apollo 11 at Mare Tranquillitatis (lat 0.67, lon 23.47)', () => {
    const apollo11 = APOLLO_LANDING_SITES.find(s => s.name === 'Apollo 11')!;
    expect(apollo11).toBeDefined();
    expect(Math.abs(apollo11.lat - 0.674)).toBeLessThan(0.01);
    expect(Math.abs(apollo11.lon - 23.473)).toBeLessThan(0.01);
  });

  it('should have Apollo 17 at Taurus-Littrow (lat 20.19, lon 30.77)', () => {
    const apollo17 = APOLLO_LANDING_SITES.find(s => s.name === 'Apollo 17')!;
    expect(apollo17).toBeDefined();
    expect(Math.abs(apollo17.lat - 20.191)).toBeLessThan(0.01);
    expect(Math.abs(apollo17.lon - 30.772)).toBeLessThan(0.01);
  });
});

describe('lunar-sites — 其他着陆点', () => {
  it('should include Chang\'e-series missions', () => {
    const names = OTHER_LANDING_SITES.map(s => s.name);
    expect(names).toContain("Chang'e 3");
    expect(names).toContain("Chang'e 4");
    expect(names).toContain("Chang'e 5");
  });

  it('should have Chang\'e 4 on the far side (farside)', () => {
    const ce4 = OTHER_LANDING_SITES.find(s => s.name === "Chang'e 4")!;
    // 月球远面：lon ≈ 180°
    expect(Math.abs(ce4.lon)).toBeGreaterThan(90);
    expect(ce4.lat).toBeLessThan(0);
  });

  it('should have Chandrayaan-3', () => {
    const ch3 = OTHER_LANDING_SITES.find(s => s.name === 'Chandrayaan-3')!;
    expect(ch3).toBeDefined();
    expect(ch3.year).toBe(2023);
  });

  it('all other landing sites should have valid coordinates', () => {
    const result = validateSites(OTHER_LANDING_SITES);
    expect(result.valid).toBe(true);
  });
});

describe('lunar-sites — 环形山', () => {
  it('should have at least 8 major craters', () => {
    expect(MAJOR_CRATERS.length).toBeGreaterThanOrEqual(8);
  });

  it('should include Tycho and Copernicus', () => {
    const names = MAJOR_CRATERS.map(s => s.name);
    expect(names.some(n => n.includes('第谷') || n.includes('Tycho'))).toBe(true);
    expect(names.some(n => n.includes('哥白尼') || n.includes('Copernicus'))).toBe(true);
  });

  it('all craters should have type "crater"', () => {
    MAJOR_CRATERS.forEach(site => {
      expect(site.type).toBe('crater');
    });
  });

  it('all craters should have valid coordinates', () => {
    const result = validateSites(MAJOR_CRATERS);
    expect(result.valid).toBe(true);
  });
});

describe('lunar-sites — 月海', () => {
  it('should have at least 8 major maria', () => {
    expect(MAJOR_MARIA.length).toBeGreaterThanOrEqual(8);
  });

  it('should include Mare Tranquillitatis and Oceanus Procellarum', () => {
    const names = MAJOR_MARIA.map(s => s.name);
    expect(names.some(n => n.includes('静海') || n.includes('Tranquillitatis'))).toBe(true);
    expect(names.some(n => n.includes('风暴') || n.includes('Procellarum'))).toBe(true);
  });

  it('all maria should have type "mare"', () => {
    MAJOR_MARIA.forEach(site => {
      expect(site.type).toBe('mare');
    });
  });

  it('all maria should have valid coordinates', () => {
    const result = validateSites(MAJOR_MARIA);
    expect(result.valid).toBe(true);
  });
});

describe('lunar-sites — 全部站点', () => {
  it('ALL_LUNAR_SITES should contain all categories', () => {
    expect(ALL_LUNAR_SITES.length).toBe(
      APOLLO_LANDING_SITES.length + OTHER_LANDING_SITES.length + MAJOR_CRATERS.length + MAJOR_MARIA.length
    );
  });

  it('all sites should have valid coordinates', () => {
    const result = validateSites(ALL_LUNAR_SITES);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('no site should have empty name', () => {
    ALL_LUNAR_SITES.forEach(site => {
      expect(site.name.length).toBeGreaterThan(0);
    });
  });
});

describe('lunar-sites — 坐标转换', () => {
  it('should convert Apollo 11 coords to cartesian within reasonable range', () => {
    const pos = lunarCoordToCartesian(23.473, 0.674);
    // 月球半径 1737.4 km
    expect(Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2)).toBeCloseTo(1737.4, 0);
    expect(pos.z).toBeLessThan(0);  // Apollo 11 在东经23°，x应为正
  });

  it('should convert north pole correctly', () => {
    const pos = lunarCoordToCartesian(0, 90);
    expect(pos.x).toBeCloseTo(0, 5);
    expect(pos.y).toBeCloseTo(1737.4, 0);
    expect(pos.z).toBeCloseTo(0, 5);
  });

  it('should convert Chang\'e 4 to cartesian (farside)', () => {
    const pos = lunarCoordToCartesian(177.589, -45.457);
    // 远面 x 应为负值
    expect(pos.x).toBeLessThan(0);
  });
});
