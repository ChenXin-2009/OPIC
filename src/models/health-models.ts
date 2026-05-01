/**
 * 健康状态数据模型
 * 定义API审查系统中的健康检查相关数据结构
 */

/**
 * 端点健康状态
 */
export interface EndpointHealth {
  /** API端点URL */
  url: string;
  /** HTTP状态码 */
  status: number;
  /** 响应时间(毫秒) */
  responseTime: number;
  /** 是否健康(2xx/3xx为健康) */
  healthy: boolean;
  /** 错误信息(如果有) */
  error?: string;
  /** 检查时间戳 */
  timestamp: Date;
}

/**
 * 数据质量评估
 */
export interface DataQuality {
  /** 质量评分(0-100) */
  score: number;
  /** 质量问题列表 */
  issues: string[];
}

/**
 * 数据源健康状态
 */
export interface DataSourceHealth {
  /** 数据源名称 */
  source: string;
  /** 是否可用 */
  available: boolean;
  /** 响应时间(毫秒) */
  responseTime?: number;
  /** 数据记录数量 */
  recordCount?: number;
  /** 数据质量评估 */
  quality?: DataQuality;
  /** 错误信息(如果有) */
  error?: string;
  /** 检查时间戳 */
  timestamp: Date;
}

/**
 * 缓存测试结果
 */
export interface CacheTestResult {
  /** 端点URL */
  endpoint: string;
  /** 是否缓存命中 */
  cacheHit: boolean;
  /** 第一次请求时间(毫秒) */
  firstRequestTime: number;
  /** 第二次请求时间(毫秒) */
  secondRequestTime: number;
  /** 性能改善(毫秒) */
  improvement: number;
  /** 改善百分比 */
  improvementPercent: number;
  /** 测试时间戳 */
  timestamp: Date;
}

/**
 * 错误测试结果
 */
export interface ErrorTestResult {
  /** 测试场景名称 */
  scenario: string;
  /** 是否通过测试 */
  passed: boolean;
  /** 期望的HTTP状态码 */
  expectedStatus: number;
  /** 实际的HTTP状态码 */
  actualStatus: number;
  /** 是否包含错误消息 */
  hasErrorMessage: boolean;
  /** 错误详情 */
  details?: string;
  /** 测试时间戳 */
  timestamp: Date;
}

/**
 * 速率限制测试结果
 */
export interface RateLimitTestResult {
  /** 端点URL */
  endpoint: string;
  /** 速率限制阈值 */
  limit: number;
  /** 发送的请求数 */
  requestsSent: number;
  /** 被限制的请求数 */
  rateLimitedCount: number;
  /** 速率限制是否生效 */
  rateLimitWorking: boolean;
  /** 是否包含Retry-After响应头 */
  hasRetryAfter: boolean;
  /** 测试时间戳 */
  timestamp: Date;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 端点URL */
  endpoint: string;
  /** 测试迭代次数 */
  iterations: number;
  /** 平均响应时间(毫秒) */
  avg: number;
  /** 最小响应时间(毫秒) */
  min: number;
  /** 最大响应时间(毫秒) */
  max: number;
  /** P95响应时间(毫秒) */
  p95: number;
  /** P99响应时间(毫秒) */
  p99: number;
  /** 是否存在性能问题(>5秒) */
  hasPerformanceIssue: boolean;
  /** 测试时间戳 */
  timestamp: Date;
}

/**
 * 客户端API健康状态
 */
export interface ClientAPIHealth {
  /** API名称 */
  name: string;
  /** 是否可用 */
  available: boolean;
  /** 是否为单例 */
  isSingleton: boolean;
  /** 缺失的方法列表 */
  missingMethods: string[];
  /** 类型定义是否完整 */
  hasTypeDefinitions: boolean;
  /** 错误信息(如果有) */
  error?: string;
  /** 检查时间戳 */
  timestamp: Date;
}
