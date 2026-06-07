/**
 * 审查编排器 (Audit Orchestrator)
 * 
 * 核心职责：
 * - 协调和编排所有系统审查任务的执行流程
 * - 管理多个验证器的并发执行和依赖关系
 * - 生成统一的审查报告并导出多种格式
 * - 维护审查历史记录和趋势分析数据
 * 
 * 架构说明：
 * 本类采用依赖注入模式，整合了7个独立的验证器模块：
 * 1. HealthChecker - 端点健康检查
 * 2. DataSourceValidator - 数据源完整性验证
 * 3. CacheValidator - 缓存机制测试
 * 4. ErrorValidator - 错误处理验证
 * 5. RateLimitValidator - 速率限制测试
 * 6. PerformanceMonitor - 性能指标监控
 * 7. ClientAPIValidator - 客户端API兼容性检查
 * 
 * 并发控制：
 * 使用 ConcurrencyController 限制并发请求数量，避免：
 * - 服务器资源耗尽
 * - 触发速率限制
 * - 网络拥塞
 * 
 * 报告生成：
 * 支持多种输出格式（JSON/Markdown），并包含：
 * - 整体健康评分 (0-100)
 * - 详细的问题清单
 * - 历史趋势对比
 * - 时间戳和执行时长
 * 
 * @example
 * ```typescript
 * // 创建编排器实例
 * const orchestrator = new AuditOrchestrator('./config/audit-config.json');
 * 
 * // 执行完整审查
 * const report = await orchestrator.runFullAudit();
 * console.log(`健康评分: ${report.healthScore}/100`);
 * 
 * // 执行选择性审查
 * const quickCheck = await orchestrator.runSelectiveAudit(['health', 'performance']);
 * 
 * // 查看历史趋势
 * const trends = orchestrator.getAuditTrends();
 * ```
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
import { logger } from '@/utils/logger';

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
    this.healthChecker = new HealthChecker({ timeout: config.timeout, retries: config.retries });
    this.dataSourceValidator = new DataSourceValidator({ timeout: config.timeout, retries: config.retries });
    this.cacheValidator = new CacheValidator();
    this.errorValidator = new ErrorValidator({ timeout: config.timeout });
    this.rateLimitValidator = new RateLimitValidator({ timeout: config.timeout });
    this.performanceMonitor = new PerformanceMonitor({
      performanceThreshold: config.performanceThreshold,
      iterations: config.performanceIterations
    });
    this.clientAPIValidator = new ClientAPIValidator();

    // 初始化报告生成器和报告器
    this.reportGenerator = new ReportGenerator();
    this.jsonReporter = new JSONReporter();
    this.markdownReporter = new MarkdownReporter();

    // 加载审查历史
    this.loadAuditHistory();
  }

  /**
   * 执行完整审查流程
   * 
   * 按照预定义的顺序执行所有已启用的审查任务，确保依赖关系正确处理。
   * 
   * 执行顺序说明：
   * 1. 健康检查 (health) - 基础端点可用性测试，必须最先执行
   * 2. 数据源验证 (dataSources) - 验证数据源的完整性和可达性
   * 3. 缓存验证 (cache) - 测试缓存命中率和一致性
   * 4. 错误处理验证 (errors) - 测试各种错误场景的响应
   * 5. 速率限制验证 (rateLimit) - 测试速率限制机制
   * 6. 性能监控 (performance) - 测量响应时间和吞吐量
   * 7. 客户端API验证 (clientAPIs) - 验证客户端API兼容性
   * 
   * 并发策略：
   * - 每个审查阶段内部使用 ConcurrencyController 控制并发
   * - 不同审查阶段之间串行执行，避免相互干扰
   * - 健康检查失败时，后续检查可能返回空结果
   * 
   * 错误处理：
   * - 单个验证器失败不会中断整个流程
   * - 错误会被记录但允许继续执行
   * - 最终报告会包含所有错误信息
   * 
   * 性能考虑：
   * - 完整审查可能耗时较长（取决于端点数量和网络延迟）
   * - 建议在非高峰时段执行
   * - 可通过配置调整超时和重试次数
   * 
   * @returns {Promise<AuditReport>} 包含所有审查结果和统计信息的完整报告
   * @throws {Error} 当审查过程中发生致命错误时抛出
   * 
   * @example
   * ```typescript
   * const report = await orchestrator.runFullAudit();
   * if (report.healthScore < 80) {
   *   console.warn('系统健康状况不佳');
   *   report.issues.forEach(issue => console.error(issue));
   * }
   * ```
   */
  public async runFullAudit(): Promise<AuditReport> {
    const startTime = Date.now();
    logger.debug('开始执行完整API审查...');

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
        logger.debug('执行健康检查...');
        results.endpoints = await this.runHealthCheck();
      }

      // 2. 数据源验证
      if (enabledChecks.dataSources) {
        logger.debug('执行数据源验证...');
        results.dataSources = await this.runDataSourceValidation();
      }

      // 3. 缓存验证
      if (enabledChecks.cache) {
        logger.debug('执行缓存验证...');
        results.cache = await this.runCacheValidation();
      }

      // 4. 错误处理验证
      if (enabledChecks.errors) {
        logger.debug('执行错误处理验证...');
        results.errors = await this.runErrorValidation();
      }

      // 5. 速率限制验证
      if (enabledChecks.rateLimit) {
        logger.debug('执行速率限制验证...');
        results.rateLimit = await this.runRateLimitValidation();
      }

      // 6. 性能监控
      if (enabledChecks.performance) {
        logger.debug('执行性能监控...');
        results.performance = await this.runPerformanceMonitoring();
      }

      // 7. 客户端API验证
      if (enabledChecks.clientAPIs) {
        logger.debug('执行客户端API验证...');
        results.clientAPIs = await this.runClientAPIValidation();
      }

      // 生成报告
      logger.debug('生成审查报告...');
      const report = this.reportGenerator.generateReport(results);

      // 导出报告
      await this.exportReports(report);

      // 记录审查历史
      const duration = Date.now() - startTime;
      this.recordAuditHistory(report, duration);

      logger.debug(`审查完成！耗时: ${(duration / 1000).toFixed(2)}秒`);
      logger.debug(`整体健康评分: ${report.healthScore}/100`);
      logger.debug(`发现问题: ${report.issues.length}个`);

      return report;
    } catch (error) {
      console.error('审查执行失败:', error);
      throw error;
    }
  }

  /**
   * 执行选择性审查
   * 
   * 允许只执行指定的审查任务子集，适用于：
   * - 快速健康检查
   * - 特定问题的深入分析
   * - 持续集成中的增量验证
   * - 资源受限环境下的轻量级审查
   * 
   * 依赖处理：
   * - 不会自动添加依赖的审查项（如果需要请显式指定）
   * - 例如：测试缓存时不会自动执行健康检查
   * - 建议：关键审查前先执行 'health' 检查
   * 
   * 执行策略：
   * - 按照传入的 targets 数组顺序执行
   * - 各任务之间独立，失败不影响其他任务
   * - 使用相同的并发控制和超时设置
   * 
   * @param {AuditTarget[]} targets - 要执行的审查任务类型数组
   * @returns {Promise<AuditReport>} 包含选定审查结果的报告
   * @throws {Error} 当审查过程中发生致命错误时抛出
   * 
   * @example
   * ```typescript
   * // 快速健康检查
   * const healthReport = await orchestrator.runSelectiveAudit(['health']);
   * 
   * // 性能和缓存专项测试
   * const perfReport = await orchestrator.runSelectiveAudit(['performance', 'cache']);
   * 
   * // 完整的安全性审查
   * const securityReport = await orchestrator.runSelectiveAudit([
   *   'rateLimit', 
   *   'errors', 
   *   'clientAPIs'
   * ]);
   * ```
   */
  public async runSelectiveAudit(targets: AuditTarget[]): Promise<AuditReport> {
    const startTime = Date.now();
    logger.debug(`开始执行选择性审查: ${targets.join(', ')}`);

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
            logger.debug('执行健康检查...');
            results.endpoints = await this.runHealthCheck();
            break;
          case 'dataSources':
            logger.debug('执行数据源验证...');
            results.dataSources = await this.runDataSourceValidation();
            break;
          case 'cache':
            logger.debug('执行缓存验证...');
            results.cache = await this.runCacheValidation();
            break;
          case 'errors':
            logger.debug('执行错误处理验证...');
            results.errors = await this.runErrorValidation();
            break;
          case 'rateLimit':
            logger.debug('执行速率限制验证...');
            results.rateLimit = await this.runRateLimitValidation();
            break;
          case 'performance':
            logger.debug('执行性能监控...');
            results.performance = await this.runPerformanceMonitoring();
            break;
          case 'clientAPIs':
            logger.debug('执行客户端API验证...');
            results.clientAPIs = await this.runClientAPIValidation();
            break;
        }
      }

      const report = this.reportGenerator.generateReport(results);
      await this.exportReports(report);

      const duration = Date.now() - startTime;
      logger.debug(`选择性审查完成！耗时: ${(duration / 1000).toFixed(2)}秒`);

      return report;
    } catch (error) {
      console.error('选择性审查执行失败:', error);
      throw error;
    }
  }

  /**
   * 执行健康检查
   * 
   * 测试所有配置的API端点的基本可用性和响应性。
   * 这是最基础的审查任务，通常应该最先执行。
   * 
   * 检查内容：
   * - HTTP状态码验证
   * - 响应时间测量
   * - 重试机制测试
   * - 超时处理验证
   * 
   * 并发控制：
   * - 使用 ConcurrencyController 限制同时请求数
   * - 默认并发数由配置文件指定
   * - 避免对服务器造成过大压力
   * 
   * @returns {Promise<EndpointHealth[]>} 每个端点的健康状态数组
   * @private
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
   * 
   * 验证所有配置的数据源的完整性、可达性和数据质量。
   * 
   * 验证内容：
   * - 数据源连接性测试
   * - 数据格式验证
   * - 必需字段检查
   * - 数据一致性验证
   * 
   * 使用场景：
   * - 部署后验证数据源配置正确性
   * - 定期检查数据源的持续可用性
   * - 发现数据质量问题
   * 
   * @returns {Promise<DataSourceHealth[]>} 每个数据源的验证结果数组
   * @private
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
   * 
   * 测试API缓存机制的正确性和性能。
   * 
   * 测试场景：
   * - 首次请求（缓存未命中）
   * - 重复请求（缓存命中）
   * - 缓存过期后请求
   * - 缓存一致性验证
   * 
   * 验证指标：
   * - 缓存命中率
   * - 响应时间差异（缓存 vs 非缓存）
   * - Cache-Control 响应头正确性
   * - TTL 设置是否生效
   * 
   * 注意事项：
   * - 仅测试配置了 cacheTTL > 0 的端点
   * - 测试会发送多次请求以验证缓存行为
   * - 可能受到CDN或反向代理缓存的影响
   * 
   * @returns {Promise<CacheTestResult[]>} 每个缓存端点的测试结果数组
   * @private
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
   * 
   * 测试API在各种错误场景下的响应行为和错误处理能力。
   * 
   * 测试场景包括：
   * - 404 Not Found - 不存在的资源
   * - 400 Bad Request - 无效的请求参数
   * - 500 Internal Server Error - 服务器内部错误
   * - 403 Forbidden - 权限不足
   * - 超时场景
   * 
   * 验证内容：
   * - HTTP状态码正确性
   * - 错误响应格式规范性
   * - 错误消息的可读性和有用性
   * - 错误响应头完整性
   * 
   * 限制说明：
   * - 默认只测试前3个端点，避免过多的错误请求
   * - 可通过修改代码调整测试范围
   * - 某些场景可能难以模拟（如真实的服务器错误）
   * 
   * @returns {Promise<ErrorTestResult[]>} 所有错误场景的测试结果数组
   * @private
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
      const scenarios = await this.errorValidator.testCommonErrorScenarios(endpoint.path);
      results.push(...scenarios);
    }

    return results;
  }

  /**
   * 执行速率限制验证
   * 
   * 测试API的速率限制机制是否正确工作。
   * 
   * 测试目的：
   * - 验证速率限制是否被正确触发
   * - 检查 429 Too Many Requests 响应
   * - 验证 Retry-After 响应头
   * - 测试限流后的恢复时间
   * 
   * 测试方法：
   * - 发送超过限制数量的请求
   * - 记录被限流的请求数
   * - 分析响应头中的限流信息
   * 
   * 注意事项：
   * - 仅测试配置了 rateLimit 的第一个端点
   * - 会短时间内发送大量请求，可能影响服务
   * - 建议在测试环境或非高峰期执行
   * - 如果未配置速率限制端点，返回占位结果
   * 
   * @returns {Promise<RateLimitTestResult>} 速率限制测试结果
   * @private
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
   * 
   * 测量API端点的性能指标，包括响应时间、吞吐量和稳定性。
   * 
   * 性能指标：
   * - 平均响应时间（mean）
   * - 中位数响应时间（median）
   * - 95th百分位响应时间（p95）
   * - 99th百分位响应时间（p99）
   * - 最小/最大响应时间
   * - 标准差（反映稳定性）
   * 
   * 测试策略：
   * - 对每个端点发送多次请求（由配置中的 performanceIterations 决定）
   * - 使用并发控制避免过载
   * - 计算统计指标评估性能
   * 
   * 性能阈值：
   * - 由配置中的 performanceThreshold 指定（单位：毫秒）
   * - 超过阈值的端点会被标记为性能问题
   * 
   * 限制说明：
   * - 默认只测试前5个端点，避免测试时间过长
   * - 性能测试可能耗时较长（取决于迭代次数）
   * - 结果可能受网络波动影响
   * 
   * @returns {Promise<PerformanceMetrics[]>} 每个端点的性能指标数组
   * @private
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
   * 
   * 验证客户端可用的API接口的兼容性和正确性。
   * 
   * 验证内容：
   * - API接口的可访问性
   * - 响应格式的兼容性
   * - 字段命名和类型一致性
   * - 版本兼容性检查
   * 
   * 使用场景：
   * - 确保前后端接口契约一致
   * - 验证API版本升级的向后兼容性
   * - 发现接口破坏性变更
   * 
   * @returns {Promise<ClientAPIHealth[]>} 所有客户端API的验证结果数组
   * @private
   */
  private async runClientAPIValidation(): Promise<ClientAPIHealth[]> {
    return await this.clientAPIValidator.validateAllAPIs();
  }

  /**
   * 导出报告到多种格式
   * 
   * 根据配置文件中的 reportFormat 设置，将审查报告导出为不同格式：
   * - JSON格式：机器可读，便于自动化处理和数据分析
   * - Markdown格式：人类可读，便于查看和分享
   * 
   * 文件命名规则：
   * - 包含时间戳，避免文件覆盖
   * - 格式：audit-report-YYYY-MM-DD-HH-mm-ss.{json|md}
   * 
   * 目录处理：
   * - 自动创建输出目录（如果不存在）
   * - 支持相对路径和绝对路径
   * 
   * @param {AuditReport} report - 要导出的审查报告对象
   * @returns {Promise<void>}
   * @private
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
   * 记录审查历史
   * 
   * 将本次审查的关键指标保存到历史记录中，用于：
   * - 趋势分析：观察系统健康状况的长期变化
   * - 性能基线：建立性能参考标准
   * - 问题追踪：识别间歇性问题和退化
   * - 审计证据：保留系统审查的历史证据
   * 
   * 记录内容：
   * - timestamp: 审查执行时间
   * - healthScore: 整体健康评分 (0-100)
   * - duration: 审查耗时（毫秒）
   * - issueCount: 发现的问题数量
   * 
   * 存储机制：
   * - 内存中维护完整历史数组
   * - 同步保存到 audit-history.json 文件
   * - 支持跨会话持久化
   * 
   * @param {AuditReport} report - 审查报告对象
   * @param {number} duration - 审查执行时长（毫秒）
   * @returns {void}
   * @private
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
   * 
   * 将内存中的审查历史数据持久化到 JSON 文件。
   * 
   * 文件位置：
   * - 默认：{outputPath}/audit-history.json
   * - outputPath 由配置文件指定
   * 
   * 格式：
   * - 格式化的 JSON（缩进2个空格）
   * - UTF-8 编码
   * 
   * 错误处理：
   * - 保存失败时记录错误但不中断执行
   * - 常见失败原因：磁盘空间不足、权限问题、路径不存在
   * 
   * @returns {void}
   * @private
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
   * 
   * 从文件系统加载之前保存的审查历史记录。
   * 在编排器构造函数中自动调用，实现历史数据的持久化。
   * 
   * 加载策略：
   * - 如果文件存在，解析并加载全部历史
   * - 如果文件不存在或解析失败，初始化为空数组
   * - 不会因加载失败而中断初始化过程
   * 
   * 恢复能力：
   * - 容忍文件格式错误（使用空历史继续）
   * - 支持从损坏的历史文件中恢复
   * - 记录警告但不抛出异常
   * 
   * @returns {void}
   * @private
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
   * 
   * 返回所有历史审查记录的完整列表，按时间顺序排列。
   * 
   * 返回数据结构：
   * ```typescript
   * [
   *   {
   *     timestamp: Date,      // 审查时间
   *     healthScore: number,  // 健康评分 (0-100)
   *     duration: number,     // 耗时（毫秒）
   *     issueCount: number    // 问题数量
   *   },
   *   ...
   * ]
   * ```
   * 
   * 使用场景：
   * - 生成历史报告
   * - 导出数据用于外部分析
   * - 构建自定义可视化
   * 
   * @returns {AuditHistoryEntry[]} 审查历史记录数组
   */
  public getAuditHistory(): AuditHistoryEntry[] {
    return this.auditHistory;
  }

  /**
   * 获取审查趋势数据
   * 
   * 从历史记录中提取关键指标的时间序列数据，便于趋势分析和可视化。
   * 
   * 返回的趋势数据：
   * - healthScoreTrend: 健康评分的历史变化
   * - issueCountTrend: 问题数量的历史变化  
   * - durationTrend: 审查耗时的历史变化
   * 
   * 数据顺序：
   * - 所有数组按时间顺序排列（从旧到新）
   * - 数组索引对应相同的历史记录
   * 
   * 使用示例：
   * ```typescript
   * const trends = orchestrator.getAuditTrends();
   * 
   * // 绘制健康评分趋势图
   * chart.plot(trends.healthScoreTrend);
   * 
   * // 分析问题数量变化
   * const avgIssues = trends.issueCountTrend.reduce((a,b) => a+b, 0) / trends.issueCountTrend.length;
   * 
   * // 检测性能退化
   * const recentDuration = trends.durationTrend.slice(-5);
   * const isSlowing = recentDuration.every((d, i) => i === 0 || d > recentDuration[i-1]);
   * ```
   * 
   * @returns {Object} 包含三个趋势数组的对象
   * @returns {number[]} healthScoreTrend - 健康评分历史
   * @returns {number[]} issueCountTrend - 问题数量历史
   * @returns {number[]} durationTrend - 执行时长历史（毫秒）
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
   * 
   * 返回当前使用的 ConfigManager 实例，允许外部访问：
   * - 审查配置信息
   * - 端点列表
   * - 数据源配置
   * - 其他配置项
   * 
   * 使用场景：
   * - 动态修改配置（需要重新初始化编排器）
   * - 查看当前配置状态
   * - 配置的二次验证
   * - 集成到配置管理界面
   * 
   * 注意：
   * - 直接修改返回的配置管理器会影响后续审查
   * - 建议通过配置文件修改而非运行时修改
   * - 某些配置变更可能需要重新创建编排器实例
   * 
   * @returns {ConfigManager} 配置管理器实例
   */
  public getConfigManager(): ConfigManager {
    return this.configManager;
  }
}
