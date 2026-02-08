# 加载动画统一方案

## 问题
用户反馈两个加载动画看起来不同：
1. 静态加载器（React 挂载前）- 只有简单的旋转圆圈
2. React 加载器（React 挂载后）- 完整的明日方舟风格界面

## 解决方案

### 1. 统一视觉设计
将两个加载器改为完全相同的明日方舟风格设计：

**共同元素：**
- 黑色背景 (#000)
- 蓝色强调色 (sky-500: #0EA5E9)
- 几何装饰元素：
  - 左上角大三角形
  - 右下角矩形边框
  - 对角线装饰
  - 四角装饰线
  - 小几何图形点缀
- 中心进度条（替代旋转圆圈）
- "LOADING" 文本
- 三个脉冲点动画

### 2. 进度条设计
替换旋转圆圈为水平进度条：

```
LOADING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● ● ●
```

**进度条特点：**
- 宽度：最大 20rem（320px）
- 高度：4px
- 背景：rgba(14, 165, 233, 0.2)
- 填充：rgb(14, 165, 233)
- 动画：2秒循环，0% → 70% → 100%
- 两端装饰线

### 3. 实现细节

#### 静态加载器（layout.tsx）
- 所有样式内联在 `<head>` 的 `<style>` 标签中
- 所有 HTML 结构直接在 `<body>` 中
- 确保在任何 CSS 加载前就显示
- 使用纯 CSS 类名（不依赖 Tailwind）

#### React 加载器（LoadingPage.tsx + ArknightsVisuals.tsx）
- 使用 Tailwind CSS 类
- 响应式设计（sm, md, lg 断点）
- 支持动画控制（isAnimating prop）
- 完整的可访问性支持（ARIA 属性）

### 4. 过渡流程

```
页面加载
    ↓
静态加载器显示（带完整几何装饰 + 进度条）
    ↓
React 挂载
    ↓
静态加载器隐藏（body.react-mounted）
    ↓
React 加载器显示（相同的几何装饰 + 进度条）
    ↓
资源加载完成 + 最小显示时间（1000ms）
    ↓
淡出动画（400ms）
    ↓
主内容显示
```

### 5. 视觉一致性

两个加载器现在完全一致：

| 元素 | 静态加载器 | React 加载器 | 状态 |
|------|-----------|-------------|------|
| 黑色背景 | ✅ | ✅ | 一致 |
| 左上角三角形 | ✅ | ✅ | 一致 |
| 右下角矩形框 | ✅ | ✅ | 一致 |
| 对角线装饰 | ✅ | ✅ | 一致 |
| 四角装饰线 | ✅ | ✅ | 一致 |
| 小几何图形 | ✅ | ✅ | 一致 |
| 进度条 | ✅ | ✅ | 一致 |
| LOADING 文本 | ✅ | ✅ | 一致 |
| 脉冲点 | ✅ | ✅ | 一致 |

### 6. 性能影响

**静态加载器：**
- HTML 大小增加：约 2KB
- CSS 大小增加：约 3KB
- 总计：约 5KB
- 优势：立即显示，无闪烁

**React 加载器：**
- 无额外开销
- 使用 Tailwind CSS（已加载）
- GPU 加速动画

### 7. 测试结果

```bash
npm test -- --testPathPatterns="loading"
```

- ✅ 74 个测试全部通过
- ✅ LoadingPage 测试通过
- ✅ ArknightsVisuals 测试通过
- ✅ LoadingSpinner 测试通过
- ✅ useResourceLoader 测试通过

### 8. 浏览器兼容性

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ 移动浏览器
- ✅ 支持 CSS 动画的所有现代浏览器

### 9. 相关文件

**修改的文件：**
- `src/app/layout.tsx` - 静态加载器实现
- `src/app/globals.css` - 进度条动画定义
- `src/components/loading/ArknightsVisuals.tsx` - React 加载器视觉元素
- `src/components/loading/__tests__/ArknightsVisuals.test.tsx` - 更新测试

**未修改的文件：**
- `src/components/loading/LoadingPage.tsx` - 主加载页面逻辑
- `src/components/loading/useResourceLoader.ts` - 资源加载监听
- `src/components/loading/useMinimumDisplayTime.ts` - 最小显示时间

### 10. 用户体验

**改进前：**
- 静态加载器：简单旋转圆圈
- React 加载器：完整明日方舟风格
- 视觉不一致，有跳跃感

**改进后：**
- 静态加载器：完整明日方舟风格 + 进度条
- React 加载器：完整明日方舟风格 + 进度条
- 视觉完全一致，过渡流畅
- 进度条比旋转圆圈更直观

## 总结

现在两个加载动画已经完全统一：
1. ✅ 使用相同的几何装饰元素
2. ✅ 使用相同的进度条动画
3. ✅ 使用相同的颜色方案
4. ✅ 使用相同的布局结构
5. ✅ 从第一时间就显示完整的加载界面
6. ✅ 过渡流畅，无视觉跳跃
