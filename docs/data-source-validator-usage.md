# DataSourceValidator 使用指南

## 概述

`DataSourceValidator` 是API审查系统中负责验证外部数据源连接性和数据质量的核心组件。

## 功能特性

### 1. 单个数据源验证
- 测试数据源连接性
- 测量响应时间
- 获取并解析数据
- 记录数据记录数量
- 评估数据质量

### 2. 数据质量评估
- 检查数据是否为空
- 验证必需字段是否存在
- 计算质量评分（0-100）
- 记录数据质量问题

### 3. 批量数据源验证
- 支持按类别验证数据源
- 并发执行验证任务
- 自动控制并发数量
- 提供验证摘要统计

## 使用示例

### 基本使用

```typescript
import { DataSourceValidator } from './validators';
import type { DataSourceConfig } from './models/config-models';

// 创建验证器实例
const validator = new DataSourceValidator({
  timeout: 10000,      // 10秒超时
  retries: 3,          // 重试3次
  concurrency: 5,      // 最多5个并发请求
  minRecordCount: 1,   // 最少1条记录
});

// 定义数据源配置
const dataSource: DataSourceConfig = {
  name: 'usgs_earthquake',
  category: 'disasters',
  url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  requiredFields: ['type', 'features'],
  cacheTTL: 300,
};

// 验证单个数据源
const result = await validator.validateDataSource(dataSource);

console.log('数据源状态:', result.available ? '可用' : '不可用');
console.log('响应时间:', result.responseTime, 'ms');
console.log('记录数量:', result.recordCount);
console.log('质量评分:', result.quality?.score);
console.log('质量问题:', result.quality?.issues);
```

### 批量验证所有数据源

```typescript
import dataSources from '../config/data-sources.json';

// 验证所有数据源
const allResults = await validator.validateDataSources(dataSources.dataSources);

// 获取验证摘要
const summary = validator.getValidationSummary(allResults);

console.log('总数据源:', summary.total);
console.log('可用数据源:', summary.available);
console.log('不可用数据源:', summary.unavailable);
console.log('平均响应时间:', summary.avgResponseTime, 'ms');
console.log('平均质量评分:', summary.avgQualityScore);
console.log('问题总数:', summary.issuesCount);
```

### 按类别验证数据源

```typescript
// 验证灾害数据源
const disasterResults = await validator.validateDisasterSources(dataSources.dataSources);

// 验证航天发射数据源
const launchResults = await validator.validateLaunchSources(dataSources.dataSources);

// 验证交通数据源
const trafficResults = await validator.validateTrafficSources(dataSources.dataSources);

// 验证卫星数据源
const satelliteResults = await validator.validateSatelliteSources(dataSources.dataSources);
```

### 自定义配置

```typescript
// 创建高性能配置的验证器
const fastValidator = new DataSourceValidator({
  timeout: 5000,       // 5秒超时
  retries: 1,          // 只重试1次
  concurrency: 10,     // 10个并发请求
  minRecordCount: 0,   // 不要求最少记录数
});

// 创建严格配置的验证器
const strictValidator = new DataSourceValidator({
  timeout: 30000,      // 30秒超时
  retries: 5,          // 重试5次
  concurrency: 3,      // 3个并发请求
  minRecordCount: 10,  // 至少10条记录
});
```

## 返回数据结构

### DataSourceHealth

```typescript
interface DataSourceHealth {
  source: string;           // 数据源名称
  available: boolean;       // 是否可用
  responseTime?: number;    // 响应时间(毫秒)
  recordCount?: number;     // 数据记录数量
  quality?: DataQuality;    // 数据质量评估
  error?: string;           // 错误信息(如果有)
  timestamp: Date;          // 检查时间戳
}
```

### DataQuality

```typescript
interface DataQuality {
  score: number;      // 质量评分(0-100)
  issues: string[];   // 质量问题列表
}
```

## 配置选项

### DataSourceValidatorConfig

```typescript
interface DataSourceValidatorConfig {
  timeout: number;          // 请求超时时间(毫秒)，默认10000
  retries: number;          // 重试次数，默认3
  concurrency: number;      // 并发数，默认5
  minRecordCount?: number;  // 最小记录数量阈值，默认1
}
```

## 错误处理

验证器会捕获并处理以下类型的错误：

1. **网络错误**: 连接超时、DNS解析失败
2. **HTTP错误**: 4xx/5xx状态码
3. **数据解析错误**: JSON解析失败
4. **其他错误**: 未预期的异常

所有错误都会被记录到日志中，并在返回结果中标记数据源为不可用。

## 日志输出

验证器使用结构化日志记录，日志级别包括：

- **DEBUG**: 详细的验证过程信息
- **INFO**: 验证成功和批量验证摘要
- **WARN**: 验证失败但可恢复的错误
- **ERROR**: 严重错误

示例日志输出：

```
2024-01-15T10:30:00.000Z [INFO] [DataSourceValidator] Validating data source: usgs_earthquake
2024-01-15T10:30:01.234Z [INFO] [DataSourceValidator] Data source validated successfully: usgs_earthquake
2024-01-15T10:30:05.678Z [INFO] [DataSourceValidator] Batch validation completed
```

## 性能考虑

### 并发控制

验证器使用并发控制机制，避免同时发起过多请求：

- 默认并发数为5
- 可通过配置调整并发数
- 自动管理任务队列

### 超时和重试

- 默认超时时间为10秒
- 支持指数退避重试策略
- 可重试的HTTP状态码: 408, 429, 500, 502, 503, 504

### 内存管理

- 流式处理大型响应数据
- 及时释放已完成任务的资源
- 避免内存泄漏

## 最佳实践

1. **合理设置超时时间**: 根据数据源的响应速度调整超时时间
2. **控制并发数**: 避免对外部服务造成过大压力
3. **监控验证结果**: 定期检查数据源健康状态
4. **处理验证失败**: 对不可用的数据源进行告警和处理
5. **优化重试策略**: 根据数据源的稳定性调整重试次数

## 集成示例

### 与审查编排器集成

```typescript
import { DataSourceValidator } from './validators';
import { AuditOrchestrator } from './core/orchestrator';

const orchestrator = new AuditOrchestrator({
  dataSourceValidator: new DataSourceValidator({
    timeout: 10000,
    retries: 3,
    concurrency: 5,
  }),
});

await orchestrator.runFullAudit();
```

### 与报告生成器集成

```typescript
import { DataSourceValidator } from './validators';
import { ReportGenerator } from './reporters';

const validator = new DataSourceValidator();
const results = await validator.validateDataSources(dataSources);

const reportGenerator = new ReportGenerator();
const report = reportGenerator.generateDataSourceReport(results);
```

## 故障排查

### 常见问题

1. **所有数据源都验证失败**
   - 检查网络连接
   - 检查防火墙设置
   - 验证DNS解析

2. **某些数据源超时**
   - 增加超时时间
   - 检查数据源服务状态
   - 考虑使用代理

3. **数据质量评分低**
   - 检查必需字段配置是否正确
   - 验证数据源返回的数据结构
   - 查看质量问题列表

4. **并发请求过多导致限流**
   - 降低并发数
   - 增加请求间隔
   - 使用速率限制

## 相关文档

- [API审查功能需求文档](../.kiro/specs/api-audit/requirements.md)
- [API审查功能设计文档](../.kiro/specs/api-audit/design.md)
- [HTTP客户端工具文档](./http-client-usage.md)
- [统计工具文档](./statistics-usage.md)
