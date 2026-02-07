# 代码质量工具使用指南

本文档介绍项目中配置的代码质量工具及其使用方法。

## 工具概览

### 1. ESLint 配置

项目配置了增强的 ESLint 规则，包括：

- **复杂度检查**：限制函数圈复杂度 ≤ 10
- **文档检查**：要求导出的函数、类和方法有 JSDoc 注释
- **代码质量**：限制函数长度、嵌套深度、参数数量等
- **错误处理**：强制正确的错误处理模式
- **代码组织**：检查导入顺序、重复导入等

### 2. TypeScript 严格模式

启用了增强的 TypeScript 严格模式配置：

- `noUnusedLocals`: 检测未使用的局部变量
- `noUnusedParameters`: 检测未使用的参数
- `noImplicitReturns`: 要求所有代码路径都有返回值
- `noFallthroughCasesInSwitch`: 防止 switch 语句穿透
- `noUncheckedIndexedAccess`: 索引访问时添加 undefined 检查
- `exactOptionalPropertyTypes`: 严格的可选属性类型检查

### 3. Git Hooks

配置了 pre-commit hook，在提交前自动运行：

- ESLint 检查
- TypeScript 类型检查
- 单元测试

## 使用方法

### 运行 Linter

```bash
# 检查代码
npm run lint

# 自动修复可修复的问题
npm run lint:fix
```

### 运行质量检查

```bash
# 运行完整的质量检查（lint + 类型检查）
npm run quality:check
```

### 生成质量报告

```bash
# 生成详细的质量报告
npm run quality:report
```

报告将生成在 `reports/` 目录下：
- `complexity-report.json` - 复杂度详细报告
- `documentation-report.json` - 文档覆盖率报告
- `quality-summary.json` - 质量汇总
- `quality-report.md` - Markdown 格式的可读报告

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 质量标准

### 复杂度标准

- 函数圈复杂度应 ≤ 10
- 函数长度应 ≤ 100 行（不含空行和注释）
- 嵌套深度应 ≤ 4 层
- 参数数量应 ≤ 5 个

### 文档标准

- 所有导出的函数必须有 JSDoc 注释
- 所有导出的类必须有 JSDoc 注释
- 所有公共方法必须有 JSDoc 注释
- JSDoc 应包含：
  - 功能描述
  - 参数说明（包括类型和描述）
  - 返回值说明
  - 可能抛出的错误

### 错误处理标准

- 不要抛出字面量，使用 Error 对象
- Promise 拒绝时使用 Error 对象
- 异步函数应正确处理错误

## 常见问题

### Q: 如何临时禁用某个规则？

使用 ESLint 注释：

```typescript
// eslint-disable-next-line complexity
function complexFunction() {
  // 复杂逻辑
}
```

### Q: 如何跳过 pre-commit hook？

```bash
git commit --no-verify
```

**注意**：仅在紧急情况下使用，应尽快修复质量问题。

### Q: 复杂度过高怎么办？

参考设计文档中的重构模式：
1. 提取谓词函数（条件判断）
2. 提取计算函数（复杂计算）
3. 提取配置逻辑
4. 使用策略模式替代复杂的 if-else

### Q: 如何添加 JSDoc 注释？

使用标准的 JSDoc 格式：

```typescript
/**
 * 计算两点之间的距离。
 * 
 * @param x1 - 第一个点的 x 坐标
 * @param y1 - 第一个点的 y 坐标
 * @param x2 - 第二个点的 x 坐标
 * @param y2 - 第二个点的 y 坐标
 * @returns 两点之间的欧几里得距离
 * 
 * @example
 * ```typescript
 * const distance = calculateDistance(0, 0, 3, 4);
 * console.log(distance); // 5
 * ```
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
```

## 持续改进

代码质量是一个持续改进的过程：

1. 定期运行质量报告，跟踪指标变化
2. 在代码审查中关注质量指标
3. 重构时优先处理高复杂度和缺少文档的代码
4. 新代码应符合所有质量标准

## 相关文档

- [需求文档](.kiro/specs/code-quality-improvement/requirements.md)
- [设计文档](.kiro/specs/code-quality-improvement/design.md)
- [任务列表](.kiro/specs/code-quality-improvement/tasks.md)
