/**
 * @module 3d/index
 * @description 3D 渲染模块统一导出入口
 * 
 * 本模块是整个 3D 可视化系统的导出接口,提供了从太阳系到宇宙尺度的完整渲染能力。
 * 包括场景管理、相机控制、天体渲染、轨道可视化、多尺度宇宙渲染和性能优化系统。
 * 
 * @architecture
 * - 所属子系统：3D 渲染
 * - 架构层级：核心层
 * - 职责边界：负责 Three.js 场景管理和渲染,不负责数据加载、天文计算或用户交互
 * 
 * @dependencies
 * - 直接依赖：three, 3d/SceneManager, 3d/CameraController, 3d/Planet, 3d/OrbitCurve, 3d/BaseUniverseRenderer
 * - 被依赖：components/UniverseVisualization, app/page
 * - 循环依赖：无
 * 
 * @renderPipeline
 * 渲染管线组织：
 * 1. 场景初始化（SceneManager）
 * 2. 相机控制（CameraController）
 * 3. 天体渲染（Planet, OrbitCurve, SatelliteOrbit）
 * 4. 多尺度渲染（BaseUniverseRenderer 及其子类）
 * 5. 性能优化（LODManager, OptimizedParticleSystem）
 * 6. 标签管理（UniverseLabelManager）
 * 
 * @performance
 * - 使用 LOD（Level of Detail）系统减少渲染负载
 * - 使用视锥剔除优化可见性判断
 * - 使用粒子系统优化大量天体渲染
 * - 使用纹理管理器优化内存使用
 * 
 * @coordinateSystem
 * - 太阳系：日心黄道坐标系（ICRS J2000.0）
 * - 恒星：银河系坐标系
 * - 星系：超星系团坐标系
 * 
 * @example
 * ```typescript
 * import { SceneManager, CameraController, Planet } from '@/lib/3d';
 * 
 * // 初始化场景
 * const sceneManager = new SceneManager(container);
 * const cameraController = new CameraController(sceneManager.getCamera());
 * 
 * // 创建行星
 * const earth = new Planet('Earth', earthTexture, 0.008);
 * sceneManager.getScene().add(earth.getMesh());
 * ```
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
