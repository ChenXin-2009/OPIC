/**
 * @module data/rocket-parts/types
 * @description 火箭部件数据模型
 *
 * 定义火箭载具的部件类型系统。每个部件是载具的基本构建单元，
 * 可组装成多级火箭。设计参考 KSP (Kerbal Space Program) 的部件系统，
 * 但简化为数值参数驱动（不含 3D 网格信息，网格由渲染层处理）。
 *
 * @unit SI 国际单位制
 * - 质量：千克 (kg)
 * - 推力：牛顿 (N)
 * - 比冲：秒 (s)
 * - 面积：平方米 (m²)
 */

/** 部件类型 */
export type PartType =
  | 'command-pod'   // 指令舱（载人/控制）
  | 'engine'        // 发动机
  | 'fuel-tank'     // 燃料罐
  | 'separator'     // 分离器/级间环
  | 'structural'    // 结构件
  | 'parachute'     // 降落伞（Phase 4）
  | 'landing-leg'   // 起落架（Phase 3）
  | 'rcs'           // 姿态控制推进器（Phase 2+）
  | 'solar-panel'   // 太阳能板（Phase 4）
  | 'science';      // 科学仪器（Phase 4）

/** 推进剂类型 */
export type PropellantType = 'solid' | 'liquid-kerosene-lox' | 'liquid-hydrogen-lox' | 'hypergolic' | 'none';

/**
 * 火箭部件定义。
 *
 * 发动机部件包含 thrustVacuumN / ispVacuumS；
 * 燃料罐部件包含 propellantMassKg；
 * 其他部件仅含干质量。
 */
export interface RocketPart {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 部件类型 */
  type: PartType;
  /** 干质量 (kg) — 不含推进剂的质量 */
  dryMassKg: number;

  // --- 发动机参数（仅 type === 'engine' 时有效） ---
  /** 真空推力 (N) */
  thrustVacuumN?: number;
  /** 真空比冲 (s) */
  ispVacuumS?: number;
  /** 海平面推力 (N)，可选（用于大气段计算） */
  thrustSeaLevelN?: number;
  /** 海平面比冲 (s) */
  ispSeaLevelS?: number;
  /** 推进剂类型 */
  propellantType?: PropellantType;
  /** 可否节流 (0-100%) */
  throttleable?: boolean;
  /** 最小节流百分比 (0-1) */
  minThrottle?: number;

  // --- 燃料罐参数（仅 type === 'fuel-tank' 时有效） ---
  /** 推进剂质量 (kg) */
  propellantMassKg?: number;
  /** 适配的推进剂类型 */
  compatiblePropellant?: PropellantType;

  // --- 气动参数 ---
  /** 阻力系数（无量纲） */
  dragCoefficient?: number;
  /** 横截面积 (m²) */
  crossSectionAreaM2?: number;

  // --- 元数据 ---
  /** 描述 */
  desc?: string;
  /** 技术等级（1-3，影响性能） */
  techLevel?: number;
}

// ---------------------------------------------------------------------------
// 载具配置（多级火箭）
// ---------------------------------------------------------------------------

/** 单个部件实例（载具中的部件引用） */
export interface PartInstance {
  /** 引用的部件 ID */
  partId: string;
  /** 数量（默认 1） */
  count?: number;
}

/** 火箭一级配置 */
export interface StageConfig {
  /** 级名称 */
  name: string;
  /** 该级包含的部件 */
  parts: PartInstance[];
  /** 该级发动机的节流百分比 (0-1)，默认 1.0 */
  throttle?: number;
}

/** 完整载具配置 */
export interface VehicleConfig {
  /** 载具名称 */
  name: string;
  /** 从底到顶的各级配置（index 0 = 第一级/助推级） */
  stages: StageConfig[];
}

// ---------------------------------------------------------------------------
// 质量与 Δv 计算
// ---------------------------------------------------------------------------

/** 单级质量汇总 */
export interface StageMassBreakdown {
  /** 级干质量 (kg) — 不含推进剂 */
  dryMassKg: number;
  /** 级推进剂质量 (kg) */
  propellantMassKg: number;
  /** 级总质量 (kg) — 含上方所有级 */
  totalMassKg: number;
  /** 级湿质量 (kg) — 干+推进剂，不含上方 */
  stageWetMassKg: number;
}

/** 单级 Δv 计算结果 */
export interface StageDeltaVResult {
  /** 级名称 */
  name: string;
  /** Δv (m/s) */
  deltaVmS: number;
  /** 真空推力 (N) — 所有发动机之和 */
  thrustN: number;
  /** 真空比冲 (s) — 加权平均 */
  ispS: number;
  /** 初始总质量 (kg) — 含上方所有级 */
  initialMassKg: number;
  /** 燃料耗尽后质量 (kg) */
  burnoutMassKg: number;
  /** 推重比（该级点火时，相对海平面重力） */
  thrustToWeight: number;
  /** 燃烧时间 (s) */
  burnTimeS: number;
}

/** 载具汇总 */
export interface VehicleSummary {
  /** 总干质量 (kg) */
  totalDryMassKg: number;
  /** 总湿质量 (kg) */
  totalWetMassKg: number;
  /** 总 Δv (m/s) — 所有级之和 */
  totalDeltaVmS: number;
  /** 各级明细 */
  stages: StageDeltaVResult[];
  /** 平均横截面积 (m²) */
  crossSectionAreaM2: number;
  /** 平均阻力系数 */
  dragCoefficient: number;
}

/** 标准重力加速度 (m/s²) */
export const STANDARD_GRAVITY = 9.80665;
