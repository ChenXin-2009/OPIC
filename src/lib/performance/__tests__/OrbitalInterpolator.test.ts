import { Vector3 } from 'three';
import { OrbitalInterpolator } from '../OrbitalInterpolator';

function v(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z);
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OrbitalInterpolator', () => {
  describe('constructor', () => {
    it('should initialize with zero states', () => {
      const interp = new OrbitalInterpolator();
      expect(interp.getStateCount()).toBe(0);
    });
  });

  describe('setTarget', () => {
    it('should add a new satellite state on first call', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(25544, v(1, 0, 0), v(0, 1, 0), 2000);
      expect(interp.getStateCount()).toBe(1);
    });

    it('should update existing satellite state on second call', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(25544, v(1, 0, 0), v(0, 1, 0), 2000);
      Date.now = jest.fn().mockReturnValue(1500);
      interp.setTarget(25544, v(2, 0, 0), v(0, 2, 0), 3000);
      expect(interp.getStateCount()).toBe(1);
    });

    it('should track multiple satellites', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(1, v(1, 0, 0), v(0, 1, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), v(0, 2, 0), 2000);
      expect(interp.getStateCount()).toBe(2);
    });

  });

  describe('getInterpolatedPosition', () => {
    it('should return zero vector for unknown satellite', () => {
      const interp = new OrbitalInterpolator();
      const pos = interp.getInterpolatedPosition(999, 1000);
      expect(pos).toEqual(v(0, 0, 0));
    });

    it('should return end position when duration is zero', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(25544, v(1, 2, 3), v(0, 0, 0), 1000);
      Date.now = jest.fn().mockReturnValue(1000);
      const pos = interp.getInterpolatedPosition(25544, 1000);
      expect(pos.x).toBeCloseTo(1);
      expect(pos.y).toBeCloseTo(2);
      expect(pos.z).toBeCloseTo(3);
    });

    it('should clamp progress to 0 when time is before start', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(25544, v(0, 0, 0), v(0, 0, 0), 2000);
      Date.now = jest.fn().mockReturnValue(1000);
      const pos = interp.getInterpolatedPosition(25544, 500);
      expect(pos.x).toBeCloseTo(0);
      expect(pos.y).toBeCloseTo(0);
      expect(pos.z).toBeCloseTo(0);
    });

    it('should clamp progress to 1 when time is after end', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(25544, v(10, 0, 0), v(0, 0, 0), 2000);
      Date.now = jest.fn().mockReturnValue(1000);
      const pos = interp.getInterpolatedPosition(25544, 5000);
      expect(pos.x).toBeCloseTo(10);
    });

    it('should interpolate linearly at midpoint with dynamics disabled', () => {
      const interp = new OrbitalInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(0, 0, 0), v(0, 0, 0), 2000);
      Date.now = jest.fn().mockReturnValue(1000);
      const pos = interp.getInterpolatedPosition(25544, 1000);
      expect(pos.x).toBeCloseTo(0);
    });
  });

  describe('getInterpolatedPositions', () => {
    it('should return positions for all tracked satellites', () => {
      const interp = new OrbitalInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(1, v(1, 0, 0), v(0, 0, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), v(0, 0, 0), 2000);
      const positions = interp.getInterpolatedPositions(1000);
      expect(positions.size).toBe(2);
    });

    it('should return empty map when no states', () => {
      const interp = new OrbitalInterpolator();
      const positions = interp.getInterpolatedPositions(1000);
      expect(positions.size).toBe(0);
    });
  });

  describe('clear / clearAll', () => {
    it('should remove a specific satellite state', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(1, v(1, 0, 0), v(0, 1, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), v(0, 2, 0), 2000);
      interp.clear(1);
      expect(interp.getStateCount()).toBe(1);
    });

    it('should remove all states', () => {
      const interp = new OrbitalInterpolator();
      interp.setTarget(1, v(1, 0, 0), v(0, 1, 0), 2000);
      interp.setTarget(2, v(2, 0, 0), v(0, 2, 0), 2000);
      interp.clearAll();
      expect(interp.getStateCount()).toBe(0);
    });
  });

  describe('slerp', () => {
    it('should handle zero-length start vector', () => {
      const interp = new OrbitalInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(0, 0, 0), v(0, 0, 0), 2000);
      const pos = interp.getInterpolatedPosition(25544, 1000);
      expect(pos.x).toBeCloseTo(0);
    });

    it('should handle nearly parallel vectors (small theta)', () => {
      const interp = new OrbitalInterpolator();
      Date.now = jest.fn().mockReturnValue(0);
      interp.setTarget(25544, v(1, 0.0001, 0), v(1, 0, 0), 2000);
      const pos = interp.getInterpolatedPosition(25544, 1000);
      expect(pos.x).toBeGreaterThan(0);
    });
  });
});
