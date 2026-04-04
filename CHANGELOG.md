# Changelog

本文档记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2025-01

### Added

- **多尺度宇宙可视化**：新增 6 个宇宙尺度渲染器
  - 本星系群渲染器（LocalGroupRenderer）
  - 近邻星系群渲染器（NearbyGroupsRenderer）
  - 室女座超星系团渲染器（VirgoSuperclusterRenderer）
  - 拉尼亚凯亚超星系团渲染器（LaniakeaSuperclusterRenderer）
  - 可观测宇宙渲染器
- **性能优化系统**：
  - LODManager - 4级细节层次管理
  - OptimizedParticleSystem - 自定义着色器粒子系统
  - FrustumCullingOptimizer - 视锥剔除
  - MemoryManager - 内存管理
  - ProceduralGenerator - NFW分布生成器
- **坐标转换工具**：CoordinateConverter 支持赤道/银道/超银道坐标转换
- **宇宙数据加载器**：UniverseDataLoader 支持 4 种数据格式
- **尺度指示器**：UniverseScaleIndicator 组件显示当前宇宙尺度
- **测试覆盖**：添加 Jest 测试框架和单元测试

### Changed

- **项目重命名**：原名 SoMap，现更名为 CXIC
  - 官方名称：CXIC — CXIN Integrated Cosmos（CXIC 宇宙集成系统）
  - 重命名原因：项目范围已从太阳系扩展到多尺度宇宙可视化
- **Cesium 集成优化**：
  - 改进 CameraSynchronizer 相机同步
  - 优化 CesiumAdapter 适配器
  - 新增 CesiumEarthExtension 地球扩展
- **文档重构**：
  - 更新 README.md 项目介绍
  - 更新 ABOUT.md 功能说明
  - 新增多个技术文档

### Fixed

- 修复 Cesium 画布叠加层问题
- 修复坐标系统对齐问题
- 修复天空盒旋转问题
- 修复 Laniakea 数据显示问题

## [1.0.0] - 2025-11

### Added

- **地球可视化**：
  - Cesium 瓦片化地球渲染
  - 多源地图切换（Bing Maps、OpenStreetMap、ArcGIS）
  - 地形高程数据
  - 距离自适应切换
- **太阳系模拟**：
  - NASA JPL DE440 星历数据集成
  - 8大行星 + 19颗主要卫星
  - 时间控制系统
  - 轨道可视化
- **人造卫星追踪**：
  - CelesTrak TLE 数据
  - SGP4 轨道模型
  - 卫星搜索功能
  - 轨道显示
- **近邻恒星**：
  - ESA Gaia DR3 数据
  - 恒星渲染
- **银河系可视化**：
  - 银河系结构渲染
  - 银河系坐标轴

### Technical

- Next.js 16 + React 19 前端框架
- Three.js 0.170 3D 渲染
- Cesium 1.139 地球可视化
- TypeScript 5 类型支持
- Tailwind CSS 4 样式
- Zustand 5 状态管理

---

## 版本规划

### [1.2.0] - 计划中

- 星系搜索和导航功能
- 书签和导览系统
- 移动端性能优化
- 更多地图影像源

### [2.0.0] - 未来

- VR/AR 支持
- 多语言支持
- 用户账户系统
- 数据导出功能