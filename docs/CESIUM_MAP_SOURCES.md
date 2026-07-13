# Cesium 地图源配置指南

## 概述

OPIC 支持多种地球表面影像源，包括免费的 ESRI、OpenStreetMap、CartoDB 以及需要 API 密钥的 Bing Maps 和 NASA GIBS 实时卫星图层。

## 默认地图源

**当前默认：ESRI World Imagery**

- **优点**：免费、稳定、高分辨率（最高 19 级缩放）
- **无需配置**：开箱即用
- **推荐使用**：适合大多数用户

## 可用地图源

### 通用地图源

| 地图源 | 说明 | 是否免费 | 最高缩放级别 |
|--------|------|----------|--------------|
| **ESRI World Imagery** | 高分辨率卫星影像 |  是 | 19 |
| **Bing Maps** | Microsoft 卫星影像 |  需要 Cesium Ion Token | 19 |
| **OpenStreetMap** | 开源街道地图 |  是 | 19 |
| **ESRI World Street** | 详细街道和地名 |  是 | 19 |
| **CartoDB Dark** | 深色背景地图 |  是 | 19 |
| **ESRI National Geographic** | 国家地理风格 |  是 | 16 |

### NASA GIBS 实时卫星图层

| 图层 | 说明 | 更新频率 | 最高缩放级别 |
|------|------|----------|--------------|
| **MODIS Terra 真彩色** | NASA 每日卫星真彩色图像 | 每日 | 9 |
| **MODIS Aqua 真彩色** | Aqua 卫星每日图像 | 每日 | 9 |
| **VIIRS 夜间灯光** | 全球夜间城市灯光（2016年） | 静态 | 8 |
| **MODIS 火点检测** | 每日火灾热点检测 | 每日 | 9 |
| **VIIRS 昼夜波段** | 低光成像（城市灯光、极光） | 每日 | 8 |
| **MODIS 积雪覆盖** | 每日积雪范围 | 每日 | 8 |

## ESRI World Imagery 使用说明

### 是否需要 API Key？

**不需要！** ESRI World Imagery 通过 `server.arcgisonline.com` 提供的服务是**完全免费**的，无需注册或配置 API Key。

### 使用限制

根据 ESRI 官方文档（2011年公告，至今仍然有效）：

-  **免费使用**：商业和非商业用途均可
-  **高使用限额**：每年 5000 万次瓦片请求
-  **无需注册**：直接使用，无需账号
-  **稳定可靠**：ESRI 官方维护

**实际使用建议**：
- 对于大多数个人项目和中小型应用，5000万次/年的限额足够使用
- 如果是政府用户，限额更高（无限制）
- 开发和测试环境无限制

### Attribution 要求（必须遵守）

使用 ESRI 地图服务时，**必须**显示以下信息：

1. **Esri Attribution**：显示 "Powered by Esri" 文本
2. **Data Attribution**：显示数据来源信息

**好消息**：Cesium 会自动显示这些 attribution 信息，无需额外配置！

在 Cesium 中，attribution 会自动显示在地图右下角，包括：
- "Powered by Esri"
- 数据提供商信息（如 "Esri, Maxar, Earthstar Geographics"）

### 与 Bing Maps 的对比

| 特性 | ESRI World Imagery | Bing Maps |
|------|-------------------|-----------|
| **是否免费** |  完全免费 |  需要 Cesium Ion Token |
| **需要 API Key** |  不需要 |  需要 |
| **使用限额** | 5000万次/年 | 5万次/月（免费计划） |
| **注册要求** |  无需注册 |  需要注册 Cesium Ion |
| **最高缩放级别** | 19 | 19 |
| **稳定性** |  非常稳定 |  依赖 Cesium Ion 服务 |

### 推荐使用场景

**ESRI World Imagery 适合**：
-  个人项目
-  开源项目
-  商业应用（中小规模）
-  教育和研究
-  政府应用

**如果需要更高限额**：
- 考虑联系 ESRI 获取企业许可
- 或使用自己托管的地图服务

### 为什么 Bing Maps 会加载失败？

Bing Maps 通过 **Cesium Ion** 服务提供，需要满足以下条件：

1. **有效的 Cesium Ion Access Token**
2. **Token 未超出使用限额**
3. **网络可以访问 Cesium Ion 服务**

如果出现 "Network error" 或加载失败，通常是因为：

-  未配置 Cesium Ion Token（使用默认 token 可能已失效）
-  Token 的免费限额已用尽
-  Token 权限不足（需要订阅付费计划）
-  网络连接问题

### 如何配置 Cesium Ion Token

如果您想使用 Bing Maps，需要配置 Cesium Ion Access Token：

#### 1. 获取 Cesium Ion Token

1. 访问 [Cesium Ion](https://ion.cesium.com/)
2. 注册/登录账号
3. 进入 [Access Tokens](https://ion.cesium.com/tokens) 页面
4. 创建新的 token 或使用默认 token
5. 复制 token 字符串

#### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件（如果不存在），添加：

```bash
# Cesium Ion Access Token
NEXT_PUBLIC_CESIUM_ION_TOKEN=your_token_here
```

#### 3. 重启开发服务器

```bash
npm run dev
```

### Cesium Ion 限额说明

**免费计划限制**：
- 每月 5 万次瓦片请求
- 适合个人开发和测试
- 超出限额后需要升级到付费计划

**付费计划**：
- 更高的请求限额
- 更多高级功能
- 详见 [Cesium Ion 定价](https://cesium.com/platform/cesium-ion/pricing/)

## 推荐配置

### 方案 1：使用免费地图源（推荐）

**无需任何配置**，直接使用：

-  **ESRI World Imagery**（默认）- 高分辨率卫星影像
-  **OpenStreetMap** - 街道地图
-  **CartoDB Dark** - 深色主题地图

### 方案 2：使用 Bing Maps

如果您需要 Bing Maps 的特定功能：

1. 配置 Cesium Ion Token（见上文）
2. 注意监控使用限额
3. 考虑升级到付费计划（如果需要）

### 方案 3：混合使用

- 日常使用：ESRI World Imagery（免费、稳定）
- 特殊需求：切换到 Bing Maps 或其他地图源

## 切换地图源

### 在 UI 中切换

1. 打开 Cesium 控制面板
2. 点击"地图源"选项卡
3. 选择想要的地图源
4. 等待加载完成

### 程序化切换

```typescript
import { IMAGERY_SOURCES } from '@/lib/cesium/imageryProviders';

// 获取 ESRI 地图源
const esriSource = IMAGERY_SOURCES.find(s => s.id === 'esri-world-imagery');

// 创建 provider
const provider = await esriSource.create();

// 应用到 Cesium
cesiumExtension.setImageryProvider(provider);
```

## 故障排除

### Bing Maps 加载失败

**错误信息**：` 加载失败: Bing Maps（Network error）`

**解决方案**：

1.  **推荐**：切换到 ESRI World Imagery（免费、稳定）
2. 配置有效的 Cesium Ion Token
3. 检查 token 限额是否用尽
4. 检查网络连接

### NASA GIBS 图层加载失败

**可能原因**：

- 数据延迟（通常需要 1-2 天处理时间）
- 网络连接问题
- GIBS 服务维护

**解决方案**：

- 等待数据更新
- 检查网络连接
- 切换到其他地图源

### 地图加载缓慢

**优化建议**：

1. 使用较低分辨率的地图源
2. 降低 `maximumScreenSpaceError` 值（在 `cesiumConfig` 中）
3. 减少 `maximumNumberOfLoadedTiles` 值
4. 检查网络带宽

## 相关文件

- `src/lib/cesium/imageryProviders.ts` - 地图源定义
- `src/components/cesium/CesiumMapSourcePanel.tsx` - 地图源切换 UI
- `src/lib/cesium/CesiumAdapter.ts` - Cesium 适配器
- `.env.example` - 环境变量示例

## 参考链接

> 从互联网下载的外部参考材料归档在 [`docs/references/`](./references/README.md)。

- [Cesium Ion 官网](https://cesium.com/platform/cesium-ion/)
- [Cesium Ion Token 管理](https://ion.cesium.com/tokens)
- [ESRI ArcGIS Online](https://www.arcgis.com/)
- [NASA GIBS](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs)
- [OpenStreetMap](https://www.openstreetmap.org/)

---

**最后更新**：2026-05-04
