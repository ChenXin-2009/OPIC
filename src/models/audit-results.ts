/**
 * 审查结果数据模型
 * 定义API审查系统的审查结果和报告结构
 */

import {
  EndpointHealth,
  DataSourceHealth,
  CacheTestResult,
  ErrorTestResult,
  RateLimitTestResult,
  PerformanceMetrics,
  ClientAPIHealth,
} from './health-models';

/**
 * 审查结果汇总
 */
export interface AuditResults {
  /** HTTP端点健康状态列表 */
  endpoints: EndpointHealth[];
  /** 数据源健康状态列表 */
  dataSources: DataSourceHealth[];
  /** 缓存测试结果列表 */
  cache: CacheTestResult[];
  /** 错误处理测试结果列表 */
  errors: ErrorTestResult[];
  /** 速率限制测试结果 */
  rateLimit: RateLimitTestResult;
  /** 性能指标列表 */
  performance: PerformanceMetrics[];
  /** 客户端API健康状态列表 */
  clientAPIs: ClientAPIHealth[];
  /** 审查时间戳 */
  timestamp: Date;
}

/**
 * 问题严重程度
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * 问题定义
 */
export interface Issue {
  /** 严重程度 */
  severity: IssueSeverity;
  /** 问题类别 */
  category: string;
  /** 问题描述 */
  description: string;
  /** 受影响的组件 */
  affectedComponent: string;
  /** 改进建议 */
  recommendation: string;
}

/**
 * 审查报告摘要
 */
export interface AuditSummary {
  /** 总端点数 */
  totalEndpoints: number;
  /** 健康端点数 */
  healthyEndpoints: number;
  /** 总数据源数 */
  totalDataSources: number;
  /** 可用数据源数 */
  availableDataSources: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 平均响应时间(毫秒) */
  avgResponseTime: number;
}

/**
 * 审查报告
 */
export interface AuditReport {
  /** 报告版本 */
  version: string;
  /** 报告生成时间戳 */
  timestamp: Date;
  /** 整体健康评分(0-100) */
  healthScore: number;
  /** 执行摘要 */
  summary: AuditSummary;
  /** 详细审查结果 */
  results: AuditResults;
  /** 问题列表 */
  issues: Issue[];
  /** 改进建议列表 */
  recommendations: string[];
}
