/**
 * 离线 fixture 回归测试：验证帧变换矩阵与 Astropy 8.0 生成的基准一致。
 *
 * 夹具由 scripts/generate_fixtures.py 使用 Astropy + ERFA 生成，
 * 提交到 src/lib/coordinates/fixtures/。
 *
 * 如果此测试失败，可能原因：
 *   1. 帧变换代码被意外修改
 *   2. Astropy 矩阵需要刷新（运行 scripts/generate_fixtures.py）
 *   3. 浮点精度差异（阈值内可接受）
 */

import {
  icrfToGalactic,
  galacticToIcrf,
} from '../galactic';

import {
  icrfToSupergalactic,
  supergalacticToIcrf,
} from '../supergalactic';

import { Vector3 } from '@/lib/astronomy/ephemeris/types';

// 从 fixtures 加载 Astropy 验证矩阵
const ASTROPY_FRAMES = require('../../fixtures/astropy-frames.json');
const ASTROPY_VECTORS = require('../../fixtures/astropy-test-vectors.json');

const EPS = 1e-12;

describe('帧变换 vs Astropy 8.0 fixtures', () => {
  describe('Galactic: ICRF <-> (l, b) 往返', () => {
    it('银心方向 ICRF → Galactic 应接近 l≈0°（Sgr A* 在 l≈359.9°）', () => {
      const icrf = new Vector3(
        ASTROPY_VECTORS.galactic_center.icrs_cartesian_1kpc.x,
        ASTROPY_VECTORS.galactic_center.icrs_cartesian_1kpc.y,
        ASTROPY_VECTORS.galactic_center.icrs_cartesian_1kpc.z
      );
      const gal = icrfToGalactic(icrf);
      // Sgr A* 实际银经 ~359.94°，银纬 ~-0.046°
      expect(gal.l_deg).toBeCloseTo(359.94, 1);
      expect(gal.b_deg).toBeCloseTo(-0.046, 1);
      // 往返
      const roundTrip = galacticToIcrf(gal.l_deg, gal.b_deg, gal.distance);
      expect(roundTrip.x).toBeCloseTo(icrf.x, 10);
      expect(roundTrip.y).toBeCloseTo(icrf.y, 10);
      expect(roundTrip.z).toBeCloseTo(icrf.z, 10);
    });

    it('ICRS → Galactic 矩阵与 Astropy fixture galactic_to_icrs 字段一致', () => {
      // ICRS_TO_GALACTIC 在 galactic.ts 中使用的矩阵对应 fixture 的 galactic_to_icrs 字段
      const M = ASTROPY_FRAMES.galactic_to_icrs;
      const testVectors: Array<[number, number, number]> = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      for (const [vx, vy, vz] of testVectors) {
        const icrf = new Vector3(vx, vy, vz);
        const gal = icrfToGalactic(icrf);
        const d = gal.distance;
        const cosB = Math.cos(gal.b_deg * Math.PI / 180);
        const x_gal = d * cosB * Math.cos(gal.l_deg * Math.PI / 180);
        const y_gal = d * cosB * Math.sin(gal.l_deg * Math.PI / 180);
        const z_gal = d * Math.sin(gal.b_deg * Math.PI / 180);
        const expected_x = M[0][0] * vx + M[0][1] * vy + M[0][2] * vz;
        const expected_y = M[1][0] * vx + M[1][1] * vy + M[1][2] * vz;
        const expected_z = M[2][0] * vx + M[2][1] * vy + M[2][2] * vz;
        expect(x_gal).toBeCloseTo(expected_x, 10);
        expect(y_gal).toBeCloseTo(expected_y, 10);
        expect(z_gal).toBeCloseTo(expected_z, 10);
      }
    });
  });

  describe('Supergalactic: 已知点验证', () => {
    it('超星系北极 (SGB=90°) 往返', () => {
      // 超星系北极 = Supergalactic Cartesian (0, 0, 1)
      const sglPole = new Vector3(0, 0, 1);
      const icrf = supergalacticToIcrf(sglPole);
      const roundTrip = icrfToSupergalactic(icrf);
      expect(roundTrip.x).toBeCloseTo(0, 12);
      expect(roundTrip.y).toBeCloseTo(0, 12);
      expect(roundTrip.z).toBeCloseTo(1, 12);
    });

    it('Supergalactic → ICRF 矩阵与 Astropy fixture 一致', () => {
      const M = ASTROPY_FRAMES.supergalactic_to_icrs;
      const testVectors = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      for (const [vx, vy, vz] of testVectors) {
        const sgl = new Vector3(vx, vy, vz);
        const icrf = supergalacticToIcrf(sgl);
        const expected_x = M[0][0] * vx + M[0][1] * vy + M[0][2] * vz;
        const expected_y = M[1][0] * vx + M[1][1] * vy + M[1][2] * vz;
        const expected_z = M[2][0] * vx + M[2][1] * vy + M[2][2] * vz;
        expect(icrf.x).toBeCloseTo(expected_x, 10);
        expect(icrf.y).toBeCloseTo(expected_y, 10);
        expect(icrf.z).toBeCloseTo(expected_z, 10);
      }
    });
  });
});
