import {
  EARTH_FORCE_MODEL,
  gravityAcceleration,
  thrustAcceleration,
  dragAcceleration,
  totalAcceleration,
  massFlowRate,
  currentDynamicPressure,
  type ControlInput,
  type FlightState,
} from '../forces';

const noThrust: ControlInput = {
  throttle: 0, thrustDirection: [1, 0, 0], thrustN: 0, ispS: 300,
  dragCoefficient: 2.2, crossSectionAreaM2: 10,
};

const fullThrust: ControlInput = {
  throttle: 1, thrustDirection: [0, 0, 1], thrustN: 1_000_000, ispS: 300,
  dragCoefficient: 2.2, crossSectionAreaM2: 10,
};

const earthState: FlightState = {
  position: [6_371_000 + 10_000, 0, 0],
  velocity: [0, 100, 0],
  mass: 100_000,
  time: 0,
};

describe('forces', () => {
  describe('EARTH_FORCE_MODEL', () => {
    it('has correct default values', () => {
      expect(EARTH_FORCE_MODEL.mu).toBe(3.986004418e14);
      expect(EARTH_FORCE_MODEL.bodyName).toBe('earth');
      expect(EARTH_FORCE_MODEL.bodyRadius).toBe(6_371_000);
      expect(EARTH_FORCE_MODEL.atmosphereEnabled).toBe(true);
    });
  });

  describe('thrustAcceleration', () => {
    it('returns zero acceleration for zero throttle', () => {
      const acc = thrustAcceleration(noThrust, 1000);
      expect(acc).toEqual([0, 0, 0]);
    });

    it('returns non-zero acceleration for throttle > 0', () => {
      const acc = thrustAcceleration(fullThrust, 100_000);
      expect(acc[2]).toBeGreaterThan(0);
      expect(acc[0]).toBe(0);
      expect(acc[1]).toBe(0);
    });

    it('returns zero when mass <= 0', () => {
      const acc = thrustAcceleration(fullThrust, 0);
      expect(acc).toEqual([0, 0, 0]);
    });
  });

  describe('massFlowRate', () => {
    it('returns 0 for zero throttle', () => {
      expect(massFlowRate(noThrust)).toBe(0);
    });

    it('returns positive flow for firing engine', () => {
      const flow = massFlowRate(fullThrust);
      expect(flow).toBeGreaterThan(0);
    });

    it('returns 0 when isp is zero', () => {
      const control: ControlInput = { ...fullThrust, ispS: 0 };
      expect(massFlowRate(control)).toBe(0);
    });
  });

  describe('dragAcceleration', () => {
    it('returns zero when atmosphere is disabled', () => {
      const acc = dragAcceleration(earthState.position, earthState.velocity, earthState.mass,
        fullThrust.dragCoefficient, fullThrust.crossSectionAreaM2, 6_371_000, 'earth', false);
      expect(acc).toEqual([0, 0, 0]);
    });

    it('returns zero when mass <= 0', () => {
      const acc = dragAcceleration(earthState.position, earthState.velocity, 0,
        fullThrust.dragCoefficient, fullThrust.crossSectionAreaM2, 6_371_000, 'earth', true);
      expect(acc).toEqual([0, 0, 0]);
    });

    it('returns zero above 100 km', () => {
      const highState: FlightState = { ...earthState, position: [6_371_000 + 120_000, 0, 0] };
      const acc = dragAcceleration(highState.position, highState.velocity, highState.mass,
        fullThrust.dragCoefficient, fullThrust.crossSectionAreaM2, 6_371_000, 'earth', true);
      expect(acc).toEqual([0, 0, 0]);
    });

    it('opposes velocity direction in atmosphere', () => {
      const vel: [number, number, number] = [100, 0, 0];
      const acc = dragAcceleration(earthState.position, vel, earthState.mass,
        fullThrust.dragCoefficient, fullThrust.crossSectionAreaM2, 6_371_000, 'earth', true);
      expect(acc[0]).toBeLessThan(0);
    });

    it('returns zero when velocity is near zero', () => {
      const acc = dragAcceleration(earthState.position, [1e-9, 0, 0], earthState.mass,
        fullThrust.dragCoefficient, fullThrust.crossSectionAreaM2, 6_371_000, 'earth', true);
      expect(acc).toEqual([0, 0, 0]);
    });

    it('returns zero for non-earth body (no atmosphere model)', () => {
      const acc = dragAcceleration(earthState.position, earthState.velocity, earthState.mass,
        fullThrust.dragCoefficient, fullThrust.crossSectionAreaM2, 3_389_000, 'mars', true);
      expect(acc).toEqual([0, 0, 0]);
    });
  });

  describe('totalAcceleration', () => {
    it('combines gravity + thrust + drag', () => {
      const acc = totalAcceleration(earthState, fullThrust, EARTH_FORCE_MODEL);
      expect(acc[0]).toBeLessThan(0);
      expect(acc[2]).toBeGreaterThan(0);
    });

    it('only gravity when no thrust and above atmosphere', () => {
      const highState: FlightState = { ...earthState, position: [6_371_000 + 200_000, 0, 0] };
      const acc = totalAcceleration(highState, noThrust, EARTH_FORCE_MODEL);
      expect(acc[1]).toBe(0);
      expect(acc[2]).toBe(0);
    });
  });

  describe('currentDynamicPressure', () => {
    it('returns 0 when atmosphere is disabled', () => {
      const config = { ...EARTH_FORCE_MODEL, atmosphereEnabled: false };
      expect(currentDynamicPressure(earthState, config)).toBe(0);
    });

    it('returns positive dynamic pressure in atmosphere', () => {
      const q = currentDynamicPressure(earthState, EARTH_FORCE_MODEL);
      expect(q).toBeGreaterThan(0);
    });

    it('returns 0 above atmosphere', () => {
      const highState: FlightState = { ...earthState, position: [6_371_000 + 120_000, 0, 0] };
      expect(currentDynamicPressure(highState, EARTH_FORCE_MODEL)).toBe(0);
    });

    it('returns 0 for non-earth body', () => {
      const config = { ...EARTH_FORCE_MODEL, bodyName: 'mars' };
      expect(currentDynamicPressure(earthState, config)).toBe(0);
    });
  });
});
