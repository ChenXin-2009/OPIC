import * as THREE from 'three';
import { SearchIndex, type IndexedCelestial } from '../SearchIndex';
import { UniverseScale } from '@/lib/types/universeTypes';

function makeCelestial(overrides: Partial<IndexedCelestial> & { id: string }): IndexedCelestial {
  return {
    nameEn: 'Test',
    nameZh: '测试',
    type: 'planet',
    scale: UniverseScale.SolarSystem,
    position: new THREE.Vector3(1, 2, 3),
    distance: 100,
    ...overrides,
  };
}

describe('SearchIndex', () => {
  let index: SearchIndex;

  beforeEach(() => {
    index = new SearchIndex();
  });

  describe('constructor', () => {
    it('should start with zero entries', () => {
      expect(index.size()).toBe(0);
      expect(index.getAll()).toEqual([]);
    });
  });

  describe('add', () => {
    it('should add a celestial to the index', () => {
      index.add(makeCelestial({ id: 'earth' }));
      expect(index.size()).toBe(1);
    });

    it('should add multiple celestials', () => {
      index.add(makeCelestial({ id: 'earth' }));
      index.add(makeCelestial({ id: 'mars' }));
      index.add(makeCelestial({ id: 'jupiter' }));
      expect(index.size()).toBe(3);
    });

    it('should overwrite existing entry with same id', () => {
      index.add(makeCelestial({ id: 'earth', nameEn: 'Earth' }));
      index.add(makeCelestial({ id: 'earth', nameEn: 'Earth Updated' }));
      expect(index.size()).toBe(1);
      expect(index.getById('earth')?.nameEn).toBe('Earth Updated');
    });
  });

  describe('getAll', () => {
    it('should return empty array for empty index', () => {
      expect(index.getAll()).toEqual([]);
    });

    it('should return all added celestials', () => {
      index.add(makeCelestial({ id: 'earth' }));
      index.add(makeCelestial({ id: 'mars' }));
      const all = index.getAll();
      expect(all).toHaveLength(2);
      expect(all.map(c => c.id).sort()).toEqual(['earth', 'mars']);
    });

    it('should return copies of entries (not references)', () => {
      index.add(makeCelestial({ id: 'earth' }));
      const all1 = index.getAll();
      const all2 = index.getAll();
      expect(all1).not.toBe(all2);
      expect(all1).toEqual(all2);
    });
  });

  describe('getById', () => {
    it('should return undefined for unknown id', () => {
      expect(index.getById('nonexistent')).toBeUndefined();
    });

    it('should return the correct celestial by id', () => {
      index.add(makeCelestial({ id: 'earth', nameEn: 'Earth' }));
      index.add(makeCelestial({ id: 'mars', nameEn: 'Mars' }));
      const result = index.getById('mars');
      expect(result).toBeDefined();
      expect(result?.nameEn).toBe('Mars');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      index.add(makeCelestial({ id: 'earth' }));
      index.add(makeCelestial({ id: 'mars' }));
      index.clear();
      expect(index.size()).toBe(0);
      expect(index.getAll()).toEqual([]);
    });

    it('should be safe to call on empty index', () => {
      index.clear();
      expect(index.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 for empty index', () => {
      expect(index.size()).toBe(0);
    });

    it('should reflect additions', () => {
      index.add(makeCelestial({ id: 'a' }));
      expect(index.size()).toBe(1);
      index.add(makeCelestial({ id: 'b' }));
      expect(index.size()).toBe(2);
    });

    it('should reflect clears', () => {
      index.add(makeCelestial({ id: 'a' }));
      index.clear();
      expect(index.size()).toBe(0);
    });
  });

  describe('type diversity', () => {
    it('should handle all celestial types', () => {
      const types = ['sun', 'planet', 'satellite', 'galaxy', 'group', 'cluster', 'supercluster'] as const;
      types.forEach((type, i) => {
        index.add(makeCelestial({ id: `type-${i}`, type }));
      });
      expect(index.size()).toBe(types.length);
    });

    it('should preserve scale information', () => {
      index.add(makeCelestial({
        id: 'milky-way',
        type: 'galaxy',
        scale: UniverseScale.LocalGroup,
      }));
      const result = index.getById('milky-way');
      expect(result?.scale).toBe(UniverseScale.LocalGroup);
    });
  });

  describe('position and distance', () => {
    it('should store position as Vector3', () => {
      index.add(makeCelestial({
        id: 'earth',
        position: new THREE.Vector3(100, 200, 300),
      }));
      const result = index.getById('earth');
      expect(result?.position).toBeInstanceOf(THREE.Vector3);
      expect(result?.position.x).toBe(100);
      expect(result?.position.y).toBe(200);
      expect(result?.position.z).toBe(300);
    });

    it('should store optional distance', () => {
      index.add(makeCelestial({ id: 'with-dist', distance: 5000 }));
      index.add(makeCelestial({ id: 'no-dist', distance: undefined }));
      expect(index.getById('with-dist')?.distance).toBe(5000);
      expect(index.getById('no-dist')?.distance).toBeUndefined();
    });
  });
});
