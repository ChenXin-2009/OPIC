/**
 * Markdown报告器
 * 负责将审查报告导出为Markdown格式
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditReport } from '../models/audit-results';

/**
 * Markdown报告器类
 */
export class MarkdownReporter {
  /**
   * 14.1 将审查报告导出为Markdown格式
   */
  public exportReport(report: AuditReport, outputPath?: string): string {
    const sections: string[] = [];

    // 标题和元数据
    sections.push(this.generateHeader(report));

    // 执行摘要
    sections.push(this.generateExecutiveSummary(report));

    // HTTP API端点状态
    sections.push(this.generateEndpointsSection(report));

    // 外部数据源状态
    sections.push(this.generateDataSourcesSection(report));

    // 缓存机制评估
    sections.push(this.generateCacheSection(report));

    // 错误处理评估
    sections.push(this.generateErrorHandlingSection(report));

    // 速率限制评估
    sections.push(this.generateRateLimitSection(report));

    // 性能指标
    sections.push(this.generatePerformanceSection(report));

    // 客户端API状态
    sections.push(this.generateClientAPISection(report));

    // 问题列表和建议
    sections.push(this.generateIssuesSection(report));

    // 改进建议
    sections.push(this.generateRecommendationsSection(report));

    const markdownContent = sections.join('\n\n');

    // 如果指定了输出路径，保存到文件
    if (outputPath) {
      this.saveToFile(markdownContent, outputPath);
    }

    return markdownContent;
  }

  /**
   * 生成报告头部
   */
  private generateHeader(report: AuditReport): string {
    return `# API审查报告

**版本**: ${report.version}  
**生成时间**: ${report.timestamp.toLocaleString('zh-CN')}  
**整体健康评分**: ${report.healthScore}/100 ${this.getHealthEmoji(report.healthScore)}`;
  }

  /**
   * 生成执行摘要
   */
  private generateExecutiveSummary(report: AuditReport): string {
    const { summary } = report;
    
    return `## 执行摘要

| 指标 | 数值 |
|------|------|
| HTTP端点总数 | ${summary.totalEndpoints} |
| 健康端点数 | ${summary.healthyEndpoints} (${this.calculatePercentage(summary.healthyEndpoints, summary.totalEndpoints)}%) |
| 数据源总数 | ${summary.totalDataSources} |
| 可用数据源数 | ${summary.availableDataSources} (${this.calculatePercentage(summary.availableDataSources, summary.totalDataSources)}%) |
| 缓存命中率 | ${summary.cacheHitRate.toFixed(2)}% |
| 平均响应时间 | ${summary.avgResponseTime.toFixed(2)}ms |`;
  }

  /**
   * 生成HTTP端点状态章节
   */
  private generateEndpointsSection(report: AuditReport): string {
    const { endpoints } = report.results;
    
    let content = `## HTTP API端点状态\n\n`;
    content += `| 端点 | 状态 | 状态码 | 响应时间 |\n`;
    content += `|------|------|--------|----------|\n`;

    for (const endpoint of endpoints) {
      const status = endpoint.healthy ? '✅ 健康' : '❌ 不健康';
      const responseTime = `${endpoint.responseTime.toFixed(0)}ms`;
      content += `| ${endpoint.url} | ${status} | ${endpoint.status} | ${responseTime} |\n`;
    }

    return content;
  }

  /**
   * 生成数据源状态章节
   */
  private generateDataSourcesSection(report: AuditReport): string {
    const { dataSources } = report.results;
    
    let content = `## 外部数据源状态\n\n`;
    content += `| 数据源 | 状态 | 响应时间 | 记录数 | 质量评分 |\n`;
    content += `|--------|------|----------|--------|----------|\n`;

    for (const ds of dataSources) {
      const status = ds.available ? '✅ 可用' : '❌ 不可用';
      const responseTime = ds.responseTime ? `${ds.responseTime.toFixed(0)}ms` : 'N/A';
      const recordCount = ds.recordCount !== undefined ? ds.recordCount.toString() : 'N/A';
      const quality = ds.quality ? `${ds.quality.score}/100` : 'N/A';
      content += `| ${ds.source} | ${status} | ${responseTime} | ${recordCount} | ${quality} |\n`;
    }

    return content;
  }

  /**
   * 生成缓存机制评估章节
   */
  private generateCacheSection(report: AuditReport): string {
    const { cache } = report.results;
    
    let content = `## 缓存机制评估\n\n`;
    content += `| 端点 | 缓存命中 | 第一次请求 | 第二次请求 | 性能改善 |\n`;
    content += `|------|----------|------------|------------|----------|\n`;

    for (const c of cache) {
      const hit = c.cacheHit ? '✅ 是' : '❌ 否';
      const first = `${c.firstRequestTime.toFixed(0)}ms`;
      const second = `${c.secondRequestTime.toFixed(0)}ms`;
      const improvement = `${c.improvementPercent.toFixed(1)}%`;
      content += `| ${c.endpoint} | ${hit} | ${first} | ${second} | ${improvement} |\n`;
    }

    return content;
  }

  /**
   * 生成错误处理评估章节
   */
  private generateErrorHandlingSection(report: AuditReport): string {
    const { errors } = report.results;
    
    let content = `## 错误处理评估\n\n`;
    content += `| 场景 | 测试结果 | 期望状态码 | 实际状态码 | 错误消息 |\n`;
    content += `|------|----------|------------|------------|----------|\n`;

    for (const e of errors) {
      const result = e.passed ? '✅ 通过' : '❌ 失败';
      const hasMsg = e.hasErrorMessage ? '是' : '否';
      content += `| ${e.scenario} | ${result} | ${e.expectedStatus} | ${e.actualStatus} | ${hasMsg} |\n`;
    }

    return content;
  }

  /**
   * 生成速率限制评估章节
   */
  private generateRateLimitSection(report: AuditReport): string {
    const { rateLimit } = report.results;
    
    return `## 速率限制评估

| 指标 | 值 |
|------|-----|
| 端点 | ${rateLimit.endpoint} |
| 限制阈值 | ${rateLimit.limit}次/分钟 |
| 发送请求数 | ${rateLimit.requestsSent} |
| 被限制请求数 | ${rateLimit.rateLimitedCount} |
| 速率限制生效 | ${rateLimit.rateLimitWorking ? '✅ 是' : '❌ 否'} |
| Retry-After响应头 | ${rateLimit.hasRetryAfter ? '✅ 有' : '❌ 无'} |`;
  }

  /**
   * 生成性能指标章节
   */
  private generatePerformanceSection(report: AuditReport): string {
    const { performance } = report.results;
    
    let content = `## 性能指标\n\n`;
    content += `| 端点 | 平均 | 最小 | 最大 | P95 | P99 | 性能问题 |\n`;
    content += `|------|------|------|------|-----|-----|----------|\n`;

    for (const p of performance) {
      const issue = p.hasPerformanceIssue ? '⚠️ 是' : '✅ 否';
      content += `| ${p.endpoint} | ${p.avg.toFixed(0)}ms | ${p.min.toFixed(0)}ms | ${p.max.toFixed(0)}ms | ${p.p95.toFixed(0)}ms | ${p.p99.toFixed(0)}ms | ${issue} |\n`;
    }

    return content;
  }

  /**
   * 生成客户端API状态章节
   */
  private generateClientAPISection(report: AuditReport): string {
    const { clientAPIs } = report.results;
    
    let content = `## 客户端API状态\n\n`;
    content += `| API名称 | 可用性 | 单例模式 | 缺失方法 | 类型定义 |\n`;
    content += `|---------|--------|----------|----------|----------|\n`;

    for (const api of clientAPIs) {
      const available = api.available ? '✅ 可用' : '❌ 不可用';
      const singleton = api.isSingleton ? '✅ 是' : '❌ 否';
      const missing = api.missingMethods.length > 0 ? api.missingMethods.join(', ') : '无';
      const types = api.hasTypeDefinitions ? '✅ 有' : '❌ 无';
      content += `| ${api.name} | ${available} | ${singleton} | ${missing} | ${types} |\n`;
    }

    return content;
  }

  /**
   * 生成问题列表章节
   */
  private generateIssuesSection(report: AuditReport): string {
    const { issues } = report;
    
    let content = `## 问题列表\n\n`;
    
    if (issues.length === 0) {
      content += '✅ 未发现问题\n';
      return content;
    }

    // 按严重程度分组
    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const medium = issues.filter(i => i.severity === 'medium');
    const low = issues.filter(i => i.severity === 'low');

    if (critical.length > 0) {
      content += `### 🔴 严重问题 (${critical.length})\n\n`;
      content += this.formatIssueList(critical);
    }

    if (high.length > 0) {
      content += `### 🟠 高优先级问题 (${high.length})\n\n`;
      content += this.formatIssueList(high);
    }

    if (medium.length > 0) {
      content += `### 🟡 中等问题 (${medium.length})\n\n`;
      content += this.formatIssueList(medium);
    }

    if (low.length > 0) {
      content += `### 🟢 低优先级问题 (${low.length})\n\n`;
      content += this.formatIssueList(low);
    }

    return content;
  }

  /**
   * 格式化问题列表
   */
  private formatIssueList(issues: AuditReport['issues']): string {
    let content = '';
    
    for (const issue of issues) {
      content += `**[${issue.category}] ${issue.description}**\n`;
      content += `- 受影响组件: ${issue.affectedComponent}\n`;
      content += `- 建议: ${issue.recommendation}\n\n`;
    }

    return content;
  }

  /**
   * 生成改进建议章节
   */
  private generateRecommendationsSection(report: AuditReport): string {
    const { recommendations } = report;
    
    let content = `## 改进建议\n\n`;
    
    for (let i = 0; i < recommendations.length; i++) {
      content += `${i + 1}. ${recommendations[i]}\n`;
    }

    return content;
  }

  /**
   * 保存Markdown内容到文件
   */
  private saveToFile(content: string, outputPath: string): void {
    try {
      // 确保输出目录存在
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 写入文件
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(`Markdown报告已保存到: ${outputPath}`);
    } catch (error) {
      console.error('保存Markdown报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成默认的输出文件名
   */
  public generateFileName(basePath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audit-report-${timestamp}.md`;
    return path.join(basePath, fileName);
  }

  /**
   * 获取健康评分对应的emoji
   */
  private getHealthEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  /**
   * 计算百分比
   */
  private calculatePercentage(value: number, total: number): string {
    if (total === 0) return '0.00';
    return ((value / total) * 100).toFixed(2);
  }
}
