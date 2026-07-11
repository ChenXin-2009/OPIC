/**
 * @module flight-dynamics
 * @description 飞行动力学核心模块 barrel 导出
 *
 * Phase 0：状态矢量类型、RK4 积分器、解析开普勒传播器。
 * Phase 1：推力+大气阻力+变质量积分器、大气模型、火箭方程。
 */

// 状态矢量与向量运算
export {
  type Vec3,
  type MutableVec3,
  type StateVector,
  vecAdd,
  vecSub,
  vecScale,
  vecDot,
  vecCross,
  vecMagnitude,
  vecMagnitudeSq,
  vecDistance,
  cloneState,
  makeState,
  specificEnergy,
  specificAngularMomentum,
} from './state';

// RK4 积分器（Phase 0 纯二体 + Phase 1 扩展）
export {
  GM_SI,
  EARTH_RADIUS_M,
  G0,
  twoBodyAcceleration,
  rk4Step,
  propagate,
  type PropagateOptions,
} from './integrator';

// Phase 1 扩展积分器（推力+阻力+变质量，独立文件避免循环依赖）
export {
  rk4FlightStep,
  propagateFlight,
  propagateFlightWithSubsteps,
  type FlightPropagateOptions,
} from './flight-integrator';

// 解析开普勒传播器（验证基准）
export {
  type OrbitalElements,
  stateToElements,
  elementsToState,
  propagateAnalytical,
  orbitalPeriod,
} from './kepler';

// 大气模型
export {
  RHO_0_EARTH,
  SCALE_HEIGHT_EARTH,
  ATMOSPHERE_CUTOFF_M,
  earthAtmosphereDensity,
  marsAtmosphereDensity,
  atmosphereDensity,
  dynamicPressure,
} from './atmosphere';

// 受力模型（引力+推力+阻力）
export {
  type ControlInput,
  type FlightState,
  type ForceModelConfig,
  EARTH_FORCE_MODEL,
  gravityAcceleration,
  thrustAcceleration,
  dragAcceleration,
  totalAcceleration,
  massFlowRate,
  currentDynamicPressure,
} from './forces';

// 火箭方程
export {
  deltaV,
  massAfterBurn,
  burnTime,
  propellantForDeltaV,
  thrustToWeight,
} from './rocket-equation';

// 飞行控制适配层
export {
  type FlightControlCommand,
  type FlightControllerConfig,
  DEFAULT_FLIGHT_CONTROLLER_CONFIG,
  updateThrottleFromPlayerInput,
  buildSteeredThrustDirection,
  mapPlayerInputToFlightControl,
} from './flight-controller';
