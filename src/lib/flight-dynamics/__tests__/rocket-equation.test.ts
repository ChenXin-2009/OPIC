import { deltaV, massAfterBurn, burnTime, propellantForDeltaV, thrustToWeight } from '../rocket-equation';

describe('rocket-equation', () => {
  describe('deltaV', () => {
    it('computes Tsiolkovsky delta-V correctly', () => {
      const dv = deltaV(300, 1000, 500);
      const expected = 300 * 9.80665 * Math.log(1000 / 500);
      expect(dv).toBeCloseTo(expected, 6);
    });

    it('returns 0 when massFinal <= 0', () => {
      expect(deltaV(300, 1000, 0)).toBe(0);
    });

    it('returns 0 when massInitial <= massFinal', () => {
      expect(deltaV(300, 500, 500)).toBe(0);
      expect(deltaV(300, 500, 600)).toBe(0);
    });
  });

  describe('massAfterBurn', () => {
    it('reduces mass by mass flow * time', () => {
      expect(massAfterBurn(1000, 10, 30)).toBe(700);
    });

    it('clamps to zero when burn consumes more than available', () => {
      expect(massAfterBurn(100, 10, 30)).toBe(0);
    });

    it('returns initial when burnTime is zero', () => {
      expect(massAfterBurn(1000, 10, 0)).toBe(1000);
    });
  });

  describe('burnTime', () => {
    it('computes burn duration from propellant and flow rate', () => {
      expect(burnTime(100, 10)).toBe(10);
    });

    it('returns Infinity when massFlow is zero', () => {
      expect(burnTime(100, 0)).toBe(Infinity);
    });

    it('returns Infinity when massFlow is negative', () => {
      expect(burnTime(100, -1)).toBe(Infinity);
    });
  });

  describe('propellantForDeltaV', () => {
    it('computes propellant mass for a given delta-V', () => {
      const propellant = propellantForDeltaV(2000, 300, 1000);
      expect(propellant).toBeGreaterThan(0);
      expect(propellant).toBeLessThan(1000);
    });

    it('returns 0 when isp <= 0', () => {
      expect(propellantForDeltaV(2000, 0, 1000)).toBe(0);
    });

    it('returns 0 when initialMass <= 0', () => {
      expect(propellantForDeltaV(2000, 300, 0)).toBe(0);
    });
  });

  describe('thrustToWeight', () => {
    it('computes TWR for a given thrust and mass', () => {
      const twr = thrustToWeight(100_000, 1000);
      expect(twr).toBeCloseTo(100_000 / (1000 * 9.80665), 6);
    });

    it('accepts custom gravity value', () => {
      const twr = thrustToWeight(100_000, 1000, 1.62);
      expect(twr).toBeCloseTo(100_000 / (1000 * 1.62), 6);
    });

    it('returns 0 when mass <= 0', () => {
      expect(thrustToWeight(100_000, 0)).toBe(0);
    });
  });
});
