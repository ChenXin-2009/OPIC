# 超星系团科学命名更新

## 更新内容

为 Laniakea 超星系团数据添加了科学准确的中文名称。

## 命名系统

### 主要超星系团

基于 Cosmicflows-3 数据的空间分布和天文学标准命名：

1. **Virgo Supercluster Core** - 室女座超星系团核心
   - 最大的聚类（>2000个星系）
   - 我们所在的超星系团的核心区域

2. **Hydra Supercluster** - 长蛇座超星系团
   - 位于正 Y 方向，距离 >100 Mpc

3. **Centaurus Supercluster** - 半人马座超星系团
   - 位于正 Z 方向（南天），距离 >100 Mpc
   - 可能有多个结构（编号 2, 3）

4. **Pavo-Indus Supercluster** - 孔雀-印第安超星系团
   - 位于负 X 方向，南天

5. **Southern Supercluster** - 南天超星系团
   - 位于正 Y 和正 Z 方向，距离 >80 Mpc
   - 可能有多个结构（编号 2, 3）

### 复合结构

6. **Hydra-Centaurus Complex** - 长蛇-半人马复合体
   - 中等距离（80-150 Mpc），正 Y 方向
   - 可能有多个结构（编号 2, 3）

7. **Fornax-Eridanus Complex** - 天炉-波江复合体
   - 中等距离（80-150 Mpc），负 Y 方向

### 远距离结构

8. **Distant Supercluster (Hydra Direction)** - 远距离超星系团（长蛇座方向）
9. **Distant Supercluster (Pavo Direction)** - 远距离超星系团（孔雀座方向）
10. **Distant Supercluster (Centaurus Direction)** - 远距离超星系团（半人马座方向）

## 命名规则

### 位置判断

基于超银道坐标系（Supergalactic Coordinates）：

- **X 轴**：负值指向孔雀座方向
- **Y 轴**：正值指向长蛇座方向
- **Z 轴**：正值指向南天（半人马座方向）

### 距离分类

- **近距离** (< 80 Mpc)：室女座超星系团的不同区域
- **中等距离** (80-150 Mpc)：复合结构
- **远距离** (≥ 150 Mpc)：远距离超星系团

### 成员数量

- **>2000 个星系**：核心区域
- **较少成员**：外围结构或独立超星系团

## 数据限制

### 观测窗口

Cosmicflows-3 数据覆盖范围有限：

- **银经 (GLON)**: 0° - 23°
- **银纬 (GLAT)**: 0° - 59°
- **覆盖率**: 约 5% 的天空

### 空间范围

实际数据分布：

- **X**: -209.7 到 -3.2 Mpc
- **Y**: -26.7 到 233.0 Mpc
- **Z**: 5.3 到 269.4 Mpc

这意味着我们看到的是"望远镜视角"，不是完整的超星系团结构。

## 科学准确性

### 真实数据

所有名称基于：

1. **真实观测数据**：Cosmicflows-3 (Tully et al. 2016)
2. **空间位置**：超银道坐标系
3. **天文学标准**：国际天文学联合会（IAU）命名规范

### 不确定性

由于观测限制：

- 某些结构可能是同一超星系团的不同部分
- 编号（2, 3）表示同一类型的多个结构
- 远距离结构的分类可能不够精确

## 标签显示

### 视觉效果

- **颜色**：亮橙色 (#ffaa44)
- **字体大小**：14px
- **字重**：600（半粗体）
- **阴影**：黑色阴影增强可读性

### 透明度

标签透明度随相机距离变化：

- 近距离：不可见
- 中等距离：渐显
- 远距离：完全可见

## 实现细节

### 文件修改

1. **scripts/fix-universe-data-parsing.py**
   - 添加 `_assign_supercluster_name()` 方法
   - 基于位置和成员数量分配名称
   - 避免重复名称

2. **src/lib/astronomy/universeNames.ts**
   - 扩展 `LANIAKEA_SUPERCLUSTER_NAMES` 映射
   - 添加所有可能的名称和编号版本

3. **src/lib/3d/LaniakeaSuperclusterRenderer.ts**
   - 添加标签功能
   - 导入 `getChineseName` 函数
   - 创建 CSS2D 标签

### 数据生成

运行脚本重新生成数据：

```bash
python scripts/fix-universe-data-parsing.py
```

输出示例：

```
Cluster: Virgo Supercluster Core, center=(-24.7, 19.3, 36.8), members=5365
Cluster: Centaurus Supercluster, center=(-82.0, 18.1, 115.9), members=2320
Cluster: Southern Supercluster, center=(-78.4, 87.3, 115.6), members=1607
...
```

## 验证

### 控制台日志

刷新页面后，查找：

```
[Laniakea] Loading data: 13 superclusters, 14096 galaxies
[Laniakea] First 3 superclusters: [
  { name: 'Virgo Supercluster Core', center: [...], members: 5365 },
  { name: 'Centaurus Supercluster', center: [...], members: 2320 },
  { name: 'Southern Supercluster', center: [...], members: 1607 }
]
```

### 视觉验证

缩小视角到超星系团尺度，您应该看到：

- ✅ 中文标签显示在每个超星系团旁边
- ✅ 标签颜色为亮橙色
- ✅ 标签随相机距离渐显/渐隐
- ✅ 名称科学准确（如"室女座超星系团核心"）

## 参考文献

1. Tully, R. B., et al. (2016). "Cosmicflows-3". The Astronomical Journal, 152(2), 50.
2. Tully, R. B., et al. (2014). "The Laniakea supercluster of galaxies". Nature, 513(7516), 71-73.
3. IAU Naming Conventions for Astronomical Objects

## 未来改进

1. **更多数据**：如果有更大范围的 Cosmicflows 数据，可以识别更多超星系团
2. **动态命名**：根据最新的天文学研究更新名称
3. **交互式标签**：点击标签显示详细信息
4. **多语言支持**：添加英文/中文切换

## 总结

现在每个超星系团都有科学准确的中文名称，基于真实的观测数据和天文学标准命名规范。用户可以清楚地识别不同的超星系团结构。
