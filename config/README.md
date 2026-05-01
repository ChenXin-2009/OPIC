# API审查配置文件

本目录包含API审查系统的配置文件。

## 配置文件说明

### audit-config.json
主审查配置文件，包含：
- `timeout`: 请求超时时间(毫秒)
- `retries`: 重试次数
- `concurrency`: 并发数
- `performanceThreshold`: 性能阈值(毫秒)
- `performanceIterations`: 性能测试迭代次数
- `reportFormat`: 报告格式列表 (json, markdown)
- `outputPath`: 报告输出路径
- `enabledChecks`: 启用的检查项配置

### endpoints.json
HTTP API端点配置文件，定义需要审查的所有端点及其配置：
- `path`: 端点路径
- `method`: HTTP方法
- `cacheTTL`: 缓存TTL(秒)
- `rateLimit`: 速率限制配置
- `testParams`: 测试参数

### data-sources.json
外部数据源配置文件，定义所有外部数据源：
- `name`: 数据源名称
- `category`: 数据源类别 (disasters, launches, traffic, satellites)
- `url`: 数据源URL
- `requiredFields`: 必需字段列表
- `cacheTTL`: 缓存TTL(秒)

## 使用方法

配置文件将被审查系统自动加载。可以通过环境变量覆盖部分配置：

```bash
AUDIT_TIMEOUT=10000 npm run audit
AUDIT_CONCURRENCY=20 npm run audit
```
