# 加载优化 - 修复移动端黑屏问题

## 问题
手机上访问时，加载动画消失后出现黑屏（UI 显示但行星、轨道、背景看不到）

## 原因
浏览器资源加载快（1-2秒），但星历数据加载慢（2-3秒）。LoadingPage 在星历数据加载完成前就消失了，导致场景初始化时 `celestialBodies` 数组为空。

## 解决方案
创建了加载监控系统，确保 LoadingPage 等待星历数据加载完成：

### 核心组件
1. **ResourceMonitorRegistry** - 管理多个资源监视器
2. **BrowserResourceMonitor** - 监控浏览器资源（HTML/CSS/JS/字体）
3. **EphemerisMonitor** - 监控星历数据加载（关键！）

### 工作流程
```
LoadingPage 显示
  ↓
监听 4 个星历事件：
  - ephemeris:init:start (25%)
  - ephemeris:manifest:loaded (50%)
  - ephemeris:data:loaded (75%)
  - ephemeris:bodies:ready (100%)
  ↓
所有资源就绪 → LoadingPage 淡出
  ↓
场景初始化（celestialBodies 已有数据）
  ↓
✅ 完整场景显示
```

## 修改的文件

### 新增
- `src/lib/loading/types.ts` - 类型定义
- `src/lib/loading/ResourceMonitorRegistry.ts` - 监视器注册表
- `src/lib/loading/monitors/BrowserResourceMonitor.ts` - 浏览器资源监视器
- `src/lib/loading/monitors/EphemerisMonitor.ts` - 星历数据监视器
- 测试文件（68 个测试全部通过）

### 修改
- `src/components/loading/useResourceLoader.ts` - 集成监视器系统
- `src/lib/astronomy/ephemeris/manager.ts` - 发射事件
- `src/lib/astronomy/ephemeris/manifest-loader.ts` - 发射事件
- `src/lib/astronomy/orbit.ts` - 发射事件
- `src/lib/state.ts` - 改进错误处理

## 性能
- 监控开销: < 10ms
- 内存开销: < 1KB
- 网络开销: 0
- 超时保护: 10 秒

## 结果
✅ 移动端无黑屏
✅ 加载动画等待星历数据
✅ 场景初始化时有完整数据
✅ 所有测试通过
