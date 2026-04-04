# CXIC — CXIN Integrated Cosmos（CXIC 宇宙集成系统）

**一个基于 Web 的多尺度宇宙可视化与天文数据集成系统**

---

## 项目简介

CXIC 是一个基于 Web 的交互式太阳系和宇宙可视化应用，使用 Three.js、Cesium 和 Next.js 构建。通过真实的天文数据和精确的轨道计算，为您呈现从地球表面到可观测宇宙边缘的动态模拟。

项目始于 2025 年 11 月，由一名高二学生利用假期时间开发维护。

## 主要功能

### 地球可视化（Cesium 集成）

- **高精度瓦片地球**：基于 Cesium 的全球地形和影像瓦片渲染
- **多源地图切换**：支持 Bing Maps、OpenStreetMap、ArcGIS、天地图等多种影像源
- **地形渲染**：真实地球地形高程数据
- **距离自适应**：近距使用 Cesium 瓦片，远距切换 Three.js 球体，平滑过渡
- **相机同步**：Three.js 与 Cesium 相机状态实时同步

### 太阳系模拟

- **高精度星历系统**：基于 NASA JPL DE440 星历数据
- **27个天体**：8大行星 + 19颗主要卫星的精确位置计算
- **时间控制**：2009-2109年高精度时间范围，支持快进和倒退
- **动态数据源**：高精度星历 ↔ 解析模型自动切换

### 人造卫星追踪

- **实时追踪**：基于 CelesTrak TLE 数据和 SGP4 轨道模型
- **卫星搜索**：浏览和搜索在轨人造卫星
- **轨道可视化**：显示卫星轨道路径和运动轨迹
- **详细信息**：查看卫星参数、轨道要素和状态

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

### 视觉特性

- **真实纹理**：高质量行星纹理（Solar System Scope）
- **银河系背景**：基于 ESA Gaia 数据的恒星渲染
- **交互式相机**：自由旋转、缩放和天体聚焦
- **平滑过渡**：尺度间的无缝视觉切换
- **LOD 系统**：4级细节层次，根据距离动态调整

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

## 快速开始

### 环境要求

- Node.js 20+
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/ChenXin-2009/somap.git
cd cxic

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

## 项目结构

```
cxic/
├── src/
│   ├── app/                    # Next.js 应用路由
│   ├── components/             # React 组件
│   │   ├── canvas/            # 3D 画布组件
│   │   ├── cesium/            # Cesium 相关组件
│   │   ├── satellite/         # 卫星相关组件
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Three.js 渲染器
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   └── ...            # 宇宙尺度渲染器
│   │   ├── cesium/            # Cesium 集成
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # 天文计算
│   │   ├── satellite/         # 卫星追踪
│   │   ├── config/            # 配置文件
│   │   ├── data/              # 数据加载器
│   │   └── types/             # TypeScript 类型
│   └── stores/                # Zustand 状态管理
├── public/
│   ├── data/                  # 星历和宇宙数据
│   │   ├── ephemeris/        # NASA JPL 星历数据
│   │   ├── gaia/             # Gaia 恒星数据
│   │   └── universe/         # 宇宙结构数据
│   ├── textures/              # 纹理资源
│   └── cesium/                # Cesium 静态资源
├── scripts/                   # 数据生成脚本
└── docs/                      # 项目文档
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

- **LOD 系统**：4级细节层次，根据距离动态调整
- **Cesium 瓦片**：按需加载地球瓦片，自动淘汰远距离瓦片
- **距离自适应**：近距 Cesium 瓦片，远距 Three.js 球体
- **粒子系统**：自定义着色器，支持百万级粒子
- **实例化渲染**：减少绘制调用
- **视锥剔除**：只渲染可见对象
- **内存管理**：自动释放远距离资源
- **Web Workers**：非阻塞数据处理

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

- **恒星数据**：ESA Gaia Mission (DR3)
- **本星系群**：McConnachie (2012) Local Group Catalog
- **近邻星系群**：Karachentsev et al. (2013)
- **室女座超星系团**：2MRS Survey Data
- **拉尼亚凯亚超星系团**：Cosmicflows-3 Dataset

### 卫星数据

- **TLE 轨道数据**：CelesTrak (NORAD)
- **卫星元数据**：UCS (Union of Concerned Scientists) 卫星数据库

### 视觉资源

- **行星纹理**：Solar System Scope
- **银河系图像**：ESA/Gaia

## 免责声明

本应用仅供教育和娱乐目的使用。

**天文数据精度说明：**

在高精度时间范围内（2009-2109年地球/火星/月球，2009-2039年其他天体），使用 NASA JPL 星历数据，精度可达角秒级。超出此范围时，系统自动切换到解析模型，精度降低。

如需精确的天文数据用于科学研究或导航，请参考 NASA JPL HORIZONS 系统或其他专业天文机构的官方资料。

**卫星轨道数据说明：**

人造卫星轨道数据基于 TLE（Two-Line Element）和 SGP4 模型计算，精度受大气阻力、太阳辐射压等因素影响，仅供参考。

**责任声明：**

本软件按"原样"提供，不附带任何明示或暗示的保证。在任何情况下，作者或版权持有人均不对任何索赔、损害赔偿或其他责任负责。

本软件不适用于需要故障安全性能的环境。使用者明确理解并��意，作者对因在高风险活动中使用本软件而导致的任何损失或损害不承担任何责任。

## 贡献指南

我们欢迎所有形式的贡献！

- 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与
- 提交 Issue 报告 Bug 或建议新功能
- 提交 Pull Request 贡献代码

## 许可证

本项目采用 Apache License 2.0 许可证。

主要特性：
- 允许商业使用、修改和分发
- 要求保留版权和许可声明
- 提供明确的专利授权
- 免责声明和责任限制

详见 [LICENSE](LICENSE) 文件。

## 联系方式

- **GitHub**: [@ChenXin-2009](https://github.com/ChenXin-2009)
- **项目地址**: [https://github.com/ChenXin-2009/somap](https://github.com/ChenXin-2009/somap)

## 支持项目

如果这个项目对你有帮助，欢迎通过微信赞赏支持：

<div align="center">
  <img src="public/textures/wechat-donate.png" alt="微信赞赏码" width="200"/>
</div>

你的支持是项目持续更新的动力！

---

*项目由个人维护，2025年11月启动，当时在读高二，仅假期有时间开发*