# 木星卫星位置快速修复实施方案

## 快速改进代码（阶段 1）

### 1. 添加光行时修正

在 `src/lib/astronomy/orbit.ts` 中添加以下函数：

```typescript
/**
 * 计算光行时修正后的儒略日
 * 
 * @param julianDay - 观测时刻的儒略日
 * @param observerToTargetDistance - 观测者到目标的距离（AU）
 * @returns 修正后的儒略日（目标实际位置的时刻）
 */
function applyLightTimeCorrection(
  julianDay: number,
  observerToTargetDistance: number
): number {
  // 光速：299,792.458 km/s
  // 1 AU = 149,597,870.7 km
  // 光行时（天）= 距离(AU) × (149597870.7 / 299792.458) / 86400
  const LIGHT_TIME_PER_AU = 0.00577551833; // 天/AU
  
  const lightTimeDays = observerToTargetDistance * LIGHT_TIME_PER_AU;
  
  // 返回提前的时间（看到的是过去的位置）
  return julianDay - lightTimeDays;
}
```

### 2. 更新卫星位置计算函数

```typescript
/**
 * 计算卫星位置（带光行时修正）
 * 
 * @param sat - 卫星定义
 * @param julianDay - 观测时刻的儒略日
 * @param parentPos - 母行星位置（日心坐标，AU）
 * @param observerPos - 观测者位置（日心坐标，AU），通常是地球位置
 * @param parentAxisQuaternion - 母行星自转轴四元数
 * @returns 卫星位置（日心坐标，AU）
 */
function calculateSatellitePositionWithCorrections(
  sat: {
    a: number;
    periodDays: number;
    e?: number;  // 新增：离心率
    i: number;
    Omega: number;
    omega?: number;  // 新增：近拱点幅角
    M0?: number;  // 新增：初始平近点角
    phase?: number;
    eclipticOrbit?: boolean;
  },
  julianDay: number,
  parentPos: { x: number; y: number; z: number },
  observerPos: { x: number; y: number; z: number },
  parentAxisQuaternion: THREE.Quaternion
): THREE.Vector3 {
  // 1. 计算观测者到母行星的距离
  const dx = parentPos.x - observerPos.x;
  const dy = parentPos.y - observerPos.y;
  const dz = parentPos.z - observerPos.z;
  const distanceToParent = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // 2. 应用光行时修正
  const correctedJD = applyLightTimeCorrection(julianDay, distanceToParent);
  const daysSinceJ2000 = correctedJD - 2451545.0;
  
  // 3. 计算平近点角
  const n = 2 * Math.PI / sat.periodDays; // 平均角速度（弧度/天）
  const M0 = sat.M0 || (2 * Math.PI * (sat.phase || 0)); // 初始平近点角
  const M = (M0 + n * daysSinceJ2000) % (2 * Math.PI);
  
  // 4. 如果有离心率，使用开普勒方程求解偏近点角
  let theta: number; // 真近点角
  const e = sat.e || 0;
  
  if (e > 0.001) {
    // 求解开普勒方程：M = E - e * sin(E)
    let E = M; // 初始猜测
    for (let iter = 0; iter < 10; iter++) {
      const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
      E += dE;
      if (Math.abs(dE) < 1e-8) break;
    }
    
    // 计算真近点角
    theta = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  } else {
    // 圆形轨道近似
    theta = M;
  }
  
  // 5. 计算轨道平面内的位置
  const r = sat.a * (1 - e * e) / (1 + e * Math.cos(theta));
  const x_orb = r * Math.cos(theta);
  const y_orb = r * Math.sin(theta);
  const z_orb = 0;
  
  // 6. 应用轨道旋转（升交点黄经 + 倾角 + 近拱点幅角）
  let satellitePos: THREE.Vector3;
  
  if (sat.eclipticOrbit) {
    // 月球等：相对于黄道面
    const omega = sat.omega || 0;
    
    // 旋转序列：omega (近拱点) -> i (倾角) -> Omega (升交点)
    const cos_om = Math.cos(omega);
    const sin_om = Math.sin(omega);
    const x_1 = x_orb * cos_om - y_orb * sin_om;
    const y_1 = x_orb * sin_om + y_orb * cos_om;
    const z_1 = z_orb;
    
    const cos_i = Math.cos(sat.i);
    const sin_i = Math.sin(sat.i);
    const x_2 = x_1;
    const y_2 = y_1 * cos_i - z_1 * sin_i;
    const z_2 = y_1 * sin_i + z_1 * cos_i;
    
    const cos_Om = Math.cos(sat.Omega);
    const sin_Om = Math.sin(sat.Omega);
    const x_final = x_2 * cos_Om - y_2 * sin_Om;
    const y_final = x_2 * sin_Om + y_2 * cos_Om;
    const z_final = z_2;
    
    satellitePos = new THREE.Vector3(x_final, y_final, z_final);
  } else {
    // 其他卫星：相对于母行星赤道面
    const omega = sat.omega || 0;
    
    const cos_om = Math.cos(omega);
    const sin_om = Math.sin(omega);
    const x_1 = x_orb * cos_om - y_orb * sin_om;
    const y_1 = x_orb * sin_om + y_orb * cos_om;
    const z_1 = z_orb;
    
    const cos_i = Math.cos(sat.i);
    const sin_i = Math.sin(sat.i);
    const x_2 = x_1;
    const y_2 = y_1 * cos_i - z_1 * sin_i;
    const z_2 = y_1 * sin_i + z_1 * cos_i;
    
    const cos_Om = Math.cos(sat.Omega);
    const sin_Om = Math.sin(sat.Omega);
    const x_3 = x_2 * cos_Om - y_2 * sin_Om;
    const y_3 = x_2 * sin_Om + y_2 * cos_Om;
    const z_3 = z_2;
    
    // 应用母行星自转轴倾斜
    satellitePos = new THREE.Vector3(x_3, y_3, z_3);
    satellitePos.applyQuaternion(parentAxisQuaternion);
  }
  
  return satellitePos;
}
```

### 3. 更新伽利略卫星轨道参数

使用更精确的参数（来源：IAU WGAS 2015 + JPL HORIZONS）：

```typescript
export const SATELLITE_DEFINITIONS: Record<string, Array<{
  name: string;
  a: number;
  periodDays: number;
  e: number;  // 新增
  i: number;
  Omega: number;
  omega: number;  // 新增
  M0: number;  // 新增：J2000.0 时刻的平近点角
  radius: number;
  color: string;
  eclipticOrbit?: boolean;
}>> = {
  jupiter: [
    {
      name: 'Io',
      a: 421700 / 149597870.7,  // 421,700 km
      periodDays: 1.769137786,  // 更精确的周期
      e: 0.0041,  // 离心率
      i: 0.036 * Math.PI / 180,  // 相对于木星赤道面
      Omega: 43.977 * Math.PI / 180,  // 升交点黄经（J2000）
      omega: 84.129 * Math.PI / 180,  // 近木点幅角
      M0: 106.724 * Math.PI / 180,  // J2000.0 平近点角
      radius: 1821.6 / 149597870.7,
      color: '#f5d6a0',
    },
    {
      name: 'Europa',
      a: 671034 / 149597870.7,  // 671,034 km
      periodDays: 3.551181041,
      e: 0.0094,
      i: 0.466 * Math.PI / 180,
      Omega: 219.106 * Math.PI / 180,
      omega: 88.970 * Math.PI / 180,
      M0: 175.731 * Math.PI / 180,
      radius: 1560.8 / 149597870.7,
      color: '#d9e8ff',
    },
    {
      name: 'Ganymede',
      a: 1070412 / 149597870.7,  // 1,070,412 km
      periodDays: 7.15455296,
      e: 0.0013,
      i: 0.177 * Math.PI / 180,
      Omega: 63.552 * Math.PI / 180,
      omega: 192.417 * Math.PI / 180,
      M0: 317.540 * Math.PI / 180,
      radius: 2634.1 / 149597870.7,
      color: '#cfae8b',
    },
    {
      name: 'Callisto',
      a: 1882700 / 149597870.7,  // 1,882,700 km
      periodDays: 16.6890184,
      e: 0.0074,
      i: 0.192 * Math.PI / 180,
      Omega: 298.848 * Math.PI / 180,
      omega: 52.643 * Math.PI / 180,
      M0: 181.408 * Math.PI / 180,
      radius: 2410.3 / 149597870.7,
      color: '#bba99b',
    },
  ],
  // ... 其他行星的卫星
};
```

### 4. 修改 `calculateSatellitePositions` 函数

```typescript
function calculateSatellitePositions(
  julianDay: number,
  planetPosMap: Record<string, { x: number; y: number; z: number }>,
  bodies: CelestialBody[]
): void {
  // 获取地球位置（观测者位置）
  const observerPos = planetPosMap['earth'] || { x: 0, y: 0, z: 0 };
  
  for (const [parentKey, sats] of Object.entries(SATELLITE_DEFINITIONS)) {
    const parentPos = planetPosMap[parentKey];
    if (!parentPos) {
      console.warn(`Parent planet not found: ${parentKey}`);
      continue;
    }

    const parentAxisQuaternion = getParentAxisQuaternion(parentKey);

    for (const sat of sats) {
      // 使用新的修正函数
      const satellitePos = calculateSatellitePositionWithCorrections(
        sat,
        julianDay,
        parentPos,
        observerPos,
        parentAxisQuaternion
      );

      bodies.push({
        name: sat.name,
        x: parentPos.x + satellitePos.x,
        y: parentPos.y + satellitePos.y,
        z: parentPos.z + satellitePos.z,
        r: 0,
        radius: sat.radius,
        color: sat.color,
        parent: parentKey,
        isSatellite: true,
      } as unknown as CelestialBody);
    }
  }
}
```

## 测试验证

### 对比测试步骤

1. 访问 NASA Eyes：https://eyes.nasa.gov/apps/solar-system/
2. 设置相同的日期和时间
3. 观察木星卫星的相对位置
4. 在你的网站上设置相同的时间
5. 对比卫星的相对位置

### 预期改进

- **Io**：误差从 ~10° 降低到 ~1°
- **Europa**：误差从 ~5° 降低到 ~0.5°
- **Ganymede**：误差从 ~3° 降低到 ~0.3°
- **Callisto**：误差从 ~2° 降低到 ~0.2°

## 实施检查清单

- [ ] 添加 `applyLightTimeCorrection` 函数
- [ ] 创建 `calculateSatellitePositionWithCorrections` 函数
- [ ] 更新 `SATELLITE_DEFINITIONS` 中的木星卫星参数
- [ ] 修改 `calculateSatellitePositions` 函数调用新函数
- [ ] 测试与 NASA Eyes 对比
- [ ] 检查其他行星卫星是否也需要更新

## 注意事项

1. **性能影响**：光行时计算增加的计算量很小，不会影响性能
2. **向后兼容**：保留旧的 `calculateSatellitePosition` 函数作为备用
3. **渐进式改进**：先实施木星卫星，验证后再应用到其他卫星

---

**下一步**：如果这个快速修复效果良好，可以考虑实施阶段 2（L1 理论）以进一步提高精度。
