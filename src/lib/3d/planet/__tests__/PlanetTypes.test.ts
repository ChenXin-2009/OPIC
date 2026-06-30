import { REAL_PLANET_RADII } from '../PlanetTypes';

describe('REAL_PLANET_RADII', () => {
  it('should contain all 9 solar system bodies', () => {
    const expected = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const keys = Object.keys(REAL_PLANET_RADII);
    expected.forEach(key => expect(keys).toContain(key));
  });

  it('should have sun as largest radius', () => {
    const values = Object.values(REAL_PLANET_RADII);
    const max = Math.max(...values);
    expect(REAL_PLANET_RADII.sun).toBe(max);
  });

  it('should have correct earth radius', () => {
    expect(REAL_PLANET_RADII.earth).toBe(0.000043);
  });

  it('should have mercury as smallest radius', () => {
    expect(REAL_PLANET_RADII.mercury).toBe(0.000015);
  });

  it('should have all positive values', () => {
    Object.values(REAL_PLANET_RADII).forEach(v => expect(v).toBeGreaterThan(0));
  });
});
