/**
 * 数据源验证器
 * 负责验证外部数据源的连接性和数据质量
 */

import {
  fetchWithRetry,
  HttpRequestError,
  assessDataQuality,
  logger,
  type HttpRequestResult,
} from '../utils';
import type { DataSourceHealth, DataQuality } from '../models/health-models';
import type { DataSourceConfig, DataSourceCategory } from '../models/config-models';

/**
 * 数据源验证器配置
 */
export interface DataSourceValidatorConfig {
  /** 请求超时时间(毫秒) */
  timeout: number;
  /** 重试次数 */
  retries: number;
  /** 并发数 */
  concurrency: number;
  /** 最小记录数量阈值 */
  minRecordCount?: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: DataSourceValidatorConfig = {
  timeout: 10000,
  retries: 3,
  concurrency: 5,
  minRecordCount: 1,
};

/**
 * 数据源验证器类
 */
export class DataSourceValidator {
  private config: DataSourceValidatorConfig;
  private validatorLogger = logger.child('DataSourceValidator');

  constructor(config: Partial<DataSourceValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 验证单个数据源
   * @param source 数据源配置
   * @returns Promise<DataSourceHealth> 数据源健康状态
   */
  async validateDataSource(source: DataSourceConfig): Promise<DataSourceHealth> {
    this.validatorLogger.debug(`Validating data source: ${source.name}`, {
      url: source.url,
      category: source.category,
    });

    const startTime = Date.now();

    try {
      // 1. 测试连接性并获取数据
      const result: HttpRequestResult = await fetchWithRetry(
        source.url,
        this.config.timeout,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'API-Audit-System/1.0',
          },
        },
        {
          maxRetries: this.config.retries,
          retryDelay: 1000,
          exponentialBackoff: true,
        }
      );

      const responseTime = Date.now() - startTime;

      // 2. 解析数据
      const data = result.data;

      // 3. 计算数据记录数量
      const recordCount = this.calculateRecordCount(data, source);

      // 4. 评估数据质量
      const quality = this.assessDataSourceQuality(data, source);

      this.validatorLogger.info(`Data source validated successfully: ${source.name}`, {
        responseTime,
        recordCount,
        qualityScore: quality.score,
      });

      return {
        source: source.name,
        available: true,
        responseTime,
        recordCount,
        quality,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 处理HTTP请求错误
      if (error instanceof HttpRequestError) {
        this.validatorLogger.warn(`Data source validation failed: ${source.name}`, {
          error: error.message,
          status: error.status,
          responseTime,
        });

        return {
          source: source.name,
          available: false,
          responseTime: error.duration || responseTime,
          error: error.message,
          timestamp: new Date(),
        };
      }

      // 处理其他错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error(`Unexpected error validating data source: ${source.name}`, error as Error, {
        responseTime,
      });

      return {
        source: source.name,
        available: false,
        responseTime,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 计算数据记录数量
   * @param data 响应数据
   * @param source 数据源配置
   * @returns 记录数量
   */
  private calculateRecordCount(data: any, source: DataSourceConfig): number {
    if (!data) {
      return 0;
    }

    // 如果数据本身是数组
    if (Array.isArray(data)) {
      return data.length;
    }

    // 根据数据源类别和结构提取记录数量
    // 尝试常见的数据结构模式
    const possibleArrayFields = [
      'features',      // GeoJSON格式 (USGS, EMSC, GDACS, NOAA Weather)
      'results',       // Launch Library 2, TheSpaceDevs
      'data',          // ReliefWeb
      'events',        // NOAA Tsunami
      'states',        // OpenSky
      'aircraft',      // ADS-B Exchange
      'ports',         // World Ports
      'launches',      // NextSpaceFlight
    ];

    for (const field of possibleArrayFields) {
      if (data[field] && Array.isArray(data[field])) {
        return data[field].length;
      }
    }

    // 如果是对象但不包含已知的数组字段，返回1（表示有数据）
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      return 1;
    }

    return 0;
  }

  /**
   * 评估数据源质量
   * @param data 响应数据
   * @param source 数据源配置
   * @returns 数据质量评估结果
   */
  private assessDataSourceQuality(data: any, source: DataSourceConfig): DataQuality {
    // 使用统计工具中的assessDataQuality函数
    const qualityResult = assessDataQuality(
      data,
      source.requiredFields,
      this.config.minRecordCount
    );

    return {
      score: qualityResult.score,
      issues: qualityResult.issues,
    };
  }

  /**
   * 验证指定类别的所有数据源
   * @param sources 数据源配置列表
   * @param category 数据源类别(可选，不指定则验证所有)
   * @returns Promise<DataSourceHealth[]> 所有数据源的健康状态
   */
  async validateDataSources(
    sources: DataSourceConfig[],
    category?: DataSourceCategory
  ): Promise<DataSourceHealth[]> {
    // 过滤指定类别的数据源
    const targetSources = category
      ? sources.filter(s => s.category === category)
      : sources;

    this.validatorLogger.info(`Starting batch validation for ${targetSources.length} data sources`, {
      category: category || 'all',
      concurrency: this.config.concurrency,
    });

    // 使用并发控制批量验证
    const results = await this.runWithConcurrencyLimit(
      targetSources.map(source => () => this.validateDataSource(source))
    );

    // 统计结果
    const availableCount = results.filter(r => r.available).length;
    const avgQualityScore = results
      .filter(r => r.quality)
      .reduce((sum, r) => sum + (r.quality?.score || 0), 0) / results.length;

    this.validatorLogger.info(`Batch validation completed`, {
      total: results.length,
      available: availableCount,
      unavailable: results.length - availableCount,
      avgQualityScore: avgQualityScore.toFixed(2),
    });

    return results;
  }

  /**
   * 验证所有灾害数据源
   * @param sources 数据源配置列表
   * @returns Promise<DataSourceHealth[]> 灾害数据源的健康状态
   */
  async validateDisasterSources(sources: DataSourceConfig[]): Promise<DataSourceHealth[]> {
    return this.validateDataSources(sources, 'disasters');
  }

  /**
   * 验证所有航天发射数据源
   * @param sources 数据源配置列表
   * @returns Promise<DataSourceHealth[]> 航天发射数据源的健康状态
   */
  async validateLaunchSources(sources: DataSourceConfig[]): Promise<DataSourceHealth[]> {
    return this.validateDataSources(sources, 'launches');
  }

  /**
   * 验证所有交通数据源
   * @param sources 数据源配置列表
   * @returns Promise<DataSourceHealth[]> 交通数据源的健康状态
   */
  async validateTrafficSources(sources: DataSourceConfig[]): Promise<DataSourceHealth[]> {
    return this.validateDataSources(sources, 'traffic');
  }

  /**
   * 验证所有卫星数据源
   * @param sources 数据源配置列表
   * @returns Promise<DataSourceHealth[]> 卫星数据源的健康状态
   */
  async validateSatelliteSources(sources: DataSourceConfig[]): Promise<DataSourceHealth[]> {
    return this.validateDataSources(sources, 'satellites');
  }

  /**
   * 并发控制执行任务
   * @param tasks 任务函数数组
   * @returns Promise<T[]> 所有任务的结果
   */
  private async runWithConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      // 创建任务Promise
      const promise = task().then(result => {
        results.push(result);
        // 任务完成后从执行队列中移除
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(promise);

      // 如果达到并发限制，等待任意一个任务完成
      if (executing.length >= this.config.concurrency) {
        await Promise.race(executing);
      }
    }

    // 等待所有剩余任务完成
    await Promise.all(executing);

    return results;
  }

  /**
   * 获取数据源验证摘要
   * @param results 验证结果列表
   * @returns 验证摘要对象
   */
  getValidationSummary(results: DataSourceHealth[]): {
    total: number;
    available: number;
    unavailable: number;
    avgResponseTime: number;
    avgQualityScore: number;
    issuesCount: number;
  } {
    const available = results.filter(r => r.available);
    const unavailable = results.filter(r => !r.available);

    const avgResponseTime = available.length > 0
      ? available.reduce((sum, r) => sum + (r.responseTime || 0), 0) / available.length
      : 0;

    const withQuality = results.filter(r => r.quality);
    const avgQualityScore = withQuality.length > 0
      ? withQuality.reduce((sum, r) => sum + (r.quality?.score || 0), 0) / withQuality.length
      : 0;

    const issuesCount = results.reduce(
      (sum, r) => sum + (r.quality?.issues.length || 0),
      0
    );

    return {
      total: results.length,
      available: available.length,
      unavailable: unavailable.length,
      avgResponseTime: Math.round(avgResponseTime),
      avgQualityScore: Math.round(avgQualityScore),
      issuesCount,
    };
  }
}
