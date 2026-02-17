# 项目文件整理计划

## 根目录文件分类

### 保留的配置文件
- `.gitignore` - Git配置
- `eslint.config.mjs` - ESLint配置
- `jest.config.js` - Jest测试配置
- `LICENSE` - 许可证
- `next-env.d.ts` - Next.js类型定义
- `next.config.ts` - Next.js配置
- `package.json` - 项目依赖
- `package-lock.json` - 依赖锁定
- `postcss.config.mjs` - PostCSS配置
- `tsconfig.json` - TypeScript配置
- `测试.bat` - 用户要求保留
- `推.txt` - 用户要求保留

### 需要移动到docs/的文档文件
- `FINAL_EPHEMERIS_UPDATE.md` → `docs/`
- 所有其他.md文件（如果有）

### 需要移动到scripts/tests/的测试文件
- `check-de440-bodies.py`
- `check-jd-dates.py`
- `test-enceladus-orbit.py`
- `test-ephemeris-file.py`
- `test-mars-spice.py`
- `test-sampling-aliasing.py`
- `test-satellite-orbits.py`
- `verify-new-ranges.py`
- `verify-triton-orbit.py`
- `visualize-enceladus-orbit.py`

### 需要移动到docs/images/的图片文件
- `enceladus_orbit_visualization.png`
- `sampling_aliasing_demo.png`

## kernels文件夹
**大小**: 约1.9GB
**用途**: 仅用于生成星历数据（已完成）
**决定**: 可以删除，因为：
1. 所有星历数据已生成（public/data/ephemeris/*.bin.gz）
2. 应用运行时不需要这些内核
3. 如果将来需要重新生成，可以用download_kernels.py重新下载
4. 节省约1.9GB空间

**保留方式**: 在README中说明如何重新下载

## scripts文件夹清理

### 保留的脚本
- `download_kernels.py` - 下载SPICE内核（如需重新生成数据）
- `generate-all-bodies-ephemeris.py` - 生成星历数据的主脚本
- `generate-manifest.py` - 生成manifest.json
- `README.md` - 脚本说明文档
- `EPHEMERIS_DATA_GENERATION.md` - 数据生成文档

### 可以删除的脚本（已过时）
- `generate-jupiter-ephemeris-simple.py` - 旧版本
- `generate-jupiter-ephemeris.py` - 旧版本
- `fix-universe-data-parsing.py` - 一次性修复脚本

### 删除的目录
- `scripts/public/` - 不应该在scripts中

## 执行顺序
1. 创建 scripts/tests/ 目录
2. 创建 docs/images/ 目录
3. 移动测试文件到 scripts/tests/
4. 移动图片文件到 docs/images/
5. 移动文档文件到 docs/
6. 删除过时的scripts文件
7. 删除 scripts/public/ 目录
8. 删除 kernels/ 目录（节省1.9GB）
9. 更新 README.md 说明如何重新下载kernels
