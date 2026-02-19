# 设计文档：天体搜索功能

## 概述

天体搜索功能为太阳系可视化网站提供快速查找和导航到各种天体的能力。该功能采用明日方舟（Arknights）风格的 UI 设计，支持中英文双语搜索，提供实时搜索建议，并通过键盘快捷键提升用户体验。

设计目标：
- 提供直观、高效的天体搜索体验
- 无缝集成到现有的 3D 可视化系统
- 保持与现有 UI 风格的一致性
- 确保搜索功能不影响 3D 渲染性能
- 支持所有尺度的天体（太阳系、本星系群、近邻星系群、室女座超星系团、拉尼亚凯亚超星系团）

## 架构

### 组件层次结构

```
CelestialSearch (主容器)
├── SearchBox (搜索输入框)
│   ├── SearchIcon (搜索图标)
│   ├── Input (输入框)
│   └── ClearButton (清除按钮)
├── SuggestionList (搜索建议列表)
│   └── SuggestionItem[] (建议项)
│       ├── CelestialName (天体名称)
│       ├── CelestialType (天体类型标签)
│       └── DistanceInfo (距离信息 - 可选)
├── QuickAccessBar (快速访问栏 - 可选)
│   └── QuickAccessButton[] (快捷按钮)
└── SearchHistory (搜索历史 - 可选)
    └── HistoryItem[] (历史记录项)
```

### 数据流

```
用户输入
    ↓
SearchBox (防抖处理)
    ↓
SearchEngine (模糊匹配)
    ↓
SearchIndex (天体数据)
    ↓
SuggestionList (显示结果)
    ↓
用户选择
    ↓
NavigationHandler (导航逻辑)
    ↓
FocusManager / UniverseRenderer (相机控制)
    ↓
Store (更新状态)
```

### 模块划分

1. **UI 层** (`components/search/`)
   - `CelestialSearch.tsx` - 主容器组件
   - `SearchBox.tsx` - 搜索输入框
   - `SuggestionList.tsx` - 搜索建议列表
   - `QuickAccessBar.tsx` - 快速访问栏（可选）
   - `SearchHistory.tsx` - 搜索历史（可选）

2. **业务逻辑层** (`lib/search/`)
   - `SearchEngine.ts` - 搜索引擎（模糊匹配）
   - `SearchIndex.ts` - 天体搜索索引
   - `NavigationHandler.ts` - 导航处理器
   - `SearchHistory.ts` - 历史记录管理

3. **数据层**
   - 使用现有的 `useSolarSystemStore` 获取天体数据
   - 使用现有的 `planetNames` 和 `universeNames` 获取多语言名称

## 组件和接口

### 1. CelestialSearch 组件

主容器组件，负责协调所有子组件。

```typescript
interface CelestialSearchProps {
  className?: string;
  style?: React.CSSProperties;
}

interface CelestialSearchState {
  isOpen: boolean;           // 搜索框是否展开
  query: string;             // 当前搜索查询
  suggestions: SearchResult[]; // 搜索建议
  selectedIndex: number;     // 当前选中的建议索引
  isLoading: boolean;        // 是否正在搜索
  showHistory: boolean;      // 是否显示历史记录
}
```

**职责：**
- 管理搜索框的展开/收起状态
- 处理键盘快捷键（Ctrl+K, /, Escape）
- 协调子组件之间的交互
- 管理焦点状态

### 2. SearchBox 组件

搜索输入框，采用明日方舟风格设计。

```typescript
interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
  placeholder: string;
  isFocused: boolean;
}
```

**样式特征：**
- 黑色背景 (#0a0a0a)
- 白色边框 (#333333)
- 聚焦时白色高光边框 (#ffffff)
- 菱形切角（clip-path）
- 左上角和右下角装饰元素
- 搜索图标和清除按钮

### 3. SuggestionList 组件

显示搜索建议列表。

```typescript
interface SuggestionListProps {
  suggestions: SearchResult[];
  selectedIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

interface SearchResult {
  id: string;              // 唯一标识符
  name: string;            // 天体名称（当前语言）
  nameEn: string;          // 英文名称
  nameZh: string;          // 中文名称
  type: CelestialType;     // 天体类型
  scale: UniverseScale;    // 宇宙尺度
  position: Vector3;       // 3D 位置
  distance?: number;       // 距离（AU 或 Mpc）
  relevance: number;       // 相关性评分（用于排序）
}

type CelestialType = 
  | 'sun'
  | 'planet'
  | 'satellite'
  | 'galaxy'
  | 'group'
  | 'cluster'
  | 'supercluster';
```

**样式特征：**
- 明日方舟风格列表项
- 悬停时高亮效果
- 类型标签颜色编码
- 平滑滚动动画

### 4. SearchEngine 类

核心搜索引擎，负责模糊匹配和结果排序。

```typescript
class SearchEngine {
  private index: SearchIndex;
  private fuse: Fuse<IndexedCelestial>; // Fuse.js 实例
  
  constructor(index: SearchIndex);
  
  /**
   * 搜索天体
   * @param query - 搜索查询
   * @param maxResults - 最大结果数量
   * @returns 搜索结果数组
   */
  search(query: string, maxResults?: number): SearchResult[];
  
  /**
   * 更新搜索索引
   * @param index - 新的搜索索引
   */
  updateIndex(index: SearchIndex): void;
}
```

**搜索策略：**
- 使用 Fuse.js 进行模糊匹配
- 同时搜索中英文名称
- 支持部分匹配和拼写容错
- 按相关性和类型排序（太阳系天体优先）

**Fuse.js 配置：**
```typescript
const fuseOptions = {
  keys: [
    { name: 'nameEn', weight: 0.5 },
    { name: 'nameZh', weight: 0.5 }
  ],
  threshold: 0.4,        // 模糊匹配阈值
  distance: 100,         // 匹配距离
  minMatchCharLength: 1, // 最小匹配字符数
  includeScore: true,    // 包含相关性评分
};
```

### 5. SearchIndex 类

天体搜索索引，维护所有可搜索天体的数据。

```typescript
interface IndexedCelestial {
  id: string;
  nameEn: string;
  nameZh: string;
  type: CelestialType;
  scale: UniverseScale;
  position: Vector3;
  distance?: number;
  metadata?: Record<string, any>;
}

class SearchIndex {
  private celestials: Map<string, IndexedCelestial>;
  
  constructor();
  
  /**
   * 从 Store 构建索引
   * @param store - Zustand store 实例
   */
  buildFromStore(store: SolarSystemState): void;
  
  /**
   * 添加天体到索引
   * @param celestial - 天体数据
   */
  add(celestial: IndexedCelestial): void;
  
  /**
   * 获取所有天体
   * @returns 天体数组
   */
  getAll(): IndexedCelestial[];
  
  /**
   * 根据 ID 获取天体
   * @param id - 天体 ID
   */
  getById(id: string): IndexedCelestial | undefined;
  
  /**
   * 清空索引
   */
  clear(): void;
}
```

**索引构建逻辑：**
1. 从 `useSolarSystemStore` 获取太阳系天体
2. 从 `LocalGroupRenderer` 获取本星系群星系
3. 从 `NearbyGroupsRenderer` 获取近邻星系群
4. 从 `VirgoSuperclusterRenderer` 获取室女座超星系团
5. 从 `LaniakeaSuperclusterRenderer` 获取拉尼亚凯亚超星系团
6. 使用 `planetNames` 和 `universeNames` 获取多语言名称

### 6. NavigationHandler 类

处理导航到选中天体的逻辑。

```typescript
class NavigationHandler {
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private store: SolarSystemState;
  
  constructor(
    sceneManager: SceneManager,
    cameraController: CameraController,
    store: SolarSystemState
  );
  
  /**
   * 导航到天体
   * @param result - 搜索结果
   * @returns Promise，导航完成时 resolve
   */
  async navigateTo(result: SearchResult): Promise<void>;
  
  /**
   * 导航到太阳系天体
   * @param name - 天体名称
   */
  private navigateToSolarSystem(name: string): void;
  
  /**
   * 导航到宇宙尺度天体
   * @param result - 搜索结果
   */
  private navigateToUniverse(result: SearchResult): void;
}
```

**导航策略：**
- 太阳系天体：使用现有的 `focusOnTarget` 方法
- 宇宙尺度天体：使用对应渲染器的聚焦方法
- 平滑相机过渡动画（使用 CameraController 的动画功能）
- 更新 Store 中的 `selectedPlanet` 状态

### 7. SearchHistory 类

管理搜索历史记录。

```typescript
interface HistoryEntry {
  id: string;
  name: string;
  type: CelestialType;
  timestamp: number;
}

class SearchHistory {
  private static readonly STORAGE_KEY = 'celestial-search-history';
  private static readonly MAX_ENTRIES = 5;
  
  /**
   * 添加历史记录
   * @param entry - 历史记录项
   */
  static add(entry: Omit<HistoryEntry, 'timestamp'>): void;
  
  /**
   * 获取历史记录
   * @returns 历史记录数组
   */
  static getAll(): HistoryEntry[];
  
  /**
   * 清除历史记录
   */
  static clear(): void;
}
```

## 数据模型

### UniverseScale 枚举

```typescript
enum UniverseScale {
  SolarSystem = 'solar-system',
  LocalGroup = 'local-group',
  NearbyGroups = 'nearby-groups',
  VirgoSupercluster = 'virgo-supercluster',
  LaniakeaSupercluster = 'laniakea-supercluster',
}
```

### 天体类型颜色映射

```typescript
const CELESTIAL_TYPE_COLORS: Record<CelestialType, string> = {
  sun: '#ffaa00',
  planet: '#4488ff',
  satellite: '#88ccff',
  galaxy: '#88ccff',
  group: '#ffaa88',
  cluster: '#ffcc66',
  supercluster: '#ff88cc',
};
```

## 正确性属性

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：键盘快捷键聚焦
*对于任何* 键盘快捷键（Ctrl+K、Cmd+K、/），当用户按下该快捷键时，搜索框应该获得焦点。
**验证：需求 2.1, 2.2**

### 属性 2：Escape 键清空和失焦
*对于任何* 已聚焦的搜索框状态，当用户按下 Escape 键时，输入框应该被清空且失去焦点。
**验证：需求 2.3**

### 属性 3：箭头键导航建议列表
*对于任何* 显示建议列表的状态，当用户按下 ArrowDown 或 ArrowUp 键时，选中的建议项索引应该相应增加或减少（循环处理边界）。
**验证：需求 2.4, 2.5**

### 属性 4：Enter 键触发导航
*对于任何* 显示建议列表且有选中项的状态，当用户按下 Enter 键时，系统应该触发导航到选中的天体。
**验证：需求 2.6**

### 属性 5：输入触发实时搜索
*对于任何* 非空输入文本，系统应该返回匹配的天体列表（可能为空列表）。
**验证：需求 3.1**

### 属性 6：模糊匹配容错
*对于任何* 天体名称的部分匹配或拼写错误输入（编辑距离 ≤ 2），系统应该返回包含目标天体的搜索结果。
**验证：需求 3.2**

### 属性 7：中英文双语搜索
*对于任何* 天体，使用其中文名称或英文名称搜索都应该能找到该天体。
**验证：需求 3.3**

### 属性 8：搜索结果数量限制
*对于任何* 搜索查询，返回的结果数量应该不超过 10 个。
**验证：需求 3.4, 8.5**

### 属性 9：搜索结果排序规则
*对于任何* 搜索结果列表，太阳系天体应该排在宇宙尺度天体之前，且相同类型的天体按相关性评分排序。
**验证：需求 3.5**

### 属性 10：建议项包含必需信息
*对于任何* 搜索建议项，应该包含天体名称（中英文）和类型标签。
**验证：需求 3.7**

### 属性 11：索引包含所有天体字段
*对于任何* 索引中的天体，应该包含中英文名称、类型和位置信息。
**验证：需求 4.7**

### 属性 12：索引自动更新
*对于任何* 天体数据更新事件，搜索索引应该在更新后包含最新的天体数据。
**验证：需求 4.8**

### 属性 13：点击触发导航
*对于任何* 搜索结果项，当用户点击该项时，系统应该调用相应的聚焦方法导航到该天体。
**验证：需求 5.1, 5.6, 5.7**

### 属性 14：导航后清理 UI
*对于任何* 成功的导航操作，建议列表应该被隐藏且搜索框应该被清空。
**验证：需求 5.3, 5.4**

### 属性 15：导航更新状态
*对于任何* 成功的导航操作，Store 中的 selectedPlanet 状态应该更新为目标天体的名称。
**验证：需求 5.5**

### 属性 16：历史记录数量限制
*对于任何* 搜索历史状态，本地存储中的历史记录数量应该不超过 5 个。
**验证：需求 6.1**

### 属性 17：空输入显示历史
*对于任何* 已聚焦且输入为空的搜索框状态，系统应该显示搜索历史（如果存在）。
**验证：需求 6.2**

### 属性 18：历史记录标识
*对于任何* 历史记录项，应该包含"历史"标签以区分实时搜索结果。
**验证：需求 6.3**

### 属性 19：历史记录导航
*对于任何* 历史记录项，当用户点击该项时，系统应该导航到对应的天体。
**验证：需求 6.4**

### 属性 20：快捷按钮导航
*对于任何* 快速访问按钮，当用户点击该按钮时，系统应该导航到对应的天体。
**验证：需求 7.3**

### 属性 21：搜索防抖
*对于任何* 快速连续输入（间隔 < 150ms），搜索函数的调用次数应该少于输入次数（通过防抖减少）。
**验证：需求 8.1**

### 属性 22：慢速搜索显示加载指示器
*对于任何* 执行时间超过 50ms 的搜索操作，系统应该显示加载指示器。
**验证：需求 8.4**

### 属性 23：键盘导航完整性
*对于任何* 键盘操作（Tab、Arrow keys、Enter、Escape），系统应该正确响应并更新 UI 状态。
**验证：需求 9.3**

### 属性 24：索引加载失败错误处理
*对于任何* 搜索索引加载失败的情况，系统应该显示错误消息并提供重试选项。
**验证：需求 10.1**

### 属性 25：导航失败错误处理
*对于任何* 导航失败的情况，系统应该显示错误提示且保持搜索框打开状态。
**验证：需求 10.3**



## 错误处理

### 搜索索引加载失败
- 捕获索引构建过程中的所有异常
- 显示用户友好的错误消息
- 提供重试按钮
- 记录详细错误信息到控制台

### 搜索执行失败
- 捕获搜索引擎抛出的异常
- 显示"搜索失败，请重试"消息
- 保持搜索框可用状态
- 记录错误到控制台

### 导航失败
- 捕获导航过程中的异常
- 显示"无法导航到该天体"消息
- 保持搜索框打开
- 不清空输入内容
- 记录错误到控制台

### 本地存储失败
- 捕获 localStorage 访问异常
- 降级到内存存储
- 不影响核心搜索功能
- 记录警告到控制台

### 边界情况处理
- 空输入：隐藏建议列表或显示历史记录
- 无搜索结果：显示"未找到匹配的天体"消息
- 网络延迟：显示加载指示器
- 快速输入：使用防抖避免过度搜索

## 测试策略

### 单元测试

使用 Jest 和 React Testing Library 进行单元测试。

**SearchEngine 测试：**
- 测试基本搜索功能
- 测试模糊匹配
- 测试中英文搜索
- 测试结果排序
- 测试结果数量限制

**SearchIndex 测试：**
- 测试索引构建
- 测试索引更新
- 测试索引查询
- 测试边界情况（空索引、重复添加）

**NavigationHandler 测试：**
- 测试太阳系天体导航
- 测试宇宙尺度天体导航
- 测试导航失败处理
- 测试状态更新

**SearchHistory 测试：**
- 测试添加历史记录
- 测试历史记录数量限制
- 测试清除历史记录
- 测试本地存储持久化

**组件测试：**
- 测试 SearchBox 渲染和交互
- 测试 SuggestionList 渲染和选择
- 测试键盘快捷键
- 测试无障碍属性

### 属性测试

使用 fast-check 进行基于属性的测试，每个测试运行 100 次迭代。

**属性测试配置：**
```typescript
import fc from 'fast-check';

// 天体名称生成器
const celestialNameArb = fc.oneof(
  fc.constantFrom('Sun', 'Earth', 'Mars', 'Jupiter', 'Saturn'),
  fc.constantFrom('太阳', '地球', '火星', '木星', '土星'),
  fc.constantFrom('Milky Way', 'Andromeda', 'M31', 'NGC 224'),
  fc.constantFrom('银河系', '仙女座星系')
);

// 搜索查询生成器（包括拼写错误）
const searchQueryArb = fc.string({ minLength: 1, maxLength: 20 });

// 测试配置
const testConfig = { numRuns: 100 };
```

**属性测试用例：**

1. **属性 1-4：键盘交互**
   - 生成随机键盘事件序列
   - 验证焦点状态和 UI 响应

2. **属性 5-9：搜索功能**
   - 生成随机搜索查询
   - 验证结果正确性、数量限制和排序

3. **属性 10-12：索引管理**
   - 生成随机天体数据
   - 验证索引完整性和更新

4. **属性 13-15：导航功能**
   - 生成随机天体选择
   - 验证导航行为和状态更新

5. **属性 16-19：历史记录**
   - 生成随机搜索历史
   - 验证数量限制和持久化

6. **属性 20-23：性能和交互**
   - 生成随机输入序列
   - 验证防抖和加载指示器

7. **属性 24-25：错误处理**
   - 模拟各种失败场景
   - 验证错误消息和恢复机制

### 集成测试

使用 Playwright 进行端到端测试。

**测试场景：**
1. 完整搜索流程：输入 → 选择 → 导航
2. 键盘快捷键工作流
3. 移动端响应式布局
4. 搜索历史持久化
5. 快速访问按钮
6. 错误场景处理

### 无障碍测试

使用 jest-axe 进行自动化无障碍测试。

**测试内容：**
- ARIA 标签完整性
- 键盘导航可用性
- 颜色对比度（手动验证）
- 屏幕阅读器兼容性（手动验证）

## 性能考虑

### 搜索性能
- 使用 Fuse.js 的索引缓存
- 限制搜索结果数量（最多 10 个）
- 使用防抖减少搜索频率（150ms）
- 异步搜索避免阻塞 UI

### 渲染性能
- 使用 React.memo 优化组件重渲染
- 虚拟滚动处理大量搜索结果（如果需要）
- 避免在搜索组件中订阅不必要的 Store 状态
- 使用 CSS transform 实现动画（GPU 加速）

### 内存管理
- 限制历史记录数量（5 个）
- 及时清理事件监听器
- 使用 WeakMap 存储临时数据
- 避免内存泄漏（useEffect cleanup）

### 索引构建优化
- 延迟索引构建（在首次搜索时）
- 增量更新索引（而非完全重建）
- 使用 Web Worker 构建大型索引（如果需要）

## 明日方舟风格设计规范

### 颜色方案
```typescript
const ARKNIGHTS_COLORS = {
  primary: '#ffffff',      // 白色主色
  secondary: '#e0e0e0',    // 浅灰
  accent: '#f0f0f0',       // 亮白
  dark: '#0a0a0a',         // 纯黑背景
  darkLight: '#1a1a1a',    // 深灰
  border: '#333333',       // 边框灰
  text: '#ffffff',         // 白色文字
  textDim: '#999999',      // 暗淡文字
  
  // 天体类型颜色
  sun: '#ffaa00',
  planet: '#4488ff',
  satellite: '#88ccff',
  galaxy: '#88ccff',
  group: '#ffaa88',
  cluster: '#ffcc66',
  supercluster: '#ff88cc',
};
```

### 几何元素
- 菱形切角：`clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)`
- 左上角装饰：白色三角形
- 右下角装饰：白色三角形
- 边框：2px 实线

### 动画效果
- 淡入动画：300ms ease-out
- 悬停效果：边框发光（box-shadow）
- 过渡动画：200ms ease

### 字体
- 标题：Novecento Wide, 粗体, 大写
- 正文：系统无衬线字体
- 等宽数字：Novecento Wide

### 布局
- 搜索框位置：顶部居中，距离顶部 2rem
- 建议列表：搜索框下方，最大高度 400px
- 快速访问栏：搜索框下方，水平排列
- 移动端：全宽布局，距离顶部 1rem

## 实现注意事项

### React 最佳实践
- 使用函数组件和 Hooks
- 使用 TypeScript 严格类型检查
- 使用 React.memo 优化性能
- 使用自定义 Hooks 封装逻辑
- 避免在渲染函数中创建新对象/函数

### 状态管理
- 使用 useState 管理本地 UI 状态
- 使用 useRef 存储不触发重渲染的数据
- 使用 useSolarSystemStore 获取全局状态
- 避免不必要的状态订阅

### 事件处理
- 使用 useCallback 缓存事件处理函数
- 使用 useEffect cleanup 清理事件监听器
- 使用 passive 事件监听器优化滚动性能
- 使用 stopPropagation 避免事件冒泡

### 无障碍实现
- 使用语义化 HTML 元素
- 添加完整的 ARIA 属性
- 支持完整的键盘导航
- 提供屏幕阅读器文本
- 确保颜色对比度符合标准

### 测试友好设计
- 使用 data-testid 标识测试元素
- 避免依赖 CSS 类名进行测试
- 提供清晰的组件接口
- 使用依赖注入便于 mock

## 未来扩展

### 可能的增强功能
1. **高级搜索过滤**
   - 按天体类型过滤
   - 按距离范围过滤
   - 按亮度过滤

2. **搜索建议增强**
   - 显示天体缩略图
   - 显示更多天体信息（质量、半径等）
   - 显示天体之间的关系

3. **语音搜索**
   - 使用 Web Speech API
   - 支持语音输入搜索

4. **搜索分析**
   - 记录搜索统计
   - 推荐热门天体
   - 个性化搜索结果

5. **多语言支持**
   - 支持更多语言
   - 自动语言检测

6. **离线支持**
   - 使用 Service Worker 缓存索引
   - 离线搜索功能

### 技术债务预防
- 定期重构代码
- 保持测试覆盖率 > 80%
- 监控性能指标
- 及时更新依赖
- 遵循代码审查流程
