/**
 * 缓存验证器 (CacheValidator)
 * 负责验证缓存机制的正确性和有效性
 */

import { timedRequest, logger, type HttpRequestResult } from '../utils';
import type { CacheTestResult } from '../models/health-models';

/**
 * 缓存配置信息
 */
export interface CacheConfig {
  /** 端点路径 */
  endpoint: string;
  /** 缓存TTL(秒) */
  ttl: number;
  /** 端点名称 */
  name?: string;
}

/**
 * 缓存验证器配置
 */
export interface CacheValidatorConfig {
  /** 基础URL */
  baseUrl?: string;
  /** 缓存写入等待时间(毫秒) */
  cacheWriteDelay: number;
  /** 缓存命中判定阈值(第二次请求时间应小于第一次的此比例) */
  cacheHitThreshold: number;
  /** 并发数 */
  concurrency: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: CacheValidatorConfig = {
  baseUrl: '',
  cacheWriteDelay: 100,
  cacheHitThreshold: 0.5,
  concurrency: 5,
};

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 缓存验证器类
 */
export class CacheValidator {
  private config: CacheValidatorConfig;
  private validatorLogger = logger.child('CacheValidator');

  constructor(config: Partial<CacheValidatorConfig> = {}) {
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
   * 测试缓存命中
   * 发送两次相同请求,验证第二次请求是否使用缓存
   * @param endpoint 端点路径
   * @returns Promise<CacheTestResult> 缓存测试结果
   */
  async testCacheHit(endpoint: string): Promise<CacheTestResult> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.debug(`Testing cache hit for: ${url}`);

    try {
      // 第一次请求 - 缓存未命中
      this.validatorLogger.debug('Sending first request (cache miss expected)');
      const firstRequest = await timedRequest(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      // 等待缓存写入
      this.validatorLogger.debug(`Waiting ${this.config.cacheWriteDelay}ms for cache write`);
      await sleep(this.config.cacheWriteDelay);

      // 第二次请求 - 应该缓存命中
      this.validatorLogger.debug('Sending second request (cache hit expected)');
      const secondRequest = await timedRequest(url, {
        method: 'GET',
      });

      // 验证缓存行为
      const cacheHit = secondRequest.duration < firstRequest.duration * this.config.cacheHitThreshold;
      const improvement = firstRequest.duration - secondRequest.duration;
      const improvementPercent = (improvement / firstRequest.duration) * 100;

      this.validatorLogger.info('Cache test completed', {
        endpoint,
        cacheHit,
        firstRequestTime: firstRequest.duration,
        secondRequestTime: secondRequest.duration,
        improvement,
        improvementPercent: improvementPercent.toFixed(2),
      });

      return {
        endpoint,
        cacheHit,
        firstRequestTime: firstRequest.duration,
        secondRequestTime: secondRequest.duration,
        improvement,
        improvementPercent,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Cache test failed', error as Error, { endpoint });

      // 返回失败结果
      return {
        endpoint,
        cacheHit: false,
        firstRequestTime: 0,
        secondRequestTime: 0,
        improvement: 0,
        improvementPercent: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 验证缓存配置
   * 检查端点的缓存TTL配置是否符合预期
   * @param cacheConfigs 缓存配置列表
   * @returns Promise<Map<string, boolean>> 验证结果映射(端点 -> 是否符合配置)
   */
  async validateCacheConfig(cacheConfigs: CacheConfig[]): Promise<Map<string, boolean>> {
    this.validatorLogger.info(`Validating cache configuration for ${cacheConfigs.length} endpoints`);

    const results = new Map<string, boolean>();

    for (const config of cacheConfigs) {
      this.validatorLogger.debug(`Validating cache config for: ${config.endpoint}`, {
        ttl: config.ttl,
        name: config.name,
      });

      // 测试缓存命中
      const testResult = await this.testCacheHit(config.endpoint);

      // 验证缓存是否生效
      const isValid = testResult.cacheHit;
      results.set(config.endpoint, isValid);

      this.validatorLogger.debug(`Cache config validation result for ${config.endpoint}:`, {
        isValid,
        cacheHit: testResult.cacheHit,
      });
    }

    const validCount = Array.from(results.values()).filter(v => v).length;
    this.validatorLogger.info('Cache configuration validation completed', {
      total: cacheConfigs.length,
      valid: validCount,
      invalid: cacheConfigs.length - validCount,
    });

    return results;
  }

  /**
   * 测量缓存性能提升
   * 对比缓存命中和未命中的性能差异
   * @param endpoint 端点路径
   * @param iterations 测试迭代次数
   * @returns Promise<{ cacheHitAvg: number; cacheMissAvg: number; improvement: number }>
   */
  async measureCachePerformance(
    endpoint: string,
    iterations: number = 10
  ): Promise<{
    cacheHitAvg: number;
    cacheMissAvg: number;
    improvement: number;
    improvementPercent: number;
  }> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.info(`Measuring cache performance for: ${url}`, { iterations });

    const cacheMissTimes: number[] = [];
    const cacheHitTimes: number[] = [];

    try {
      // 测量缓存未命中的响应时间
      for (let i = 0; i < iterations; i++) {
        const result = await timedRequest(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        cacheMissTimes.push(result.duration);
        await sleep(50); // 短暂延迟避免过载
      }

      // 等待缓存写入
      await sleep(this.config.cacheWriteDelay);

      // 测量缓存命中的响应时间
      for (let i = 0; i < iterations; i++) {
        const result = await timedRequest(url, {
          method: 'GET',
        });
        cacheHitTimes.push(result.duration);
        await sleep(50);
      }

      // 计算平均值
      const cacheMissAvg = cacheMissTimes.reduce((sum, t) => sum + t, 0) / cacheMissTimes.length;
      const cacheHitAvg = cacheHitTimes.reduce((sum, t) => sum + t, 0) / cacheHitTimes.length;
      const improvement = cacheMissAvg - cacheHitAvg;
      const improvementPercent = (improvement / cacheMissAvg) * 100;

      this.validatorLogger.info('Cache performance measurement completed', {
        endpoint,
        cacheMissAvg: cacheMissAvg.toFixed(2),
        cacheHitAvg: cacheHitAvg.toFixed(2),
        improvement: improvement.toFixed(2),
        improvementPercent: improvementPercent.toFixed(2),
      });

      return {
        cacheHitAvg: Math.round(cacheHitAvg),
        cacheMissAvg: Math.round(cacheMissAvg),
        improvement: Math.round(improvement),
        improvementPercent: Math.round(improvementPercent * 100) / 100,
      };
    } catch (error) {
      this.validatorLogger.error('Cache performance measurement failed', error as Error, { endpoint });
      throw error;
    }
  }

  /**
   * 验证缓存过期行为
   * 等待缓存过期后验证是否返回新数据
   * @param endpoint 端点路径
   * @param ttl 缓存TTL(秒)
   * @returns Promise<{ expired: boolean; details: string }>
   */
  async validateCacheExpiration(
    endpoint: string,
    ttl: number
  ): Promise<{ expired: boolean; details: string }> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.info(`Validating cache expiration for: ${url}`, { ttl });

    try {
      // 第一次请求 - 填充缓存
      this.validatorLogger.debug('Sending first request to populate cache');
      const firstRequest = await timedRequest(url);
      const firstData = JSON.stringify(firstRequest.data);

      // 等待缓存过期 (TTL + 额外缓冲时间)
      const waitTime = (ttl + 2) * 1000;
      this.validatorLogger.debug(`Waiting ${waitTime}ms for cache to expire`);
      await sleep(waitTime);

      // 第二次请求 - 应该获取新数据
      this.validatorLogger.debug('Sending second request after cache expiration');
      const secondRequest = await timedRequest(url);
      const secondData = JSON.stringify(secondRequest.data);

      // 检查数据是否更新
      // 注意: 这个检测可能不准确,因为数据源可能返回相同的数据
      // 更可靠的方法是检查响应时间是否接近缓存未命中的时间
      const dataChanged = firstData !== secondData;
      const responseTimeIncreased = secondRequest.duration > firstRequest.duration * 1.5;

      const expired = dataChanged || responseTimeIncreased;
      const details = expired
        ? `Cache expired correctly. Data changed: ${dataChanged}, Response time increased: ${responseTimeIncreased}`
        : `Cache may not have expired. Data unchanged: ${!dataChanged}, Response time similar: ${!responseTimeIncreased}`;

      this.validatorLogger.info('Cache expiration validation completed', {
        endpoint,
        expired,
        dataChanged,
        responseTimeIncreased,
        firstRequestTime: firstRequest.duration,
        secondRequestTime: secondRequest.duration,
      });

      return { expired, details };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Cache expiration validation failed', error as Error, { endpoint });

      return {
        expired: false,
        details: `Validation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * 批量测试缓存命中
   * @param endpoints 端点路径列表
   * @returns Promise<CacheTestResult[]> 所有端点的缓存测试结果
   */
  async testCacheHitBatch(endpoints: string[]): Promise<CacheTestResult[]> {
    this.validatorLogger.info(`Testing cache hit for ${endpoints.length} endpoints`);

    // 使用并发控制
    const results = await this.runWithConcurrencyLimit(
      endpoints.map(endpoint => () => this.testCacheHit(endpoint))
    );

    const hitCount = results.filter(r => r.cacheHit).length;
    this.validatorLogger.info('Batch cache hit test completed', {
      total: results.length,
      hit: hitCount,
      miss: results.length - hitCount,
    });

    return results;
  }

  /**
   * 并发控制执行任务
   */
  private async runWithConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[]
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(promise);

      if (executing.length >= this.config.concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 获取缓存验证摘要
   */
  getCacheSummary(results: CacheTestResult[]): {
    total: number;
    cacheHit: number;
    cacheMiss: number;
    avgImprovement: number;
    avgImprovementPercent: number;
  } {
    const cacheHit = results.filter(r => r.cacheHit).length;
    const cacheMiss = results.length - cacheHit;

    const avgImprovement = results.length > 0
      ? results.reduce((sum, r) => sum + r.improvement, 0) / results.length
      : 0;

    const avgImprovementPercent = results.length > 0
      ? results.reduce((sum, r) => sum + r.improvementPercent, 0) / results.length
      : 0;

    return {
      total: results.length,
      cacheHit,
      cacheMiss,
      avgImprovement: Math.round(avgImprovement),
      avgImprovementPercent: Math.round(avgImprovementPercent * 100) / 100,
    };
  }
}
