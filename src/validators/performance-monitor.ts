/**
 * 性能监控器 (PerformanceMonitor)
 * 负责测量和分析API性能指标
 */

import { timedRequest, calculateStatistics, logger, type Statistics } from '../utils';
import type { PerformanceMetrics } from '../models/health-models';
import type { DataSourceConfig } from '../models/config-models';

/**
 * 性能监控器配置
 */
export interface PerformanceMonitorConfig {
  /** 基础URL */
  baseUrl?: string;
  /** 默认测试迭代次数 */
  iterations: number;
  /** 并发数 */
  concurrency: number;
  /** 性能问题阈值(毫秒) */
  performanceThreshold: number;
  /** 请求间隔(毫秒) */
  requestInterval: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  baseUrl: '',
  iterations: 100,
  concurrency: 10,
  performanceThreshold: 5000,
  requestInterval: 50,
};

/**
 * 数据源性能指标
 */
export interface DataSourcePerformance {
  /** 数据源名称 */
  source: string;
  /** 平均响应时间(毫秒) */
  avgResponseTime: number;
  /** 最小响应时间(毫秒) */
  minResponseTime: number;
  /** 最大响应时间(毫秒) */
  maxResponseTime: number;
  /** P95响应时间(毫秒) */
  p95ResponseTime: number;
  /** 是否为慢速数据源 */
  isSlow: boolean;
  /** 测试时间戳 */
  timestamp: Date;
}

/**
 * 缓存性能对比结果
 */
export interface CachePerformanceComparison {
  /** 端点路径 */
  endpoint: string;
  /** 缓存命中平均响应时间(毫秒) */
  cacheHitAvg: number;
  /** 缓存未命中平均响应时间(毫秒) */
  cacheMissAvg: number;
  /** 性能改善(毫秒) */
  improvement: number;
  /** 改善百分比 */
  improvementPercent: number;
  /** 测试时间戳 */
  timestamp: Date;
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private monitorLogger = logger.child('PerformanceMonitor');

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 构建完整URL
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const baseUrl = this.config.baseUrl || 'http://localhost:3000';
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return new URL(path, baseUrl).toString();
  }

  /**
   * 测量端点性能
   * 并发发送多次请求并记录响应时间
   * @param endpoint 端点路径
   * @param iterations 测试迭代次数
   * @returns Promise<PerformanceMetrics> 性能指标
   */
  async measurePerformance(
    endpoint: string,
    iterations: number = this.config.iterations
  ): Promise<PerformanceMetrics> {
    const url = this.buildUrl(endpoint);
    this.monitorLogger.info(`Measuring performance for: ${url}`, {
      iterations,
      concurrency: this.config.concurrency,
    });

    const responseTimes: number[] = [];

    try {
      // 并发测试
      const batchSize = this.config.concurrency;
      const batches = Math.ceil(iterations / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, iterations);
        const batchCount = batchEnd - batchStart;

        this.monitorLogger.debug(`Processing batch ${batch + 1}/${batches}`, {
          batchCount,
        });

        // 并发发送请求
        const batchPromises = Array(batchCount)
          .fill(null)
          .map(async () => {
            try {
              const result = await timedRequest(url);
              return result.duration;
            } catch (error) {
              this.monitorLogger.warn('Request failed during performance test', {
                error: error instanceof Error ? error.message : String(error),
              });
              return null;
            }
          });

        const batchTimes = await Promise.all(batchPromises);

        // 过滤掉失败的请求
        const validTimes = batchTimes.filter((time): time is number => time !== null);
        responseTimes.push(...validTimes);

        // 批次间短暂延迟
        if (batch < batches - 1) {
          await sleep(this.config.requestInterval);
        }
      }

      // 计算统计指标
      const stats = calculateStatistics(responseTimes);

      // 判断是否存在性能问题
      const hasPerformanceIssue = stats.avg > this.config.performanceThreshold;

      this.monitorLogger.info('Performance measurement completed', {
        endpoint,
        iterations: responseTimes.length,
        avg: stats.avg.toFixed(2),
        min: stats.min,
        max: stats.max,
        p95: stats.p95,
        p99: stats.p99,
        hasPerformanceIssue,
      });

      return {
        endpoint,
        iterations: responseTimes.length,
        avg: Math.round(stats.avg),
        min: stats.min,
        max: stats.max,
        p95: stats.p95,
        p99: stats.p99,
        hasPerformanceIssue,
        timestamp: new Date(),
      };
    } catch (error) {
      this.monitorLogger.error('Performance measurement failed', error as Error, { endpoint });

      // 返回失败结果
      return {
        endpoint,
        iterations: 0,
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
        hasPerformanceIssue: true,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 计算性能统计指标
   * 从响应时间数组计算各项统计指标
   * @param times 响应时间数组(毫秒)
   * @returns Statistics 统计指标
   */
  calculateStatistics(times: number[]): Statistics {
    return calculateStatistics(times);
  }

  /**
   * 测量缓存性能对比
   * 对比缓存命中和未命中的性能差异
   * @param endpoint 端点路径
   * @param iterations 测试迭代次数
   * @returns Promise<CachePerformanceComparison> 缓存性能对比结果
   */
  async measureCachePerformance(
    endpoint: string,
    iterations: number = 10
  ): Promise<CachePerformanceComparison> {
    const url = this.buildUrl(endpoint);
    this.monitorLogger.info(`Measuring cache performance for: ${url}`, { iterations });

    const cacheMissTimes: number[] = [];
    const cacheHitTimes: number[] = [];

    try {
      // 测量缓存未命中的响应时间
      this.monitorLogger.debug('Measuring cache miss performance');
      for (let i = 0; i < iterations; i++) {
        const result = await timedRequest(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        cacheMissTimes.push(result.duration);
        await sleep(this.config.requestInterval);
      }

      // 等待缓存写入
      await sleep(100);

      // 测量缓存命中的响应时间
      this.monitorLogger.debug('Measuring cache hit performance');
      for (let i = 0; i < iterations; i++) {
        const result = await timedRequest(url, {
          method: 'GET',
        });
        cacheHitTimes.push(result.duration);
        await sleep(this.config.requestInterval);
      }

      // 计算平均值
      const cacheMissAvg = cacheMissTimes.reduce((sum, t) => sum + t, 0) / cacheMissTimes.length;
      const cacheHitAvg = cacheHitTimes.reduce((sum, t) => sum + t, 0) / cacheHitTimes.length;
      const improvement = cacheMissAvg - cacheHitAvg;
      const improvementPercent = (improvement / cacheMissAvg) * 100;

      this.monitorLogger.info('Cache performance measurement completed', {
        endpoint,
        cacheMissAvg: cacheMissAvg.toFixed(2),
        cacheHitAvg: cacheHitAvg.toFixed(2),
        improvement: improvement.toFixed(2),
        improvementPercent: improvementPercent.toFixed(2),
      });

      return {
        endpoint,
        cacheHitAvg: Math.round(cacheHitAvg),
        cacheMissAvg: Math.round(cacheMissAvg),
        improvement: Math.round(improvement),
        improvementPercent: Math.round(improvementPercent * 100) / 100,
        timestamp: new Date(),
      };
    } catch (error) {
      this.monitorLogger.error('Cache performance measurement failed', error as Error, { endpoint });

      return {
        endpoint,
        cacheHitAvg: 0,
        cacheMissAvg: 0,
        improvement: 0,
        improvementPercent: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 测量数据源性能
   * 测量不同数据源的响应时间并识别慢速数据源
   * @param dataSources 数据源配置列表
   * @param iterations 每个数据源的测试迭代次数
   * @returns Promise<DataSourcePerformance[]> 数据源性能指标列表
   */
  async measureDataSourcePerformance(
    dataSources: DataSourceConfig[],
    iterations: number = 10
  ): Promise<DataSourcePerformance[]> {
    this.monitorLogger.info(`Measuring performance for ${dataSources.length} data sources`, {
      iterations,
    });

    const results: DataSourcePerformance[] = [];

    for (const source of dataSources) {
      this.monitorLogger.debug(`Measuring performance for data source: ${source.name}`);

      const responseTimes: number[] = [];

      try {
        // 发送多次请求测量性能
        for (let i = 0; i < iterations; i++) {
          try {
            const result = await timedRequest(source.url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'API-Audit-System/1.0',
              },
            });
            responseTimes.push(result.duration);
          } catch (error) {
            this.monitorLogger.warn(`Request failed for ${source.name}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          await sleep(this.config.requestInterval);
        }

        if (responseTimes.length === 0) {
          // 所有请求都失败
          results.push({
            source: source.name,
            avgResponseTime: 0,
            minResponseTime: 0,
            maxResponseTime: 0,
            p95ResponseTime: 0,
            isSlow: true,
            timestamp: new Date(),
          });
          continue;
        }

        // 计算统计指标
        const stats = calculateStatistics(responseTimes);

        // 判断是否为慢速数据源(平均响应时间超过阈值)
        const isSlow = stats.avg > this.config.performanceThreshold;

        this.monitorLogger.info(`Performance measured for ${source.name}`, {
          avgResponseTime: stats.avg.toFixed(2),
          isSlow,
        });

        results.push({
          source: source.name,
          avgResponseTime: Math.round(stats.avg),
          minResponseTime: stats.min,
          maxResponseTime: stats.max,
          p95ResponseTime: stats.p95,
          isSlow,
          timestamp: new Date(),
        });
      } catch (error) {
        this.monitorLogger.error(`Performance measurement failed for ${source.name}`, error as Error);

        results.push({
          source: source.name,
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          p95ResponseTime: 0,
          isSlow: true,
          timestamp: new Date(),
        });
      }
    }

    const slowCount = results.filter(r => r.isSlow).length;
    this.monitorLogger.info('Data source performance measurement completed', {
      total: results.length,
      slow: slowCount,
      fast: results.length - slowCount,
    });

    return results;
  }

  /**
   * 批量测量端点性能
   * @param endpoints 端点路径列表
   * @param iterations 每个端点的测试迭代次数
   * @returns Promise<PerformanceMetrics[]> 所有端点的性能指标
   */
  async measurePerformanceBatch(
    endpoints: string[],
    iterations: number = this.config.iterations
  ): Promise<PerformanceMetrics[]> {
    this.monitorLogger.info(`Measuring performance for ${endpoints.length} endpoints`, {
      iterations,
    });

    const results: PerformanceMetrics[] = [];

    // 顺序执行以避免过载
    for (const endpoint of endpoints) {
      const result = await this.measurePerformance(endpoint, iterations);
      results.push(result);

      // 端点间短暂延迟
      await sleep(this.config.requestInterval);
    }

    const issueCount = results.filter(r => r.hasPerformanceIssue).length;
    this.monitorLogger.info('Batch performance measurement completed', {
      total: results.length,
      withIssues: issueCount,
      withoutIssues: results.length - issueCount,
    });

    return results;
  }

  /**
   * 获取性能监控摘要
   */
  getPerformanceSummary(results: PerformanceMetrics[]): {
    total: number;
    withIssues: number;
    withoutIssues: number;
    overallAvgResponseTime: number;
    overallP95ResponseTime: number;
    overallP99ResponseTime: number;
  } {
    const withIssues = results.filter(r => r.hasPerformanceIssue).length;
    const withoutIssues = results.length - withIssues;

    const overallAvgResponseTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.avg, 0) / results.length
      : 0;

    const overallP95ResponseTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.p95, 0) / results.length
      : 0;

    const overallP99ResponseTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.p99, 0) / results.length
      : 0;

    return {
      total: results.length,
      withIssues,
      withoutIssues,
      overallAvgResponseTime: Math.round(overallAvgResponseTime),
      overallP95ResponseTime: Math.round(overallP95ResponseTime),
      overallP99ResponseTime: Math.round(overallP99ResponseTime),
    };
  }

  /**
   * 获取数据源性能摘要
   */
  getDataSourcePerformanceSummary(results: DataSourcePerformance[]): {
    total: number;
    slow: number;
    fast: number;
    avgResponseTime: number;
    slowestSource: string | null;
    fastestSource: string | null;
  } {
    const slow = results.filter(r => r.isSlow).length;
    const fast = results.length - slow;

    const avgResponseTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length
      : 0;

    // 找出最慢和最快的数据源
    let slowestSource: string | null = null;
    let fastestSource: string | null = null;

    if (results.length > 0) {
      const sorted = [...results].sort((a, b) => b.avgResponseTime - a.avgResponseTime);
      slowestSource = sorted[0].source;
      fastestSource = sorted[sorted.length - 1].source;
    }

    return {
      total: results.length,
      slow,
      fast,
      avgResponseTime: Math.round(avgResponseTime),
      slowestSource,
      fastestSource,
    };
  }
}
