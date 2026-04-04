# CXIC — CXIN Integrated Cosmos（CXIC 宇宙集成系统）

**交互式太阳系与宇宙可视化应用**

## 项目简介

CXIC 是一个基于 Web 的多尺度宇宙可视化与天文数据集成系统，使用 Three.js、Cesium 和 Next.js 构建。通过真实的天文数据和精确的轨道计算，为您呈现从地球表面到可观测宇宙边缘的动态模拟。

项目始于 2025 年 11 月，由一名高二学生利用假期时间开发维护。

## 主要功能

### 地球可视化（Cesium 集成）

- 高精度瓦片地球渲染
- 多源地图切换（Bing Maps、OpenStreetMap、ArcGIS、天地图等）
- 真实地形高程数据
- 近距 Cesium 瓦片，远距 Three.js 球体，平滑过渡

### 太阳系模拟

- 基于 NASA JPL DE440 星历数据的高精度星历系统
- 27个天体精确位置计算（8大行星 + 19颗主要卫星）
- 2009-2109年高精度时间范围
- 时间控制：快进、倒退、暂停

### 人造卫星追踪

- 基于 CelesTrak TLE 数据和 SGP4 轨道模型
- 卫星搜索和浏览
- 轨道可视化和运动轨迹
- 卫星参数和轨道要素详情

### 多尺度宇宙可视化

通过缩放探索 9 个宇宙尺度：

1. **地球** - Cesium 瓦片化地球
2. **太阳系** - 行星和卫星精确轨道
3. **近邻恒星** - ESA Gaia DR3 恒星数据
4. **银河系** - 银河系结构可视化
5. **本星系群** - 80个星系
6. **近邻星系群** - Karachentsev 目录
7. **室女座超星系团** - 2MRS 巡天数据
8. **拉尼亚凯亚超星系团** - Cosmicflows-3 数据
9. **可观测宇宙** - 宇宙网络结构

### 视觉特性

- 高质量行星纹理
- 银河系背景恒星渲染
- 交互式相机控制
- 尺度间平滑过渡
- 4级 LOD 系统

## 操作指南

- **鼠标拖拽**：旋转视角
- **滚轮**：缩放视图
- **点击天体**：聚焦目标
- **时间控制**：调整模拟速度和日期
- **地图切换**：切换地球影像源
- **地球锁定**：锁定相机到地球中心

## 技术栈

- Next.js 16 / React 19
- Three.js 0.170 + Cesium 1.139
- TypeScript 5
- Tailwind CSS 4
- Zustand 5
- satellite.js (SGP4)

## 数据来源

### 星历数据

- NASA JPL DE440（行星）
- NASA JPL JUP365（木星卫星）
- NASA JPL SAT441（土星卫星）
- NASA JPL NEP097（海王星卫星）

精度：行星 <0.1°，主要卫星 <0.01°

### 宇宙数据

- ESA Gaia Mission (DR3) - 恒星
- McConnachie (2012) - 本星系群
- Karachentsev et al. (2013) - 近邻星系
- 2MRS Survey - 室女座超星系团
- Cosmicflows-3 - 拉尼亚凯亚

### 卫星数据

- CelesTrak TLE 轨道数据
- UCS 卫星数据库

### 视觉资源

- 行星纹理：Solar System Scope
- 银河系图像：ESA/Gaia

## 免责声明

本应用仅供教育和娱乐目的。

**天文数据精度**：高精度时间范围内使用 NASA JPL 星历数据，超出范围自动切换解析模型。如需科学研究用途，请参考 NASA JPL HORIZONS 等专业系统。

**卫星轨道数据**：基于 TLE 和 SGP4 模型计算，受大气阻力等因素影响，仅供参考。

**责任声明**：本软件按"原样"提供，不附带任何保证。作者不对任何损害承担责任。

## 许可证

Apache License 2.0

## 联系方式

- GitHub: [@ChenXin-2009](https://github.com/ChenXin-2009)
- 项目地址: [https://github.com/ChenXin-2009/somap](https://github.com/ChenXin-2009/somap)

---

*项目由个人维护，2025年11月启动，当时在读高二，仅假期有时间开发*