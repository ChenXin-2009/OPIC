# 需求文档：天体搜索功能

## 简介

为太阳系可视化网站添加一个搜索功能，允许用户通过中英文名称搜索并快速导航到各种天体（行星、卫星、太阳、星系、星团、超星系团等）。搜索功能将采用明日方舟（Arknights）风格的 UI 设计，支持实时搜索建议、键盘快捷键，并提供平滑的相机过渡动画。

## 术语表

- **System**: 天体搜索系统
- **Search_Box**: 搜索输入框组件
- **Search_Results**: 搜索结果列表
- **Celestial_Body**: 天体（包括太阳、行星、卫星、星系、星团、超星系团等）
- **Focus_Manager**: 相机焦点管理器
- **Store**: Zustand 全局状态管理
- **Canvas**: Three.js 3D 渲染画布
- **Suggestion_List**: 自动完成建议列表
- **Search_Index**: 天体搜索索引

## 需求

### 需求 1：搜索框 UI 组件

**用户故事：** 作为用户，我希望有一个易于访问的搜索框，以便快速查找天体。

#### 验收标准

1. THE Search_Box SHALL 采用明日方舟风格设计（黑色背景 + 白色高光 + 菱形装饰元素）
2. THE Search_Box SHALL 显示在页面顶部居中位置
3. WHEN 用户在移动设备上访问 THEN THE Search_Box SHALL 自适应屏幕宽度并保持可用性
4. THE Search_Box SHALL 包含占位符文本，提示用户可以搜索天体
5. THE Search_Box SHALL 支持中英文输入
6. WHEN Search_Box 获得焦点 THEN THE System SHALL 显示视觉反馈（边框高亮或发光效果）

### 需求 2：键盘快捷键

**用户故事：** 作为用户，我希望通过键盘快捷键快速打开搜索框，以提高操作效率。

#### 验收标准

1. WHEN 用户按下 Ctrl+K（Windows/Linux）或 Cmd+K（Mac）THEN THE System SHALL 聚焦到 Search_Box
2. WHEN 用户按下 "/" 键 THEN THE System SHALL 聚焦到 Search_Box
3. WHEN Search_Box 已聚焦且用户按下 Escape 键 THEN THE System SHALL 清空输入并失焦
4. WHEN Suggestion_List 显示时且用户按下 ArrowDown 键 THEN THE System SHALL 选中下一个建议项
5. WHEN Suggestion_List 显示时且用户按下 ArrowUp 键 THEN THE System SHALL 选中上一个建议项
6. WHEN Suggestion_List 显示时且用户按下 Enter 键 THEN THE System SHALL 导航到选中的天体

### 需求 3：实时搜索建议

**用户故事：** 作为用户，我希望在输入时看到实时搜索建议，以便快速找到目标天体。

#### 验收标准

1. WHEN 用户在 Search_Box 中输入文本 THEN THE System SHALL 实时显示匹配的天体列表
2. THE System SHALL 支持模糊匹配（允许部分匹配和拼写容错）
3. THE System SHALL 同时搜索中文和英文名称
4. WHEN 搜索结果超过 10 个 THEN THE System SHALL 只显示前 10 个最相关的结果
5. THE Suggestion_List SHALL 按相关性和天体类型排序（太阳系天体优先，然后是星系、星团、超星系团）
6. WHEN 用户输入为空 THEN THE System SHALL 隐藏 Suggestion_List
7. THE Suggestion_List SHALL 显示天体名称（中英文）和类型标签

### 需求 4：天体搜索索引

**用户故事：** 作为系统，我需要维护一个高效的天体搜索索引，以支持快速搜索。

#### 验收标准

1. THE System SHALL 从 Store 中获取所有可见天体数据
2. THE Search_Index SHALL 包含太阳系天体（太阳、行星、卫星）
3. THE Search_Index SHALL 包含本星系群星系
4. THE Search_Index SHALL 包含近邻星系群
5. THE Search_Index SHALL 包含室女座超星系团
6. THE Search_Index SHALL 包含拉尼亚凯亚超星系团
7. THE System SHALL 为每个天体存储中英文名称、类型、位置信息
8. WHEN 天体数据更新 THEN THE System SHALL 自动更新 Search_Index

### 需求 5：搜索结果导航

**用户故事：** 作为用户，我希望点击搜索结果后能够平滑地导航到该天体。

#### 验收标准

1. WHEN 用户点击搜索结果中的天体 THEN THE System SHALL 调用 Focus_Manager 聚焦到该天体
2. THE System SHALL 使用平滑的相机过渡动画（而非瞬间跳转）
3. WHEN 导航完成 THEN THE System SHALL 关闭 Suggestion_List
4. WHEN 导航完成 THEN THE System SHALL 清空 Search_Box 输入
5. THE System SHALL 更新 Store 中的 selectedPlanet 状态
6. WHEN 目标天体是太阳系天体 THEN THE System SHALL 使用现有的 focusOnTarget 方法
7. WHEN 目标天体是宇宙尺度天体 THEN THE System SHALL 使用对应渲染器的聚焦方法

### 需求 6：搜索历史记录（可选）

**用户故事：** 作为用户，我希望系统记住我最近搜索的天体，以便快速重新访问。

#### 验收标准

1. THE System SHALL 在本地存储中保存最近 5 次搜索的天体
2. WHEN Search_Box 获得焦点且输入为空 THEN THE System SHALL 显示搜索历史
3. THE System SHALL 为历史记录项添加"历史"标签以区分实时搜索结果
4. WHEN 用户点击历史记录项 THEN THE System SHALL 导航到该天体
5. THE System SHALL 提供清除历史记录的选项

### 需求 7：快速访问常用天体（可选）

**用户故事：** 作为用户，我希望能够快速访问常用天体（如地球、太阳、银河系），无需输入搜索。

#### 验收标准

1. THE System SHALL 在 Search_Box 下方显示常用天体快捷按钮
2. THE System SHALL 默认包含以下常用天体：太阳、地球、月球、银河系、仙女座星系
3. WHEN 用户点击快捷按钮 THEN THE System SHALL 导航到对应天体
4. THE System SHALL 允许用户自定义常用天体列表（通过设置菜单）

### 需求 8：性能优化

**用户故事：** 作为系统，我需要确保搜索功能不影响 3D 渲染性能。

#### 验收标准

1. THE System SHALL 使用防抖（debounce）技术限制搜索频率（延迟 150ms）
2. THE System SHALL 在单独的 React 组件中渲染搜索 UI，避免触发 Canvas 重渲染
3. THE Search_Index SHALL 使用高效的数据结构（如 Trie 树或 Fuse.js）
4. WHEN 搜索执行时间超过 50ms THEN THE System SHALL 显示加载指示器
5. THE System SHALL 限制同时显示的搜索结果数量（最多 10 个）

### 需求 9：无障碍访问

**用户故事：** 作为使用辅助技术的用户，我希望搜索功能完全可访问。

#### 验收标准

1. THE Search_Box SHALL 包含适当的 ARIA 标签（aria-label, role）
2. THE Suggestion_List SHALL 使用 role="listbox" 和 aria-activedescendant
3. THE System SHALL 支持完整的键盘导航（Tab, Arrow keys, Enter, Escape）
4. THE System SHALL 为屏幕阅读器提供搜索结果数量的语音反馈
5. THE System SHALL 确保搜索 UI 的颜色对比度符合 WCAG AA 标准

### 需求 10：错误处理

**用户故事：** 作为用户，我希望在搜索出错时能够得到清晰的反馈。

#### 验收标准

1. WHEN 搜索索引加载失败 THEN THE System SHALL 显示错误消息并提供重试选项
2. WHEN 没有匹配的搜索结果 THEN THE System SHALL 显示"未找到匹配的天体"消息
3. WHEN 导航到天体失败 THEN THE System SHALL 显示错误提示并保持搜索框打开
4. THE System SHALL 记录所有搜索错误到控制台以便调试
