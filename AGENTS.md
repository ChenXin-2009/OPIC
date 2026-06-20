# OPIC — AI Agent 开发指南

## 项目概述

OPIC (Open Integrated Cosmos) 是一个基于 Web 的多尺度宇宙可视化系统，支持从地球到星系的沉浸式探索。

- **技术栈**: Next.js 16 + React 19 + TypeScript 5 + Three.js 0.170 + Cesium 1.139 + Zustand 5
- **测试**: Jest 30 + ts-jest, jsdom 环境
- **路径别名**: `@/` → `src/`

---

## 目录结构速查

```
src/
├── app/                    # Next.js 页面和 API 路由
│   ├── page.tsx            # 主页面
│   └── api/                # 后端 API (卫星、发射、灾害、交通等)
├── components/             # React 组件
│   ├── canvas/3d/          # Three.js 3D 渲染组件
│   ├── ui/                 # 基础 UI 组件库
│   ├── window-manager/     # 浮动窗口系统
│   ├── dock/               # macOS 风格 Dock
│   ├── search/             # 天体搜索
│   ├── satellite/          # 卫星追踪 UI
│   ├── loading/            # 加载动画
│   └── ...                 # 其他业务组件
├── lib/                    # 核心业务逻辑 (无 React 依赖)
│   ├── 3d/                 # Three.js 渲染 (camera/, player/, utils/)
│   ├── astronomy/          # 天文计算 (轨道、时间、星表)
│   ├── cesium/             # Cesium 地球集成
│   ├── config/             # 配置管理器
│   ├── coordinates/        # 统一坐标系变换 (ICRF 锚定的 Frame Graph)
│   ├── data/               # 宇宙数据加载器
│   ├── errors/             # 基础错误类型
│   ├── exoplanets/         # 系外行星坐标计算
│   ├── i18n/               # 国际化
│   ├── mod-manager/        # MOD 插件系统 (核心子系统)
│   ├── mods/               # 内置 MOD 实现
│   ├── search/             # 搜索引擎
│   ├── state/              # Zustand 状态管理
│   ├── store/              # Zustand store hooks
│   ├── utils/              # 数学/通用工具函数
│   └── types/              # 共享类型定义
└── test/                   # 集成和手动测试
```

---

## 核心约定

### 文件命名

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | PascalCase | `TimeControl.tsx` |
| 业务逻辑类 | PascalCase | `CameraController.ts` |
| 工具函数 | camelCase | `formatMaybe.ts` |
| 状态 store | PascalCase | `DockStore.ts` |
| 测试文件 | `*.test.ts(x)` | `math.test.ts` |
| 测试目录 | `__tests__/` | 与源码同级 |
| 数据/配置 | kebab-case | `audit-config.json` |

### 导出模式

所有 `lib/` 子模块使用 `index.ts` barrel 文件，采用**命名导出**风格：

```ts
// 正确 — 命名导出
export { CameraController } from './CameraController';
export { Planet } from './Planet';

// 避免 — 通配符重导出
export * from './CameraController';
```

### 导入别名

```ts
// 推荐 — 使用 @/ 别名
import { CameraController } from '@/lib/3d/camera/CameraController';

// 避免 — 相对路径深层嵌套
import { CameraController } from '../../../lib/3d/camera/CameraController';
```

### 模块职责

| 层 | 职责 | 禁止 |
|----|------|------|
| `lib/` | 纯业务逻辑 | 不可引用 React/JSX |
| `components/` | UI 渲染 | 不应包含复杂业务逻辑 |
| `app/` | 页面/路由 | 仅做组合编排 |

---

## MOD 插件系统

`src/lib/mod-manager/` 是核心子系统，包含 14 个模块：

```
mod-manager/
├── api/              # MOD API 层 (Camera, Celestial, Render, Satellite, Time)
├── config/           # 配置解析器
├── core/             # 核心 (EventBus, Lifecycle, Registry, DependencyResolver)
├── error/            # 错误类型层次 (ModError, PermissionError, SandboxError, ...)
├── permission/       # 权限系统
├── sandbox/          # 沙箱执行环境
├── service/          # 服务注册表
├── store/            # MOD 状态 store
├── utils/            # SemVer 解析、Manifest 验证
└── ...
```

---

## 测试规范

### 测试位置

测试文件放在源码同级 `__tests__/` 目录中：

```
src/lib/utils/
├── math.ts
├── validation.ts
└── __tests__/
    ├── math.test.ts
    └── validation.test.ts
```

### 测试风格

```ts
import { degreesToRadians } from '../math';

describe('math', () => {
  it('should convert degrees to radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });
});
```

### 覆盖率

当前 Jest 配置的覆盖率阈值为 7%（全局），实际覆盖率约 19%（行）。

---

## 常见陷阱

1. **`@/` 路径别名** — 在 `jest.config.js` 和 `tsconfig.json` 中都配置了，测试中可直接使用
2. **`fs` 模块** — Jest 的 jsdom 环境不支持 `fs`，涉及文件读写的代码（如遗留审计系统）在测试中会失败
3. **Three.js 导入** — `import * as THREE from 'three'` 已在依赖中，测试环境可直接使用
4. **Cesium 导入** — `import('cesium')` 仅为动态导入，测试时需 mock
5. **Store 命名** — 状态文件使用 PascalCase（如 `DockStore.ts`），导出的 hook 使用 `use` 前缀（如 `useDockStore`）
