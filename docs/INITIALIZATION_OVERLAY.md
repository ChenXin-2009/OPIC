# 初始化遮罩实现文档

## 概述

在进入页面聚焦到地球之前,添加了一个半透明黑色模糊遮罩,显示Logo和真实的初始化进度。

## 实现方案

采用**方案B**:独立的初始化状态管理,跟踪各个初始化阶段并显示真实进度。

## 核心组件

### 1. InitializationOverlay 组件
位置: `src/components/InitializationOverlay.tsx`

**功能:**
- 半透明黑色背景 (85% 不透明度)
- 模糊效果 (backdrop-filter: blur(10px))
- 居中显示 CXIC Logo (带脉冲动画)
- 进度条显示真实初始化进度
- 进度百分比显示
- 初始化完成后平滑淡出 (500ms 延迟 + 500ms 淡出)

**Props:**
```typescript
interface InitializationProgress {
  stage: string;      // 当前阶段
  progress: number;   // 进度 0-100
  isComplete: boolean; // 是否完成
}
```

**支持的阶段:**
- `loading`: 加载资源 (0-60%) - 页面和库加载
- `idle`: 准备中 (60%)
- `scene`: 初始化场景 (60-68%)
- `universe`: 加载宇宙数据 (68-76%)
- `celestialBodies`: 加载天体数据 (76-92%)
- `textures`: 加载纹理 (92-98%)
- `complete`: 初始化完成 (100%)

### 2. SolarSystemCanvas3D 修改
位置: `src/components/canvas/3d/SolarSystemCanvas3D.tsx`

**新增 Props:**
```typescript
onInitializationProgress?: (stage: string, progress: number, isComplete: boolean) => void;
```

## 进度跟踪点

### 阶段划分

整个加载过程分为两个主要部分:

#### 1. 页面资源加载 (0-60%)
在主页面组件中通过定时器模拟,跟踪:
- Next.js 框架加载
- React 组件渲染
- Three.js 库加载
- 其他 node_modules 依赖

**实现方式:**
```typescript
useEffect(() => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 2;
    if (progress >= 60) {
      progress = 60;
      clearInterval(interval);
    }
    setInitProgress({ stage: 'loading', progress, isComplete: false });
  }, 50); // 每50ms增加2%,约1.5秒到达60%
}, []);
```

#### 2. 场景初始化 (60-100%)
在 SolarSystemCanvas3D 中跟踪真实进度,映射到 60-100% 范围:

1. **场景初始化** (60-68%): SceneManager 创建
2. **宇宙数据加载** (68-76%): 异步加载本星系群、近邻星系群等数据
3. **天体创建** (76-92%): 创建太阳、行星、卫星及其轨道
4. **纹理加载** (92-98%): 模拟纹理异步加载进度
5. **完成** (100%): 所有初始化完成

**进度映射:**
```typescript
onInitializationProgress={(stage, progress, isComplete) => {
  // 将场景初始化进度 (0-100) 映射到 60-100% 范围
  const mappedProgress = 60 + (progress * 0.4);
  setInitProgress({ stage, progress: mappedProgress, isComplete });
}}
```

### 3. 主页面集成
位置: `src/app/page.tsx`

**状态管理:**
```typescript
const [initProgress, setInitProgress] = useState({
  stage: 'idle',
  progress: 0,
  isComplete: false,
});
```

**组件使用:**
```tsx
<InitializationOverlay progress={initProgress} lang={lang} />

<SolarSystemCanvas3D 
  onInitializationProgress={(stage, progress, isComplete) => {
    setInitProgress({ stage, progress, isComplete });
  }}
/>
```

## 视觉效果

### 遮罩样式
- 背景: `rgba(0, 0, 0, 0.85)` + `blur(10px)`
- z-index: `9999` (最顶层)
- 全屏覆盖: `fixed inset-0`

### Logo
- 尺寸: 128x128px
- 动画: `animate-pulse` (呼吸效果)
- 图片: `/CX.svg`

### 进度条
- 宽度: 300px
- 高度: 4px (容器) + 4px (填充)
- 颜色: 灰色背景 + 白色填充
- 效果: 白色光晕 `box-shadow: 0 0 10px rgba(255, 255, 255, 0.5)`
- 过渡: `transition-all duration-300 ease-out`

### 文字
- 阶段文本: 16px, 大写, 字母间距 1px
- 百分比: 14px, 70% 不透明度
- 字体: Novecento Wide (数字专用字体)

## 动画时序

1. **页面加载开始**: 遮罩立即显示,进度 0%
2. **资源加载阶段** (0-60%): 
   - 模拟进度,每 50ms 增加 2%
   - 约 1.5 秒到达 60%
   - 显示 "加载资源..." / "Loading Resources..."
3. **场景初始化阶段** (60-100%):
   - 真实跟踪 Three.js 场景初始化
   - 显示具体阶段名称
4. **初始化完成**: 
   - 延迟 500ms
   - 淡出动画 500ms
   - 移除组件
5. **总时长**: 约 2-3 秒 (取决于实际加载速度)

## 多语言支持

阶段名称支持中英文:
- 中文: 加载资源、准备中、初始化场景、加载天体数据、加载宇宙数据、加载纹理、初始化完成
- 英文: Loading Resources、Preparing、Initializing Scene、Loading Celestial Bodies、Loading Universe Data、Loading Textures、Initialization Complete

## 性能考虑

1. **两阶段加载**: 
   - 第一阶段 (0-60%): 模拟进度,避免用户看到空白屏幕
   - 第二阶段 (60-100%): 真实进度,准确反映场景初始化状态
2. **异步加载**: 宇宙数据和纹理异步加载,不阻塞主线程
3. **进度模拟**: 纹理加载使用定时器模拟进度,避免频繁更新
4. **组件卸载**: 完成后完全移除组件,释放内存
5. **GPU 加速**: 使用 `backdrop-filter` 和 `transform` 触发 GPU 加速

## 注意事项

1. **z-index 层级**: 遮罩使用 `z-index: 9999`,确保在所有元素之上
2. **指针事件**: 遮罩期间禁用所有交互 (默认行为)
3. **响应式**: 自动适配不同屏幕尺寸
4. **无障碍**: 使用语义化 HTML,支持屏幕阅读器

## 未来优化

1. 可以添加更精确的纹理加载进度跟踪
2. 可以添加加载失败的错误处理
3. 可以添加跳过动画的选项
4. 可以添加自定义主题颜色
