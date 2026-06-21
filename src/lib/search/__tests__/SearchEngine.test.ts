import * as THREE from 'three';
import { SearchEngine } from '../SearchEngine';
import { SearchIndex, type IndexedCelestial } from '../SearchIndex';
import { UniverseScale } from '@/lib/types/universeTypes';

function makeCelestial(overrides: Partial<IndexedCelestial> & { id: string; nameEn: string }): IndexedCelestial {
  return {
    nameZh: overrides.nameEn,
    type: 'planet',
    scale: UniverseScale.SolarSystem,
    position: new THREE.Vector3(0, 0, 0),
    distance: 0,
    ...overrides,
  };
}

function buildIndex(entries: IndexedCelestial[]): SearchIndex {
  const idx = new SearchIndex();
  entries.forEach(e => idx.add(e));
  return idx;
}

const SOLAR_SYSTEM_BODIES: IndexedCelestial[] = [
  makeCelestial({ id: 'sun', nameEn: 'Sun', nameZh: '太阳', type: 'sun' }),
  makeCelestial({ id: 'mercury', nameEn: 'Mercury', nameZh: '水星', type: 'planet' }),
  makeCelestial({ id: 'venus', nameEn: 'Venus', nameZh: '金星', type: 'planet' }),
  makeCelestial({ id: 'earth', nameEn: 'Earth', nameZh: '地球', type: 'planet' }),
  makeCelestial({ id: 'mars', nameEn: 'Mars', nameZh: '火星', type: 'planet' }),
  makeCelestial({ id: 'moon', nameEn: 'Moon', nameZh: '月球', type: 'satellite' }),
];

describe('SearchEngine', () => {
  let engine: SearchEngine;

  beforeEach(() => {
    const index = buildIndex(SOLAR_SYSTEM_BODIES);
    engine = new SearchEngine(index);
  });

  describe('empty and invalid queries', () => {
    it('should return empty array for empty string', () => {
      expect(engine.search('')).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      expect(engine.search('   ')).toEqual([]);
    });

    it('should return empty array for null-like input', () => {
      expect(engine.search(undefined as any)).toEqual([]);
    });
  });

  describe('exact name matching', () => {
    it('should find Earth by exact English name', () => {
      const results = engine.search('Earth');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nameEn).toBe('Earth');
    });

    it('should find Sun by exact English name', () => {
      const results = engine.search('Sun');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nameEn).toBe('Sun');
    });

    it('should find Mars by exact English name', () => {
      const results = engine.search('Mars');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nameEn).toBe('Mars');
    });
  });

  describe('Chinese name matching', () => {
    it('should find Earth by Chinese name', () => {
      const results = engine.search('地球');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nameZh).toBe('地球');
    });

    it('should find Sun by Chinese name', () => {
      const results = engine.search('太阳');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nameEn).toBe('Sun');
    });

    it('should find Mars by Chinese name', () => {
      const results = engine.search('火星');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nameEn).toBe('Mars');
    });
  });

  describe('fuzzy matching', () => {
    it('should find results for partial query', () => {
      const results = engine.search('Mar');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nameEn).toBe('Mars');
    });

    it('should find results for case-insensitive query', () => {
      const results = engine.search('earth');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should find results for close misspellings', () => {
      const results = engine.search('Eart');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('result structure', () => {
    it('should return results with all required fields', () => {
      const results = engine.search('Earth');
      expect(results.length).toBeGreaterThanOrEqual(1);
      const result = results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('nameEn');
      expect(result).toHaveProperty('nameZh');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('scale');
      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('relevance');
    });

    it('should include position as object with x,y,z', () => {
      const results = engine.search('Earth');
      expect(results[0].position).toHaveProperty('x');
      expect(results[0].position).toHaveProperty('y');
      expect(results[0].position).toHaveProperty('z');
    });

    it('should have name field set (nameZh preferred over nameEn)', () => {
      const results = engine.search('Earth');
      expect(results[0].name).toBeTruthy();
    });
  });

  describe('result limit (maxResults)', () => {
    it('should respect maxResults parameter', () => {
      const results = engine.search('a', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should default to 10 max results', () => {
      const results = engine.search('a');
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should return all results when maxResults exceeds count', () => {
      const results = engine.search('Earth', 100);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sorting', () => {
    it('should sort results by type priority (sun > planet > satellite)', () => {
      const results = engine.search('a');
      const typeOrder = results.map(r => r.type);
      const priorityMap: Record<string, number> = { sun: 1, planet: 2, satellite: 3 };
      for (let i = 1; i < typeOrder.length; i++) {
        const prev = priorityMap[typeOrder[i - 1]] ?? 99;
        const curr = priorityMap[typeOrder[i]] ?? 99;
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });
  });

  describe('updateIndex', () => {
    it('should reflect new index after update', () => {
      const newIndex = buildIndex([
        makeCelestial({ id: 'andromeda', nameEn: 'Andromeda', nameZh: '仙女座星系', type: 'galaxy', scale: UniverseScale.LocalGroup }),
      ]);
      engine.updateIndex(newIndex);
      const results = engine.search('Andromeda');
      expect(results.length).toBe(1);
      expect(results[0].nameEn).toBe('Andromeda');
    });

    it('should clear old results after update', () => {
      const results1 = engine.search('Earth');
      expect(results1.length).toBeGreaterThanOrEqual(1);

      const newIndex = buildIndex([
        makeCelestial({ id: 'jupiter', nameEn: 'Jupiter', nameZh: '木星', type: 'planet' }),
      ]);
      engine.updateIndex(newIndex);
      const results2 = engine.search('Earth');
      expect(results2).toEqual([]);
    });
  });

  describe('no results', () => {
    it('should return empty array for completely unrelated query', () => {
      const results = engine.search('zzzzzzz');
      expect(results).toEqual([]);
    });
  });
});
