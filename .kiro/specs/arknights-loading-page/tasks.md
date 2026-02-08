# 实现计划：明日方舟风格加载页面

## 概述

本实现计划将明日方舟风格的加载页面分解为一系列增量式的编码任务。每个任务都建立在前一个任务的基础上，确保代码逐步集成并及早验证核心功能。

实现策略：
1. 首先创建基础组件结构和类型定义
2. 实现核心加载逻辑（资源监听、时间控制）
3. 添加视觉元素和动画
4. 集成到 Next.js 应用
5. 添加可访问性支持
6. 编写测试验证正确性

## 任务

- [x] 1. 创建项目结构和类型定义
  - 在 `src/components/` 下创建 `loading/` 目录
  - 创建 `types.ts` 文件定义所有 TypeScript 接口和类型
  - 定义 `LoadingState`、`LoadingConfig`、`LoadingPageProps` 等类型
  - _需求: 所有需求的基础_

- [ ] 2. 实现资源加载监听 Hook
  - [x] 2.1 创建 `useResourceLoader.ts` Hook
    - 实现 `useResourceLoader` Hook 监听 window.load 事件
    - 监听 document.fonts.ready Promise
    - 检查 document.readyState 状态
    - 处理浏览器 API 不支持的降级情况
    - 实现超时保护机制（10 秒）
    - _需求: 3.1, 3.5_
  
  - [ ]* 2.2 为资源加载 Hook 编写属性测试
    - **属性 1: 资源加载完成触发状态更新**
    - **验证需求: 3.5**
  
  - [ ]* 2.3 为资源加载 Hook 编写单元测试
    - 测试初始状态为 complete 的情况
    - 测试 load 事件触发
    - 测试字体加载完成
    - 测试超时保护
    - 测试事件监听器清理
    - _需求: 3.1, 3.5_

- [ ] 3. 实现最小显示时间 Hook
  - [x] 3.1 创建 `useMinimumDisplayTime.ts` Hook
    - 实现 `useMinimumDisplayTime` Hook
    - 使用 setTimeout 确保最小显示时间
    - 记录组件挂载时间
    - 返回 isMinTimeElapsed 状态
    - 清理定时器
    - _需求: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 3.2 为最小显示时间 Hook 编写属性测试
    - **属性 2: 最小显示时间保证**
    - **验证需求: 4.2, 4.3**
  
  - [ ]* 3.3 为最小显示时间 Hook 编写单元测试
    - 测试默认 500ms 最小时间
    - 测试自定义最小时间
    - 测试定时器清理
    - _需求: 4.1, 4.2, 4.3, 4.4_

- [ ] 4. 实现加载旋转器组件
  - [x] 4.1 创建 `LoadingSpinner.tsx` 组件
    - 创建旋转动画的 SVG 或 CSS 实现
    - 使用蓝色（sky-500）作为主色
    - 实现多层圆环设计（外圈、旋转弧线、内部装饰）
    - 使用 Tailwind 的 animate-spin 和 animate-pulse
    - 支持 isAnimating prop 控制动画播放
    - 支持 size prop 自定义尺寸
    - 使用 GPU 加速属性（transform）
    - _需求: 6.1, 6.3, 9.1, 9.5_
  
  - [ ]* 4.2 为加载旋转器编写单元测试
    - 测试组件渲染
    - 测试动画类应用
    - 测试尺寸 prop
    - 测试 isAnimating prop
    - _需求: 6.1, 6.3_

- [ ] 5. 实现明日方舟视觉元素组件
  - [x] 5.1 创建 `ArknightsVisuals.tsx` 组件
    - 创建黑色背景容器
    - 添加左上角大三角形（使用 CSS border 或 SVG）
    - 添加右下角矩形边框
    - 添加斜线装饰元素
    - 使用蓝色（sky-500）作为强调色，配合透明度
    - 集成 LoadingSpinner 组件在中心位置
    - 确保充足的留白空间
    - 使用 Tailwind CSS 实用类
    - _需求: 1.3, 1.4, 2.1, 2.2, 2.3, 9.3_
  
  - [ ]* 5.2 为视觉元素组件编写单元测试
    - 测试背景色为黑色
    - 测试几何图形元素存在
    - 测试 LoadingSpinner 被渲染
    - 测试响应式布局
    - _需求: 1.3, 1.4, 2.3_

- [ ] 6. 实现主加载页面组件
  - [x] 6.1 创建 `LoadingPage.tsx` 主组件
    - 添加 'use client' 指令
    - 使用 useState 管理 LoadingState
    - 使用 useResourceLoader Hook
    - 使用 useMinimumDisplayTime Hook
    - 实现加载完成逻辑（资源就绪 && 最小时间已过）
    - 实现淡出状态管理
    - 实现条件渲染（加载完成后返回 null）
    - 使用 fixed、inset-0、z-[9999] 实现全屏覆盖
    - 渲染 ArknightsVisuals 组件
    - _需求: 1.1, 1.2, 4.2, 4.3, 5.1, 7.1, 7.3_
  
  - [ ]* 6.2 为主加载页面编写单元测试
    - 测试组件初始渲染
    - 测试全屏覆盖样式
    - 测试条件渲染逻辑
    - 测试状态管理
    - _需求: 1.1, 1.2, 7.1_

- [ ] 7. 实现过渡动画
  - [x] 7.1 在 LoadingPage 中添加淡出动画
    - 在 globals.css 中定义 fadeOut 动画
    - 使用 opacity 和 transform 实现平滑淡出
    - 设置动画时长为 400ms
    - 使用 GPU 加速（will-change）
    - 在动画完成后触发组件卸载
    - 使用 onAnimationEnd 事件处理动画完成
    - _需求: 5.1, 5.2, 5.4, 5.5, 9.5_
  
  - [ ]* 7.2 为过渡动画编写属性测试
    - **属性 3: 加载完成后的过渡和卸载**
    - **验证需求: 5.1, 5.4, 6.6**
  
  - [ ]* 7.3 为过渡动画编写单元测试
    - 测试淡出类应用
    - 测试动画完成后组件移除
    - 测试动画时长配置
    - _需求: 5.1, 5.2, 5.4, 5.5_

- [ ] 8. 添加可访问性支持
  - [x] 8.1 在 LoadingPage 中添加 ARIA 属性
    - 添加 role="status" 属性
    - 添加 aria-live="polite" 属性
    - 添加 aria-busy 属性（根据加载状态动态更新）
    - 添加 aria-label 描述加载状态
    - 添加视觉隐藏的文本描述（使用 sr-only 类）
    - 在加载完成时更新 ARIA 属性
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 8.2 为可访问性编写属性测试
    - **属性 5: 可访问性状态通知**
    - **验证需求: 10.5**
  
  - [ ]* 8.3 为可访问性编写单元测试
    - 测试 role 属性存在
    - 测试 aria-live 属性
    - 测试 aria-busy 状态更新
    - 测试 aria-label 内容
    - 测试屏幕阅读器文本
    - _需求: 10.1, 10.2, 10.3, 10.4_

- [ ] 9. 添加响应式设计支持
  - [x] 9.1 在 ArknightsVisuals 中添加响应式样式
    - 使用 Tailwind 响应式断点（sm:, md:, lg:）
    - 调整几何图形在移动设备上的尺寸
    - 调整 LoadingSpinner 在不同屏幕的尺寸
    - 确保在小屏幕上保持视觉平衡
    - _需求: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 9.2 为响应式设计编写单元测试
    - 测试桌面视口（>= 1024px）
    - 测试平板视口（768px - 1023px）
    - 测试移动视口（< 768px）
    - _需求: 8.1, 8.2, 8.3_

- [ ] 10. 集成到 Next.js 应用
  - [x] 10.1 在 layout.tsx 中集成 LoadingPage
    - 导入 LoadingPage 组件
    - 在 body 标签内、Header 之前添加 LoadingPage
    - 确保不影响服务端渲染
    - 测试开发环境和生产构建
    - _需求: 7.1, 7.2, 7.4_
  
  - [ ]* 10.2 编写集成测试
    - 测试完整加载流程
    - 测试快速加载场景（< 500ms）
    - 测试慢速加载场景（> 500ms）
    - 测试缓存场景（后续访问）
    - _需求: 7.5_

- [ ] 11. 添加性能优化
  - [x] 11.1 优化动画性能
    - 确认使用 CSS 动画而非 JavaScript
    - 添加 will-change 提示
    - 使用 transform 和 opacity 属性
    - 添加 prefers-reduced-motion 支持
    - _需求: 9.1, 9.5_
  
  - [ ]* 11.2 为事件监听器清理编写属性测试
    - **属性 4: 事件监听器清理**
    - **验证需求: 9.4**
  
  - [ ]* 11.3 编写性能测试
    - 测试组件渲染时间（< 50ms）
    - 测试内存泄漏（多次挂载/卸载）
    - 测试事件监听器清理
    - _需求: 9.4_

- [ ] 12. 添加后续访问优化
  - [x] 12.1 实现缓存检测逻辑
    - 在 useResourceLoader 中检查初始 readyState
    - 如果 readyState === 'complete'，立即设置为就绪
    - 实现快速淡出逻辑（缩短显示时间）
    - _需求: 7.5_
  
  - [ ]* 12.2 为缓存场景编写属性测试
    - **属性 6: 后续访问的条件显示**
    - **验证需求: 7.5**

- [x] 13. 最终检查点
  - 运行所有单元测试和属性测试
  - 在不同浏览器中测试（Chrome、Firefox、Safari）
  - 在不同设备上测试（桌面、平板、移动）
  - 使用屏幕阅读器测试可访问性
  - 检查控制台是否有警告或错误
  - 验证所有需求都已实现
  - 如有问题，请询问用户

## 注意事项

- 标记为 `*` 的任务是可选的测试任务，可以跳过以加快 MVP 开发
- 每个任务都引用了相关的需求编号以确保可追溯性
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边缘情况
- 所有属性测试应运行至少 100 次迭代

## 测试库依赖

确保安装以下测试依赖：

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest fast-check
```

## 预期文件结构

```
src/
├── components/
│   └── loading/
│       ├── LoadingPage.tsx
│       ├── ArknightsVisuals.tsx
│       ├── LoadingSpinner.tsx
│       ├── useResourceLoader.ts
│       ├── useMinimumDisplayTime.ts
│       └── types.ts
├── app/
│   ├── layout.tsx (修改)
│   └── globals.css (修改)
└── __tests__/
    └── components/
        └── loading/
            ├── LoadingPage.test.tsx
            ├── LoadingPage.property.test.tsx
            ├── ArknightsVisuals.test.tsx
            ├── LoadingSpinner.test.tsx
            └── hooks.test.ts
```
