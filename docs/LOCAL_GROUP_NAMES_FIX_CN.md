# 本星系群名称修复

## 问题

用户报告粉色点（本星系群星系）的名称显示为 "DWARF GALAXY 1", "DWARF GALAXY 2" 等占位符名称，而不是真实的星系名称。

## 根本原因

`prepare-universe-data.py` 脚本中的 `parse_local_group_data()` 方法无法正确解析 McConnachie (2012) 数据文件，导致使用了占位符数据。

### 原始问题
- 数据文件使用管道符 `|` 分隔字段
- 原始解析逻辑假设是固定宽度格式
- 解析失败，返回 0 个星系
- 回退到占位符数据，生成 "Dwarf Galaxy 1", "Dwarf Galaxy 2" 等

## 解决方案

### 1. 修复数据解析逻辑

**文件**: `scripts/prepare-universe-data.py`

**修改**: `parse_local_group_data()` 方法

**关键改进**:
```python
# 旧逻辑（错误）
line = line.strip()
if not line or line.startswith('#') or line.startswith('-') or '|' in line[:5]:
    continue
name = line[:29].strip()
parts = line[29:].split()

# 新逻辑（正确）
parts = line.split('|')
name = parts[0].strip()
coords = parts[2].strip()  # GLON GLAT
distance_str = parts[8].strip()  # D (kpc)
```

**改进点**:
1. 使用 `split('|')` 分隔字段
2. 正确提取名称（第 1 列）
3. 正确提取坐标（第 3 列）
4. 正确提取距离（第 9 列）
5. 添加错误追踪（`traceback.print_exc()`）

### 2. 重新生成数据文件

**命令**: `python scripts/prepare-universe-data.py`

**结果**:
- 成功解析 101 个星系（之前是 0 个）
- 文件大小: 2,724 bytes（之前是 2,564 bytes）
- 包含真实星系名称

### 3. 恢复其他数据文件

由于 `prepare-universe-data.py` 会覆盖所有文件，需要重新运行 `fix-universe-data-parsing.py` 来恢复 nearby-groups 和 virgo-supercluster 的真实数据。

**命令**: `python scripts/fix-universe-data-parsing.py`

## 解析的真实星系名称

### 主要星系
- Canis Major (大犬座矮星系)
- Sagittarius dSph (人马座矮椭球星系)
- Segue (I)
- Ursa Major II (大熊座 II)
- Bootes II (牧夫座 II)
- Segue II
- Willman 1
- Coma Berenices (后发座矮星系)
- Bootes III (牧夫座 III)
- LMC (大麦哲伦云)
- SMC (小麦哲伦云)
- Bootes (I) (牧夫座 I)
- Draco (天龙座矮星系)
- Ursa Minor (小熊座矮星系)
- Sculptor (玉夫座矮星系)
- Sextans (I) (六分仪座矮星系)
- Ursa Major (I) (大熊座 I)
- Carina (船底座矮星系)
- Hercules (武仙座矮星系)
- Fornax (天炉座矮星系)

### 仙女座星系及其卫星
- Andromeda (仙女座星系)
- M32
- NGC 205
- Andromeda I, II, III, ... XXX (30+ 个卫星星系)
- NGC 147
- NGC 185

### 三角座星系
- Triangulum (三角座星系)

### 其他成员
- IC 1613
- Phoenix (凤凰座矮星系)
- NGC 6822
- Cetus (鲸鱼座矮星系)
- Pegasus dIrr (飞马座矮不规则星系)
- Leo T (狮子座 T)
- WLM
- Leo A (狮子座 A)
- Aquarius (宝瓶座矮星系)
- Tucana (杜鹃座矮星系)
- 等等...

**总计**: 101 个星系

## 中文名称映射

**文件**: `src/lib/astronomy/universeNames.ts`

已包含完整的本星系群中文名称映射（100+ 条目）：

```typescript
export const LOCAL_GROUP_NAMES: Record<string, string> = {
  'Milky Way': '银河系',
  'Canis Major': '大犬座矮星系',
  'Sagittarius dSph': '人马座矮椭球星系',
  'LMC': '大麦哲伦云',
  'SMC': '小麦哲伦云',
  'Andromeda': '仙女座星系',
  'M31': '仙女座星系',
  'M33': '三角座星系',
  'Draco': '天龙座矮星系',
  // ... 100+ 条目
};
```

## 渲染器集成

**文件**: `src/lib/3d/LocalGroupRenderer.ts`

已经在使用 `getChineseName()`:

```typescript
const chineseName = getChineseName(galaxy.name, 'local-group');
labelDiv.textContent = chineseName;
```

## 最终文件状态

| 文件 | 大小 | 对象数 | 星系数 | 状态 |
|------|------|--------|--------|------|
| `local-group.bin` | 2,724 bytes | 101 | 101 | ✅ 真实名称 |
| `nearby-groups.bin` | 10,150 bytes | 52 | 869 | ✅ 科学名称 |
| `virgo-supercluster.bin` | 31,908 bytes | 113 | 3,970 | ✅ 科学名称 |
| `laniakea.bin` | 166,202 bytes | 13 | 14,096 | ✅ 科学名称 |

## 测试验证

### 1. 清除缓存
访问: `http://localhost:3000/clear-cache.html`

### 2. 硬刷新
Windows: `Ctrl + Shift + R`

### 3. 验证
控制台应显示:
```
[UniverseDataLoader] Loaded /data/universe/local-group.bin: 2724 bytes
```

### 4. 视觉检查
缩放到本星系群尺度（200k - 10M 光年），应该看到粉色点的标签显示：
- 大犬座矮星系
- 人马座矮椭球星系
- 大麦哲伦云
- 小麦哲伦云
- 仙女座星系
- 三角座星系
- 天龙座矮星系
- 小熊座矮星系
- 等等...

**不应该看到**: "DWARF GALAXY 1", "DWARF GALAXY 2"

## 数据来源

**McConnachie (2012)**: "The Observed Properties of Dwarf Galaxies in and around the Local Group"
- 期刊: The Astronomical Journal, Volume 144, Issue 1
- 数据表: Table 2
- 来源: CDS (Centre de Données astronomiques de Strasbourg)
- URL: http://cdsarc.cds.unistra.fr

## 科学准确性

✅ 所有 101 个星系名称来自真实观测数据
✅ 坐标基于银道坐标系，转换为超银道坐标
✅ 距离单位: kpc (千秒差距)，转换为 Mpc
✅ 星系类型基于名称推断（Spiral, Irregular, Dwarf）
✅ 无模拟数据，无占位符

## 总结

✅ **问题**: 粉色点显示 "DWARF GALAXY 1", "DWARF GALAXY 2"
✅ **原因**: 数据解析失败，使用占位符
✅ **解决**: 修复解析逻辑，使用管道符分隔
✅ **结果**: 101 个真实星系名称
✅ **验证**: 清除缓存后可见中文名称

用户现在应该能看到真实的星系名称，如"大犬座矮星系"、"人马座矮椭球星系"等，而不是 "DWARF GALAXY 1"。
