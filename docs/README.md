# OPIC 项目文档索引

本目录包含 OPIC (Open Integrated Cosmos) 宇宙集成系统的核心技术文档。

## 项目演示

<div align="center">
  <img src="images/earth-to-universe-zoom.gif" alt="从地球到宇宙的缩放演示" width="700">
  <p><em>从地球表面到宇宙全景的无缝缩放</em></p>
</div>

<div align="center">
  <img src="images/satellite-tracking-demo.gif" alt="卫星追踪演示" width="700">
  <p><em>实时卫星轨道追踪与信息展示</em></p>
</div>

<div align="center">
  <img src="images/mod-manager-interface.gif" alt="MOD管理器界面" width="700">
  <p><em>MOD 管理器界面与示例模组</em></p>
</div>

## 项目概览

| 文档 | 说明 |
|------|------|
| [CODE_QUALITY.md](./CODE_QUALITY.md) | 代码质量标准和最佳实践 |
| [NAME_CHANGE_ANNOUNCEMENT.md](./NAME_CHANGE_ANNOUNCEMENT.md) | 项目更名公告（CXIC → OPIC） |

## 架构与设计

| 文档 | 说明 |
|------|------|
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | 集成指南 |
| [UNIVERSE_VISUALIZATION.md](./UNIVERSE_VISUALIZATION.md) | 宇宙可视化架构 |

## 功能实现

### 银河系渲染

| 文档 | 说明 |
|------|------|
| [GALAXY_COMPLETE_SUMMARY.md](./GALAXY_COMPLETE_SUMMARY.md) | 银河系渲染完整总结 |

### 宇宙尺度

| 文档 | 说明 |
|------|------|
| [LANIAKEA_DATA_LIMITATIONS.md](./LANIAKEA_DATA_LIMITATIONS.md) | Laniakea 超星系团数据限制 |

## MOD 系统文档

| 文档 | 说明 |
|------|------|
| [MOD_DEVELOPMENT_GUIDE.md](./MOD_DEVELOPMENT_GUIDE.md) | MOD 开发指南 |
| [MOD_MANAGEMENT_GUIDE.md](./MOD_MANAGEMENT_GUIDE.md) | MOD 管理指南 |
| [MOD_DYNAMIC_LOADING.md](./MOD_DYNAMIC_LOADING.md) | MOD 动态加载指南 |
| [MOD_AUTO_DISCOVERY.md](./MOD_AUTO_DISCOVERY.md) | MOD 自动发现机制 |
| [MOD_PACKAGE_FORMAT.md](./MOD_PACKAGE_FORMAT.md) | MOD 包格式规范 |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | MOD 架构迁移指南 |

---

## 项目架构

```
opic/
├── src/
│   ├── app/                 # Next.js 应用路由
│   ├── components/          # React 组件
│   │   ├── canvas/         # 3D 画布组件
│   │   ├── cesium/         # Cesium 相关组件
│   │   ├── satellite/      # 卫星追踪组件
│   │   ├── mod-manager/    # MOD 管理器 UI
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/             # Three.js 渲染器
│   │   ├── cesium/         # Cesium 集成
│   │   ├── astronomy/      # 天文计算
│   │   ├── satellite/      # 卫星追踪
│   │   ├── mod-manager/    # MOD 管理器核心
│   │   │   ├── core/       # 注册表、生命周期、依赖解析
│   │   │   ├── api/        # Time/Camera/Celestial/Satellite/Render API
│   │   │   ├── persistence/# 配置持久化
│   │   │   ├── error/      # 错误处理与隔离
│   │   │   └── performance/# 性能监控
│   │   ├── config/         # 配置文件
│   │   ├── data/           # 数据加载器
│   │   └── types/          # TypeScript 类型
│   └── stores/             # Zustand 状态管理
├── public/
│   ├── data/               # 天文数据
│   ├── textures/           # 纹理资源
│   └── cesium/             # Cesium 静态资源
└── docs/                   # 项目文档
```

## 核心模块

### 3D 渲染器 (src/lib/3d/)

| 模块 | 说明 |
|------|------|
| SceneManager.ts | 场景管理器 |
| Planet.ts | 行星渲染 |
| GalaxyRenderer.ts | 银河系渲染 |
| LocalGroupRenderer.ts | 本星系群渲染 |
| NearbyGroupsRenderer.ts | 近邻星系群渲染 |
| VirgoSuperclusterRenderer.ts | 室女座超星系团渲染 |
| LaniakeaSuperclusterRenderer.ts | 拉尼亚凯亚渲染 |
| LODManager.ts | 细节层次管理 |
| FrustumCullingOptimizer.ts | 视锥剔除 |
| MemoryManager.ts | 内存管理 |
| OptimizedParticleSystem.ts | 自定义着色器粒子系统 |

### Cesium 集成 (src/lib/cesium/)

| 模块 | 说明 |
|------|------|
| CesiumAdapter.ts | Cesium 适配器 |
| CameraSynchronizer.ts | 相机同步器 |
| CesiumEarthExtension.ts | 地球扩展 |
| CoordinateTransformer.ts | 坐标转换 |
| imageryProviders.ts | 影像源配置 |

### MOD 管理器 (src/lib/mod-manager/)

| 模块 | 说明 |
|------|------|
| core/ModRegistry.ts | MOD 注册表 |
| core/DependencyResolver.ts | 依赖解析器（拓扑排序 + 循环检测） |
| api/ | Time / Camera / Celestial / Satellite / Render API |
| persistence/ | localStorage 配置持久化 |
| error/ModError.ts | 错误类型与隔离策略 |
| error/ErrorBoundary.ts | 错误边界组件 |
| performance/ | 性能监控器 |

### 数据加载 (src/lib/data/)

| 模块 | 说明 |
|------|------|
| EphemerisLoader.ts | 星历数据加载 |
| UniverseDataLoader.ts | 宇宙数据加载（支持 4 种格式） |
| SatelliteDataLoader.ts | 卫星数据加载 |

---

## 数据来源

### 星历数据

- NASA JPL DE440（行星）
- NASA JPL JUP365（木星卫星）
- NASA JPL SAT441（土星卫星）
- NASA JPL NEP097（海王星卫星）

### 宇宙数据

- ESA Gaia DR3（恒星）
- McConnachie 2012（本星系群）
- Karachentsev 2013（近邻星系）
- 2MRS Survey（室女座超星系团）
- Cosmicflows-3（拉尼亚凯亚）

---

**文档维护规范**：

- 避免创建临时性文档
- 同一主题只保留一个权威文档
- 文档命名应清晰描述内容
- 定期审查和更新文档内容
