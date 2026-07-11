# OPIC 航天飞行 MOD：可行性评估、技术难点与实施方案

> 本文档基于对 `github.com/ChenXin-2009/OPIC` 仓库当前代码（非文档描述、非泛化假设）的实际检查得出。所有引用的路径、常量、阈值均来自实际源码，标注了"已具备 ✅ / 需新建 🆕 / 需验证 ⚠️"三种状态，便于区分"已有基础"和"真正的新工作量"。

---

## 0. 总体结论

**可以做，而且比典型的"网页里塞一个 KSP"要现实得多** —— 原因不是 Three.js/Cesium 本身适合做飞行模拟（它们不是专门为此设计的引擎），而是 OPIC 在过去的开发中，为了做卫星追踪、月球探索、引力网格可视化，已经**顺带建好了轨道力学游戏最难的三块地基**：高精度多体星历、经过审计的坐标系 Frame Graph、以及一个权限完整的 MOD 插件系统。这三块东西如果是从零开始写，本身就是几周到几个月的工作量。

但也要说清楚：**这仍然是一个大型工程**。真正缺的不是"能不能连接现有系统"，而是**火箭飞行本身的数值仿真核心**（变推力、变质量、大气阻力下的数值积分）、**载具/部件模型**、**搭建器 UI**——这些在 OPIC 里完全不存在，需要从零设计。规模上，这个 MOD 单独做完（含登月）大概率会超过 OPIC 主项目当前的复杂度。建议按第 4 节的阶段划分推进，第一阶段（地球发射入轨）本身就是一个可以独立验收、独立决定"是否继续"的里程碑。

---

## 1. OPIC 现有基础设施盘点（这是本文档区别于通用方案的核心部分）

### 1.1 坐标系与参考系 —— ✅ 基本就绪，且是近期刚审计加固过的

`docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md`（审计版 v2，2026-06-19）和对应的 `IMPLEMENTATION_PROGRESS.md` 显示，OPIC 已经建立了一套明确的 **Frame Graph**，并且 8 个阶段中 7 个已经 ✅ 完成、112/112 个坐标测试通过：

| 组件 | 路径 | 状态 |
|---|---|---|
| RenderWorld 定义（J2000 黄道，单位 AU） | `src/lib/coordinates/frames/ecliptic.ts` | ✅ 往返误差 < 1e-12 AU，37 个测试 |
| Cesium ICRF↔ECEF 桥接 | `src/lib/cesium/CameraSynchronizer.ts`（`computeIcrfToFixedMatrix`） | ✅ 唯一权威路径 |
| 卫星 TEME 帧 | `src/lib/coordinates/frames/teme.ts` | ✅ |
| RTC（Relative-To-Center）精度模式 | `src/lib/coordinates/scale/render-domain.ts` | ✅ `earthLocal` 域已定义 |
| 多体高精度星历（JPL DE440） | `src/lib/astronomy/ephemeris/` | ✅ 27 个天体，manager/interpolator/chunk-loader 齐全 |

**这对火箭 MOD 意味着什么**：飞船在地心惯性系下的位置、速度，最终都要转换到 RenderWorld 才能渲染——这条转换链路已经存在且经过测试，不需要重新发明。`render-domain.ts` 里已经定义了 `earthLocal` 渲染域：

```ts
earthLocal: {
  unitScale: 1 / 149597870.7,  // 米 → AU
  exitDistanceAU: 0.01,         // ≈ 1,495,979 km（覆盖到月球轨道之外）
  useRTC: true,                 // 卫星已经在用这个模式
}
```

这正是火箭在近地/地月转移阶段做物理积分应该使用的坐标系约定（地心惯性系，米为单位，RTC 方式渲染）——卫星渲染器已经用这套模式跑了很久，直接复用同一模式即可，不需要重新设计精度方案。

**🆕 需要新建的部分**：`RENDER_DOMAINS` 目前只有 `earthLocal / solarSystem / nearbyStars / galaxy / supergalactic` 五个域，**没有 `moonLocal`**。飞船抵达月球附近、执行动力下降和着陆时，需要一个以月球为中心的 RTC 域（否则月面着陆阶段会退化到用 `solarSystem` 精度渲染厘米级的着陆过程，浮点误差会很明显）。这是对现有模式的直接复制扩展，工作量不大，但必须做。

### 1.2 引力常数与开普勒力学 —— ✅ 数据已具备，⚠️ 但只有"单向"能力

`src/lib/3d/player/gravity.ts` 已经包含（数据来源 NASA JPL Planetary Fact Sheet / JPL SSD）：

```ts
GM_KM3_S2 = {
  sun: 1.32712440018e11, earth: 3.986004418e5, moon: 4.902800066e3,
  mars: 4.282837e4, jupiter: 1.26686534e8, ... // 含木星/土星/天王星多颗卫星
}
```

`src/lib/astronomy/utils/kepler.ts` 与 `src/lib/astronomy/orbit/mechanics.ts` 已有 `solveKeplerEquation`、`eccentricToTrueAnomaly`、`heliocentricDistance`、`calculatePosition`。

**关键限制**：这套开普勒力学是**单向**的——「已知固定轨道根数 → 计算某时刻位置」，这是画行星轨道用的（行星轨道根数不因为你的操作而改变）。火箭飞行需要的是相反且更复杂的能力：

1. 状态矢量（位置+速度）↔ 轨道根数的**双向**转换（每次点火后要知道"现在在什么轨道上"，用于 UI 显示远/近拱点）——**不存在，需新建**
2. 变推力、变质量、有阻力时的**数值积分**（不是解析开普勒轨道传播）——**完全不存在，需新建**

这是整个项目里最核心的"真空区"，详见第 3.1 节。

### 1.3 MOD 插件系统 —— ✅ 能力远超"加个可视化图层"的预期

`src/lib/mod-manager/`（14 个子模块，`AGENTS.md` 有清单）提供的能力，经过实际读取 `RenderAPI.ts` 类型定义和 `gravity-grid` 这个**已上线 MOD** 的源码验证：

| 能力 | 接口 | 验证方式 |
|---|---|---|
| 直接拿到原始 Three.js 场景/相机/渲染器 | `context.render.getScene()/getCamera()/getRenderer()` | `gravity-grid/index.ts` 里实际 `scene.add(...)`、挂载 `TransformControls` |
| 每帧回调（物理积分循环的挂载点） | `context.render.onBeforeRender(cb)` | 同上，`gravity-grid` 用它每帧读取天体位置并更新渲染 |
| 自定义窗口（React 组件，VAB 风格搭建器可以做成这个） | `contributes.windows` + 组件导出 | `MOD_DEVELOPMENT_GUIDE.md` |
| 服务注册表（跨 MOD 调用） | `context.registerService/getService` | 可以把"飞行动力学核心"和"搭建器 UI"拆成两个协作 MOD |
| 事件总线 | `context.emit/on` | `gravity-grid` 用它做窗口开关 |
| 资源配额**可覆盖**（不是写死的） | `Sandbox.initialize(modId, quota?: Partial<ResourceQuota>)` | 读取 `sandbox/Sandbox.ts` 源码确认 `{...DEFAULT_QUOTA, ...quota}` 合并逻辑 |
| 直接读取 Zustand store（不是完全隔离沙箱） | `useSolarSystemStore.getState().celestialBodies` | `gravity-grid` 里直接 import 使用 |

**具体数字**：默认配额 `maxRenderObjects: 1000`、`maxMemoryMB: 50`，但 manifest 里的 `resourceQuota` 字段可以覆盖默认值（类型定义在 `mod-manager/types.ts:136`）。一枚多级火箭 + 部件网格 + 轨迹线 + 碎片，超过 1000 个渲染对象是有可能的（尤其是轨迹预测线用大量点段渲染时），需要在 manifest 里显式声明更高配额，这是**支持的**，不是障碍。

**⚠️ 需要验证/新建的缺口**：
- `context.render.onBeforeRender(callback: () => void)` **不传 deltaTime**，物理循环需要自己维护时钟（工作量很小，但要注意）。
- `CameraAPI`（`mod-manager/types.ts:292`）的真实签名是 `cameraDistance / viewOffset / zoom / centerOnPlanet(name) / onCameraChange`——是一个"围绕命名天体的距离-偏移-缩放"模型，**不支持自由 6 自由度跟随任意动态对象**。`centerOnPlanet` 只接受天体名字，飞船不是天体。这意味着火箭的"追踪镜头"大概率要绕过高层 CameraAPI，直接操作 `context.render.getCamera()` 拿到的原始 `THREE.Camera`（`gravity-grid` 已经证明这条路径可行）。**这是一个文档（`MOD_DEVELOPMENT_GUIDE.md` 里写的 `flyTo`/`lookAt`/`getPosition`/`getTarget`）与实际代码不一致的地方**——那些方法在真实的 `CameraAPI` 接口里不存在，设计时不要依赖文档描述，以 `types.ts` 为准。
- `CesiumLayerOptions.type` 只有 `'imagery' | 'terrain'` 两种，**MOD 系统没有暴露 Cesium 原生 Entity/Primitive 接口**，也没有 `getCesiumViewer()`。见 1.4 节，这个缺口有绕过方案。

### 1.4 双引擎切换的真实实现（比文档描述精确得多，这一点很重要）

`docs/ARCHITECTURE.md` 写的是"< 0.1 AU → Cesium 模式"，但**实际代码**（`src/lib/3d/SceneModeManager.ts`）是这样的：

```ts
const DEFAULT_CONFIG = {
  cesiumModeDistanceThreshold: 0.000076,  // ≈ 距地心 11,369 km（海拔 ≈ 4,991 km）
  threeModeDistanceThreshold: 0.000096,   // ≈ 距地心 14,361 km（滞回区间防抖）
  transitionDuration: 0,                   // 即时切换，不是文档说的"淡入淡出"
};
```

换算成实际意义：**只有海拔 0～约 5,000 km 这一段（发射到低轨/中轨早期）会处于 `CESIUM_DOMINANT` 模式**；一旦超过约 8,000 km 海拔（GEO、地月转移轨道、月球，全部远超这个阈值），场景切回 `THREE_DOMINANT`。月球本身距地心约 384,400 km（0.00257 AU），远超两个阈值，全程都在 Three.js 主导模式下——**登月阶段不涉及 Cesium 渲染问题，只有发射与低轨爬升那一段需要处理**。

更关键的一点：模式名称是 `THREE_DOMINANT`（Three.js 为主场景，Cesium 作为"嵌入元素"）和 `CESIUM_DOMINANT`（反过来）——**不是"二选一互斥"，而是两个 canvas 通过 CSS 层叠共存**（`cesium-canvas-overlay.*.test.ts` 验证了 Cesium canvas 是 `z-index: 2` 的覆盖层，不是纹理烘焙进 Three.js）。

**这意味着**：理论上，一枚在 `earthLocal` RTC 域里正确计算出位置的火箭网格，通过 MOD 的 `registerRenderer` 加入 Three.js 场景后，**在 `CESIUM_DOMINANT` 模式下也应该能叠加显示在真实地球影像之上**——因为 Three.js 层并没有被杀死，只是变成"嵌入元素"。这如果成立，就绕开了 1.3 节提到的"MOD 拿不到 Cesium 原生渲染接口"的问题，不需要扩展 Cesium 那一侧的 API。

**⚠️ 这是本文档里最重要的一条"需验证"项**：我没有启动开发服务器做运行时验证，无法 100% 确认 `CESIUM_DOMINANT` 模式下 Three.js 叠加层是否每帧都在真实重绘（还是仅在切换瞬间保留最后一帧、之后暂停以省性能）。**强烈建议作为 Phase 0 的第一个 spike**：写一个最小 MOD，在 `CESIUM_DOMINANT` 模式下用 `registerRenderer` 画一个跟随相机的立方体，肉眼确认是否能在真实地球影像上正确叠加、跟随。如果不行，退路是"火箭飞行期间强制锁定 `THREE_DOMINANT`"（牺牲发射阶段的真实地表影像，换取正确性），技术上不难但体验会打折扣。

### 1.5 现成可复用的"零件"

| 资产 | 路径 | 对火箭 MOD 的价值 |
|---|---|---|
| 真实的月球着陆点数据库 | `src/lib/astronomy/lunar-sites.ts`（阿波罗 11/12/14/15/16/17、勘测者 1/3、月球 9 号、嫦娥 3/4/5 号，均带真实月面坐标） | 直接作为"选择着陆目标"UI 的候选点/参照系，"落点精度打分"可以直接算与这些历史点的距离 |
| 月面标记渲染器 | `src/lib/3d/MoonSiteMarkers.ts`（159 行，非占位代码） | 复用同一套"在天体表面标记一个经纬度坐标"的渲染模式，登月目标选择 UI 可以直接用这个模式 |
| 引力场计算的真实先例 | `src/lib/mods/gravity-grid/GravityFieldCalculator.ts` | 已经在做"读取多天体位置、求和引力效应"这件事，是多体引力仿真在这个代码库里的第一个真实先例 |
| Rust→WASM→Worker 的完整范式 | `rust-sgp4/`（`Cargo.toml` + `lib.rs`）+ `public/wasm/opic_sgp4_*` + `public/workers/sgp4.*.worker.js` | 见 3.1 节，新的物理引擎 crate 直接照抄这个范式 |
| "自由飞行"输入映射（WASD→推力/平移/偏航/俯仰/横滚/加速） | `src/lib/3d/player/PlayerInput.ts` | 键位方案和火箭姿态控制几乎是同一套语义，但**目前没有任何消费者**（搜索确认它没被任何控制器/物理循环调用）——是搭好但没接线的半成品，可以直接拿来做火箭的键盘输入层 |
| 程序化验证脚本范式 | `test/verify-backend.ts` 等（`✓`/`❌` 结构化输出，AI agent 可直接跑脚本读退出信息，不需要看截图） | 与你在其他项目中强调的"新功能必须有非视觉、程序化反馈"的架构约束完全一致，第 3.9 节会具体展开怎么把这个约束落到火箭物理引擎上 |
| 属性测试库已在依赖中 | `package.json` → `fast-check ^4.4.0`（devDependencies） | 非常适合验证物理不变量（能量守恒、角动量守恒），见 3.9 节 |

### 1.6 明确不存在、需要从零建的部分

为了不留模糊地带，这里直接列清单（这些不是"某个文件写得不好"，是真的没有）：

- 数值 ODE 积分器（RK4/RK45 等）——搜索仓库内 `KEPLER_TOLERANCE` 相关调用，只找到解析开普勒传播，没有任何数值积分代码
- 状态矢量↔轨道根数双向转换
- 火箭方程（Tsiolkovsky）/ 分级 / 载具部件质量模型
- 大气模型（进而阻力、动压）
- 引力影响球（SOI）判定与坐标系切换逻辑，或者 n-body 数值积分（二选一，见 3.2 节）
- 发射场坐标数据库（Cape Canaveral、拜科努尔、库鲁、酒泉、文昌等）——`package.json`/`src` 中搜索无结果，好在这只是静态数据，模式可以照抄 `lunar-sites.ts`
- 载具搭建器 UI（VAB 风格）
- `moonLocal` RTC 渲染域（1.1 节提到）

---

## 2. 这个 MOD 到底在解决什么问题（范围界定）

用户操作链条：**选发射场（地球表面） → 搭建火箭（选部件、分级） → 发射 → 上升段（穿越大气）→ 入轨 → （可选）机动/转移 → 抵达月球或其他行星 → 下降/着陆**。

对应到工程模块，大致是：

1. 载具建模（部件目录、质量、推力、Isp、气动系数）
2. 飞行动力学（数值积分：引力 + 推力 + 阻力 → 状态矢量演化）
3. 制导与操控（键盘/UI 控制推力方向、节流阀、分级）
4. 轨道显示与规划（当前轨道根数、机动节点、转移轨道预览）
5. 渲染（火箭模型、尾焰、轨迹线、目标点标记）
6. 搭建器与任务控制 UI
7. 与 OPIC 现有坐标/星历/MOD 系统的对接

---

## 3. 核心技术难点逐项分析

### 3.1 飞行动力学数值积分核心 —— 全项目最大的"新建"工作量

**问题**：开普勒轨道传播（现有代码）假设轨道根数不随时间变化，只是在已知椭圆上找某时刻的位置。火箭在动力飞行阶段，轨道根数**每一帧都在变**（推力在改变速度矢量，燃料消耗在改变质量，大气在制造阻力）。这不是"换个函数"的问题，是完全不同的数值方法：需要对运动方程

```
d(position)/dt = velocity
d(velocity)/dt = Σ(GM_i · (r_i - position) / |r_i - position|³) + F_thrust/mass + F_drag/mass
d(mass)/dt = -F_thrust / (Isp · g0)   （仅在发动机点火时）
```

做数值积分（推荐 **RK4 定步长**作为第一版——游戏级精度足够、实现简单、性能可预测；未来如果要支持长时间无推力滑行的高精度轨道预报，可以引入自适应步长的 RK45 或辛积分器，但那是优化项不是 MVP 必需项）。

**推荐实现位置**：仿照 `rust-sgp4/` 的既有范式——新建一个 Rust crate（比如 `rust-flight-dynamics`），`Cargo.toml` 直接复制现有的依赖组合思路（`wasm-bindgen` + `serde`/`serde_json` + `console_error_panic_hook`，`crate-type = ["cdylib"]`，`opt-level = "s"` + `lto = true`），暴露类似这样的接口：

```rust
#[wasm_bindgen]
pub fn integrate_step(state_json: &str, controls_json: &str, dt: f64) -> String
// 输入：当前状态矢量 + 载具参数 + 控制输入（节流/姿态）+ 步长
// 输出：下一状态矢量（JSON），供 JS 侧解析
```

跑在专属 Web Worker 里（同样照抄 `sgp4.wasm.worker.js` 的消息传递模式），主线程通过 `context.render.onBeforeRender` 每帧读取 worker 回传的最新状态用于渲染，物理子步进在 worker 内部自行控制（避免主线程掉帧时物理跟着变慢/加快）。

**一个务实的分阶段建议**：不必一开始就上 Rust。仿照这个仓库里 SGP4 本身的演化路径（先有纯 JS 的 `sgp4.worker.js`，后来才加了 Rust/WASM 版本）——**Phase 1 可以先用纯 TypeScript 实现 RK4**，验证力学模型对不对、手感对不对，等确定要长期维护、且性能确实成为瓶颈时，再把积分器热路径迁移到 Rust/WASM。这样可以更快看到"能不能玩"的反馈，避免过早优化。

### 3.2 关键设计决策：Patched Conics（分段圆锥曲线，KSP 的做法）vs 完整数值 n-body

这是一个真正需要你拍板的架构选择，不是"标准答案"，两条路都能走通：

| | Patched Conics（KSP 方式） | 数值 n-body（Cowell 方法） |
|---|---|---|
| 原理 | 滑行段用解析开普勒公式（快），只在燃烧段和 SOI 边界数值积分 | 全程数值积分，引力源项来自多个天体叠加 |
| 性能 | 更省 CPU（滑行段几乎零开销） | 单个飞行器的 n-body 积分其实很便宜（只是"一个轻质点在几个已知位置天体的引力场中运动"，不是真正意义上"多体互相影响"的昂贵 n-body），性能不是真正的顾虑 |
| 需要新建的东西 | SOI 半径定义、SOI 穿越检测、参考系切换逻辑（KSP 历史上这块出过不少"边界抖动"类 bug，是出了名的难调） | 不需要 SOI patching，天然处理弱稳定边界轨道、地月三体效应 |
| 与 OPIC 现状的契合度 | 需要新写一套 SOI 逻辑，且**不复用**已有的高精度星历优势 | **直接复用** `src/lib/astronomy/ephemeris/` 现成的地球/月球/太阳任意时刻精确位置——这是 OPIC 独有的优势，大多数从零开始的轨道游戏没有这个 |
| 真实感/教学性 | 玩家熟悉（如果目标用户玩过 KSP） | 概念更统一，но 对"为什么轨道会被月球引力轻微拉扯"这类现象的呈现更自然 |

**建议**：鉴于 OPIC **已经**built 好了一套 JPL DE440 级别的高精度星历（这在其他同类项目里通常是最耗时的部分），**数值 n-body 积分是更顺理成章的选择**——直接在每个积分步里查询星历拿到地球/月球/太阳当前精确位置，作为引力源项求和，不需要另外实现和调试 SOI 判定与坐标系切换。代价是全程都在做数值积分（哪怕在稳定轨道上滑行也不能"抄近道"用解析公式），但如 3.1 节所说，这个计算量对单个飞行器而言并不昂贵。如果未来接入多飞行器/空间站等场景，可以再评估是否需要分段优化。

### 3.3 大气与气动阻力（仅地球上升段需要）

不需要复杂 CFD。标准做法是指数大气模型：

```
ρ(h) = ρ₀ · exp(-h / H)     // 地球：ρ₀ ≈ 1.225 kg/m³，H（标高）≈ 8500 m
F_drag = 0.5 · ρ(h) · v² · Cd · A
```

每个部件带一个 `dragCoefficient` 和 `crossSectionArea`，这是标准游戏级简化，KSP 本身也是类似做法（更精细的版本会考虑马赫数相关的 Cd，属于锦上添花项）。月球没有大气，这部分逻辑对登月段直接跳过。

### 3.4 载具与部件模型

需要新建一套数据驱动的部件目录，大致形状：

```ts
interface RocketPart {
  id: string;
  type: 'engine' | 'fuelTank' | 'decoupler' | 'capsule' | 'parachute' | 'structural';
  dryMassKg: number;
  thrustVacuumN?: number;      // 发动机
  ispVacuumS?: number;
  propellantMassKg?: number;   // 燃料罐
  dragCoefficient: number;
  crossSectionAreaM2: number;
}
```

分级 Δv 用齐奥尔科夫斯基火箭方程 `Δv = Isp · g0 · ln(m0/m1)` 逐级计算，这是标准公式，实现本身不难，难点在于**搭建器 UI 的交互设计**（部件如何吸附、如何可视化分级、如何实时算出预估 Δv/推重比）——这是一块独立的、相当可观的前端工程量，和物理引擎本身的难度是两回事，规划时间时要分开估。

### 3.5 输入与操控

`PlayerInput.ts` 现成的键位映射（WASD + 方向键 + Shift）可以直接复用做火箭姿态/节流控制，但目前**没有任何代码在消费它**（我在仓库里搜索确认了这一点），需要新写一个"飞行控制器"把这套输入状态接到积分器的控制量上。UI 层面还需要新增：分级触发键、SAS（姿态锁定）开关、时间加速控制（复用 `TimeAPI.setTimeSpeed`，这个已经存在）、机动节点编辑器（新建）。

### 3.6 相机

如 1.3 节所述，公开的 `CameraAPI` 是"围绕命名天体"的模型，不适合追踪玩家造的飞行器。建议直接用 `context.render.getCamera()` 拿到原始 `THREE.Camera` 做自定义追踪相机（`gravity-grid` 已验证这条路径的可行性），自行实现"跟随+可自由环绕"的第三人称/轨道相机逻辑。这部分是常规 Three.js 工程问题，不涉及 OPIC 特有的复杂度。

### 3.7 渲染与坐标接入

近地/大气层内：Three.js 网格 + earthLocal RTC 域，参照卫星渲染器的既有模式。是否能在 `CESIUM_DOMINANT` 模式下正确叠加显示——见 1.4 节，这是需要第一时间验证的风险项。地月转移段：全程 `THREE_DOMINANT`，按 `solarSystem` 或新建的 `earthLocal`扩展精度处理（地月转移轨道跨越的距离范围较大，需要在两个域之间平滑过渡，可以参考卫星渲染器"进出域"的处理方式）。月面着陆段：需要新建 `moonLocal` RTC 域（1.1 节）。

### 3.8 与 MOD 系统的集成方式

建议**不要**把整个火箭系统做成一个巨大的单体 MOD，而是利用现有的服务注册表机制拆成几个协作 MOD（这也更符合 `ARCHITECTURE.md` 里"核心保持最小，一切可选功能都是插件"的既定设计哲学）：

- `flight-dynamics-core`：物理引擎（worker + wasm），通过服务注册表暴露 `IFlightDynamicsService`
- `vehicle-builder`：搭建器窗口 UI，消费上面的服务算 Δv/推重比预览
- `mission-control`：飞行中的 HUD/遥测/机动节点窗口
- `flight-renderer`：Three.js 渲染层（火箭网格、尾焰、轨迹线）

Manifest 需要的权限大致是 `render:*`、`camera:read`、`celestial:read`、`time:read`、`time:write`（时间加速）、`events:*`、`storage:write`（保存载具设计/存档）。`resourceQuota` 需要显式声明更高的 `maxRenderObjects`（轨迹预测线、碎片、多级部件加起来容易超过默认的 1000）。

### 3.9 可验证性约束的具体落地

延续这个项目里"新功能必须有非视觉、程序化反馈"的既定要求，对物理引擎这一层，建议按 `test/verify-backend.ts` 的既有风格新建 `test/verify-flight-dynamics.ts`，覆盖：

- **已知解析解回归**：给定纯引力、无推力的初始状态，积分若干轨道周期后，用解析二体公式算出的位置做基准，误差应在容差内收敛（而不是发散）——这是判断积分器"没写错"的最基本测试
- **守恒量属性测试**（用仓库里已有的 `fast-check`）：纯引力滑行时机械能与角动量应在浮点误差范围内守恒；这类属性测试能自动生成大量随机初始状态去"找茬"，比手写几个固定用例更可靠
- **已知任务基准**：例如给定霍曼转移的解析 Δv 公式结果，验证数值积分器执行同样机动后达到的目标轨道参数是否吻合
- **单帧步进上限测试**：验证高倍时间加速（10×/100×）时子步数有上限、不会因为单帧算太多步导致掉帧或数值爆炸

这套脚本可以让你或者 AI agent 在不启动浏览器、不用肉眼看画面的情况下，直接用 `✓`/`❌` 输出判断"这次物理引擎改动有没有破坏轨道力学正确性"，与仓库里现有的验证脚本风格完全一致。

---

## 4. 推荐架构

```mermaid
flowchart TB
    subgraph Existing["OPIC 现有基础设施（直接复用）"]
        EPH["ephemeris 星历系统<br/>JPL DE440, 27 天体"]
        COORD["coordinates Frame Graph<br/>ICRF↔RenderWorld↔ECEF"]
        GRAV["player/gravity.ts<br/>GM 常数表"]
        RTC["render-domain.ts<br/>earthLocal RTC 模式"]
        MODSYS["mod-manager<br/>render/camera/celestial API"]
        LUNAR["lunar-sites.ts<br/>着陆点数据"]
    end

    subgraph New["新增：航天飞行 MOD 群（协作式，非单体）"]
        PHYS["flight-dynamics-core<br/>RK4 数值积分（TS→逐步迁移 Rust/WASM）"]
        VEH["载具/部件数据模型<br/>齐奥尔科夫斯基方程 + 分级"]
        BUILD["vehicle-builder<br/>搭建器窗口 UI"]
        HUD["mission-control<br/>遥测/机动节点 HUD"]
        RENDER3D["flight-renderer<br/>Three.js 火箭/尾焰/轨迹"]
    end

    EPH -->|多体位置查询| PHYS
    GRAV -->|GM 引力参数| PHYS
    COORD -->|坐标变换| RENDER3D
    RTC -->|精度模式| RENDER3D
    MODSYS -->|render/camera 原始访问| RENDER3D
    MODSYS -->|窗口注册| BUILD
    MODSYS -->|窗口注册| HUD
    LUNAR -->|着陆目标数据| HUD
    VEH -->|载具配置| PHYS
    BUILD -->|服务调用| VEH
    PHYS -->|状态矢量| RENDER3D
    PHYS -->|状态矢量/轨道根数| HUD
```

---

## 5. 分阶段实施计划

| 阶段 | 目标 | 关键交付物 | 备注 |
|---|---|---|---|
| **Phase 0：验证型 Spike** | 排除最大的两个未知数 | ① 验证 `CESIUM_DOMINANT` 模式下 Three.js 叠加渲染是否每帧更新（1.4 节）；② 纯 TS 写一个最小二体 RK4 积分器，跑通"发射→入轨"最简流程，验证数值方法本身没问题 | 1-2 周；这一步决定后面的渲染方案是否需要走"强制锁定 Three 模式"的退路 |
| **Phase 1：地球发射入轨（MVP）** | 从选定发射场起飞，进入稳定地球轨道 | 发射场静态数据库（仿照 `lunar-sites.ts` 模式）、精简部件目录（5-10 个部件）、纯 TS 二体+阻力积分器、极简搭建器（部件堆叠，非拖拽）、基础遥测 HUD、`verify-flight-dynamics.ts` 验证脚本 | 这本身就是一个完整可玩、可独立验收的功能，建议作为第一个决策点：值不值得继续投入 Phase 2/3 |
| **Phase 2：轨道机动** | 机动节点（顺行/逆行/法向/径向）、轨道根数实时显示 | 状态矢量↔轨道根数转换（3.1 节提到的缺口）、机动节点 UI | |
| **Phase 3：地月转移与登月** | 从地球轨道飞到月球并着陆 | n-body 积分（复用现有星历，3.2 节）、`moonLocal` RTC 域、动力下降物理、复用 `lunar-sites.ts`/`MoonSiteMarkers.ts` 做目标选择与落点打分 | |
| **Phase 4：扩展** | 性能优化 + 其他天体 | 积分器热路径迁移 Rust/WASM（若 Phase 1-3 显示有必要）、扩展到火星等（现有星历已覆盖全部 27 个天体，理论上是同一套 n-body 代码直接适用）、更多部件、失败模式（结构极限、燃料耗尽熄火）、返回/再入 | |

---

## 6. 与你之前探索的商业方向的一个连接点

你此前评估过月球开发 / 地月商业基础设施方向（CLT 实现、转移窗口 API、着陆点评分），这个飞行 MOD 里天然会实现的两块能力——**转移窗口/轨道计算**和**着陆点评分**——本质上和那个商业 API 构想是同一套底层逻辑。换句话说，这个 MOD 除了是一个好玩的功能，也可能成为那个 B2B API 方向的一个可玩、可演示的原型验证：如果转移窗口计算和落点评分在这个游戏化场景里算得准、跑得动，说明底层算法本身是站得住的，包一层 API 出去的可行性也就有了实证，而不只是设想。这个不是必须现在就决定的事，只是提醒这两条线未来可能有交汇点。

---

## 7. 诚实的工作量评估

不夸大也不低估：Phase 1（地球发射入轨）大致相当于一个中等规模的独立小游戏项目——数值积分器、部件系统、搭建器 UI、遥测显示，每一块单独拎出来都不是"一两天能写完"的量。Phase 3（完整登月）会再叠加轨道力学与月面渲染的复杂度。整个 MOD 做完，量级上很可能超过 OPIC 主项目当前的复杂度总和。

好消息是：这不是从零开始——1.1-1.5 节列出的现有基础设施（坐标系、星历、MOD 系统、引力常数、月面数据）是大多数同类独立项目需要自己从零搭建的部分，OPIC 已经具备了，这也是为什么开篇结论是"比典型的网页 KSP 更现实"。真正需要新写的，集中在飞行动力学积分器、载具模型和搭建器 UI 这几块，范围是清楚的，不是模糊的"还有很多不确定性"。建议按 Phase 0→1 的顺序推进，每个阶段结束都是一个自然的复盘点。
