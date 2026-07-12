jest.mock('cesium', () => {
  class Matrix3 {
    values: number[];
    constructor();
    constructor(
      v0: number, v1: number, v2: number,
      v3: number, v4: number, v5: number,
      v6: number, v7: number, v8: number
    );
    constructor(...args: number[]) {
      if (args.length === 9) {
        this.values = args;
      } else {
        this.values = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      }
    }
    static transpose(matrix: Matrix3, result: Matrix3): Matrix3 {
      const m = matrix.values;
      result.values = [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
      return result;
    }
    static multiplyByVector(matrix: Matrix3, vector: Cartesian3, result: Cartesian3): Cartesian3 {
      const m = matrix.values;
      result.x = m[0] * vector.x + m[3] * vector.y + m[6] * vector.z;
      result.y = m[1] * vector.x + m[4] * vector.y + m[7] * vector.z;
      result.z = m[2] * vector.x + m[5] * vector.y + m[8] * vector.z;
      return result;
    }
  }

  class Cartesian3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  const Transforms = {
    computeIcrfToFixedMatrix: jest.fn(),
  };

  const JulianDate = {}; // type-only, never constructed in user code

  return { Matrix3, Cartesian3, Transforms, JulianDate };
});

import { temeToRenderWorld, temeToRenderWorldSimple } from '../teme';
import * as Cesium from 'cesium';

const KM_TO_AU = 1 / 149597870.7;
const OBLIQUITY_J2000_RAD = 0.4090928042223443;

function expectedSimple(x_km: number, y_km: number, z_km: number, gmst_rad: number) {
  const cosG = Math.cos(gmst_rad);
  const sinG = Math.sin(gmst_rad);
  const ecfX = x_km * cosG + y_km * sinG;
  const ecfY = -x_km * sinG + y_km * cosG;
  const ecfZ = z_km;
  const cosE = Math.cos(OBLIQUITY_J2000_RAD);
  const sinE = Math.sin(OBLIQUITY_J2000_RAD);
  return {
    x_au: ecfX * KM_TO_AU,
    y_au: (ecfY * cosE + ecfZ * sinE) * KM_TO_AU,
    z_au: (-ecfY * sinE + ecfZ * cosE) * KM_TO_AU,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('teme coordinate transforms', () => {
  describe('temeToRenderWorldSimple', () => {
    it('converts a position on the positive X axis', () => {
      const result = temeToRenderWorldSimple(6371, 0, 0, 0);
      expect(result.x_au).toBeGreaterThan(0);
      expect(result.x_au).toBeLessThan(1);
    });

    it('rotates position around Z by GMST angle', () => {
      const t0 = temeToRenderWorldSimple(6371, 0, 0, 0);
      const t90 = temeToRenderWorldSimple(6371, 0, 0, Math.PI / 2);
      expect(t0.x_au).not.toBeCloseTo(t90.x_au, 5);
      const mag3d = (p: { x_au: number; y_au: number; z_au: number }) =>
        Math.hypot(p.x_au, p.y_au, p.z_au);
      expect(mag3d(t90)).toBeCloseTo(mag3d(t0), 12);
    });

    it('preserves Z component magnitude under rotation', () => {
      const result = temeToRenderWorldSimple(0, 0, 6371, 1.5);
      expect(result.z_au).toBeGreaterThan(0);
    });

    it('returns predictable values for known inputs', () => {
      const result = temeToRenderWorldSimple(10_000, 0, 0, 0);
      expect(result.x_au).toBeCloseTo(10_000 * KM_TO_AU, 10);
    });
  });

  describe('temeToRenderWorld', () => {
    it('converts a position on the positive X axis with EOP matrix', () => {
      (Cesium.Transforms.computeIcrfToFixedMatrix as jest.Mock).mockImplementation(
        (_date: unknown, result: unknown) => {
          (result as { values: number[] }).values = [1, 0, 0, 0, 1, 0, 0, 0, 1];
          return true;
        }
      );

      const result = temeToRenderWorld({
        x_km: 6371,
        y_km: 0,
        z_km: 0,
        julianDate: {} as Cesium.JulianDate,
        gmst_rad: 0,
      });

      expect(result.x_au).toBeGreaterThan(0);
      expect(result.x_au).toBeLessThan(1);
    });

    it('produces AU-scaled output (not km)', () => {
      (Cesium.Transforms.computeIcrfToFixedMatrix as jest.Mock).mockImplementation(
        (_date: unknown, result: unknown) => {
          (result as { values: number[] }).values = [1, 0, 0, 0, 1, 0, 0, 0, 1];
          return true;
        }
      );

      const inputKm = 149597870.7; // 1 AU in km
      const result = temeToRenderWorld({
        x_km: inputKm,
        y_km: 0,
        z_km: 0,
        julianDate: {} as Cesium.JulianDate,
        gmst_rad: 0,
      });

      expect(result.x_au).toBeCloseTo(1, 5);
    });

    it('falls back when computeIcrfToFixedMatrix returns falsy', () => {
      (Cesium.Transforms.computeIcrfToFixedMatrix as jest.Mock).mockReturnValue(
        undefined
      );

      const result = temeToRenderWorld({
        x_km: 10_000,
        y_km: 0,
        z_km: 0,
        julianDate: {} as Cesium.JulianDate,
        gmst_rad: 0,
      });

      expect(result.x_au).toBeCloseTo(10_000 * KM_TO_AU, 10);
    });

    it('matches simple function output in fallback path', () => {
      (Cesium.Transforms.computeIcrfToFixedMatrix as jest.Mock).mockReturnValue(
        undefined
      );

      const result = temeToRenderWorld({
        x_km: 7000,
        y_km: 3000,
        z_km: 1000,
        julianDate: {} as Cesium.JulianDate,
        gmst_rad: 0.8,
      });

      const expected = expectedSimple(7000, 3000, 1000, 0.8);
      expect(result.x_au).toBeCloseTo(expected.x_au, 10);
      expect(result.y_au).toBeCloseTo(expected.y_au, 10);
      expect(result.z_au).toBeCloseTo(expected.z_au, 10);
    });

    it('applies ecliptic obliquity rotation to Y and Z', () => {
      (Cesium.Transforms.computeIcrfToFixedMatrix as jest.Mock).mockImplementation(
        (_date: unknown, result: unknown) => {
          (result as { values: number[] }).values = [1, 0, 0, 0, 1, 0, 0, 0, 1];
          return true;
        }
      );

      const result = temeToRenderWorld({
        x_km: 0,
        y_km: 0,
        z_km: 10_000,
        julianDate: {} as Cesium.JulianDate,
        gmst_rad: 0,
      });

      const cosEps = Math.cos(OBLIQUITY_J2000_RAD);
      const sinEps = Math.sin(OBLIQUITY_J2000_RAD);
      expect(result.y_au).toBeCloseTo(10_000 * sinEps * KM_TO_AU, 10);
      expect(result.z_au).toBeCloseTo(10_000 * cosEps * KM_TO_AU, 10);
    });

    it('rotates around Z by GMST angle with EOP path', () => {
      (Cesium.Transforms.computeIcrfToFixedMatrix as jest.Mock).mockImplementation(
        (_date: unknown, result: unknown) => {
          (result as { values: number[] }).values = [1, 0, 0, 0, 1, 0, 0, 0, 1];
          return true;
        }
      );

      const t0 = temeToRenderWorld({
        x_km: 6371,
        y_km: 0,
        z_km: 0,
        julianDate: {} as Cesium.JulianDate,
        gmst_rad: 0,
      });

      const t90 = temeToRenderWorld({
        x_km: 6371,
        y_km: 0,
        z_km: 0,
        julianDate: {} as Cesium.JulianDate,
        gmst_rad: Math.PI / 2,
      });

      expect(t0.x_au).not.toBeCloseTo(t90.x_au, 5);
      const mag = (p: { x_au: number; y_au: number; z_au: number }) =>
        Math.hypot(p.x_au, p.y_au, p.z_au);
      expect(mag(t90)).toBeCloseTo(mag(t0), 12);
    });

    it('calls computeIcrfToFixedMatrix with provided julianDate', () => {
      (Cesium.Transforms.computeIcrfToFixedMatrix as jest.Mock).mockReturnValue(
        undefined
      );

      const fakeDate = { dayNumber: 2460000, secondsOfDay: 43200 };
      temeToRenderWorld({
        x_km: 0,
        y_km: 0,
        z_km: 0,
        julianDate: fakeDate as Cesium.JulianDate,
        gmst_rad: 0,
      });

      expect(Cesium.Transforms.computeIcrfToFixedMatrix).toHaveBeenCalledWith(
        fakeDate,
        expect.any(Object)
      );
    });
  });
});
