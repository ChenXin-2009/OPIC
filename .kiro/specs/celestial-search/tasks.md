# 实现计划：天体搜索功能

## 概述

本实现计划将天体搜索功能分解为一系列增量式的编码任务。每个任务都建立在前一个任务的基础上，确保代码能够无缝集成到现有的太阳系可视化系统中。

实现语言：TypeScript + React
UI 框架：React 18 + Tailwind CSS
测试框架：Jest + React Testing Library + fast-check

## 任务列表

- [~] 1. 创建搜索数据层
  - [x] 1.1 实现 SearchIndex 类
    - 创建 `src/lib/search/SearchIndex.ts`
    - 实现索引数据结构（Map<string, IndexedCelestial>）
    - 实现 `buildFromStore` 方法从 Store 构建索引
    - 实现 `add`、`getAll`、`getById`、`clear` 方法
    - 集成 `planetNames` 和 `universeNames` 获取多语言名称
    - _需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 1.2 编写 SearchIndex 单元测试
    - 创建 `src/lib/search/__tests__/SearchIndex.test.ts`
    - 测试索引构建功能
    - 测试索引查询功能
    - 测试边界情况（空索引、重复添加）
    - _需求：4.7_
  
  - [ ]* 1.3 编写 SearchIndex 属性测试
    - **属性 11：索引包含所有天体字段**
    - **验证：需求 4.7**
    - 生成随机天体数据，验证索引中的每个天体都包含必需字段

- [~] 2. 实现搜索引擎
  - [x] 2.1 实现 SearchEngine 类
    - 创建 `src/lib/search/SearchEngine.ts`
    - 集成 Fuse.js 进行模糊匹配
    - 实现 `search` 方法（支持中英文搜索）
    - 实现结果排序逻辑（太阳系天体优先）
    - 实现结果数量限制（最多 10 个）
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 2.2 编写 SearchEngine 单元测试
    - 创建 `src/lib/search/__tests__/SearchEngine.test.ts`
    - 测试基本搜索功能
    - 测试模糊匹配
    - 测试中英文搜索
    - 测试结果排序
    - 测试结果数量限制
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 2.3 编写 SearchEngine 属性测试
    - **属性 5：输入触发实时搜索**
    - **验证：需求 3.1**
    - **属性 6：模糊匹配容错**
    - **验证：需求 3.2**
    - **属性 7：中英文双语搜索**
    - **验证：需求 3.3**
    - **属性 8：搜索结果数量限制**
    - **验证：需求 3.4, 8.5**
    - **属性 9：搜索结果排序规则**
    - **验证：需求 3.5**

- [~] 3. 实现导航处理器
  - [x] 3.1 实现 NavigationHandler 类
    - 创建 `src/lib/search/NavigationHandler.ts`
    - 实现 `navigateTo` 方法
    - 实现 `navigateToSolarSystem` 方法（调用 focusOnTarget）
    - 实现 `navigateToUniverse` 方法（调用渲染器聚焦方法）
    - 实现错误处理逻辑
    - _需求：5.1, 5.2, 5.5, 5.6, 5.7_
  
  - [ ]* 3.2 编写 NavigationHandler 单元测试
    - 创建 `src/lib/search/__tests__/NavigationHandler.test.ts`
    - 测试太阳系天体导航
    - 测试宇宙尺度天体导航
    - 测试导航失败处理
    - 测试状态更新
    - _需求：5.1, 5.5, 5.6, 5.7_
  
  - [ ]* 3.3 编写 NavigationHandler 属性测试
    - **属性 13：点击触发导航**
    - **验证：需求 5.1, 5.6, 5.7**
    - **属性 15：导航更新状态**
    - **验证：需求 5.5**
    - **属性 25：导航失败错误处理**
    - **验证：需求 10.3**

- [~] 4. 实现搜索历史管理
  - [x] 4.1 实现 SearchHistory 类
    - 创建 `src/lib/search/SearchHistory.ts`
    - 实现 `add` 方法（限制 5 个）
    - 实现 `getAll` 方法
    - 实现 `clear` 方法
    - 实现本地存储持久化
    - _需求：6.1, 6.5_
  
  - [ ]* 4.2 编写 SearchHistory 单元测试
    - 创建 `src/lib/search/__tests__/SearchHistory.test.ts`
    - 测试添加历史记录
    - 测试历史记录数量限制
    - 测试清除历史记录
    - 测试本地存储持久化
    - _需求：6.1, 6.5_
  
  - [ ]* 4.3 编写 SearchHistory 属性测试
    - **属性 16：历史记录数量限制**
    - **验证：需求 6.1**

- [x] 5. 检查点 - 确保所有核心逻辑测试通过
  - 确保所有测试通过，如有问题请向用户提问。

- [~] 6. 创建 SearchBox 组件
  - [x] 6.1 实现 SearchBox 组件
    - 创建 `src/components/search/SearchBox.tsx`
    - 实现明日方舟风格设计（黑色背景、白色边框、菱形切角）
    - 实现搜索图标和清除按钮
    - 实现输入框（支持中英文）
    - 实现聚焦视觉反馈
    - 添加 ARIA 标签（aria-label, role）
    - _需求：1.1, 1.4, 1.5, 1.6, 9.1_
  
  - [ ]* 6.2 编写 SearchBox 组件测试
    - 创建 `src/components/search/__tests__/SearchBox.test.tsx`
    - 测试组件渲染
    - 测试输入交互
    - 测试清除按钮
    - 测试 ARIA 属性
    - _需求：1.4, 1.5, 9.1_

- [~] 7. 创建 SuggestionList 组件
  - [x] 7.1 实现 SuggestionList 组件
    - 创建 `src/components/search/SuggestionList.tsx`
    - 实现明日方舟风格列表设计
    - 实现建议项渲染（名称、类型标签、距离信息）
    - 实现悬停高亮效果
    - 实现选中状态显示
    - 添加 ARIA 属性（role="listbox", aria-activedescendant）
    - _需求：3.7, 9.2_
  
  - [ ]* 7.2 编写 SuggestionList 组件测试
    - 创建 `src/components/search/__tests__/SuggestionList.test.tsx`
    - 测试组件渲染
    - 测试建议项点击
    - 测试悬停效果
    - 测试 ARIA 属性
    - _需求：3.7, 9.2_
  
  - [ ]* 7.3 编写 SuggestionList 属性测试
    - **属性 10：建议项包含必需信息**
    - **验证：需求 3.7**

- [~] 8. 创建 CelestialSearch 主组件
  - [x] 8.1 实现 CelestialSearch 组件
    - 创建 `src/components/search/CelestialSearch.tsx`
    - 集成 SearchBox 和 SuggestionList
    - 实现键盘快捷键（Ctrl+K, /, Escape）
    - 实现搜索防抖（150ms）
    - 实现键盘导航（ArrowUp, ArrowDown, Enter）
    - 实现搜索状态管理（query, suggestions, selectedIndex）
    - 实现加载指示器（搜索时间 > 50ms）
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.4_
  
  - [ ]* 8.2 编写 CelestialSearch 组件测试
    - 创建 `src/components/search/__tests__/CelestialSearch.test.tsx`
    - 测试键盘快捷键
    - 测试搜索防抖
    - 测试键盘导航
    - 测试加载指示器
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.4_
  
  - [ ]* 8.3 编写 CelestialSearch 属性测试
    - **属性 1：键盘快捷键聚焦**
    - **验证：需求 2.1, 2.2**
    - **属性 2：Escape 键清空和失焦**
    - **验证：需求 2.3**
    - **属性 3：箭头键导航建议列表**
    - **验证：需求 2.4, 2.5**
    - **属性 4：Enter 键触发导航**
    - **验证：需求 2.6**
    - **属性 21：搜索防抖**
    - **验证：需求 8.1**
    - **属性 22：慢速搜索显示加载指示器**
    - **验证：需求 8.4**
    - **属性 23：键盘导航完整性**
    - **验证：需求 9.3**

- [~] 9. 集成搜索功能到主应用
  - [x] 9.1 在 SolarSystemCanvas3D 中集成 CelestialSearch
    - 修改 `src/components/canvas/3d/SolarSystemCanvas3D.tsx`
    - 添加 CelestialSearch 组件
    - 传递 SceneManager 和 CameraController 引用
    - 确保搜索组件不触发 Canvas 重渲染
    - _需求：8.2_
  
  - [x] 9.2 实现搜索索引自动更新
    - 监听 Store 中的天体数据变化
    - 自动重建搜索索引
    - _需求：4.8_
  
  - [ ]* 9.3 编写集成属性测试
    - **属性 12：索引自动更新**
    - **验证：需求 4.8**
    - **属性 14：导航后清理 UI**
    - **验证：需求 5.3, 5.4**

- [x] 10. 检查点 - 确保核心搜索功能正常工作
  - 确保所有测试通过，如有问题请向用户提问。

- [ ] 11. 实现搜索历史功能（可选）
  - [ ] 11.1 创建 SearchHistory 组件
    - 创建 `src/components/search/SearchHistory.tsx`
    - 实现历史记录列表渲染
    - 实现历史记录项点击导航
    - 实现清除历史记录按钮
    - 添加"历史"标签
    - _需求：6.2, 6.3, 6.4, 6.5_
  
  - [ ] 11.2 集成 SearchHistory 到 CelestialSearch
    - 在空输入时显示历史记录
    - 在导航后添加历史记录
    - _需求：6.1, 6.2_
  
  - [ ]* 11.3 编写 SearchHistory 属性测试
    - **属性 17：空输入显示历史**
    - **验证：需求 6.2**
    - **属性 18：历史记录标识**
    - **验证：需求 6.3**
    - **属性 19：历史记录导航**
    - **验证：需求 6.4**

- [ ] 12. 实现快速访问栏（可选）
  - [ ] 12.1 创建 QuickAccessBar 组件
    - 创建 `src/components/search/QuickAccessBar.tsx`
    - 实现快捷按钮渲染
    - 实现按钮点击导航
    - 实现明日方舟风格设计
    - _需求：7.1, 7.2, 7.3_
  
  - [ ] 12.2 集成 QuickAccessBar 到 CelestialSearch
    - 在搜索框下方显示快速访问栏
    - 实现默认天体列表（太阳、地球、月球、银河系、仙女座星系）
    - _需求：7.1, 7.2_
  
  - [ ]* 12.3 编写 QuickAccessBar 属性测试
    - **属性 20：快捷按钮导航**
    - **验证：需求 7.3**

- [~] 13. 实现错误处理和边界情况
  - [x] 13.1 添加错误边界组件
    - 创建 `src/components/search/SearchErrorBoundary.tsx`
    - 捕获搜索组件中的错误
    - 显示用户友好的错误消息
    - 提供重试选项
    - _需求：10.1, 10.3_
  
  - [x] 13.2 实现无搜索结果提示
    - 在 SuggestionList 中添加空状态显示
    - 显示"未找到匹配的天体"消息
    - _需求：10.2_
  
  - [ ]* 13.3 编写错误处理属性测试
    - **属性 24：索引加载失败错误处理**
    - **验证：需求 10.1**

- [~] 14. 移动端适配
  - [x] 14.1 实现响应式布局
    - 调整搜索框在移动端的位置和尺寸
    - 调整建议列表的最大高度
    - 确保触摸交互正常工作
    - _需求：1.3_
  
  - [ ]* 14.2 编写移动端测试
    - 测试不同屏幕尺寸下的布局
    - 测试触摸交互
    - _需求：1.3_

- [~] 15. 性能优化
  - [x] 15.1 优化组件渲染
    - 使用 React.memo 优化 SearchBox 和 SuggestionList
    - 使用 useCallback 缓存事件处理函数
    - 使用 useMemo 缓存搜索结果
    - _需求：8.2_
  
  - [x] 15.2 优化搜索性能
    - 验证防抖功能正常工作
    - 验证结果数量限制
    - 验证索引查询性能
    - _需求：8.1, 8.5_

- [x] 16. 最终检查点 - 确保所有功能正常工作
  - 运行所有测试
  - 手动测试所有功能
  - 验证无障碍性
  - 验证移动端体验
  - 如有问题请向用户提问。

## 注意事项

1. **增量开发**：每个任务都应该是可独立测试的，确保代码在每一步都是可工作的状态。

2. **测试驱动**：在实现功能之前先编写测试，确保代码质量。

3. **类型安全**：使用 TypeScript 严格类型检查，避免运行时错误。

4. **性能优先**：确保搜索功能不影响 3D 渲染性能。

5. **无障碍性**：确保所有交互都支持键盘导航和屏幕阅读器。

6. **错误处理**：为所有可能的失败场景提供清晰的错误消息。

7. **代码复用**：尽可能复用现有的组件和工具函数。

8. **文档注释**：为所有公共 API 添加 JSDoc 注释。

## 依赖项

需要安装以下 npm 包：

```bash
npm install fuse.js
npm install --save-dev @types/fuse.js
npm install --save-dev fast-check
```

## 测试命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test SearchEngine.test.ts

# 运行属性测试
npm test -- --testNamePattern="Property"

# 生成测试覆盖率报告
npm test -- --coverage
```
