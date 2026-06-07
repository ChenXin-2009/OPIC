import { getGravitationalParameterAU } from '../gravity';

describe('gravity', () => {
  it('should return gravitational parameter for known bodies', () => {
    const sun = getGravitationalParameterAU('sun');
    expect(sun).toBeGreaterThan(0);
    const earth = getGravitationalParameterAU('earth');
    expect(earth).toBeGreaterThan(0);
    expect(earth).not.toBe(sun);
  });

  it('should be case insensitive', () => {
    const upper = getGravitationalParameterAU('Sun');
    const lower = getGravitationalParameterAU('sun');
    expect(upper).toBe(lower);
  });

  it('should return null for unknown bodies', () => {
    const result = getGravitationalParameterAU('pluto');
    expect(result).toBeNull();
  });

  it('should have values for all known bodies', () => {
    const bodies = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    for (const body of bodies) {
      expect(getGravitationalParameterAU(body)).toBeGreaterThan(0);
    }
  });
});
