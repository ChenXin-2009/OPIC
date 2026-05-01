/**
 * 报告生成器
 * 负责汇总审查结果、计算健康评分、分类问题并生成审查报告
 */

import {
  AuditResults,
  AuditReport,
  AuditSummary,
  Issue,
  IssueSeverity,
} from '../models/audit-results';

/**
 * 报告生成器类
 */
export class ReportGenerator {
  private readonly version = '1.0.0';

  /**
   * 生成完整的审查报告
   */
  public generateReport(results: AuditResults): AuditReport {
    // 12.1 计算健康评分
    const healthScore = this.calculateHealthScore(results);

    // 12.3 生成报告摘要
    const summary = this.generateSummary(results);

    // 12.2 分类和汇总问题
    const issues = this.categorizeIssues(results);

    // 生成改进建议
    const recommendations = this.generateRecommendations(issues);

    return {
      version: this.version,
      timestamp: new Date(),
      healthScore,
      summary,
      results,
      issues,
      recommendations,
    };
  }

  /**
   * 12.1 计算健康评分算法
   * 总分100分，按以下权重分配：
   * - HTTP端点健康: 30分
   * - 数据源健康: 25分
   * - 缓存机制: 15分
   * - 错误处理: 10分
   * - 速率限制: 10分
   * - 性能: 10分
   */
  public calculateHealthScore(results: AuditResults): number {
    let score = 100;

    // HTTP端点健康 (30分)
    if (results.endpoints.length > 0) {
      const unhealthyEndpoints = results.endpoints.filter(e => !e.healthy).length;
      const endpointHealthRatio = 1 - (unhealthyEndpoints / results.endpoints.length);
      score -= (1 - endpointHealthRatio) * 30;
    }

    // 数据源健康 (25分)
    if (results.dataSources.length > 0) {
      const unavailableDataSources = results.dataSources.filter(d => !d.available).length;
      const dataSourceHealthRatio = 1 - (unavailableDataSources / results.dataSources.length);
      score -= (1 - dataSourceHealthRatio) * 25;
    }

    // 缓存机制 (15分)
    if (results.cache.length > 0) {
      const cacheFailed = results.cache.filter(c => !c.cacheHit).length;
      const cacheSuccessRatio = 1 - (cacheFailed / results.cache.length);
      score -= (1 - cacheSuccessRatio) * 15;
    }

    // 错误处理 (10分)
    if (results.errors.length > 0) {
      const errorHandlingIssues = results.errors.filter(e => !e.passed).length;
      const errorHandlingRatio = 1 - (errorHandlingIssues / results.errors.length);
      score -= (1 - errorHandlingRatio) * 10;
    }

    // 速率限制 (10分)
    if (!results.rateLimit.rateLimitWorking) {
      score -= 10;
    }

    // 性能 (10分)
    if (results.performance.length > 0) {
      const performanceIssues = results.performance.filter(p => p.hasPerformanceIssue).length;
      const performanceRatio = 1 - (performanceIssues / results.performance.length);
      score -= (1 - performanceRatio) * 10;
    }

    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 12.3 生成报告摘要
   */
  private generateSummary(results: AuditResults): AuditSummary {
    // 计算健康端点数
    const healthyEndpoints = results.endpoints.filter(e => e.healthy).length;

    // 计算可用数据源数
    const availableDataSources = results.dataSources.filter(d => d.available).length;

    // 计算缓存命中率
    const cacheHits = results.cache.filter(c => c.cacheHit).length;
    const cacheHitRate = results.cache.length > 0 
      ? (cacheHits / results.cache.length) * 100 
      : 0;

    // 计算平均响应时间
    const totalResponseTime = results.endpoints.reduce((sum, e) => sum + e.responseTime, 0);
    const avgResponseTime = results.endpoints.length > 0 
      ? totalResponseTime / results.endpoints.length 
      : 0;

    return {
      totalEndpoints: results.endpoints.length,
      healthyEndpoints,
      totalDataSources: results.dataSources.length,
      availableDataSources,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    };
  }

  /**
   * 12.2 问题分类和汇总
   */
  public categorizeIssues(results: AuditResults): Issue[] {
    const issues: Issue[] = [];

    // 分析HTTP端点问题
    issues.push(...this.analyzeEndpointIssues(results.endpoints));

    // 分析数据源问题
    issues.push(...this.analyzeDataSourceIssues(results.dataSources));

    // 分析缓存问题
    issues.push(...this.analyzeCacheIssues(results.cache));

    // 分析错误处理问题
    issues.push(...this.analyzeErrorHandlingIssues(results.errors));

    // 分析速率限制问题
    issues.push(...this.analyzeRateLimitIssues(results.rateLimit));

    // 分析性能问题
    issues.push(...this.analyzePerformanceIssues(results.performance));

    // 分析客户端API问题
    issues.push(...this.analyzeClientAPIIssues(results.clientAPIs));

    // 按严重程度排序
    return this.sortIssuesBySeverity(issues);
  }

  /**
   * 分析HTTP端点问题
   */
  private analyzeEndpointIssues(endpoints: AuditResults['endpoints']): Issue[] {
    const issues: Issue[] = [];

    for (const endpoint of endpoints) {
      if (!endpoint.healthy) {
        const severity = this.determineEndpointSeverity(endpoint.status);
        issues.push({
          severity,
          category: 'HTTP端点',
          description: `端点 ${endpoint.url} 不健康 (状态码: ${endpoint.status})`,
          affectedComponent: endpoint.url,
          recommendation: this.getEndpointRecommendation(endpoint.status),
        });
      }
    }

    return issues;
  }

  /**
   * 分析数据源问题
   */
  private analyzeDataSourceIssues(dataSources: AuditResults['dataSources']): Issue[] {
    const issues: Issue[] = [];

    for (const dataSource of dataSources) {
      if (!dataSource.available) {
        issues.push({
          severity: 'high',
          category: '数据源',
          description: `数据源 ${dataSource.source} 不可用`,
          affectedComponent: dataSource.source,
          recommendation: '检查数据源URL和网络连接，确认数据源服务是否正常运行',
        });
      } else if (dataSource.quality && dataSource.quality.score < 70) {
        issues.push({
          severity: 'medium',
          category: '数据质量',
          description: `数据源 ${dataSource.source} 数据质量较低 (评分: ${dataSource.quality.score})`,
          affectedComponent: dataSource.source,
          recommendation: `数据质量问题: ${dataSource.quality.issues.join(', ')}`,
        });
      }
    }

    return issues;
  }

  /**
   * 分析缓存问题
   */
  private analyzeCacheIssues(cache: AuditResults['cache']): Issue[] {
    const issues: Issue[] = [];

    for (const cacheTest of cache) {
      if (!cacheTest.cacheHit) {
        issues.push({
          severity: 'medium',
          category: '缓存机制',
          description: `端点 ${cacheTest.endpoint} 缓存未命中`,
          affectedComponent: cacheTest.endpoint,
          recommendation: '检查缓存配置和缓存键策略，确保缓存正常工作',
        });
      } else if (cacheTest.improvementPercent < 30) {
        issues.push({
          severity: 'low',
          category: '缓存性能',
          description: `端点 ${cacheTest.endpoint} 缓存性能改善不明显 (${cacheTest.improvementPercent.toFixed(1)}%)`,
          affectedComponent: cacheTest.endpoint,
          recommendation: '考虑优化缓存策略或增加缓存TTL',
        });
      }
    }

    return issues;
  }

  /**
   * 分析错误处理问题
   */
  private analyzeErrorHandlingIssues(errors: AuditResults['errors']): Issue[] {
    const issues: Issue[] = [];

    for (const errorTest of errors) {
      if (!errorTest.passed) {
        issues.push({
          severity: 'high',
          category: '错误处理',
          description: `错误场景 "${errorTest.scenario}" 处理不当`,
          affectedComponent: errorTest.scenario,
          recommendation: `期望状态码 ${errorTest.expectedStatus}，实际状态码 ${errorTest.actualStatus}。请检查错误处理逻辑`,
        });
      }
    }

    return issues;
  }

  /**
   * 分析速率限制问题
   */
  private analyzeRateLimitIssues(rateLimit: AuditResults['rateLimit']): Issue[] {
    const issues: Issue[] = [];

    if (!rateLimit.rateLimitWorking) {
      issues.push({
        severity: 'critical',
        category: '速率限制',
        description: `端点 ${rateLimit.endpoint} 速率限制未生效`,
        affectedComponent: rateLimit.endpoint,
        recommendation: '立即启用速率限制以防止API滥用和DDoS攻击',
      });
    }

    if (rateLimit.rateLimitWorking && !rateLimit.hasRetryAfter) {
      issues.push({
        severity: 'medium',
        category: '速率限制',
        description: `端点 ${rateLimit.endpoint} 缺少Retry-After响应头`,
        affectedComponent: rateLimit.endpoint,
        recommendation: '在429响应中添加Retry-After头，帮助客户端正确处理速率限制',
      });
    }

    return issues;
  }

  /**
   * 分析性能问题
   */
  private analyzePerformanceIssues(performance: AuditResults['performance']): Issue[] {
    const issues: Issue[] = [];

    for (const perfMetric of performance) {
      if (perfMetric.hasPerformanceIssue) {
        issues.push({
          severity: 'high',
          category: '性能',
          description: `端点 ${perfMetric.endpoint} 响应时间过长 (平均: ${perfMetric.avg.toFixed(0)}ms)`,
          affectedComponent: perfMetric.endpoint,
          recommendation: '优化查询逻辑、增加缓存或考虑使用CDN',
        });
      } else if (perfMetric.p95 > 3000) {
        issues.push({
          severity: 'medium',
          category: '性能',
          description: `端点 ${perfMetric.endpoint} P95响应时间较高 (${perfMetric.p95.toFixed(0)}ms)`,
          affectedComponent: perfMetric.endpoint,
          recommendation: '关注高百分位响应时间，优化慢查询',
        });
      }
    }

    return issues;
  }

  /**
   * 分析客户端API问题
   */
  private analyzeClientAPIIssues(clientAPIs: AuditResults['clientAPIs']): Issue[] {
    const issues: Issue[] = [];

    for (const api of clientAPIs) {
      if (!api.available) {
        issues.push({
          severity: 'critical',
          category: '客户端API',
          description: `客户端API ${api.name} 不可用`,
          affectedComponent: api.name,
          recommendation: '检查API模块导出和路径配置',
        });
      } else {
        if (!api.isSingleton) {
          issues.push({
            severity: 'medium',
            category: '客户端API',
            description: `客户端API ${api.name} 未实现单例模式`,
            affectedComponent: api.name,
            recommendation: '实现单例模式以确保API实例唯一性',
          });
        }

        if (api.missingMethods.length > 0) {
          issues.push({
            severity: 'high',
            category: '客户端API',
            description: `客户端API ${api.name} 缺少方法: ${api.missingMethods.join(', ')}`,
            affectedComponent: api.name,
            recommendation: '实现缺失的API方法以保证功能完整性',
          });
        }

        if (!api.hasTypeDefinitions) {
          issues.push({
            severity: 'low',
            category: '客户端API',
            description: `客户端API ${api.name} 缺少类型定义`,
            affectedComponent: api.name,
            recommendation: '添加TypeScript类型定义以提高代码质量',
          });
        }
      }
    }

    return issues;
  }

  /**
   * 确定端点问题严重程度
   */
  private determineEndpointSeverity(status: number): IssueSeverity {
    if (status === 0) return 'critical'; // 网络错误
    if (status >= 500) return 'critical'; // 服务器错误
    if (status === 404) return 'high'; // 未找到
    if (status >= 400) return 'medium'; // 客户端错误
    return 'low';
  }

  /**
   * 获取端点问题建议
   */
  private getEndpointRecommendation(status: number): string {
    if (status === 0) return '检查网络连接和服务器可用性';
    if (status >= 500) return '检查服务器日志，修复内部错误';
    if (status === 404) return '检查路由配置，确保端点路径正确';
    if (status === 429) return '调整速率限制配置或增加服务器容量';
    if (status >= 400) return '检查请求参数和认证配置';
    return '检查端点配置和实现';
  }

  /**
   * 按严重程度排序问题
   */
  private sortIssuesBySeverity(issues: Issue[]): Issue[] {
    const severityOrder: Record<IssueSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(issues: Issue[]): string[] {
    const recommendations: string[] = [];

    // 统计各类问题数量
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;

    // 根据问题严重程度生成建议
    if (criticalCount > 0) {
      recommendations.push(`立即处理 ${criticalCount} 个严重问题，这些问题可能影响系统稳定性`);
    }

    if (highCount > 0) {
      recommendations.push(`优先处理 ${highCount} 个高优先级问题，以提升系统可靠性`);
    }

    // 按类别统计问题
    const categoryCount = new Map<string, number>();
    for (const issue of issues) {
      categoryCount.set(issue.category, (categoryCount.get(issue.category) || 0) + 1);
    }

    // 找出问题最多的类别
    const sortedCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
      const [topCategory, count] = sortedCategories[0];
      recommendations.push(`重点关注 ${topCategory} 类别，共有 ${count} 个问题`);
    }

    // 通用建议
    if (issues.length === 0) {
      recommendations.push('系统整体健康状况良好，继续保持');
    } else {
      recommendations.push('定期执行API审查，持续监控系统健康状况');
      recommendations.push('建立自动化监控和告警机制');
    }

    return recommendations;
  }
}
