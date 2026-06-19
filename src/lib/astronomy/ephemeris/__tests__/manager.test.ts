import { EphemerisManager } from '../manager';
import { PolynomialType } from '../types';

jest.mock('../chunk-loader', () => ({
  ChunkLoader: jest.fn().mockImplementation(() => ({
    loadChunk: jest.fn().mockResolvedValue({
      bodyId: 399,
      startJD: 2454868.5,
      endJD: 2454869.5,
      segments: [],
      metadata: { version: 2, bodyId: 399, polynomialType: PolynomialType.CHEBYSHEV, segmentCount: 0 },
    }),
    getCached: jest.fn().mockReturnValue(null),
    clear: jest.fn(),
  })),
}));

jest.mock('../manifest-loader', () => ({
  ManifestLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue({
      version: 2,
      bodies: {},
      chunks: [],
    }),
    getManifest: jest.fn().mockReturnValue(null),
    getChunkForBodyAtTime: jest.fn().mockReturnValue(null),
  })),
}));

describe('EphemerisManager', () => {
  let manager: EphemerisManager;

  beforeEach(() => {
    manager = new EphemerisManager();
  });

  describe('getBodies', () => {
    it('should return array of body configs', () => {
      const bodies = manager.getBodies();
      expect(Array.isArray(bodies)).toBe(true);
      expect(bodies.length).toBeGreaterThan(0);
    });

    it('should include Earth (399)', () => {
      const bodies = manager.getBodies();
      const earth = bodies.find(b => b.naifId === 399);
      expect(earth).toBeDefined();
      expect(earth!.name).toBe('Earth');
    });
  });

  describe('getStatus', () => {
    it('should return status for known body', () => {
      const status = manager.getStatus(399);
      expect(status).toBeDefined();
      expect(status.bodyId).toBe(399);
      expect(status.bodyName).toBe('Earth');
    });

    it('should throw for unknown body', () => {
      expect(() => manager.getStatus(99999)).toThrow('Unknown body ID');
    });
  });

  describe('isLoaded', () => {
    it('should return false before loading', () => {
      expect(manager.isLoaded(399, 2454868.5)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should not throw', () => {
      expect(() => manager.clear()).not.toThrow();
    });
  });
});
