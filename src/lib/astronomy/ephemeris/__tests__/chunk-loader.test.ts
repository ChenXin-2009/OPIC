import { PolynomialType } from '../types';
import type { EphemerisChunk } from '../types';

jest.mock('../loader', () => {
  const mockLoadChunk = jest.fn();
  return {
    EphemerisDataLoader: jest.fn().mockImplementation(() => ({
      loadChunk: mockLoadChunk,
    })),
    __mockLoadChunk: mockLoadChunk,
  };
});

import { ChunkLoader } from '../chunk-loader';

function makeChunk(bodyId: number, startJD: number, endJD: number): EphemerisChunk {
  return {
    bodyId,
    startJD,
    endJD,
    segments: [
      {
        type: PolynomialType.CHEBYSHEV,
        bodyId,
        startJD,
        endJD,
        order: 6,
        coefficientsX: [1, 0, 0, 0, 0, 0, 0],
        coefficientsY: [2, 0, 0, 0, 0, 0, 0],
        coefficientsZ: [3, 0, 0, 0, 0, 0, 0],
      },
    ],
    metadata: {
      version: 2,
      bodyId,
      polynomialType: PolynomialType.CHEBYSHEV,
      segmentCount: 1,
    },
  };
}

function getMockLoader() {
  const { __mockLoadChunk } = require('../loader');
  return __mockLoadChunk as jest.Mock;
}

describe('ChunkLoader', () => {
  let loader: ChunkLoader;

  beforeEach(() => {
    loader = new ChunkLoader(1);
    getMockLoader().mockReset();
  });

  describe('loadChunk', () => {
    it('should load and cache a chunk', async () => {
      const chunk = makeChunk(399, 100, 200);
      getMockLoader().mockResolvedValue(chunk);

      const result = await loader.loadChunk('http://example.com/chunk1');

      expect(result).toBe(chunk);
      expect(loader.getCacheCount()).toBe(1);
    });

    it('should return cached chunk on second load', async () => {
      const chunk = makeChunk(399, 100, 200);
      getMockLoader().mockResolvedValue(chunk);

      await loader.loadChunk('http://example.com/chunk1');
      const result = await loader.loadChunk('http://example.com/chunk1');

      expect(result).toBe(chunk);
      expect(getMockLoader()).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCached', () => {
    it('should return null for cache miss', () => {
      expect(loader.getCached('nonexistent')).toBeNull();
    });

    it('should return chunk after loading', async () => {
      const chunk = makeChunk(399, 100, 200);
      getMockLoader().mockResolvedValue(chunk);

      await loader.loadChunk('http://example.com/chunk1');
      expect(loader.getCached('http://example.com/chunk1')).toBe(chunk);
    });
  });

  describe('evictLRU', () => {
    it('should return false for empty cache', () => {
      expect(loader.evictLRU()).toBe(false);
    });

    it('should evict the only entry', async () => {
      const chunk = makeChunk(399, 100, 200);
      getMockLoader().mockResolvedValue(chunk);

      await loader.loadChunk('http://example.com/chunk1');
      expect(loader.getCacheCount()).toBe(1);

      const evicted = loader.evictLRU();
      expect(evicted).toBe(true);
      expect(loader.getCacheCount()).toBe(0);
    });

    it('should evict oldest entry when two exist', async () => {
      const chunk1 = makeChunk(399, 100, 200);
      const chunk2 = makeChunk(599, 200, 300);
      getMockLoader().mockResolvedValueOnce(chunk1).mockResolvedValueOnce(chunk2);

      await loader.loadChunk('http://example.com/chunk1');
      await loader.loadChunk('http://example.com/chunk2');

      loader.evictLRU();
      expect(loader.getCacheCount()).toBe(1);
      expect(loader.getCached('http://example.com/chunk1')).toBeNull();
      expect(loader.getCached('http://example.com/chunk2')).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should reset cache', async () => {
      const chunk = makeChunk(399, 100, 200);
      getMockLoader().mockResolvedValue(chunk);

      await loader.loadChunk('http://example.com/chunk1');
      loader.clear();

      expect(loader.getCacheCount()).toBe(0);
      expect(loader.getCacheSize()).toBe(0);
    });
  });

  describe('getCacheSize and getCacheCount', () => {
    it('should be 0 initially', () => {
      expect(loader.getCacheSize()).toBe(0);
      expect(loader.getCacheCount()).toBe(0);
    });

    it('should increment after loading', async () => {
      const chunk = makeChunk(399, 100, 200);
      getMockLoader().mockResolvedValue(chunk);

      await loader.loadChunk('http://example.com/chunk1');
      expect(loader.getCacheCount()).toBe(1);
      expect(loader.getCacheSize()).toBeGreaterThan(0);
    });
  });
});
