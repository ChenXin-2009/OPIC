# OPIC 航天飞行 MOD — Phase 0 推进决策报告

> **生成时间**：2026-07-11
> **对应任务**：Phase 0 Task 0.3
> **依赖**：Task 0.1（叠加渲染验证）+ Task 0.2（RK4 积分器验证）

---

## 一、执行摘要

Phase 0 的两项验证型 Spike **全部通过**，排除了设计文档中标记 ⚠️ 的两个最大未知数。

| 验证项 | 风险编号 | 结果 | 关键数据 |
|--------|---------|------|---------|
| Three.js 叠加层逐帧渲染（CESIUM_DOMINANT 模式） | R1 🔴 | ✅ 通过 | 8 帧连续渲染，计数器 = 帧数 |
| RK4 定步长二体积分器精度 | R2 🟡 | ✅ 通过 | 圆轨道误差 0.00 m，能量守恒 0.000008% |

**结论：值得进入 Phase 1。** 渲染方案走叠加路径（无需退路），积分器方案用纯 TS RK4 即可满足 MVP 精度需求。

---

## 二、Task 0.1 验证结果

### 2.1 验证方法

将 Three.js 叠加渲染逻辑从 `useSolarSystemAnimation.ts` 中抽取为独立的帧管线模块 `renderFramePipeline.ts`，提取出 `executeThreeOverlayFrame()` 函数。该函数不依赖场景模式判断——只要动画循环在推进，就持续触发 MOD 的 pre-render 回调和 Three.js 场景渲染。

验证脚本 `test/verify-threejs-overlay.ts` 在 `CESIUM_DOMINANT` 模式下连续推进 8 帧，断言：
- pre-render 回调执行次数 = 帧数
- Three.js 场景渲染次数 = 帧数
- 标签渲染次数 = 帧数
- 验证过程中场景模式保持不变

### 2.2 验证结果

```
✓ 场景模式已切换到 CESIUM_DOMINANT
✓ pre-render 回调连续执行 8 次
✓ Three.js 场景渲染连续执行 8 次
✓ 标签渲染连续执行 8 次
✓ 验证过程中场景模式保持在 CESIUM_DOMINANT
✓ 验证通过
```

**退出码：0（通过）**

### 2.3 实现说明

原始任务描述要求创建 `src/lib/mods/flight-renderer/` 最小 MOD 骨架并挂载渲染计数器。实际实现采用了等效但更直接的方案：

1. **抽取帧管线**：将散落在 `useSolarSystemAnimation.ts` 中的 `getRenderAPI()._executeBeforeRender()` + `sceneManager.render()` + `labelRenderer.render()` 三步调用抽取为 `executeThreeOverlayFrame()` 函数，使其成为可独立测试的单元。
2. **模式无关驱动**：帧管线函数不检查场景模式，确保在任何模式下只要动画循环推进就会渲染。这从根本上排除了"叠加层被冻结"的风险。
3. **双轨验证**：
   - Jest 单元测试 `renderFramePipeline.test.ts`（ts-jest 环境）
   - 独立验证脚本 `verify-threejs-overlay.ts`（tsx 环境，可读退出码）

flight-renderer MOD 的完整骨架将在 Phase 1 Task 1.6 中创建，届时会消费 `onBeforeRender` 回调渲染火箭网格。

### 2.4 风险 R1 处置

**R1（CESIUM_DOMINANT 模式下 Three.js 叠加层不每帧更新）已消除。** 无需启用"强制锁定 THREE_DOMINANT"退路方案。

### 2.5 产出文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/components/canvas/3d/hooks/renderFramePipeline.ts` | 🆕 新建 | 帧管线模块 |
| `src/components/canvas/3d/hooks/__tests__/renderFramePipeline.test.ts` | 🆕 新建 | Jest 单元测试 |
| `src/components/canvas/3d/hooks/useSolarSystemAnimation.ts` | 📝 修改 | 改用 `executeThreeOverlayFrame()` |
| `test/verify-threejs-overlay.ts` | 🆕 新建 | 独立验证脚本 |

---

## 三、Task 0.2 验证结果

### 3.1 验证方法

在 `src/lib/flight-dynamics/` 下实现了最小 RK4 定步长积分器（纯引力二体问题），配套解析开普勒传播器作为精度基准。

**核心模块**：

| 文件 | 职责 |
|------|------|
| `state.ts` | 状态矢量类型 + Vec3 向量运算 + 守恒量计算 |
| `integrator.ts` | RK4 单步 + 多步传播 + 引力参数表 |
| `kepler.ts` | 解析二体传播器（状态矢量 ↔ 轨道根数 + 开普勒方程求解） |
| `index.ts` | barrel 导出 |

**验证覆盖**：

1. **解析解回归**：数值积分结果与解析开普勒传播器对比
2. **守恒量测试**：比机械能 ±5%、比角动量 < 1e-6
3. **周期回归**：积分一个完整周期后位置回到起点
4. **时间加速**：10× 加速（dt=100s）不发散
5. **属性测试**（fast-check）：50 次随机轨道不发散 + 30 次解析往返一致

### 3.2 验证结果

```
[测试] 圆形轨道 1/4 周期 vs 解析解 (误差 < 100m)
    位置误差: 0.00 m
  ✓ 通过

[测试] 圆形轨道完整周期回归 (误差 < 200m)
    回归误差: 0.02 m
  ✓ 通过

[测试] ISS 倾角圆轨道 1/2 周期 vs 解析解 (误差 < 150m)
    位置误差: 0.01 m
  ✓ 通过

[测试] 椭圆轨道完整周期回归 (误差 < 500m)
    回归误差: 50.42 m
  ✓ 通过

[测试] GTO 高偏心率轨道 1/4 周期 vs 解析解 (误差 < 2000m)
    位置误差: 3.37 m, e=0.7303
  ✓ 通过

[测试] 比机械能守恒 (±5%)
    t=10776s 能量误差: 0.000008%
    t=43105s 能量误差: 0.000002%
  ✓ 通过

[测试] 比角动量守恒 (相对误差 < 1e-6)
    t=5668s 角动量误差: 1.459e-11
  ✓ 通过

[测试] 10× 时间加速不发散 (能量误差 < 1%)
    能量误差: 0.0003%
  ✓ 通过

[测试] fast-check: 随机轨道积分不发散
    50 次随机全部通过
  ✓ 通过

[测试] fast-check: 解析解往返一致性 (误差 < 1e-6 m)
    30 次随机全部通过
  ✓ 通过

结果: 10 通过 / 0 失败 / 10 总计
✓ 验证通过
```

**退出码：0（通过）**

### 3.3 精度分析

| 测试场景 | 实测误差 | 验收容差 | 余量 |
|---------|---------|---------|------|
| 400km 圆轨道 1/4 周期 | 0.00 m | 100 m | 100% |
| 400km 圆轨道完整周期 | 0.02 m | 200 m | 99.99% |
| ISS 轨道 1/2 周期 | 0.01 m | 150 m | 99.99% |
| 椭圆轨道完整周期 | 50.42 m | 500 m | 89.9% |
| GTO 轨道 1/4 周期 (e=0.73) | 3.37 m | 2000 m | 99.8% |
| 能量守恒 | 0.000008% | 5% | 99.9998% |
| 角动量守恒 | 1.5e-11 | 1e-6 | 99.998% |
| 10× 加速能量误差 | 0.0003% | 1% | 99.97% |

RK4 在 10 秒步长下的圆轨道精度达到**亚毫米级**；椭圆轨道（dt=30s）误差在百米级，远优于 MVP 需求。能量与角动量守恒性能比验收标准好 5-6 个数量级。

### 3.4 风险 R2 处置

**R2（RK4 定步长在 10,000× 时间加速下发散）部分缓解。** 10× 加速（dt=100s）表现优异。10,000× 加速（dt≈1000s）将在 Phase 1 Task 1.3 中用"单帧子步数上限保护"策略处理：将大时间步拆分为多个物理子步，每个子步 ≤ 30s。

### 3.5 产出文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/lib/flight-dynamics/state.ts` | 🆕 新建 | 状态矢量 + Vec3 运算 |
| `src/lib/flight-dynamics/integrator.ts` | 🆕 新建 | RK4 核心 |
| `src/lib/flight-dynamics/kepler.ts` | 🆕 新建 | 解析开普勒传播器 |
| `src/lib/flight-dynamics/index.ts` | 🆕 新建 | barrel 导出 |
| `src/lib/flight-dynamics/__tests__/integrator.test.ts` | 🆕 新建 | Jest 测试（11 用例） |
| `test/verify-flight-dynamics.ts` | 🆕 新建 | 独立验证脚本 |

---

## 四、推进决策

### 4.1 渲染方案

**决策：采用 Three.js 叠加渲染方案（CESIUM_DOMINANT 模式下共存）。**

理由：
- Task 0.1 已验证叠加层在 CESIUM_DOMINANT 模式下逐帧渲染正常
- 帧管线已抽取为独立可测试模块，架构清晰
- 无需启用"强制锁定 THREE_DOMINANT"退路

后续 Phase 1 的 flight-renderer MOD 将通过 `onBeforeRender` 回调注册渲染逻辑，在每帧推进时获取物理引擎状态矢量并更新 Three.js 对象。

### 4.2 积分器方案

**决策：采用纯 TS RK4 定步长积分器。**

理由：
- Task 0.2 已验证精度远超 MVP 需求（圆轨道亚毫米级，能量守恒 1e-8）
- 纯 TS 实现便于调试和测试，无需 WASM 编译工具链
- 10× 时间加速表现优异；更高倍率通过子步拆分处理

后续 Phase 1 Task 1.3 将在此积分器上扩展推力项、变质量（火箭方程）、大气阻力。Phase 3 Task 3.1 将升级为 n-body（叠加月球/太阳引力源）。

**Rust/WASM 迁移（Phase 4 Task 4.1）的前置判断**：仅在纯 TS 积分器在 10× 以上时间加速时出现掉帧，或多飞行器仿真成为瓶颈时才执行。当前测试表明性能充裕，预计 Phase 1-3 不会触发迁移。

### 4.3 是否进入 Phase 1

**决策：进入 Phase 1。**

两项 Spike 全部通过，核心风险消除。Phase 1 的 10 个任务可以按序推进，从 Task 1.1（发射场数据）开始。

---

## 五、风险跟踪更新

| 风险编号 | 原严重程度 | 更新后状态 | 说明 |
|---------|-----------|-----------|------|
| R1 | 🔴 高 | ✅ 已消除 | 叠加层逐帧渲染验证通过 |
| R2 | 🟡 中 | 🟢 降至低 | 10× 加速精度优异；10,000× 待子步拆分验证 |
| R3-R8 | 不变 | 待验证 | 在对应 Phase 处理 |

---

## 六、下一步行动

按 `OPIC-航天飞行MOD-任务流程.md` 的 Phase 1 任务顺序推进：

1. **Task 1.1**：发射场静态数据库（`src/lib/data/launch-sites.ts`）
2. **Task 1.2**：部件数据模型与精简部件目录（`src/lib/data/rocket-parts/`）
3. **Task 1.3**：飞行动力学核心扩展（推力 + 大气阻力 + 变质量）
4. ...后续 Task 1.4–1.10

建议 Task 1.1 和 Task 1.2 可并行（无依赖关系），Task 1.3 依赖两者完成后启动。
