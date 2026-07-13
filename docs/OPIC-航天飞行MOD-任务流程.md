# OPIC 航天飞行 MOD — 完整任务流程

> 基于 `OPIC-航天飞行MOD-设计与可行性分析.md` 推导出的可执行任务分解。每个阶段结束都是一个自然的复盘点，可独立决定是否继续。

---

## 目录

- [前置说明：开发与验收约定](#前置说明开发与验收约定)
- [Phase 0：验证型 Spike](#phase-0验证型-spike)
- [Phase 1：地球发射入轨 MVP](#phase-1地球发射入轨-mvp)
- [Phase 2：轨道机动](#phase-2轨道机动)
- [Phase 3：地月转移与登月](#phase-3地月转移与登月)
- [Phase 4：扩展与优化](#phase-4扩展与优化)
- [附录 A：MOD 拆分方案与依赖图](#附录-amod-拆分方案与依赖图)
- [附录 B：风险跟踪清单](#附录-b风险跟踪清单)

---

## 前置说明：开发与验收约定

### 核心原则

1. **渲染层必须是纯函数**：输入 = 物理引擎状态矢量，输出 = `Object3D.position/quaternion`，中间不掺杂额外逻辑。
2. **物理正确性必须可脱离渲染单独验证**（见 3.9.1 节：`verify-flight-dynamics.ts`）。
3. **视觉正确性优先用场景图数值断言**（见 3.9.2 节），Headless 截图 diff 作为次要防线；主观审美（尾焰、运镜手感）通过固定黄金样本 + 视觉模型初筛压缩人工审查频率（见 3.9.3 节）。
4. **每个 Phase 的"完成"定义必须包含自动化验证脚本能通过**，而不依赖"跑开发服务器人眼看一眼"。

### 文件约定

| 新文件定位 | 目录模式 |
|---|---|
| 物理引擎（纯 TS 阶段） | `src/lib/flight-dynamics/` |
| 物理引擎验证脚本 | `test/verify-flight-dynamics.ts` |
| MOD 源码（flight-dynamics-core） | `src/lib/mods/flight-dynamics-core/` |
| MOD 源码（vehicle-builder） | `src/lib/mods/vehicle-builder/` |
| MOD 源码（mission-control） | `src/lib/mods/mission-control/` |
| MOD 源码（flight-renderer） | `src/lib/mods/flight-renderer/` |
| 场景图断言脚本 | `test/verify-flight-renderer.ts` |
| 部件目录数据 | `src/lib/data/rocket-parts/` |
| 发射场数据 | `src/lib/data/launch-sites.ts` |
| 大气模型 | `src/lib/flight-dynamics/atmosphere.ts` |

---

## Phase 0：验证型 Spike

> **目标**：排除文档中标记  的两个最大未知数。两项验证都应产出可被 AI Agent 直接读取退出码/输出的脚本。这一步也决定后续渲染方案是否需要走"强制锁定 THREE 模式"的退路。

---

### Task 0.1：CESIUM_DOMINANT 模式下 Three.js 叠加渲染是否每帧更新的程序化验证

**状态**： 已完成

**描述**：

创建最小 MOD（`src/lib/mods/flight-renderer/` 的雏形），在 `registerRenderer` 回调里挂一个渲染计数器，在 `CESIUM_DOMINANT` 模式下用固定模拟时钟推进 N 帧，断言计数器应等于 N。如果计数器只在模式切换瞬间跳了一次然后不再变化，说明叠加层被冻结。

**验收标准**：

- [x] 脚本 `test/verify-threejs-overlay.ts` 输出 /，可直接读退出码判断
- [x] 确认 `CESIUM_DOMINANT` 模式下 `render()` 每帧都被调用（计数器 = 帧数）
- [x] 若失败 → 在文档中记录"退路方案：火箭飞行期间强制锁定 `THREE_DOMINANT`"（已在 Phase 0 报告中明确；本次验证通过，无需启用）

**依赖**：无（纯 spike）

**关键文件**：
-  `test/verify-threejs-overlay.ts`
-  `src/lib/mods/flight-renderer/`（最小骨架）

**风险**： 最高优先级——这是文档第 1.4 节最重要的待验证项。

---

### Task 0.2：纯 TS 最小二体 RK4 积分器 + 解析解回归测试

**状态**： 已完成

**描述**：

在 `src/lib/flight-dynamics/` 下实现一个最小 RK4 定步长积分器，只做纯引力二体问题（不包含推力、阻力、变质量）。配套 `test/verify-flight-dynamics.ts` 验证脚本。

**验收标准**：

- [x] 给定纯引力、无推力的初始状态（圆形/椭圆轨道），积分若干轨道周期后，与解析二体公式算出的位置误差在容差内收敛
- [x] 守恒量测试：纯引力滑行时机械能 ±5% 容差内守恒、角动量在浮点误差范围内守恒
- [x] 属性测试（用 `fast-check`）：随机初始状态不触发数值发散
- [x] 脚本 `test/verify-flight-dynamics.ts` 输出 /，AI Agent 可直接读退出码判断

**依赖**：复用 `src/lib/3d/player/gravity.ts` 的 GM 常数表；最小二体版本不要求接入 `ephemeris`，中心天体可先按固定引力源处理

**关键文件**：
-  `src/lib/flight-dynamics/integrator.ts`（RK4 核心）
-  `src/lib/flight-dynamics/state.ts`（状态矢量数据类型）
-  `test/verify-flight-dynamics.ts`

**风险**：中——积分器本身是标准数值方法，风险在于步长选择和容差调优。

---

### Task 0.3：Phase 0 推进决策报告

**状态**： 已完成

**描述**：基于 Task 0.1 和 0.2 的结果，生成一份推进决策报告，明确：
- 渲染方案：叠加可行 → 用叠加；不可行 → 走"强制锁定 THREE 模式"退路
- 积分器方案：纯 TS RK4 在目标步长下精度/性能是否满足 MVP 需求
- 是否值得进入 Phase 1

**依赖**：Task 0.1 + 0.2 完成

**关键文件**：
-  `docs/OPIC-航天飞行MOD-Phase0-报告.md`

---

## Phase 1：地球发射入轨 MVP

> **目标**：从选定发射场起飞，进入稳定地球轨道。这本身就是一个完整可玩、可独立验收的功能，是第一个决策点。

---

### Task 1.1：发射场静态数据库

**状态**： 已完成

**描述**：仿照 `src/lib/astronomy/lunar-sites.ts` 的模式，创建发射场数据文件，包含经纬度、海拔、名称等信息。

**验收标准**：

- [x] 至少包含：Cape Canaveral、拜科努尔、库鲁、酒泉、文昌
- [x] 每个发射场提供：名称、经纬度（WGS84）、海拔（米）、国家
- [x] 坐标可通过 LOCT（局部/ENU）转换到地心惯性系中的初始位置

**依赖**：复用 `src/lib/coordinates/` 坐标变换链

**关键文件**：
-  `src/lib/data/launch-sites.ts`
-  参考 `src/lib/astronomy/lunar-sites.ts` 的数据模式

---

### Task 1.2：部件数据模型与精简部件目录

**状态**： 已完成

**描述**：定义 `RocketPart` 类型（参考文档 3.4 节），创建 5–10 个基础部件（发动机、燃料罐、分离器、指令舱、结构件）。

**验收标准**：

- [x] 类型定义完整：`id`、`type`、`dryMassKg`、`thrustVacuumN`（发动机）、`ispVacuumS`（发动机）、`propellantMassKg`（燃料罐）、`dragCoefficient`、`crossSectionAreaM2`
- [x] 齐奥尔科夫斯基方程 `Δv = Isp · g0 · ln(m0/m1)` 逐级计算预估值
- [x] 部件目录文件包含至少 5 个不同 `type` 的部件
- [x] 分级质量/Δv 汇总计算有单元测试

**依赖**：无

**关键文件**：
-  `src/lib/data/rocket-parts/types.ts`
-  `src/lib/data/rocket-parts/catalog.ts`
-  `src/lib/data/rocket-parts/__tests__/delta-v.test.ts`

---

### Task 1.3：飞行动力学核心（纯 TS 二体 + 大气阻力积分器）

**状态**： 已完成

**描述**：在 Phase 0 Task 0.2 的最小积分器基础上扩展：加入推力项、变质量（火箭方程）、大气阻力（指数大气模型，仅海拔 < 100 km 启用）。维持 `earthLocal` 域中进行积分。

**验收标准**：

- [x] 支持变推力（节流 0–100%）
- [x] 质量随燃料消耗实时更新（仅发动机点火时）
- [x] 大气阻力项启用/禁用正确（地球 100 km 以上归零）
- [x] 发射→入轨的端到端数值仿真可通过自动化脚本验证（非视觉——用 `verify-flight-dynamics.ts` 新增"已知任务基准"测试：给定霍曼转移的解析 Δv，验证数值积分器执行同样机动后达到的目标轨道参数）
- [x] 单帧步进上限测试：10×/100×/10,000× 时间加速时子步数有上限、不数值爆炸

**依赖**：Task 0.2（Phase 0 验证通过）、Task 1.1（发射场坐标）、Task 1.2（部件模型）

**关键文件**：
-  `src/lib/flight-dynamics/integrator.ts`（扩展）
-  `src/lib/flight-dynamics/forces.ts`（引力 + 推力 + 阻力项）
-  `src/lib/flight-dynamics/atmosphere.ts`（指数大气模型）
-  `src/lib/flight-dynamics/rocket-equation.ts`（质量/Δv 计算）
-  `test/verify-flight-dynamics.ts`（扩展测试用例）

---

### Task 1.4：飞行控制器（接线 PlayerInput.ts）

**状态**： 已完成

**描述**：将 `src/lib/3d/player/PlayerInput.ts`（目前无消费者）接到新的飞行控制器上，但以"适配层"方式复用现有输入状态，而不是假设其现有语义已经等同于火箭控制。控制器需要把 `yaw/pitch/roll`、`thrust` 和 `boost` 状态重新解释为火箭姿态与节流控制，并补上分级触发。

**验收标准**：

- [x] 方向键 → 俯仰/偏航控制
- [x] Q/E → 横滚控制
- [x] W/S 或 `thrust` 轴 → 节流增减的适配输入
- [x] Shift → 快速节流调节或助推修饰键，由飞行控制器统一解释
- [x] Space → 分级触发
- [x] A/D 保留为后续 RCS 平移或其他辅助控制输入，MVP 不强制绑定主飞行控制
- [x] 飞行控制器的输出正确转换为积分器的控制输入参数

**依赖**：Task 1.3（积分器支持变推力控制）

**关键文件**：
-  `src/lib/flight-dynamics/flight-controller.ts`
-  复用 `src/lib/3d/player/PlayerInput.ts`（无需修改，只需消费）

---

### Task 1.5：极简搭建器 UI（部件堆叠，非拖拽）

**状态**： 已完成（以集成式 `SpaceFlightWindow` 落地，尚未拆分为独立 `vehicle-builder` MOD）

**描述**：利用 MOD 系统的窗口注册能力，创建一个可以"从部件列表选择 → 加入当前载具 → 实时显示预估 Δv/推重比/总质量"的搭建器。第一版不做拖拽吸附，用列表堆叠方式。

**验收标准**：

- [x] 窗口通过 MOD contribution 注册，可从 Dock 打开
- [x] 部件列表展示目录中的部件（发动机/燃料罐/分离器/指令舱）
- [x] 点击部件加入当前载具栈
- [x] 实时计算并显示：总质量、每级 Δv、推重比
- [x] 载具配置可 JSON 序列化/反序列化

**依赖**：Task 1.2（部件数据模型）、复用 MOD 系统 `contributes.windows` 注册机制

**关键文件**：
-  `src/lib/mods/vehicle-builder/index.ts`
-  `src/lib/mods/vehicle-builder/VehicleBuilderWindow.tsx`
-  `src/lib/mods/vehicle-builder/VehicleConfig.ts`

---

### Task 1.6：飞行渲染层（火箭网格 + 尾焰 + 轨迹线）

**状态**： 已完成（渲染类位于 `src/lib/mods/flight-renderer/`，通过 `SpaceFlightOverlay` 接到现有集成窗口架构）

**描述**：利用 MOD 系统 `context.render` 的 Three.js 原始访问能力，创建一个渲染层，将物理引擎吐出的状态矢量渲染为简单火箭网格、发动机尾焰粒子、和飞行轨迹线。

**验收标准**：

- [x] 火箭网格在 `earthLocal` RTC 域中正确渲染（场景图数值断言：`getWorldPosition()` 与物理引擎输出的位置误差 < 1 m）
- [x] 尾焰在发动机点火时显示（方向沿推力矢量反方向），分级分离时尾焰随级切换
- [x] 轨迹线随飞行实时追加点（最多保留 N 个点，超过自动裁剪）
- [x] 场景图数值断言验证载具的 `getWorldPosition()` 在发射场坐标误差 < 1 m（见 3.9.2 节）
- [x] 脚本 `test/verify-flight-renderer.ts` 可输出 /

**依赖**：Task 1.3（积分器输出状态矢量）、Task 1.4（飞行控制器）、Task 0.1（验证叠加渲染方案）

**关键文件**：
-  `src/lib/mods/flight-renderer/index.ts`
-  `src/lib/mods/flight-renderer/RocketRenderer.ts`
-  `src/lib/mods/flight-renderer/PlumeRenderer.ts`
-  `src/lib/mods/flight-renderer/TrajectoryRenderer.ts`
-  `test/verify-flight-renderer.ts`

---

### Task 1.7：追踪相机系统

**状态**： 未开始

**描述**：绕过高层 `CameraAPI`（只支持命名天体），直接用 CameraController 实现第三人称跟随 + 自由环绕的追踪相机。

**验收标准**：

- [ ] 相机自动跟随火箭位置（无抖动，平滑过渡）
- [ ] 鼠标右键拖拽可自由环绕火箭
- [ ] 滚轮缩放距离
- [ ] 追踪模式切换（固定距离跟随 / 惯性跟随 / 自由观察）
- [ ] 所有控制通过 UI 按钮触发（不使用键盘快捷键）

---

### Task 1.8：基础遥测 HUD + 任务控制窗口

**状态**： 已完成

**描述**：创建飞行中的遥测显示窗口（高度、速度、轨道信息、燃料、节流状态）和基本任务控制（发射/中止/时间加速）。

**验收标准**：

- [x] HUD 窗口实时显示：高度（km）、速度（m/s）、远拱点/近拱点、当前级燃料、节流百分比
- [x] 时间加速控制（`useFlightSimulation` 中 `useEffect` 监听 `timeScale` 变化，同步调用 `getTimeAPI().setTimeSpeed(timeScale / 86400)`，并在 stopSimulation / abort / unmount 时重置为实时速度）
- [x] 发射按钮 → 启动物理积分循环 → 火箭从发射场坐标开始上升
- [x] 分级按钮与 Flight Controller (Task 1.4) 同步

**依赖**：Task 1.3（积分器）、Task 1.4（飞行控制器）、Task 1.1（发射场）

**关键文件**：
-  `src/lib/mods/mission-control/index.ts`
-  `src/lib/mods/mission-control/MissionControlWindow.tsx`
-  `src/lib/mods/mission-control/TelemetryDisplay.tsx`
-  `src/lib/mods/space-flight/useFlightSimulation.ts` — TimeAPI 桥接（`timeScale → setTimeSpeed`）

---

### Task 1.9：Phase 1 自动化验证脚本完整版

**状态**： 已完成

**描述**：整合 Phase 0 + Phase 1 产生的所有验证脚本，确保可以作为 CI 的一部分运行。

**验收标准**：

- [x] `test/verify-flight-dynamics.ts`：覆盖二体回归、守恒量属性测试、已知任务基准、时间加速上限测试
- [x] `test/verify-flight-renderer.ts`：覆盖载具位置与发射场坐标吻合、轨迹线点数上限
- [x] 两条脚本均可在无头环境下运行，输出 /
- [x] 所有测试通过

**依赖**：Task 1.3, 1.6

**关键文件**：
-  `test/verify-flight-dynamics.ts`（扩展）
-  `test/verify-flight-renderer.ts`

---

### Task 1.10：Phase 1 集成与交付

**状态**： 自动化验收完成，待人工体验确认

**描述**：将 vehicle-builder、flight-dynamics-core、flight-renderer、mission-control 串联起来，完成"选发射场 → 搭建火箭 → 发射 → 入轨"的端到端流程。

**验收标准**：

- [x] 从搭建器构建一枚两级火箭 → 选择一个发射场 → 点击发射 → 火箭上升穿越大气 → 进入稳定椭圆轨道（SpaceFlightWindow 集成式窗口已串联全部子系统）
- [x] 全流程中 HUD 遥测数据与物理积分器一致（Task 1.9 验证通过：15/15 dynamics + 3/3 renderer）
- [x] 追踪相机正确跟随（TrackingCamera V 键切换，复用 CameraController 跟踪基础设施）
- [x] 自动化验证脚本全部通过（Task 1.9：verify-flight-dynamics 15/15, verify-flight-renderer 3/3, verify-threejs-overlay ）
- [ ] 人工体验确认（仅作为最后一道低频关卡——见 3.9.3 节）

**依赖**：Task 1.1–1.9 全部完成

---

## Phase 2：轨道机动

> **目标**：实现机动节点系统、状态矢量 ↔ 轨道根数双向转换、实时轨道显示。

---

### Task 2.1：状态矢量 ↔ 轨道根数双向转换

**描述**：实现笛卡尔状态矢量（位置 + 速度）与开普勒轨道根数之间的双向转换。这是 3.1 节标记的核心缺口。

**验收标准**：

- [ ] `stateToKepler(pos, vel, mu) → {a, e, i, Ω, ω, ν}` 往返转换误差 < 1e-8（相对误差）
- [ ] `keplerToState(oe, mu) → StateVector` 与已知测试案例吻合
- [ ] 用 `fast-check` 做属性测试：任意状态矢量 → 转轨道根数 → 转回状态矢量 → 误差收敛
- [ ] 测试覆盖：圆形轨道、椭圆轨道、近抛物线、逆行轨道、赤道轨道等边界情况

**依赖**：复用 `src/lib/3d/player/gravity.ts` 的 GM 常数表

**关键文件**：
-  `src/lib/flight-dynamics/orbital-elements.ts`
-  `src/lib/flight-dynamics/__tests__/orbital-elements.test.ts`

---

### Task 2.2：机动节点系统

**描述**：实现机动节点（prograde/retrograde/normal/radial）的 Δv 计算，在机动节点时间点修改速度矢量，积分器继续推进。

**验收标准**：

- [ ] 支持六种机动方向：顺行、逆行、法向（+）、法向（−）、径向（+）、径向（−）
- [ ] 机动节点包含：UTC 执行时刻、Δv 矢量（在地心惯性系下表达）、机动方向
- [ ] 将机动节点的 Δv 瞬时施加到速度矢量（初版统一按脉冲机动处理；后续如需有限燃烧，再扩展燃烧时长模型）
- [ ] 测试：沿顺行方向施加 Δv 后，远拱点应升高

**依赖**：Task 2.1（轨道根数转换，用于"机动前/后轨道"差异比对）

**关键文件**：
-  `src/lib/flight-dynamics/maneuver.ts`
-  `src/lib/flight-dynamics/__tests__/maneuver.test.ts`

---

### Task 2.3：实时轨道显示

**描述**：在 mission-control HUD 中显示当前轨道根数（半长轴、偏心率、倾角、近拱点/远拱点高度），并在 Three.js 场景中渲染当前轨道的预览线。

**验收标准**：

- [ ] HUD 实时显示：半长轴、偏心率、倾角、远拱点高度、近拱点高度、轨道周期
- [ ] 轨道预览线在场景中以虚线渲染（当前轨道），基于轨道根数解析计算轨迹点
- [ ] 机动节点预览：在轨道上标记机动位置，虚线预览机动后的轨道

**依赖**：Task 1.8（遥测 HUD 基础）、Task 2.1（轨道根数转换）

**关键文件**：
-  `src/lib/mods/mission-control/TelemetryDisplay.tsx`（扩展）
-  `src/lib/mods/flight-renderer/OrbitPreviewRenderer.ts`

---

### Task 2.4：机动节点编辑器 UI

**描述**：在 mission-control 窗口中增加机动节点编辑面板：选择机动方向、输入 Δv 数值、设置机动时间、预览轨道变化。

**验收标准**：

- [ ] 面板显示：Δv 输入（m/s）、机动方向选择（六向）、执行时间选择
- [ ] 输入过程中实时预览机动后轨道（虚线）
- [ ] "执行机动"按钮 → 在指定时间施加 Δv → 清除机动节点 → 自动更新当前轨道显示
- [ ] 支持多个机动节点排队

**依赖**：Task 2.2（机动节点系统）、Task 2.3（轨道显示）

**关键文件**：
-  `src/lib/mods/mission-control/ManeuverEditor.tsx`

---

### Task 2.5：SAS（姿态锁定）系统

**描述**：实现姿态锁定辅助系统（KSP 风格的 SAS）：保持当前朝向、锁定顺行/逆行/法向/径向、锁定天顶/天底。

**验收标准**：

- [ ] 支持姿态锁定模式：`hold`（保持当前）、`prograde`（顺行）、`retrograde`（逆行）、`normal`（法向+）、`antinormal`（法向−）、`radialIn`（径向内）、`radialOut`（径向外）
- [ ] 锁定模式下飞行控制器自动调整姿态以匹配目标方向
- [ ] T 键切换 SAS 开关，不影响手动输入（有 SAS 时手动输入可叠加）
- [ ] 姿态控制使用 PID 或类似简单控制器

**依赖**：Task 1.4（飞行控制器）

**关键文件**：
-  `src/lib/flight-dynamics/sas.ts`
-  `src/lib/flight-dynamics/flight-controller.ts`（集成 SAS）

---

## Phase 3：地月转移与登月

> **目标**：从地球轨道飞到月球并着陆。复用现有星历系统做 n-body 积分。

---

### Task 3.1：n-body 数值积分器

**描述**：从 Task 1.3 的二体+阻力积分器升级为完整 n-body：在每个积分步查询 `src/lib/astronomy/ephemeris/` 获取地球/月球/太阳的精确位置，作为引力源项叠加求和。不需要实现 SOI 判定/切换逻辑（按文档 3.2 节建议，直接选 n-body 方案）。

**验收标准**：

- [ ] 积分器在每个时间步查询星历获取引力源位置（地球、月球、太阳至少三者）
- [ ] 远程飞行（地月转移）不丢失精度
- [ ] 验证脚本新增：地月空间中纯滑行时能量/角动量守恒；与 Patched Conics 近似解对比偏差在可接受范围

**依赖**：Task 1.3（二体积分器基础）、 复用 `src/lib/astronomy/ephemeris/`

**关键文件**：
-  `src/lib/flight-dynamics/integrator.ts`（从二体升级为 n-body）
-  `src/lib/flight-dynamics/forces.ts`（引力项从单源升级为多源）
-  `test/verify-flight-dynamics.ts`（新增 n-body 测试）

---

### Task 3.2：moonLocal RTC 渲染域

**描述**：参照 `earthLocal` 的既有模式，在 `src/lib/coordinates/scale/render-domain.ts` 中增加 `moonLocal` RTC 域，用于月面着陆阶段的高精度渲染。

**验收标准**：

- [ ] `moonLocal` 域定义完成：`unitScale: 1/AU`（米 → AU）、合适的 `exitDistanceAU/enterDistanceAU` 切换阈值（覆盖近月操作与着陆范围）、`useRTC: true`
- [ ] 飞船从地月空间进入 `moonLocal` 域时坐标平滑过渡（无跳变）
- [ ] 月面附近的渲染精度满足厘米级着陆需求（场景图数值断言验证）
- [ ] 坐标测试用例覆盖地月域间转换

**依赖**： 参考 `src/lib/coordinates/scale/render-domain.ts` 现有实现模式

**关键文件**：
-  `src/lib/coordinates/scale/render-domain.ts`（新增 `moonLocal`）
-  `src/lib/coordinates/__tests__/moonLocal.test.ts`

---

### Task 3.3：动力下降物理

**描述**：在积分器中加入月面下降/着陆阶段的特殊处理：推力反向制动、高度触地检测、月面参考表面判定。若项目后续接入可靠的月面高程数据，则在此基础上进一步提升到真实地形判定；在此之前，先以月球参考椭球或统一半径模型完成可验证的着陆闭环。

**验收标准**：

- [ ] 发动机推力方向可反向（制动下降）
- [ ] 高度检测：飞船底部距离月面参考表面 ≤ 容差误差时判定为着陆；若后续接入地形数据，则在同一接口下切换为真实高程
- [ ] 着陆判定条件：垂直速度 < 阈值（如 < 5 m/s）、水平速度 < 阈值（如 < 2 m/s）→ "成功着陆"；超出阈值为"硬着陆/坠毁"
- [ ] 着陆后飞船网格的 `getWorldPosition()` 应对应月面坐标（场景图数值断言，误差 < 着陆腿长度）

**依赖**：Task 3.1（n-body 积分器）、Task 3.2（moonLocal 域）、 月面高度基准来源需明确；MVP 可先使用参考椭球/平均半径模型

**关键文件**：
-  `src/lib/flight-dynamics/integrator.ts`（新增着陆检测）
-  `src/lib/flight-dynamics/landing.ts`

---

### Task 3.4：着陆目标选择与落点评分

**描述**：复用 `src/lib/astronomy/lunar-sites.ts` 的历史着陆点和 `src/lib/3d/MoonSiteMarkers.ts` 的月面标记渲染模式，实现"选择着陆目标 → 飞行 → 着陆 → 评分"的完整流程。

**验收标准**：

- [ ] 任务控制窗口显示可选着陆点列表（阿波罗 11/12/14/15/16/17、嫦娥 3/4/5 等）
- [ ] 选中着陆点后月面上显示目标标记（复用 `MoonSiteMarkers` 的渲染模式）
- [ ] 着陆后自动计算：与目标点的距离偏差（米）、垂直/水平速度、综合评分（A–F）
- [ ] 评分规则可配置（偏差阈值、速度阈值）

**依赖**：Task 3.3（动力下降物理）、 `lunar-sites.ts`、 `MoonSiteMarkers.ts`

**关键文件**：
-  `src/lib/flight-dynamics/landing-score.ts`
-  `src/lib/mods/mission-control/`（新增着陆目标选择面板）
-  `src/lib/mods/flight-renderer/LandingTargetMarker.ts`

---

### Task 3.5：地月转移全流程集成

**描述**：将 Phase 3 的所有子系统串联，完成"地球轨道 → 地月转移注入 → 月球捕获 → 动力下降 → 着陆 → 评分"的端到端流程。

**验收标准**：

- [ ] 端到端流程可通过自动化脚本模拟（非视觉）
- [ ] 自动化验证脚本全部通过
- [ ] 人工体验确认（低频关卡）

**依赖**：Task 3.1–3.4 全部完成

---

## Phase 4：扩展与优化

> **目标**：性能优化、更多天体支持、丰富玩法。Phase 4 的每个 Task 是独立可选的。

---

### Task 4.1：积分器热路径迁移 Rust/WASM

**前置判断**：如果 Phase 1–3 中纯 TS 积分器性能在 10× 以上时间加速时出现掉帧，或者在多个飞行器同时仿真时成为瓶颈，再执行此任务。否则跳过。

**描述**：仿照 `rust-sgp4/` 的既有范式，将积分器的热路径（`integrate_step` 函数）迁移到 Rust → wasm-bindgen → Web Worker。

**验收标准**：

- [ ] Rust crate `rust-flight-dynamics` 创建（仿照 `rust-sgp4/Cargo.toml`）
- [ ] `pub fn integrate_step(state_json, controls_json, dt) → String` 接口
- [ ] WASM 编译脚本 + Web Worker 加载（照抄 `sgp4.wasm.worker.js`）
- [ ] 与纯 TS 版本输出一致性测试（相同输入 → 相同输出，误差 < 1e-10）
- [ ] 性能对比基准：10,000× 时间加速下单帧物理计算 < 5 ms

**依赖**： 参考 `rust-sgp4/` 完整范式

**关键文件**：
-  `rust-flight-dynamics/Cargo.toml`
-  `rust-flight-dynamics/src/lib.rs`
-  `public/workers/flight-dynamics.wasm.worker.js`
-  `src/lib/flight-dynamics/`（新增 WASM 桥接层）

---

### Task 4.2：扩展到火星及其他天体

**描述**：现有 JPL DE440 星历已覆盖 27 个天体，同一套 n-body 积分器代码理论上直接适用。为火星（及木星/土星卫星）添加着陆点数据、大气模型、RTC 域。

**验收标准**：

- [ ] 火星大气模型（指数模型，CO₂ 为主，ρ₀ ≈ 0.02 kg/m³，H ≈ 11,100 m）
- [ ] `marsLocal` RTC 域
- [ ] 火星着陆点数据（类似 `lunar-sites.ts` 模式）
- [ ] 火星动力下降/着陆验证脚本

**依赖**：Task 3.1（n-body 积分器，已支持多天体引力源）

**关键文件**：
-  `src/lib/data/mars-sites.ts`
-  `src/lib/coordinates/scale/render-domain.ts`（新增 `marsLocal`）
-  `src/lib/flight-dynamics/atmosphere.ts`（新增火星大气参数）

---

### Task 4.3：扩展部件库 + 失败模式

**描述**：增加更多部件类型（起落架、RCS 姿态推进器、太阳能板、科学仪器）和失败模式（结构过载、燃料耗尽、过热、撞击）。

**验收标准**：

- [ ] 新增至少 10 个部件
- [ ] 失败检测：动压超限 → 结构解体；速度超限触地 → 坠毁；燃料耗尽 → 熄火
- [ ] 失败事件通过 MOD 事件总线广播，HUD 可显示警告

**依赖**：Task 1.2（部件模型基础）

**关键文件**：
-  `src/lib/data/rocket-parts/catalog.ts`（扩展）
-  `src/lib/flight-dynamics/failure-detection.ts`

---

### Task 4.4：返回/再入物理

**描述**：实现从月球/轨道返回地球的大气再入、热防护系统、降落伞展开。

**验收标准**：

- [ ] 再入大气时阻力模型正常工作（地球大气模型已在 Phase 1 就绪）
- [ ] 再入加热简化为一个阈值判断（速度/高度触发"过热警告"，超过极限 → 烧毁）
- [ ] 降落伞部件：在指定高度触发，增加额外阻力项直至安全着陆速度

**依赖**：Task 1.3（大气阻力模型）、Task 3.1（n-body 积分器）

**关键文件**：
-  `src/lib/flight-dynamics/atmosphere.ts`（新增再入加热计算）
-  `src/lib/data/rocket-parts/parachute.ts`

---

### Task 4.5：黄金截图体系与视觉回归检测

**描述**：搭建 Headless 浏览器截图 + pixelmatch diff 的视觉回归防线（按 3.9.2 节第二层方案），建立固定黄金样本库，AI Agent 可在改动后自动跑 diff 判断渲染是否退化。

**验收标准**：

- [ ] Playwright 无头 Chromium 自动启动 OPIC 开发服务器
- [ ] 固定场景（发射场、固定相机、固定时间/光照）→ 截图 → 与基准图 pixelmatch diff
- [ ] diff 分数超过阈值（如 5%）→ 判定失败
- [ ] 黄金样本库：发射台待命、上升段点火、轨道滑行、月面着陆 4 组固定截图

**依赖**：Task 1.6（渲染层就绪）

**关键文件**：
-  `test/visual-regression/`
-  `test/visual-regression/golden/`
-  `test/visual-regression/screenshot-test.ts`

---

## 附录 A：MOD 拆分方案与依赖图

按照文档 3.8 节的建议，将航天飞行系统拆成 4 个协作 MOD：

```
┌────────────────────────────────────────────────────────┐
│                   OPIC 核心系统                          │
│  ephemeris / coordinates / gravity / MOD system         │
└────┬──────────────┬──────────────┬─────────────────────┘
     │              │              │
     ▼              ▼              ▼
┌─────────┐  ┌───────────┐  ┌──────────────┐
│ flight- │  │ vehicle-  │  │ mission-     │
│ dynamics│◄─│ builder   │  │ control      │
│ -core   │  └───────────┘  └──────┬───────┘
└────┬────┘                        │
     │     ┌───────────────────────┘
     │     │
     ▼     ▼
┌──────────────┐
│ flight-      │
│ renderer     │
└──────────────┘
```

| MOD | 职责 | 暴露服务 | 消费服务 |
|-----|------|---------|---------|
| `flight-dynamics-core` | 物理积分器 + 轨道力学 | `IFlightDynamicsService` | ephemeris, gravity 常数 |
| `vehicle-builder` | 搭建器 UI + 部件管理 | `IVehicleService` | `IFlightDynamicsService`（算 Δv） |
| `mission-control` | 遥测 HUD + 机动编辑器 + 任务控制 | — | `IFlightDynamicsService` |
| `flight-renderer` | Three.js 火箭/尾焰/轨迹/追踪相机 | — | `IFlightDynamicsService`（状态矢量） |

**Manifest 权限需求**（以 `flight-dynamics-core` 为例，其余类似但更少）：

```json
{
  "permissions": ["render:*", "camera:read", "celestial:read", "time:read", "time:write", "events:*", "storage:write"],
  "resourceQuota": { "maxRenderObjects": 5000, "maxMemoryMB": 100 }
}
```

---

## 附录 B：风险跟踪清单

| 风险编号 | 风险描述 | 对应 Task | 严重程度 | 缓解措施 |
|---------|---------|----------|---------|---------|
| R1 | `CESIUM_DOMINANT` 模式下 Three.js 叠加层不每帧更新 | Task 0.1 |  高 | 退路：强制锁定 `THREE_DOMINANT` |
| R2 | RK4 定步长在 10,000× 时间加速下发散 | Task 0.2, 1.3 |  中 | 自适应步长 RK45 作为备选；单帧子步数上限保护 |
| R3 | CameraAPI 文档与实际类型定义不一致 | Task 1.7 |  中 | 以 `types.ts` 为准，直接操作 `THREE.Camera` 绕过 |
| R4 | MOD 默认配额不够（轨迹线 + 部件网格） | Task 1.6 |  低 | manifest 中显式声明更高的 `maxRenderObjects` |
| R5 | 搭建器 UI 交互复杂度被低估 | Task 1.5 |  中 | Phase 1 做最简堆叠模式，拖拽放 Phase 4 |
| R6 | n-body 积分器地月转移段精度不足 | Task 3.1 |  中 | 自适应步长 + 与 Patched Conics 基准对比验证 |
| R7 | moonLocal 域与地月空间坐标过渡有跳变 | Task 3.2 |  低 | 参照 `earthLocal` 已验证的 RTC 模式，增加过渡区间测试 |
| R8 | AI Agent 无法独立验收视觉效果导致人工阻塞 | Task 1.9, 4.5 |  中 | 按 3.9 节：场景图断言 > 截图 diff > 人工抽查 |

---

## 任务总览

| 阶段 | 任务数 | 关键决策点 |
|------|--------|-----------|
| Phase 0 | 3 | 叠加渲染可行性与积分器方案是否成立 |
| Phase 1 | 10 | 是否已经形成可独立验收的发射入轨闭环 |
| Phase 2 | 5 | 轨道力学能力完整度是否足以支撑任务规划 |
| Phase 3 | 5 | 登月端到端闭环是否成立 |
| Phase 4 | 5 | 各扩展任务是否具备明确收益与验证路径 |

---

> **下一步**：建议从 Phase 0 Task 0.1 开始——这是全文档标记的最高优先级风险项，结果直接决定后续所有渲染方案的走向。所有任务的详细可执行步骤、验收脚本的精确写法，在进入对应 Phase 时再展开为更细粒度的子任务。
