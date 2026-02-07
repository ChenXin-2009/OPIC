# 设计文档：代码质量改进

## 概述

本设计针对 Next.js + Three.js 太阳系可视化应用的系统性代码质量改进。当前代码库的质量指标评分为 34.45/100，在复杂度（50.02）、文档（59.45）、重复（35.00）、错误处理（25.00）和代码组织（30.00）方面存在关键问题。

改进策略遵循分阶段方法：
1. **复杂度降低**：将复杂函数分解为更小的可测试单元
2. **文档增强**：添加全面的 JSDoc 注释和内联文档
3. **去重**：将重复逻辑提取到可重用工具中
4. **错误处理**：实施健壮的错误边界和验证
5. **代码组织**：重构模块以更好地分离关注点

本设计专注于 `src/` 目录，忽略 `node_modules` 中的第三方代码。

## 架构

### 当前结构

```
src/
├── app/                    # Next.js app router
├── components/             # React 组件
│   ├── canvas/            # 3D 可视化组件
│   └── [UI 组件]
├── lib/
│   ├── 3d/                # Three.js 渲染逻辑
│   ├── astronomy/         # 轨道计算
│   ├── config/            # 配置文件
│   └── types/             # TypeScript 类型定义
└── test-setup/            # 测试配置
```

### 目标结构

```
src/
├── app/                    # Next.js app router（不变）
├── components/             # React 组件
│   ├── canvas/            # 3D 可视化组件
│   ├── ui/                # 共享 UI 组件
│   └── hooks/             # 自定义 React hooks
├── lib/
│   ├── 3d/                # Three.js 渲染逻辑
│   │   ├── core/          # 核心渲染类
│   │   ├── effects/       # 视觉效果
│   │   └── utils/         # 3D 工具
│   ├── astronomy/         # 轨道计算
│   │   ├── calculations/  # 核心计算
│   │   └── utils/         # 天文工具
│   ├── config/            # 配置文件
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 共享工具
│   │   ├── math.ts        # 数学工具
│   │   ├── validation.ts  # 输入验证
│   │   └── errors.ts      # 错误处理工具
│   └── errors/            # 错误边界和处理器
└── test-setup/            # 测试配置
```

## 组件和接口

### 1. 复杂度分析器

**目的**：识别和测量代码库中的圈复杂度。

**接口**：
```typescript
interface ComplexityReport {
  filePath: string;
  functionName: string;
  complexity: number;
  lineNumber: number;
  threshold: number;
  exceeded: boolean;
}

interface ComplexityAnalyzer {
  analyzeFile(filePath: string): ComplexityReport[];
  analyzeDirectory(dirPath: string): ComplexityReport[];
  getViolations(threshold: number): ComplexityReport[];
}
```

**实施策略**：
- 使用 ESLint 的 `complexity` 规则，阈值为 10
- 集成到构建过程中，违规时构建失败
- 生成显示复杂度热点的报告

### 2. 重构工具

**目的**：提供辅助分解复杂函数的工具。

**关键模式**：

**模式 1：提取谓词函数**
```typescript
// 之前：嵌套条件
function updateVisibility(distance: number, config: Config) {
  if (distance > config.minDistance && distance < config.maxDistance) {
    if (config.enabled && config.visible) {
      // ... 复杂逻辑
    }
  }
}

// 之后：提取的谓词
function isWithinRange(distance: number, config: Config): boolean {
  return distance > config.minDistance && distance < config.maxDistance;
}

function isVisibilityEnabled(config: Config): boolean {
  return config.enabled && config.visible;
}

function updateVisibility(distance: number, config: Config) {
  if (isWithinRange(distance, config) && isVisibilityEnabled(config)) {
    // ... 简化的逻辑
  }
}
```

**模式 2：提取计算函数**
```typescript
// 之前：内联复杂计算
function calculatePosition(elements: OrbitalElements, julianDay: number) {
  const T = (julianDay - 2451545.0) / 36525.0;
  const elem = {
    a: elements.a + elements.a_dot * T,
    e: elements.e + elements.e_dot * T,
    // ... 更多计算
  };
  const M = (elem.L - elem.w_bar) % (2 * Math.PI);
  // ... 更多复杂数学
}

// 之后：提取的函数
function computeJulianCenturies(julianDay: number): number {
  return (julianDay - 2451545.0) / 36525.0;
}

function computeElementsAtTime(elements: OrbitalElements, T: number): OrbitalElements {
  return {
    a: elements.a + elements.a_dot * T,
    e: elements.e + elements.e_dot * T,
    // ... 提取的计算
  };
}

function calculateMeanAnomaly(elem: OrbitalElements): number {
  return (elem.L - elem.w_bar) % (2 * Math.PI);
}
```

### 3. 文档系统

**目的**：为所有公共 API 提供全面的文档。

**函数的 JSDoc 模板**：
```typescript
/**
 * 函数功能的简要描述。
 * 
 * 如需要，提供详细说明，包括：
 * - 算法描述
 * - 性能考虑
 * - 副作用
 * 
 * @param paramName - 参数描述
 * @param optionalParam - 可选参数描述（可选）
 * @returns 返回值描述
 * @throws {ErrorType} 何时抛出此错误的描述
 * 
 * @example
 * ```typescript
 * const result = functionName(arg1, arg2);
 * ```
 */
function functionName(paramName: string, optionalParam?: number): ReturnType {
  // 实现
}
```

### 4. 去重策略

**目的**：识别和消除代码重复。

**识别的常见重复模式**：

**模式 1：坐标转换**
```typescript
// 发现于：SceneManager.ts、Planet.ts、SatelliteOrbit.ts
// 提取到：src/lib/utils/coordinates.ts

/**
 * 将角度转换为弧度。
 * 
 * @param degrees - 角度（度）
 * @returns 角度（弧度）
 */
export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * 应用旋转变换到向量。
 * 
 * @param vector - 输入向量
 * @param rotation - 旋转角度（弧度）
 * @returns 变换后的向量
 */
export function applyRotation(
  vector: THREE.Vector3,
  rotation: { x: number; y: number; z: number }
): THREE.Vector3 {
  const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ');
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  return vector.clone().applyQuaternion(quaternion);
}
```

### 5. 错误处理系统

**目的**：在整个应用程序中实施全面的错误处理。

**错误类层次结构**：
```typescript
// src/lib/errors/base.ts

/**
 * 应用程序特定错误的基类。
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 计算未能收敛时抛出的错误。
 */
export class ConvergenceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONVERGENCE_ERROR', context);
  }
}

/**
 * 纹理加载失败时抛出的错误。
 */
export class TextureLoadError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TEXTURE_LOAD_ERROR', context);
  }
}

/**
 * 验证失败时抛出的错误。
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}
```

**React 错误边界**：
```typescript
// src/components/errors/ErrorBoundary.tsx

/**
 * 捕获 React 渲染错误的错误边界组件。
 * 
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  // 实现...
}
```

## 数据模型

### 复杂度指标

```typescript
interface ComplexityMetrics {
  filePath: string;
  functions: FunctionComplexity[];
  averageComplexity: number;
  maxComplexity: number;
  violationCount: number;
}

interface FunctionComplexity {
  name: string;
  complexity: number;
  lineNumber: number;
  lineCount: number;
}
```

### 文档覆盖率

```typescript
interface DocumentationMetrics {
  filePath: string;
  totalFunctions: number;
  documentedFunctions: number;
  totalClasses: number;
  documentedClasses: number;
  coveragePercentage: number;
}
```


## 正确性属性

*属性是在系统的所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的正式陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：复杂度检测准确性

*对于任何*具有已知圈复杂度的 TypeScript 函数，当由复杂度分析器分析时，报告的复杂度应在 ±1 的容差范围内与实际复杂度匹配。

**验证：需求 1.1**

### 属性 2：回归预防

*对于任何*代码重构（复杂度降低、去重或重组），所有现有测试套件应在重构完成后继续通过，并且 TypeScript 编译应成功且无类型错误。

**验证：需求 1.4、3.5、8.1、8.3**

### 属性 3：文档完整性

*对于 src/ 目录中的任何*导出函数、类或接口，代码应包含具有所有必需字段的 JSDoc 注释：描述、参数文档（包含类型和描述）、返回值文档，以及适用时的抛出错误文档。

**验证：需求 2.1、2.2、2.3**

### 属性 4：重复检测

*对于任何*在代码库中出现超过两次的代码块，重复检测工具应识别它并报告所有出现位置及其文件路径和行号。

**验证：需求 3.1**

### 属性 5：错误处理覆盖

*对于任何*包含风险操作（异步调用、外部 API 调用、解析、文件 I/O 或可能失败的数学计算）的函数，该函数应包含适当的错误处理（同步操作的 try-catch 块，异步操作的 .catch() 或 try-catch）。

**验证：需求 4.1、4.6**

### 属性 6：错误日志记录

*对于应用程序中捕获的任何*错误，错误处理器应调用记录错误名称、消息和上下文信息的日志函数。

**验证：需求 4.2**

### 属性 7：渲染器错误隔离

*对于 3D 渲染系统（SceneManager、CameraController、Planet 等）中抛出的任何*错误，该错误应被捕获和处理，而不会传播导致整个应用程序崩溃。

**验证：需求 4.3**

### 属性 8：计算器错误处理

*对于天文计算函数（calculatePosition、solveKepler 等）中的任何*错误，该函数应返回合理的默认值或抛出类型化错误（扩展 AppError）。

**验证：需求 4.4**

### 属性 9：输入验证

*对于任何*接受外部输入（用户输入、API 响应、配置文件）的函数，该函数应在处理前验证输入，如果输入无效则抛出 ValidationError。

**验证：需求 4.5**

### 属性 10：模块索引文件

*对于 src/lib/ 中包含多个模块的任何*目录，该目录应有一个 index.ts 文件，导出这些模块的公共 API。

**验证：需求 5.4**

### 属性 11：类型组织

*对于任何*跨多个模块共享的 TypeScript 类型、接口或枚举定义，它应在 src/lib/types/ 目录中定义，并遵循类型/接口使用 PascalCase、常量使用 UPPER_SNAKE_CASE 的命名约定。

**验证：需求 5.7**

### 属性 12：重构前的测试覆盖

*对于任何*计划重构的代码模块，如果该模块缺少测试覆盖，应在任何重构工作开始之前创建并通过测试。

**验证：需求 8.2**

## 错误处理

### 错误类别

1. **渲染错误**：Three.js 渲染、纹理加载、几何创建中的错误
   - 策略：在组件级别捕获，记录，显示后备 UI
   - 恢复：继续渲染其他对象，使用后备纹理/几何

2. **计算错误**：天文计算、收敛失败中的错误
   - 策略：在计算级别捕获，返回默认值或抛出类型化错误
   - 恢复：使用最后已知的良好值或跳过帧

3. **验证错误**：无效的用户输入、配置错误
   - 策略：早期验证，抛出带有清晰消息的 ValidationError
   - 恢复：向用户显示错误消息，使用默认值

4. **资源加载错误**：纹理/数据加载失败、网络错误
   - 策略：在加载器级别捕获，使用后备，使用指数退避重试
   - 恢复：使用后备资源，以降级功能继续

### 错误处理模式

**模式 1：带日志的 Try-Catch**
```typescript
try {
  const result = riskyOperation();
  return result;
} catch (error) {
  logError(error instanceof Error ? error : new Error(String(error)), {
    operation: 'riskyOperation',
    context: { /* 相关数据 */ }
  });
  throw new AppError('操作失败', 'OPERATION_ERROR', { cause: error });
}
```

**模式 2：异步错误处理**
```typescript
async function loadResource(path: string): Promise<Resource> {
  try {
    const resource = await fetch(path);
    return await resource.json();
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      operation: 'loadResource',
      path
    });
    throw new ResourceLoadError(`加载资源失败：${path}`, { cause: error });
  }
}
```

**模式 3：错误边界使用**
```typescript
// 包装可能抛出错误的组件
<ErrorBoundary
  fallback={<ErrorFallback message="渲染 3D 场景失败" />}
  onError={(error, errorInfo) => {
    logError(error, { componentStack: errorInfo.componentStack });
  }}
>
  <SolarSystemCanvas3D />
</ErrorBoundary>
```

## 测试策略

### 双重测试方法

本项目需要单元测试和基于属性的测试来确保全面覆盖：

- **单元测试**：验证特定示例、边缘情况和错误条件
- **属性测试**：验证所有输入的通用属性
- 两种方法互补，对于完整验证都是必要的

### 单元测试

**重点领域**：
- 特定重构示例（前后对比）
- 复杂度分析中的边缘情况（空函数、单行函数）
- 错误处理场景（特定错误类型、恢复路径）
- 模块之间的集成点
- React 组件渲染和用户交互

**测试工具**：
- Jest 作为测试运行器
- React Testing Library 用于组件测试
- TypeScript 用于类型检查

### 基于属性的测试

**重点领域**：
- 所有函数类型的复杂度分析准确性
- 所有导出符号的文档完整性
- 所有风险操作的错误处理覆盖
- 所有重构的回归预防
- 所有外部输入的输入验证

**测试库**：
- fast-check 用于 TypeScript 基于属性的测试

**配置**：
- 每个属性测试最少 100 次迭代
- 每个测试标记功能名称和属性编号

**示例属性测试**：
```typescript
import fc from 'fast-check';

describe('属性：复杂度检测准确性', () => {
  /**
   * 功能：code-quality-improvement，属性 1
   * 对于任何具有已知圈复杂度的 TypeScript 函数，
   * 分析器应报告正确的复杂度。
   */
  it('应准确检测圈复杂度', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // 目标复杂度
        (targetComplexity) => {
          const code = generateFunctionWithComplexity(targetComplexity);
          const report = analyzeComplexity(code);
          
          // 边缘情况允许 ±1 容差
          expect(Math.abs(report.complexity - targetComplexity)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('属性：文档完整性', () => {
  /**
   * 功能：code-quality-improvement，属性 3
   * 对于任何导出函数，JSDoc 应包含所有必需字段。
   */
  it('所有导出应有完整的 JSDoc', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...getAllExportedFunctions()),
        (functionInfo) => {
          const jsdoc = parseJSDoc(functionInfo.source);
          
          expect(jsdoc).toBeDefined();
          expect(jsdoc.description).toBeTruthy();
          
          // 所有参数应被文档化
          functionInfo.parameters.forEach(param => {
            expect(jsdoc.params).toContainEqual(
              expect.objectContaining({ name: param.name })
            );
          });
          
          // 如果不是 void，返回值应被文档化
          if (functionInfo.returnType !== 'void') {
            expect(jsdoc.returns).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('属性：回归预防', () => {
  /**
   * 功能：code-quality-improvement，属性 2
   * 对于任何重构，所有测试应通过，TypeScript 应编译。
   */
  it('重构后应保持功能', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...getRefactoredModules()),
        (module) => {
          // 运行此模块的测试
          const testResult = runTests(module.testPath);
          expect(testResult.success).toBe(true);
          
          // 验证 TypeScript 编译
          const compileResult = compileTypeScript(module.sourcePath);
          expect(compileResult.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 测试工作流

1. **重构前**：
   - 运行现有测试以建立基线
   - 为未覆盖的代码创建新测试
   - 记录当前行为

2. **重构期间**：
   - 频繁运行测试（每次小更改后）
   - 使用 TypeScript 编译器捕获类型错误
   - 验证复杂度指标改进

3. **重构后**：
   - 运行完整测试套件
   - 运行基于属性的测试
   - 生成质量报告
   - 将指标与基线比较

### 质量指标跟踪

在重构前后跟踪这些指标：
- 平均圈复杂度
- 最大圈复杂度
- 文档覆盖率百分比
- 代码重复百分比
- 错误处理覆盖率百分比
- 测试覆盖率百分比
- TypeScript 严格模式合规性

### 持续集成

将质量检查集成到 CI/CD 管道中：
1. 运行 linter（ESLint）
2. 运行复杂度分析器
3. 运行单元测试
4. 运行基于属性的测试
5. 生成质量报告
6. 如果未达到阈值则构建失败
