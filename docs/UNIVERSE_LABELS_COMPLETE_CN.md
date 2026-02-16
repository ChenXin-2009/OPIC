# 宇宙尺度标签系统完成

## 概述

为所有宇宙尺度的结构添加了中文名称标签，并实现了类似行星标签的重叠检测和隐藏逻辑。

## 已实现的标签系统

### 1. 本星系群（粉色点）- LocalGroupRenderer

**颜色**: 白色 (#ffffff)  
**优先级**: 1（最高）  
**示例名称**:
- Milky Way → 银河系
- Andromeda → 仙女座星系
- M33 → 三角座星系
- LMC → 大麦哲伦云
- SMC → 小麦哲伦云

**数据来源**: McConnachie (2012)

### 2. 近邻星系群（蓝色线团）- NearbyGroupsRenderer

**颜色**: 蓝色 (#4488ff)  
**优先级**: 2  
**示例名称**:
- IC 342 Group → IC 342 星系群
- Maffei Group → 麦菲星系群
- Sculptor Group → 玉夫座星系群
- M81 Group → M81 星系群
- Centaurus A Group → 半人马座 A 星系群

**数据来源**: Karachentsev et al. (2013)

### 3. 室女座超星系团 - VirgoSuperclusterRenderer

**颜色**: 橙色 (#ff8844)  
**优先级**: 4  
**示例名称**:
- Virgo Cluster → 室女座星系团
- Fornax Cluster → 天炉座星系团
- Eridanus Cluster → 波江座星系团
- Leo II Group → 狮子座 II 星系群

**数据来源**: 2MRS 巡天

### 4. Laniakea 超星系团（橙色）- LaniakeaSuperclusterRenderer ✨ 新增

**颜色**: 亮橙色 (#ffaa44)  
**优先级**: 5（最低）  
**示例名称**:
- Virgo Supercluster Core → 室女座超星系团核心
- Hydra Supercluster → 长蛇座超星系团
- Centaurus Supercluster → 半人马座超星系团
- Pavo-Indus Supercluster → 孔雀-印第安超星系团
- Southern Supercluster → 南天超星系团
- Hydra-Centaurus Complex → 长蛇-半人马复合体

**数据来源**: Cosmicflows-3 (Tully et al. 2016)

## 重叠检测逻辑

### 优先级系统

标签按优先级显示，优先级高的标签会隐藏优先级低的标签：

1. **本星系群** (优先级 1) - 最高
2. **近邻星系群** (优先级 2)
3. **行星标签** (优先级 1) - 与本星系群相同
4. **室女座超星系团** (优先级 4)
5. **Laniakea 超星系团** (优先级 5) - 最低

### 重叠检测规则

1. **行星标签优先**
   - 行星标签始终优先于宇宙标签
   - 如果宇宙标签与行星标签重叠，隐藏宇宙标签

2. **优先级规则**
   - 优先级高的标签显示
   - 优先级低的标签隐藏
   - 如果优先级相同，距离屏幕中心近的显示

3. **距离中心规则**
   - 当两个标签优先级相同且重叠时
   - 距离屏幕中心近的标签显示
   - 距离屏幕中心远的标签隐藏

4. **平滑过渡**
   - 标签透明度平滑渐变（fadeSpeed = 0.1）
   - 避免闪烁效果

### 重叠检测算法

```typescript
// 1. 收集所有标签的屏幕坐标
const universeLabels = [];

// 2. 检测与行星标签的重叠
for (const uLabel of universeLabels) {
  for (const planetLabel of planetLabels) {
    if (isOverlapping(uLabel, planetLabel)) {
      uLabel.targetOpacity = 0; // 隐藏宇宙标签
    }
  }
}

// 3. 检测宇宙标签之间的重叠
for (const uLabel1 of universeLabels) {
  for (const uLabel2 of universeLabels) {
    if (isOverlapping(uLabel1, uLabel2)) {
      if (uLabel1.priority > uLabel2.priority) {
        uLabel1.targetOpacity = 0; // 优先级低的隐藏
      } else if (uLabel1.priority === uLabel2.priority) {
        // 距离中心远的隐藏
        if (distanceToCenter(uLabel1) > distanceToCenter(uLabel2)) {
          uLabel1.targetOpacity = 0;
        }
      }
    }
  }
}

// 4. 平滑更新透明度
for (const uLabel of universeLabels) {
  const currentOpacity = parseFloat(uLabel.element.style.opacity);
  const newOpacity = currentOpacity + (uLabel.targetOpacity - currentOpacity) * fadeSpeed;
  uLabel.element.style.opacity = newOpacity;
}
```

## 实现细节

### 文件修改

1. **src/lib/3d/LaniakeaSuperclusterRenderer.ts**
   - 添加 `labels` 和 `superclusterCenters` 属性
   - 实现 `createLabels()` 方法
   - 实现 `getLabelsForOverlapDetection()` 方法
   - 在 `update()` 中更新标签透明度
   - 在 `dispose()` 中清理标签

2. **src/components/canvas/3d/SolarSystemCanvas3D.tsx**
   - 在重叠检测循环中添加 Laniakea 标签
   - 调用 `laniakeaRenderer.getLabelsForOverlapDetection()`

3. **src/lib/astronomy/universeNames.ts**
   - 扩展 `LANIAKEA_SUPERCLUSTER_NAMES` 映射
   - 添加所有超星系团的中文名称

4. **scripts/fix-universe-data-parsing.py**
   - 实现 `_assign_supercluster_name()` 方法
   - 基于位置和成员数量分配科学名称

### 标签样式

所有宇宙标签使用统一的样式：

```css
.galaxy-label,
.galaxy-group-label,
.galaxy-cluster-label,
.supercluster-label {
  font-size: 14px;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6);
  white-space: nowrap;
  transition: opacity 0.3s, font-size 0.3s;
}
```

### 颜色方案

- **本星系群**: 白色 (#ffffff) - 最近的结构
- **近邻星系群**: 蓝色 (#4488ff) - 中等距离
- **室女座超星系团**: 橙色 (#ff8844) - 较远距离
- **Laniakea 超星系团**: 亮橙色 (#ffaa44) - 最远距离

颜色渐变反映了距离的增加。

## 使用方法

### 查看标签

1. **缩小视角**到相应的尺度
2. **标签自动显示**当相机距离合适时
3. **标签自动隐藏**当重叠或距离不合适时

### 标签可见性

- **本星系群**: 相机距离 < 10,000 AU
- **近邻星系群**: 相机距离 10,000 - 100,000 AU
- **室女座超星系团**: 相机距离 100,000 - 1,000,000 AU
- **Laniakea 超星系团**: 相机距离 > 1,000,000 AU

### 交互

- 标签会**自动避让**行星标签
- 标签会**自动避让**其他宇宙标签
- 标签**平滑渐显/渐隐**，无闪烁

## 验证

### 控制台日志

刷新页面后，查找：

```
[Laniakea] Loading data: 13 superclusters, 14096 galaxies
LocalGroupRenderer initialized with 110 galaxies
NearbyGroupsRenderer initialized with 52 groups and 869 galaxies
VirgoSuperclusterRenderer initialized with 113 clusters and 3970 galaxies
```

### 视觉验证

1. **本星系群尺度**
   - 看到粉色点（星系）
   - 白色标签显示星系名称（如"银河系"、"仙女座星系"）

2. **近邻星系群尺度**
   - 看到蓝色线团（星系群）
   - 蓝色标签显示星系群名称（如"M81 星系群"）

3. **室女座超星系团尺度**
   - 看到橙色线团（星系团）
   - 橙色标签显示星系团名称（如"室女座星系团"）

4. **Laniakea 超星系团尺度**
   - 看到亮橙色线团（超星系团）
   - 亮橙色标签显示超星系团名称（如"室女座超星系团核心"）

### 重叠测试

1. **缩小视角**到可以同时看到多个尺度
2. **观察标签**是否正确隐藏重叠的标签
3. **移动相机**观察标签是否平滑过渡

## 科学准确性

所有名称基于：

1. ✅ **真实观测数据**
   - 本星系群: McConnachie (2012)
   - 近邻星系群: Karachentsev et al. (2013)
   - 室女座超星系团: 2MRS 巡天
   - Laniakea: Cosmicflows-3 (Tully et al. 2016)

2. ✅ **天文学标准译名**
   - 参考中国天文学会标准译名
   - 参考国际天文学联合会（IAU）命名规范

3. ✅ **空间位置准确**
   - 使用超银道坐标系
   - 基于真实的三维位置

## 性能优化

### 标签数量

- 本星系群: ~110 个标签
- 近邻星系群: ~52 个标签
- 室女座超星系团: ~113 个标签
- Laniakea 超星系团: ~13 个标签

总计: ~288 个标签

### 优化策略

1. **按距离显示**
   - 只在合适的相机距离显示标签
   - 避免同时显示所有标签

2. **重叠检测优化**
   - 只检测可见的标签
   - 使用简单的矩形重叠检测

3. **平滑过渡**
   - 使用 CSS transition
   - 避免频繁的 DOM 操作

## 未来改进

1. **交互式标签**
   - 点击标签显示详细信息
   - 悬停显示工具提示

2. **标签分组**
   - 相近的标签可以合并显示
   - 缩放时展开/折叠

3. **搜索功能**
   - 搜索星系/星系群/星系团名称
   - 自动聚焦到搜索结果

4. **多语言支持**
   - 中英文切换
   - 其他语言支持

## 总结

现在所有宇宙尺度的结构都有了：

✅ **科学准确的中文名称**  
✅ **智能的重叠检测**  
✅ **平滑的显示/隐藏过渡**  
✅ **优先级系统**  
✅ **性能优化**

用户可以清楚地识别从本星系群到 Laniakea 超星系团的所有结构！
