# CXIC 项目文档索引

本目录包含 CXIC 宇宙集成系统的核心技术文档。

## 项目概览

| 文档 | 说明 |
|------|------|
| [CODE_QUALITY.md](./CODE_QUALITY.md) | 代码质量标准和最佳实践 |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | 项目实现总结 |
| [PROJECT_CLEANUP_COMPLETE.md](./PROJECT_CLEANUP_COMPLETE.md) | 项目清理报告 |

## 架构与设计

| 文档 | 说明 |
|------|------|
| [COORDINATE_SYSTEM_ALIGNMENT.md](./COORDINATE_SYSTEM_ALIGNMENT.md) | 坐标系统对齐说明 |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | 集成指南 |
| [UNIVERSE_VISUALIZATION.md](./UNIVERSE_VISUALIZATION.md) | 宇宙可视化架构 |

## 功能实现

### 银河系渲染

| 文档 | 说明 |
|------|------|
| [GALAXY_AXES_GUIDE.md](./GALAXY_AXES_GUIDE.md) | 银河系坐标轴指南 |
| [GALAXY_COMPLETE_SUMMARY.md](./GALAXY_COMPLETE_SUMMARY.md) | 银河系渲染完整总结 |
| [GALAXY_ORIENTATION_CALCULATION.md](./GALAXY_ORIENTATION_CALCULATION.md) | 银河系方向计算 |

### 宇宙尺度

| 文档 | 说明 |
|------|------|
| [LANIAKEA_DATA_LIMITATIONS.md](./LANIAKEA_DATA_LIMITATIONS.md) | Laniakea 超星系团数据限制 |
| [LANIAKEA_FIX_SUMMARY_CN.md](./LANIAKEA_FIX_SUMMARY_CN.md) | Laniakea 修复总结 |

### 太阳系

| 文档 | 说明 |
|------|------|
| [JUPITER_MOONS_ACCURACY_ANALYSIS_CN.md](./JUPITER_MOONS_ACCURACY_ANALYSIS_CN.md) | 木星卫星精度分析 |
| [SUN_IMPLEMENTATION_SUMMARY.md](./SUN_IMPLEMENTATION_SUMMARY.md) | 太阳实现总结 |

### 视觉效果

| 文档 | 说明 |
|------|------|
| [SKYBOX_ROTATION_FINAL.md](./SKYBOX_ROTATION_FINAL.md) | 天空盒旋转方案 |
| [WEBP_CONVERSION_COMPLETE.md](./WEBP_CONVERSION_COMPLETE.md) | WebP 转换报告 |

## 性能优化

| 文档 | 说明 |
|------|------|
| [LOADING_OPTIMIZATION_SUMMARY.md](./LOADING_OPTIMIZATION_SUMMARY.md) | 加载优化总结 |

---

## 项目架构

```
cxic/
├── src/
│   ├── app/                 # Next.js 应用路由
│   ├── components/          # React 组件
│   │   ├── canvas/         # 3D 画布组件
│   │   ├── cesium/         # Cesium 相关组件
│   │   ├── satellite/      # 卫星追踪组件
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/             # Three.js 渲染器
│   │   ├── cesium/         # Cesium 集成
│   │   ├── astronomy/      # 天文计算
│   │   ├── satellite/      # 卫星追踪
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
| VirgoSuperclusterRenderer.ts | 室女座超星系团渲染 |
| LaniakeaSuperclusterRenderer.ts | 拉尼亚凯亚渲染 |
| LODManager.ts | 细节层次管理 |
| FrustumCullingOptimizer.ts | 视锥剔除 |

### Cesium 集成 (src/lib/cesium/)

| 模块 | 说明 |
|------|------|
| CesiumAdapter.ts | Cesium 适配器 |
| CameraSynchronizer.ts | 相机同步器 |
| CesiumEarthExtension.ts | 地球扩展 |
| CoordinateTransformer.ts | 坐标转换 |
| imageryProviders.ts | 影像源配置 |

### 数据加载 (src/lib/data/)

| 模块 | 说明 |
|------|------|
| EphemerisLoader.ts | 星历数据加载 |
| UniverseDataLoader.ts | 宇宙数据加载 |
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