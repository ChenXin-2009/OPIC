# Contributing to OPIC

感谢你有兴趣为 OPIC 做贡献！OPIC 是一个基于 Web 的多尺度宇宙可视化系统，从地球表面到可观测宇宙边缘。

## 🤖 欢迎 AI 协作

我们热烈欢迎并鼓励使用 AI 工具和代理辅助的贡献！无论你是人类开发者还是 AI 助手，都是我们社区的重要成员。

### AI 贡献指南

- ✅ **欢迎使用 AI 工具**：GitHub Copilot、Cursor、Kiro、Claude、ChatGPT 等
- ✅ **AI 辅助的代码审查**：使用 AI 帮助发现潜在问题
- ✅ **AI 生成的文档**：改进文档质量和多语言支持
- ✅ **AI 辅助的测试**：生成测试用例和边界条件
- ✅ **透明度**：在 PR 中说明使用了 AI 工具（可选但推荐）

### AI 贡献最佳实践

1. **代码质量优先**：确保 AI 生成的代码通过所有测试和类型检查
2. **理解代码**：不要盲目提交 AI 生成的代码，确保你理解其工作原理
3. **遵循项目规范**：AI 生成的代码应符合项目的编码风格和架构
4. **人工审查**：对 AI 生成的代码进行人工审查和优化

## 快速开始

### 环境要求

- Node.js 20+
- npm 或 yarn

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 查看应用。

## 项目架构

OPIC 采用双引擎架构，并正在向模块化插件架构（MOD Manager）演进：

```
src/
├── app/                    # Next.js 应用路由
├── components/             # React 组件
│   ├── canvas/            # Three.js 画布组件
│   ├── cesium/            # Cesium 地图组件
│   ├── satellite/         # 卫星追踪 UI
│   ├── search/            # 搜索功能
│   ├── mod-manager/       # MOD 管理器 UI（开发中）
│   ├── exoplanets/        # 系外行星系统
│   └── ...
├── lib/                    # 核心逻辑
│   ├── 3d/                # Three.js 渲染器
│   │   ├── SceneManager.ts
│   │   ├── Planet.ts
│   │   ├── GalaxyRenderer.ts
│   │   ├── LocalGroupRenderer.ts
│   │   ├── VirgoSuperclusterRenderer.ts
│   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   ├── LODManager.ts
│   │   └── ...
│   ├── cesium/            # Cesium 集成
│   │   ├── CesiumAdapter.ts
│   │   └── CameraSynchronizer.ts
│   ├── astronomy/         # 天文计算（星历、轨道）
│   ├── satellite/         # 卫星追踪（SGP4）
│   ├── mod-manager/       # MOD 管理器核心（开发中）
│   │   ├── core/          # 注册表、生命周期、依赖解析
│   │   ├── api/           # Time/Camera/Celestial/Satellite/Render API
│   │   ├── persistence/   # 配置持久化
│   │   ├── error/         # 错误处理与隔离
│   │   └── performance/   # 性能监控
│   ├── data/              # 数据加载器
│   └── config/            # 配置文件
├── lib/state/             # Zustand 状态管理（窗口、场景、地球控制）
├── lib/store/             # Zustand 数据存储（卫星、星历、系外行星）
└── lib/types/             # TypeScript 类型定义
```

## 开发指南

### 技术栈

| 领域 | 技术 |
|------|------|
| 框架 | Next.js 16 / React 19 |
| 3D 渲染 | Three.js 0.170 + Cesium 1.139 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| 状态 | Zustand 5 |
| 测试 | Jest + fast-check（属性测试） |

### 代码规范

- **TypeScript**：所有代码必须通过类型检查
- **模块化**：保持文件职责单一
- **注释**：复杂逻辑添加中文注释
- **命名**：使用语义化的变量和函数名

### 提交规范

使用 Conventional Commits：

```
feat: 添加木星大红斑渲染
fix: 修复卫星轨道计算精度问题
docs: 更新 CONTRIBUTING.md
refactor: 重构 Cesium 相机同步逻辑
test: 添加星历计算单元测试
perf: 优化银河系粒子渲染性能
```

### 代码检查

提交前确保通过：

```bash
# 类型检查 + Lint
npm run quality:check

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

## Pull Request 流程

1. Fork 本仓库
2. 从 `main` 创建特性分支：`git checkout -b feature/your-feature`
3. 进行修改并提交
4. 确保通过所有检查：
   - `npm run quality:check`
   - `npm test`
5. 推送到你的 Fork 并创建 PR
6. 在 PR 描述中关联相关 Issue

## 贡献领域

### 适合新手的任务

- UI 组件优化
- 文档改进
- 测试用例补充
- Bug 修复

查看 `good first issue` 标签的 Issue。

### 核心领域

| 领域 | 技能要求 |
|------|----------|
| Three.js 渲染 | WebGL、着色器、3D 数学 |
| Cesium 集成 | GIS、瓦片系统、相机控制 |
| 天文计算 | 轨道力学、星历计算 |
| 卫星追踪 | SGP4、TLE 数据 |
| 性能优化 | LOD、实例化、内存管理 |
| MOD 系统 | 插件架构、依赖管理、API 设计 |

### MOD 管理器系统（开发中）

项目正在实现模块化插件架构，欢迎参与：

- MOD 生命周期管理
- 依赖解析与循环检测
- API 层设计（Time / Camera / Celestial / Satellite / Render）
- 配置持久化
- MOD 管理 UI

详见 `docs/` 目录中的 MOD 系统文档。

## 数据文件

项目使用多种天文数据：

- `public/data/ephemeris/` - NASA JPL 星历数据
- `public/data/gaia/` - ESA Gaia 恒星数据
- `public/data/universe/` - 宇宙结构数据
- `public/textures/` - 行星纹理

**注意**：数据文件通常较大，修改前请了解数据格式。

## 调试技巧

### 开启调试面板

开发环境下，调试组件仅在 `NODE_ENV=development` 时渲染：

*调试面板在开发环境下可用。*

### 常见问题

**Cesium 资源加载失败**

确保 `public/cesium/` 目录完整，包含 Cesium 静态资源。

**星历数据精度**

高精度范围：2009-2109（地球/火星/月球），2009-2039（其他天体）。超出范围自动切换解析模型。

## 有问题？

- 在 [Issue](https://github.com/ChenXin-2009/OPIC/issues) 中提问
- 联系 [@ChenXin-2009](https://github.com/ChenXin-2009)

---

再次感谢你的贡献！无论你是人类开发者还是 AI 助手，我们都期待你的参与！
