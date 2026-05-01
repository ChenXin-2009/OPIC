# OPIC — Open Integrated Cosmos（OPIC 开放宇宙集成系统）

<div align="center">
  <img src="public/LOGO/logolw.svg" alt="OPIC Logo" width="300">
</div>

**一个基于 Web 的多尺度宇宙可视化与天文数据集成系统**

> **注意**：本项目原名为 CXIC (CXIN Integrated Cosmos)。详见[名称变更公告](docs/NAME_CHANGE_ANNOUNCEMENT.md)。

[English](./README.md)

---

## 项目简介

OPIC 是一个使用 Three.js、Cesium 和 Next.js 构建的交互式宇宙可视化应用。通过真实的天文数据和精确的轨道计算，为您呈现从地球表面到可观测宇宙边缘的动态模拟。

项目正在向模块化插件架构（MOD Manager）演进，允许功能在运行时独立加载、配置和切换，无需重启应用。

### 演示效果

<div align="center">
  <img src="docs/images/earth-to-universe-zoom.gif" alt="从地球到宇宙的缩放演示" width="800">
  <p><em>从地球表面建筑到宇宙全景的无缝缩放体验</em></p>
</div>

## 主要功能

### 地球可视化（Cesium 集成）

- 高精度瓦片地球：基于 Cesium 的全球地形和影像瓦片渲染
- 多源地图切换：支持 Bing Maps、OpenStreetMap、ArcGIS、天地图等多种影像源
- 真实地球地形高程数据
- 距离自适应：近距使用 Cesium 瓦片，远距切换 Three.js 球体，平滑过渡
- Three.js 与 Cesium 相机状态实时同步

### 太阳系模拟

- 高精度星历系统：基于 NASA JPL DE440 星历数据
- 27 个天体：8 大行星 + 19 颗主要卫星的精确位置计算
- 时间控制：2009-2109 年高精度时间范围，支持快进和倒退
- 动态数据源：高精度星历 ↔ 解析模型自动切换

### 人造卫星追踪

- 实时追踪：基于 CelesTrak TLE 数据和 SGP4 轨道模型
- 卫星搜索：浏览和搜索在轨人造卫星
- 轨道可视化：显示卫星轨道路径和运动轨迹
- 详细信息：查看卫星参数、轨道要素和状态

<div align="center">
  <img src="docs/images/satellite-tracking-demo.gif" alt="卫星追踪演示" width="800">
  <p><em>实时卫星轨道追踪与信息展示</em></p>
</div>

### 多尺度宇宙可视化

通过缩放视图探索 9 个宇宙尺度层次：

| 尺度 | 距离范围 | 数据来源 |
|------|----------|----------|
| 地球 | 0 - 100,000 km | Cesium 瓦片 |
| 太阳系 | 0.1 - 100 AU | NASA JPL DE440 |
| 近邻恒星 | 0 - 100 光年 | ESA Gaia DR3 |
| 银河系 | 100 - 50,000 光年 | ESA Gaia |
| 本星系群 | 50k - 1M 光年 | McConnachie 2012 |
| 近邻星系群 | 1M - 10M 光年 | Karachentsev 2013 |
| 室女座超星系团 | 10M - 50M 光年 | 2MRS Survey |
| 拉尼亚凯亚超星系团 | 50M - 500M 光年 | Cosmicflows-3 |
| 可观测宇宙 | 500M+ 光年 | 宇宙网络结构 |

### MOD 管理器系统（开发中）

模块化插件架构，保持核心系统轻量的同时允许可选功能在运行时动态加载：

- 声明式 MOD 清单，支持语义化版本
- 完整生命周期管理：registered → loaded → enabled → disabled → unloaded
- 自动依赖解析，含循环依赖检测
- 版本化 API 层：Time、Camera、Celestial、Satellite、Render API
- 错误隔离——MOD 故障不影响核心系统
- 配置跨会话持久化

<div align="center">
  <img src="docs/images/mod-manager-interface.gif" alt="MOD管理器界面" width="800">
  <p><em>MOD 管理器界面与示例模组展示</em></p>
</div>

### 视觉特性

- 高质量行星纹理（Solar System Scope）
- 基于 ESA Gaia 数据的恒星渲染
- 交互式相机：自由旋转、缩放和天体聚焦
- 尺度间的无缝视觉切换
- 4 级细节层次，根据距离动态调整

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 16 / React 19 |
| 3D 渲染 | Three.js 0.170 + Cesium 1.139 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 轨道计算 | satellite.js (SGP4) |
| 数据压缩 | pako (gzip) |
| 测试 | Jest + fast-check |

## 快速开始

### 环境要求

- Node.js 20+
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 操作指南

| 操作 | 功能 |
|------|------|
| 鼠标拖拽 | 旋转视角 |
| 滚轮 | 缩放视图（探索不同宇宙尺度） |
| 点击行星/卫星 | 聚焦目标 |
| 时间控制 | 调整模拟速度和日期 |
| 地图切换 | 在地球视图切换不同影像源 |
| 地球锁定 | 锁定相机到地球中心 |

## 数据来源

### 星历数据

| 天体 | 数据源 | 时间范围 | 精度 |
|------|--------|----------|------|
| 地球、火星、月球 | NASA JPL DE440 | 2009-2109 | <0.1° |
| 其他行星 | NASA JPL DE440 | 2009-2039 | <0.1° |
| 木星卫星 | NASA JPL JUP365 | 2009-2039 | <0.01° |
| 土星卫星 | NASA JPL SAT441 | 2009-2039 | <0.01° |
| 海王星卫星 | NASA JPL NEP097 | 2009-2039 | <0.01° |

### 宇宙数据

- 恒星数据：ESA Gaia Mission (DR3)
- 本星系群：McConnachie (2012) Local Group Catalog
- 近邻星系群：Karachentsev et al. (2013)
- 室女座超星系团：2MRS Survey Data
- 拉尼亚凯亚超星系团：Cosmicflows-3 Dataset

### 卫星数据

- TLE 轨道数据：CelesTrak (NORAD)
- 卫星元数据：UCS (Union of Concerned Scientists) 卫星数据库

### 视觉资源

- 行星纹理：Solar System Scope
- 银河系图像：ESA/Gaia

## 项目结构

```
opic/
├── src/
│   ├── app/                    # Next.js 应用路由
│   ├── components/             # React 组件
│   │   ├── canvas/            # 3D 画布组件
│   │   ├── cesium/            # Cesium 相关组件
│   │   ├── satellite/         # 卫星追踪 UI
│   │   ├── mod-manager/       # MOD 管理器 UI（开发中）
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Three.js 渲染器
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   ├── LocalGroupRenderer.ts
│   │   │   ├── VirgoSuperclusterRenderer.ts
│   │   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   │   ├── LODManager.ts
│   │   │   └── ...
│   │   ├── cesium/            # Cesium 集成
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # 天文计算
│   │   ├── satellite/         # 卫星追踪（SGP4）
│   │   ├── mod-manager/       # MOD 管理器核心（开发中）
│   │   │   ├── core/          # 注册表、生命周期、依赖解析
│   │   │   ├── api/           # Time/Camera/Celestial/Satellite/Render API
│   │   │   ├── persistence/   # 配置持久化
│   │   │   ├── error/         # 错误处理与隔离
│   │   │   └── performance/   # 性能监控
│   │   ├── config/            # 配置文件
│   │   ├── data/              # 数据加载器
│   │   └── types/             # TypeScript 类型
│   └── stores/                # Zustand 状态管理
├── public/
│   ├── data/                  # 天文数据
│   │   ├── ephemeris/        # NASA JPL 星历数据
│   │   ├── gaia/             # Gaia 恒星数据
│   │   └── universe/         # 宇宙结构数据
│   ├── textures/              # 纹理资源
│   └── cesium/                # Cesium 静态资源
├── scripts/                   # 数据生成脚本
└── docs/                      # 项目文档
```

## 开发

```bash
# 运行测试
npm test

# 代码检查
npm run lint
npm run lint:fix

# 类型检查
npm run quality:check

# 测试覆盖率
npm run test:coverage
```

## 性能优化

- 4 级细节层次，根据距离动态调整
- 按需加载地球瓦片，自动淘汰远距离瓦片
- 近距 Cesium 瓦片，远距 Three.js 球体
- 自定义着色器粒子系统，支持百万级粒子
- 实例化渲染减少绘制调用
- 视锥剔除，只渲染可见对象
- 自动释放远距离资源
- Web Workers 非阻塞数据处理

## 免责声明

本应用仅供教育和娱乐目的使用。

**天文数据精度说明：**

在高精度时间范围内（2009-2109 年地球/火星/月球，2009-2039 年其他天体），使用 NASA JPL 星历数据，精度可达角秒级。超出此范围时，系统自动切换到解析模型，精度降低。

如需精确的天文数据用于科学研究或导航，请参考 NASA JPL HORIZONS 系统或其他专业天文机构的官方资料。

**卫星轨道数据说明：**

人造卫星轨道数据基于 TLE（Two-Line Element）和 SGP4 模型计算，精度受大气阻力、太阳辐射压等因素影响，仅供参考。

**责任声明：**

本软件按"原样"提供，不附带任何明示或暗示的保证。在任何情况下，作者或版权持有人均不对任何索赔、损害或其他责任承担责任。

本软件不适用于需要故障安全性能的环境。用户明确理解并同意，作者不对因在高风险活动中使用本软件而造成的任何损失或损害承担责任。

## 贡献指南

欢迎所有形式的贡献！我们欢迎人类开发者和 AI 助手的协作。

- 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与
- 提交 Issue 报告 Bug 或建议新功能
- 提交 Pull Request 贡献代码
- **欢迎 AI 贡献**：我们鼓励使用 AI 工具和代理辅助的贡献

## 许可证

本项目采用 Apache License 2.0 许可证。

主要特点：
- 允许商业使用、修改和分发
- 需保留版权和许可证声明
- 提供明确的专利授权
- 包含免责声明和责任限制

详见 [LICENSE](LICENSE) 文件。

## 联系方式

- **GitHub**: [@ChenXin-2009](https://github.com/ChenXin-2009)
- **项目地址**: [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)
- **网站**: [https://opic.cxin.tech](https://opic.cxin.tech)
