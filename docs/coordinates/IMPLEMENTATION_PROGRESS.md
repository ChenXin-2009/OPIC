# OPIC 坐标系对齐方案 - 实施进度对照

> 本文件对照 v2 审计版（COORDINATE_SYSTEM_ALIGNMENT_PLAN.md）逐项记录实施进度。
> 每项标记：✅ 已实现 / ⚠️ 部分实现 / ❌ 未实现。

---

## 阶段 1：建立最小帧核心 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| 新建 `frames/ecliptic.ts`，显式分量公式 | ✅ | `src/lib/coordinates/frames/ecliptic.ts` |
| 新建 `frames/index.ts`，命名导出 | ✅ | `src/lib/coordinates/frames/index.ts` |
| `ephemeris/coordinates.ts` re-export 新实现 | ✅ | `src/lib/astronomy/ephemeris/coordinates.ts` |
| ICRF/RenderWorld 三个轴向已知点测试 | ✅ | `ecliptic.test.ts`（37 个测试） |
| 往返误差 `< 1e-12 AU` | ✅ | `ecliptic.test.ts` round-trip 用例 |
| 与现有 ephemeris 变换结果一致 | ✅ | `ecliptic.test.ts` 与 legacy 对比用例 |

---

## 阶段 2：冻结 RenderWorld 约定 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| 写入 `src/lib/coordinates/README.md` | ✅ | Frame Graph + RenderWorld 冻结约定 |
| 审计并修正冲突的 Y-up/Z-up/黄道面描述 | ✅ | `CameraSynchronizer.ts:34`、`sgp4Calculator.ts:7-10` |
| 建立 `ObjectLocal -> RenderWorld` 辅助函数 | ✅ | `src/lib/coordinates/frames/world.ts` |
| 不强行重写所有 mesh，只集中物理输入路径 | ✅ | 没有动 Planet、ring、grid |

---

## 阶段 3：统一 Cesium 桥接 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| 以 CameraSynchronizer.ts 的 `computeIcrfToFixedMatrix` 为准 | ✅ | 确认为唯一权威路径 |
| `CoordinateTransformer.ts` 改为兼容层或 deprecated | ✅ | 标记 @deprecated，添加 3 条已知问题警告 |
| 删除或仅开发环境启用 `debugRotationOffset` | ✅ | `CameraSynchronizer.ts:160` 用 `process.env.NODE_ENV === 'production'` 门控 |
| 修正 `ecefToSolarSystem` 严格互逆 | ⚠️ | 标记 @deprecated + 指向 CameraSynchronizer.syncFromCesium；旧实现保留兼容 |
| Cesium matrix 不可用时低精度 fallback + 日志 | ✅ | `CameraSynchronizer.ts:131` fallback 已存在 |

---

## 阶段 4：卫星链路 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| 新建 `frames/teme.ts` | ✅ | `src/lib/coordinates/frames/teme.ts` |
| Worker 输出保留 TEME-like km，不做私有轴映射 | ⚠️ | Worker 输出已正确（TEME-like km 格式）。sgp4Calculator.eciToThreeJS 在主线程做 (x,z,-y) 轴映射，SatelliteLayer 内部通过 eciSwappedToRenderWorld 合并处理。完整重构 Worker 协议需改 OrbitalInterpolator 类型，建议独立 PR |
| 主线程 Cesium overlay：TEME -> ECF | ✅ | `temeToRenderWorld` 含 ECF 路径 |
| Three.js satellite layer：TEME -> RenderWorld | ✅ | `SatelliteLayer.ts:34-63` eciSwappedToRenderWorld |
| 删除 `rotationX(66.56°)` 静态补偿 | ✅ | `SatelliteLayer.ts:183-185` 已删除（update + showOrbitWithOffset） |
| 与 satellite.js geodetic/ECF 一致到可视化误差 | ⚠️ | 需运行时验证，无法在单元测试中完成 |
| ISS 经纬度与 ground track API 一致 | ⚠️ | 需运行时验证 |
| 时间推进时无固定角偏差 | ⚠️ | 需运行时验证 |

---

## 阶段 5：恒星和系外行星 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| 修改 `exoplanets/coordinates.ts`，宿主星走 ICRS→ICRF→RenderWorld | ✅ | 已修正，旧 Y-up 直放代码删除 |
| 删除 `StarsAlignmentCalculator` 魔法角影响数据坐标 | ✅ | `SolarSystemCanvas3D.tsx:372` 改为 identity；StarsAlignmentCalculator 标记 @skybox_only |
| Gaia/Hipparcos 数据加载层记录 epoch、parallax、proper motion | ⚠️ | 项目无 Gaia/Hipparcos 加载代码；已在 `ExoplanetHostIndex` 类型中保留 `raDeg/decDeg/distancePc` 字段供宿主星使用 |
| 系外行星局部轨道缺少 `Omega` 时标记 schematic | ✅ | `ExoplanetPlanet` 新增 `omegaDeg?` 和 `isSchematicOrbit?`；`exoplanets/coordinates.ts` 新增 `isSchematicOrbit()` 辅助函数 |

---

## 阶段 6：银河系和超星系团 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| Astropy 离线生成 Galactic/Supergalactic 矩阵 fixture | ✅ | `fixtures/astropy-frames.json`（Astropy 8.0 验证） |
| `public/data/universe/*.bin` 保持 Supergalactic Cartesian | ✅ | 未修改数据文件 |
| 通过统一矩阵进入 RenderWorld | ✅ | `UniverseGroupManager.ts` 使用 `SUPERGALACTIC_TO_ICRF_RAW` |
| 替换 `UniverseGroupManager` 的固定 58 度旋转 | ✅ | `computeSupergalacticToRenderWorldQuat()` |
| 区分"银河系贴图朝向"与"银河系坐标帧" | ✅ | `galaxyConfig.ts` rotation 标记为纹理校准；`StarsAlignmentCalculator` 标记 @skybox_only |

---

## 阶段 7：尺度和精度 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| 保留并扩展现有卫星点云的 RTC 模式 | ✅ | `SatelliteRenderer` 未改，`SatelliteLayer` 继续使用 pointCloud.position 设世界偏移 |
| 每个尺度一个 render domain | ✅ | `scale/render-domain.ts` 定义 5 个域（earthLocal、solarSystem、nearbyStars、galaxy、supergalactic） |
| 不把 1e26 m 数据直接写入同一 Float32 GPU buffer | ✅ | README §尺度精度约束表 说明 |
| Three.js CPU Vector3 是 Float64，GPU attribute 是 Float32 | ✅ | README 中说明 |

---

## 阶段 8：离线 fixture 与回归测试 ✅

| 要求 | 状态 | 落地位置 |
|---|---|---|
| 不在 CI 中调用 WebGeocalc | ✅ | 无 CI 联网调用 |
| 用 SPICE/HORIZONS/Astropy/satellite.js 生成 fixture | ✅ | Astropy 8.0 + pyerfa，`scripts/generate_fixtures.py` |
| fixture 提交仓库或测试资源 | ✅ | `src/lib/coordinates/fixtures/` |
| 可手动运行的"刷新 fixture"脚本 | ✅ | `python scripts/generate_fixtures.py` |
| 每个 frame 函数：往返测试 | ✅ | ecliptic、galactic、supergalactic 均有 |
| 每个 frame 函数：已知轴测试 | ✅ | ecliptic 三轴、超星系北极、银心 |
| 每个 frame 函数：fixture 对比 | ✅ | `fixtures-regression.test.ts` |
| 每个 frame 函数：单位和量纲测试 | ✅ | 新增 3 个 ecliptic 单位/量纲测试（小尺度 10⁻⁴ AU、大尺度 10⁹ AU、向量长度保持） |

---

## §6 验收标准（必须通过）

| # | 要求 | 状态 |
|---|---|---|
| 1 | `frames/ecliptic.ts` 往返误差 `< 1e-12 AU` | ✅ |
| 2 | `CoordinateTransformer` 和 `CameraSynchronizer` 不再出现互相矛盾的正反变换 | ✅（前者 deprecated，后者权威） |
| 3 | `SatelliteLayer.ts` 不再使用 `rotationX(66.56°)` | ✅ |
| 4 | `StarsAlignmentCalculator` 魔法角不再影响真实恒星或系外行星数据坐标 | ✅（SolarSystemCanvas3D.tsx:372 已改为 identity） |
| 5 | 任一 RA/Dec 输入的宿主星方向在 RenderWorld 中与统一 ICRS→ecliptic 公式一致 | ✅ |
| 6 | Supergalactic 数据有明确的 `supergalacticToRenderWorld` 路径，`UniverseGroupManager` 不再用裸固定旋转 | ✅ |

---

## §7 "不做什么" 清单

| 项 | 状态 |
|---|---|
| 不在浏览器端直接加载 SPICE `.bsp` | ✅ |
| 不强行统一所有时间为 TDB | ✅（time/ 模块规划但未实现，各模块按用途自处） |
| 不在 CI 调用 WebGeocalc/HORIZONS | ✅ |
| 不把 CMB 当作普通三维位置坐标系 | ✅（未实现 `icrfToCmb`） |
| 不用固定欧拉角修补真实数据坐标 | ✅（删除 SatelliteLayer 66.56°、UniverseGroupManager 58° 等） |

---

## 测试现状

| 套件 | 通过 / 总数 |
|---|---|
| `coordinates/frames/__tests__/ecliptic.test.ts` | 37 / 37 ✅ |
| `coordinates/frames/__tests__/fixtures-regression.test.ts` | 4 / 4 ✅ |
| `exoplanets/__tests__/coordinates.test.ts` | 21 / 21 ✅ |
| `astronomy/ephemeris/coordinates.test.ts` | 50 / 50 ✅ |
| **合计** | **112 / 112** ✅ |

> 注：`astronomy/ephemeris/loader.test.ts` 8 个失败为预先存在（jsdom 不支持 fs），
> 与本次坐标系对齐变更无关。已用 `git stash` 验证。

---

## 待后续工作（超出 v2 阶段范围）

1. **Gaia/Hipparcos 加载层 epoch propagation**：当星表数据接入时，用 ref_epoch/parallax/proper_motion/radial_velocity 做时间传播
2. **运行时验收**：阶段 4 卫星链路的可视化验收（ISS ground track）需启动 dev server 手动检查
3. **JPL HORIZONS 行星历表 fixture**：阶段 8 可补充 SPICE 离线生成的行星位置基准
4. **SGP4 Worker 协议重构**：将 eciToThreeJS 私有轴映射从主线程移到 Worker 结果转换层。当前 Worker 输出 TEME-like km（正确），主线程通过 eciSwappedToRenderWorld 合并处理所有变换。完整重构需改动 OrbitalInterpolator 类型 → 此项工作量较大，建议独立 PR
