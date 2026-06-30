import {
  icrfToEcliptic, eclipticToIcrf, icrfToRenderWorld, renderWorldToIcrf,
  OBLIQUITY_J2000_DEG, OBLIQUITY_J2000_RAD,
  objectLocalToRenderWorld, renderWorldToObjectLocal, objectLocalToWorldQuat, worldToObjectLocalQuat,
  temeToRenderWorld, temeToRenderWorldSimple,
  icrfToGalactic, galacticToIcrf, GALACTIC_CENTER_ICRS,
  icrfToSupergalactic, supergalacticToIcrf, supergalacticToRenderWorld,
  RENDER_DOMAINS, getActiveRenderDomain, rtcOffset, float32Resolution,
} from '../index';

describe('coordinates barrel exports', () => {
  it('should export frame transformation functions', () => {
    expect(icrfToEcliptic).toBeDefined();
    expect(eclipticToIcrf).toBeDefined();
    expect(icrfToRenderWorld).toBeDefined();
    expect(renderWorldToIcrf).toBeDefined();
    expect(objectLocalToRenderWorld).toBeDefined();
    expect(renderWorldToObjectLocal).toBeDefined();
    expect(objectLocalToWorldQuat).toBeDefined();
    expect(worldToObjectLocalQuat).toBeDefined();
    expect(temeToRenderWorld).toBeDefined();
    expect(temeToRenderWorldSimple).toBeDefined();
    expect(icrfToGalactic).toBeDefined();
    expect(galacticToIcrf).toBeDefined();
    expect(icrfToSupergalactic).toBeDefined();
    expect(supergalacticToIcrf).toBeDefined();
    expect(supergalacticToRenderWorld).toBeDefined();
  });

  it('should export constants', () => {
    expect(OBLIQUITY_J2000_DEG).toBeCloseTo(23.4392911, 4);
    expect(OBLIQUITY_J2000_RAD).toBeCloseTo(0.40909280, 5);
    expect(GALACTIC_CENTER_ICRS).toBeDefined();
    expect(typeof GALACTIC_CENTER_ICRS).toBe('object');
  });

  it('should export scale functions and constants', () => {
    expect(RENDER_DOMAINS).toBeDefined();
    expect(typeof RENDER_DOMAINS).toBe('object');
    expect(getActiveRenderDomain).toBeDefined();
    expect(rtcOffset).toBeDefined();
    expect(float32Resolution).toBeDefined();
  });

  it('RENDER_DOMAINS should contain all expected entries', () => {
    const domainNames = ['earthLocal', 'solarSystem', 'nearbyStars', 'galaxy', 'supergalactic'];
    domainNames.forEach(name => {
      expect(RENDER_DOMAINS[name]).toBeDefined();
      expect(RENDER_DOMAINS[name].name).toBe(name);
      expect(typeof RENDER_DOMAINS[name].unitScale).toBe('number');
      expect(typeof RENDER_DOMAINS[name].exitDistanceAU).toBe('number');
      expect(typeof RENDER_DOMAINS[name].enterDistanceAU).toBe('number');
      expect(typeof RENDER_DOMAINS[name].useRTC).toBe('boolean');
    });
  });

  it('getActiveRenderDomain should return correct domain for distances', () => {
    expect(getActiveRenderDomain(0.001)).toBe('earthLocal');
    expect(getActiveRenderDomain(1)).toBe('solarSystem');
    expect(getActiveRenderDomain(1000)).toBe('nearbyStars');
    expect(getActiveRenderDomain(100000)).toBe('galaxy');
    expect(getActiveRenderDomain(1e9)).toBe('supergalactic');
    expect(getActiveRenderDomain(1e12)).toBeNull();
  });

  it('rtcOffset should compute relative offset', () => {
    const result = rtcOffset({ x: 10, y: 20, z: 30 }, { x: 15, y: 25, z: 35 });
    expect(result).toEqual({ x: 5, y: 5, z: 5 });
  });

  it('float32Resolution should scale with distance', () => {
    expect(float32Resolution(0)).toBe(0);
    expect(float32Resolution(1)).toBeCloseTo(1.1920929e-7, 12);
    expect(float32Resolution(100)).toBeCloseTo(1.1920929e-5, 10);
  });
});
