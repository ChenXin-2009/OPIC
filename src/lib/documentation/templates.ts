/**
 * @module documentation/templates
 * @description 代码注释模板常量
 * 
 * @architecture
 * - 所属子系统：文档系统
 * - 架构层级：核心层
 * - 职责边界：提供标准化的注释模板，确保注释格式一致性，不负责注释的生成和验证
 * 
 * @dependencies
 * - 直接依赖：无
 * - 被依赖：开发者手动使用或自动化工具引用
 * - 循环依赖：无
 */

/**
 * 模块注释模板
 * 
 * @description 用于文件顶部的模块级注释，说明模块的职责、架构定位和依赖关系
 * 
 * @example
 * ```typescript
 * /**
 *  * @module astronomy/calculator
 *  * @description 天文位置计算模块
 *  * 
 *  * @architecture
 *  * - 所属子系统：天文计算
 *  * - 架构层级：核心层
 *  * - 职责边界：负责天体位置计算，不负责数据加载和渲染
 *  * 
 *  * @dependencies
 *  * - 直接依赖：astronomy/coordinates, astronomy/time
 *  * - 被依赖：3d/celestial-objects
 *  * - 循环依赖：无
 *  *\/
 * ```
 */
export const MODULE_COMMENT_TEMPLATE = `/**
 * @module ModuleName
 * @description 模块的职责和功能描述
 * 
 * @architecture
 * - 所属子系统：[3D渲染 | 天文计算 | 数据加载 | UI组件]
 * - 架构层级：[核心层 | 服务层 | 表现层]
 * - 职责边界：明确说明模块应该做什么，不应该做什么
 * 
 * @dependencies
 * - 直接依赖：列出直接依赖的模块
 * - 被依赖：列出依赖本模块的模块
 * - 循环依赖：如果存在，说明解决方案
 * 
 * @example
 * \`\`\`typescript
 * // 典型使用示例
 * \`\`\`
 */`;

/**
 * 函数注释模板
 * 
 * @description 用于函数和方法的注释，说明函数的目的、参数、返回值和性能特征
 * 
 * @example
 * ```typescript
 * /**
 *  * @description 计算两个向量的点积
 *  * 
 *  * @param {Vector3} a - 第一个向量
 *  * @param {Vector3} b - 第二个向量
 *  * @returns {number} 点积结果
 *  * 
 *  * @complexity 时间复杂度 O(1)，空间复杂度 O(1)
 *  * 
 *  * @example
 *  * ```typescript
 *  * const result = dotProduct(new Vector3(1, 0, 0), new Vector3(0, 1, 0));
 *  * console.log(result); // 0
 *  * ```
 *  *\/
 * function dotProduct(a: Vector3, b: Vector3): number {
 *   return a.x * b.x + a.y * b.y + a.z * b.z;
 * }
 * ```
 */
export const FUNCTION_COMMENT_TEMPLATE = `/**
 * @description 函数的目的和功能描述
 * 
 * @param {Type} paramName - 参数描述，包括有效值范围
 * @returns {Type} 返回值描述，包括可能的值
 * @throws {ErrorType} 异常条件和原因
 * 
 * @complexity 时间复杂度 O(n)，空间复杂度 O(1)
 * @performance 性能考虑和优化策略
 * 
 * @example
 * \`\`\`typescript
 * // 使用示例
 * const result = functionName(param);
 * \`\`\`
 */`;

/**
 * 天文计算函数注释模板
 * 
 * @description 专门用于天文计算函数的注释模板，包含坐标系统、单位和精度信息
 * 
 * @example
 * ```typescript
 * /**
 *  * @description 计算指定儒略日时刻地球相对于太阳的位置
 *  * 
 *  * @coordinateSystem ICRS（国际天球参考系）
 *  * @unit 输入：儒略日（无量纲），输出：AU（天文单位）
 *  * @precision 精度约 1 km，基于 DE440 星历表
 *  * 
 *  * @param {number} jd - 儒略日（Julian Date），基于 TDB 时间系统
 *  * @returns {Vector3} 位置向量，单位：AU，坐标系：ICRS
 *  * 
 *  * @example
 *  * ```typescript
 *  * // 计算 J2000.0 时刻地球的位置
 *  * const earthPos = calculateEarthPosition(2451545.0);
 *  * console.log(earthPos); // Vector3 { x: -0.177..., y: 0.967..., z: 0.000... }
 *  * ```
 *  *\/
 * ```
 */
export const ASTRONOMY_FUNCTION_TEMPLATE = `/**
 * @description 天文计算的物理意义
 * 
 * @coordinateSystem 使用的坐标系统（ICRS/黄道/地平）
 * @unit 输入输出的物理单位
 * @precision 计算精度和误差范围
 * 
 * @param {number} jd - 儒略日（Julian Date），基于 TDB 时间系统
 * @returns {Vector3} 位置向量，单位：AU，坐标系：ICRS
 * 
 * @example
 * \`\`\`typescript
 * // 计算 J2000.0 时刻地球的位置
 * const earthPos = calculateEarthPosition(2451545.0);
 * \`\`\`
 */`;

/**
 * 渲染函数注释模板
 * 
 * @description 用于 Three.js 渲染相关函数的注释模板，包含渲染管线阶段和性能信息
 * 
 * @example
 * ```typescript
 * /**
 *  * @description 更新星系粒子系统的位置和颜色
 *  * 
 *  * @renderPipeline 更新阶段（在渲染循环中每帧调用）
 *  * @performance 执行频率：每帧（60 FPS），性能影响：中等（约 2-3ms）
 *  * 
 *  * @param {THREE.Scene} scene - Three.js 场景对象
 *  * @param {number} deltaTime - 距离上一帧的时间间隔（秒）
 *  * @returns {void}
 *  * 
 *  * @example
 *  * ```typescript
 *  * // 在动画循环中调用
 *  * function animate() {
 *  *   const deltaTime = clock.getDelta();
 *  *   updateGalaxyParticles(scene, deltaTime);
 *  *   renderer.render(scene, camera);
 *  *   requestAnimationFrame(animate);
 *  * }
 *  * ```
 *  *\/
 * ```
 */
export const RENDER_FUNCTION_TEMPLATE = `/**
 * @description 渲染功能描述
 * 
 * @renderPipeline 在渲染管线中的阶段（初始化/更新/渲染/清理）
 * @performance 执行频率（每帧/每秒/按需），性能影响
 * 
 * @param {THREE.Scene} scene - Three.js 场景对象
 * @returns {void}
 * 
 * @example
 * \`\`\`typescript
 * // 在动画循环中调用
 * function animate() {
 *   renderFunction(scene);
 *   requestAnimationFrame(animate);
 * }
 * \`\`\`
 */`;

/**
 * 类型注释模板
 * 
 * @description 用于接口、类型别名和枚举的注释模板
 * 
 * @example
 * ```typescript
 * /**
 *  * @description 天体的轨道参数
 *  * 
 *  * @unit
 *  * - semiMajorAxis: AU（天文单位）
 *  * - eccentricity: 无量纲（0-1）
 *  * - inclination: 弧度（rad）
 *  *\/
 * interface OrbitalElements {
 *   /** 半长轴，单位：AU */
 *   semiMajorAxis: number;
 *   
 *   /** 离心率，范围：[0, 1)，0 表示圆形轨道 *\/
 *   eccentricity: number;
 *   
 *   /** 轨道倾角，单位：弧度，范围：[0, π] *\/
 *   inclination: number;
 * }
 * ```
 */
export const TYPE_COMMENT_TEMPLATE = `/**
 * @description 类型的用途和语义
 * 
 * @property {Type} fieldName - 字段的物理意义或业务含义
 * @unit 如果是物理量，说明单位
 * 
 * @example
 * \`\`\`typescript
 * const data: TypeName = {
 *   fieldName: value
 * };
 * \`\`\`
 */
interface TypeName {
  /** 字段描述，单位：[单位] */
  fieldName: Type;
}`;

/**
 * 配置项注释模板
 * 
 * @description 用于配置对象和常量的注释模板
 * 
 * @example
 * ```typescript
 * /**
 *  * 渲染质量配置
 *  * 
 *  * @description 控制 3D 渲染的质量和性能平衡
 *  * 
 *  * @performance
 *  * - low: 低质量，高性能（适合移动设备）
 *  * - medium: 中等质量，平衡性能（默认）
 *  * - high: 高质量，低性能（适合高端设备）
 *  *\/
 * export const RENDER_QUALITY_CONFIG = {
 *   /** 抗锯齿采样数，范围：[0, 4]，默认：2 *\/
 *   antialias: 2,
 *   
 *   /** 阴影贴图分辨率，范围：[512, 4096]，默认：2048 *\/
 *   shadowMapSize: 2048,
 * } as const;
 * ```
 */
export const CONFIG_COMMENT_TEMPLATE = `/**
 * 配置项名称
 * 
 * @description 配置项的用途和影响
 * 
 * @performance 性能影响说明和推荐值
 * 
 * @example
 * \`\`\`typescript
 * const config = {
 *   /** 配置项描述，范围：[min, max]，默认：default *\/
 *   option: defaultValue,
 * };
 * \`\`\`
 */`;
