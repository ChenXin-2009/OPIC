/**
 * 3D渲染模块导出
 */

// 核心渲染器
export { SceneManager } from './SceneManager';
export { CameraController } from './CameraController';
export { Planet } from './Planet';
export { OrbitCurve } from './OrbitCurve';
export { OrbitLabel } from './OrbitLabel';
export { SatelliteOrbit } from './SatelliteOrbit';

// 宇宙尺度渲染器
export { BaseUniverseRenderer } from './BaseUniverseRenderer';
export { LocalGroupRenderer } from './LocalGroupRenderer';
export { NearbyGroupsRenderer } from './NearbyGroupsRenderer';
export { VirgoSuperclusterRenderer } from './VirgoSuperclusterRenderer';
export { LaniakeaSuperclusterRenderer } from './LaniakeaSuperclusterRenderer';

// 标签管理
export { UniverseLabelManager } from './UniverseLabelManager';
export type { LabelData, LabelConfig } from './UniverseLabelManager';

// 优化系统
export { OptimizedParticleSystem } from './OptimizedParticleSystem';
export { LODManager } from './LODManager';

// 纹理管理
export { TextureManager } from './TextureManager';
