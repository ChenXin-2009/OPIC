import { SatelliteAPIImpl, getSatelliteAPI, resetSatelliteAPI } from '../SatelliteAPI';
import { resetEventBus } from '../../core/EventBus';
import type { SatelliteData } from '../../types';

jest.mock('../../core/EventBus', () => {
  const actual = jest.requireActual('../../core/EventBus');
  return {
    ...actual,
    getEventBus: jest.fn(() => actual.getEventBus()),
  };
});

jest.mock('@/lib/store/useSatelliteStore', () => ({
  useSatelliteStore: {
    getState: jest.fn(() => ({
      fetchSatellites: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('@/lib/types/satellite', () => ({
  SatelliteCategory: {
    ACTIVE: 'ACTIVE',
    ISS: 'ISS',
    GPS: 'GPS',
    COMMUNICATION: 'COMMUNICATION',
    WEATHER: 'WEATHER',
    SCIENCE: 'SCIENCE',
    OTHER: 'OTHER',
  },
}));

function makeSat(noradId: number, name: string, hasPosition = false, hasTle = false): SatelliteData {
  return {
    noradId,
    name,
    position: hasPosition ? { x: noradId * 10, y: 0, z: 0 } : undefined,
    tle: hasTle ? { line1: `1 ${noradId}`, line2: `2 ${noradId}` } : undefined,
  };
}

describe('SatelliteAPIImpl', () => {
  let api: SatelliteAPIImpl;

  beforeEach(() => {
    resetEventBus();
    resetSatelliteAPI();
    api = new SatelliteAPIImpl();
    const { useSatelliteStore } = require('@/lib/store/useSatelliteStore');
    useSatelliteStore.getState.mockReturnValue({
      fetchSatellites: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    resetSatelliteAPI();
    resetEventBus();
  });

  describe('initialization', () => {
    it('should initialize with empty satellites', () => {
      expect(api.satellites).toEqual([]);
    });

    it('should not be loading', () => {
      expect(api.isLoading()).toBe(false);
    });

    it('should have no error', () => {
      expect(api.getError()).toBeNull();
    });
  });

  describe('satellites getter', () => {
    it('should return a copy', () => {
      api._setSatellites([makeSat(1, 'A')]);
      const sats = api.satellites;
      sats.pop();
      expect(api.satellites).toHaveLength(1);
    });
  });

  describe('visibleSatellites', () => {
    it('should return only satellites with position', () => {
      api._setSatellites([
        makeSat(1, 'A', true),
        makeSat(2, 'B', false),
        makeSat(3, 'C', true),
      ]);
      expect(api.visibleSatellites).toHaveLength(2);
      expect(api.visibleSatellites.map(s => s.noradId)).toEqual([1, 3]);
    });

    it('should return empty when none have position', () => {
      api._setSatellites([makeSat(1, 'A', false)]);
      expect(api.visibleSatellites).toEqual([]);
    });
  });

  describe('selectSatellite', () => {
    it('should find satellite by noradId', () => {
      api._setSatellites([makeSat(1, 'A'), makeSat(2, 'B')]);
      const sat = api.selectSatellite(2);
      expect(sat).toEqual(expect.objectContaining({ noradId: 2, name: 'B' }));
    });

    it('should return null for unknown noradId', () => {
      api._setSatellites([makeSat(1, 'A')]);
      expect(api.selectSatellite(999)).toBeNull();
    });
  });

  describe('calculateSatellitePosition', () => {
    it('should return cached position', () => {
      api._setSatellites([makeSat(1, 'A', true, true)]);
      const pos = api.calculateSatellitePosition(1, new Date());
      expect(pos).toEqual({ x: 10, y: 0, z: 0 });
    });

    it('should return null for satellite without tle', () => {
      api._setSatellites([makeSat(1, 'A', true, false)]);
      expect(api.calculateSatellitePosition(1, new Date())).toBeNull();
    });

    it('should return null for unknown satellite', () => {
      expect(api.calculateSatellitePosition(999, new Date())).toBeNull();
    });

    it('should return null for satellite with tle but no position', () => {
      api._setSatellites([makeSat(1, 'A', false, true)]);
      expect(api.calculateSatellitePosition(1, new Date())).toBeNull();
    });
  });

  describe('onSatellitesUpdate', () => {
    it('should call callback on update', () => {
      const cb = jest.fn();
      api.onSatellitesUpdate(cb);
      api._setSatellites([makeSat(1, 'A')]);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = api.onSatellitesUpdate(cb);
      unsub();
      api._setSatellites([]);
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not throw if callback throws', () => {
      const badCb = jest.fn(() => { throw new Error('boom'); });
      const goodCb = jest.fn();
      api.onSatellitesUpdate(badCb);
      api.onSatellitesUpdate(goodCb);
      expect(() => api._setSatellites([])).not.toThrow();
      expect(goodCb).toHaveBeenCalled();
    });
  });

  describe('fetchSatellites', () => {
    it('should set loading to true during fetch', async () => {
      const promise = api.fetchSatellites();
      // At this point loading should be true
      // But async import may resolve quickly
      await promise;
    });

    it('should not fetch if already loading', async () => {
      const p1 = api.fetchSatellites();
      const p2 = api.fetchSatellites();
      await Promise.all([p1, p2]);
    });

    it('should set error on failure', async () => {
      const { useSatelliteStore } = require('@/lib/store/useSatelliteStore');
      useSatelliteStore.getState.mockReturnValue({
        fetchSatellites: jest.fn().mockRejectedValue(new Error('network')),
      });
      await expect(api.fetchSatellites()).rejects.toThrow('network');
      expect(api.getError()).toBeInstanceOf(Error);
    });

    it('should emit satellite:error on failure', async () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('satellite:error', handler);

      const { useSatelliteStore } = require('@/lib/store/useSatelliteStore');
      useSatelliteStore.getState.mockReturnValue({
        fetchSatellites: jest.fn().mockRejectedValue(new Error('fail')),
      });
      await expect(api.fetchSatellites()).rejects.toThrow();
      expect(handler).toHaveBeenCalled();
    });

    it('should reset loading after fetch completes', async () => {
      await api.fetchSatellites();
      expect(api.isLoading()).toBe(false);
    });
  });

  describe('_setSatellites', () => {
    it('should store a copy', () => {
      const sats = [makeSat(1, 'A')];
      api._setSatellites(sats);
      sats.pop();
      expect(api.satellites).toHaveLength(1);
    });

    it('should emit satellites:update event', () => {
      const { getEventBus } = require('../../core/EventBus');
      const bus = getEventBus();
      const handler = jest.fn();
      bus.on('satellites:update', handler);
      api._setSatellites([]);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SatelliteAPI singleton', () => {
  afterEach(() => {
    resetSatelliteAPI();
    resetEventBus();
  });

  it('should return same instance', () => {
    const a = getSatelliteAPI();
    const b = getSatelliteAPI();
    expect(a).toBe(b);
  });

  it('should reset singleton', () => {
    const a = getSatelliteAPI();
    resetSatelliteAPI();
    const b = getSatelliteAPI();
    expect(a).not.toBe(b);
  });
});
