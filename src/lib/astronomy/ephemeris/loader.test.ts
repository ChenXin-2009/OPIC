/**
 * Unit tests for EphemerisDataLoader
 */

import { EphemerisDataLoader } from './loader';
import { EphemerisData, SatelliteId, Vector3 } from './types';
import pako from 'pako';

// Mock fetch globally
global.fetch = jest.fn();

describe('EphemerisDataLoader', () => {
  let loader: EphemerisDataLoader;

  beforeEach(() => {
    loader = new EphemerisDataLoader();
    jest.clearAllMocks();
  });

  /**
   * Helper function to create a valid ephemeris binary file
   */
  function createValidEphemerisData(): Uint8Array {
    const buffer = new ArrayBuffer(128 + 4 * (4 + 2 * 12)); // Header + 4 satellites × (ID + 2 positions)
    const view = new DataView(buffer);
    let offset = 0;

    // Write header
    // Magic number: "JUPM" = 0x4A55504D
    view.setUint32(offset, 0x4A55504D, true);
    offset += 4;

    // Version: 1
    view.setUint16(offset, 1, true);
    offset += 2;

    // Num satellites: 4
    view.setUint16(offset, 4, true);
    offset += 2;

    // Num samples: 2
    view.setUint32(offset, 2, true);
    offset += 4;

    // Start JD: 2451545.0 (J2000.0)
    view.setFloat64(offset, 2451545.0, true);
    offset += 8;

    // End JD: 2451545.1
    view.setFloat64(offset, 2451545.1, true);
    offset += 8;

    // Step size: 0.1 days
    view.setFloat64(offset, 0.1, true);
    offset += 8;

    // Kernel versions: "DE440, JUP365"
    const kernelVersions = 'DE440, JUP365';
    const encoder = new TextEncoder();
    const kernelBytes = encoder.encode(kernelVersions);
    const kernelArray = new Uint8Array(buffer, offset, 64);
    kernelArray.set(kernelBytes);
    offset += 64;

    // Generation timestamp: 1609459200000 (2021-01-01)
    view.setFloat64(offset, 1609459200000, true);
    offset += 8;

    // Reserved: 20 bytes (skip)
    offset += 20;

    // Write satellite data
    const satellites = [
      SatelliteId.IO,
      SatelliteId.EUROPA,
      SatelliteId.GANYMEDE,
      SatelliteId.CALLISTO
    ];

    for (let i = 0; i < satellites.length; i++) {
      // Satellite ID
      view.setInt32(offset, satellites[i], true);
      offset += 4;

      // Two positions per satellite
      for (let j = 0; j < 2; j++) {
        view.setFloat32(offset, 1.0 + i + j * 0.1, true); // x
        offset += 4;
        view.setFloat32(offset, 2.0 + i + j * 0.1, true); // y
        offset += 4;
        view.setFloat32(offset, 3.0 + i + j * 0.1, true); // z
        offset += 4;
      }
    }

    return new Uint8Array(buffer);
  }

  describe('load', () => {
    it('should successfully load and parse valid ephemeris data', async () => {
      const validData = createValidEphemerisData();
      const compressed = pako.gzip(validData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => compressed.buffer
      });

      const result = await loader.load('http://example.com/data.bin.gz');

      expect(result.header.version).toBe(1);
      expect(result.header.numSatellites).toBe(4);
      expect(result.header.numSamples).toBe(2);
      expect(result.header.startJD).toBe(2451545.0);
      expect(result.header.endJD).toBe(2451545.1);
      expect(result.header.stepDays).toBe(0.1);
      expect(result.header.kernelVersions).toBe('DE440, JUP365');

      // Check satellite data
      expect(result.satellites[SatelliteId.IO].positions).toHaveLength(2);
      expect(result.satellites[SatelliteId.IO].positions[0].x).toBeCloseTo(1.0);
      expect(result.satellites[SatelliteId.IO].positions[0].y).toBeCloseTo(2.0);
      expect(result.satellites[SatelliteId.IO].positions[0].z).toBeCloseTo(3.0);
    });

    it('should throw error on HTTP failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(loader.load('http://example.com/missing.bin.gz'))
        .rejects.toThrow('Failed to load ephemeris data: HTTP 404: Not Found');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(loader.load('http://example.com/data.bin.gz'))
        .rejects.toThrow('Failed to load ephemeris data: Network error');
    });

    it('should throw error on invalid magic number', async () => {
      const invalidData = createValidEphemerisData();
      const view = new DataView(invalidData.buffer);
      view.setUint32(0, 0xDEADBEEF, true); // Invalid magic number

      const compressed = pako.gzip(invalidData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => compressed.buffer
      });

      await expect(loader.load('http://example.com/data.bin.gz'))
        .rejects.toThrow('Invalid magic number');
    });

    it('should throw error on unsupported version', async () => {
      const invalidData = createValidEphemerisData();
      const view = new DataView(invalidData.buffer);
      view.setUint16(4, 999, true); // Unsupported version

      const compressed = pako.gzip(invalidData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => compressed.buffer
      });

      await expect(loader.load('http://example.com/data.bin.gz'))
        .rejects.toThrow('Unsupported version: 999');
    });

    it('should throw error on corrupted data (decompression failure)', async () => {
      const corruptedData = new Uint8Array([1, 2, 3, 4, 5]); // Not valid gzip

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => corruptedData.buffer
      });

      await expect(loader.load('http://example.com/data.bin.gz'))
        .rejects.toThrow('Failed to load ephemeris data');
    });
  });

  describe('loadMultiple', () => {
    it('should load multiple ephemeris files', async () => {
      const validData = createValidEphemerisData();
      const compressed = pako.gzip(validData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => compressed.buffer
      });

      const urls = [
        'http://example.com/data1.bin.gz',
        'http://example.com/data2.bin.gz'
      ];

      const results = await loader.loadMultiple(urls);

      expect(results).toHaveLength(2);
      expect(results[0].header.version).toBe(1);
      expect(results[1].header.version).toBe(1);
    });

    it('should fail if any file fails to load', async () => {
      const validData = createValidEphemerisData();
      const compressed = pako.gzip(validData);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => compressed.buffer
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });

      const urls = [
        'http://example.com/data1.bin.gz',
        'http://example.com/data2.bin.gz'
      ];

      await expect(loader.loadMultiple(urls))
        .rejects.toThrow('Failed to load ephemeris data');
    });
  });

  describe('getValidityPeriod', () => {
    it('should return correct validity period', () => {
      const data: EphemerisData = {
        header: {
          version: 1,
          numSatellites: 4,
          numSamples: 2,
          startJD: 2451545.0, // J2000.0 = 2000-01-01 12:00:00
          endJD: 2451910.0,   // ~1 year later
          stepDays: 0.1,
          kernelVersions: 'DE440, JUP365',
          generationTimestamp: 1609459200000
        },
        satellites: {
          [SatelliteId.IO]: { positions: [] },
          [SatelliteId.EUROPA]: { positions: [] },
          [SatelliteId.GANYMEDE]: { positions: [] },
          [SatelliteId.CALLISTO]: { positions: [] }
        }
      };

      const period = loader.getValidityPeriod(data);

      // Check that dates are reasonable (within a few hours of expected)
      const expectedStart = new Date('2000-01-01T12:00:00Z');
      const timeDiff = Math.abs(period.start.getTime() - expectedStart.getTime());
      expect(timeDiff).toBeLessThan(3600000); // Within 1 hour

      // Check that end is after start
      expect(period.end.getTime()).toBeGreaterThan(period.start.getTime());
    });
  });

  describe('validation', () => {
    it('should reject data with wrong number of satellites', async () => {
      const invalidData = createValidEphemerisData();
      const view = new DataView(invalidData.buffer);
      view.setUint16(6, 3, true); // Set numSatellites to 3 instead of 4

      const compressed = pako.gzip(invalidData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => compressed.buffer
      });

      await expect(loader.load('http://example.com/data.bin.gz'))
        .rejects.toThrow('Expected 4 satellites, got 3');
    });

    it('should reject data with invalid time range', async () => {
      const invalidData = createValidEphemerisData();
      const view = new DataView(invalidData.buffer);
      // Set endJD < startJD
      view.setFloat64(12, 2451545.0, true); // startJD
      view.setFloat64(20, 2451544.0, true); // endJD (earlier)

      const compressed = pako.gzip(invalidData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => compressed.buffer
      });

      await expect(loader.load('http://example.com/data.bin.gz'))
        .rejects.toThrow('Invalid time range');
    });

    it('should reject data with non-finite positions', async () => {
      const invalidData = createValidEphemerisData();
      const view = new DataView(invalidData.buffer);
      // Set first position x to NaN
      view.setFloat32(128 + 4, NaN, true);

      const compressed = pako.gzip(invalidData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => compressed.buffer
      });

      await expect(loader.load('http://example.com/data.bin.gz'))
        .rejects.toThrow('non-finite position');
    });
  });
});
