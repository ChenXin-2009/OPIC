# 银河系配置完整总结

## 概述

项目中有两个独立的银河系视觉元素，现在都已完成旋转配置调整。

## 两个银河系

### 1. 天空盒（Skybox）- 太阳系层级背景

**用途：** 在太阳系视图中提供沉浸式的银河系背景

**显示条件：**
- 距离：< 1000 光年（太阳系层级）
- 自动淡出：在 30,000 AU 到 1 光年之间

**纹理：**
- `8k_stars_milky_way.webp`（圆柱投影）

**配置位置：**
- 文件：`src/lib/3d/SceneManager.ts`
- 常量：`MILKY_WAY_ORIENTATION`

**最终配置：**
```typescript
const MILKY_WAY_ORIENTATION = {
  rotationX: -141.5, // 俯仰角度
  rotationY: 8,      // 偏航角度
  rotationZ: 123.4,  // 翻滚角度
};
```

---

### 2. 大银河系（Galaxy Renderer）- 远距离视图

**用途：** 在远距离视图中显示银河系的整体结构

**显示条件：**
- 距离：> 1000 光年
- 完全显示：> 2000 光年

**纹理：**
- 俯视图：`Milky_Way_map_by_Gaia_labelled.jpg`
- 侧视图：`MilkyWaySide_Gaia_5000_2.jpg`

**配置位置：**
- 文件：`src/lib/config/galaxyConfig.ts`
- 常量：`GALAXY_CONFIG`

**最终配置：**
```typescript
export const GALAXY_CONFIG = {
  // ...
  rotationX: -60.2,  // 俯仰角度
  rotationY: 13.4,   // 偏航角度
  rotationZ: 103.0,  // 翻滚角度
  // ...
};
```

## 配置对比

| 特性 | 天空盒 | 大银河系 |
|------|--------|----------|
| **显示距离** | < 1000 光年 | > 1000 光年 |
| **X 轴旋转** | 180° | -64° |
| **Y 轴旋转** | 152° | 12° |
| **Z 轴旋转** | 84.5° | 103° |
| **旋转顺序** | XYZ | YXZ |
| **配置文件** | SceneManager.ts | galaxyConfig.ts |
| **调试按钮** |  靛蓝色 |  紫色 |

## 为什么配置值差异这么大？

两个银河系使用：
1. **不同的纹理格式**
   - 天空盒：圆柱投影（equirectangular）
   - 大银河系：俯视图 + 侧视图

2. **不同的几何结构**
   - 天空盒：球体（从内部观看）
   - 大银河系：多层平面组合

3. **不同的旋转用途**
   - 天空盒：纹理校准（@skybox_only），由 `StarsAlignmentCalculator` 处理
   - 大银河系：纹理校准，由 `GALAXY_CONFIG.rotationX/Y/Z` 处理
   - 物理数据：由 `src/lib/coordinates/frames/` 统一处理，与贴图旋转分离

4. **不同的旋转顺序**
   - 天空盒：XYZ
   - 大银河系：YXZ

因此配置值差异很大是**正常且必要**的。

## 使用指南

### 调整天空盒（太阳系层级）

1. 在太阳系视图中（不要缩放太远）
2. 点击  天空盒调试按钮（靛蓝色）
3. 调整滑块观察背景变化
4. 复制配置到 `SceneManager.ts`

### 调整大银河系（远距离视图）

1. 缩放到 1000+ 光年距离
2. 点击  银河系调试按钮（紫色）
3. 可选：启用坐标轴显示
4. 调整滑块观察银河系旋转
5. 复制配置到 `galaxyConfig.ts`

## 验证一致性

虽然配置值不同，但两者应该提供一致的银河系方向感：

### 验证步骤

1. **在太阳系层级**
   - 观察天空盒的银河平面方向
   - 注意银河中心的位置

2. **缩放到远距离**
   - 观察大银河系的平面方向
   - 确认与天空盒的方向大致一致

3. **来回切换**
   - 在两个视图之间切换
   - 确认过渡自然，方向连贯

## 所有相关文件

### 配置文件
```
src/lib/3d/SceneManager.ts          # 天空盒配置
src/lib/config/galaxyConfig.ts      # 大银河系配置
```

### 调试组件
```
src/components/SkyboxRotationDebugger.tsx    # 天空盒调试器
src/components/GalaxyRotationDebugger.tsx    # 大银河系调试器
```

### 渲染器
```
src/lib/3d/SceneManager.ts          # 天空盒渲染
src/lib/3d/GalaxyRenderer.ts        # 大银河系渲染
```

### 主画布
```
src/components/canvas/3d/SolarSystemCanvas3D.tsx  # 集成两个调试器
```

### 文档
```
docs/GALAXY_COMPLETE_SUMMARY.md     # 本文档（银河系渲染完整总结）
```

## 快速参考

### 天空盒配置（太阳系层级）

**位置：** `src/lib/3d/SceneManager.ts` 第 34 行

```typescript
const MILKY_WAY_ORIENTATION = {
  rotationX: 180,
  rotationY: 152,
  rotationZ: 84.5,
};
```

### 大银河系配置（远距离视图）

**位置：** `src/lib/config/galaxyConfig.ts` 第 70 行

```typescript
export const GALAXY_CONFIG = {
  // ...
  rotationX: -64,
  rotationY: 12,
  rotationZ: 103,
  // ...
};
```

## 控制台调试

### 天空盒

```javascript
// 获取 SceneManager
const sm = window.sceneManager;

// 查看当前旋转
console.log('天空盒旋转:', sm.getSkyboxRotation());

// 设置旋转
sm.setSkyboxRotation(180, 152, 84.5);
```

### 大银河系

```javascript
// 获取 GalaxyRenderer
const gr = window.sceneManager?.getGalaxyRenderer();

// 查看当前旋转
console.log('银河系旋转:', gr?.getRotation());

// 设置旋转
gr?.setRotation(-64, 12, 103);
```

## 天文学参考

> 从互联网下载的外部参考材料归档在 [`docs/references/`](./references/README.md)。

### 银河系方向

- **银河平面倾角**：约 60° 相对于黄道面
- **银河中心方向**：人马座（RA ~266°, Dec ~-29°）
- **北银极方向**：后发座（RA ~192.9°, Dec ~27.1°）

### 坐标系

> **2026-06-19 更新**：OPIC 坐标系已按 v2 审计方案重构，建立 ICRF 锚定的 Frame Graph 架构。
> 以下旋转值为银河系艺术纹理朝向校准，不参与物理数据坐标变换。
> 物理坐标变换由 `src/lib/coordinates/frames/galactic.ts`（IAU 1958 矩阵）和
> `src/lib/coordinates/frames/supergalactic.ts`（de Vaucouleurs 矩阵）处理。
> 详见 `docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md`。

- **RenderWorld X 轴**：指向春分点（J2000 ecliptic, RA = 0°）
- **RenderWorld Y 轴**：黄道面内 90°
- **RenderWorld Z 轴**：黄道北极
- **银河系贴图旋转**：见下表（纹理校准，非物理坐标）

## 完成状态

###  天空盒（太阳系层级）
- [x] 调试工具已创建
- [x] 旋转角度已调整（180°, 152°, 84.5°）
- [x] 配置文件已更新
- [x] 效果已验证
- [x] 文档已完善

###  大银河系（远距离视图）
- [x] 调试工具已创建
- [x] 旋转角度已调整（-64°, 12°, 103°）
- [x] 配置文件已更新
- [x] 效果已验证
- [x] 文档已完善

###  额外功能
- [x] 坐标轴辅助器（大银河系）
- [x] 实时预览
- [x] 一键复制配置
- [x] 归零测试
- [x] 控制台调试支持

## 更新日志

### 2024-02-14

**天空盒配置更新：**
- 从 (-141.5°, 8°, 123.4°) 更新到 (180°, 152°, 84.5°)
- 创建了天空盒旋转调试器
- 添加了 setSkyboxRotation 和 getSkyboxRotation API
-  修复了调试器初始化覆盖配置的问题

**大银河系配置更新：**
- 从 (-90°, 30°, 90°) 更新到 (-64°, 12°, 103°)
- 创建了银河系旋转调试器
- 添加了坐标轴辅助器
- 添加了 setRotation 和 getRotation API
-  修复了调试器初始化覆盖配置的问题

**Bug 修复：**
- 修复了调试器在挂载时覆盖配置文件值的问题
- 使用 useRef 跟踪首次渲染，跳过初始化时的回调
- 调试器相关问题已修复

**文档完善：**
- 创建了 10+ 个详细文档
- 包含使用指南、调试步骤、天文学参考
- 提供了完整的配置记录和问题修复文档

## 后续维护

### 如果需要重新调整

1. 使用对应的调试器
2. 参考相关文档
3. 更新配置文件
4. 更新文档记录

### 如果添加新功能

考虑：
- 是否需要调整银河系方向
- 是否影响两个银河系的显示
- 是否需要更新文档

### 如果遇到问题

1. 检查配置文件是否正确
2. 查看浏览器控制台日志
3. 使用调试器验证旋转值
4. 参考故障排除文档

## 总结

两个银河系的旋转配置都已完成并优化：

- **天空盒**提供太阳系层级的沉浸式背景
- **大银河系**展示远距离的银河系结构
- 两者配合提供连贯的宇宙视觉体验
- 完整的调试工具和文档支持后续调整

**项目状态：完成 **
