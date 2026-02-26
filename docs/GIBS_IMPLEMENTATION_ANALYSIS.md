# NASA GIBS 地球瓦片完整实现分析文档

## 问题描述

**当前症状**: 远处出现黑条，近处消失 - 典型的 mipmap 或瓦片层级映射问题

---

## 1. 核心实现架构

### 文件结构
```
src/earth/
├── gibs-tiling-scheme.ts      # GIBS 自定义 TilingScheme（核心）
├── gibs-provider-factory.ts   # ImageryProvider 工厂
├── layer-manager.ts            # 图层管理器
├── earth-manager.ts            # 地球管理器
├── time-controller.ts          # 时间控制器
└── camera-controller.ts        # 相机控制器
```

---

## 2. GIBSGeographicTilingScheme 实现

### 文件: `src/earth/gibs-tiling-scheme.ts`

**继承关系**: `Cesium.GeographicTilingScheme`

**瓦片金字塔结构** (非标准 2^n):
```
Level 0: 2×1    (2 tiles wide, 1 tile high)
Level 1: 3×2
Level 2: 5×3
Level 3: 10×5
Level 4: 20×10
Level 5: 40×20
Level 6: 80×40
Level 7: 160×80
Level 8: 320×160
```

**重写的方法**:

1. **getNumberOfXTilesAtLevel(level)**
   ```typescript
   const counts = [2, 3, 5, 10, 20, 40, 80, 160, 320];
   return counts[Math.min(level, counts.length - 1)];
   ```

2. **getNumberOfYTilesAtLevel(level)**
   ```typescript
   const counts = [1, 2, 3, 5, 10, 20, 40, 80, 160];
   return counts[Math.min(level, counts.length - 1)];
   ```

3. **tileXYToRectangle(x, y, level)**
   - 计算瓦片的地理边界
   - 公式:
     ```
     xTileWidth = rectangle.width / xTiles
     west = x * xTileWidth + rectangle.west
     east = (x + 1) * xTileWidth + rectangle.west
     
     yTileHeight = rectangle.height / yTiles
     north = rectangle.north - y * yTileHeight
     south = rectangle.north - (y + 1) * yTileHeight
     ```

4. **positionToTileXY(position, level)**
   - 将地理位置转换为瓦片坐标
   - 公式:
     ```
     xTileCoordinate = floor((longitude - west) / xTileWidth)
     yTileCoordinate = floor((north - latitude) / yTileHeight)
     ```

**完整代码**:
```typescript
import * as Cesium from "cesium";

export class GIBSGeographicTilingScheme extends Cesium.GeographicTilingScheme {
  constructor() {
    super({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 1,
      rectangle: Cesium.Rectangle.MAX_VALUE,
    });
  }

  override getNumberOfXTilesAtLevel(level: number): number {
    const counts = [2, 3, 5, 10, 20, 40, 80, 160, 320];
    return counts[Math.min(level, counts.length - 1)];
  }

  override getNumberOfYTilesAtLevel(level: number): number {
    const counts = [1, 2, 3, 5, 10, 20, 40, 80, 160];
    return counts[Math.min(level, counts.length - 1)];
  }

  override tileXYToRectangle(
    x: number, y: number, level: number, result?: Cesium.Rectangle
  ): Cesium.Rectangle {
    const rectangle = this.rectangle;
    const xTiles = this.getNumberOfXTilesAtLevel(level);
    const yTiles = this.getNumberOfYTilesAtLevel(level);

    const xTileWidth = rectangle.width / xTiles;
    const west = x * xTileWidth + rectangle.west;
    const east = (x + 1) * xTileWidth + rectangle.west;

    const yTileHeight = rectangle.height / yTiles;
    const north = rectangle.north - y * yTileHeight;
    const south = rectangle.north - (y + 1) * yTileHeight;

    if (!result) {
      result = new Cesium.Rectangle(west, south, east, north);
    } else {
      result.west = west;
      result.south = south;
      result.east = east;
      result.north = north;
    }
    return result;
  }

  override positionToTileXY(
    position: Cesium.Cartographic, level: number, result?: Cesium.Cartesian2
  ): Cesium.Cartesian2 {
    const rectangle = this.rectangle;
    
    if (!Cesium.Rectangle.contains(rectangle, position)) {
      if (!result) return new Cesium.Cartesian2(0, 0);
      result.x = 0;
      result.y = 0;
      return result;
    }

    const xTiles = this.getNumberOfXTilesAtLevel(level);
    const yTiles = this.getNumberOfYTilesAtLevel(level);
    const xTileWidth = rectangle.width / xTiles;
    const yTileHeight = rectangle.height / yTiles;

    let xTileCoordinate = ((position.longitude - rectangle.west) / xTileWidth) | 0;
    if (xTileCoordinate >= xTiles) xTileCoordinate = xTiles - 1;
    if (xTileCoordinate < 0) xTileCoordinate = 0;

    let yTileCoordinate = ((rectangle.north - position.latitude) / yTileHeight) | 0;
    if (yTileCoordinate >= yTiles) yTileCoordinate = yTiles - 1;
    if (yTileCoordinate < 0) yTileCoordinate = 0;

    if (!result) return new Cesium.Cartesian2(xTileCoordinate, yTileCoordinate);
    result.x = xTileCoordinate;
    result.y = yTileCoordinate;
    return result;
  }
}
```

---

## 3. GIBSProviderFactory 实现

### 文件: `src/earth/gibs-provider-factory.ts`

**使用的 Provider**: `Cesium.UrlTemplateImageryProvider` (不是 WebMapTileServiceImageryProvider)

**URL 模板格式**:
```
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layerIdentifier}/default/{date}/250m/{z}/{y}/{x}.jpg
```

**URL 组成部分**:
- `epsg4326` - 坐标系统
- `best` - 服务质量
- `{layerIdentifier}` - 图层名称 (如 MODIS_Terra_CorrectedReflectance_TrueColor)
- `default` - 样式
- `{date}` - 日期 (YYYY-MM-DD 格式)
- `250m` - 瓦片矩阵集
- `{z}/{y}/{x}` - 瓦片坐标 (CesiumJS 标准格式)

**Provider 配置**:
```typescript
new Cesium.UrlTemplateImageryProvider({
  url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-02-17/250m/{z}/{y}/{x}.jpg",
  tilingScheme: new GIBSGeographicTilingScheme(),
  tileWidth: 512,
  tileHeight: 512,
  minimumLevel: 0,
  maximumLevel: 8,
  credit: new Cesium.Credit("NASA GIBS / EOSDIS"),
  tileDiscardPolicy: new Cesium.NeverTileDiscardPolicy(),
})
```

**图层预设**:
```typescript
MODIS_TERRA_TRUE_COLOR: {
  name: "MODIS_TERRA_TRUE_COLOR",
  displayName: "MODIS Terra 真彩色",
  layerIdentifier: "MODIS_Terra_CorrectedReflectance_TrueColor",
  tileMatrixSet: "250m",
  format: "image/jpeg",
  maxLevel: 8,
}
```

**完整代码**:
```typescript
import * as Cesium from "cesium";
import { GIBSGeographicTilingScheme } from "./gibs-tiling-scheme";

export interface GIBSLayerPreset {
  name: string;
  displayName: string;
  layerIdentifier: string;
  tileMatrixSet: string;
  format: "image/jpeg" | "image/png";
  maxLevel: number;
}

export const GIBS_LAYER_PRESETS: Record<string, GIBSLayerPreset> = {
  MODIS_TERRA_TRUE_COLOR: {
    name: "MODIS_TERRA_TRUE_COLOR",
    displayName: "MODIS Terra 真彩色",
    layerIdentifier: "MODIS_Terra_CorrectedReflectance_TrueColor",
    tileMatrixSet: "250m",
    format: "image/jpeg",
    maxLevel: 8,
  },
  // ... 其他预设
};

export class GIBSProviderFactory {
  static createProvider(config: GIBSProviderConfig): Cesium.UrlTemplateImageryProvider {
    const preset = typeof config.layer === "string" 
      ? GIBS_LAYER_PRESETS[config.layer] 
      : config.layer;

    const dateStr = this.formatDate(config.date);
    const extension = preset.format === "image/jpeg" ? "jpg" : "png";
    
    const url = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${preset.layerIdentifier}/default/${dateStr}/${preset.tileMatrixSet}/{z}/{y}/{x}.${extension}`;

    return new Cesium.UrlTemplateImageryProvider({
      url,
      tilingScheme: new GIBSGeographicTilingScheme(),
      tileWidth: config.tileSize || 512,
      tileHeight: config.tileSize || 512,
      minimumLevel: 0,
      maximumLevel: preset.maxLevel,
      credit: new Cesium.Credit("NASA GIBS / EOSDIS"),
      tileDiscardPolicy: new Cesium.NeverTileDiscardPolicy(),
    });
  }

  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
```

---

## 4. EarthManager 配置

### 文件: `src/earth/earth-manager.ts`

**Viewer 初始化配置**:
```typescript
new Cesium.Viewer(container, {
  baseLayerPicker: false,        // 禁用默认图层选择器
  imageryProvider: false,        // 禁用默认影像提供者
  timeline: false,
  animation: false,
  fullscreenButton: true,
  geocoder: false,
  homeButton: true,
  sceneModePicker: false,
  navigationHelpButton: false,
  requestRenderMode: true,       // 按需渲染模式
  maximumRenderTimeChange: Infinity,
  targetFrameRate: 30,
})
```

**性能配置**:
```typescript
const PERFORMANCE_PRESETS = {
  high: {
    maximumScreenSpaceError: 2,
    targetFrameRate: 60,
  },
  balanced: {
    maximumScreenSpaceError: 3,
    targetFrameRate: 30,
  },
  low: {
    maximumScreenSpaceError: 4,
    targetFrameRate: 30,
  },
};
```

**初始相机位置**:
```typescript
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
});
```

---

## 5. 时间控制器配置

### 文件: `src/earth/time-controller.ts`

**日期常量**:
```typescript
export const DATE_CONSTANTS = {
  MIN_DATE: new Date("2000-02-24"),  // Terra MODIS 起始日期
  
  getMaxDate: (): Date => {
    const now = new Date();
    now.setDate(now.getDate() - 8);  // 当前日期 - 8 天
    return now;
  },
  
  getDefaultDate: (): Date => {
    return DATE_CONSTANTS.getMaxDate();
  },
};
```

---

## 6. 测试页面实现

### 文件: `src/app/earth-test/page.tsx`

**React 组件**，提供：
- 日期选择器（范围：2000-02-24 到 当前-8天）
- 图层切换（真彩色、红外、夜间灯光）
- 相机位置实时显示
- 瓦片统计显示
- 错误提示

**初始化流程**:
```typescript
const manager = new EarthManager({
  container: containerRef.current,
  enableUI: true,
  performanceMode: "balanced",
});

await manager.initialize();

await manager.layerManager.addLayer({
  layerName: "MODIS_TERRA_TRUE_COLOR",
  date: selectedDate,
});
```

---

## 7. 可能的问题分析

### 问题症状
**远处出现黑条，近处消失** - 这是典型的瓦片层级切换或 mipmap 问题

### 可能的原因

#### 原因 1: 缺少 `getTileDataAvailable()` 方法
**问题**: Cesium 可能在某些层级认为瓦片不可用，导致不请求这些瓦片

**解决方案**: 在 `GIBSGeographicTilingScheme` 中添加：
```typescript
override getTileDataAvailable(x: number, y: number, level: number): boolean {
  // 所有层级的所有瓦片都可用
  return level >= 0 && level <= 8;
}
```

#### 原因 2: URL 模板中的 `{z}` 映射问题
**问题**: GIBS 可能期望 TileMatrix 标识符而不是简单的数字

**当前**: `{z}` → 直接映射到 0, 1, 2, ..., 8
**可能需要**: `{z}` → 映射到 "0", "1", "2", ..., "8" 或其他标识符

**解决方案**: 使用 `customTags` 或 `subdomains` 参数自定义 URL 替换

#### 原因 3: 缺少 `tileMatrixLabels` 配置
**问题**: 某些 WMTS 服务需要明确的 TileMatrix 标签数组

**解决方案**: 如果使用 `WebMapTileServiceImageryProvider`，添加：
```typescript
tileMatrixLabels: ["0", "1", "2", "3", "4", "5", "6", "7", "8"]
```

#### 原因 4: 瓦片坐标计算精度问题
**问题**: 浮点数计算可能导致边界瓦片坐标错误

**当前代码**:
```typescript
let xTileCoordinate = ((position.longitude - rectangle.west) / xTileWidth) | 0;
```

**可能需要**: 使用 `Math.floor()` 而不是位运算 `| 0`

#### 原因 5: Rectangle 边界问题
**问题**: `Cesium.Rectangle.MAX_VALUE` 可能与 GIBS 的实际覆盖范围不匹配

**GIBS 实际范围**: 
- 经度: -180° 到 +180°
- 纬度: -90° 到 +90°

**验证**: 检查 `this.rectangle` 的值是否正确

---

## 8. 调试建议

### 步骤 1: 验证 URL 请求
在浏览器开发者工具的 Network 标签中检查：
1. 请求的 URL 格式是否正确
2. 哪些层级的瓦片返回 200
3. 哪些层级的瓦片返回 404

**示例正确 URL**:
```
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-02-17/250m/0/0/0.jpg
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-02-17/250m/1/0/0.jpg
```

### 步骤 2: 添加调试日志
在 `tileXYToRectangle` 和 `positionToTileXY` 中添加 console.log：
```typescript
console.log(`Level ${level}: Tile (${x}, ${y}) -> Rectangle`, result);
```

### 步骤 3: 测试不同层级
手动测试每个层级的瓦片是否可访问：
```
Level 0: https://.../250m/0/0/0.jpg
Level 1: https://.../250m/1/0/0.jpg
Level 2: https://.../250m/2/0/0.jpg
...
```

### 步骤 4: 对比 GIBS 官方示例
访问 GIBS 官方示例页面，查看他们如何配置 TilingScheme 和 URL

---

## 9. GIBS 官方 API 参考

### WMTS GetCapabilities
```
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml
```

### TileMatrixSet 定义
查看 GetCapabilities 中的 `<TileMatrixSet>` 部分，确认：
- TileMatrix 标识符格式
- 每个层级的瓦片数量
- ScaleDenominator 值

### RESTful URL 模板
官方格式：
```
{WMTSBaseURL}/wmts.cgi?
  SERVICE=WMTS&
  REQUEST=GetTile&
  VERSION=1.0.0&
  LAYER={LayerIdentifier}&
  STYLE=default&
  TILEMATRIXSET={TileMatrixSet}&
  TILEMATRIX={TileMatrix}&
  TILEROW={TileRow}&
  TILECOL={TileCol}&
  FORMAT={Format}&
  TIME={Time}
```

或 RESTful 简化格式：
```
{WMTSBaseURL}/{Layer}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{ext}
```

---

## 10. 下一步行动建议

### 优先级 1: 验证 URL 格式
1. 在浏览器中手动访问几个瓦片 URL
2. 确认 GIBS 服务器返回的是图片而不是 404

### 优先级 2: 添加 `getTileDataAvailable()`
```typescript
override getTileDataAvailable(x: number, y: number, level: number): boolean {
  if (level < 0 || level > 8) return false;
  
  const xTiles = this.getNumberOfXTilesAtLevel(level);
  const yTiles = this.getNumberOfYTilesAtLevel(level);
  
  return x >= 0 && x < xTiles && y >= 0 && y < yTiles;
}
```

### 优先级 3: 检查坐标计算
添加边界检查和日志，确保瓦片坐标在有效范围内

### 优先级 4: 对比官方实现
查找 GIBS + CesiumJS 的官方示例或社区实现，对比配置差异

---

## 11. 相关资源

- **GIBS 官方文档**: https://wiki.earthdata.nasa.gov/display/GIBS
- **GIBS API 文档**: https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+API+for+Developers
- **CesiumJS TilingScheme 文档**: https://cesium.com/learn/cesiumjs/ref-doc/TilingScheme.html
- **CesiumJS ImageryProvider 文档**: https://cesium.com/learn/cesiumjs/ref-doc/ImageryProvider.html

---

## 总结

当前实现已经正确配置了：
✅ 非标准瓦片金字塔结构
✅ 坐标映射方法
✅ URL 模板格式
✅ Provider 配置

**可能缺少的关键部分**：
❓ `getTileDataAvailable()` 方法
❓ TileMatrix 标识符映射
❓ 边界条件处理

建议按照"下一步行动建议"的优先级顺序进行调试和修复。
