/**
 * 配置数据模型
 * 定义API审查系统的配置结构
 */

/**
 * 数据源类别
 */
export type DataSourceCategory = 'disasters' | 'launches' | 'traffic' | 'satellites';

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  /** 数据源名称 */
  name: string;
  /** 数据源类别 */
  category: DataSourceCategory;
  /** 数据源URL */
  url: string;
  /** 必需字段列表 */
  requiredFields: string[];
  /** 缓存TTL(秒) */
  cacheTTL: number;
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 时间窗口内允许的请求数 */
  requests: number;
  /** 时间窗口(秒) */
  window: number;
}

/**
 * 端点配置
 */
export interface EndpointConfig {
  /** 端点路径 */
  path: string;
  /** HTTP方法 */
  method: string;
  /** 缓存TTL(秒) */
  cacheTTL?: number;
  /** 速率限制配置 */
  rateLimit?: RateLimitConfig;
  /** 测试参数 */
  testParams?: Record<string, any>;
}

/**
 * 启用的检查项配置
 */
export interface EnabledChecks {
  /** 是否启用健康检查 */
  health: boolean;
  /** 是否启用数据源验证 */
  dataSources: boolean;
  /** 是否启用缓存验证 */
  cache: boolean;
  /** 是否启用错误处理验证 */
  errors: boolean;
  /** 是否启用速率限制验证 */
  rateLimit: boolean;
  /** 是否启用性能监控 */
  performance: boolean;
  /** 是否启用客户端API验证 */
  clientAPIs: boolean;
}

/**
 * 报告格式
 */
export type ReportFormat = 'json' | 'markdown';

/**
 * 审查配置
 */
export interface AuditConfig {
  /** 请求超时时间(毫秒) */
  timeout: number;
  /** 重试次数 */
  retries: number;
  /** 并发数 */
  concurrency: number;
  /** 性能阈值(毫秒) */
  performanceThreshold: number;
  /** 性能测试迭代次数 */
  performanceIterations: number;
  /** 报告格式列表 */
  reportFormat: ReportFormat[];
  /** 报告输出路径 */
  outputPath: string;
  /** 启用的检查项 */
  enabledChecks: EnabledChecks;
}
