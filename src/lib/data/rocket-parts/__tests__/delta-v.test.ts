/**
 * @module data/rocket-parts/__tests__/delta-v.test
 * @description 齐奥尔科夫斯基方程 Δv 计算测试
 *
 * 验证：
 *   1. 单级 Δv 计算正确性（与手算对比）
 *   2. 多级 Δv 累加正确
 *   3. 质量汇总正确
 *   4. 推重比/燃烧时间计算
 *   5. 预设载具配置合理性
 */

import { describe, it, expect } from '@jest/globals';
import {
  PART_CATALOG,
  getPart,
  getPartsByType,
  getAllParts,
  computeStageMasses,
  computeVehicleSummary,
  PRESET_FALCON9,
  PRESET_SOUNDING_ROCKET,
  STANDARD_GRAVITY,
} from '../index';

describe('部件目录', () => {
  it('包含至少 5 种不同类型的部件', () => {
    const types = new Set(getAllParts().map((p) => p.type));
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  it('包含必需的部件类型：command-pod, engine, fuel-tank, separator, structural', () => {
    const requiredTypes = ['command-pod', 'engine', 'fuel-tank', 'separator', 'structural'];
    for (const type of requiredTypes) {
      const parts = getPartsByType(type as never);
      expect(parts.length).toBeGreaterThan(0);
    }
  });

  it('每个发动机部件有 thrustVacuumN 和 ispVacuumS', () => {
    const engines = getPartsByType('engine');
    for (const e of engines) {
      expect(e.thrustVacuumN).toBeGreaterThan(0);
      expect(e.ispVacuumS).toBeGreaterThan(0);
    }
  });

  it('每个燃料罐部件有 propellantMassKg', () => {
    const tanks = getPartsByType('fuel-tank');
    for (const t of tanks) {
      expect(t.propellantMassKg).toBeGreaterThan(0);
    }
  });

  it('getPart 抛出异常当 ID 不存在', () => {
    expect(() => getPart('nonexistent')).toThrow();
  });
});

describe('齐奥尔科夫斯基 Δv 计算', () => {
  it('单级火箭 Δv 与手算值吻合', () => {
    // 简单单级：1 台 Merlin + 小燃料罐 + 指令舱
    const config = {
      name: '测试单级',
      stages: [
        {
          name: '单级',
          parts: [
            { partId: 'engine-merlin-1d' },
            { partId: 'tank-small' },
            { partId: 'cmd-pod-mk1' },
          ],
        },
      ],
    };

    const summary = computeVehicleSummary(config);
    const stage = summary.stages[0];

    // 手算：
    // 干质量 = 470 (engine) + 200 (tank dry) + 800 (pod) = 1470 kg
    // 推进剂 = 2000 kg
    // m0 = 1470 + 2000 = 3470 kg
    // m1 = 1470 kg
    // Isp = 311 s (vacuum)
    // Δv = 311 * 9.80665 * ln(3470/1470) = 311 * 9.80665 * 0.8591 = 2620.5 m/s
    const expectedDv = 311 * STANDARD_GRAVITY * Math.log(3470 / 1470);
    expect(stage.deltaVmS).toBeCloseTo(expectedDv, 0);
    expect(stage.deltaVmS).toBeGreaterThan(2500);
    expect(stage.deltaVmS).toBeLessThan(2700);
  });

  it('多级火箭 Δv 正确累加', () => {
    const summary = computeVehicleSummary(PRESET_FALCON9);
    const stage1Dv = summary.stages[0].deltaVmS;
    const stage2Dv = summary.stages[1].deltaVmS;
    const totalDv = summary.totalDeltaVmS;

    expect(totalDv).toBeCloseTo(stage1Dv + stage2Dv, 1);
  });

  it('Falcon 9 预设总 Δv 在合理范围 (8000-13000 m/s, 真空比冲)', () => {
    const summary = computeVehicleSummary(PRESET_FALCON9);
    console.log(`  Falcon 9 类似: 总 Δv = ${summary.totalDeltaVmS.toFixed(0)} m/s`);
    expect(summary.totalDeltaVmS).toBeGreaterThan(8000);
    expect(summary.totalDeltaVmS).toBeLessThan(13000);
  });

  it('一级推重比在合理范围 (1.2-2.0)', () => {
    const summary = computeVehicleSummary(PRESET_FALCON9);
    const twr = summary.stages[0].thrustToWeight;
    console.log(`  一级推重比 = ${twr.toFixed(2)}`);
    expect(twr).toBeGreaterThan(1.2);
    expect(twr).toBeLessThan(2.0);
  });

  it('质量汇总正确：总湿质量 = 各级干质量 + 各级推进剂', () => {
    const masses = computeStageMasses(PRESET_FALCON9);
    const totalDry = masses.reduce((sum, m) => sum + m.dryMassKg, 0);
    const totalProp = masses.reduce((sum, m) => sum + m.propellantMassKg, 0);
    const totalWet = totalDry + totalProp;

    // 第一级的 totalMassKg 就是总湿质量（包含所有上方级）
    expect(masses[0].totalMassKg).toBeCloseTo(totalWet, 0);
    console.log(`  总干质量: ${totalDry.toFixed(0)} kg, 总推进剂: ${totalProp.toFixed(0)} kg`);
  });

  it('燃烧时间为正值且合理', () => {
    const summary = computeVehicleSummary(PRESET_FALCON9);
    for (const stage of summary.stages) {
      expect(stage.burnTimeS).toBeGreaterThan(0);
      expect(stage.burnTimeS).toBeLessThan(600); // 单级燃烧 < 10 分钟
      console.log(`  ${stage.name}: 燃烧 ${stage.burnTimeS.toFixed(0)}s, Δv=${stage.deltaVmS.toFixed(0)} m/s`);
    }
  });

  it('上面级 Δv > 0（有发动机和燃料）', () => {
    const summary = computeVehicleSummary(PRESET_FALCON9);
    for (const stage of summary.stages) {
      expect(stage.deltaVmS).toBeGreaterThan(0);
    }
  });
});

describe('载具 JSON 序列化', () => {
  it('VehicleConfig 可序列化/反序列化', () => {
    const json = JSON.stringify(PRESET_FALCON9);
    const restored = JSON.parse(json) as typeof PRESET_FALCON9;

    expect(restored.name).toBe(PRESET_FALCON9.name);
    expect(restored.stages).toHaveLength(PRESET_FALCON9.stages.length);

    // 反序列化后能重新计算
    const summary = computeVehicleSummary(restored);
    expect(summary.totalDeltaVmS).toBeGreaterThan(0);
  });
});
