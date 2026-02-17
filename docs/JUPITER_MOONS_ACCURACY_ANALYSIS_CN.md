# 木星卫星位置精度分析与改进方案

## 问题描述

网站上木星卫星（Io、Europa、Ganymede、Callisto）的位置与 NASA Eyes 显示的位置存在明显差异。

## 当前实现分析

### 现有模型（`src/lib/astronomy/orbit.ts`）

```typescript
// 当前使用的简化圆形轨道模型
function calculateSatellitePosition(sat, daysSinceJ2000, parentAxisQuaternion) {
  const theta = (2 * Math.PI * (daysSinceJ2000 / sat.periodDays + (sat.phase || 0))) % (2 * Math.PI);
  const x_orb = sat.a * Math.cos(theta);
  const y_orb = sat.a * Math.sin(theta);
  // ... 简单的坐标变换
}
```

### 当前参数（伽利略卫星）

| 卫星 | 半长轴 (km) | 周期 (天) | 倾角 (°) | 初始相位 |
|------|------------|----------|---------|---------|
| Io | 421,700 | 1.769 | 0.04 | 0.02 |
| Europa | 671,034 | 3.551 | 0.47 | 0.25 |
| Ganymede | 1,070,412 | 7.154 | 0.18 | 0.50 |
| Callisto | 1,882,700 | 16.689 | 0.19 | 0.75 |

## 造成差异的 6 个核心原因

### 1️⃣ 星历模型不同（最主要原因）

| 系统 | 使用模型 | 精度 |
|------|---------|------|
| **NASA Eyes** | JPL DE 系列 + JUP365 专用卫星星历 | 公里级 |
| **当前网站** | 简化圆形轨道 + 固定周期 | 数百到数千公里 |
| **其他星图软件** | VSOP87（仅行星）+ 简化卫星模型 | 数度角度差 |

**影响**：这是最大的误差来源，可能导致数度的角度偏差。

### 2️⃣ 时间尺度差异

不同软件使用不同时间标准：

- **UTC**：民用时间（协调世界时）
- **TT**：地球时（Terrestrial Time），天文计算标准
- **TDB**：质心动力学时（Barycentric Dynamical Time），行星动力学

**当前问题**：
```typescript
// 当前代码直接使用 Julian Day，未明确时间标准
const daysSinceJ2000 = julianDay - 2451545.0;
```

**影响**：可能造成数角分的偏差。

### 3️⃣ 参考系不同

可能的参考系：
- 地心视角 vs 日心视角 vs 木心视角
- J2000 惯性系 vs 当前历元
- 地平坐标系 vs 黄道坐标系

**当前实现**：使用木心参考系 + 黄道坐标系

### 4️⃣ 光行时修正（Light-time correction）

**关键差异点**：

- 木星距离地球：4-6 AU
- 光行时：约 30-50 分钟
- 卫星轨道角度变化：
  - Io：1.769 天周期 → 50分钟 ≈ 10° 角度差
  - Europa：3.551 天周期 → 50分钟 ≈ 5° 角度差

| 软件 | 光行时修正 |
|------|-----------|
| NASA Eyes | ✔ |
| Gaia Sky | 部分 |
| 当前网站 | ✘ |

**影响**：这是你看到明显差异的常见原因！

### 5️⃣ 章动、岁差、相对论修正

高精度系统考虑：
- 岁差（Precession）
- 章动（Nutation）
- 光行差（Aberration）
- 相对论效应

**当前实现**：未考虑这些修正

**影响**：小，但长期可见

### 6️⃣ 数值积分 vs 解析解

| 方法 | 特点 | 适用场景 |
|------|------|---------|
| **数值积分**（JPL） | 极高精度，考虑所有摄动 | 专业天文软件 |
| **解析解**（教学模型） | 快速但近似 | 教学、可视化 |

**当前实现**：使用解析解（圆形轨道近似）

**影响**：木星卫星系统用解析解误差会很明显

## 改进方案

### 方案 1：使用 SPICE 工具包（推荐，最高精度）

**优点**：
- 与 NASA Eyes 使用相同的数据源
- 公里级精度
- 包含所有修正（光行时、岁差、章动等）

**实现步骤**：
1. 集成 WebAssembly 版本的 SPICE（如 `spice.js`）
2. 下载必要的内核文件：
   - `de440.bsp`（行星星历）
   - `jup365.bsp`（木星卫星）
   - `naif0012.tls`（闰秒）
3. 替换当前的 `calculateSatellitePosition` 函数

**缺点**：
- 需要下载额外的数据文件（~50-100 MB）
- 增加初始加载时间
- 实现复杂度较高

### 方案 2：使用改进的解析模型（L1 理论）

**L1 理论**（Lieske 1980）是木星卫星的半解析理论，精度介于简化模型和 SPICE 之间。

**优点**：
- 无需额外数据文件
- 精度显著提高（角秒级）
- 实现相对简单

**实现要点**：
```typescript
// L1 理论包含：
// 1. 椭圆轨道参数（非圆形）
// 2. 木星扁率摄动（J2, J4）
// 3. 卫星间相互摄动
// 4. 太阳摄动
```

### 方案 3：添加光行时修正（快速改进）

**最小改动，立即见效**：

```typescript
function calculateSatellitePositionWithLightTime(
  sat: SatelliteDefinition,
  julianDay: number,
  observerToJupiterDistance: number, // AU
  parentAxisQuaternion: THREE.Quaternion
): THREE.Vector3 {
  // 计算光行时（天）
  const lightTimeAU = 0.00577551833; // 1 AU 的光行时（天）
  const lightTimeDays = observerToJupiterDistance * lightTimeAU;
  
  // 使用提前的时间计算位置
  const correctedJD = julianDay - lightTimeDays;
  const daysSinceJ2000 = correctedJD - 2451545.0;
  
  // 原有的位置计算逻辑
  const theta = (2 * Math.PI * (daysSinceJ2000 / sat.periodDays + (sat.phase || 0))) % (2 * Math.PI);
  // ...
}
```

### 方案 4：使用在线星历服务

**使用 JPL HORIZONS API**：

```typescript
async function fetchJupiterMoonsFromHorizons(julianDay: number) {
  const response = await fetch(
    `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='501'&EPHEM_TYPE='VECTORS'&CENTER='500@5'&START_TIME='${julianDay}'&STOP_TIME='${julianDay}'&STEP_SIZE='1d'`
  );
  // 解析返回的位置数据
}
```

**优点**：
- 最高精度
- 无需本地计算

**缺点**：
- 需要网络连接
- API 调用限制
- 延迟问题

## 推荐实施路线

### 阶段 1：快速改进（1-2 小时）

1. ✅ 添加光行时修正
2. ✅ 修正时间标准（UTC → TDB）
3. ✅ 更新轨道参数（使用最新 IAU 数据）

**预期改进**：误差从数度降低到 1 度以内

### 阶段 2：中期改进（1-2 天）

1. 实现 L1 理论或类似的半解析模型
2. 添加木星扁率摄动
3. 考虑主要的卫星间摄动

**预期改进**：误差降低到角分级别

### 阶段 3：长期方案（1 周）

1. 集成 SPICE 工具包（WebAssembly）
2. 实现完整的星历查询系统
3. 添加所有修正（章动、岁差、光行差）

**预期改进**：达到 NASA Eyes 级别的精度

## 参考资料

1. **JPL HORIZONS System**: https://ssd.jpl.nasa.gov/horizons/
2. **SPICE Toolkit**: https://naif.jpl.nasa.gov/naif/toolkit.html
3. **L1 Theory**: Lieske, J.H. (1980), "Galilean Satellite Evolution"
4. **IAU WGAS**: https://astrogeology.usgs.gov/search/map/Docs/WGCCRE
5. **Astronomical Algorithms**: Jean Meeus (2nd Edition)

## 下一步行动

建议从**阶段 1**开始，快速实现光行时修正，立即改善用户体验。然后根据需求决定是否进入阶段 2 或 3。

---

**创建时间**：2026-02-17  
**状态**：待实施
