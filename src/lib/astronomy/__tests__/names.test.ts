import { planetNames } from '../names';

describe('planetNames', () => {
  it('should export en and zh languages', () => {
    expect(planetNames.en).toBeDefined();
    expect(planetNames.zh).toBeDefined();
  });

  it('should map Sun correctly', () => {
    expect(planetNames.en['Sun']).toBe('Sun');
    expect(planetNames.zh['Sun']).toBe('太阳');
  });

  it('should map all 8 planets in both languages', () => {
    const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
    planets.forEach(p => {
      expect(planetNames.en[p]).toBeDefined();
      expect(planetNames.zh[p]).toBeDefined();
    });
  });

  it('should map Moon and major moons', () => {
    const moons = ['Moon', 'Io', 'Europa', 'Ganymede', 'Callisto', 'Titan', 'Enceladus'];
    moons.forEach(m => {
      expect(planetNames.en[m]).toBeDefined();
      expect(planetNames.zh[m]).toBeDefined();
    });
  });

  it('should have same keys across languages', () => {
    const enKeys = Object.keys(planetNames.en).sort();
    const zhKeys = Object.keys(planetNames.zh).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it('should have 21 entries per language', () => {
    expect(Object.keys(planetNames.en)).toHaveLength(21);
    expect(Object.keys(planetNames.zh)).toHaveLength(21);
  });
});
