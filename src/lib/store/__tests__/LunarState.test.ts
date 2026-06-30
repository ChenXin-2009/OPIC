import { useLunarStore, ensureLunarState } from '../LunarState';

const mockPhase = { angle: 45.5, phaseName: 'waxing_crescent' as const };
const mockLibration = { elon: 1.23, elat: -0.56 };
const mockIllumination = { phase_fraction: 0.25, phase_angle: 45.5 };
const mockSubSolar = { lon: 0.5, lat: -1.2 };
const mockSubEarth = { lon: -0.3, lat: 0.8 };

jest.mock('@/lib/astronomy/lunar', () => ({
  getMoonPhase: jest.fn(() => mockPhase),
  getLunarLibration: jest.fn(() => mockLibration),
  getEarthMoonDistance: jest.fn(() => 384400),
  getLunarIllumination: jest.fn(() => mockIllumination),
  getSubSolarPoint: jest.fn(() => mockSubSolar),
  getSubEarthPoint: jest.fn(() => mockSubEarth),
}));

describe('LunarState', () => {
  beforeEach(() => {
    useLunarStore.setState({ data: null, staleAt: 0, updateInterval: 60000 });
  });

  describe('initial state', () => {
    it('should start with null data', () => {
      const state = useLunarStore.getState();
      expect(state.data).toBeNull();
      expect(state.staleAt).toBe(0);
      expect(state.updateInterval).toBe(60000);
    });
  });

  describe('update', () => {
    it('should compute lunar data from astronomy functions', () => {
      useLunarStore.getState().update();
      const { data } = useLunarStore.getState();
      expect(data).not.toBeNull();
      expect(data!.phase).toEqual(mockPhase);
      expect(data!.libration).toEqual(mockLibration);
      expect(data!.distanceKm).toBe(384400);
      expect(data!.illumination).toEqual(mockIllumination);
      expect(data!.subSolar).toEqual(mockSubSolar);
      expect(data!.subEarth).toEqual(mockSubEarth);
      expect(typeof data!.timestamp).toBe('number');
    });

    it('should set staleAt based on updateInterval', () => {
      useLunarStore.getState().update();
      const { data, staleAt } = useLunarStore.getState();
      expect(staleAt).toBeGreaterThan(data!.timestamp);
      expect(staleAt).toBeLessThanOrEqual(data!.timestamp + 60000);
    });

    it('should accept a custom date', () => {
      const customDate = new Date('2025-01-01T00:00:00Z');
      useLunarStore.getState().update(customDate);
      const { data } = useLunarStore.getState();
      expect(data!.timestamp).toBe(customDate.getTime());
    });
  });

  describe('isStale', () => {
    it('should return false when staleAt is in the future', () => {
      useLunarStore.setState({ staleAt: Date.now() + 60000 });
      expect(useLunarStore.getState().isStale()).toBe(false);
    });

    it('should return true when staleAt is in the past', () => {
      useLunarStore.setState({ staleAt: Date.now() - 1000 });
      expect(useLunarStore.getState().isStale()).toBe(true);
    });
  });

  describe('setUpdateInterval', () => {
    it('should change the update interval', () => {
      useLunarStore.getState().setUpdateInterval(120000);
      expect(useLunarStore.getState().updateInterval).toBe(120000);
    });
  });

  describe('ensureLunarState', () => {
    it('should trigger update and return data when uninitialized', () => {
      const data = ensureLunarState();
      expect(data).not.toBeNull();
      expect(data.phase).toEqual(mockPhase);
    });

    it('should not trigger update when data is fresh', () => {
      useLunarStore.getState().update();
      const { getMoonPhase } = require('@/lib/astronomy/lunar');
      getMoonPhase.mockClear();
      const data = ensureLunarState();
      expect(getMoonPhase).not.toHaveBeenCalled();
      expect(data).not.toBeNull();
    });
  });

  describe('window global debug API', () => {
    it('should attach __opic_lunar_debug to window', () => {
      expect((window as any).__opic_lunar_debug).toBeDefined();
    });

    it('__opic_lunar_debug should return null when not initialized', () => {
      const result = (window as any).__opic_lunar_debug();
      expect(result).toBeNull();
    });

    it('__opic_lunar_debug should return data when initialized', () => {
      useLunarStore.getState().update();
      const result = (window as any).__opic_lunar_debug();
      expect(result).not.toBeNull();
      expect(result!.phase.phaseName).toBe('waxing_crescent');
    });

    it('should attach __opic_lunar_assert to window', () => {
      expect((window as any).__opic_lunar_assert).toBeDefined();
    });

    it('__opic_lunar_assert should return error when not initialized', () => {
      const errors = (window as any).__opic_lunar_assert();
      expect(errors).toContain('ERROR: Not initialized');
    });

    it('__opic_lunar_assert should pass for valid data', () => {
      useLunarStore.getState().update();
      const errors = (window as any).__opic_lunar_assert();
      expect(errors).toEqual([]);
    });
  });
});
