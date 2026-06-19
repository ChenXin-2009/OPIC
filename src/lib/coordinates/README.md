# OPIC 坐标系统一约定

> 本文件是 OPIC 坐标系的权威约定文档。任何新代码或修改都必须遵守此约定。

---

## Frame Graph 层次

OPIC 采用 Frame Graph 架构，不强制所有数据走单一路径：

```
数据源入口帧 ──→ 各自接入层 ──→ ICRF (锚点) ──→ RenderWorld (出口)
                                    ↑                   │
                          Cesium Fixed/ECEF      Three.js Scene
```

| 概念 | 定义 | 说明 |
|---|---|---|
| **ICRF/ICRS** | J2000.0 mean equatorial 惯性系 | 唯一惯性锚点；X=春分点，Y=赤道面内 6h，Z=天球北极；所有天体方向在此收敛 |
| **RenderWorld** | J2000 mean ecliptic，单位 AU | OPIC 的物理世界坐标基；X=春分点，Y=黄道面内 90°，Z=黄道北极；Three.js 场景即为此帧 |
| **ObjectLocal** | Three.js mesh 的几何坐标基 | 通常 Y-up；不直接参与物理计算 |
| **WorldAdapter** | ObjectLocal ↔ RenderWorld 桥接 | 薄层，不引入额外旋转，仅协调 Two.js 默认轴与 RenderWorld 的差异 |

---

## RenderWorld 冻结约定

### 坐标基

```
OPIC RenderWorld, J2000 ecliptic, unit = AU
X = J2000 mean equinox / ecliptic longitude 0°
Y = ecliptic longitude 90°, inside ecliptic plane
Z = north ecliptic pole
右手系：+X × +Y = +Z
```

### Three.js 集成

- Three.js Scene 的 **世界坐标系** = RenderWorld。不要额外添加父 group 旋转。
- Three.js mesh 可以继续 Y-up 建模，但所有 **物理位置、轨道法线、恒星方向、星系方向** 进入场景前必须先变换到 RenderWorld。
- 变换在 `ObjectLocal` → `RenderWorld` 的薄层中完成，不混入物理计算。

### 禁止的模式

- ❌ 不要在物理层假设 Three.js Y-up 就是"上方"（Three.js Y!=黄道北极，Z 才是）
- ❌ 不要在物理数据上做 `(x, z, -y)` 这类私有轴映射（应集中在帧变换函数中）
- ❌ 不要用固定度数（如 `rotationX(66.56°)`）做"补偿旋转"（应使用 `frames/ecliptic.ts` 的函数）
- ❌ 不要将 ECEF/ITRF 与 ICRF/赤道惯性系混为一谈（它们差一个 Earth Rotation Angle）

---

## 变换引用

| 变换 | 模块 | 函数 |
|---|---|---|
| ICRF ↔ RenderWorld (J2000 ecliptic) | `src/lib/coordinates/frames/ecliptic.ts` | `icrfToEcliptic` / `eclipticToIcrf` |
| ObjectLocal ↔ RenderWorld | `src/lib/coordinates/frames/world.ts` | `objectLocalToRenderWorld` / `renderWorldToObjectLocal` |
| ICRF ↔ ECEF/ITRF (含地球自转) | `Cesium.Transforms.computeIcrfToFixedMatrix` | 内置 |
| TEME-like ↔ RenderWorld (卫星) | `src/lib/coordinates/frames/teme.ts` | `temeToRenderWorld` / `temeToRenderWorldSimple` |
| ICRS ↔ Galactic | `src/lib/coordinates/frames/galactic.ts` | `icrfToGalactic` / `galacticToIcrf` |
| ICRS ↔ Supergalactic | `src/lib/coordinates/frames/supergalactic.ts` | `icrfToSupergalactic` / `supergalacticToIcrf` |
| 跨尺度渲染域 | `src/lib/coordinates/scale/render-domain.ts` | `getActiveRenderDomain` / `rtcOffset` |

## 尺度精度约束

OPIC 跨越 ~19 个数量级，GPU Float32 无法承载全尺度坐标：

| 尺度 | 距离量级 (AU) | Float32 分辨率 | 策略 |
|---|---|---|---|
| 地球/卫星 | ~10⁻⁴ | ~10⁻¹¹ AU (~m 级) | RTC（相对地球） |
| 太阳系 | ~10¹ | ~10⁻⁶ AU (~100 km) | 直接 AU |
| 恒星 | ~10⁵ | ~10⁻² AU | 直接 AU |
| 银河系 | ~10⁹ | ~10² AU | Float64 CPU + RTC |
| 超星系团 | ~10¹² | ~10⁵ AU | Float64 CPU + RTC |

切换尺度时使用 200ms 淡入淡出过渡，不混用同一组坐标值。

---

## 别名约定

在新代码中优先使用语义清晰的别名（两者数学等价）：

```ts
import { icrfToRenderWorld, renderWorldToIcrf } from '@/lib/coordinates';
// 等价于
import { icrfToEcliptic, eclipticToIcrf } from '@/lib/coordinates';
```

---

## 参考

- `docs/coordinates/COORDINATE_SYSTEM_ALIGNMENT_PLAN.md` — 审计修订版 v2（权威设计文档）
- `src/lib/coordinates/frames/__tests__/ecliptic.test.ts` — 测试向量（轴向已知点、往返一致性）
