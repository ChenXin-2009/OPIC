# 宇宙数据解析修复文档

## 问题描述

用户报告在可视化中看到的数据分布不自然：
1. 橙色线连接的室女座超星系团星系团呈现3个放射状模式
2. 蓝色线连接的近邻星系群几乎都在同一个平面上
3. 无法缩小到足够远以看清完整结构

## 根本原因

原始的 `scripts/prepare-universe-data.py` 脚本使用了**占位符/模拟数据**而不是真实的天文数据。虽然脚本包含了解析真实数据的框架，但解析逻辑不完整，导致所有数据都回退到占位符生成函数。

占位符数据的问题：
- 使用简单的圆形/放射状分布模式
- 人为地将星系放置在平面上
- 不反映真实的宇宙大尺度结构

## 解决方案

创建了新的脚本 `scripts/fix-universe-data-parsing.py`，正确解析三个真实天文数据文件：

### 1. 近邻星系群数据 (Karachentsev 2013)
**文件**: `public/data/universe/raw-data/nearby_groups_karachentsev2013.txt`

**格式**: 管道符分隔的固定宽度列
- 列1: 星系名称
- 列2: RA (h m s) 和 Dec (d m s)
- 倒数第二列: 距离 (Mpc)

**解析结果**:
- 869 个星系
- 52 个星系群（使用空间聚类，最大距离 2.0 Mpc，最小成员数 5）

### 2. 室女座超星系团数据 (2MRS Survey)
**文件**: `public/data/universe/raw-data/virgo_supercluster_2mrs.txt`

**格式**: 管道符分隔
- 列1: 星系ID
- 列2: RA (度) 和 Dec (度)
- 后续列: 速度 cz (km/s)

**距离计算**: 使用哈勃定律 D = cz / H₀，其中 H₀ ≈ 70 km/s/Mpc

**解析结果**:
- 3,970 个星系（距离范围 5-50 Mpc）
- 113 个星系团（使用空间聚类，最大距离 5.0 Mpc，最小成员数 10）

### 3. 拉尼亚凯亚超星系团数据 (Cosmicflows-3)
**文件**: `public/data/universe/raw-data/laniakea_cosmicflows3.txt`

**格式**: 管道符分隔
- 列1: PGC 编号
- 列2: 距离 (Mpc)
- 列17: 银经 (GLON) 和 银纬 (GLAT)

**解析结果**:
- 14,096 个星系（距离范围 10-300 Mpc）
- 64 个超星系团（使用空间聚类，最大距离 30.0 Mpc，最小成员数 20）

## 坐标转换

所有数据都转换为**超银道坐标系** (Supergalactic Coordinate System)：
- 如果安装了 `astropy`：使用精确的坐标转换
- 否则：使用简化的球面坐标转换

转换函数：
- `convert_to_supergalactic(ra, dec, distance)` - 赤道坐标 → 超银道坐标
- `convert_galactic_to_supergalactic(glon, glat, distance)` - 银道坐标 → 超银道坐标

## 空间聚类算法

使用简单的基于距离的聚类算法：
1. 遍历所有星系
2. 对于每个未分组的星系，创建新群
3. 查找距离小于阈值的所有星系
4. 计算群中心和半径
5. 只保留成员数 ≥ 最小值的群

参数：
- 近邻星系群: max_distance=2.0 Mpc, min_members=5
- 室女座星系团: max_distance=5.0 Mpc, min_members=10
- 拉尼亚凯亚超星系团: max_distance=30.0 Mpc, min_members=20

## 二进制文件格式

生成的二进制文件遵循前端期望的格式：

### 近邻星系群和室女座超星系团
```
- 名称表大小 (uint16)
- 名称表 (每个: uint8 长度 + UTF-8 字符串)
- 群/团数量 (uint16)
- 群/团数据 (每个):
  - centerX, centerY, centerZ (float32 x 3)
  - radius (float32)
  - memberCount (uint16)
  - richness (uint8)
  - nameIndex (uint8)
  - 成员星系 (每个: x, y, z float32 x 3)
```

### 拉尼亚凯亚超星系团
```
- 名称表大小 (uint16)
- 名称表 (每个: uint8 长度 + UTF-8 字符串)
- 超星系团数量 (uint16)
- 超星系团数据 (每个):
  - centerX, centerY, centerZ (float32 x 3)
  - radius (float32)
  - memberCount (uint16)
  - richness (uint8)
  - nameIndex (uint8)
  - hasVelocity (uint8) - 当前为 0
```

## 使用方法

重新生成数据文件：

```bash
python scripts/fix-universe-data-parsing.py
```

可选参数：
- `--raw-data`: 原始数据目录（默认: `public/data/universe/raw-data`）
- `--output`: 输出目录（默认: `public/data/universe`）

## 预期效果

使用真实数据后，可视化应该显示：
1. **自然的3D分布** - 星系群和星系团在三维空间中真实分布，不再是人为的平面或放射状模式
2. **真实的聚类结构** - 反映实际观测到的宇宙大尺度结构
3. **准确的距离和位置** - 基于真实的天文观测数据

## 数据来源

1. **本星系群**: McConnachie (2012) - 已在原脚本中正确实现
2. **近邻星系群**: Karachentsev et al. (2013) - 现已修复
3. **室女座超星系团**: 2MRS Survey - 现已修复
4. **拉尼亚凯亚超星系团**: Cosmicflows-3 - 现已修复

## 技术细节

### 依赖项
- `numpy` - 数值计算
- `astropy` (可选) - 精确坐标转换

### 文件大小
- `nearby-groups.bin`: 9,843 字节
- `virgo-supercluster.bin`: 31,138 字节
- `laniakea.bin`: 1,915 字节

### 性能
- 解析速度: ~1-2 秒（所有三个文件）
- 内存使用: 最小（流式处理）

## 后续改进

可能的增强：
1. 使用更复杂的聚类算法（如 DBSCAN 或层次聚类）
2. 添加星系类型信息（螺旋、椭圆、不规则）
3. 包含速度场数据（用于拉尼亚凯亚）
4. 添加更多数据源（如 Sloan Digital Sky Survey）
5. 实现自适应聚类参数（基于局部密度）

## 验证

要验证数据正确性：
1. 检查仙女座星系 (M31) 距离应约为 0.78 Mpc
2. 室女座星系团应在 15-20 Mpc 范围内
3. 拉尼亚凯亚超星系团应延伸至 ~250 Mpc

## 相关文件

- `scripts/fix-universe-data-parsing.py` - 新的数据解析脚本
- `scripts/prepare-universe-data.py` - 原始脚本（包含占位符）
- `src/lib/data/UniverseDataLoader.ts` - 前端数据加载器
- `src/lib/3d/NearbyGroupsRenderer.ts` - 近邻星系群渲染器
- `src/lib/3d/VirgoSuperclusterRenderer.ts` - 室女座超星系团渲染器
- `src/lib/3d/LaniakeaSuperclusterRenderer.ts` - 拉尼亚凯亚超星系团渲染器
