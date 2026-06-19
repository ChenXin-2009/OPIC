import { AllBodiesCalculator } from '../all-bodies-calculator';
import { ObserverMode, Vector3 } from '../types';

const mockGetPosition = jest.fn().mockResolvedValue({
  position: new Vector3(1, 2, 3),
  usingEphemeris: true,
  source: 'ephemeris',
  accuracy: 'high',
  errorEstimate: 0.001,
});

const mockClear = jest.fn();

jest.mock('../manager', () => ({
  EphemerisManager: jest.fn().mockImplementation(() => ({
    getPosition: mockGetPosition,
    getBodies: jest.fn().mockReturnValue([
      { naifId: 399, name: 'Earth' },
      { naifId: 599, name: 'Jupiter' },
    ]),
    getStatus: jest.fn().mockReturnValue({
      bodyId: 399,
      bodyName: 'Earth',
      loaded: false,
      usingEphemeris: false,
    }),
    isLoaded: jest.fn().mockReturnValue(false),
    clear: mockClear,
  })),
}));

jest.mock('../corrections', () => ({
  AberrationCorrector: jest.fn().mockImplementation(() => ({
    applyLightTimeCorrection: jest.fn().mockImplementation((_bodyId: number, _jd: number, pos: any) => pos),
    applyAberration: jest.fn().mockImplementation((_jd: number, pos: any) => pos),
  })),
}));

describe('AllBodiesCalculator', () => {
  let calc: AllBodiesCalculator;

  beforeEach(() => {
    jest.clearAllMocks();
    calc = new AllBodiesCalculator();
  });

  describe('getBodies', () => {
    it('should return registered bodies', () => {
      const bodies = calc.getBodies();
      expect(bodies.length).toBe(2);
    });
  });

  describe('getStatus', () => {
    it('should return status for a body', () => {
      const status = calc.getStatus(399);
      expect(status).toBeDefined();
      expect(status.bodyId).toBe(399);
    });
  });

  describe('isLoaded', () => {
    it('should return false before loading', () => {
      expect(calc.isLoaded(399, 2454868.5)).toBe(false);
    });
  });

  describe('setObserverMode / getObserverMode', () => {
    it('should default to HELIOCENTRIC', () => {
      expect(calc.getObserverMode()).toBe(ObserverMode.HELIOCENTRIC);
    });

    it('should set and get GEOCENTRIC', () => {
      calc.setObserverMode(ObserverMode.GEOCENTRIC);
      expect(calc.getObserverMode()).toBe(ObserverMode.GEOCENTRIC);
    });

    it('should set back to HELIOCENTRIC', () => {
      calc.setObserverMode(ObserverMode.GEOCENTRIC);
      calc.setObserverMode(ObserverMode.HELIOCENTRIC);
      expect(calc.getObserverMode()).toBe(ObserverMode.HELIOCENTRIC);
    });
  });

  describe('calculatePosition', () => {
    it('should return a position result', async () => {
      const result = await calc.calculatePosition(399, 2454868.5);
      expect(result).toBeDefined();
      expect(result.position).toBeDefined();
      expect(typeof result.position.x).toBe('number');
    });
  });

  describe('calculateMultiplePositions', () => {
    it('should return results for all requested bodies', async () => {
      const results = await calc.calculateMultiplePositions([399, 599], 2454868.5);
      expect(results.size).toBe(2);
      expect(results.has(399)).toBe(true);
      expect(results.has(599)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should delegate to manager.clear()', () => {
      calc.clear();
      expect(mockClear).toHaveBeenCalled();
    });
  });
});
