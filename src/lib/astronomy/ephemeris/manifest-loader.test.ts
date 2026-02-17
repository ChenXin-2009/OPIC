/**
 * Unit tests for ManifestLoader
 * 
 * Tests manifest loading, parsing, and query methods.
 * Requirements: 3.12
 */

import { ManifestLoader, Manifest, ChunkMetadata } from './manifest-loader';

// Mock fetch globally
global.fetch = jest.fn();

describe('ManifestLoader', () => {
  let loader: ManifestLoader;
  
  const mockManifest: Manifest = {
    version: 2,
    generationDate: '2026-02-17T15:30:00Z',
    spiceKernels: {
      planets: 'DE440',
      jupiter: 'JUP365',
      saturn: 'SAT441',
      uranus: 'URA111',
      neptune: 'NEP097'
    },
    chunks: [
      {
        file: 'planets-2009.bin.gz',
        bodies: [199, 299, 399, 499, 599, 699, 799, 899],
        timeRange: { start: 2454868.5, end: 2456693.5 },
        size: 95000,
        checksum: 'sha256:abc123'
      },
      {
        file: 'planets-2014.bin.gz',
        bodies: [199, 299, 399, 499, 599, 699, 799, 899],
        timeRange: { start: 2456693.5, end: 2458518.5 },
        size: 95000,
        checksum: 'sha256:def456'
      },
      {
        file: 'jupiter-moons-2009.bin.gz',
        bodies: [501, 502, 503, 504],
        timeRange: { start: 2454868.5, end: 2456693.5 },
        size: 98000,
        checksum: 'sha256:ghi789'
      },
      {
        file: 'earth-moon-2009.bin.gz',
        bodies: [301],
        timeRange: { start: 2454868.5, end: 2456693.5 },
        size: 45000,
        checksum: 'sha256:jkl012'
      }
    ]
  };

  beforeEach(() => {
    loader = new ManifestLoader('/data');
    (fetch as jest.Mock).mockClear();
  });

  describe('load', () => {
    it('should load and parse manifest successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });

      const manifest = await loader.load();

      expect(fetch).toHaveBeenCalledWith('/data/manifest.json');
      expect(manifest).toEqual(mockManifest);
      expect(loader.getManifest()).toEqual(mockManifest);
    });

    it('should throw error if fetch fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(loader.load()).rejects.toThrow('Failed to load manifest: 404 Not Found');
    });

    it('should throw error if manifest has invalid format (missing version)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chunks: [] })
      });

      await expect(loader.load()).rejects.toThrow('Invalid manifest format: missing version');
    });

    it('should throw error if manifest has invalid format (missing chunks)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: 2 })
      });

      await expect(loader.load()).rejects.toThrow('Invalid manifest format: missing chunks array');
    });

    it('should throw error if JSON parsing fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(loader.load()).rejects.toThrow('Failed to load manifest from /data/manifest.json');
    });

    it('should use custom base URL', async () => {
      const customLoader = new ManifestLoader('https://cdn.example.com/ephemeris');
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });

      await customLoader.load();

      expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/ephemeris/manifest.json');
    });
  });

  describe('getManifest', () => {
    it('should return null before loading', () => {
      expect(loader.getManifest()).toBeNull();
    });

    it('should return manifest after loading', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });

      await loader.load();
      expect(loader.getManifest()).toEqual(mockManifest);
    });
  });

  describe('getChunksForBody', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });
      await loader.load();
    });

    it('should throw error if manifest not loaded', () => {
      const newLoader = new ManifestLoader();
      expect(() => newLoader.getChunksForBody(399)).toThrow('Manifest not loaded');
    });

    it('should return all chunks for Earth (399)', () => {
      const chunks = loader.getChunksForBody(399);
      expect(chunks).toHaveLength(2);
      expect(chunks[0].file).toBe('planets-2009.bin.gz');
      expect(chunks[1].file).toBe('planets-2014.bin.gz');
    });

    it('should return all chunks for Io (501)', () => {
      const chunks = loader.getChunksForBody(501);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].file).toBe('jupiter-moons-2009.bin.gz');
    });

    it('should return all chunks for Moon (301)', () => {
      const chunks = loader.getChunksForBody(301);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].file).toBe('earth-moon-2009.bin.gz');
    });

    it('should return empty array for body not in manifest', () => {
      const chunks = loader.getChunksForBody(9999);
      expect(chunks).toHaveLength(0);
    });
  });

  describe('getChunkForBodyAtTime', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });
      await loader.load();
    });

    it('should throw error if manifest not loaded', () => {
      const newLoader = new ManifestLoader();
      expect(() => newLoader.getChunkForBodyAtTime(399, 2455000)).toThrow('Manifest not loaded');
    });

    it('should return correct chunk for Earth at time in first chunk', () => {
      const chunk = loader.getChunkForBodyAtTime(399, 2455000);
      expect(chunk).not.toBeNull();
      expect(chunk!.file).toBe('planets-2009.bin.gz');
    });

    it('should return correct chunk for Earth at time in second chunk', () => {
      const chunk = loader.getChunkForBodyAtTime(399, 2457000);
      expect(chunk).not.toBeNull();
      expect(chunk!.file).toBe('planets-2014.bin.gz');
    });

    it('should return null for time before any chunks', () => {
      const chunk = loader.getChunkForBodyAtTime(399, 2450000);
      expect(chunk).toBeNull();
    });

    it('should return null for time after any chunks', () => {
      const chunk = loader.getChunkForBodyAtTime(399, 2460000);
      expect(chunk).toBeNull();
    });

    it('should return chunk at exact start time', () => {
      const chunk = loader.getChunkForBodyAtTime(399, 2454868.5);
      expect(chunk).not.toBeNull();
      expect(chunk!.file).toBe('planets-2009.bin.gz');
    });

    it('should return chunk at exact end time', () => {
      const chunk = loader.getChunkForBodyAtTime(399, 2456693.5);
      expect(chunk).not.toBeNull();
      expect(chunk!.file).toBe('planets-2009.bin.gz');
    });

    it('should return null for body not in manifest', () => {
      const chunk = loader.getChunkForBodyAtTime(9999, 2455000);
      expect(chunk).toBeNull();
    });
  });

  describe('getChunksInTimeRange', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });
      await loader.load();
    });

    it('should throw error if manifest not loaded', () => {
      const newLoader = new ManifestLoader();
      expect(() => newLoader.getChunksInTimeRange(2455000, 2456000)).toThrow('Manifest not loaded');
    });

    it('should return all chunks overlapping time range', () => {
      const chunks = loader.getChunksInTimeRange(2455000, 2457000);
      expect(chunks.length).toBeGreaterThan(0);
      // Should include both planet chunks and moon chunks
      const files = chunks.map(c => c.file);
      expect(files).toContain('planets-2009.bin.gz');
      expect(files).toContain('planets-2014.bin.gz');
    });

    it('should return chunks for range within single chunk', () => {
      const chunks = loader.getChunksInTimeRange(2455000, 2455500);
      expect(chunks.length).toBeGreaterThan(0);
      // All chunks that cover this range
      expect(chunks.some(c => c.file === 'planets-2009.bin.gz')).toBe(true);
    });

    it('should return empty array for range with no chunks', () => {
      const chunks = loader.getChunksInTimeRange(2450000, 2451000);
      expect(chunks).toHaveLength(0);
    });

    it('should handle range that starts before and ends after all chunks', () => {
      const chunks = loader.getChunksInTimeRange(2450000, 2460000);
      expect(chunks).toHaveLength(mockManifest.chunks.length);
    });
  });

  describe('getChunksForBodyInTimeRange', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });
      await loader.load();
    });

    it('should throw error if manifest not loaded', () => {
      const newLoader = new ManifestLoader();
      expect(() => newLoader.getChunksForBodyInTimeRange(399, 2455000, 2456000)).toThrow('Manifest not loaded');
    });

    it('should return chunks for Earth in time range', () => {
      const chunks = loader.getChunksForBodyInTimeRange(399, 2455000, 2457000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0].file).toBe('planets-2009.bin.gz');
      expect(chunks[1].file).toBe('planets-2014.bin.gz');
    });

    it('should return single chunk for Io in time range', () => {
      const chunks = loader.getChunksForBodyInTimeRange(501, 2455000, 2456000);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].file).toBe('jupiter-moons-2009.bin.gz');
    });

    it('should return empty array for body not in manifest', () => {
      const chunks = loader.getChunksForBodyInTimeRange(9999, 2455000, 2456000);
      expect(chunks).toHaveLength(0);
    });

    it('should return empty array for time range with no data', () => {
      const chunks = loader.getChunksForBodyInTimeRange(399, 2450000, 2451000);
      expect(chunks).toHaveLength(0);
    });
  });

  describe('getTimeRangeForBody', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });
      await loader.load();
    });

    it('should return combined time range for Earth', () => {
      const range = loader.getTimeRangeForBody(399);
      expect(range).not.toBeNull();
      expect(range!.start).toBe(2454868.5);
      expect(range!.end).toBe(2458518.5);
    });

    it('should return time range for Io', () => {
      const range = loader.getTimeRangeForBody(501);
      expect(range).not.toBeNull();
      expect(range!.start).toBe(2454868.5);
      expect(range!.end).toBe(2456693.5);
    });

    it('should return null for body not in manifest', () => {
      const range = loader.getTimeRangeForBody(9999);
      expect(range).toBeNull();
    });
  });

  describe('getAllBodies', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });
      await loader.load();
    });

    it('should throw error if manifest not loaded', () => {
      const newLoader = new ManifestLoader();
      expect(() => newLoader.getAllBodies()).toThrow('Manifest not loaded');
    });

    it('should return all unique body IDs sorted', () => {
      const bodies = loader.getAllBodies();
      expect(bodies).toContain(199); // Mercury
      expect(bodies).toContain(299); // Venus
      expect(bodies).toContain(301); // Moon
      expect(bodies).toContain(399); // Earth
      expect(bodies).toContain(501); // Io
      expect(bodies).toContain(502); // Europa
      expect(bodies).toContain(503); // Ganymede
      expect(bodies).toContain(504); // Callisto
      
      // Should be sorted
      for (let i = 1; i < bodies.length; i++) {
        expect(bodies[i]).toBeGreaterThan(bodies[i - 1]);
      }
    });

    it('should not contain duplicates', () => {
      const bodies = loader.getAllBodies();
      const uniqueBodies = Array.from(new Set(bodies));
      expect(bodies).toEqual(uniqueBodies);
    });
  });

  describe('isDataAvailable', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      });
      await loader.load();
    });

    it('should throw error if manifest not loaded', () => {
      const newLoader = new ManifestLoader();
      expect(() => newLoader.isDataAvailable(399, 2455000)).toThrow('Manifest not loaded');
    });

    it('should return true for Earth at time with data', () => {
      expect(loader.isDataAvailable(399, 2455000)).toBe(true);
    });

    it('should return false for Earth at time without data', () => {
      expect(loader.isDataAvailable(399, 2450000)).toBe(false);
    });

    it('should return false for body not in manifest', () => {
      expect(loader.isDataAvailable(9999, 2455000)).toBe(false);
    });

    it('should return true at chunk boundaries', () => {
      expect(loader.isDataAvailable(399, 2454868.5)).toBe(true);
      expect(loader.isDataAvailable(399, 2456693.5)).toBe(true);
    });
  });
});
