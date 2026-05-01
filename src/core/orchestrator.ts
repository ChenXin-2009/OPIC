/**
 * 审查编排器
 * 负责协调所有审查任务的执行，管理并发和依赖关系
 */

import { ConfigManager } from './config';
import { HealthChecker } from '../validators/health-checker';
import { DataSourceValidator } from '../validators/data-source-validator';
import { CacheValidator } from '../validators/cache-validator';
import { ErrorValidator } from '../validators/error-validator';
import { RateLimitValidator } from '../validators/rate-limit-validator';
import { PerformanceMonitor } from '../validators/performance-monitor';
import { ClientAPIValidator } from '../validators/client-api-validator';
import { ReportGenerator } from '../reporters/report-generator';
import { JSONReporter } from '../reporters/json-reporter';
import { MarkdownReporter } from '../reporters/markdown-reporter';
import { ConcurrencyController } from '../utils/concurrency-controller';
import {
  AuditResults,
  AuditReport,
} from '../models/audit-results';
import {
  EndpointHealth,
  DataSourceHealth,
  CacheTestResult,
  ErrorTestResult,
  RateLimitTestResult,
  PerformanceMetrics,
  ClientAPIHealth,
} from '../models/health-models';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 审查目标类型
 */
export type AuditTarget = 
  | 'health' 
  | 'dataSources' 
  | 'cache' 
  | 'errors' 
  | 'rateLimit' 
  | 'performance' 
  | 'clientAPIs';

/**
 * 审查历史记录
 */
interface AuditHistoryEntry {
  timestamp: Date;
  healthScore: number;
  duration: number;
  issueCount: number;
}

/**
 * 审查编排器类
 */
export class AuditOrchestrator {
  private configManager: ConfigManager;
  private healthChecker: HealthChecker;
  private dataSourceValidator: DataSourceValidator;
  private cacheValidator: CacheValidator;
  private errorValidator: ErrorValidator;
  private rateLimitValidator: RateLimitValidator;
  private performanceMonitor: PerformanceMonitor;
  private clientAPIValidator: ClientAPIValidator;
  private reportGenerator: ReportGenerator;
  private jsonReporter: JSONReporter;
  private markdownReporter: MarkdownReporter;
  private concurrencyController: ConcurrencyController;
  private auditHistory: AuditHistoryEntry[] = [];

  constructor(configPath?: string) {
    // 初始化配置管理器
    this.configManager = new ConfigManager(configPath);
    this.configManager.applyEnvironmentOverrides();

    const config = this.configManager.getAuditConfig();

    // 初始化并发控制器
    this.concurrencyController = new ConcurrencyController(config.concurrency);

    // 初始化所有验证器
    this.healthChecker = new HealthChecker(config.timeout, config.retries);
    this.dataSourceValidator = new DataSourceValidator(config.timeout, config.retries);
    this.cacheValidator = new CacheValidator(config.timeout);
    this.errorValidator = new ErrorValidator(config.timeout);
    this.rateLimitValidator = new RateLimitValidator(config.timeout);
    this.performanceMonitor = new PerformanceMonitor(
      config.performanceThreshold,
      config.performanceIterations
    );
    this.clientAPIValidator = new ClientAPIValidator();

    // 初始化报告生成器和报告器
    this.reportGenerator = new ReportGenerator();
    this.jsonReporter = new JSONReporter();
    this.markdownReporter = new MarkdownReporter();

    // 加载审查历史
    this.loadAuditHistory();
  }

  /**
   * 18.1 执行完整审查流程
   */
  public async runFullAudit(): Promise<AuditReport> {
    const startTime = Date.now();
    console.log('开始执行完整API审查...');

    const config = this.configManager.getAuditConfig();
    const enabledChecks = config.enabledChecks;

    // 收集所有审查结果
    const results: AuditResults = {
      endpoints: [],
      dataSources: [],
      cache: [],
      errors: [],
      rateLimit: {} as RateLimitTestResult,
      performance: [],
      clientAPIs: [],
      timestamp: new Date(),
    };

    // 按顺序执行各项审查任务
    try {
      // 1. 健康检查
      if (enabledChecks.health) {
        console.log('执行健康检查...');
        results.endpoints = await this.runHealthCheck();
      }

      // 2. 数据源验证
      if (enabledChecks.dataSources) {
        console.log('执行数据源验证...');
        results.dataSources = await this.runDataSourceValidation();
      }

      // 3. 缓存验证
      if (enabledChecks.cache) {
        console.log('执行缓存验证...');
        results.cache = await this.runCacheValidation();
      }

      // 4. 错误处理验证
      if (enabledChecks.errors) {
        console.log('执行错误处理验证...');
        results.errors = await this.runErrorValidation();
      }

      // 5. 速率限制验证
      if (enabledChecks.rateLimit) {
        console.log('执行速率限制验证...');
        results.rateLimit = await this.runRateLimitValidation();
      }

      // 6. 性能监控
      if (enabledChecks.performance) {
        console.log('执行性能监控...');
        results.performance = await this.runPerformanceMonitoring();
      }

      // 7. 客户端API验证
      if (enabledChecks.clientAPIs) {
        console.log('执行客户端API验证...');
        results.clientAPIs = await this.runClientAPIValidation();
      }

      // 生成报告
      console.log('生成审查报告...');
      const report = this.reportGenerator.generateReport(results);

      // 导出报告
      await this.exportReports(report);

      // 记录审查历史
      const duration = Date.now() - startTime;
      this.recordAuditHistory(report, duration);

      console.log(`审查完成！耗时: ${(duration / 1000).toFixed(2)}秒`);
      console.log(`整体健康评分: ${report.healthScore}/100`);
      console.log(`发现问题: ${report.issues.length}个`);

      return report;
    } catch (error) {
      console.error('审查执行失败:', error);
      throw error;
    }
  }

  /**
   * 18.2 执行选择性审查
   */
  public async runSelectiveAudit(targets: AuditTarget[]): Promise<AuditReport> {
    const startTime = Date.now();
    console.log(`开始执行选择性审查: ${targets.join(', ')}`);

    const results: AuditResults = {
      endpoints: [],
      dataSources: [],
      cache: [],
      errors: [],
      rateLimit: {} as RateLimitTestResult,
      performance: [],
      clientAPIs: [],
      timestamp: new Date(),
    };

    try {
      for (const target of targets) {
        switch (target) {
          case 'health':
            console.log('执行健康检查...');
            results.endpoints = await this.runHealthCheck();
            break;
          case 'dataSources':
            console.log('执行数据源验证...');
            results.dataSources = await this.runDataSourceValidation();
            break;
          case 'cache':
            console.log('执行缓存验证...');
            results.cache = await this.runCacheValidation();
            break;
          case 'errors':
            console.log('执行错误处理验证...');
            results.errors = await this.runErrorValidation();
            break;
          case 'rateLimit':
            console.log('执行速率限制验证...');
            results.rateLimit = await this.runRateLimitValidation();
            break;
          case 'performance':
            console.log('执行性能监控...');
            results.performance = await this.runPerformanceMonitoring();
            break;
          case 'clientAPIs':
            console.log('执行客户端API验证...');
            results.clientAPIs = await this.runClientAPIValidation();
            break;
        }
      }

      const report = this.reportGenerator.generateReport(results);
      await this.exportReports(report);

      const duration = Date.now() - startTime;
      console.log(`选择性审查完成！耗时: ${(duration / 1000).toFixed(2)}秒`);

      return report;
    } catch (error) {
      console.error('选择性审查执行失败:', error);
      throw error;
    }
  }

  /**
   * 执行健康检查
   */
  private async runHealthCheck(): Promise<EndpointHealth[]> {
    const endpoints = this.configManager.getEndpoints();
    
    if (endpoints.length === 0) {
      console.warn('未配置端点，跳过健康检查');
      return [];
    }

    const tasks = endpoints.map(endpoint => 
      () => this.healthChecker.checkEndpoint(endpoint.path)
    );

    return await this.concurrencyController.runWithLimit(tasks);
  }

  /**
   * 执行数据源验证
   */
  private async runDataSourceValidation(): Promise<DataSourceHealth[]> {
    const dataSources = this.configManager.getDataSources();
    
    if (dataSources.length === 0) {
      console.warn('未配置数据源，跳过数据源验证');
      return [];
    }

    const tasks = dataSources.map(ds => 
      () => this.dataSourceValidator.validateDataSource(ds)
    );

    return await this.concurrencyController.runWithLimit(tasks);
  }

  /**
   * 执行缓存验证
   */
  private async runCacheValidation(): Promise<CacheTestResult[]> {
    const endpoints = this.configManager.getEndpoints()
      .filter(e => e.cacheTTL && e.cacheTTL > 0);
    
    if (endpoints.length === 0) {
      console.warn('未配置缓存端点，跳过缓存验证');
      return [];
    }

    const tasks = endpoints.map(endpoint => 
      () => this.cacheValidator.testCacheHit(endpoint.path)
    );

    return await this.concurrencyController.runWithLimit(tasks);
  }

  /**
   * 执行错误处理验证
   */
  private async runErrorValidation(): Promise<ErrorTestResult[]> {
    const endpoints = this.configManager.getEndpoints();
    
    if (endpoints.length === 0) {
      console.warn('未配置端点，跳过错误处理验证');
      return [];
    }

    // 为每个端点测试常见错误场景
    const results: ErrorTestResult[] = [];
    
    for (const endpoint of endpoints.slice(0, 3)) { // 限制测试数量
      const scenarios = await this.errorValidator.testAllScenarios(endpoint.path);
      results.push(...scenarios);
    }

    return results;
  }

  /**
   * 执行速率限制验证
   */
  private async runRateLimitValidation(): Promise<RateLimitTestResult> {
    const endpoints = this.configManager.getEndpoints()
      .filter(e => e.rateLimit);
    
    if (endpoints.length === 0) {
      console.warn('未配置速率限制端点，跳过速率限制验证');
      return {
        endpoint: 'N/A',
        limit: 0,
        requestsSent: 0,
        rateLimitedCount: 0,
        rateLimitWorking: false,
        hasRetryAfter: false,
        timestamp: new Date(),
      };
    }

    // 测试第一个配置了速率限制的端点
    const endpoint = endpoints[0];
    return await this.rateLimitValidator.testRateLimit(
      endpoint.path,
      endpoint.rateLimit!.requests
    );
  }

  /**
   * 执行性能监控
   */
  private async runPerformanceMonitoring(): Promise<PerformanceMetrics[]> {
    const endpoints = this.configManager.getEndpoints();
    
    if (endpoints.length === 0) {
      console.warn('未配置端点，跳过性能监控');
      return [];
    }

    // 限制性能测试的端点数量，避免过长时间
    const testEndpoints = endpoints.slice(0, 5);
    
    const tasks = testEndpoints.map(endpoint => 
      () => this.performanceMonitor.measurePerformance(endpoint.path)
    );

    return await this.concurrencyController.runWithLimit(tasks);
  }

  /**
   * 执行客户端API验证
   */
  private async runClientAPIValidation(): Promise<ClientAPIHealth[]> {
    return await this.clientAPIValidator.validateAllAPIs();
  }

  /**
   * 导出报告
   */
  private async exportReports(report: AuditReport): Promise<void> {
    const config = this.configManager.getAuditConfig();
    const outputPath = config.outputPath;

    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // 根据配置导出不同格式的报告
    for (const format of config.reportFormat) {
      if (format === 'json') {
        const jsonPath = this.jsonReporter.generateFileName(outputPath);
        this.jsonReporter.exportReport(report, jsonPath);
      } else if (format === 'markdown') {
        const mdPath = this.markdownReporter.generateFileName(outputPath);
        this.markdownReporter.exportReport(report, mdPath);
      }
    }
  }

  /**
   * 18.4 记录审查历史
   */
  private recordAuditHistory(report: AuditReport, duration: number): void {
    const entry: AuditHistoryEntry = {
      timestamp: report.timestamp,
      healthScore: report.healthScore,
      duration,
      issueCount: report.issues.length,
    };

    this.auditHistory.push(entry);

    // 保存历史记录到文件
    this.saveAuditHistory();
  }

  /**
   * 保存审查历史到文件
   */
  private saveAuditHistory(): void {
    try {
      const config = this.configManager.getAuditConfig();
      const historyPath = path.join(config.outputPath, 'audit-history.json');
      
      fs.writeFileSync(
        historyPath,
        JSON.stringify(this.auditHistory, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('保存审查历史失败:', error);
    }
  }

  /**
   * 加载审查历史
   */
  private loadAuditHistory(): void {
    try {
      const config = this.configManager.getAuditConfig();
      const historyPath = path.join(config.outputPath, 'audit-history.json');
      
      if (fs.existsSync(historyPath)) {
        const content = fs.readFileSync(historyPath, 'utf-8');
        this.auditHistory = JSON.parse(content);
      }
    } catch (error) {
      console.warn('加载审查历史失败:', error);
      this.auditHistory = [];
    }
  }

  /**
   * 获取审查历史
   */
  public getAuditHistory(): AuditHistoryEntry[] {
    return this.auditHistory;
  }

  /**
   * 获取审查趋势数据
   */
  public getAuditTrends(): {
    healthScoreTrend: number[];
    issueCountTrend: number[];
    durationTrend: number[];
  } {
    return {
      healthScoreTrend: this.auditHistory.map(e => e.healthScore),
      issueCountTrend: this.auditHistory.map(e => e.issueCount),
      durationTrend: this.auditHistory.map(e => e.duration),
    };
  }

  /**
   * 获取配置管理器
   */
  public getConfigManager(): ConfigManager {
    return this.configManager;
  }
}
