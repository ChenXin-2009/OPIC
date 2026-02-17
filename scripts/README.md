# 星历数据生成脚本 / Ephemeris Data Generation Scripts

本目录包含用于生成高精度星历数据的脚本，使用JPL SPICE内核。

This directory contains scripts for generating high-precision ephemeris data using JPL SPICE kernels.

## 目录结构 / Directory Structure

```
scripts/
├── generate-all-bodies-ephemeris.py  # 主生成脚本 / Main generation script
├── generate-manifest.py              # 生成manifest.json
├── download_kernels.py               # 下载SPICE内核 / Download SPICE kernels
├── EPHEMERIS_DATA_GENERATION.md      # 详细文档 / Detailed documentation
├── README.md                         # 本文件 / This file
└── tests/                            # 测试和验证脚本 / Test and validation scripts
    ├── check-de440-bodies.py
    ├── test-ephemeris-file.py
    ├── verify-triton-orbit.py
    └── ...
```

## 前置要求 / Prerequisites

### Python依赖 / Python Dependencies

```bash
pip install spiceypy numpy
```

### SPICE内核 / SPICE Kernels

**注意**: 内核文件已从项目中移除以节省空间（约1.9GB）。如需重新生成星历数据，请先下载内核。

**Note**: Kernel files have been removed from the project to save space (~1.9GB). To regenerate ephemeris data, download kernels first.

#### 自动下载 / Automatic Download

```bash
python download_kernels.py
```

这将下载以下内核到 `kernels/` 目录：
This will download the following kernels to `kernels/` directory:

1. **de440.bsp** - 行星星历 / Planetary ephemeris (~114 MB)
2. **jup365.bsp** - 木星卫星 / Jupiter satellites (~1084 MB)
3. **sat441.bsp** - 土星卫星 / Saturn satellites (~631 MB)
4. **nep097.bsp** - 海王星卫星 / Neptune satellites (~100 MB)
5. **naif0012.tls** - 闰秒表 / Leap seconds (~5 KB)

**总大小 / Total size**: 约1.9GB / ~1.9GB

#### 手动下载 / Manual Download

从 [NAIF JPL](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/) 下载：

- 行星 / Planets: `spk/planets/de440.bsp`
- 木星卫星 / Jupiter: `spk/satellites/jup365.bsp`
- 土星卫星 / Saturn: `spk/satellites/sat441.bsp`
- 海王星卫星 / Neptune: `spk/satellites/nep097.bsp`
- 闰秒 / Leap seconds: `lsk/naif0012.tls`

## 使用方法 / Usage

### 生成所有天体数据 / Generate All Bodies

```bash
python generate-all-bodies-ephemeris.py --validate
```

### 生成特定天体 / Generate Specific Bodies

```bash
# 只生成地球和月球
python generate-all-bodies-ephemeris.py --bodies Earth Moon --validate

# 只生成火星
python generate-all-bodies-ephemeris.py --bodies Mars --validate

# 生成所有外行星
python generate-all-bodies-ephemeris.py --bodies Jupiter Saturn Uranus Neptune --validate
```

### 自定义输出目录 / Custom Output Directory

```bash
python generate-all-bodies-ephemeris.py --output-dir ../public/data/ephemeris
```

## 数据覆盖范围 / Data Coverage

| 天体 / Body | NAIF ID | 时间范围 / Time Range | 年数 / Years |
|-------------|---------|----------------------|--------------|
| 地球 / Earth | 399 | 2009-2109 | 100年 |
| 火星 / Mars | 4 | 2009-2109 | 100年 |
| 月球 / Moon | 301 | 2009-2109 | 100年 |
| 其他行星 / Other Planets | - | 2009-2039 | 30年 |
| 其他卫星 / Other Satellites | - | 2009-2039 | 30年 |

**注意**: 火星和外行星使用barycenter ID（4-8）而不是planet center ID（499, 599, 699, 799, 899），因为DE440内核不包含后者。

**Note**: Mars and outer planets use barycenter IDs (4-8) instead of planet center IDs (499, 599, 699, 799, 899) because DE440 kernel doesn't include the latter.

## 输出格式 / Output Format

生成的文件为压缩二进制格式（.bin.gz）：

Generated files are in compressed binary format (.bin.gz):

- **参考系 / Reference Frame**: ECLIPJ2000（黄道坐标系）
- **原点 / Origin**: 日心（行星）或行星中心（卫星）
- **单位 / Units**: 天文单位（AU）
- **多项式类型 / Polynomial Type**: 
  - Chebyshev（行星 / planets）
  - Hermite（卫星 / satellites）

## 文件大小 / File Sizes

| 天体 / Body | 段数 / Segments | 压缩大小 / Compressed Size |
|-------------|----------------|---------------------------|
| 地球 / Earth | 146,100 | 29.9 MB |
| 火星 / Mars | 18,263 | 3.7 MB |
| 月球 / Moon | 73,050 | 4.0 MB |
| 木星卫星 / Jupiter Moons | ~22,000 | ~1.2 MB each |
| 土星卫星 / Saturn Moons | ~11,000 | ~0.6 MB each |

**总计 / Total**: 约50 MB（所有27个天体）

## 验证 / Validation

生成数据后会自动验证精度：

After generation, accuracy is automatically validated:

```bash
python generate-all-bodies-ephemeris.py --bodies Mars --validate
```

验证指标 / Validation Metrics:
- 最大误差 / Max Error: 与SPICE数据对比
- 平均误差 / Avg Error: 所有测试点的平均值
- 有限性检查 / Finiteness: 确保所有系数有效

## 测试脚本 / Test Scripts

`tests/` 目录包含各种测试和验证脚本：

The `tests/` directory contains various test and validation scripts:

- `test-ephemeris-file.py` - 测试星历文件读取
- `verify-triton-orbit.py` - 验证Triton轨道
- `check-de440-bodies.py` - 检查DE440内核中的天体
- `visualize-enceladus-orbit.py` - 可视化Enceladus轨道

## 故障排除 / Troubleshooting

### "Kernel file not found" 错误
运行 `python download_kernels.py` 下载内核文件

### "spiceypy not installed" 错误
安装: `pip install spiceypy numpy`

### 内存不足
- 减少时间范围或增加段长度
- 分批生成不同天体

### 精度不足
- 增加多项式阶数（order参数）
- 减少段长度（segment_days参数）

## 参考资料 / References

- [SPICE Toolkit](https://naif.jpl.nasa.gov/naif/toolkit.html)
- [SpiceyPy Documentation](https://spiceypy.readthedocs.io/)
- [JPL HORIZONS System](https://ssd.jpl.nasa.gov/horizons/)
- [DE440 Ephemeris](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/)

## 更新历史 / Update History

- **2026-02-17**: 
  - 移除kernels目录（节省1.9GB）
  - 添加download_kernels.py自动下载脚本
  - 更新地球/火星/月球为100年数据
  - 修复Mars和外行星使用barycenter ID
