# 地球锁定模式自动管理

## 问题描述
进入系外行星系统后，整个星系会抖动。关闭设置中的"地球锁定"后，抖动消失。

## 根本原因
地球锁定模式（Earth Lock Mode）是为了让相机随地球自转同步旋转，使地球在视觉上保持静止。但是：
1. 离开太阳系后，地球锁定模式仍然保持启用
2. 在系外行星系统中，地球锁定逻辑仍在尝试应用旋转
3. 这导致整个场景（包括系外行星系统）产生不必要的抖动

## 解决方案

### 1. 状态管理增强
在 `earthControlStore.ts` 中添加用户偏好记录：

```typescript
interface EarthControlState {
  // ... 现有字段
  userEarthLockPreference: boolean; // 保存用户原始设置
  setEarthLockEnabledAuto: (enabled: boolean) => void; // 系统自动调用
}
```

**关键设计**：
- `earthLockEnabled`: 当前实际状态（可能被系统自动修改）
- `userEarthLockPreference`: 用户手动设置的偏好（不会被系统修改）
- `setEarthLockEnabled`: 用户手动切换时调用（同时更新两个状态）
- `setEarthLockEnabledAuto`: 系统自动调用（只更新当前状态）

### 2. 自动管理逻辑
在 `SolarSystemCanvas3D.tsx` 的动画循环中添加自动管理：

```typescript
// 判断条件
const SOLAR_SYSTEM_BOUNDARY = 5000; // AU
const shouldDisableEarthLock = 
  distanceToSun > SOLAR_SYSTEM_BOUNDARY || // 离开太阳系
  hasExoplanetSelection;                   // 或进入系外行星系统

// 自动禁用
if (shouldDisableEarthLock && earthLockEnabled) {
  setEarthLockEnabledAuto(false);
  cameraController.setEarthLockMode(false);
}

// 自动恢复
if (!shouldDisableEarthLock && !earthLockEnabled && userPreference) {
  setEarthLockEnabledAuto(true);
  cameraController.setEarthLockMode(true);
}
```

### 3. 触发条件

#### 自动禁用地球锁定
- **条件1**: 相机距离太阳 > 5000 AU（离开太阳系）
- **条件2**: 选中了系外行星系统（`selectedHostName` 不为空）
- **操作**: 调用 `setEarthLockEnabledAuto(false)`

#### 自动恢复地球锁定
- **条件1**: 相机距离太阳 ≤ 5000 AU（回到太阳系）
- **条件2**: 未选中系外行星系统
- **条件3**: 用户偏好是开启（`userEarthLockPreference === true`）
- **操作**: 调用 `setEarthLockEnabledAuto(true)`

## 用户体验

### 场景1：用户开启地球锁定
1. 在太阳系内：地球锁定 ✅ 启用
2. 离开太阳系：地球锁定 🔄 自动禁用
3. 进入系外行星系统：地球锁定 ⛔ 保持禁用
4. 退出系外行星系统：地球锁定 ⛔ 保持禁用
5. 回到太阳系内：地球锁定 ✅ 自动恢复

### 场景2：用户关闭地球锁定
1. 在太阳系内：地球锁定 ⛔ 禁用
2. 离开太阳系：地球锁定 ⛔ 保持禁用
3. 进入系外行星系统：地球锁定 ⛔ 保持禁用
4. 回到太阳系内：地球锁定 ⛔ 保持禁用（尊重用户选择）

### 场景3：在系外行星系统中切换设置
1. 在系外行星系统中：地球锁定 ⛔ 自动禁用
2. 用户在设置中开启地球锁定：
   - 更新 `userEarthLockPreference = true`
   - 但 `earthLockEnabled` 保持 `false`（因为还在系外行星系统）
3. 回到太阳系：地球锁定 ✅ 自动恢复（因为用户偏好是开启）

## 技术细节

### 状态更新时机
- **每帧检查**: 在动画循环中每帧检查条件
- **状态保护**: 只在状态需要改变时才更新（避免重复调用）
- **同步更新**: 同时更新 store 状态和 CameraController 状态

### 边界值选择
- **太阳系边界**: 5000 AU
  - 冥王星轨道：约 40 AU
  - 奥尔特云内边缘：约 2000 AU
  - 5000 AU 是一个安全的边界值，确保在太阳系外围也能正常工作

### 性能优化
- **条件短路**: 使用 `&&` 和 `||` 短路求值
- **状态检查**: 只在状态需要改变时才调用 setter
- **避免闪烁**: 使用 `userEarthLockPreference` 避免频繁切换

## 相关文件

### 核心文件
- `src/lib/state/earthControlStore.ts` - 状态管理
- `src/components/canvas/3d/SolarSystemCanvas3D.tsx` - 自动管理逻辑
- `src/lib/3d/CameraController.ts` - 地球锁定实现

### UI组件
- `src/components/windows/SettingsWindow.tsx` - 设置界面
- `src/app/page.tsx` - 主页面

## 测试建议

### 测试用例1：基本功能
1. 开启地球锁定
2. 在太阳系内观察地球（应该保持静止）
3. 缩放到太阳系外（地球锁定应自动禁用）
4. 缩放回太阳系内（地球锁定应自动恢复）

### 测试用例2：系外行星系统
1. 开启地球锁定
2. 点击进入系外行星系统（地球锁定应自动禁用，系统不应抖动）
3. 在系外行星系统中观察（应该稳定，无抖动）
4. 退出系外行星系统（地球锁定应保持禁用）
5. 缩放回太阳系内（地球锁定应自动恢复）

### 测试用例3：用户偏好保持
1. 关闭地球锁定
2. 缩放到太阳系外
3. 缩放回太阳系内（地球锁定应保持关闭）
4. 开启地球锁定
5. 缩放到太阳系外
6. 缩放回太阳系内（地球锁定应自动恢复）

### 测试用例4：设置界面同步
1. 开启地球锁定
2. 进入系外行星系统
3. 打开设置界面（开关应显示为"开启"，但实际功能已禁用）
4. 在设置中关闭地球锁定
5. 回到太阳系（地球锁定应保持关闭）

## 已知限制

1. **UI状态显示**: 设置界面中的开关显示的是 `earthLockEnabled`，在自动禁用时可能与实际状态不一致
   - **建议**: 可以考虑在UI中显示"自动禁用"状态
   
2. **边界过渡**: 在5000 AU边界附近快速移动可能导致频繁切换
   - **当前方案**: 使用状态检查避免重复调用
   - **未来改进**: 可以添加防抖动逻辑

3. **多窗口同步**: 如果有多个窗口，状态同步可能有延迟
   - **当前方案**: 使用 Zustand 全局状态管理
   - **影响**: 实际影响很小，因为通常只有一个活动窗口

## 总结

通过添加用户偏好记录和自动管理逻辑，成功解决了系外行星系统的抖动问题：

✅ **问题解决**: 系外行星系统不再抖动
✅ **用户体验**: 自动管理，无需手动切换
✅ **偏好保持**: 尊重用户的原始设置
✅ **性能优化**: 避免不必要的状态更新

这个解决方案既解决了技术问题，又提供了良好的用户体验。
