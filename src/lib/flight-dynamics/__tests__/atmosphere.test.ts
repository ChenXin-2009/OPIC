import {
  earthAtmosphereDensity,
  marsAtmosphereDensity,
  atmosphereDensity,
  dynamicPressure,
  RHO_0_EARTH,
  RHO_0_MARS,
  ATMOSPHERE_CUTOFF_M,
} from '../atmosphere';

describe('atmosphere', () => {
  describe('earthAtmosphereDensity', () => {
    it('returns sea-level density at altitude 0', () => {
      expect(earthAtmosphereDensity(0)).toBe(RHO_0_EARTH);
    });

    it('decays exponentially with altitude', () => {
      const at10km = earthAtmosphereDensity(10_000);
      expect(at10km).toBeGreaterThan(0);
      expect(at10km).toBeLessThan(RHO_0_EARTH);
    });

    it('returns 0 at and above Kármán line', () => {
      expect(earthAtmosphereDensity(ATMOSPHERE_CUTOFF_M)).toBe(0);
      expect(earthAtmosphereDensity(150_000)).toBe(0);
    });

    it('returns 0 for negative altitude (below sea level)', () => {
      expect(earthAtmosphereDensity(-100)).toBe(0);
    });
  });

  describe('marsAtmosphereDensity', () => {
    it('returns surface density at altitude 0', () => {
      expect(marsAtmosphereDensity(0)).toBe(RHO_0_MARS);
    });

    it('decays exponentially', () => {
      const at10km = marsAtmosphereDensity(10_000);
      expect(at10km).toBeGreaterThan(0);
      expect(at10km).toBeLessThan(RHO_0_MARS);
    });

    it('returns 0 above 125 km', () => {
      expect(marsAtmosphereDensity(126_000)).toBe(0);
    });

    it('returns 0 for negative altitude', () => {
      expect(marsAtmosphereDensity(-1)).toBe(0);
    });
  });

  describe('atmosphereDensity (generic dispatcher)', () => {
    it('delegates to earth atmosphere for "earth"', () => {
      expect(atmosphereDensity('earth', 0)).toBe(RHO_0_EARTH);
    });

    it('delegates to mars atmosphere for "mars"', () => {
      expect(atmosphereDensity('mars', 0)).toBe(RHO_0_MARS);
    });

    it('returns 0 for unknown body', () => {
      expect(atmosphereDensity('venus', 0)).toBe(0);
    });

    it('is case-insensitive', () => {
      expect(atmosphereDensity('Earth', 0)).toBe(RHO_0_EARTH);
    });
  });

  describe('dynamicPressure', () => {
    it('computes dynamic pressure correctly', () => {
      expect(dynamicPressure(1.225, 100)).toBe(0.5 * 1.225 * 100 * 100);
    });

    it('returns 0 when density is 0', () => {
      expect(dynamicPressure(0, 100)).toBe(0);
    });

    it('returns 0 when speed is 0', () => {
      expect(dynamicPressure(1.225, 0)).toBe(0);
    });
  });
});
