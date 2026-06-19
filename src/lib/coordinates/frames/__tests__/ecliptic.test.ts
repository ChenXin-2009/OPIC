/**
 * 单元测试：ICRF/ICRS (J2000 equatorial) ↔ RenderWorld (J2000 ecliptic) 帧变换。
 *
 * 测试向量来自 docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md §3.2：
 *   ICRF +X → RenderWorld +X
 *   ICRF +Z → RenderWorld (0, sin ε, cos ε)
 *   RenderWorld +Z → ICRF (0, -sin ε, cos ε)
 *
 * 验收标准：
 * - 3 个轴向已知点精确匹配；
 * - 往返误差 < 1e-12 AU；
 * - 与现有 ephemeris/coordinates.ts CoordinateTransformer 结果一致；
 * - 输入向量不被修改；
 * - 长度保持（旋转矩阵性质）。
 */

import {
  icrfToEcliptic,
  eclipticToIcrf,
  icrfToRenderWorld,
  renderWorldToIcrf,
  OBLIQUITY_J2000_RAD,
} from '../ecliptic';
import { CoordinateTransformer } from '@/lib/astronomy/ephemeris/coordinates';
import { Vector3 } from '@/lib/astronomy/ephemeris/types';

const COS_EPS = Math.cos(OBLIQUITY_J2000_RAD);
const SIN_EPS = Math.sin(OBLIQUITY_J2000_RAD);

describe('frames/ecliptic', () => {
  describe('icrfToEcliptic (ICRF → RenderWorld)', () => {
    it('ICRF +X 应映射到 RenderWorld +X（旋转绕 X 轴，X 分量不变）', () => {
      const result = icrfToEcliptic(new Vector3(1, 0, 0));
      expect(result.x).toBeCloseTo(1, 12);
      expect(result.y).toBeCloseTo(0, 12);
      expect(result.z).toBeCloseTo(0, 12);
    });

    it('ICRF +Z (天球北极) 应映射到 (0, sin ε, cos ε)', () => {
      const result = icrfToEcliptic(new Vector3(0, 0, 1));
      expect(result.x).toBeCloseTo(0, 12);
      expect(result.y).toBeCloseTo(SIN_EPS, 12);
      expect(result.z).toBeCloseTo(COS_EPS, 12);
    });

    it('ICRF +Y 应映射到 (0, cos ε, -sin ε)', () => {
      const result = icrfToEcliptic(new Vector3(0, 1, 0));
      expect(result.x).toBeCloseTo(0, 12);
      expect(result.y).toBeCloseTo(COS_EPS, 12);
      expect(result.z).toBeCloseTo(-SIN_EPS, 12);
    });

    it('零向量应映射到零向量', () => {
      const result = icrfToEcliptic(new Vector3(0, 0, 0));
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });

    it('应保持向量长度（旋转矩阵性质）', () => {
      const pos = new Vector3(1.5, 2.3, -0.8);
      const result = icrfToEcliptic(pos);
      expect(result.length()).toBeCloseTo(pos.length(), 12);
    });

    it('不应修改输入向量', () => {
      const input = new Vector3(1.5, 2.3, -0.8);
      const snapshot = new Vector3(input.x, input.y, input.z);
      icrfToEcliptic(input);
      expect(input.x).toBe(snapshot.x);
      expect(input.y).toBe(snapshot.y);
      expect(input.z).toBe(snapshot.z);
    });
  });

  describe('eclipticToIcrf (RenderWorld → ICRF)', () => {
    it('RenderWorld +X 应映射到 ICRF +X', () => {
      const result = eclipticToIcrf(new Vector3(1, 0, 0));
      expect(result.x).toBeCloseTo(1, 12);
      expect(result.y).toBeCloseTo(0, 12);
      expect(result.z).toBeCloseTo(0, 12);
    });

    it('RenderWorld +Z (黄道北极) 应映射到 (0, -sin ε, cos ε)', () => {
      // 这是文档 §3.2 的第三个测试向量
      const result = eclipticToIcrf(new Vector3(0, 0, 1));
      expect(result.x).toBeCloseTo(0, 12);
      expect(result.y).toBeCloseTo(-SIN_EPS, 12);
      expect(result.z).toBeCloseTo(COS_EPS, 12);
    });

    it('零向量应映射到零向量', () => {
      const result = eclipticToIcrf(new Vector3(0, 0, 0));
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('往返一致性 (round-trip < 1e-12 AU)', () => {
    const testCases: Array<[number, number, number]> = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1.5, 2.3, -0.8],
      [-3.2, 0.001, 100],
      [0, -1, 0],
      [5.2, -5.2, 5.2], // 木星距离量级
      [1e-6, 1e-6, 1e-6], // 小尺度
    ];

    for (const [x, y, z] of testCases) {
      it(`icrfToEcliptic → eclipticToIcrf 往返 (${x}, ${y}, ${z})`, () => {
        const original = new Vector3(x, y, z);
        const roundTrip = eclipticToIcrf(icrfToEcliptic(original));
        expect(Math.abs(roundTrip.x - original.x)).toBeLessThan(1e-12);
        expect(Math.abs(roundTrip.y - original.y)).toBeLessThan(1e-12);
        expect(Math.abs(roundTrip.z - original.z)).toBeLessThan(1e-12);
      });

      it(`eclipticToIcrf → icrfToEcliptic 往返 (${x}, ${y}, ${z})`, () => {
        const original = new Vector3(x, y, z);
        const roundTrip = icrfToEcliptic(eclipticToIcrf(original));
        expect(Math.abs(roundTrip.x - original.x)).toBeLessThan(1e-12);
        expect(Math.abs(roundTrip.y - original.y)).toBeLessThan(1e-12);
        expect(Math.abs(roundTrip.z - original.z)).toBeLessThan(1e-12);
      });
    }
  });

  describe('与现有 ephemeris/coordinates.ts 一致性', () => {
    const legacyTransformer = new CoordinateTransformer();

    const testCases: Array<[number, number, number]> = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1.5, 2.3, -0.8],
      [5.2, -5.2, 5.2],
    ];

    for (const [x, y, z] of testCases) {
      it(`icrfToEcliptic 与 legacy CoordinateTransformer.icrfToEcliptic 一致 (${x}, ${y}, ${z})`, () => {
        const input = new Vector3(x, y, z);
        const newPos = icrfToEcliptic(input);
        const legacyPos = legacyTransformer.icrfToEcliptic(input);
        expect(Math.abs(newPos.x - legacyPos.x)).toBeLessThan(1e-12);
        expect(Math.abs(newPos.y - legacyPos.y)).toBeLessThan(1e-12);
        expect(Math.abs(newPos.z - legacyPos.z)).toBeLessThan(1e-12);
      });

      it(`eclipticToIcrf 与 legacy CoordinateTransformer.eclipticToICRF 一致 (${x}, ${y}, ${z})`, () => {
        const input = new Vector3(x, y, z);
        const newPos = eclipticToIcrf(input);
        const legacyPos = legacyTransformer.eclipticToICRF(input);
        expect(Math.abs(newPos.x - legacyPos.x)).toBeLessThan(1e-12);
        expect(Math.abs(newPos.y - legacyPos.y)).toBeLessThan(1e-12);
        expect(Math.abs(newPos.z - legacyPos.z)).toBeLessThan(1e-12);
      });
    }
  });

  describe('渲染层别名', () => {
    it('icrfToRenderWorld 应与 icrfToEcliptic 行为一致', () => {
      const input = new Vector3(1.5, 2.3, -0.8);
      const a = icrfToRenderWorld(input);
      const b = icrfToEcliptic(input);
      expect(a.x).toBe(b.x);
      expect(a.y).toBe(b.y);
      expect(a.z).toBe(b.z);
    });

    it('renderWorldToIcrf 应与 eclipticToIcrf 行为一致', () => {
      const input = new Vector3(1.5, 2.3, -0.8);
      const a = renderWorldToIcrf(input);
      const b = eclipticToIcrf(input);
      expect(a.x).toBe(b.x);
      expect(a.y).toBe(b.y);
      expect(a.z).toBe(b.z);
    });
  });

  describe('单位/量纲测试', () => {
    it('往返变换后量纲应不变 (AU → AU)', () => {
      // 如果单位在变换中被意外缩放，往返误差会很大
      const original = new Vector3(5.2, 0, 0); // Jupiter distance in AU
      const roundTrip = eclipticToIcrf(icrfToEcliptic(original));
      expect(roundTrip.x).toBeCloseTo(5.2, 12);
      expect(roundTrip.y).toBeCloseTo(0, 12);
      expect(roundTrip.z).toBeCloseTo(0, 12);
    });

    it('单位距离在不同输入量级下保持一致', () => {
      // 小尺度 (卫星级别 ~10^-4 AU)
      const small = new Vector3(0.0001, 0, 0);
      const smallRT = eclipticToIcrf(icrfToEcliptic(small));
      expect(smallRT.x).toBeCloseTo(0.0001, 12);

      // 大尺度 (银河系级别 ~10^9 AU)
      const large = new Vector3(1e9, 0, 0);
      const largeRT = eclipticToIcrf(icrfToEcliptic(large));
      expect(largeRT.x).toBeCloseTo(1e9, 12);
    });

    it('向量长度的量纲在变换后应保持 (AU → AU)', () => {
      const testVectors: Array<[number, number, number]> = [
        [1, 0, 0],
        [0.0001, 0.0001, 0.0001],
        [5.2, 0, 0],
        [1e9, 0, 0],
      ];
      for (const [x, y, z] of testVectors) {
        const v = new Vector3(x, y, z);
        const transformed = icrfToEcliptic(v);
        // 旋转矩阵保持长度，量纲不变
        expect(transformed.length()).toBeCloseTo(v.length(), 12);
      }
    });
  });
});
