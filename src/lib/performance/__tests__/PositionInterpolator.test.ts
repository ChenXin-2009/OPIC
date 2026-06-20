import { Vector3 } from 'three';
import { PositionInterpolator } from '../PositionInterpolator';

function v(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z);
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PositionInterpolator', () => {
  describe('constructor', () => {
    it('should default to linear interpolation', () => {
      const interp = new PositionInterpolator();
      expect(interp.getInterpolationMethod()).toBe('linear');
    });

    it('should accept cubic interpolation method', () => {
      const interp = new PositionInterpolator('cubic');
      expect(interp.getInterpolationMethod()).toBe('cubic');
    });

    it('should have zero state count initially', () => {
      const interp = new PositionInterpolator();
      expect(interp.getStateCount()).toBe(0);
    });
  });

  describe('setTarget', () => {
    it('should add a new satellite state', () => {
      const interp = new PositionInterpolator();
      interp.setTarget(25544, v(1, 0, 0), 2000);
      expect(interp.getStateCount()).toBe(1);
    });

    it('should set progress to 1 for first-time target', () => {
      const interp = new PositionInterpolator();
      interp.setTarget(25544, v(1, 0, 0), 2000);
      const state = interp.getState(25544);
      expect(state?.currentProgress).toBe(1);
    });

    it('should use current interpolated position as start on second call', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(1, 0, 0), 2000);

      Date.now = jest.fn().mockReturnValue(1000);
      interp.setTarget(25544, v(3, 0, 0), 3000);

      const state = interp.getState(25544);
      expect(state?.startPosition.x).toBeCloseTo(1);
      expect(state?.endPosition.x).toBeCloseTo(3);
    });

    it('should reset progress to 0 on second call', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(1, 0, 0), 2000);
      Date.now = jest.fn().mockReturnValue(1000);
      interp.setTarget(25544, v(3, 0, 0), 3000);
      const state = interp.getState(25544);
      expect(state?.currentProgress).toBe(0);
    });

    it('should track multiple satellites independently', () => {
      const interp = new PositionInterpolator();
      interp.setTarget(1, v(1, 0, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), 2000);
      expect(interp.getStateCount()).toBe(2);
    });
  });

  describe('getInterpolatedPosition', () => {
    it('should return zero vector for unknown satellite', () => {
      const interp = new PositionInterpolator();
      const pos = interp.getInterpolatedPosition(999, 1000);
      expect(pos).toEqual(v(0, 0, 0));
    });

    it('should return end position when duration is zero', () => {
      const interp = new PositionInterpolator();
      interp.setTarget(25544, v(5, 6, 7), 1000);
      Date.now = jest.fn().mockReturnValue(1000);
      const pos = interp.getInterpolatedPosition(25544, 1000);
      expect(pos.x).toBeCloseTo(5);
      expect(pos.y).toBeCloseTo(6);
      expect(pos.z).toBeCloseTo(7);
    });

    it('should return start position at t=0', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(0, 0, 0), 2000);
      const pos = interp.getInterpolatedPosition(25544, 0);
      expect(pos.x).toBeCloseTo(0);
    });

    it('should return end position at t=1', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(0, 0, 0), 2000);
      const pos = interp.getInterpolatedPosition(25544, 2000);
      expect(pos.x).toBeCloseTo(0);
    });

    it('should interpolate at midpoint', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(0, 0, 0), 2000);
      Date.now = jest.fn().mockReturnValue(1000);
      const pos = interp.getInterpolatedPosition(25544, 1000);
      expect(pos.x).toBeCloseTo(0);
    });

    it('should clamp progress before start time', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(0, 0, 0), 2000);
      const pos = interp.getInterpolatedPosition(25544, -500);
      expect(pos.x).toBeCloseTo(0);
    });

    it('should clamp progress after end time', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(10, 0, 0), 2000);
      const pos = interp.getInterpolatedPosition(25544, 5000);
      expect(pos.x).toBeCloseTo(10);
    });

    it('should handle slerp with zero-length start vector', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(0, 0, 0), 2000);
      const pos = interp.getInterpolatedPosition(25544, 1000);
      expect(pos.x).toBeCloseTo(0);
    });
  });

  describe('getInterpolatedPositions', () => {
    it('should return positions for all satellites', () => {
      const interp = new PositionInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(1, v(1, 0, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), 2000);
      const positions = interp.getInterpolatedPositions(1000);
      expect(positions.size).toBe(2);
    });

    it('should return empty map when no states', () => {
      const interp = new PositionInterpolator();
      const positions = interp.getInterpolatedPositions(1000);
      expect(positions.size).toBe(0);
    });
  });

  describe('clear / clearAll', () => {
    it('should remove a specific satellite', () => {
      const interp = new PositionInterpolator();
      interp.setTarget(1, v(1, 0, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), 2000);
      interp.clear(1);
      expect(interp.getStateCount()).toBe(1);
      expect(interp.getState(1)).toBeUndefined();
      expect(interp.getState(2)).toBeDefined();
    });

    it('should remove all satellites', () => {
      const interp = new PositionInterpolator();
      interp.setTarget(1, v(1, 0, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), 2000);
      interp.clearAll();
      expect(interp.getStateCount()).toBe(0);
    });
  });

  describe('setInterpolationMethod', () => {
    it('should change interpolation method', () => {
      const interp = new PositionInterpolator();
      interp.setInterpolationMethod('cubic');
      expect(interp.getInterpolationMethod()).toBe('cubic');
    });
  });

  describe('getState', () => {
    it('should return undefined for unknown satellite', () => {
      const interp = new PositionInterpolator();
      expect(interp.getState(999)).toBeUndefined();
    });

    it('should return state for known satellite', () => {
      const interp = new PositionInterpolator();
      interp.setTarget(25544, v(1, 0, 0), 2000);
      const state = interp.getState(25544);
      expect(state).toBeDefined();
      expect(state?.noradId).toBe(25544);
    });
  });
});
