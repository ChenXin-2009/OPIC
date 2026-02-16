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

### 需求 2：近邻星系群可视化

**用户故事：** 作为用户，我希望能够看到本星系群附近的其他星系群，以便理解本地宇宙的结构。

#### 验收标准

1. WHEN 相机距离超过 1,000,000 光年 THEN THE System SHALL 开始显示近邻星系群
2. WHEN 相机距离达到 3,000,000 光年 THEN THE System SHALL 完全显示所有近邻星系群
3. THE System SHALL 显示以下主要近邻星系群：
   - 玉夫座星系群 (Sculptor Group, ~3.9 Mpc)
   - 半人马座A星系群 (Centaurus A Group, ~3.8 Mpc)
   - M81星系群 (M81 Group, ~3.6 Mpc)
   - M83星系群 (M83 Group, ~4.5 Mpc)
   - NGC 253星系群 (NGC 253 Group, ~3.5 Mpc)
   - IC 342星系群 (IC 342/Maffei Group, ~3.3 Mpc)
4. WHEN 显示近邻星系群时 THEN THE System SHALL 使用真实的三维位置数据
5. WHEN 显示近邻星系群时 THEN THE System SHALL 根据星系群的成员数量调整视觉大小
6. WHEN 相机距离小于 800,000 光年 THEN THE System SHALL 淡出近邻星系群的显示
7. WHEN 显示近邻星系群时 THEN THE System SHALL 同时淡出本星系群的详细显示

### 需求 3：室女座超星系团可视化

**用户故事：** 作为用户，我希望能够看到室女座超星系团的结构，以便理解本星系群在更大尺度上的位置。

#### 验收标准

1. WHEN 相机距离超过 5,000,000 光年 THEN THE System SHALL 开始显示室女座超星系团的星系群和星系团
2. WHEN 相机距离达到 15,000,000 光年 THEN THE System SHALL 完全显示室女座超星系团的结构
3. THE VirgoSupercluster SHALL 包含以下主要星系团和星系群：
   - 室女座星系团 (Virgo Cluster, ~16.5 Mpc, 中心)
   - 后发座星系团 (Coma Cluster, ~100 Mpc)
   - 狮子座星系团 (Leo Cluster, ~100 Mpc)
   - 大熊座星系团 (Ursa Major Cluster, ~60 Mpc)
   - 六分仪座星系团 (Sextans Cluster, ~90 Mpc)
   - 长蛇座星系团 (Hydra Cluster, ~50 Mpc)
   - 天炉座星系团 (Fornax Cluster, ~19 Mpc)
   - 波江座星系团 (Eridanus Cluster, ~23 Mpc)
4. WHEN 显示室女座超星系团时 THEN THE System SHALL 使用粒子系统渲染大量星系以保持性能
5. WHEN 显示室女座超星系团时 THEN THE System SHALL 根据星系密度调整粒子亮度
6. WHEN 相机距离小于 4,000,000 光年 THEN THE System SHALL 淡出室女座超星系团的显示
7. WHEN 显示室女座超星系团时 THEN THE System SHALL 同时淡出近邻星系群的详细显示

### 需求 4：拉尼亚凯亚超星系团可视化

**用户故事：** 作为用户，我希望能够看到拉尼亚凯亚超星系团的宏观结构，以便理解宇宙中物质的分布模式。

#### 验收标准

1. WHEN 相机距离超过 50,000,000 光年 THEN THE System SHALL 开始显示拉尼亚凯亚超星系团的结构
2. WHEN 相机距离达到 150,000,000 光年 THEN THE System SHALL 完全显示拉尼亚凯亚超星系团
3. THE LaniakeaSupercluster SHALL 包含以下主要超星系团和大型结构：
   - 室女座超星系团 (Virgo Supercluster, 中心区域)
   - 长蛇-半人马超星系团 (Hydra-Centaurus Supercluster, ~50 Mpc)
   - 孔雀-印第安超星系团 (Pavo-Indus Supercluster, ~60 Mpc)
   - 南部超星系团 (Southern Supercluster, ~65 Mpc)
4. WHEN 显示拉尼亚凯亚超星系团时 THEN THE System SHALL 使用高效的 LOD 系统以保持 60 FPS 性能
5. WHEN 显示拉尼亚凯亚超星系团时 THEN THE System SHALL 可选地可视化星系的运动方向（引力流）
6. WHEN 相机距离小于 40,000,000 光年 THEN THE System SHALL 淡出拉尼亚凯亚超星系团的显示
7. WHEN 显示拉尼亚凯亚超星系团时 THEN THE System SHALL 同时淡出室女座超星系团的详细显示

### 需求 5：近邻超星系团可视化

**用户故事：** 作为用户，我希望能够看到拉尼亚凯亚周围的其他超星系团，以便理解更大尺度的宇宙结构。

#### 验收标准

1. WHEN 相机距离超过 150,000,000 光年 THEN THE System SHALL 开始显示近邻超星系团
2. WHEN 相机距离达到 400,000,000 光年 THEN THE System SHALL 完全显示所有近邻超星系团
3. THE System SHALL 显示以下主要近邻超星系团：
   - 英仙-双鱼超星系团 (Perseus-Pisces Supercluster, ~70 Mpc)
   - 巨蛇座超星系团 (Serpens Supercluster, ~110 Mpc)
   - 武仙座超星系团 (Hercules Supercluster, ~150 Mpc)
   - 狮子座超星系团 (Leo Supercluster, ~120 Mpc)
   - 后发座超星系团 (Coma Supercluster, ~100 Mpc)
   - 天鹤座超星系团 (Grus Supercluster, ~120 Mpc)
   - 夏普利超星系团 (Shapley Supercluster, ~200 Mpc, 最大的近邻超星系团)
   - 巨引源区域 (Great Attractor region, ~70 Mpc)
4. WHEN 显示近邻超星系团时 THEN THE System SHALL 使用基于密度场的渲染技术
5. WHEN 显示近邻超星系团时 THEN THE System SHALL 根据超星系团的质量调整视觉大小和亮度
6. WHEN 相机距离小于 120,000,000 光年 THEN THE System SHALL 淡出近邻超星系团的显示
7. WHEN 显示近邻超星系团时 THEN THE System SHALL 同时淡出拉尼亚凯亚超星系团的详细显示

### 需求 6：可观测宇宙大尺度结构可视化

**用户故事：** 作为用户，我希望能够看到可观测宇宙的大尺度结构，以便理解宇宙的整体形态。

#### 验收标准

1. WHEN 相机距离超过 500,000,000 光年 THEN THE System SHALL 开始显示可观测宇宙的大尺度结构
2. WHEN 相机距离达到 1,500,000,000 光年 THEN THE System SHALL 完全显示可观测宇宙结构
3. THE ObservableUniverse SHALL 显示以下主要大尺度结构：
   - 斯隆长城 (Sloan Great Wall, ~1.37 Gpc, z~0.08)
   - CfA2长城 (CfA2 Great Wall, ~500 Mpc)
   - 武仙-北冕座长城 (Hercules-Corona Borealis Great Wall, ~3 Gpc, 最大已知结构)
   - 巨型空洞 (Giant Voids): 牧夫座空洞、本超星系团空洞等
   - 星系纤维网络 (Cosmic Web Filaments)
4. WHEN 显示可观测宇宙时 THEN THE System SHALL 使用基于密度场的渲染技术
5. WHEN 显示可观测宇宙时 THEN THE System SHALL 保持帧率不低于 30 FPS
6. THE ObservableUniverse SHALL 显示可观测宇宙的边界（约 465 亿光年半径）
7. WHEN 显示可观测宇宙时 THEN THE System SHALL 同时淡出近邻超星系团的详细显示
8. THE System SHALL 显示红移标记以指示不同距离的结构（z=0.1, 0.5, 1.0等）



### 需求 7：多尺度视图过渡系统

**用户故事：** 作为用户，我希望在不同宇宙尺度之间平滑过渡，以便获得连贯的视觉体验。

#### 验收标准

1. WHEN 相机距离变化时 THEN THE System SHALL 平滑地淡入淡出不同尺度的视图
2. THE System SHALL 使用配置化的距离阈值来控制视图切换
3. WHEN 两个尺度视图重叠显示时 THEN THE System SHALL 确保总透明度不超过 1.0
4. THE FadeTransition SHALL 在 1-3 秒内完成以保持流畅性
5. WHEN 视图切换时 THEN THE System SHALL 保持相机控制的响应性
6. THE System SHALL 支持用户配置淡入淡出速度
7. WHEN 快速缩放时 THEN THE System SHALL 跳过中间尺度以避免性能问题

### 需求 8：性能优化系统

**用户故事：** 作为用户，我希望即使在显示数百万个星系时也能保持流畅的性能，以便获得良好的交互体验。

#### 验收标准

1. THE System SHALL 使用 LOD 系统根据相机距离调整渲染质量
2. WHEN 显示大量星系时 THEN THE System SHALL 使用粒子系统而非单独的网格对象
3. THE System SHALL 实现视锥剔除以避免渲染不可见的对象
4. WHEN 帧率低于 30 FPS 时 THEN THE System SHALL 自动降低渲染质量
5. THE System SHALL 使用实例化渲染技术以减少绘制调用
6. THE System SHALL 支持 WebGL 2.0 以利用高级渲染特性
7. WHEN 内存使用超过阈值时 THEN THE System SHALL 释放不可见尺度的资源

### 需求 9：天文数据集成

**用户故事：** 作为用户，我希望看到基于真实天文数据的可视化，以便获得科学准确的宇宙视图。

#### 验收标准

1. THE System SHALL 使用真实的星系位置数据（来自 NED、HyperLeda 等数据库）
2. WHEN 显示星系时 THEN THE System SHALL 使用真实的星系类型和形态数据
3. THE System SHALL 使用真实的超星系团结构数据
4. WHEN 显示可观测宇宙时 THEN THE System SHALL 使用基于观测的大尺度结构模拟数据
5. THE AstronomicalData SHALL 包含星系的红移、距离和视向速度信息
6. THE System SHALL 提供数据来源的引用和链接
7. WHEN 天文数据不可用时 THEN THE System SHALL 使用科学合理的程序生成数据

### 需求 10：坐标系统和对齐

**用户故事：** 作为用户，我希望所有尺度的天体都在统一的坐标系统中正确对齐，以便理解它们的真实空间关系。

#### 验收标准

1. THE System SHALL 使用超银道坐标系（Supergalactic Coordinates）作为主要参考系
2. WHEN 显示不同尺度时 THEN THE System SHALL 保持坐标系的一致性
3. THE System SHALL 正确转换 J2000.0 赤道坐标系到超银道坐标系
4. THE System SHALL 正确转换银道坐标系到超银道坐标系
5. WHEN 显示本星系群时 THEN THE System SHALL 正确显示银河系和仙女座星系的相对位置（距离约 2.5 Mpc）
6. THE System SHALL 考虑宇宙学红移对距离的影响（使用 ΛCDM 模型）
7. THE CoordinateSystem SHALL 使用标准宇宙学参数（H₀=70 km/s/Mpc, Ωₘ=0.3, ΩΛ=0.7）
8. WHEN 转换坐标时 THEN THE System SHALL 使用经过验证的天文算法（与 Astropy 结果一致）
9. THE System SHALL 提供坐标系可视化辅助（显示超银道平面、银道平面等）
10. WHEN 显示远距离天体时 THEN THE System SHALL 正确应用光行时效应和宇宙学红移

### 需求 11：配置和扩展性

**用户故事：** 作为开发者，我希望系统具有良好的配置性和扩展性，以便未来添加新的宇宙尺度或修改参数。

#### 验收标准

1. THE System SHALL 使用配置文件定义所有尺度的视图参数
2. THE System SHALL 支持动态加载新的宇宙尺度渲染器
3. WHEN 添加新尺度时 THEN THE System SHALL 不需要修改核心 SceneManager 代码
4. THE System SHALL 使用插件架构支持自定义渲染器
5. THE System SHALL 提供清晰的 API 用于注册新的尺度视图
6. THE System SHALL 支持运行时修改视图切换阈值
7. THE System SHALL 提供配置验证以防止无效参数



### 需求 12：用户交互和信息显示

**用户故事：** 作为用户，我希望能够与宇宙中的天体交互并查看详细信息，以便深入了解特定的星系或结构。

#### 验收标准

1. WHEN 用户点击星系时 THEN THE System SHALL 显示该星系的详细信息（名称、类型、距离、红移）
2. THE System SHALL 支持搜索功能以快速定位特定星系或结构
3. WHEN 用户搜索星系时 THEN THE System SHALL 自动调整相机到合适的视角
4. THE System SHALL 显示当前视图的尺度信息（例如"本星系群视图"）
5. THE System SHALL 提供尺度指示器显示当前相机距离
6. WHEN 用户悬停在星系上时 THEN THE System SHALL 显示简要信息工具提示
7. THE System SHALL 支持标记和保存感兴趣的位置

### 需求 13：视觉质量和真实感

**用户故事：** 作为用户，我希望看到视觉上吸引人且科学准确的宇宙表现，以便获得沉浸式的体验。

#### 验收标准

1. WHEN 显示螺旋星系时 THEN THE System SHALL 使用适当的纹理和形态模型
2. WHEN 显示椭圆星系时 THEN THE System SHALL 使用不同的视觉表现
3. THE System SHALL 根据星系的红移调整其颜色（红移效应）
4. THE System SHALL 使用适当的光晕效果表现星系的亮度
5. WHEN 显示星系纤维时 THEN THE System SHALL 使用半透明的体积渲染
6. THE System SHALL 使用适当的颜色方案区分不同类型的结构
7. THE System SHALL 支持用户调整视觉效果的强度（亮度、对比度等）

### 需求 14：数据加载和缓存

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

1. 星系数据文件总大小不应超过 30KB（Gzip 压缩后）
2. 系统必须使用二进制格式（Float32Array）存储位置数据以最小化文件大小
3. 系统必须使用分层加载策略，按需加载不同尺度的数据
4. 数据必须包含必要的元数据（来源、版本、更新日期）
5. 系统必须能够处理数据中的缺失值和不确定性
6. 每个星系数据点不应超过 16 字节（位置、亮度、类型等）
7. 系统应结合真实数据和程序化生成以实现最佳视觉效果



## 数据来源

### 本星系群数据

1. **NASA/IPAC Extragalactic Database (NED)**
   - URL: https://ned.ipac.caltech.edu/
   - 内容：本星系群主要星系的位置、距离、类型
   - 格式：可通过 API 或批量下载获取 JSON/CSV 数据
   - 坐标系：J2000.0 赤道坐标系（可转换为银道坐标系）

2. **HyperLeda 数据库**
   - URL: http://leda.univ-lyon1.fr/
   - 内容：星系的物理参数、形态分类
   - 格式：SQL 查询或批量下载
   - 坐标系：J2000.0 赤道坐标系

3. **Local Group Galaxy Catalog**
   - 来源：McConnachie (2012) 综述论文
   - 内容：本星系群约 80 个成员星系的完整列表
   - 引用：McConnachie, A. W. 2012, AJ, 144, 4
   - 坐标系：银道坐标系

### 近邻星系群数据

1. **Nearby Galaxies Catalog (NBG)**
   - URL: https://ned.ipac.caltech.edu/
   - 内容：10 Mpc 内的所有星系群数据
   - 包含：玉夫座群、半人马座A群、M81群、M83群、NGC 253群、IC 342群
   - 坐标系：J2000.0 赤道坐标系

2. **Karachentsev et al. (2013) Catalog**
   - 来源：Updated Nearby Galaxy Catalog
   - 内容：11 Mpc 内的星系群完整列表
   - 引用：Karachentsev, I. D., et al. 2013, AJ, 145, 101
   - 坐标系：超银道坐标系（Supergalactic coordinates）

3. **Tully (2015) Catalog of Nearby Galaxies**
   - URL: http://edd.ifa.hawaii.edu/
   - 内容：近邻星系群的距离和速度数据
   - 引用：Tully, R. B., et al. 2015, AJ, 149, 171
   - 坐标系：超银道坐标系

### 室女座超星系团数据

1. **2MASS Redshift Survey (2MRS)**
   - URL: https://www.cfa.harvard.edu/~dfabricant/huchra/2mass/
   - 内容：近邻宇宙的星系红移和位置
   - 格式：FITS 或 ASCII 表格
   - 坐标系：J2000.0 赤道坐标系

2. **Virgo Cluster Catalog (VCC)**
   - 来源：Binggeli et al. (1985)
   - 内容：室女座星系团的详细成员列表
   - 引用：Binggeli, B., Sandage, A., & Tammann, G. A. 1985, AJ, 90, 1681
   - 坐标系：J2000.0 赤道坐标系

3. **Abell Cluster Catalog**
   - URL: https://ned.ipac.caltech.edu/
   - 内容：包含后发座、狮子座、大熊座等星系团
   - 引用：Abell, G. O., Corwin, H. G., & Olowin, R. P. 1989, ApJS, 70, 1
   - 坐标系：J2000.0 赤道坐标系

4. **Fornax and Eridanus Cluster Data**
   - 来源：Ferguson (1989), Willmer et al. (1989)
   - 内容：天炉座和波江座星系团成员
   - 坐标系：J2000.0 赤道坐标系

5. **Cosmicflows-3 数据集**
   - URL: http://edd.ifa.hawaii.edu/CF3calculator/
   - 内容：星系的距离和本动速度
   - 格式：在线计算器或数据表下载
   - 坐标系：超银道坐标系

### 拉尼亚凯亚超星系团数据

1. **Cosmicflows-3 Distance-Velocity Calculator**
   - URL: http://edd.ifa.hawaii.edu/CF3calculator/
   - 内容：拉尼亚凯亚超星系团的引力流场数据
   - 引用：Tully et al. (2014), Nature, 513, 71
   - 坐标系：超银道坐标系

2. **Cosmicflows-4 数据集**
   - URL: http://edd.ifa.hawaii.edu/
   - 内容：更新的星系距离和速度场数据
   - 格式：FITS 表格
   - 坐标系：超银道坐标系

3. **Hydra-Centaurus Supercluster Data**
   - 来源：Lucey et al. (1983), da Costa et al. (1987)
   - 内容：长蛇-半人马超星系团结构
   - 坐标系：超银道坐标系

4. **Pavo-Indus Supercluster Data**
   - 来源：Kraan-Korteweg et al. (2017)
   - 内容：孔雀-印第安超星系团成员
   - 坐标系：超银道坐标系

### 近邻超星系团数据

1. **Perseus-Pisces Supercluster**
   - 来源：Giovanelli & Haynes (1985)
   - URL: https://ned.ipac.caltech.edu/
   - 内容：英仙-双鱼超星系团结构
   - 坐标系：J2000.0 赤道坐标系

2. **Shapley Supercluster Catalog**
   - 来源：Proust et al. (2006), Bardelli et al. (2000)
   - 内容：夏普利超星系团（最大的近邻超星系团）
   - 引用：Proust et al. 2006, A&A, 447, 133
   - 坐标系：J2000.0 赤道坐标系

3. **Hercules Supercluster Data**
   - 来源：Abell Cluster Catalog
   - 内容：武仙座超星系团成员星系团
   - 坐标系：J2000.0 赤道坐标系

4. **Coma Supercluster Data**
   - 来源：Gavazzi et al. (2010)
   - 内容：后发座超星系团详细结构
   - 引用：Gavazzi et al. 2010, A&A, 517, A73
   - 坐标系：J2000.0 赤道坐标系

5. **Great Attractor Region Data**
   - 来源：Kraan-Korteweg & Lahav (2000)
   - 内容：巨引源区域的星系分布
   - 引用：Kraan-Korteweg & Lahav 2000, A&ARv, 10, 211
   - 坐标系：超银道坐标系

6. **Leo and Serpens Supercluster Data**
   - 来源：de Vaucouleurs (1975), Einasto et al. (2001)
   - 内容：狮子座和巨蛇座超星系团
   - 坐标系：超银道坐标系

### 可观测宇宙大尺度结构数据

1. **Millennium Simulation**
   - URL: https://wwwmpa.mpa-garching.mpg.de/galform/virgo/millennium/
   - 内容：宇宙大尺度结构的 N-body 模拟数据
   - 格式：HDF5 或 SQL 数据库查询
   - 坐标系：共动坐标系（Comoving coordinates）

2. **Illustris Simulation**
   - URL: https://www.illustris-project.org/
   - 内容：包含星系形成的宇宙学模拟
   - 格式：HDF5 文件
   - 坐标系：共动坐标系

3. **Sloan Digital Sky Survey (SDSS)**
   - URL: https://www.sdss.org/
   - 内容：大规模星系巡天数据，包含斯隆长城
   - 格式：FITS 或 SQL 查询
   - 坐标系：J2000.0 赤道坐标系

4. **2dF Galaxy Redshift Survey**
   - URL: http://www.2dfgrs.net/
   - 内容：星系红移和大尺度结构
   - 格式：FITS 表格
   - 坐标系：J2000.0 赤道坐标系

5. **CfA Redshift Survey**
   - URL: https://www.cfa.harvard.edu/
   - 内容：CfA2长城等大尺度结构
   - 坐标系：J2000.0 赤道坐标系

6. **Hercules-Corona Borealis Great Wall Data**
   - 来源：Horvath et al. (2013, 2014)
   - 内容：已知最大宇宙结构的数据
   - 引用：Horvath et al. 2014, A&A, 561, L12
   - 坐标系：J2000.0 赤道坐标系

7. **Cosmic Voids Catalog**
   - 来源：Sutter et al. (2012), Pan et al. (2012)
   - 内容：宇宙空洞的位置和大小
   - 引用：Sutter et al. 2012, ApJ, 761, 44
   - 坐标系：共动坐标系

### 数据处理建议

1. **坐标系转换统一**
   - **目标坐标系**：使用超银道坐标系（Supergalactic Coordinates）作为主要参考系
   - **原因**：超银道坐标系以室女座超星系团的平面为基准，最适合显示本地宇宙结构
   - **转换流程**：
     - J2000.0 赤道坐标 → 银道坐标 → 超银道坐标
     - 使用标准天文库（如 Astropy）进行转换以确保精度
   - **验证**：通过已知星系（如仙女座星系）的位置验证转换正确性

2. **距离测量统一**
   - **近距离**（< 100 Mpc）：使用 Cosmicflows 数据的直接距离测量
   - **中距离**（100-500 Mpc）：使用红移-距离关系，考虑本动速度修正
   - **远距离**（> 500 Mpc）：使用宇宙学红移-距离关系
   - **宇宙学参数**：H₀ = 70 km/s/Mpc, Ωₘ = 0.3, ΩΛ = 0.7（标准 ΛCDM 模型）

3. **数据压缩策略（目标：压缩后 ~30KB）**

   **优化的分层数据文件结构**：
   ```
   local-group.bin          (~8 KB)     - 80 个星系，详细数据
   nearby-groups.bin        (~12 KB)    - 150 个主要星系
   virgo-supercluster.bin   (~20 KB)    - 300 个代表性星系
   laniakea.bin            (~15 KB)    - 200 个超星系团代表
   nearby-superclusters.bin (~15 KB)    - 200 个超星系团代表
   cosmic-web-params.bin   (~5 KB)     - 程序化生成参数
   ────────────────────────────────────
   小计（未压缩）：         ~75 KB
   
   应用 Gzip 压缩（压缩率 ~60%）：
   总计：                   ~30 KB
   ```

   **平衡的数据策略**：
   
   **真实数据 + 程序化增强**
   - **本星系群**（80个）：完整真实数据，包含名称、类型、颜色
   - **近邻星系群**（~150个）：每个星系群保留 10-20 个最亮的星系
   - **室女座超星系团**（~300个）：每个主要星系团保留代表性星系
   - **拉尼亚凯亚**（~200个）：主要超星系团的核心星系
   - **近邻超星系团**（~200个）：超星系团中心和最亮成员
   - **宇宙大尺度结构**：程序化生成参数 + 少量关键锚点

   **每个星系的数据结构**（二进制格式）：
   ```typescript
   // 本星系群（详细）- 16 字节/星系
   struct LocalGroupGalaxy {
     x: float32,           // 4 bytes - X 坐标（Mpc）
     y: float32,           // 4 bytes - Y 坐标（Mpc）
     z: float32,           // 4 bytes - Z 坐标（Mpc）
     brightness: uint8,    // 1 byte  - 相对亮度（0-255）
     type: uint8,          // 1 byte  - 星系类型
     nameIndex: uint8,     // 1 byte  - 名称索引（0-255）
     color: uint8,         // 1 byte  - 颜色索引
   }
   
   // 其他尺度（简化）- 12 字节/星系
   struct SimpleGalaxy {
     x: float32,           // 4 bytes
     y: float32,           // 4 bytes
     z: float32,           // 4 bytes
   }
   
   // 星系群/星系团元数据
   struct ClusterMetadata {
     centerX: float32,     // 4 bytes - 中心位置
     centerY: float32,     // 4 bytes
     centerZ: float32,     // 4 bytes
     radius: float32,      // 4 bytes - 半径（Mpc）
     memberCount: uint16,  // 2 bytes - 成员数量（用于程序化生成）
     richness: uint8,      // 1 byte  - 丰度等级
     nameIndex: uint8,     // 1 byte  - 名称索引
   }
   ```

   **文件大小详细估算**：
   ```
   本星系群：
     - 80 个星系 × 16 bytes = 1,280 bytes
     - 80 个名称（平均 15 字符）= 1,200 bytes
     - 小计：~2.5 KB
   
   近邻星系群：
     - 150 个星系 × 12 bytes = 1,800 bytes
     - 8 个星系群元数据 × 20 bytes = 160 bytes
     - 小计：~2 KB
   
   室女座超星系团：
     - 300 个星系 × 12 bytes = 3,600 bytes
     - 30 个星系团元数据 × 20 bytes = 600 bytes
     - 小计：~4.2 KB
   
   拉尼亚凯亚：
     - 200 个星系 × 12 bytes = 2,400 bytes
     - 15 个超星系团元数据 × 20 bytes = 300 bytes
     - 小计：~2.7 KB
   
   近邻超星系团：
     - 200 个星系 × 12 bytes = 2,400 bytes
     - 20 个超星系团元数据 × 20 bytes = 400 bytes
     - 小计：~2.8 KB
   
   宇宙大尺度结构：
     - 程序化生成参数：~1 KB
     - 关键锚点（50个）× 12 bytes = 600 bytes
     - 小计：~1.6 KB
   
   ────────────────────────────────────
   未压缩总计：~15.8 KB
   
   应用 Gzip 压缩（二进制数据压缩率 ~40%）：
   压缩后总计：~6.3 KB
   
   加上元数据、索引、字符串表等：
   最终总计：~10-15 KB
   ```

   **实际上我们有充足的空间！可以包含更多数据：**
   ```
   如果目标是 30KB 压缩后，未压缩可以达到 ~75KB
   
   可以增加到：
   - 本星系群：80 个（详细）
   - 近邻星系群：300 个
   - 室女座超星系团：600 个
   - 拉尼亚凯亚：400 个
   - 近邻超星系团：400 个
   - 宇宙大尺度结构：100 个锚点
   
   总计：~1,880 个真实星系数据点
   ```

4. **程序化生成策略**（基于真实数据增强）
   
   **智能填充算法**：
   ```typescript
   // 基于真实的星系团中心和成员，程序化生成更多星系
   function enhanceCluster(realGalaxies, clusterMetadata) {
     const enhanced = [...realGalaxies];
     
     // 根据 richness 参数决定生成数量
     const targetCount = clusterMetadata.memberCount;
     const needGenerate = targetCount - realGalaxies.length;
     
     for (let i = 0; i < needGenerate; i++) {
       // 使用 NFW 分布，但避开真实星系的位置
       const newGalaxy = generateGalaxyNearCluster(
         clusterMetadata.center,
         clusterMetadata.radius,
         realGalaxies // 避免重叠
       );
       enhanced.push(newGalaxy);
     }
     
     return enhanced;
   }
   ```

   **宇宙纤维生成**（基于锚点）：
   ```typescript
   // 使用真实的超星系团位置作为锚点，生成连接的纤维
   function generateFilaments(anchorPoints, params) {
     const filaments = [];
     
     // 在锚点之间生成纤维
     for (let i = 0; i < anchorPoints.length; i++) {
       for (let j = i + 1; j < anchorPoints.length; j++) {
         if (shouldConnect(anchorPoints[i], anchorPoints[j])) {
           const filament = generateFilamentBetween(
             anchorPoints[i],
             anchorPoints[j],
             params
           );
           filaments.push(...filament);
         }
       }
     }
     
     return filaments;
   }
   ```

5. **分层加载策略**
   - **初始加载**：仅加载本星系群数据（~3 KB 压缩）
   - **按需加载**：根据相机距离加载对应尺度的数据
   - **渐进增强**：先显示真实数据，再程序化生成填充
   - **缓存策略**：缓存生成的几何体，避免重复计算

5. **数据转换**
   - 将天文数据格式（FITS、HDF5）转换为优化的二进制格式
   - 只提取必要的位置信息，忽略详细的物理参数
   - 使用 Python 脚本进行批量转换和验证
   - 保留原始数据的元数据（来源、日期、坐标系）在单独的小型 JSON 文件中

6. **数据验证**
   - 确保坐标系转换的正确性
   - 验证主要星系（如仙女座星系）的位置准确性
   - 检查异常值

7. **数据更新**
   - 数据文件可以静态托管，无需频繁更新
   - 使用版本控制管理数据文件

### 坐标系转换公式

#### 赤道坐标 → 银道坐标
```
l = arctan2(sin(α - α_NGP), cos(α - α_NGP) * sin(δ_NGP) - tan(δ) * cos(δ_NGP))
b = arcsin(sin(δ) * sin(δ_NGP) + cos(δ) * cos(δ_NGP) * cos(α - α_NGP))

其中：
α_NGP = 192.859508° (北银极赤经)
δ_NGP = 27.128336° (北银极赤纬)
l_NCP = 122.932° (北天极银经)
```

#### 银道坐标 → 超银道坐标
```
SGL = arctan2(sin(l - l_0), cos(l - l_0) * sin(b_0) - tan(b) * cos(b_0))
SGB = arcsin(sin(b) * sin(b_0) + cos(b) * cos(b_0) * cos(l - l_0))

其中：
l_0 = 137.37° (超银道坐标系原点银经)
b_0 = 0° (超银道坐标系原点银纬)
```

#### 距离计算（考虑红移）
```
对于 z < 0.1:
d ≈ c * z / H₀

对于 z > 0.1:
d = (c / H₀) * ∫[0 to z] dz' / √(Ωₘ(1+z')³ + ΩΛ)

其中：
c = 299,792 km/s (光速)
H₀ = 70 km/s/Mpc (哈勃常数)
Ωₘ = 0.3 (物质密度参数)
ΩΛ = 0.7 (暗能量密度参数)
```

### 推荐方案：真实数据为主 + 程序化增强

**核心理念**：在 30KB 预算内尽可能多地包含真实数据，用程序化生成填充细节

**数据配额分配（压缩后 30KB = 未压缩 ~75KB）**：
```
1. 本星系群（80个星系）
   - 来源：McConnachie (2012) 目录
   - 数据：完整的位置、名称、类型、亮度
   - 未压缩：~2.5 KB
   - 压缩后：~1 KB

2. 近邻星系群（300个星系 + 8个星系群元数据）
   - 来源：NED 数据库、Karachentsev 目录
   - 数据：位置、亮度
   - 未压缩：~4 KB
   - 压缩后：~1.6 KB

3. 室女座超星系团（600个星系 + 30个星系团元数据）
   - 来源：Abell 目录、VCC、2MRS
   - 数据：位置、亮度
   - 未压缩：~8 KB
   - 压缩后：~3.2 KB

4. 拉尼亚凯亚超星系团（400个星系 + 15个超星系团元数据）
   - 来源：Cosmicflows-3、文献综述
   - 数据：位置
   - 未压缩：~5 KB
   - 压缩后：~2 KB

5. 近邻超星系团（400个星系 + 20个超星系团元数据）
   - 来源：文献综述、NED
   - 数据：位置
   - 未压缩：~5 KB
   - 压缩后：~2 KB

6. 宇宙大尺度结构（100个锚点 + 生成参数）
   - 来源：SDSS、2dF、统计模型
   - 数据：关键位置、程序化参数
   - 未压缩：~2 KB
   - 压缩后：~0.8 KB

7. 元数据、字符串表、索引
   - 星系名称、星系团名称
   - 未压缩：~3 KB
   - 压缩后：~1.2 KB

────────────────────────────────────
总计：
- 真实星系数据点：~1,880 个
- 未压缩：~29.5 KB
- 压缩后：~11.8 KB
- 剩余预算：~18 KB（可用于更多数据或保留）
```

**程序化增强算法**：

1. **星系团智能填充**：
   ```javascript
   // 基于真实星系和星系团元数据，生成视觉填充
   function enhanceCluster(realGalaxies, metadata) {
     const targetDensity = metadata.richness;
     const generated = [];
     
     // 在真实星系之间填充，保持密度分布
     for (let i = 0; i < targetDensity; i++) {
       const pos = nfwDistribution(metadata.center, metadata.radius);
       // 确保不与真实星系重叠
       if (!tooCloseToReal(pos, realGalaxies)) {
         generated.push(pos);
       }
     }
     
     return generated;
   }
   ```

2. **超星系团纤维连接**：
   ```javascript
   // 在真实的超星系团之间生成连接纤维
   function connectSuperclusters(superclusters) {
     const filaments = [];
     
     for (let i = 0; i < superclusters.length; i++) {
       for (let j = i + 1; j < superclusters.length; j++) {
         const dist = distance(superclusters[i], superclusters[j]);
         
         // 只连接相对较近的超星系团
         if (dist < 200) { // Mpc
           filaments.push(
             generateFilament(superclusters[i], superclusters[j])
           );
         }
       }
     }
     
     return filaments;
   }
   ```

3. **宇宙空洞识别**：
   ```javascript
   // 基于真实星系分布，识别并可视化空洞区域
   function identifyVoids(galaxies, gridSize) {
     const grid = createDensityGrid(galaxies, gridSize);
     const voids = [];
     
     // 找出低密度区域
     for (let cell of grid) {
       if (cell.density < threshold) {
         voids.push(cell);
       }
     }
     
     return voids;
   }
   ```

**数据质量保证**：
- 所有 1,880 个数据点都是真实的天文观测数据
- 程序化生成仅用于视觉增强，不影响科学准确性
- 真实数据覆盖所有主要结构
- 用户可以点击查看真实星系的详细信息

**优势**：
- ✅ 包含近 2000 个真实星系数据
- ✅ 覆盖从本星系群到可观测宇宙的所有尺度
- ✅ 文件大小仅 ~12-15 KB（压缩后）
- ✅ 加载速度极快（< 100ms）
- ✅ 科学准确性高
- ✅ 视觉效果丰富（程序化增强可显示数百万个点）
- ✅ 易于维护和更新

## 参考文献

### 本星系群和近邻星系群
1. McConnachie, A. W. (2012). "The Observed Properties of Dwarf Galaxies in and around the Local Group". AJ, 144, 4
2. Karachentsev, I. D., et al. (2013). "Updated Nearby Galaxy Catalog". AJ, 145, 101
3. Tully, R. B., et al. (2015). "Cosmicflows-2: The Data". AJ, 149, 171

### 室女座超星系团
4. Binggeli, B., Sandage, A., & Tammann, G. A. (1985). "The Virgo cluster of galaxies". AJ, 90, 1681
5. Abell, G. O., Corwin, H. G., & Olowin, R. P. (1989). "A Catalog of Rich Clusters of Galaxies". ApJS, 70, 1
6. Ferguson, H. C. (1989). "Population studies in groups and clusters of galaxies. II - A catalog of galaxies in the central 3.5 deg of the Fornax Cluster". AJ, 98, 367
7. Willmer, C. N. A., et al. (1989). "The Eridanus cluster of galaxies. I - The luminosity function". AJ, 98, 1531
8. Gavazzi, G., et al. (2010). "Hα surface photometry of galaxies in the Virgo cluster". A&A, 517, A73

### 拉尼亚凯亚超星系团
9. Tully, R. B., et al. (2014). "The Laniakea supercluster of galaxies". Nature, 513, 71-73
10. Lucey, J. R., et al. (1983). "The Hydra-Centaurus supercluster". MNRAS, 204, 33
11. da Costa, L. N., et al. (1987). "The Hydra-Centaurus supercluster of galaxies". ApJ, 313, 42
12. Kraan-Korteweg, R. C., et al. (2017). "Discovery of a supercluster in the Zone of Avoidance in Vela". MNRAS, 466, L29

### 近邻超星系团
13. Giovanelli, R., & Haynes, M. P. (1985). "A 21 CM survey of the Pisces-Perseus supercluster". AJ, 90, 2445
14. Proust, D., et al. (2006). "A catalogue of velocities in the central region of the Shapley supercluster". A&A, 447, 133
15. Bardelli, S., et al. (2000). "The ESO Slice Project galaxy redshift survey. V. Evidence for a D=300 Mpc structure in the Great Attractor region". MNRAS, 312, 540
16. Kraan-Korteweg, R. C., & Lahav, O. (2000). "Galaxies behind the Milky Way and the Great Attractor". A&ARv, 10, 211
17. de Vaucouleurs, G. (1975). "Nearby groups of galaxies". In Galaxies and the Universe, 557-599
18. Einasto, M., et al. (2001). "The supercluster-void network. I. The supercluster catalogue and large-scale distribution". AJ, 122, 2222

### 可观测宇宙大尺度结构
19. Springel, V., et al. (2005). "Simulations of the formation, evolution and clustering of galaxies and quasars". Nature, 435, 629-636
20. Horvath, I., et al. (2014). "New data support the existence of the Hercules-Corona Borealis Great Wall". A&A, 561, L12
21. Sutter, P. M., et al. (2012). "A public void catalog from the SDSS DR7 Galaxy Redshift Surveys based on the watershed transform". ApJ, 761, 44
22. Pan, D. C., et al. (2012). "Cosmic voids in Sloan Digital Sky Survey Data Release 7". MNRAS, 421, 926

### 坐标系和宇宙学
23. Lahav, O., et al. (2000). "The supergalactic plane revisited with the Optical Redshift Survey". MNRAS, 312, 166
24. Peebles, P. J. E. (1993). "Principles of Physical Cosmology". Princeton University Press
25. Hogg, D. W. (1999). "Distance measures in cosmology". arXiv:astro-ph/9905116

### 数据处理和可视化
26. Astropy Collaboration (2013). "Astropy: A community Python package for astronomy". A&A, 558, A33
27. Tully, R. B., et al. (2016). "Cosmicflows-3". AJ, 152, 50

