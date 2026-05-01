# API审查系统源代码

本目录包含API审查系统的所有源代码。

## 目录结构

```
src/
├── core/                    # 核心模块
│   ├── config.ts           # 配置管理器
│   ├── orchestrator.ts     # 审查编排器 (待实现)
│   └── tsconfig.json       # TypeScript编译配置
├── models/                  # 数据模型
│   ├── health-models.ts    # 健康状态模型
│   ├── audit-results.ts    # 审查结果模型
│   ├── config-models.ts    # 配置模型
│   └── index.ts            # 模型统一导出
├── validators/              # 验证器模块
│   ├── health-checker.ts           # 健康检查器 (待实现)
│   ├── data-source-validator.ts    # 数据源验证器 (待实现)
│   ├── cache-validator.ts          # 缓存验证器 (待实现)
│   ├── error-validator.ts          # 错误处理验证器 (待实现)
│   ├── rate-limit-validator.ts     # 速率限制验证器 (待实现)
│   ├── performance-monitor.ts      # 性能监控器 (待实现)
│   └── client-api-validator.ts     # 客户端API验证器 (待实现)
├── reporters/               # 报告生成器模块
│   ├── report-generator.ts  # 报告生成器 (待实现)
│   ├── json-reporter.ts     # JSON报告器 (待实现)
│   └── markdown-reporter.ts # Markdown报告器 (待实现)
├── utils/                   # 工具函数
│   ├── http-client.ts       # HTTP客户端封装 (待实现)
│   ├── statistics.ts        # 统计计算工具 (待实现)
│   └── logger.ts            # 日志工具 (待实现)
├── cli.ts                   # 命令行接口
└── index.ts                 # 主入口文件
```

## 模块说明

### core - 核心模块
- **config.ts**: 配置管理器，负责加载和验证审查配置
- **orchestrator.ts**: 审查编排器，协调所有审查任务的执行

### models - 数据模型
- **health-models.ts**: 定义健康检查相关的数据结构
- **audit-results.ts**: 定义审查结果和报告的数据结构
- **config-models.ts**: 定义配置相关的数据结构

### validators - 验证器
各类验证器负责执行具体的审查任务：
- 健康检查器: 验证HTTP API端点可访问性
- 数据源验证器: 验证外部数据源有效性
- 缓存验证器: 验证缓存机制正确性
- 错误处理验证器: 验证错误处理和降级机制
- 速率限制验证器: 验证速率限制有效性
- 性能监控器: 测量和分析API性能
- 客户端API验证器: 验证客户端JavaScript API可用性

### reporters - 报告生成器
- **report-generator.ts**: 汇总审查结果并生成报告
- **json-reporter.ts**: 生成JSON格式报告
- **markdown-reporter.ts**: 生成Markdown格式报告

### utils - 工具函数
- **http-client.ts**: HTTP客户端封装，提供超时控制和重试机制
- **statistics.ts**: 统计计算工具，计算平均值、百分位数等
- **logger.ts**: 日志工具，提供结构化日志记录

## 使用方法

### 命令行方式

```bash
# 执行完整审查
npm run audit

# 执行选择性审查
npm run audit -- --targets=health,performance

# 使用自定义配置
npm run audit -- --config=./custom-config.json

# 指定报告格式
npm run audit -- --format=json,markdown

# 指定输出路径
npm run audit -- --output=./reports
```

### 编程方式

```typescript
import { ConfigManager } from './core/config';
import { AuditOrchestrator } from './core/orchestrator';

// 加载配置
const configManager = new ConfigManager();
const config = configManager.getAuditConfig();

// 创建审查编排器
const orchestrator = new AuditOrchestrator(config);

// 执行完整审查
const results = await orchestrator.runFullAudit();

// 执行选择性审查
const selectiveResults = await orchestrator.runSelectiveAudit(['health', 'performance']);
```

## 开发指南

### 添加新的验证器

1. 在 `validators/` 目录创建新的验证器文件
2. 实现验证逻辑
3. 在审查编排器中注册新的验证器
4. 在配置模型中添加对应的启用开关

### 添加新的报告格式

1. 在 `reporters/` 目录创建新的报告器文件
2. 实现报告生成逻辑
3. 在报告生成器中注册新的报告器
4. 在配置模型中添加对应的格式选项

## 测试

测试文件位于项目根目录的 `test/` 文件夹中：

```bash
# 运行所有测试
npm test

# 运行测试并监听变化
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5+
- **HTTP客户端**: node-fetch
- **测试框架**: Jest
- **日志**: winston
