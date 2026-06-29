/**
 * 月球天文计算模块测试 (Lunar Astronomy Tests)
 *
 * 所有测试使用数值断言，AI 可直接验证功能是否正确实现。
 * 参考值来源：
 * - JPL Horizons (ssd-api.jpl.nasa.gov) 高精度历表
 * - astronomy-engine 内置测试用例
 */

import {
  getMoonPhase,
  getLunarLibration,
  getEarthMoonDistance,
  getLunarIllumination,
  getSubSolarPoint,
  getSubEarthPoint,
  getNextLunarApsis,
  getNextLunarEclipse,
  toAstroTime,
  LIBRATION_RANGE,
  type MoonPhaseResult,
} from '../lunar';

describe('lunar module — 月相计算', () => {
  it('should return phase angle in [0, 360)', () => {
    const phase = getMoonPhase(new Date());
    expect(phase.angle).toBeGreaterThanOrEqual(0);
    expect(phase.angle).toBeLessThan(360);
  });

  it('should return illumination fraction in [0, 1]', () => {
    const phase = getMoonPhase(new Date());
    expect(phase.illumination).toBeGreaterThanOrEqual(0);
    expect(phase.illumination).toBeLessThanOrEqual(1);
  });

  it('should return a non-empty phase name', () => {
    const phase = getMoonPhase(new Date());
    expect(phase.phaseName).toBeTruthy();
    expect(typeof phase.phaseName).toBe('string');
    expect(phase.phaseName.length).toBeGreaterThan(0);
  });

  it('should be close to full moon on 2025-01-13T22:27Z (Wolf Moon)', () => {
    // 2025年1月13日 22:27 UTC，天文满月 (Wolf Moon)
    const phase = getMoonPhase(new Date('2025-01-13T22:27:00Z'));
    // 满月球角应为 ~180°
    expect(phase.angle).toBeGreaterThan(170);
    expect(phase.angle).toBeLessThan(190);
    expect(phase.illumination).toBeGreaterThan(0.95);
    expect(phase.phaseName).toBe('满月');
  });

  it('should correctly handle near-new-moon date (2025-01-29)', () => {
    // 2025-01-29 12:36 UTC 实际上是接近新月的时刻 (~0°)
    const phase = getMoonPhase(new Date('2025-01-29T12:36:00Z'));
    // 新月前后 angle 应接近 0° (或 360°)
    const angleNorm = phase.angle > 300 ? phase.angle - 360 : phase.angle;
    expect(Math.abs(angleNorm)).toBeLessThan(25); // 新月初后 1 天多
  });

  it('should be consistent between consecutive minutes', () => {
    const phase1 = getMoonPhase(new Date('2025-06-01T12:00:00Z'));
    const phase2 = getMoonPhase(new Date('2025-06-01T12:01:00Z'));
    // 1分钟内月相角变化应 < 0.1°
    expect(Math.abs(phase1.angle - phase2.angle)).toBeLessThan(0.1);
  });

  it('should accept AstroTime as parameter', () => {
    const date = new Date('2025-06-15T00:00:00Z');
    const phaseFromDate = getMoonPhase(date);
    const phaseFromTime = getMoonPhase(toAstroTime(date));
    expect(phaseFromDate.angle).toBe(phaseFromTime.angle);
    expect(phaseFromDate.illumination).toBe(phaseFromTime.illumination);
  });
});

describe('lunar module — 月球天平动', () => {
  it('should return libration within valid ranges', () => {
    const lib = getLunarLibration(new Date());
    expect(lib.elon).toBeGreaterThanOrEqual(LIBRATION_RANGE.ELON_MIN);
    expect(lib.elon).toBeLessThanOrEqual(LIBRATION_RANGE.ELON_MAX);
    expect(lib.elat).toBeGreaterThanOrEqual(LIBRATION_RANGE.ELAT_MIN);
    expect(lib.elat).toBeLessThanOrEqual(LIBRATION_RANGE.ELAT_MAX);
  });

  it('should return distance within valid range', () => {
    const lib = getLunarLibration(new Date());
    expect(lib.dist_km).toBeGreaterThan(LIBRATION_RANGE.DIST_KM_MIN);
    expect(lib.dist_km).toBeLessThan(LIBRATION_RANGE.DIST_KM_MAX);
  });

  it('should return apparent diameter within valid range', () => {
    const lib = getLunarLibration(new Date());
    expect(lib.diam_deg).toBeGreaterThanOrEqual(LIBRATION_RANGE.DIAM_DEG_MIN);
    expect(lib.diam_deg).toBeLessThanOrEqual(LIBRATION_RANGE.DIAM_DEG_MAX);
  });

  it('getEarthMoonDistance should match getLunarLibration dist_km', () => {
    const date = new Date('2025-06-15T00:00:00Z');
    const lib = getLunarLibration(date);
    const dist = getEarthMoonDistance(date);
    expect(dist).toBe(lib.dist_km);
  });
});

describe('lunar module — 详细光照', () => {
  it('should return phase_angle in [0, 180]', () => {
    const illum = getLunarIllumination(new Date());
    expect(illum.phase_angle).toBeGreaterThanOrEqual(0);
    expect(illum.phase_angle).toBeLessThanOrEqual(180);
  });

  it('should return phase_fraction in [0, 1]', () => {
    const illum = getLunarIllumination(new Date());
    expect(illum.phase_fraction).toBeGreaterThanOrEqual(0);
    expect(illum.phase_fraction).toBeLessThanOrEqual(1);
  });

  it('should return reasonable magnitude (moon is -12.7 at full, -2.5 at quarter)', () => {
    const illum = getLunarIllumination(new Date());
    expect(illum.magnitude).toBeLessThan(0); // 月球视星等总是负数
    expect(illum.magnitude).toBeGreaterThan(-14); // 不会比满月更亮
  });

  it('should return geo_dist in reasonable AU range', () => {
    const illum = getLunarIllumination(new Date());
    // 地月距离约 0.0024~0.0027 AU
    expect(illum.geo_dist).toBeGreaterThan(0.0023);
    expect(illum.geo_dist).toBeLessThan(0.0028);
  });

  it('should be consistent with getMoonPhase', () => {
    const date = new Date('2025-06-15T12:00:00Z');
    const phase = getMoonPhase(date);
    const illum = getLunarIllumination(date);
    // illumination 和 phase_fraction 应高度一致
    expect(Math.abs(phase.illumination - illum.phase_fraction)).toBeLessThan(0.01);
  });
});

describe('lunar module — 日下点与面心点', () => {
  it('should return sub-solar longitude in [-180, 180]', () => {
    const ss = getSubSolarPoint(new Date());
    expect(ss.lon).toBeGreaterThanOrEqual(-180);
    expect(ss.lon).toBeLessThanOrEqual(180);
  });

  it('should return sub-solar latitude in [-90, 90]', () => {
    const ss = getSubSolarPoint(new Date());
    expect(ss.lat).toBeGreaterThanOrEqual(-90);
    expect(ss.lat).toBeLessThanOrEqual(90);
  });

  it('should return sub-earth point matching libration', () => {
    const date = new Date('2025-06-15T12:00:00Z');
    const se = getSubEarthPoint(date);
    const lib = getLunarLibration(date);
    expect(se.lon).toBe(lib.elon);
    expect(se.lat).toBe(lib.elat);
  });

  it('should return sub-earth coordinates within libration range', () => {
    const se = getSubEarthPoint(new Date());
    expect(Math.abs(se.lon)).toBeLessThanOrEqual(10);
    expect(Math.abs(se.lat)).toBeLessThanOrEqual(7);
  });
});

describe('lunar module — 远/近地点', () => {
  it('should return valid apsis kind', () => {
    const apsis = getNextLunarApsis(new Date());
    expect(['perigee', 'apogee']).toContain(apsis.kind);
  });

  it('should return reasonable apsis distance', () => {
    const apsis = getNextLunarApsis(new Date());
    expect(apsis.dist_km).toBeGreaterThan(LIBRATION_RANGE.DIST_KM_MIN);
    expect(apsis.dist_km).toBeLessThan(LIBRATION_RANGE.DIST_KM_MAX);
  });

  it('should return future time', () => {
    const now = new Date();
    const apsis = getNextLunarApsis(now);
    expect(apsis.time.getTime()).toBeGreaterThanOrEqual(now.getTime() - 86400000); // 允许1天误差
  });
});

describe('lunar module — 月食', () => {
  it('should return valid eclipse info', () => {
    const eclipse = getNextLunarEclipse(new Date());
    expect(eclipse.kind).toBeTruthy();
    expect(['penumbral', 'partial', 'total']).toContain(eclipse.kind);
  });

  it('should return peak time', () => {
    const eclipse = getNextLunarEclipse(new Date());
    expect(eclipse.peak).not.toBeNull();
  });
});
