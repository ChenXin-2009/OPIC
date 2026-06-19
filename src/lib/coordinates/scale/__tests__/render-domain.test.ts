import {
  getActiveRenderDomain,
  rtcOffset,
  float32Resolution,
  RENDER_DOMAINS,
} from '../render-domain';

describe('getActiveRenderDomain', () => {
  it('should return earthLocal for very small distances', () => {
    expect(getActiveRenderDomain(0.001)).toBe('earthLocal');
  });

  it('should return solarSystem for 1 AU', () => {
    expect(getActiveRenderDomain(1.0)).toBe('solarSystem');
  });

  it('should return nearbyStars for 10000 AU', () => {
    expect(getActiveRenderDomain(10000)).toBe('nearbyStars');
  });

  it('should return galaxy for 1e6 AU', () => {
    expect(getActiveRenderDomain(1e6)).toBe('galaxy');
  });

  it('should return supergalactic for 1e8 AU', () => {
    expect(getActiveRenderDomain(1e8)).toBe('supergalactic');
  });

  it('should return null for negative distance', () => {
    expect(getActiveRenderDomain(-1)).toBeNull();
  });

  it('should return null beyond all domains', () => {
    expect(getActiveRenderDomain(1e11)).toBeNull();
  });

  it('should return earthLocal at distance 0', () => {
    expect(getActiveRenderDomain(0)).toBe('earthLocal');
  });

  it('should handle boundary: enterDistance is inclusive', () => {
    // 0.01 is exactly earthLocal.exitDistanceAU, should be solarSystem
    expect(getActiveRenderDomain(0.01)).toBe('solarSystem');
    // 0.009 is just below earthLocal.exitDistanceAU, should be earthLocal
    expect(getActiveRenderDomain(0.009)).toBe('earthLocal');
  });

  it('should handle boundary: exitDistance is exclusive', () => {
    // 500 is solarSystem.exitDistanceAU, should NOT be solarSystem
    // It falls in nearbyStars [200, 50000)
    expect(getActiveRenderDomain(500)).toBe('nearbyStars');
    // 50000 is nearbyStars.exitDistanceAU, should NOT be nearbyStars
    expect(getActiveRenderDomain(50000)).toBe('galaxy');
  });
});

describe('rtcOffset', () => {
  it('should compute worldPos - center', () => {
    const result = rtcOffset(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 2, z: 3 }
    );
    expect(result).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('should handle non-zero center', () => {
    const result = rtcOffset(
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 3, z: 4 }
    );
    expect(result).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('should return zero when center equals worldPos', () => {
    const result = rtcOffset(
      { x: 5, y: 5, z: 5 },
      { x: 5, y: 5, z: 5 }
    );
    expect(result).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('float32Resolution', () => {
  it('should return distance * 2^-23', () => {
    expect(float32Resolution(1.0)).toBeCloseTo(1.1920929e-7, 12);
  });

  it('should return 0 for distance 0', () => {
    expect(float32Resolution(0)).toBe(0);
  });

  it('should scale linearly', () => {
    const d1 = float32Resolution(1.0);
    const d2 = float32Resolution(2.0);
    expect(d2).toBeCloseTo(d1 * 2, 12);
  });

  it('should return ~120 AU at galaxy scale (1e9 AU)', () => {
    const res = float32Resolution(1e9);
    expect(res).toBeGreaterThan(100);
    expect(res).toBeLessThan(200);
  });
});

describe('RENDER_DOMAINS', () => {
  it('should have all 5 domains', () => {
    const names = Object.keys(RENDER_DOMAINS);
    expect(names).toContain('earthLocal');
    expect(names).toContain('solarSystem');
    expect(names).toContain('nearbyStars');
    expect(names).toContain('galaxy');
    expect(names).toContain('supergalactic');
  });

  it('earthLocal should use RTC', () => {
    expect(RENDER_DOMAINS.earthLocal.useRTC).toBe(true);
  });

  it('solarSystem should not use RTC', () => {
    expect(RENDER_DOMAINS.solarSystem.useRTC).toBe(false);
  });

  it('all domains should have exitDistanceAU > enterDistanceAU', () => {
    for (const domain of Object.values(RENDER_DOMAINS)) {
      expect(domain.exitDistanceAU).toBeGreaterThan(domain.enterDistanceAU);
    }
  });
});
