/**
 * @module data/rocket-parts/catalog
 * @description 精简部件目录 + Δv/质量计算
 *
 * 包含 10 个基础部件，覆盖 5 种类型（指令舱、发动机、燃料罐、分离器、结构件）。
 * 数值参考真实火箭参数（Falcon 9、Saturn V、Soyuz 等）做了简化。
 *
 * 提供 VehicleConfig → VehicleSummary 的质量/Δv 计算工具，
 * 基于齐奥尔科夫斯基火箭方程：Δv = Isp · g₀ · ln(m₀/m₁)
 */

import {
  type RocketPart,
  type VehicleConfig,
  type StageConfig,
  type StageMassBreakdown,
  type StageDeltaVResult,
  type VehicleSummary,
  STANDARD_GRAVITY,
} from './types';

// ---------------------------------------------------------------------------
// 部件目录
// ---------------------------------------------------------------------------

export const PART_CATALOG: Record<string, RocketPart> = {
  // --- 指令舱 ---
  'cmd-pod-mk1': {
    id: 'cmd-pod-mk1',
    name: 'Mk1 指令舱',
    type: 'command-pod',
    dryMassKg: 800,
    dragCoefficient: 0.3,
    crossSectionAreaM2: 3.14,
    desc: '单人指令舱，带防热罩',
    techLevel: 1,
  },
  'cmd-pod-mk2': {
    id: 'cmd-pod-mk2',
    name: 'Mk2 指令舱',
    type: 'command-pod',
    dryMassKg: 1500,
    dragCoefficient: 0.28,
    crossSectionAreaM2: 5.0,
    desc: '三人指令舱，登月级',
    techLevel: 2,
  },

  // --- 发动机 ---
  'engine-merlin-1d': {
    id: 'engine-merlin-1d',
    name: 'Merlin 1D (煤油/液氧)',
    type: 'engine',
    dryMassKg: 470,
    thrustVacuumN: 845_000,
    ispVacuumS: 311,
    thrustSeaLevelN: 760_000,
    ispSeaLevelS: 282,
    propellantType: 'liquid-kerosene-lox',
    throttleable: true,
    minThrottle: 0.4,
    desc: 'Falcon 9 一级发动机，可节流',
    techLevel: 2,
  },
  'engine-raptor': {
    id: 'engine-raptor',
    name: 'Raptor (甲烷/液氧)',
    type: 'engine',
    dryMassKg: 1630,
    thrustVacuumN: 2_300_000,
    ispVacuumS: 350,
    thrustSeaLevelN: 1_850_000,
    ispSeaLevelS: 330,
    propellantType: 'liquid-kerosene-lox',
    throttleable: true,
    minThrottle: 0.2,
    desc: 'Starship 发动机，全流量分级燃烧',
    techLevel: 3,
  },
  'engine-super-draco': {
    id: 'engine-super-draco',
    name: 'Super Draco (自燃推进剂)',
    type: 'engine',
    dryMassKg: 160,
    thrustVacuumN: 73_000,
    ispVacuumS: 235,
    propellantType: 'hypergolic',
    throttleable: true,
    minThrottle: 0.2,
    desc: '发射逃逸/着陆发动机',
    techLevel: 2,
  },

  // --- 燃料罐 ---
  'tank-f9-s1': {
    id: 'tank-f9-s1',
    name: 'Falcon 9 一级燃料罐',
    type: 'fuel-tank',
    dryMassKg: 22_000,
    propellantMassKg: 395_000,
    compatiblePropellant: 'liquid-kerosene-lox',
    dragCoefficient: 0.2,
    crossSectionAreaM2: 3.14,
    desc: 'RP-1/LOX 罐体',
    techLevel: 2,
  },
  'tank-f9-s2': {
    id: 'tank-f9-s2',
    name: 'Falcon 9 二级燃料罐',
    type: 'fuel-tank',
    dryMassKg: 4_500,
    propellantMassKg: 92_000,
    compatiblePropellant: 'liquid-kerosene-lox',
    dragCoefficient: 0.2,
    crossSectionAreaM2: 3.14,
    desc: 'RP-1/LOX 罐体（上面级）',
    techLevel: 2,
  },
  'tank-small': {
    id: 'tank-small',
    name: '小型燃料罐',
    type: 'fuel-tank',
    dryMassKg: 200,
    propellantMassKg: 2000,
    compatiblePropellant: 'liquid-kerosene-lox',
    dragCoefficient: 0.25,
    crossSectionAreaM2: 1.0,
    desc: '小型上面级燃料罐',
    techLevel: 1,
  },

  // --- 分离器 ---
  'separator-1m': {
    id: 'separator-1m',
    name: '1m 分离器',
    type: 'separator',
    dryMassKg: 50,
    dragCoefficient: 0.3,
    crossSectionAreaM2: 0.785,
    desc: '1 米直径级间分离环',
    techLevel: 1,
  },

  // --- 结构件 ---
  'structural-adapter': {
    id: 'structural-adapter',
    name: '结构适配器',
    type: 'structural',
    dryMassKg: 100,
    dragCoefficient: 0.25,
    crossSectionAreaM2: 1.0,
    desc: '通用结构连接件',
    techLevel: 1,
  },
};

/** 按 ID 获取部件 */
export function getPart(id: string): RocketPart {
  const part = PART_CATALOG[id];
  if (!part) {
    throw new Error(`部件 ID "${id}" 不存在于目录中`);
  }
  return part;
}

/** 按类型筛选部件 */
export function getPartsByType(type: RocketPart['type']): RocketPart[] {
  return Object.values(PART_CATALOG).filter((p) => p.type === type);
}

/** 所有部件 */
export function getAllParts(): RocketPart[] {
  return Object.values(PART_CATALOG);
}

// ---------------------------------------------------------------------------
// 质量与 Δv 计算
// ---------------------------------------------------------------------------

/**
 * 计算单级的干质量和推进剂质量。
 */
function computeStageMass(stage: StageConfig): { dryMassKg: number; propellantMassKg: number } {
  let dryMass = 0;
  let propellant = 0;
  for (const inst of stage.parts) {
    const part = getPart(inst.partId);
    const count = inst.count ?? 1;
    dryMass += part.dryMassKg * count;
    if (part.propellantMassKg) {
      propellant += part.propellantMassKg * count;
    }
  }
  return { dryMassKg: dryMass, propellantMassKg: propellant };
}

/**
 * 计算载具各级质量明细（从顶到底）。
 *
 * 每级的 totalMassKg = 该级湿质量 + 上方所有级总质量。
 */
export function computeStageMasses(config: VehicleConfig): StageMassBreakdown[] {
  const n = config.stages.length;
  const breakdowns: StageMassBreakdown[] = [];

  // 先算每级自身质量
  const stageSelfMass = config.stages.map((stage) => computeStageMass(stage));

  // 从顶到底累计
  let upperMass = 0; // 上方所有级的总质量
  for (let i = n - 1; i >= 0; i -= 1) {
    const self = stageSelfMass[i];
    const stageWet = self.dryMassKg + self.propellantMassKg;
    const total = stageWet + upperMass;
    breakdowns[i] = {
      dryMassKg: self.dryMassKg,
      propellantMassKg: self.propellantMassKg,
      stageWetMassKg: stageWet,
      totalMassKg: total,
    };
    upperMass = total;
  }

  return breakdowns;
}

/**
 * 计算单级 Δv（齐奥尔科夫斯基方程）。
 *
 * Δv = Isp · g₀ · ln(m₀ / m₁)
 *
 * 其中：
 * - m₀ = 该级点火时的总质量（含上方所有级 + 本级湿质量）
 * - m₁ = 该级燃料耗尽后的总质量（含上方所有级 + 本级干质量）
 * - Isp = 该级所有发动机的加权平均比冲（按推力加权）
 */
export function computeStageDeltaV(
  stage: StageConfig,
  mass: StageMassBreakdown,
): StageDeltaVResult {
  // 汇总发动机参数
  let totalThrust = 0;
  let weightedIsp = 0;
  let engineCount = 0;
  for (const inst of stage.parts) {
    const part = getPart(inst.partId);
    if (part.type === 'engine' && part.thrustVacuumN && part.ispVacuumS) {
      const count = inst.count ?? 1;
      const thrust = part.thrustVacuumN * count;
      totalThrust += thrust;
      weightedIsp += part.ispVacuumS * thrust;
      engineCount += count;
    }
  }

  const avgIsp = totalThrust > 0 ? weightedIsp / totalThrust : 0;

  // m0 = 点火时总质量，m1 = 燃尽时总质量
  const m0 = mass.totalMassKg;
  const m1 = mass.totalMassKg - mass.propellantMassKg;

  // Δv = Isp · g₀ · ln(m0/m1)
  let deltaV = 0;
  if (avgIsp > 0 && m0 > m1 && m1 > 0) {
    deltaV = avgIsp * STANDARD_GRAVITY * Math.log(m0 / m1);
  }

  // 推重比（海平面）
  const weight = mass.totalMassKg * STANDARD_GRAVITY;
  const twr = totalThrust / weight;

  // 燃烧时间 = 推进剂质量 / (总质量流率)
  // 质量流率 = 总推力 / (Isp · g₀)
  let burnTime = 0;
  if (avgIsp > 0 && totalThrust > 0) {
    const massFlow = totalThrust / (avgIsp * STANDARD_GRAVITY);
    burnTime = mass.propellantMassKg / massFlow;
  }

  return {
    name: stage.name,
    deltaVmS: deltaV,
    thrustN: totalThrust,
    ispS: avgIsp,
    initialMassKg: m0,
    burnoutMassKg: m1,
    thrustToWeight: twr,
    burnTimeS: burnTime,
  };
}

/**
 * 计算载具汇总：总质量、各级 Δv、推重比等。
 */
export function computeVehicleSummary(config: VehicleConfig): VehicleSummary {
  const masses = computeStageMasses(config);
  const stages: StageDeltaVResult[] = config.stages.map((stage, i) =>
    computeStageDeltaV(stage, masses[i]),
  );

  const totalDryMass = masses[0]?.totalMassKg ?? 0;
  const lastStage = masses[masses.length - 1];
  const totalWetMass = masses[0]?.totalMassKg ?? 0;

  // 总 Δv = 各级 Δv 之和
  const totalDeltaV = stages.reduce((sum, s) => sum + s.deltaVmS, 0);

  // 气动参数：取最大横截面积和平均阻力系数
  let maxArea = 0;
  let totalDragCoeff = 0;
  let dragPartCount = 0;
  for (const stage of config.stages) {
    for (const inst of stage.parts) {
      const part = getPart(inst.partId);
      if (part.crossSectionAreaM2 && part.crossSectionAreaM2 > maxArea) {
        maxArea = part.crossSectionAreaM2;
      }
      if (part.dragCoefficient !== undefined) {
        totalDragCoeff += part.dragCoefficient;
        dragPartCount += 1;
      }
    }
  }

  return {
    totalDryMassKg: totalDryMass,
    totalWetMassKg: totalWetMass,
    totalDeltaVmS: totalDeltaV,
    stages,
    crossSectionAreaM2: maxArea,
    dragCoefficient: dragPartCount > 0 ? totalDragCoeff / dragPartCount : 0.2,
  };
}

// ---------------------------------------------------------------------------
// 预设载具配置
// ---------------------------------------------------------------------------

/** Falcon 9 类似的两级火箭预设 */
export const PRESET_FALCON9: VehicleConfig = {
  name: 'Falcon 9 类似',
  stages: [
    {
      name: '一级 (9× Merlin)',
      parts: [
        { partId: 'engine-merlin-1d', count: 9 },
        { partId: 'tank-f9-s1' },
        { partId: 'separator-1m' },
      ],
      throttle: 1.0,
    },
    {
      name: '二级 (1× Merlin + 指令舱)',
      parts: [
        { partId: 'engine-merlin-1d', count: 1 },
        { partId: 'tank-f9-s2' },
        { partId: 'separator-1m' },
        { partId: 'cmd-pod-mk2' },
      ],
      throttle: 1.0,
    },
  ],
};

/** 小型探空火箭预设（单级） */
export const PRESET_SOUNDING_ROCKET: VehicleConfig = {
  name: '小型探空火箭',
  stages: [
    {
      name: '单级',
      parts: [
        { partId: 'engine-super-draco', count: 4 },
        { partId: 'tank-small' },
        { partId: 'separator-1m' },
        { partId: 'cmd-pod-mk1' },
      ],
      throttle: 1.0,
    },
  ],
};
