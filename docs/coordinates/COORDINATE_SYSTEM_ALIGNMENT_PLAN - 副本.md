# OPIC 多尺度宇宙坐标系对齐方案

> **状态**：审计修订版 v2
> **审计日期**：2026-06-19
> **目标读者**：OPIC 核心维护者
> **结论摘要**：方向正确，但 Draft v1 不能直接执行。它把 ICRF、ITRF、TEME、Supergalactic、CMB rest frame 和 Three.js 渲染世界混成了一条线，且有旋转符号、依赖能力、卫星帧、数据来源、CI ground truth 和工期估算方面的错误。本版给出能真正落地的修订方案。

---

## 0. 审计结论

OPIC 可以实现“地球、卫星、太阳系、恒星、银河系、本星系群和超星系团在同一视觉宇宙中方向一致”。但不能把所有对象粗暴塞进一个全局线性 Three.js 坐标值里，也不能要求所有数据“先变成 ICRF 再下推”作为唯一实现路径。正确做法是建立一个明确的 **Frame Graph**，把每种数据源按它自己的入口帧接入，再统一投影到 OPIC 的渲染世界。

Draft v1 的核心思想“需要统一惯性锚点”是对的；但以下点必须修正：

| 项目 | v1 问题 | 修订结论 |
|---|---|---|
| ICRF ↔ 黄道 | 写成 `R_x(+ε)`，但现有代码和标准主动旋转矩阵对应的是 `R_x(-ε)` | 不再用容易歧义的正负号描述，只写显式分量公式 |
| Three.js 世界系 | 文档声明 `Z` 是黄道北极，但项目大量代码按 Three.js `Y-up` 或对象局部 `Y` 轴建模 | 必须区分 `RenderWorld` 坐标基和对象局部几何坐标基 |
| Cesium 地球自转 | v1 说项目没有 ERA/GMST | `CameraSynchronizer.ts` 已使用 `Cesium.Transforms.computeIcrfToFixedMatrix`，问题主要在旧 `CoordinateTransformer.ts` 和卫星/对象桥接未统一 |
| `astronomy-engine` | v1 说它是 IAU 帧变换首选 | 当前项目未安装；地球 fixed/inertial 桥接应优先复用 Cesium，离线精密校验用 SOFA/ERFA/Astropy 或 SPICE |
| TLE/SGP4 | v1 说 `satellite.js` 已实现 TEME→ICRF | `satellite.js` 主要提供 SGP4 与 ECI/TEME-like、ECF/Geodetic 变换；没有直接给 OPIC 所需的 TEME→ICRF/GCRF 精密链 |
| 超星系坐标 | v1 说未实现 | 项目数据文件元数据已声明 Supergalactic Cartesian；缺的是 Supergalactic ↔ ICRS/ICRF ↔ RenderWorld 的统一桥接和测试 |
| CMB rest frame | v1 写 `icrfToCmb` 平移 | CMB rest frame 是速度/参考系概念，不是给天体位置做 `0.0012c` 平移的空间坐标系 |
| WebGeocalc CI | v1 建议每周在线调用 | CI 不应依赖外部在线服务；应生成离线 fixture，WebGeocalc/HORIZONS 仅用于刷新基准或人工核验 |
| 精度阈值 | v1 对恒星、卫星、星系团都用过高或不适用阈值 | 不同尺度采用不同验收标准：卫星受 TLE 误差限制，恒星若无 proper motion 不能承诺 `<1 arcsec` |
| 工期 | v1 估计 10-14 个工作日完成核心对齐 | “核心方向对齐”可 1-2 周；完整跨尺度、数据重建和回归测试更现实是 3-6 周 |

---

## 1. 当前项目事实

### 1.1 已存在的坐标实现

| 模块 | 当前行为 | 审计结论 |
|---|---|---|
| `src/lib/astronomy/ephemeris/coordinates.ts` | 提供 ICRF ↔ J2000 黄道的显式分量变换 | 数学方向基本正确，应抽到统一 `coordinates/frames/ecliptic.ts` 并保留旧文件 re-export |
| `src/lib/cesium/CameraSynchronizer.ts` | Three.js 相机 ↔ Cesium 相机，已经调用 `Cesium.Transforms.computeIcrfToFixedMatrix` | 这是当前最接近正确的 Cesium 桥接层，应成为唯一 Cesium 相机同步路径 |
| `src/lib/cesium/CoordinateTransformer.ts` | 正变换做黄赤交角，反变换仍是轴重映射；还保留 `debugRotationOffset` | 不能作为权威变换层，应改成薄包装或废弃 |
| `src/lib/satellite/sgp4Calculator.ts` | `satellite.propagate` 后执行 `(x, z, -y)` 轴映射 | 未显式处理 TEME、Earth fixed、ICRF、黄道世界之间的时间相关旋转 |
| `src/lib/3d/SatelliteLayer.ts` | 又额外套了 `rotationX(66.56°)` | 这是静态补偿，不是可验证帧变换 |
| `src/lib/exoplanets/coordinates.ts` | RA/Dec 直接映射到 Three.js | 没有统一进入 J2000 黄道世界，方向会与太阳系平面错开 |
| `src/lib/3d/scene-manager/StarsAlignmentCalculator.ts` | 硬编码多组魔法角度 | 应删除，用可测试矩阵替代 |
| `public/data/universe/metadata.json` | 声明大尺度数据为 `Supergalactic Cartesian` | 数据本身已经是一个明确入口帧，不是“裸数据” |
| `src/lib/3d/scene-manager/UniverseGroupManager.ts`、`galaxyConfig.ts` | 通过固定旋转让大尺度可视化看起来对齐 | 这些旋转需要被替换为 Supergalactic/Galactic 到 RenderWorld 的矩阵，或明确标记为艺术纹理朝向 |

### 1.2 最关键的架构矛盾

项目注释里同时存在两种世界约定：

1. 太阳系网格和轨道注释说：`X` 指春分点，`Y` 在黄道面内，`Z` 指黄道北极，黄道面是 `XY`。
2. Three.js 对象、相机、部分行星自转轴和局部几何代码默认使用 `Y-up`。

这两个约定不能混用。修复坐标系前，必须建立：

- `RenderWorld`：OPIC 的物理世界坐标基。
- `ObjectLocal`：Three.js mesh 自己的几何坐标基，通常是 `Y-up`。
- `WorldAdapter`：把物理世界坐标和对象局部姿态连接起来的薄层。

推荐保留现有太阳系物理约定作为 `RenderWorld`：

```text
OPIC RenderWorld, J2000 ecliptic, unit = AU
X = J2000 mean equinox / ecliptic longitude 0 deg
Y = ecliptic longitude 90 deg, inside ecliptic plane
Z = north ecliptic pole
```

Three.js mesh 可以继续 `Y-up` 建模，但所有物理位置、轨道法线、恒星方向、星系方向进入场景前必须先变换到 `RenderWorld`。

---

## 2. 目标架构：Frame Graph，而不是单一路径

### 2.1 原则

1. **ICRS/ICRF 是太阳系和恒星方向的惯性锚点**。J2000 太阳系、Gaia/Hipparcos、NASA Exoplanet Archive 的 RA/Dec 都应能进入这个锚点。
2. **ITRF/ECEF、TEME、Galactic、Supergalactic 是同级入口帧**。它们不是错误帧，而是需要明确边和时间参数的帧。
3. **RenderWorld 是渲染出口，不是天文学权威帧**。所有渲染对象最终进入 `RenderWorld`，但大尺度可使用分层 group 和局部原点，不共享同一组巨大 Float32 坐标。
4. **时间尺度按用途保留**。行星历表用 TT/TDB，地球姿态用 UT1/EOP 或 Cesium 提供的 fixed matrix，SGP4 用 TLE/UTC。不要把所有时间强行统一成 TDB。
5. **不同尺度使用不同验收精度**。TLE 本身误差可达公里级，星系距离误差可达 Mpc 级，不能用同一个 `1e-6 AU` 阈值衡量一切。

### 2.2 推荐目录

```text
src/lib/coordinates/
├── frames/
│   ├── ecliptic.ts          # ICRF/ICRS Cartesian ↔ OPIC RenderWorld
│   ├── fixed.ts             # Cesium ICRF ↔ Fixed/ECEF wrapper
│   ├── teme.ts              # SGP4 TEME-like ↔ Fixed/RenderWorld bridge
│   ├── galactic.ts          # ICRS ↔ Galactic, fixture from Astropy/ERFA
│   ├── supergalactic.ts     # ICRS/Galactic ↔ Supergalactic, fixture from Astropy
│   └── index.ts
├── time/
│   ├── julian.ts            # UTC Date ↔ JD UTC
│   ├── dynamical.ts         # UTC ↔ TT/TDB for ephemeris only
│   └── index.ts
├── scale/
│   ├── render-domain.ts     # per-scale origin, unit scale, fade policy
│   └── rtc.ts               # relative-to-center helpers
├── fixtures/
│   ├── jpl-vectors.json     # offline SPICE/HORIZONS fixtures
│   ├── astropy-frames.json  # galactic/supergalactic matrix fixtures
│   └── satellite-baselines.json
└── index.ts
```

`src/lib/astronomy/ephemeris/coordinates.ts` 先 re-export 新模块，避免一次性改穿全项目。

---

## 3. 必须固定的数学约定

### 3.1 ICRS/ICRF 球面坐标到笛卡尔

RA/Dec 输入使用 ICRS/ICRF 赤道惯性笛卡尔：

```text
alpha = RA
delta = Dec
d = distance

x_icrf = d * cos(delta) * cos(alpha)
y_icrf = d * cos(delta) * sin(alpha)
z_icrf = d * sin(delta)
```

不要直接把 `Dec` 放到 Three.js `y`，也不要引入 `z = -cos(dec)sin(ra)` 这类渲染私有映射。私有映射必须集中在 `frames/ecliptic.ts`。

### 3.2 ICRF ↔ OPIC RenderWorld

使用 J2000 mean obliquity：

```text
epsilon = 23.43928 deg

ICRF -> RenderWorld:
  x_w =  x_i
  y_w =  y_i * cos(epsilon) + z_i * sin(epsilon)
  z_w = -y_i * sin(epsilon) + z_i * cos(epsilon)

RenderWorld -> ICRF:
  x_i = x_w
  y_i = y_w * cos(epsilon) - z_w * sin(epsilon)
  z_i = y_w * sin(epsilon) + z_w * cos(epsilon)
```

按标准主动旋转矩阵 `R_x(theta) = [[1,0,0],[0,cos,-sin],[0,sin,cos]]`，第一组公式是 `R_x(-epsilon)`。为了避免实现者把符号写反，代码和文档都应优先使用显式分量和测试向量，而不是只写 `R_x(+/-epsilon)`。

测试向量：

```text
ICRF +X -> RenderWorld +X
ICRF +Z -> RenderWorld (0, sin(epsilon), cos(epsilon))
RenderWorld +Z -> ICRF (0, -sin(epsilon), cos(epsilon))
```

### 3.3 Cesium Fixed/ECEF

Cesium 的 `Cartesian3` 是 Earth fixed/ECEF。当前 `CameraSynchronizer.ts` 已经使用：

```text
Cesium.Transforms.computeIcrfToFixedMatrix(time)
```

修订后的策略：

1. `RenderWorld -> ICRF` 用 `frames/ecliptic.ts`。
2. `ICRF -> Fixed/ECEF` 用 Cesium matrix。
3. `Fixed/ECEF -> ICRF` 用该 matrix 的转置。
4. `ICRF -> RenderWorld` 用 `frames/ecliptic.ts`。
5. `CoordinateTransformer.ecefToSolarSystem` 不再允许轴重映射捷径。

注意：`computeIcrfToFixedMatrix` 可能在 EOP 数据未准备好时返回 `undefined`。初始化 Cesium 时应调用相关 preload 流程或显式 fallback，并把 fallback 标记为低精度模式。

### 3.4 TEME/SGP4 卫星

TLE + SGP4 的输出不是“J2000 ICRF”。`satellite.js` 文档和 API 习惯称其为 ECI，但对 SGP4 来说应按 TEME-like 惯性帧处理。

修订后的策略：

```text
TLE + UTC Date
  -> satellite.propagate(...)
  -> TEME-like km
  -> Earth fixed / ECF for Cesium ground overlay
  -> ICRF/RenderWorld for Three.js satellite layer
```

短期可落地路径：

1. 对 Cesium 地球上方的卫星，优先使用 `satellite.gstime(date)` + `satellite.eciToEcf(...)` 或 Cesium 的 `computeTemeToPseudoFixedMatrix`，使卫星与地球纹理一起按时间旋转。
2. 对 Three.js 太阳系视图中的卫星，先把 TEME-like 向量变到 fixed，再用同一时刻的 `Fixed -> ICRF -> RenderWorld` 回到 OPIC 世界。
3. 删除 `SatelliteLayer.ts` 中固定 `rotationX(66.56°)` 的静态补偿。
4. 保留 SatelliteRenderer 的“地球相对局部坐标 + pointCloud.position = earthPosition”做法，这是正确的 RTC 精度优化。

验收不应要求亚米级。TLE 数据和 SGP4 模型本身误差通常是公里级到更大；目标是方向、地固经纬度和可视相对位置一致。

### 3.5 行星、月球和天然卫星

OPIC 已有 `public/data/ephemeris` 多体星历和 polynomial chunk 流程。不要把前端直接读 `.bsp` 作为首选目标。

推荐：

1. 保留现有离线生成流程。
2. 在生成脚本中明确输出帧：ICRF/J2000 equatorial 还是 J2000 ecliptic。
3. 如果输出已经是 ecliptic RenderWorld，就在 manifest 里声明，禁止再转一次黄赤交角。
4. 使用 SPICE/HORIZONS 生成离线 fixture 做回归，不在 CI 每次联网调用。

### 3.6 Gaia/Hipparcos 恒星

Gaia DR3 是 ICRS 参考系，但 Gaia 源表有 `ref_epoch`，DR3 通常是 J2016.0。若验收标准要求 `<1 arcsec`，必须处理：

- parallax 或可靠距离；
- proper motion；
- radial velocity，如果需要三维速度或长时间跨度；
- epoch propagation，从 Gaia ref_epoch 到 OPIC 当前模拟时间或 J2000。

如果只是视觉方向一致，可以先使用 RA/Dec/distance 静态投影，但验收标准只能写成“视觉方向一致”或约 `<0.1 deg`，不能写 `<1 arcsec`。

### 3.7 系外行星

NASA Exoplanet Archive 的 host `ra`、`dec`、`sy_dist` 可用于宿主星位置。行星本身的轨道姿态不能普遍真实对齐，因为许多系统缺少完整三维轨道元素，尤其是升交点经度 `Omega`。

修订后的策略：

1. 宿主星：ICRS RA/Dec/distance -> ICRF Cartesian -> RenderWorld。
2. 系统局部：如果有完整 `i, Omega, omega, a/e/period`，可在宿主星局部构造真实轨道姿态。
3. 缺少 `Omega` 时，必须标注为 schematic orbit，不要声称物理朝向正确。

### 3.8 Galactic 和 Supergalactic

银河系和超星系团不应继续靠 `GalaxyRenderer` 和 `UniverseGroupManager` 的固定旋转凑方向。

推荐：

1. 用 Astropy/ERFA 离线生成 ICRS ↔ Galactic ↔ Supergalactic 的矩阵 fixture。
2. 在 TS 中只使用固定矩阵和往返测试，不手写未经验证的欧拉角组合。
3. 当前宇宙数据已经是 Supergalactic Cartesian，渲染时可以：
   - 把整个 Supergalactic group 通过 `supergalacticToRenderWorldMatrix` 定向；
   - 或在数据加载阶段把每个点预转换到 RenderWorld。
4. 银河系贴图如果是艺术纹理，需要区分“纹理朝向校准”和“物理坐标变换”。不要让纹理校准角污染坐标帧。

### 3.9 CMB rest frame

不要实现 `icrfToCmb` 位置平移。CMB 偶极描述的是太阳系/银河系相对 CMB 的速度，不是把星系位置统一平移 `0.0012c`。可观测宇宙尺度若要显示 CMB 或大尺度结构，应使用宇宙学坐标、红移距离和速度箭头，并明确这不是普通欧氏刚体坐标系。

---

## 4. 修订后的实施路径

### 阶段 1：建立最小帧核心，1-2 天

- 新建 `src/lib/coordinates/frames/ecliptic.ts`，实现显式分量公式。
- 新建 `src/lib/coordinates/frames/index.ts`，按项目约定使用命名导出。
- 让 `src/lib/astronomy/ephemeris/coordinates.ts` re-export 新实现，避免重复来源。
- 单元测试：
  - ICRF/RenderWorld 三个轴向已知点；
  - 往返误差 `< 1e-12 AU`；
  - 与现有 ephemeris 变换结果一致。

### 阶段 2：冻结 RenderWorld 约定，1-2 天

- 写入 `src/lib/coordinates/README.md` 或本文件的架构章节。
- 审计并修正文档注释中互相冲突的 `Y-up`、`Z-up`、黄道面描述。
- 建立 `ObjectLocal -> RenderWorld` 的辅助函数，避免 `Planet`、ring、orbit、grid 各自猜测默认轴。
- 暂不强行重写所有 mesh，只先把物理输入路径集中起来。

### 阶段 3：统一 Cesium 桥接，2-4 天

- 以 `CameraSynchronizer.ts` 的 `computeIcrfToFixedMatrix` 路径为准。
- 把 `CoordinateTransformer.ts` 改成调用统一 frame 函数的兼容层，或标记 deprecated。
- 删除或仅开发环境启用 `debugRotationOffset`。
- 修正 `ecefToSolarSystem`，确保与正变换在同一 `time` 参数下严格互逆。
- 添加 Cesium matrix 不可用时的低精度 fallback 和日志。

### 阶段 4：卫星链路，3-6 天

- 新建 `frames/teme.ts`。
- worker 输出保留 TEME-like km，不在 worker 里做私有轴映射。
- 主线程按用途转换：
  - Cesium overlay：TEME-like -> ECF/ECEF。
  - Three.js satellite layer：TEME-like -> ECEF -> ICRF -> RenderWorld。
- 删除 `rotationX(66.56°)` 静态补偿。
- 验收：
  - 与 `satellite.js` geodetic/ECF 结果一致到可视化可接受误差；
  - ISS 在 Cesium 地球上方经纬度与 ground track API 一致；
  - 时间推进时卫星不会相对地球纹理产生固定角偏差。

### 阶段 5：恒星和系外行星，3-5 天

- 修改 `exoplanets/coordinates.ts`，宿主星走 RA/Dec -> ICRF -> RenderWorld。
- 删除 `StarsAlignmentCalculator` 魔法角，或改为只服务 skybox texture 的艺术校准，不参与数据坐标。
- Gaia/Hipparcos 数据加载层记录 epoch、parallax、proper motion 字段。
- 系外行星局部轨道缺少 `Omega` 时标记 schematic。

### 阶段 6：银河系和超星系团，4-8 天

- 用 Astropy 离线生成 Galactic/Supergalactic 矩阵 fixture。
- 当前 `public/data/universe/*.bin` 保持 Supergalactic Cartesian，但加载后通过统一矩阵进入 RenderWorld。
- 替换 `UniverseGroupManager` 的固定 58 度旋转。
- 区分“银河系贴图朝向”与“银河系坐标帧”。贴图可以有局部校准，但物理点位不能跟着艺术角一起转。

### 阶段 7：尺度和精度，持续推进

- 保留并扩展现有卫星点云的 RTC 模式。
- 每个尺度一个 render domain：太阳系、恒星、银河系、Supergalactic、本地宇宙。
- 不把 `1e26 m` 级别数据直接写入同一个 Float32 GPU buffer。
- Three.js CPU `Vector3` 是 JS number 双精度；真正会爆的是 GPU attribute 的 Float32、深度缓冲和相机 near/far 比值。文档和测试要按这个现实描述。

### 阶段 8：离线 fixture 与回归测试，2-4 天

- 不在普通 CI 中调用 WebGeocalc。
- 用 SPICE/HORIZONS、Astropy/ERFA、satellite.js 生成固定 JSON fixture，提交到仓库或测试资源。
- 增加可手动运行的“刷新 fixture”脚本，联网更新基准。
- 对每个 frame 函数做：
  - 往返测试；
  - 已知轴测试；
  - fixture 对比；
  - 单位和量纲测试。

---

## 5. 数据流修订表

| 对象 | 入口数据 | 入口帧 | 修订后的接入 |
|---|---|---|---|
| Cesium 地球表面 | WGS84/ECEF | ITRF/ECEF | ECEF ↔ ICRF 用 Cesium matrix，ICRF ↔ RenderWorld 用 `frames/ecliptic.ts` |
| 人造卫星 | TLE + UTC | TEME-like | `satellite.propagate` -> TEME-like km -> ECEF 或 RenderWorld，禁止静态角补偿 |
| 行星/月球 | OPIC ephemeris chunks | 必须由 manifest 声明 | 如果是 ICRF 则转 RenderWorld；如果已是 ecliptic 则直通 |
| 天然卫星 | OPIC ephemeris chunks 或解析轨道 | planet-centric + parent frame | 先转父天体同一 frame，再加父天体位置 |
| 恒星 | Gaia/Hipparcos | ICRS + epoch | epoch propagation 后 ICRS -> RenderWorld |
| 系外行星宿主星 | NASA Exoplanet Archive | ICRS | RA/Dec/sy_dist -> RenderWorld |
| 系外行星轨道 | NASA Archive orbital fields | 局部系统帧 | 完整元素才真实定向，缺 `Omega` 则 schematic |
| 银河系贴图 | Gaia map/艺术纹理 | 图像局部帧 | 纹理局部校准，不作为物理坐标系 |
| 本星系群/星系团 | `.bin` + raw data | Supergalactic Cartesian | Supergalactic group -> RenderWorld 或加载时逐点转换 |
| 可观测宇宙 | 红移/宇宙学数据 | cosmological/redshift | 独立宇宙学 domain，不实现 `icrfToCmb` 平移 |

---

## 6. 验收标准

### 必须通过

1. `frames/ecliptic.ts` 往返误差 `< 1e-12 AU`。
2. `CoordinateTransformer` 和 `CameraSynchronizer` 不再出现互相矛盾的正反变换。
3. `SatelliteLayer.ts` 不再使用 `rotationX(66.56°)` 这类静态补偿。
4. `StarsAlignmentCalculator` 的魔法角不再影响真实恒星或系外行星数据坐标。
5. 任一 RA/Dec 输入的宿主星方向在 RenderWorld 中与统一 ICRS->ecliptic 公式一致。
6. Supergalactic 数据有明确的 `supergalacticToRenderWorld` 路径，`UniverseGroupManager` 不再用裸固定旋转伪装坐标变换。

### 精度建议

| 场景 | 建议阈值 |
|---|---|
| ICRF ↔ RenderWorld 数学变换 | `< 1e-12 AU` 往返 |
| Cesium camera ECEF ↔ RenderWorld | 同一时间下 `< 1e-9 AU` 或米级，取决于 Cesium matrix 可用性 |
| 卫星地固位置 | 与 satellite.js/Cesium fixed 基准一致到公里级或更好 |
| 恒星静态方向 | 未做 proper motion 时只承诺视觉一致，约 `<0.1 deg` |
| Gaia 高精度方向 | 做 epoch/proper motion 后再承诺 `<1 arcsec` |
| Supergalactic 大尺度方向 | 主轴和已知对象方向 `<0.1 deg` |

---

## 7. 不做什么

- 不在浏览器端直接加载完整 SPICE `.bsp` 作为首选路径；继续使用离线生成的轻量数据。
- 不把所有时间尺度强行统一为 TDB；按用途区分 UTC、TT/TDB、UT1/fixed matrix。
- 不在 CI 常规流程中调用 WebGeocalc/HORIZONS。
- 不把 CMB rest frame 当作普通三维位置坐标系。
- 不用固定欧拉角修补真实数据坐标。艺术纹理可以局部校准，但必须与物理 frame 分离。

---

## 8. 参考资料

- CesiumJS Transforms API：`computeIcrfToFixedMatrix`、`computeTemeToPseudoFixedMatrix`
  https://cesium.com/learn/cesiumjs/ref-doc/Transforms.html
- NAIF SPICE Frames Required Reading：J2000、ICRF、frame definitions
  https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/frames.html
- IAU SOFA：Earth attitude、precession/nutation、time scale algorithms
  https://www.iausofa.org/
- JPL Planetary and Lunar Ephemerides / DE440
  https://ssd.jpl.nasa.gov/planets/eph_export.html
- satellite.js：SGP4、ECI/ECF、GMST API
  https://github.com/shashwatak/satellite-js
- Gaia DR3 Gaia source data model：ICRS astrometry、`ref_epoch`、proper motion fields
  https://gea.esac.esa.int/archive/documentation/GDR3/Gaia_archive/chap_datamodel/sec_dm_main_source_catalogue/ssec_dm_gaia_source.html
- NASA Exoplanet Archive Planetary Systems column definitions：`ra`、`dec`、`sy_dist` 等宿主星字段
  https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html
- Astropy Coordinates：Galactic/Supergalactic frame definitions and verified transformations
  https://docs.astropy.org/en/stable/coordinates/
