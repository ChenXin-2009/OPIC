# 需求文档：可观测宇宙可视化

## 引言

本文档定义了将现有太阳系可视化项目从银河系层级扩展到可观测宇宙的功能需求。当前项目已实现太阳系、近邻恒星（300光年内）和银河系（10万光年）的多尺度可视化。本次扩展将增加本星系群、室女座超星系团、拉尼亚凯亚超星系团和可观测宇宙大尺度结构的渲染能力。

## 术语表

- **System**: 整个太阳系可视化应用程序
- **SceneManager**: Three.js 场景管理器，负责管理所有 3D 对象和渲染
- **LocalGroup**: 本星系群，包含银河系、仙女座星系等约80个星系的星系群
- **VirgoSupercluster**: 室女座超星系团，包含约100个星系群和星系团
- **LaniakeaSupercluster**: 拉尼亚凯亚超星系团，更大尺度的宇宙结构
- **ObservableUniverse**: 可观测宇宙，包含宇宙大尺度结构（星系纤维、空洞等）
- **LOD**: Level of Detail，细节层次，根据距离动态调整渲染质量的技术
- **ParticleSystem**: 粒子系统，用于高效渲染大量星系的技术
- **CameraDistance**: 相机距离，以天文单位（AU）或光年（LY）为单位的相机到太阳系中心的距离
- **FadeTransition**: 淡入淡出过渡，在不同尺度视图之间平滑切换的视觉效果
- **CoordinateSystem**: 坐标系统，定义空间位置的参考框架（赤道坐标系、银道坐标系等）
- **AstronomicalData**: 天文数据，来自科学数据库的真实天体位置和属性信息


## 需求

### 需求 1：本星系群可视化

**用户故事：** 作为用户，我希望能够看到本星系群中的主要星系，以便理解银河系在本地宇宙中的位置。

#### 验收标准

1. WHEN 相机距离超过 200,000 光年 THEN THE System SHALL 开始显示本星系群的星系
2. WHEN 相机距离达到 500,000 光年 THEN THE System SHALL 完全显示本星系群的所有主要星系
3. THE LocalGroup SHALL 包含至少 15 个主要星系（银河系、仙女座星系 M31、三角座星系 M33 等）
4. WHEN 显示本星系群星系时 THEN THE System SHALL 使用真实的三维位置数据
5. WHEN 显示本星系群星系时 THEN THE System SHALL 根据星系类型显示不同的视觉表现（椭圆星系、螺旋星系、不规则星系）
6. WHEN 相机距离小于 150,000 光年 THEN THE System SHALL 淡出本星系群的星系显示
7. WHEN 显示本星系群时 THEN THE System SHALL 同时淡出银河系的详细结构显示

### 需求 2：室女座超星系团可视化

**用户故事：** 作为用户，我希望能够看到室女座超星系团的结构，以便理解本星系群在更大尺度上的位置。

#### 验收标准

1. WHEN 相机距离超过 2,000,000 光年 THEN THE System SHALL 开始显示室女座超星系团的星系群
2. WHEN 相机距离达到 5,000,000 光年 THEN THE System SHALL 完全显示室女座超星系团的结构
3. THE VirgoSupercluster SHALL 包含至少 30 个主要星系群和星系团
4. WHEN 显示室女座超星系团时 THEN THE System SHALL 使用粒子系统渲染大量星系以保持性能
5. WHEN 显示室女座超星系团时 THEN THE System SHALL 根据星系密度调整粒子亮度
6. WHEN 相机距离小于 1,500,000 光年 THEN THE System SHALL 淡出室女座超星系团的显示
7. WHEN 显示室女座超星系团时 THEN THE System SHALL 同时淡出本星系群的详细显示

### 需求 3：拉尼亚凯亚超星系团可视化

**用户故事：** 作为用户，我希望能够看到拉尼亚凯亚超星系团的宏观结构，以便理解宇宙中物质的分布模式。

#### 验收标准

1. WHEN 相机距离超过 20,000,000 光年 THEN THE System SHALL 开始显示拉尼亚凯亚超星系团的结构
2. WHEN 相机距离达到 50,000,000 光年 THEN THE System SHALL 完全显示拉尼亚凯亚超星系团
3. THE LaniakeaSupercluster SHALL 显示主要的超星系团结构和引力流向
4. WHEN 显示拉尼亚凯亚超星系团时 THEN THE System SHALL 使用高效的 LOD 系统以保持 60 FPS 性能
5. WHEN 显示拉尼亚凯亚超星系团时 THEN THE System SHALL 可视化星系的运动方向（引力流）
6. WHEN 相机距离小于 15,000,000 光年 THEN THE System SHALL 淡出拉尼亚凯亚超星系团的显示
7. WHEN 显示拉尼亚凯亚超星系团时 THEN THE System SHALL 同时淡出室女座超星系团的详细显示

### 需求 4：可观测宇宙大尺度结构可视化

**用户故事：** 作为用户，我希望能够看到可观测宇宙的大尺度结构，以便理解宇宙的整体形态。

#### 验收标准

1. WHEN 相机距离超过 200,000,000 光年 THEN THE System SHALL 开始显示可观测宇宙的大尺度结构
2. WHEN 相机距离达到 500,000,000 光年 THEN THE System SHALL 完全显示可观测宇宙结构
3. THE ObservableUniverse SHALL 显示星系纤维（filaments）和宇宙空洞（voids）
4. WHEN 显示可观测宇宙时 THEN THE System SHALL 使用基于密度场的渲染技术
5. WHEN 显示可观测宇宙时 THEN THE System SHALL 保持帧率不低于 30 FPS
6. THE ObservableUniverse SHALL 显示可观测宇宙的边界（约 465 亿光年半径）
7. WHEN 显示可观测宇宙时 THEN THE System SHALL 同时淡出拉尼亚凯亚超星系团的详细显示



### 需求 5：多尺度视图过渡系统

**用户故事：** 作为用户，我希望在不同宇宙尺度之间平滑过渡，以便获得连贯的视觉体验。

#### 验收标准

1. WHEN 相机距离变化时 THEN THE System SHALL 平滑地淡入淡出不同尺度的视图
2. THE System SHALL 使用配置化的距离阈值来控制视图切换
3. WHEN 两个尺度视图重叠显示时 THEN THE System SHALL 确保总透明度不超过 1.0
4. THE FadeTransition SHALL 在 1-3 秒内完成以保持流畅性
5. WHEN 视图切换时 THEN THE System SHALL 保持相机控制的响应性
6. THE System SHALL 支持用户配置淡入淡出速度
7. WHEN 快速缩放时 THEN THE System SHALL 跳过中间尺度以避免性能问题

### 需求 6：性能优化系统

**用户故事：** 作为用户，我希望即使在显示数百万个星系时也能保持流畅的性能，以便获得良好的交互体验。

#### 验收标准

1. THE System SHALL 使用 LOD 系统根据相机距离调整渲染质量
2. WHEN 显示大量星系时 THEN THE System SHALL 使用粒子系统而非单独的网格对象
3. THE System SHALL 实现视锥剔除以避免渲染不可见的对象
4. WHEN 帧率低于 30 FPS 时 THEN THE System SHALL 自动降低渲染质量
5. THE System SHALL 使用实例化渲染技术以减少绘制调用
6. THE System SHALL 支持 WebGL 2.0 以利用高级渲染特性
7. WHEN 内存使用超过阈值时 THEN THE System SHALL 释放不可见尺度的资源

### 需求 7：天文数据集成

**用户故事：** 作为用户，我希望看到基于真实天文数据的可视化，以便获得科学准确的宇宙视图。

#### 验收标准

1. THE System SHALL 使用真实的星系位置数据（来自 NED、HyperLeda 等数据库）
2. WHEN 显示星系时 THEN THE System SHALL 使用真实的星系类型和形态数据
3. THE System SHALL 使用真实的超星系团结构数据
4. WHEN 显示可观测宇宙时 THEN THE System SHALL 使用基于观测的大尺度结构模拟数据
5. THE AstronomicalData SHALL 包含星系的红移、距离和视向速度信息
6. THE System SHALL 提供数据来源的引用和链接
7. WHEN 天文数据不可用时 THEN THE System SHALL 使用科学合理的程序生成数据

### 需求 8：坐标系统和对齐

**用户故事：** 作为用户，我希望所有尺度的天体都在统一的坐标系统中正确对齐，以便理解它们的真实空间关系。

#### 验收标准

1. THE System SHALL 使用统一的坐标系统（基于银道坐标系）
2. WHEN 显示不同尺度时 THEN THE System SHALL 保持坐标系的一致性
3. THE System SHALL 正确转换赤道坐标系到银道坐标系
4. THE System SHALL 正确转换超银道坐标系到银道坐标系
5. WHEN 显示本星系群时 THEN THE System SHALL 正确显示银河系和仙女座星系的相对位置
6. THE System SHALL 考虑宇宙学红移对距离的影响
7. THE CoordinateSystem SHALL 支持不同的宇宙学参数（H0、Ωm、ΩΛ）

### 需求 9：配置和扩展性

**用户故事：** 作为开发者，我希望系统具有良好的配置性和扩展性，以便未来添加新的宇宙尺度或修改参数。

#### 验收标准

1. THE System SHALL 使用配置文件定义所有尺度的视图参数
2. THE System SHALL 支持动态加载新的宇宙尺度渲染器
3. WHEN 添加新尺度时 THEN THE System SHALL 不需要修改核心 SceneManager 代码
4. THE System SHALL 使用插件架构支持自定义渲染器
5. THE System SHALL 提供清晰的 API 用于注册新的尺度视图
6. THE System SHALL 支持运行时修改视图切换阈值
7. THE System SHALL 提供配置验证以防止无效参数



### 需求 10：用户交互和信息显示

**用户故事：** 作为用户，我希望能够与宇宙中的天体交互并查看详细信息，以便深入了解特定的星系或结构。

#### 验收标准

1. WHEN 用户点击星系时 THEN THE System SHALL 显示该星系的详细信息（名称、类型、距离、红移）
2. THE System SHALL 支持搜索功能以快速定位特定星系或结构
3. WHEN 用户搜索星系时 THEN THE System SHALL 自动调整相机到合适的视角
4. THE System SHALL 显示当前视图的尺度信息（例如"本星系群视图"）
5. THE System SHALL 提供尺度指示器显示当前相机距离
6. WHEN 用户悬停在星系上时 THEN THE System SHALL 显示简要信息工具提示
7. THE System SHALL 支持标记和保存感兴趣的位置

### 需求 11：视觉质量和真实感

**用户故事：** 作为用户，我希望看到视觉上吸引人且科学准确的宇宙表现，以便获得沉浸式的体验。

#### 验收标准

1. WHEN 显示螺旋星系时 THEN THE System SHALL 使用适当的纹理和形态模型
2. WHEN 显示椭圆星系时 THEN THE System SHALL 使用不同的视觉表现
3. THE System SHALL 根据星系的红移调整其颜色（红移效应）
4. THE System SHALL 使用适当的光晕效果表现星系的亮度
5. WHEN 显示星系纤维时 THEN THE System SHALL 使用半透明的体积渲染
6. THE System SHALL 使用适当的颜色方案区分不同类型的结构
7. THE System SHALL 支持用户调整视觉效果的强度（亮度、对比度等）

### 需求 12：数据加载和缓存

**用户故事：** 作为用户，我希望系统能够高效地加载和管理大量天文数据，以便获得流畅的体验。

#### 验收标准

1. THE System SHALL 使用渐进式加载策略加载天文数据
2. WHEN 用户首次访问时 THEN THE System SHALL 优先加载当前视图所需的数据
3. THE System SHALL 在后台预加载相邻尺度的数据
4. THE System SHALL 使用浏览器缓存存储已加载的数据
5. WHEN 数据加载失败时 THEN THE System SHALL 显示错误信息并提供重试选项
6. THE System SHALL 显示数据加载进度指示器
7. WHEN 内存不足时 THEN THE System SHALL 释放最远尺度的缓存数据

## 技术约束

### 性能约束

1. 系统必须在现代浏览器（Chrome、Firefox、Safari、Edge）上运行
2. 系统必须支持 WebGL 1.0 作为最低要求，推荐 WebGL 2.0
3. 在显示银河系尺度时，帧率必须保持在 60 FPS
4. 在显示可观测宇宙尺度时，帧率必须保持在 30 FPS 以上
5. 初始加载时间不应超过 5 秒
6. 内存使用不应超过 2GB（在桌面浏览器上）

### 兼容性约束

1. 系统必须与现有的 Three.js 场景管理架构兼容
2. 系统必须保持现有的相机控制系统不变
3. 系统必须与现有的太阳系、近邻恒星和银河系渲染器共存
4. 系统必须使用 TypeScript 编写以保持代码一致性
5. 系统必须遵循现有的项目代码风格和架构模式

### 数据约束

1. 星系数据文件大小不应超过 50MB（压缩后）
2. 系统必须支持 JSON 和二进制格式的数据文件
3. 数据必须包含必要的元数据（来源、版本、更新日期）
4. 系统必须能够处理数据中的缺失值和不确定性



## 数据来源

### 本星系群数据

1. **NASA/IPAC Extragalactic Database (NED)**
   - URL: https://ned.ipac.caltech.edu/
   - 内容：本星系群主要星系的位置、距离、类型
   - 格式：可通过 API 或批量下载获取 JSON/CSV 数据

2. **HyperLeda 数据库**
   - URL: http://leda.univ-lyon1.fr/
   - 内容：星系的物理参数、形态分类
   - 格式：SQL 查询或批量下载

3. **Local Group Galaxy Catalog**
   - 来源：McConnachie (2012) 综述论文
   - 内容：本星系群约 80 个成员星系的完整列表
   - 引用：McConnachie, A. W. 2012, AJ, 144, 4

### 室女座超星系团数据

1. **2MASS Redshift Survey (2MRS)**
   - URL: https://www.cfa.harvard.edu/~dfabricant/huchra/2mass/
   - 内容：近邻宇宙的星系红移和位置
   - 格式：FITS 或 ASCII 表格

2. **Virgo Cluster Catalog (VCC)**
   - 来源：Binggeli et al. (1985)
   - 内容：室女座星系团的详细成员列表
   - 引用：Binggeli, B., Sandage, A., & Tammann, G. A. 1985, AJ, 90, 1681

3. **Cosmicflows-3 数据集**
   - URL: http://edd.ifa.hawaii.edu/CF3calculator/
   - 内容：星系的距离和本动速度
   - 格式：在线计算器或数据表下载

### 拉尼亚凯亚超星系团数据

1. **Cosmicflows-3 Distance-Velocity Calculator**
   - URL: http://edd.ifa.hawaii.edu/CF3calculator/
   - 内容：拉尼亚凯亚超星系团的引力流场数据
   - 引用：Tully et al. (2014), Nature, 513, 71

2. **Cosmicflows-4 数据集**
   - URL: http://edd.ifa.hawaii.edu/
   - 内容：更新的星系距离和速度场数据
   - 格式：FITS 表格

### 可观测宇宙大尺度结构数据

1. **Millennium Simulation**
   - URL: https://wwwmpa.mpa-garching.mpg.de/galform/virgo/millennium/
   - 内容：宇宙大尺度结构的 N-body 模拟数据
   - 格式：HDF5 或 SQL 数据库查询

2. **Illustris Simulation**
   - URL: https://www.illustris-project.org/
   - 内容：包含星系形成的宇宙学模拟
   - 格式：HDF5 文件

3. **Sloan Digital Sky Survey (SDSS)**
   - URL: https://www.sdss.org/
   - 内容：大规模星系巡天数据
   - 格式：FITS 或 SQL 查询

4. **2dF Galaxy Redshift Survey**
   - URL: http://www.2dfgrs.net/
   - 内容：星系红移和大尺度结构
   - 格式：FITS 表格

### 数据处理建议

1. **数据转换**：将天文数据格式（FITS、HDF5）转换为 Web 友好的格式（JSON、二进制）
2. **数据简化**：对于大尺度结构，使用采样或聚类算法减少数据点数量
3. **数据验证**：确保坐标系转换的正确性，验证距离和位置的一致性
4. **数据更新**：定期检查数据源的更新，保持数据的时效性

### 备用方案

如果无法获取真实数据，可以使用以下程序生成方法：

1. **本星系群**：使用已知的主要星系手动创建数据集
2. **超星系团**：使用分层聚类算法生成符合观测统计特性的星系分布
3. **大尺度结构**：使用 Zeldovich 近似或简化的 N-body 模拟生成纤维状结构
4. **参数化模型**：使用宇宙学参数（功率谱、相关函数）生成统计上正确的分布

## 参考文献

1. McConnachie, A. W. (2012). "The Observed Properties of Dwarf Galaxies in and around the Local Group". AJ, 144, 4
2. Tully, R. B., et al. (2014). "The Laniakea supercluster of galaxies". Nature, 513, 71-73
3. Binggeli, B., Sandage, A., & Tammann, G. A. (1985). "The Virgo cluster of galaxies". AJ, 90, 1681
4. Springel, V., et al. (2005). "Simulations of the formation, evolution and clustering of galaxies and quasars". Nature, 435, 629-636

