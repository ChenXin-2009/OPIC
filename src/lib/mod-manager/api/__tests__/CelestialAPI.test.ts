import { CelestialAPIImpl, getCelestialAPI, resetCelestialAPI } from '../CelestialAPI';
import { resetEventBus } from '../../core/EventBus';
import type { OrbitalElementsData, CelestialBodyData } from '../../types';

jest.mock('../../core/EventBus', () => {
  const actual = jest.requireActual('../../core/EventBus');
  return {
    ...actual,
    getEventBus: jest.fn(() => actual.getEventBus()),
  };
});

jest.mock('@/lib/astronomy/utils/constants', () => ({
  J2000_JD: 2451545.0,
}));

describe('CelestialAPIImpl', () => {
  let api: CelestialAPIImpl;

  beforeEach(() => {
    resetEventBus();
    resetCelestialAPI();
    api = new CelestialAPIImpl();
  });

  afterEach(() => {
    resetCelestialAPI();
    resetEventBus();
  });

  describe('initialization', () => {
    it('should initialize with empty bodies', () => {
      expect(api.getCelestialBodies()).toEqual([]);
    });

    it('should return empty orbital elements', () => {
      expect(api.ORBITAL_ELEMENTS).toEqual({});
    });

    it('should return empty CELESTIAL_BODIES', () => {
      expect(api.CELESTIAL_BODIES).toEqual({});
    });
  });

  describe('getCelestialBodies', () => {
    it('should return a copy of bodies array', () => {
      const body: CelestialBodyData = { name: 'Earth', x: 1, y: 0, z: 0, r: 1, radius: 0.00004, color: '#4488ff' };
      api._updateBodies([body]);
      const bodies = api.getCelestialBodies();
      bodies.pop();
      expect(api.getCelestialBodies()).toHaveLength(1);
    });
  });

  describe('getOrbitalElements', () => {
    it('should return null for unknown body', () => {
      expect(api.getOrbitalElements('NonExistent')).toBeNull();
    });

    it('should return elements for known body', () => {
      const elements: Record<string, OrbitalElementsData> = {
        Earth: { a: 1, e: 0.0167, i: 0, L: 1.0, w_bar: 1.8, O: 0 },
      };
      api._setOrbitalElements(elements);
      expect(api.getOrbitalElements('Earth')).toEqual(elements.Earth);
    });
  });

  describe('calculatePosition', () => {
    it('should calculate position for circular orbit', () => {
      const elements: OrbitalElementsData = { a: 1, e: 0, i: 0, L: 0, w_bar: 0, O: 0 };
      const result = api.calculatePosition(elements, 2451545.0);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(result).toHaveProperty('z');
      expect(result).toHaveProperty('r');
      expect(typeof result.x).toBe('number');
      expect(typeof result.r).toBe('number');
    });

    it('should return finite values for realistic elements', () => {
      const elements: OrbitalElementsData = { a: 1.524, e: 0.0934, i: 0.0323, L: 6.240, w_bar: 5.865, O: 0.865 };
      const result = api.calculatePosition(elements, 2451545.0);
      expect(Number.isFinite(result.x)).toBe(true);
      expect(Number.isFinite(result.y)).toBe(true);
      expect(Number.isFinite(result.r)).toBe(true);
      expect(result.z).toBe(0);
    });

    it('should return z=0 (simplified, no inclination)', () => {
      const elements: OrbitalElementsData = { a: 2, e: 0.1, i: 0.5, L: 1, w_bar: 0.5, O: 0.3 };
      const result = api.calculatePosition(elements, 2451545.0);
      expect(result.z).toBe(0);
    });

    it('should compute different positions for different times', () => {
      const elements: OrbitalElementsData = { a: 1, e: 0.1, i: 0, L: 0, w_bar: 0, O: 0 };
      const r1 = api.calculatePosition(elements, 2451545.0);
      const r2 = api.calculatePosition(elements, 2452000.0);
      expect(r1.x).not.toBeCloseTo(r2.x, 5);
    });
  });

  describe('dateToJulianDay', () => {
    it('should convert J2000.0 epoch', () => {
      const jd = api.dateToJulianDay(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)));
      expect(jd).toBeCloseTo(2451545.5, 0);
    });

    it('should convert a recent date', () => {
      const jd = api.dateToJulianDay(new Date(Date.UTC(2023, 0, 1, 0, 0, 0)));
      expect(jd).toBeGreaterThan(2459945);
      expect(jd).toBeLessThan(2459947);
    });
  });

  describe('julianDayToDate', () => {
    it('should convert J2000.0 back to Date', () => {
      const date = api.julianDayToDate(2451545.0);
      expect(date.getUTCFullYear()).toBe(2000);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
    });

    it('should roundtrip dateToJulianDay', () => {
      const original = new Date(Date.UTC(2023, 5, 15, 0, 0, 0));
      const jd = api.dateToJulianDay(original);
      const result = api.julianDayToDate(jd);
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(5);
      expect(result.getUTCDate()).toBe(15);
    });
  });

  describe('onBodiesUpdate', () => {
    it('should call callback on update', () => {
      const cb = jest.fn();
      api.onBodiesUpdate(cb);
      api._updateBodies([{ name: 'Mars', x: 1, y: 0, z: 0, r: 1, radius: 0.00003, color: '#ff4400' }]);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Mars' })])
      );
    });

    it('should return unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = api.onBodiesUpdate(cb);
      unsub();
      api._updateBodies([]);
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not throw if callback throws', () => {
      const badCb = jest.fn(() => { throw new Error('boom'); });
      const goodCb = jest.fn();
      api.onBodiesUpdate(badCb);
      api.onBodiesUpdate(goodCb);
      expect(() => api._updateBodies([])).not.toThrow();
      expect(goodCb).toHaveBeenCalled();
    });
  });

  describe('_setOrbitalElements', () => {
    it('should store a copy', () => {
      const elements = { Earth: { a: 1, e: 0, i: 0, L: 0, w_bar: 0, O: 0 } };
      api._setOrbitalElements(elements);
      delete elements.Earth;
      expect(api.getOrbitalElements('Earth')).not.toBeNull();
    });
  });

  describe('_updateBodies', () => {
    it('should store a copy of bodies', () => {
      const bodies: CelestialBodyData[] = [
        { name: 'A', x: 0, y: 0, z: 0, r: 0, radius: 0, color: '#fff' },
      ];
      api._updateBodies(bodies);
      bodies.pop();
      expect(api.getCelestialBodies()).toHaveLength(1);
    });

    it('should emit bodies:update event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('bodies:update', handler);
      api._updateBodies([]);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CelestialAPI singleton', () => {
  afterEach(() => {
    resetCelestialAPI();
    resetEventBus();
  });

  it('should return same instance', () => {
    const a = getCelestialAPI();
    const b = getCelestialAPI();
    expect(a).toBe(b);
  });

  it('should reset singleton', () => {
    const a = getCelestialAPI();
    resetCelestialAPI();
    const b = getCelestialAPI();
    expect(a).not.toBe(b);
  });
});
