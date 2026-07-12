import { calculatePosition } from '../mechanics';
import { ORBITAL_ELEMENTS, ACCURACY_INFO } from '../data';
import { AllBodiesCalculator } from '../../ephemeris/all-bodies-calculator';
import { SatelliteId, Vector3 } from '../../ephemeris/types';
import { AU_IN_KM } from '@/lib/astronomy/utils/constants';

const mockGetBodies = jest.fn().mockReturnValue([]);

jest.mock('../mechanics', () => ({
  calculatePosition: jest.fn(),
}));

jest.mock('../../ephemeris/all-bodies-calculator', () => ({
  AllBodiesCalculator: jest.fn(() => ({ getBodies: mockGetBodies })),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn() },
}));

import {
  OrbitSystemPositionProvider,
  shouldUseEphemeris,
  getSatelliteKey,
  getSatelliteId,
} from '../ephemeris-integration';

describe('OrbitSystemPositionProvider', () => {
  let provider: OrbitSystemPositionProvider;

  beforeEach(() => {
    provider = new OrbitSystemPositionProvider();
    jest.clearAllMocks();
  });

  describe('getEarthPosition', () => {
    it('should call calculatePosition with earth elements and return Vector3', () => {
      const mockPos = { x: 1.0, y: 0.1, z: 0.01, r: 1.005 };
      (calculatePosition as jest.Mock).mockReturnValue(mockPos);
      const jd = 2458849.5;

      const result = provider.getEarthPosition(jd);

      expect(calculatePosition).toHaveBeenCalledTimes(1);
      expect(calculatePosition).toHaveBeenCalledWith(ORBITAL_ELEMENTS.earth, jd);
      expect(result).toBeInstanceOf(Vector3);
      expect(result.x).toBe(mockPos.x);
      expect(result.y).toBe(mockPos.y);
      expect(result.z).toBe(mockPos.z);
    });

    it('should return different positions for different times', () => {
      const posA = { x: 1.0, y: 0.0, z: 0.0, r: 1.0 };
      const posB = { x: 0.5, y: 0.8, z: 0.1, r: 0.95 };
      (calculatePosition as jest.Mock)
        .mockReturnValueOnce(posA)
        .mockReturnValueOnce(posB);

      const resultA = provider.getEarthPosition(2458849.5);
      const resultB = provider.getEarthPosition(2458850.5);

      expect(resultA.x).toBe(posA.x);
      expect(resultB.x).toBe(posB.x);
    });
  });

  describe('getJupiterPosition', () => {
    it('should call calculatePosition with jupiter elements and return Vector3', () => {
      const mockPos = { x: 5.2, y: 1.3, z: 0.2, r: 5.36 };
      (calculatePosition as jest.Mock).mockReturnValue(mockPos);
      const jd = 2458849.5;

      const result = provider.getJupiterPosition(jd);

      expect(calculatePosition).toHaveBeenCalledTimes(1);
      expect(calculatePosition).toHaveBeenCalledWith(ORBITAL_ELEMENTS.jupiter, jd);
      expect(result).toBeInstanceOf(Vector3);
      expect(result.x).toBe(mockPos.x);
      expect(result.y).toBe(mockPos.y);
      expect(result.z).toBe(mockPos.z);
    });
  });

  describe('getEarthVelocity', () => {
    it('should compute velocity using finite difference and scale to km/s', () => {
      const jd = 2458849.5;
      const dt = 1.0 / 86400.0;
      const pos1 = { x: 0.999, y: 0.001, z: 0.0001, r: 0.999 };
      const pos2 = { x: 1.001, y: 0.003, z: 0.0002, r: 1.001 };
      (calculatePosition as jest.Mock)
        .mockReturnValueOnce(pos1)
        .mockReturnValueOnce(pos2);

      const result = provider.getEarthVelocity(jd);

      expect(calculatePosition).toHaveBeenCalledTimes(2);
      expect(calculatePosition).toHaveBeenCalledWith(ORBITAL_ELEMENTS.earth, jd - dt / 2);
      expect(calculatePosition).toHaveBeenCalledWith(ORBITAL_ELEMENTS.earth, jd + dt / 2);

      const vx = (pos2.x - pos1.x) / dt;
      const vy = (pos2.y - pos1.y) / dt;
      const vz = (pos2.z - pos1.z) / dt;
      const scale = AU_IN_KM / 86400.0;
      expect(result.x).toBeCloseTo(vx * scale, 10);
      expect(result.y).toBeCloseTo(vy * scale, 10);
      expect(result.z).toBeCloseTo(vz * scale, 10);
    });

    it('should return finite values', () => {
      (calculatePosition as jest.Mock)
        .mockReturnValueOnce({ x: 1, y: 0, z: 0, r: 1 })
        .mockReturnValueOnce({ x: 1.001, y: 0.002, z: 0.0001, r: 1.001 });

      const result = provider.getEarthVelocity(2458849.5);

      expect(isFinite(result.x)).toBe(true);
      expect(isFinite(result.y)).toBe(true);
      expect(isFinite(result.z)).toBe(true);
    });
  });
});

describe('shouldUseEphemeris', () => {
  let localStorageSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorageSpy = jest.spyOn(Storage.prototype, 'getItem');
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorageSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should return false when window is undefined', () => {
    const originalWindow = (global as any).window;
    delete (global as any).window;
    try {
      expect(shouldUseEphemeris(399)).toBe(false);
    } finally {
      (global as any).window = originalWindow;
    }
  });

  it('should return false when localStorage has no ephemeris-settings', () => {
    localStorageSpy.mockReturnValue(null);
    expect(shouldUseEphemeris(399)).toBe(false);
    expect(localStorageSpy).toHaveBeenCalledWith('ephemeris-settings');
  });

  it('should return false when stored value is empty string', () => {
    localStorageSpy.mockReturnValue('');
    expect(shouldUseEphemeris(399)).toBe(false);
  });

  it('should return false when settings has no state.bodies', () => {
    localStorageSpy.mockReturnValue(JSON.stringify({}));
    expect(shouldUseEphemeris(399)).toBe(false);
  });

  it('should return false when state.bodies is empty', () => {
    localStorageSpy.mockReturnValue(JSON.stringify({ state: { bodies: {} } }));
    expect(shouldUseEphemeris(399)).toBe(false);
  });

  it('should return false when body key is not found in naifId map', () => {
    localStorageSpy.mockReturnValue(JSON.stringify({
      state: { bodies: { earth: { enabled: true } } },
    }));
    expect(shouldUseEphemeris(99999)).toBe(false);
  });

  it('should return true when body is enabled in settings', () => {
    localStorageSpy.mockReturnValue(JSON.stringify({
      state: { bodies: { jupiter: { enabled: true } } },
    }));
    expect(shouldUseEphemeris(5)).toBe(true);
  });

  it('should return false when body is disabled in settings', () => {
    localStorageSpy.mockReturnValue(JSON.stringify({
      state: { bodies: { earth: { enabled: false } } },
    }));
    expect(shouldUseEphemeris(399)).toBe(false);
  });

  it('should return false for invalid JSON and log a warning', () => {
    localStorageSpy.mockReturnValue('not-valid-json');
    expect(shouldUseEphemeris(399)).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should correctly map all known NAIF IDs to body keys', () => {
    const naifBodyKeys: Array<[number, string]> = [
      [199, 'mercury'], [299, 'venus'], [399, 'earth'], [4, 'mars'],
      [5, 'jupiter'], [6, 'saturn'], [7, 'uranus'], [8, 'neptune'],
      [301, 'moon'],
      [501, 'io'], [502, 'europa'], [503, 'ganymede'], [504, 'callisto'],
      [601, 'mimas'], [602, 'enceladus'], [603, 'tethys'], [604, 'dione'],
      [605, 'rhea'], [606, 'titan'], [607, 'hyperion'], [608, 'iapetus'],
      [701, 'ariel'], [702, 'umbriel'], [703, 'titania'], [704, 'oberon'], [705, 'miranda'],
      [801, 'triton'],
    ];
    const bodies: Record<string, { enabled: boolean }> = {};
    for (const [, key] of naifBodyKeys) {
      bodies[key] = { enabled: true };
    }
    localStorageSpy.mockReturnValue(JSON.stringify({ state: { bodies } }));

    for (const [naifId] of naifBodyKeys) {
      expect(shouldUseEphemeris(naifId)).toBe(true);
    }
  });
});

describe('getSatelliteKey', () => {
  it('should return "Io" for SatelliteId.IO', () => {
    expect(getSatelliteKey(SatelliteId.IO)).toBe('Io');
  });

  it('should return "Europa" for SatelliteId.EUROPA', () => {
    expect(getSatelliteKey(SatelliteId.EUROPA)).toBe('Europa');
  });

  it('should return "Ganymede" for SatelliteId.GANYMEDE', () => {
    expect(getSatelliteKey(SatelliteId.GANYMEDE)).toBe('Ganymede');
  });

  it('should return "Callisto" for SatelliteId.CALLISTO', () => {
    expect(getSatelliteKey(SatelliteId.CALLISTO)).toBe('Callisto');
  });

  it('should return empty string for unknown SatelliteId', () => {
    expect(getSatelliteKey(999 as SatelliteId)).toBe('');
  });
});

describe('getSatelliteId', () => {
  it('should return SatelliteId.IO for "Io"', () => {
    expect(getSatelliteId('Io')).toBe(SatelliteId.IO);
  });

  it('should return SatelliteId.EUROPA for "Europa"', () => {
    expect(getSatelliteId('Europa')).toBe(SatelliteId.EUROPA);
  });

  it('should return SatelliteId.GANYMEDE for "Ganymede"', () => {
    expect(getSatelliteId('Ganymede')).toBe(SatelliteId.GANYMEDE);
  });

  it('should return SatelliteId.CALLISTO for "Callisto"', () => {
    expect(getSatelliteId('Callisto')).toBe(SatelliteId.CALLISTO);
  });

  it('should return null for unknown name', () => {
    expect(getSatelliteId('Titan')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(getSatelliteId('')).toBeNull();
  });
});

describe('getAllBodiesCalculator and initializeAllBodiesCalculator', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetBodies.mockClear();
    mockGetBodies.mockReturnValue([]);
  });

  it('should return null before initialization', () => {
    const mod = require('../ephemeris-integration');
    expect(mod.getAllBodiesCalculator()).toBeNull();
  });

  it('should create AllBodiesCalculator and resolve when successful', async () => {
    const mod = require('../ephemeris-integration');
    await mod.initializeAllBodiesCalculator();
    expect(mod.getAllBodiesCalculator()).not.toBeNull();
  });

  it('should invoke callbacks with body information when bodies have timeRange', async () => {
    const mod = require('../ephemeris-integration');
    mockGetBodies.mockReturnValue([
      { naifId: 399, name: 'Earth', timeRange: { start: 2451545.0, end: 2461545.0 } },
      { naifId: 5, name: 'Jupiter', timeRange: { start: 2451545.0, end: 2461545.0 } },
    ]);

    const setBodyStatus = jest.fn();
    const setBodyTimeRange = jest.fn();
    const setBodyAccuracy = jest.fn();

    await mod.initializeAllBodiesCalculator({
      setBodyStatus,
      setBodyTimeRange,
      setBodyAccuracy,
    });

    expect(setBodyTimeRange).toHaveBeenCalledTimes(2);
    expect(setBodyTimeRange).toHaveBeenCalledWith('earth', 2451545.0, 2461545.0);
    expect(setBodyTimeRange).toHaveBeenCalledWith('jupiter', 2451545.0, 2461545.0);
    expect(setBodyAccuracy).toHaveBeenCalledTimes(2);
    expect(setBodyAccuracy).toHaveBeenCalledWith('earth', ACCURACY_INFO.ephemeris, ACCURACY_INFO.analytical);
    expect(setBodyAccuracy).toHaveBeenCalledWith('jupiter', ACCURACY_INFO.ephemeris, ACCURACY_INFO.analytical);
    expect(setBodyStatus).not.toHaveBeenCalled();
  });

  it('should not call callbacks for bodies without timeRange', async () => {
    const mod = require('../ephemeris-integration');
    mockGetBodies.mockReturnValue([
      { naifId: 399, name: 'Earth', timeRange: null },
    ]);

    const setBodyTimeRange = jest.fn();
    const setBodyAccuracy = jest.fn();

    await mod.initializeAllBodiesCalculator({ setBodyTimeRange, setBodyAccuracy });

    expect(setBodyTimeRange).not.toHaveBeenCalled();
    expect(setBodyAccuracy).not.toHaveBeenCalled();
  });

  it('should handle bodies with null naifId gracefully', async () => {
    const mod = require('../ephemeris-integration');
    mockGetBodies.mockReturnValue([
      { naifId: null, name: 'Unknown', timeRange: { start: 1, end: 2 } },
    ]);

    const setBodyTimeRange = jest.fn();

    await expect(mod.initializeAllBodiesCalculator({ setBodyTimeRange })).resolves.toBeUndefined();
    expect(setBodyTimeRange).not.toHaveBeenCalled();
  });

  it('should not re-initialize on double call', async () => {
    const mod = require('../ephemeris-integration');

    const promise1 = mod.initializeAllBodiesCalculator();
    const promise2 = mod.initializeAllBodiesCalculator();

    // The guard clause prevents the init IIFE from running twice;
    // getBodies (inside the IIFE) is only called once.
    expect(mockGetBodies).toHaveBeenCalledTimes(1);

    // Both calls resolve successfully
    await expect(promise1).resolves.toBeUndefined();
    await expect(promise2).resolves.toBeUndefined();

    // Calculator instance is the same after both calls
    const calc1 = mod.getAllBodiesCalculator();
    const calc2 = mod.getAllBodiesCalculator();
    expect(calc1).toBe(calc2);
  });

  it('should reset calculator and initPromise on error, then throw', async () => {
    const mod = require('../ephemeris-integration');
    mockGetBodies.mockImplementation(() => { throw new Error('getBodies failed'); });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(mod.initializeAllBodiesCalculator()).rejects.toThrow('getBodies failed');
    expect(mod.getAllBodiesCalculator()).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
