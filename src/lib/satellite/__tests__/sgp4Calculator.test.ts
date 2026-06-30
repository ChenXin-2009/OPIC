import { SGP4Calculator } from '../sgp4Calculator';
import type { TLEData } from '@/lib/types/satellite';

// Mock Worker for jsdom
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage(data: any): void {
    // Simulate ready message on construction
    setTimeout(() => {
      this.onmessage?.({ data: { type: 'ready' } } as MessageEvent);
    }, 0);
  }
  terminate(): void {}
}
(globalThis as any).Worker = MockWorker;

describe('SGP4Calculator', () => {
  let calculator: SGP4Calculator;

  beforeEach(() => {
    jest.clearAllMocks();
    calculator = new SGP4Calculator();
  });

  afterEach(() => {
    calculator.dispose();
  });

  it('should initialize with worker', () => {
    expect((calculator as any).isInitialized).toBe(true);
  });

  it('should update TLE cache', () => {
    const tles: TLEData[] = [
      {
        noradId: 25544,
        name: 'ISS (ZARYA)',
        line1: '1 25544U 98067A   24182.50000000  .00000000  00000+0  00000+0 0  9992',
        line2: '2 25544  51.6400 200.0000 0007000 250.0000 110.0000 15.50000000350000',
        category: 'station',
      },
    ];
    calculator.updateTLECache(tles);
    const state = calculator.getCachedState(25544);
    expect(state).toBeUndefined(); // cachedState not set until calculation
  });

  it('should clear cache', () => {
    const tles: TLEData[] = [
      {
        noradId: 25544,
        name: 'ISS',
        line1: '1 25544U 98067A   24182.50000000  .00000000  00000+0  00000+0 0  9992',
        line2: '2 25544  51.6400 200.0000 0007000 250.0000 110.0000 15.50000000350000',
        category: 'station',
      },
    ];
    calculator.updateTLECache(tles);
    calculator.clearCache();
    expect(calculator.getCachedState(25544)).toBeUndefined();
  });

  it('should return undefined for unknown satellite', () => {
    expect(calculator.getCachedState(99999)).toBeUndefined();
  });

  it('should dispose and clean up', () => {
    const workerSpy = jest.spyOn(MockWorker.prototype, 'terminate');
    calculator.dispose();
    expect((calculator as any).isInitialized).toBe(false);
    expect((calculator as any).worker).toBeNull();
    expect((calculator as any).tleCache.size).toBe(0);
    expect((calculator as any).pendingRequests.size).toBe(0);
  });

  describe('dateToJulianDate', () => {
    it('should convert Date to Julian date', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const jd = (calculator as any).dateToJulianDate(date);
      expect(jd).toBeCloseTo(2460310.5, 1);
    });

    it('should convert timestamp to Julian date', () => {
      const timestamp = new Date('2024-01-01T00:00:00Z').getTime();
      const jd = (calculator as any).dateToJulianDate(timestamp);
      expect(jd).toBeCloseTo(2460310.5, 1);
    });
  });

  describe('calculateOrbitalElements', () => {
    it('should calculate orbital elements from TLE', () => {
      const tle: TLEData = {
        noradId: 25544,
        name: 'ISS',
        line1: '1 25544U 98067A   24182.50000000  .00000000  00000+0  00000+0 0  9992',
        line2: '2 25544  51.6400 200.0000 0007000 250.0000 110.0000 15.50000000350000',
        category: 'station',
      };
      const position = new (require('three').Vector3)(1, 0, 0);
      const velocity = new (require('three').Vector3)(0, 1, 0);
      const elements = (calculator as any).calculateOrbitalElements(position, velocity, tle);
      expect(elements.inclination).toBeCloseTo(51.64);
      expect(elements.eccentricity).toBeCloseTo(0.0007);
      expect(elements.meanMotion).toBeCloseTo(15.5);
      expect(elements.period).toBeCloseTo(1440 / 15.5, 0);
      expect(elements.semiMajorAxis).toBeGreaterThan(0);
      expect(elements.apogee).toBeGreaterThan(0);
      expect(elements.perigee).toBeGreaterThan(0);
    });
  });
});
