# Universe Renderer Fixes - 2024

## 问题总结

用户报告了以下问题：
1. 缩小后显示几个白色方块
2. 周围有一些彩色的圆点
3. 再缩小后有6个几乎对称的团，每个点很小，几乎不可见
4. 需要用点点连线的方式来模拟结构

## 已完成的修复

### 1. NearbySuperclusterRenderer 粒子大小转换
**文件**: `src/lib/3d/NearbySuperclusterRenderer.ts`
**修复**: 在第88行添加了 `MEGAPARSEC_TO_AU` 转换
```typescript
sizes[i] = NEARBY_SUPERCLUSTER_CONFIG.particleSize * MEGAPARSEC_TO_AU * (galaxy.brightness || 1);
```

### 2. 排除银河系重复渲染
**文件**: `src/lib/3d/LocalGroupRenderer.ts`
**修复**: 在 `createGalaxies()` 方法中过滤掉银河系
**原因**: 银河系已经由 `GalaxyRenderer` 使用俯视图和侧视图渲染，不需要在本星系群中再次显示为白色圆圈
```typescript
// Skip Milky Way - it's already rendered by GalaxyRenderer
if (galaxy.name === 'Milky Way' || galaxy.name === '银河系') {
  return;
}
```

### 3. 添加星系名称标签
**文件**: `src/lib/3d/LocalGroupRenderer.ts`
**功能**: 为本星系群中的每个星系添加名称标签，类似太阳系中的行星标签
**实现**:
- 使用 `CSS2DObject` 创建 2D 标签
- 标签随相机距离淡入淡出
- 标签显示距离阈值：`LOCAL_GROUP_CONFIG.labelShowDistance` (100,000 光年)
- 标签样式：白色文字，黑色阴影，Novecento Wide 字体
```typescript
private createLabel(galaxy: LocalGroupGalaxy, mesh: THREE.Mesh): void {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'galaxy-label';
  labelDiv.textContent = galaxy.name;
  // ... 样式配置
  const label = new CSS2DObject(labelDiv);
  mesh.add(label);
}
```

### 4. LaniakeaSuperclusterRenderer 连接线
**文件**: `src/lib/3d/LaniakeaSuperclusterRenderer.ts`
**添加**:
- `connectionLines` 数组用于存储连接线
- `createConnectionLines()` 方法创建超星系团内部的连接线
- 在 `update()` 中更新连接线透明度
- 在 `dispose()` 中清理连接线资源

**连接线配置**:
- 颜色: `0x88aa66` (绿黄色)
- 透明度: `LANIAKEA_SUPERCLUSTER_CONFIG.connectionOpacity` (0.15)
- 每个星系最多连接2个附近的星系

### 3. NearbySuperclusterRenderer 连接线
**文件**: `src/lib/3d/NearbySuperclusterRenderer.ts`
**添加**:
- `connectionLines` 数组用于存储连接线
- `createConnectionLines()` 方法创建超星系团内部的连接线
- 在 `update()` 中更新连接线透明度
- 在 `dispose()` 中清理连接线资源

**连接线配置**:
- 颜色: `0xaa8866` (棕黄色)
- 透明度: `NEARBY_SUPERCLUSTER_CONFIG.connectionOpacity` (0.1)
- 每个星系最多连接2个附近的星系

### 4. 修复 TypeScript 错误
**问题**: `nameIndex` 不在 `ClusterMetadata` 类型中
**修复**: 从所有渲染器的 `generateGalaxies()` 调用中移除了 `nameIndex` 参数
**影响的文件**:
- `src/lib/3d/NearbyGroupsRenderer.ts`
- `src/lib/3d/LaniakeaSuperclusterRenderer.ts`
- `src/lib/3d/NearbySuperclusterRenderer.ts`

## 当前状态

### 数据文件
所有二进制数据文件已重新生成：
- `local-group.bin` (2564 bytes) - 使用占位符数据（真实数据解析失败）
- `nearby-groups.bin` (2157 bytes) - 占位符数据
- `virgo-supercluster.bin` (2382 bytes) - 占位符数据
- `laniakea.bin` - 占位符数据
- `metadata.json` - 元数据

### 渲染器状态
所有渲染器现在都有：
✅ 正确的单位转换（Mpc → AU）
✅ 连接线显示结构
✅ 透明度淡入淡出
✅ 基于距离的可见性控制

## 仍需解决的问题

### 1. 白色方块问题
**原因**: LocalGroupRenderer 使用 CircleGeometry 创建星系，这些几何体总是面向相机（billboard 效果）
**可能的解决方案**:
- 使用 3D 纹理贴图而不是简单的几何体
- 为螺旋星系使用更复杂的 3D 模型
- 调整材质和渲染方式

### 2. 真实数据解析
**问题**: 原始数据文件使用复杂的固定宽度格式，当前解析失败
**数据源**:
- `local_group_mcconnachie2012.txt` - McConnachie (2012) 目录
- `nearby_groups_karachentsev2013.txt` - Karachentsev et al. (2013) 目录
- `virgo_supercluster_2mrs.txt` - 2MRS 巡天数据
- `laniakea_cosmicflows3.txt` - Cosmicflows-3 数据集

**需要做的**:
- 改进 Python 脚本中的数据解析逻辑
- 正确处理固定宽度格式的列
- 验证坐标转换的正确性

### 3. 可见性和大小调整
**问题**: 在不同缩放级别下，某些结构可能太小或太大
**需要测试**:
- 150,000 光年 - 本星系群
- 1,000,000 光年 - 近邻星系群
- 5,000,000 光年 - 室女座超星系团
- 50,000,000 光年 - 拉尼亚凯亚超星系团
- 150,000,000 光年 - 近邻超星系团

## 配置参数

### 粒子大小（已转换为 AU）
```typescript
NEARBY_GROUPS_CONFIG.particleSize: 0.01 Mpc (~30,000 光年)
VIRGO_SUPERCLUSTER_CONFIG.particleSize: 0.008 Mpc (~25,000 光年)
LANIAKEA_SUPERCLUSTER_CONFIG.particleSize: 0.006 Mpc (~20,000 光年)
NEARBY_SUPERCLUSTER_CONFIG.particleSize: 0.005 Mpc (~15,000 光年)
```

### 连接线透明度
```typescript
NEARBY_GROUPS_CONFIG.connectionOpacity: 0.3
VIRGO_SUPERCLUSTER_CONFIG.connectionOpacity: 0.2
LANIAKEA_SUPERCLUSTER_CONFIG.connectionOpacity: 0.15
NEARBY_SUPERCLUSTER_CONFIG.connectionOpacity: 0.1
```

## 下一步建议

1. **改进 LocalGroupRenderer**:
   - 使用纹理贴图而不是简单几何体
   - 添加更真实的星系外观
   - 避免 billboard 效果

2. **实现真实数据解析**:
   - 修复 Python 脚本中的数据解析
   - 验证坐标转换
   - 测试真实数据的可视化效果

3. **优化可见性**:
   - 调整淡入淡出距离
   - 测试不同缩放级别
   - 确保所有结构在适当的距离下可见

4. **性能优化**:
   - 使用 LOD 系统
   - 实现视锥剔除
   - 优化粒子系统

## 测试清单

- [ ] 从太阳系缩小到本星系群（150,000 光年）
- [ ] 继续缩小到近邻星系群（1,000,000 光年）
- [ ] 缩小到室女座超星系团（5,000,000 光年）
- [ ] 缩小到拉尼亚凯亚超星系团（50,000,000 光年）
- [ ] 缩小到近邻超星系团（150,000,000 光年）
- [ ] 验证连接线在所有级别都可见
- [ ] 验证粒子大小合适
- [ ] 验证颜色和透明度正确
- [ ] 验证性能可接受
