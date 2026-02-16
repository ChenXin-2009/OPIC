# 实现任务：可观测宇宙可视化

## 概述

本实现计划将可观测宇宙可视化功能分解为一系列增量式的编码任务。每个任务都建立在前一个任务的基础上，确保代码逐步集成并及早验证核心功能。

**重要说明：本项目使用真实天文观测数据，不使用模拟数据。**

数据来源：
- 本星系群：McConnachie (2012) 目录（local_group_mcconnachie2012.txt）
- 近邻星系群：Karachentsev et al. (2013) 目录（nearby_groups_karachentsev2013.txt）
- 室女座超星系团：2MRS 巡天数据（virgo_supercluster_2mrs.txt）
- 拉尼亚凯亚超星系团：Cosmicflows-3 数据集（laniakea_cosmicflows3.txt）

实现策略：
1. 首先创建基础类型定义和配置系统
2. 实现坐标系统转换和数据加载基础设施
3. 实现性能优化组件（LOD、粒子系统、内存管理）
4. 按尺度顺序实现4个渲染器（基于真实数据）
5. 集成到现有 SceneManager
6. 添加 UI 组件和用户交互
7. 准备纹理资源
8. 编写测试验证正确性
9. 优化和文档化

## 任务

## 阶段 1：基础设施和配置

### 1.1 创建类型定义
- [x] 1.1.1 创建 `src/lib/types/universeTypes.ts`
  - 定义 `UniverseScale` 枚举（9个尺度：solar-system 到 observable-universe）
  - 定义 `UniverseScaleRenderer` 接口（getGroup, update, getOpacity, getIsVisible, dispose, setBrightness?, getObjectData?）
  - 定义 `LocalGroupGalaxy` 接口（name, x, y, z, type, brightness, color, radius）
  - 定义 `SimpleGalaxy` 接口（x, y, z, brightness）
  - 定义 `GalaxyGroup` 接口（name, centerX/Y/Z, radius, memberCount, richness, galaxies）
  - 定义 `GalaxyCluster` 接口（name, centerX/Y/Z, radius, memberCount, richness, galaxies）
  - 定义 `Supercluster` 接口（name, centerX/Y/Z, radius, memberCount, richness, velocityX/Y/Z?）
  - 定义 `CosmicStructure` 接口（type: 'wall'|'void'|'filament', name, centerX/Y/Z, sizeX/Y/Z, redshift）
  - 定义 `FilamentParams` 接口（anchorPoints, thickness, density）
  - 定义 `GalaxyType` 枚举（Spiral=0, Elliptical=1, Irregular=2, Dwarf=3）
  - 定义 `LODLevel` 接口（distance, particleRatio, textureSize）
  - _需求: 11.1, 11.4, 11.5_

### 1.2 创建宇宙尺度配置
- [x] 1.2.1 创建 `src/lib/config/universeScaleConfig.ts`
  - 从 galaxyConfig 导入 PARSEC_TO_AU, LIGHT_YEAR_TO_AU, SCALE_VIEW_CONFIG
  - 定义 `MEGAPARSEC_TO_AU = PARSEC_TO_AU * 1e6`
  - 定义 `GIGAPARSEC_TO_AU = PARSEC_TO_AU * 1e9`
  - 定义 `UNIVERSE_SCALE_CONFIG` 扩展 SCALE_VIEW_CONFIG
    - localGroupShowStart: 200000 * LIGHT_YEAR_TO_AU
    - localGroupShowFull: 500000 * LIGHT_YEAR_TO_AU
    - localGroupFadeStart: 150000 * LIGHT_YEAR_TO_AU
    - nearbyGroupsShowStart: 1e6 * LIGHT_YEAR_TO_AU
    - nearbyGroupsShowFull: 3e6 * LIGHT_YEAR_TO_AU
    - nearbyGroupsFadeStart: 800000 * LIGHT_YEAR_TO_AU
    - virgoShowStart: 5e6 * LIGHT_YEAR_TO_AU
    - virgoShowFull: 15e6 * LIGHT_YEAR_TO_AU
    - virgoFadeStart: 4e6 * LIGHT_YEAR_TO_AU
    - laniakeaShowStart: 50e6 * LIGHT_YEAR_TO_AU
    - laniakeaShowFull: 150e6 * LIGHT_YEAR_TO_AU
    - laniakeaFadeStart: 40e6 * LIGHT_YEAR_TO_AU
    - nearbySuperclusterShowStart: 150e6 * LIGHT_YEAR_TO_AU
    - nearbySuperclusterShowFull: 400e6 * LIGHT_YEAR_TO_AU
    - nearbySuperclusterFadeStart: 120e6 * LIGHT_YEAR_TO_AU
    - observableUniverseShowStart: 500e6 * LIGHT_YEAR_TO_AU
    - observableUniverseShowFull: 1500e6 * LIGHT_YEAR_TO_AU
    - observableUniverseFadeStart: 400e6 * LIGHT_YEAR_TO_AU
  - 定义 `LOCAL_GROUP_CONFIG`（enabled, galaxyCount: 80, baseGalaxySize, brightnessScale, useTextures, 纹理路径, labelShowDistance）
  - 定义 `NEARBY_GROUPS_CONFIG`（enabled, groupCount: 8, galaxyCount: 150, useParticles, particleSize, enhancementFactor: 3）
  - 定义 `VIRGO_SUPERCLUSTER_CONFIG`（enabled, clusterCount: 30, galaxyCount: 600, useParticles, particleSize, densityFieldEnabled, enhancementFactor: 5）
  - 定义 `LANIAKEA_SUPERCLUSTER_CONFIG`（enabled, superclusterCount: 15, galaxyCount: 200, useParticles, particleSize, showVelocityFlow, velocityArrowScale, lodEnabled, lodLevels: 3）
  - 定义 `NEARBY_SUPERCLUSTER_CONFIG`（enabled, superclusterCount: 20, galaxyCount: 200, useParticles, particleSize, densityFieldEnabled）
  - 定义 `OBSERVABLE_UNIVERSE_CONFIG`（enabled, anchorPointCount: 100, filamentEnabled, filamentThickness, filamentDensity, voidEnabled, voidMinSize, wallEnabled, showRedshiftMarkers, redshiftLevels, showObservableBoundary, boundaryRadius）
  - _需求: 7.2, 11.1, 11.6_

### 1.3 创建统一配置导出
- [x] 1.3.1 创建 `src/lib/config/universeConfig.ts`
  - 使用 `export * from './galaxyConfig'` 导出现有配置
  - 使用 `export { ... } from './universeScaleConfig'` 导出所有新配置
  - 确保没有命名冲突
  - _需求: 11.1_

## 阶段 2：坐标系统和数据处理

### 2.1 实现坐标系转换工具
- [x] 2.1.1 创建 `src/lib/utils/CoordinateConverter.ts`
  - 实现 `equatorialToGalactic(ra: number, dec: number)` 静态方法
    - 使用北银极坐标：α_NGP = 192.859508°, δ_NGP = 27.128336°
    - 计算银经 l 和银纬 b
    - 返回 { l: number, b: number }
  - 实现 `galacticToSupergalactic(l: number, b: number, distance: number)` 静态方法
    - 使用超银道坐标系原点：l_0 = 137.37°, b_0 = 0°
    - 计算超银道经度 SGL 和超银道纬度 SGB
    - 转换为笛卡尔坐标 (x, y, z)
    - 返回 THREE.Vector3
  - 实现 `equatorialToSupergalactic(ra: number, dec: number, distance: number)` 静态方法
    - 组合调用上述两个方法
    - 返回 THREE.Vector3
  - 实现 `redshiftToComovingDistance(z: number)` 静态方法
    - 使用宇宙学参数：H₀=70 km/s/Mpc, Ωₘ=0.3, ΩΛ=0.7
    - 对于 z < 0.1，使用近似公式：d ≈ c * z / H₀
    - 对于 z ≥ 0.1，使用数值积分（100步）
    - 返回共动距离（Mpc）
  - _需求: 10.1, 10.2, 10.3, 10.4, 10.8_

- [x] 2.1.2 为坐标转换工具编写单元测试
  - 创建 `src/lib/utils/__tests__/CoordinateConverter.test.ts`
  - 测试仙女座星系 M31 的坐标转换（RA=10.68°, Dec=41.27°, d=0.78 Mpc）
  - 验证转换结果与已知值匹配（误差 < 1%）
  - 测试红移转换（z=0.05, z=0.5, z=1.0）
  - 测试边界情况（z=0, 极点坐标）
  - _需求: 10.5, 10.8_

### 2.2 创建数据加载器
- [x] 2.2.1 创建 `src/lib/data/UniverseDataLoader.ts`
  - 实现单例模式（private constructor, static getInstance()）
  - 定义私有属性：
    - cache: Map<string, ArrayBuffer>
    - loadingPromises: Map<string, Promise<ArrayBuffer>>
  - 实现 `loadBinaryFile(path: string)` 私有方法
    - 使用 fetch API 加载文件
    - 返回 ArrayBuffer
    - 处理错误情况（404, 网络错误）
  - 实现 `loadDataForScale(scale: UniverseScale)` 方法
    - 检查缓存，如果存在直接返回
    - 检查是否正在加载，避免重复请求
    - 调用 loadBinaryFile 加载数据
    - 存入缓存
    - 返回 ArrayBuffer
  - 实现 `getFilenameForScale(scale: UniverseScale)` 私有方法
    - 映射 UniverseScale 到文件路径
  - 实现 `getAdjacentScales(scale: UniverseScale)` 私有方法
    - 返回相邻的尺度数组（前一个和后一个）
  - 实现 `getDistantScales(scale: UniverseScale)` 私有方法
    - 返回距离当前尺度 ≥ 3 级的尺度数组
  - _需求: 14.1, 14.2, 14.3, 14.4_

- [x] 2.2.2 实现数据解析方法
  - 实现 `parseLocalGroupData(buffer: ArrayBuffer)` 方法
    - 解析从 local_group_mcconnachie2012.txt 生成的二进制格式
    - 创建 LocalGroupGalaxy 对象数组
    - 处理名称索引查找
  - 实现 `parseNearbyGroupsData(buffer: ArrayBuffer)` 方法
    - 解析从 nearby_groups_karachentsev2013.txt 生成的二进制数据
    - 解析星系群元数据和星系数据
    - 返回 { groups: GalaxyGroup[], galaxies: SimpleGalaxy[] }
  - 实现 `parseVirgoSuperclusterData(buffer: ArrayBuffer)` 方法
    - 解析从 virgo_supercluster_2mrs.txt 生成的二进制数据
  - 实现 `parseLaniakeaData(buffer: ArrayBuffer)` 方法
    - 解析从 laniakea_cosmicflows3.txt 生成的二进制数据
  - _需求: 9.1, 9.2, 14.1_

- [x] 2.2.3 实现预加载和缓存管理
  - 实现 `preloadAdjacentScales(currentScale: UniverseScale)` 方法
    - 在后台加载相邻尺度数据
    - 使用 Promise.all 并行加载
    - 捕获错误但不阻塞
  - 实现 `releaseDistantScales(currentScale: UniverseScale)` 方法
    - 删除远距离尺度的缓存
    - 释放内存
  - _需求: 14.3, 14.7_

- [x] 2.2.4 为数据加载器编写单元测试
  - 创建 `src/lib/data/__tests__/UniverseDataLoader.test.ts`
  - 测试单例模式
  - 测试缓存机制
  - 测试并发加载（避免重复请求）
  - 测试错误处理
  - 使用 mock fetch API
  - _需求: 14.4, 14.5_

### 2.3 准备天文数据文件
- [x] 2.3.1 创建数据准备脚本 `scripts/prepare-universe-data.py`
  - 安装依赖：astropy, numpy
  - 实现 `parse_local_group_data()` 函数
    - 读取 `public/data/universe/raw-data/local_group_mcconnachie2012.txt`
    - 解析 McConnachie (2012) 目录的真实数据
    - 提取星系信息：名称、RA、Dec、距离、类型、亮度
  - 实现 `parse_nearby_groups_data()` 函数
    - 读取 `public/data/universe/raw-data/nearby_groups_karachentsev2013.txt`
    - 解析 Karachentsev (2013) 目录的真实数据
    - 提取星系群和星系信息
  - 实现 `parse_virgo_supercluster_data()` 函数
    - 读取 `public/data/universe/raw-data/virgo_supercluster_2mrs.txt`
    - 解析 2MRS 巡天的真实数据
  - 实现 `parse_laniakea_data()` 函数
    - 读取 `public/data/universe/raw-data/laniakea_cosmicflows3.txt`
    - 解析 Cosmicflows-3 数据集的真实数据
  - 实现 `convert_to_supergalactic(ra, dec, distance)` 函数
    - 使用 astropy.coordinates 进行坐标转换
    - 返回超银道坐标 (x, y, z)
  - 实现 `generate_binary_file(galaxies, output_path)` 函数
    - 将数据打包为 Float32Array 格式
    - 写入二进制文件
  - 实现 `generate_metadata(output_path)` 函数
    - 生成 JSON 元数据文件
    - 包含：数据来源、版本、日期、坐标系、星系数量
  - 实现 `validate_data(galaxies)` 函数
    - 检查仙女座星系 M31 的位置（应在 ~0.78 Mpc）
    - 检查异常值
    - 打印统计信息
  - _需求: 9.1, 9.2, 9.3, 9.4, 10.1, 10.5_

- [x] 2.3.2 运行数据准备脚本并创建数据文件
  - 确认 `public/data/universe/` 目录存在
  - 运行脚本处理真实数据文件生成所有 .bin 文件：
    - local-group.bin（来自 local_group_mcconnachie2012.txt）
    - nearby-groups.bin（来自 nearby_groups_karachentsev2013.txt）
    - virgo-supercluster.bin（来自 virgo_supercluster_2mrs.txt）
    - laniakea.bin（来自 laniakea_cosmicflows3.txt）
  - 生成 `metadata.json`
  - 使用 gzip 压缩所有 .bin 文件
  - 验证压缩后总大小 < 30KB
  - 提交数据文件到版本控制（如果合适）
  - _需求: 9.5, 9.6_

## 阶段 3：性能优化组件

### 3.1 实现 LOD 管理器
- [x] 3.1.1 创建 `src/lib/3d/LODManager.ts`
  - 定义 LOD 级别数组（4个级别）：
    - Level 0: distance=0, particleRatio=1.0, textureSize=512
    - Level 1: distance=100e6*LIGHT_YEAR_TO_AU, particleRatio=0.5, textureSize=256
    - Level 2: distance=500e6*LIGHT_YEAR_TO_AU, particleRatio=0.2, textureSize=128
    - Level 3: distance=1000e6*LIGHT_YEAR_TO_AU, particleRatio=0.05, textureSize=64
  - 实现 `getCurrentLOD(cameraDistance: number)` 方法
    - 遍历 LOD 级别，返回匹配的级别
    - 使用二分查找优化性能
  - 实现 `updateRendererLOD(renderer: UniverseScaleRenderer, lod: LODLevel)` 方法
    - 调用 renderer.setParticleRatio(lod.particleRatio)
    - 调用 renderer.setTextureSize(lod.textureSize)
  - _需求: 8.1, 8.4_

### 3.2 实现优化粒子系统
- [x] 3.2.1 创建 `src/lib/3d/OptimizedParticleSystem.ts`
  - 定义类属性：
    - geometry: THREE.BufferGeometry
    - material: THREE.ShaderMaterial
    - points: THREE.Points
  - 实现构造函数 `constructor(positions: Float32Array, colors: Float32Array, sizes: Float32Array)`
    - 创建 BufferGeometry
    - 设置 position, color, size 属性
    - 创建自定义 ShaderMaterial
  - 实现顶点着色器：
    - 接收 size, color 属性
    - 接收 uPointScale uniform
    - 计算距离衰减：gl_PointSize = size * uPointScale * (1000.0 / dist)
    - 传递 vColor 到片段着色器
  - 实现片段着色器：
    - 接收 vColor, uOpacity, uBrightness uniforms
    - 绘制圆形点（使用 gl_PointCoord）
    - 实现光晕效果：alpha = 1.0 - smoothstep(0.0, 0.5, dist)
    - 输出：vec4(vColor * uBrightness, alpha * uOpacity)
  - 设置材质属性：
    - transparent: true
    - depthWrite: false
    - blending: THREE.AdditiveBlending
  - 创建 THREE.Points 对象
  - 启用视锥剔除：points.frustumCulled = true
  - _需求: 8.2, 8.3, 8.5_

- [x] 3.2.2 实现粒子系统方法
  - 实现 `setParticleRatio(ratio: number)` 方法
    - 计算可见粒子数量：visibleCount = floor(totalCount * ratio)
    - 调用 geometry.setDrawRange(0, visibleCount)
  - 实现 `updateOpacity(opacity: number)` 方法
    - 更新 material.uniforms.uOpacity.value
  - 实现 `updateBrightness(brightness: number)` 方法
    - 更新 material.uniforms.uBrightness.value
  - 实现 `getPoints()` 方法
    - 返回 THREE.Points 对象
  - 实现 `dispose()` 方法
    - 清理 geometry 和 material
  - _需求: 8.1, 8.2_

### 3.3 实现实例化渲染器
- [x] 3.3.1 创建 `src/lib/3d/InstancedGalaxyRenderer.ts`
  - 定义类属性：
    - instancedMesh: THREE.InstancedMesh
    - dummy: THREE.Object3D
  - 实现构造函数 `constructor(galaxies: LocalGroupGalaxy[], geometry: THREE.BufferGeometry, material: THREE.Material)`
    - 创建 THREE.InstancedMesh(geometry, material, galaxies.length)
    - 遍历星系数组
    - 为每个实例设置变换矩阵（位置、缩放）
    - 为每个实例设置颜色
    - 标记 instanceMatrix 和 instanceColor 需要更新
  - 实现 `getInstancedMesh()` 方法
    - 返回 instancedMesh
  - 实现 `updateInstance(index: number, position: THREE.Vector3, scale: number, color: THREE.Color)` 方法
    - 更新指定实例的变换和颜色
  - 实现 `dispose()` 方法
    - 清理 instancedMesh
  - _需求: 8.5_

### 3.4 实现视锥剔除优化器
- [x] 3.4.1 创建 `src/lib/3d/FrustumCullingOptimizer.ts`
  - 定义类属性：
    - frustum: THREE.Frustum
    - projScreenMatrix: THREE.Matrix4
  - 实现 `updateFrustum(camera: THREE.Camera)` 方法
    - 计算投影屏幕矩阵
    - 从矩阵设置视锥体
  - 实现 `isVisible(object: THREE.Object3D)` 方法
    - 获取或计算包围球
    - 转换到世界空间
    - 测试与视锥体相交
  - 实现 `cullObjects(objects: THREE.Object3D[])` 方法
    - 过滤可见对象
    - 返回可见对象数组
  - _需求: 8.3_

### 3.5 实现内存管理器
- [x] 3.5.1 创建 `src/lib/3d/MemoryManager.ts`
  - 定义类属性：
    - maxMemoryMB: number = 2000
    - currentMemoryMB: number = 0
    - rendererMemory: Map<string, number>
  - 实现 `registerRenderer(name: string, memoryMB: number)` 方法
    - 添加到 rendererMemory Map
    - 更新 currentMemoryMB
  - 实现 `unregisterRenderer(name: string)` 方法
    - 从 rendererMemory Map 移除
    - 更新 currentMemoryMB
  - 实现 `shouldReleaseMemory()` 方法
    - 返回 currentMemoryMB > maxMemoryMB * 0.8
  - 实现 `releaseDistantRenderers(currentScale: UniverseScale)` 方法
    - 获取远距离尺度列表
    - 调用每个渲染器的 dispose()
    - 注销渲染器
  - 实现 `getMemoryUsage()` 方法
    - 返回当前内存使用情况
  - _需求: 8.7_

### 3.6 实现程序化生成器
- [x] 3.6.1 创建 `src/lib/3d/ProceduralGenerator.ts`
  - 定义类属性：
    - worker: Worker | null
  - 实现构造函数
    - 检查 Worker 支持
    - 创建 Worker: new Worker('/workers/galaxy-generator.js')
  - 实现 `generateGalaxies(clusterMetadata: ClusterMetadata, realGalaxies: SimpleGalaxy[])` 异步方法
    - 返回 Promise<SimpleGalaxy[]>
    - 发送消息到 Worker
    - 监听 Worker 响应
    - 处理错误
  - 实现静态方法 `nfwDistribution(center: Vector3, radius: number, count: number)` 
    - 使用 NFW 分布（Navarro-Frenk-White profile）
    - 特征半径 rs = radius * 0.2
    - 使用拒绝采样生成径向距离
    - 随机生成方向（球坐标）
    - 返回 Vector3 数组
  - 实现静态方法 `nfwProbability(r: number, rs: number)`
    - 计算 NFW 概率密度：1 / (x * (1 + x)²)
  - 实现 `dispose()` 方法
    - 终止 Worker
  - _需求: 9.7_

- [x] 3.6.2 创建 Web Worker `public/workers/galaxy-generator.js`
  - 监听 message 事件
  - 实现星系生成逻辑（NFW 分布）
  - 避免与真实星系重叠（最小距离检查）
  - 发送结果回主线程
  - 处理错误情况
  - _需求: 9.7_

## 阶段 4：渲染器实现

### 4.1 实现本星系群渲染器
- [x] 4.1.1 创建 `src/lib/3d/LocalGroupRenderer.ts` 基础结构
  - 实现 `UniverseScaleRenderer` 接口
  - 定义类属性：
    - group: THREE.Group
    - galaxies: LocalGroupGalaxy[]
    - instancedRenderer: InstancedGalaxyRenderer | null
    - opacity: number = 0
    - isVisible: boolean = false
    - config: typeof LOCAL_GROUP_CONFIG
  - 实现构造函数
    - 初始化 THREE.Group
    - 保存配置引用
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.1.2 实现数据加载和星系创建
  - 实现 `async loadData()` 方法
    - 使用 UniverseDataLoader.getInstance().loadLocalGroupData()
    - 存储加载的星系数据
    - 调用 createGalaxies()
  - 实现 `createGalaxies()` 私有方法
    - 根据星系类型创建不同几何体
    - 螺旋星系：使用螺旋纹理的平面几何体
    - 椭圆星系：使用椭圆纹理的球体几何体
    - 不规则星系：使用不规则纹理
    - 矮星系：使用简单点精灵
  - 实现 `createGalaxyMesh(galaxy: LocalGroupGalaxy)` 私有方法
    - 根据 galaxy.type 选择几何体和材质
    - 设置位置、缩放、颜色
    - 返回 THREE.Mesh
  - 使用 InstancedGalaxyRenderer 优化渲染
  - 添加所有网格到 group
  - _需求: 1.3, 1.4, 1.5, 13.1, 13.2_

- [x] 4.1.3 实现更新和淡入淡出逻辑
  - 实现 `update(cameraDistance: number, deltaTime: number)` 方法
    - 调用 calculateOpacity(cameraDistance)
    - 更新 isVisible 状态
    - 更新所有材质的透明度
    - 根据距离显示/隐藏标签
  - 实现 `calculateOpacity(cameraDistance: number)` 私有方法
    - 使用 UNIVERSE_SCALE_CONFIG 的阈值
    - fadeStart: 150,000 光年
    - showStart: 200,000 光年
    - showFull: 500,000 光年
    - 计算平滑插值（使用 smoothstep 或线性插值）
    - 返回 0-1 之间的透明度值
  - _需求: 1.6, 1.7, 7.1, 7.2, 7.3, 7.4_

- [x] 4.1.4 实现交互和清理
  - 实现 `getObjectData()` 方法
    - 返回星系数据数组（用于点击交互）
  - 实现 `setBrightness(brightness: number)` 方法
    - 更新所有材质的亮度
  - 实现 `getGroup()` 方法
    - 返回 THREE.Group
  - 实现 `getOpacity()` 方法
    - 返回当前透明度
  - 实现 `getIsVisible()` 方法
    - 返回可见性状态
  - 实现 `dispose()` 方法
    - 清理所有几何体和材质
    - 清理 instancedRenderer
    - 从场景移除 group
  - _需求: 12.1, 12.6_

### 4.2 实现近邻星系群渲染器
- [x] 4.2.1 创建 `src/lib/3d/NearbyGroupsRenderer.ts`
  - 实现 `UniverseScaleRenderer` 接口
  - 定义类属性：
    - group: THREE.Group
    - groups: GalaxyGroup[]
    - galaxies: SimpleGalaxy[]
    - particleSystem: OptimizedParticleSystem | null
    - proceduralGenerator: ProceduralGenerator
    - opacity: number = 0
    - isVisible: boolean = false
  - 实现构造函数
    - 初始化 THREE.Group
    - 创建 ProceduralGenerator 实例
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4.2.2 实现数据加载和粒子系统创建
  - 实现 `async loadData()` 方法
    - 加载近邻星系群数据
    - 调用程序化生成增强
    - 创建粒子系统
  - 实现 `enhanceWithProceduralGalaxies()` 异步方法
    - 对每个星系群调用 ProceduralGenerator
    - 根据 enhancementFactor 生成额外星系
    - 合并真实数据和生成数据
  - 实现 `createParticleSystem()` 私有方法
    - 准备 positions, colors, sizes Float32Array
    - 创建 OptimizedParticleSystem
    - 添加到 group
  - _需求: 2.4, 2.5, 9.7_

- [x] 4.2.3 实现更新和淡入淡出
  - 实现 `update(cameraDistance: number, deltaTime: number)` 方法
    - 计算透明度
    - 更新粒子系统透明度
    - 更新可见性状态
  - 实现 `calculateOpacity(cameraDistance: number)` 方法
    - fadeStart: 800,000 光年
    - showStart: 1,000,000 光年
    - showFull: 3,000,000 光年
  - 实现其他接口方法（getGroup, getOpacity, getIsVisible, dispose）
  - _需求: 2.6, 2.7, 7.1, 7.2_

### 4.3 实现室女座超星系团渲染器
- [x] 4.3.1 创建 `src/lib/3d/VirgoSuperclusterRenderer.ts`
  - 实现 `UniverseScaleRenderer` 接口
  - 定义类属性（类似 NearbyGroupsRenderer）
  - 添加 densityField 相关属性
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.3.2 实现密度场渲染
  - 实现 `createDensityField()` 私有方法
    - 创建 3D 网格
    - 计算每个网格单元的星系密度
    - 使用密度值调整粒子亮度
  - 实现 `applyDensityToParticles()` 私有方法
    - 根据密度场调整粒子大小和颜色
  - _需求: 3.4, 3.5_

- [x] 4.3.3 实现数据加载和更新
  - 实现 loadData, update, calculateOpacity 方法
  - fadeStart: 4,000,000 光年
  - showStart: 5,000,000 光年
  - showFull: 15,000,000 光年
  - 实现程序化生成增强（enhancementFactor: 5）
  - _需求: 3.6, 3.7, 7.1_

### 4.4 实现拉尼亚凯亚超星系团渲染器
- [x] 4.4.1 创建 `src/lib/3d/LaniakeaSuperclusterRenderer.ts`
  - 实现 `UniverseScaleRenderer` 接口
  - 定义类属性
  - 添加 LOD 系统集成
  - 添加引力流可视化属性
  - _需求: 4.1, 4.2, 4.3, 4.4_

- [x] 4.4.2 实现 LOD 系统集成
  - 在构造函数中创建 LODManager 实例
  - 实现 `updateLOD(cameraDistance: number)` 私有方法
    - 获取当前 LOD 级别
    - 更新粒子系统的粒子比率
    - 更新纹理大小
  - 在 update 方法中调用 updateLOD
  - _需求: 4.4, 8.1_

- [x] 4.4.3 实现引力流可视化（可选）
  - 实现 `createVelocityArrows()` 私有方法
    - 为每个超星系团创建箭头
    - 使用 velocityX/Y/Z 数据
    - 使用 ArrowHelper 或自定义几何体
  - 实现 `updateVelocityArrows()` 方法
    - 根据配置显示/隐藏箭头
  - _需求: 4.5_

- [x] 4.4.4 实现数据加载和更新
  - fadeStart: 40,000,000 光年
  - showStart: 50,000,000 光年
  - showFull: 150,000,000 光年
  - _需求: 4.6, 4.7, 7.1_

### 4.5 实现近邻超星系团渲染器
- [x] 4.5.1 创建 `src/lib/3d/NearbySuperclusterRenderer.ts`
  - 实现 `UniverseScaleRenderer` 接口
  - 使用密度场渲染
  - 根据质量调整视觉大小
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.5.2 实现质量缩放
  - 实现 `calculateMassScale(supercluster: Supercluster)` 私有方法
    - 根据 memberCount 和 richness 估算质量
    - 返回视觉缩放因子
  - 在创建粒子时应用质量缩放
  - _需求: 5.5_

- [x] 4.5.3 实现数据加载和更新
  - fadeStart: 120,000,000 光年
  - showStart: 150,000,000 光年
  - showFull: 400,000,000 光年
  - _需求: 5.6, 5.7, 7.1_

### 4.6 实现可观测宇宙渲染器
- [x] 4.6.1 创建 `src/lib/3d/ObservableUniverseRenderer.ts`
  - 实现 `UniverseScaleRenderer` 接口
  - 定义类属性：
    - filaments: THREE.Line[]
    - voids: THREE.Mesh[]
    - walls: THREE.Mesh[]
    - redshiftMarkers: THREE.Sprite[]
    - boundary: THREE.Mesh | null
  - _需求: 6.1, 6.2, 6.3, 6.4_

- [x] 4.6.2 实现宇宙纤维生成
  - 实现 `generateFilaments(anchorPoints: Vector3[])` 私有方法
    - 在锚点之间生成连接
    - 使用 Catmull-Rom 曲线平滑路径
    - 创建管道几何体（TubeGeometry）
    - 使用半透明材质
  - 实现 `shouldConnectPoints(p1: Vector3, p2: Vector3)` 私有方法
    - 基于距离和密度决定是否连接
  - _需求: 6.3_

- [x] 4.6.3 实现宇宙空洞可视化
  - 实现 `identifyVoids(galaxies: Vector3[])` 私有方法
    - 创建密度网格
    - 识别低密度区域
    - 返回空洞位置和大小
  - 实现 `createVoidMeshes(voids: any[])` 私有方法
    - 为每个空洞创建半透明球体
    - 使用深色材质
  - _需求: 6.3_

- [x] 4.6.4 实现红移标记和边界
  - 实现 `createRedshiftMarkers()` 私有方法
    - 在不同红移处创建标记
    - z = 0.1, 0.5, 1.0, 2.0
    - 使用文本精灵显示红移值
  - 实现 `createObservableBoundary()` 私有方法
    - 创建半径 465 亿光年的球体
    - 使用线框材质
    - 半透明显示
  - _需求: 6.6, 6.8_

- [x] 4.6.5 实现数据加载和更新
  - fadeStart: 400,000,000 光年
  - showStart: 500,000,000 光年
  - showFull: 1,500,000,000 光年
  - 实现体积渲染技术
  - _需求: 6.4, 6.5, 6.7, 7.1_

## 阶段 5：SceneManager 集成

### 5.1 扩展 SceneManager
- [x] 5.1.1 修改 `src/lib/3d/SceneManager.ts` - 添加属性
  - 添加私有属性：
    - localGroupRenderer: LocalGroupRenderer | null = null
    - nearbyGroupsRenderer: NearbyGroupsRenderer | null = null
    - virgoSuperclusterRenderer: VirgoSuperclusterRenderer | null = null
    - laniakeaSuperclusterRenderer: LaniakeaSuperclusterRenderer | null = null
    - nearbySuperclusterRenderer: NearbySuperclusterRenderer | null = null
    - observableUniverseRenderer: ObservableUniverseRenderer | null = null
    - memoryManager: MemoryManager
  - 在构造函数中初始化 MemoryManager
  - _需求: 11.2, 11.3_

- [x] 5.1.2 实现渲染器初始化方法
  - 实现 `async initializeLocalGroup()` 私有方法
    - 创建 LocalGroupRenderer 实例
    - 调用 loadData()
    - 将 group 添加到场景
    - 注册到 MemoryManager（估算 ~5MB）
  - 实现 `async initializeNearbyGroups()` 私有方法
    - 创建 NearbyGroupsRenderer 实例
    - 调用 loadData()
    - 添加到场景
    - 注册到 MemoryManager（估算 ~10MB）
  - 实现类似方法用于其他4个渲染器：
    - initializeVirgoSupercluster（估算 ~20MB）
    - initializeLaniakeaSupercluster（估算 ~15MB）
    - initializeNearbySupercluster（估算 ~15MB）
    - initializeObservableUniverse（估算 ~10MB）
  - _需求: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 5.1.3 修改 initializeMultiScaleView 方法
  - 在现有初始化后添加新渲染器初始化：
    ```typescript
    await this.initializeLocalGroup();
    await this.initializeNearbyGroups();
    await this.initializeVirgoSupercluster();
    await this.initializeLaniakeaSupercluster();
    await this.initializeNearbySupercluster();
    await this.initializeObservableUniverse();
    ```
  - 使用 Promise.all 并行加载以提高性能
  - 处理加载错误（捕获并记录，但不阻塞其他渲染器）
  - _需求: 11.2_

- [x] 5.1.4 修改 updateMultiScaleView 方法
  - 在现有更新后添加新渲染器更新：
    ```typescript
    this.localGroupRenderer?.update(cameraDistance, deltaTime);
    this.nearbyGroupsRenderer?.update(cameraDistance, deltaTime);
    this.virgoSuperclusterRenderer?.update(cameraDistance, deltaTime);
    this.laniakeaSuperclusterRenderer?.update(cameraDistance, deltaTime);
    this.nearbySuperclusterRenderer?.update(cameraDistance, deltaTime);
    this.observableUniverseRenderer?.update(cameraDistance, deltaTime);
    ```
  - 调用 updateSkyboxOpacity(cameraDistance, deltaTime)
  - 检查内存使用并释放远距离渲染器
  - _需求: 7.1, 7.5_

- [x] 5.1.5 实现天空盒透明度更新
  - 实现 `updateSkyboxOpacity(cameraDistance: number, deltaTime: number)` 私有方法
    - 当相机距离 > 某个阈值时，逐渐淡出天空盒
    - 使用平滑插值
    - 更新天空盒材质的透明度
  - _需求: 1.7, 7.1_

### 5.2 集成内存管理
- [x] 5.2.1 在 SceneManager 中集成内存管理
  - 在 updateMultiScaleView 中添加内存检查：
    ```typescript
    if (this.memoryManager.shouldReleaseMemory()) {
      const currentScale = this.getCurrentScale(cameraDistance);
      this.memoryManager.releaseDistantRenderers(currentScale);
    }
    ```
  - 实现 `getCurrentScale(cameraDistance: number)` 私有方法
    - 根据相机距离返回当前 UniverseScale
  - 实现 `getRenderer(scale: UniverseScale)` 私有方法
    - 返回对应尺度的渲染器
  - _需求: 8.7_

- [x] 5.2.2 实现渲染器清理
  - 修改 dispose 方法，清理所有新渲染器：
    ```typescript
    this.localGroupRenderer?.dispose();
    this.nearbyGroupsRenderer?.dispose();
    // ... 其他渲染器
    ```
  - 从 MemoryManager 注销所有渲染器
  - _需求: 8.7_

## 阶段 6：UI 组件

### 6.1 创建宇宙尺度指示器
- [x] 6.1.1 创建 `src/components/UniverseScaleIndicator.tsx`
  - 定义组件 props：
    ```typescript
    interface UniverseScaleIndicatorProps {
      cameraDistance: number;
    }
    ```
  - 实现 `getUniverseScale(distance: number)` 辅助函数
    - 使用 UNIVERSE_SCALE_CONFIG 的阈值
    - 返回当前 UniverseScale 枚举值
  - 定义尺度名称映射（中文）：
    ```typescript
    const scaleNames = {
      [UniverseScale.SolarSystem]: '太阳系',
      [UniverseScale.NearbyStars]: '近邻恒星',
      [UniverseScale.Galaxy]: '银河系',
      [UniverseScale.LocalGroup]: '本星系群',
      [UniverseScale.NearbyGroups]: '近邻星系群',
      [UniverseScale.VirgoSupercluster]: '室女座超星系团',
      [UniverseScale.LaniakeaSupercluster]: '拉尼亚凯亚超星系团',
      [UniverseScale.NearbySupercluster]: '近邻超星系团',
      [UniverseScale.ObservableUniverse]: '可观测宇宙',
    };
    ```
  - _需求: 12.4, 12.5_

- [x] 6.1.2 实现距离格式化
  - 实现 `formatDistance(distance: number)` 辅助函数
    - 如果 < 1000 AU：显示 "X AU"
    - 如果 < 1 光年：显示 "X,XXX AU"
    - 如果 < 1000 光年：显示 "X.X 光年"
    - 如果 < 1,000,000 光年：显示 "X,XXX 光年"
    - 如果 < 1,000,000,000 光年：显示 "X.X 百万光年"
    - 否则：显示 "X.X 亿光年"
  - _需求: 12.5_

- [x] 6.1.3 实现组件渲染
  - 渲染容器 div（固定在右上角）
  - 显示当前尺度名称
  - 显示格式化的距离
  - 添加样式（使用 Tailwind CSS）：
    - 半透明黑色背景
    - 白色文字
    - 适当的内边距和圆角
    - z-index 确保在最上层
  - _需求: 12.4, 12.5_

### 6.2 扩展 InfoModal
- [x] 6.2.1 修改 `src/components/InfoModal.tsx`
  - 添加"宇宙尺度"部分
  - 列出所有可视化的尺度（基于真实天文数据）：
    - 本星系群（来自 McConnachie 2012 目录）
    - 近邻星系群（来自 Karachentsev 2013 目录）
    - 室女座超星系团（来自 2MRS 巡天数据）
    - 拉尼亚凯亚超星系团（来自 Cosmicflows-3 数据集）
  - 强调所有数据均为真实天文观测数据
  - 添加数据来源部分
  - 添加坐标系统说明（超银道坐标系）
  - _需求: 9.6, 10.9, 12.4_

- [x] 6.2.2 添加数据来源引用
  - 列出主要数据来源：
    - McConnachie (2012) 本星系群目录（local_group_mcconnachie2012.txt）
    - Karachentsev et al. (2013) 近邻星系目录（nearby_groups_karachentsev2013.txt）
    - 2MRS 巡天室女座超星系团数据（virgo_supercluster_2mrs.txt）
    - Cosmicflows-3 拉尼亚凯亚超星系团数据集（laniakea_cosmicflows3.txt）
  - 说明所有数据均为真实天文观测数据，不使用模拟数据
  - 添加链接到原始数据源
  - _需求: 9.6_

### 6.3 扩展 SettingsMenu
- [x] 6.3.1 修改 `src/components/SettingsMenu.tsx`
  - 添加"宇宙尺度渲染"部分
  - 为每个渲染器添加开关：
    - 本星系群
    - 近邻星系群
    - 室女座超星系团
    - 拉尼亚凯亚超星系团
    - 近邻超星系团
    - 可观测宇宙
  - 使用复选框或切换开关
  - _需求: 11.2, 11.3_

- [x] 6.3.2 添加性能配置选项
  - 添加"淡入淡出速度"滑块（0.5x - 2x）
  - 添加"LOD 级别"选择器（低/中/高/超高）
  - 添加"粒子密度"滑块（25% - 100%）
  - 保存设置到 localStorage
  - _需求: 7.6, 8.1_

- [x] 6.3.3 添加拉尼亚凯亚特殊选项
  - 添加"显示引力流"复选框
  - 添加"引力流箭头大小"滑块
  - 仅在拉尼亚凯亚渲染器启用时可用
  - _需求: 4.5_

- [x] 6.3.4 实现设置应用
  - 实现 `applySettings()` 函数
  - 通过 SceneManager 更新渲染器配置
  - 实时应用设置（无需重新加载）
  - _需求: 11.6_

## 阶段 7：纹理和资源

### 7.1 准备星系纹理
- [x] 7.1.1 创建或获取螺旋星系纹理
  - 创建 `public/textures/universe/spiral-galaxy.webp`
  - 尺寸：512x512 或 256x256
  - 特征：
    - 明亮的中心核心
    - 螺旋臂结构
    - 透明背景（alpha 通道）
    - 蓝白色调
  - 使用图像编辑软件或程序化生成
  - 优化文件大小（< 50KB）
  - _需求: 13.1_

- [x] 7.1.2 创建或获取椭圆星系纹理
  - 创建 `public/textures/universe/elliptical-galaxy.webp`
  - 尺寸：512x512 或 256x256
  - 特征：
    - 平滑的椭圆形状
    - 中心到边缘的亮度渐变
    - 透明背景
    - 黄白色调
  - 优化文件大小（< 50KB）
  - _需求: 13.2_

- [x] 7.1.3 创建或获取不规则星系纹理
  - 创建 `public/textures/universe/irregular-galaxy.webp`
  - 尺寸：512x512 或 256x256
  - 特征：
    - 不规则形状
    - 多个亮区
    - 透明背景
    - 混合色调
  - 优化文件大小（< 50KB）
  - _需求: 13.1_

- [x] 7.1.4 测试纹理加载
  - 在 LocalGroupRenderer 中测试纹理加载
  - 验证纹理正确应用到星系
  - 检查性能影响
  - 调整纹理大小如果需要
  - _需求: 13.1, 13.2_

## 阶段 8：测试和优化

### 8.1 单元测试
- [x] 8.1.1 创建坐标转换测试
  - 创建 `src/lib/utils/__tests__/CoordinateConverter.test.ts`
  - 测试用例：
    - 测试仙女座星系 M31 坐标转换
    - 测试银河系中心坐标转换
    - 测试极点坐标（北银极、南银极）
    - 测试红移转换（z=0, 0.05, 0.5, 1.0, 2.0）
    - 测试边界情况
  - 验证精度（误差 < 1%）
  - _需求: 10.8_

- [x] 8.1.2 创建数据加载器测试
  - 创建 `src/lib/data/__tests__/UniverseDataLoader.test.ts`
  - 测试用例：
    - 测试单例模式
    - 测试缓存机制
    - 测试并发加载
    - 测试错误处理（404, 网络错误）
    - 测试预加载
    - 测试缓存释放
  - 使用 mock fetch API
  - _需求: 14.4, 14.5_

- [x] 8.1.3 创建渲染器测试
  - 为每个渲染器创建基础测试
  - 测试用例：
    - 测试初始化
    - 测试数据加载
    - 测试透明度计算
    - 测试更新方法
    - 测试清理方法
  - 使用 mock Three.js 对象
  - _需求: 所有渲染器需求_

### 8.2 性能测试
- [x] 8.2.1 测试各尺度的帧率
  - 创建性能测试脚本
  - 测试场景：
    - 本星系群：目标 60 FPS
    - 近邻星系群：目标 60 FPS
    - 室女座超星系团：目标 60 FPS
    - 拉尼亚凯亚：目标 60 FPS
    - 近邻超星系团：目标 30+ FPS
    - 可观测宇宙：目标 30+ FPS
  - 在不同设备上测试（高端、中端、低端）
  - 记录结果并优化瓶颈
  - _需求: 8.4, 8.5_

- [x] 8.2.2 测试内存使用
  - 使用 Chrome DevTools Memory Profiler
  - 测试场景：
    - 初始加载内存使用
    - 所有渲染器加载后的内存使用
    - 缩放过程中的内存变化
    - 内存释放机制是否正常工作
  - 验证总内存使用 < 2GB
  - 检查内存泄漏
  - _需求: 8.7_

- [x] 8.2.3 测试加载时间
  - 测试初始加载时间（< 5 秒）
  - 测试数据文件加载速度
  - 测试渲染器初始化时间
  - 优化慢速部分
  - _需求: 14.2_

### 8.3 视觉质量测试
- [x] 8.3.1 验证淡入淡出过渡
  - 手动测试所有尺度之间的过渡
  - 验证过渡平滑（无闪烁）
  - 验证透明度计算正确
  - 验证过渡时间合理（1-3秒）
  - _需求: 7.1, 7.2, 7.3, 7.4_

- [x] 8.3.2 验证空间对齐
  - 验证不同尺度之间的空间对齐
  - 检查仙女座星系在不同尺度的位置一致性
  - 检查坐标系统正确性
  - _需求: 10.1, 10.2, 10.5_

- [x] 8.3.3 验证星系类型视觉差异
  - 验证螺旋星系、椭圆星系、不规则星系的视觉区别
  - 检查纹理应用正确
  - 检查颜色和亮度合理
  - _需求: 1.5, 13.1, 13.2_

- [x] 8.3.4 验证 LOD 切换
  - 测试 LOD 级别切换
  - 验证切换平滑（无突变）
  - 验证性能提升明显
  - _需求: 8.1_

### 8.4 集成测试
- [x] 8.4.1 测试完整缩放流程
  - 从太阳系缩放到可观测宇宙
  - 验证所有渲染器正确显示和隐藏
  - 验证性能稳定
  - 验证无错误或警告
  - _需求: 7.1, 7.5_

- [x] 8.4.2 测试快速缩放
  - 快速缩放（跳过中间尺度）
  - 验证性能不下降
  - 验证渲染正确
  - _需求: 7.7_

- [x] 8.4.3 测试相机控制
  - 测试相机旋转、平移、缩放
  - 验证响应性良好
  - 验证与渲染器更新协调
  - _需求: 7.5_

- [x] 8.4.4 测试点击交互
  - 测试点击本星系群的星系
  - 验证显示详细信息
  - 测试搜索功能（如果实现）
  - _需求: 12.1, 12.2, 12.3_

## 阶段 9：文档和部署

### 9.1 更新文档
- [x] 9.1.1 更新 README.md
  - 添加"宇宙尺度可视化"部分
  - 说明功能特性：
    - 4个新的宇宙尺度（基于真实天文数据）
    - 真实天文观测数据（来自 McConnachie 2012、Karachentsev 2013、2MRS、Cosmicflows-3）
    - 平滑的尺度过渡
    - 性能优化（LOD、粒子系统）
  - 添加使用说明：
    - 如何缩放到不同尺度
    - 如何查看星系信息
    - 如何调整设置
  - 添加数据来源引用（强调使用真实数据，不使用模拟数据）
  - _需求: 9.6_

- [x] 9.1.2 创建 `docs/UNIVERSE_VISUALIZATION.md`
  - 详细说明架构设计：
    - 渲染器架构
    - 数据加载策略
    - 性能优化技术
  - 说明坐标系统：
    - 超银道坐标系
    - 坐标转换公式
    - 验证方法
  - 说明数据来源和处理：
    - 数据来源列表
    - 数据格式
    - 数据准备流程
  - 说明性能优化策略：
    - LOD 系统
    - 粒子系统
    - 内存管理
    - 视锥剔除
  - _需求: 10.9_

- [x] 9.1.3 添加代码注释
  - 为所有公共方法添加 JSDoc 注释
  - 为复杂算法添加解释性注释
  - 为配置参数添加说明
  - _需求: 11.7_

### 9.2 代码审查和优化
- [x] 9.2.1 代码审查
  - 检查代码风格一致性（使用 ESLint）
  - 检查 TypeScript 类型安全（无 any 类型）
  - 检查错误处理（所有异步操作有 try-catch）
  - 检查性能瓶颈（使用 Chrome DevTools）
  - _需求: 11.7_

- [x] 9.2.2 最终优化
  - 优化着色器代码（减少计算）
  - 优化数据加载策略（并行加载）
  - 优化内存使用（及时释放）
  - 优化渲染性能（减少绘制调用）
  - _需求: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9.2.3 清理代码
  - 移除调试代码和 console.log
  - 移除未使用的导入和变量
  - 格式化代码（使用 Prettier）
  - 更新依赖版本
  - _需求: 11.7_

### 9.3 部署准备
- [x] 9.3.1 构建生产版本
  - 运行 `npm run build`
  - 检查构建输出大小
  - 验证所有资源正确打包
  - 测试生产构建
  - _需求: 所有需求_

- [x] 9.3.2 测试生产版本性能
  - 在生产模式下测试性能
  - 验证所有功能正常工作
  - 检查控制台无错误
  - 测试不同浏览器（Chrome、Firefox、Safari、Edge）
  - _需求: 所有需求_

- [x] 9.3.3 准备发布说明
  - 列出新功能
  - 列出改进和优化
  - 列出已知问题（如果有）
  - 添加截图或演示视频
  - _需求: 所有需求_

## 注意事项

- 每个任务都引用了相关的需求编号以确保可追溯性
- 建议按顺序完成任务，因为后续任务依赖前面的任务
- 性能测试应在真实设备上进行，不仅仅是开发环境
- 数据文件准备可能需要较长时间，建议提前开始
- 如遇到技术难题，可以参考设计文档中的详细实现方案
- 测试覆盖率目标：> 80%

## 预期文件结构

```
src/
├── lib/
│   ├── types/
│   │   └── universeTypes.ts
│   ├── config/
│   │   ├── universeScaleConfig.ts
│   │   └── universeConfig.ts
│   ├── utils/
│   │   ├── CoordinateConverter.ts
│   │   └── __tests__/
│   │       └── CoordinateConverter.test.ts
│   ├── data/
│   │   ├── UniverseDataLoader.ts
│   │   └── __tests__/
│   │       └── UniverseDataLoader.test.ts
│   └── 3d/
│       ├── LODManager.ts
│       ├── OptimizedParticleSystem.ts
│       ├── InstancedGalaxyRenderer.ts
│       ├── FrustumCullingOptimizer.ts
│       ├── MemoryManager.ts
│       ├── ProceduralGenerator.ts
│       ├── LocalGroupRenderer.ts
│       ├── NearbyGroupsRenderer.ts
│       ├── VirgoSuperclusterRenderer.ts
│       ├── LaniakeaSuperclusterRenderer.ts
│       ├── NearbySuperclusterRenderer.ts
│       ├── ObservableUniverseRenderer.ts
│       └── SceneManager.ts (修改)
├── components/
│   ├── UniverseScaleIndicator.tsx
│   ├── InfoModal.tsx (修改)
│   └── SettingsMenu.tsx (修改)
public/
├── data/
│   └── universe/
│       ├── raw-data/
│       │   ├── local_group_mcconnachie2012.txt（真实数据源）
│       │   ├── nearby_groups_karachentsev2013.txt（真实数据源）
│       │   ├── virgo_supercluster_2mrs.txt（真实数据源）
│       │   └── laniakea_cosmicflows3.txt（真实数据源）
│       ├── local-group.bin（从真实数据生成）
│       ├── nearby-groups.bin（从真实数据生成）
│       ├── virgo-supercluster.bin（从真实数据生成）
│       ├── laniakea.bin（从真实数据生成）
│       └── metadata.json
├── textures/
│   └── universe/
│       ├── spiral-galaxy.webp
│       ├── elliptical-galaxy.webp
│       └── irregular-galaxy.webp
└── workers/
    └── galaxy-generator.js
scripts/
└── prepare-universe-data.py
docs/
└── UNIVERSE_VISUALIZATION.md
```

## 依赖项

确保安装以下依赖：

```bash
# 生产依赖
npm install three @types/three

# 开发依赖
npm install --save-dev @testing-library/react @testing-library/jest-dom jest typescript

# Python 依赖（用于处理真实数据文件）
pip install astropy numpy
```
