/**
 * 速率限制验证器 (RateLimitValidator)
 * 负责验证速率限制机制的有效性
 */

import { timedRequest, logger } from '../utils';
import type { RateLimitTestResult } from '../models/health-models';

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 端点路径 */
  endpoint: string;
  /** 速率限制阈值(请求数) */
  limit: number;
  /** 时间窗口(秒) */
  window: number;
  /** 端点名称 */
  name?: string;
}

/**
 * 速率限制验证器配置
 */
export interface RateLimitValidatorConfig {
  /** 基础URL */
  baseUrl?: string;
  /** 请求超时时间(毫秒) */
  timeout: number;
  /** 请求间隔(毫秒) */
  requestInterval: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: RateLimitValidatorConfig = {
  baseUrl: '',
  timeout: 5000,
  requestInterval: 100,
};

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 速率限制验证器类
 */
export class RateLimitValidator {
  private config: RateLimitValidatorConfig;
  private validatorLogger = logger.child('RateLimitValidator');

  constructor(config: Partial<RateLimitValidatorConfig> = {}) {
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
   * 测试速率限制
   * 发送超过限制的请求,验证速率限制是否生效
   * @param endpoint 端点路径
   * @param limit 速率限制阈值
   * @returns Promise<RateLimitTestResult> 速率限制测试结果
   */
  async testRateLimit(endpoint: string, limit: number): Promise<RateLimitTestResult> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.info(`Testing rate limit for: ${url}`, { limit });

    // 发送超过限制的请求数量
    const requestCount = limit + 5;
    const responses: Array<{ status: number; headers: Headers }> = [];

    try {
      // 快速发送多个请求
      for (let i = 0; i < requestCount; i++) {
        try {
          const result = await timedRequest(url, {
            method: 'GET',
          });

          responses.push({
            status: result.status,
            headers: result.headers,
          });

          // 短暂延迟避免过快
          if (i < requestCount - 1) {
            await sleep(this.config.requestInterval);
          }
        } catch (error) {
          // 记录失败的请求
          this.validatorLogger.debug(`Request ${i + 1} failed`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 统计429响应
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const rateLimitedCount = rateLimitedResponses.length;

      // 检查是否包含Retry-After响应头
      const hasRetryAfter = rateLimitedResponses.every(r =>
        r.headers.has('Retry-After') || r.headers.has('retry-after')
      );

      // 速率限制是否生效
      const rateLimitWorking = rateLimitedCount > 0;

      this.validatorLogger.info('Rate limit test completed', {
        endpoint,
        limit,
        requestsSent: requestCount,
        rateLimitedCount,
        rateLimitWorking,
        hasRetryAfter,
      });

      return {
        endpoint,
        limit,
        requestsSent: requestCount,
        rateLimitedCount,
        rateLimitWorking,
        hasRetryAfter,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Rate limit test failed', error as Error, { endpoint });

      return {
        endpoint,
        limit,
        requestsSent: responses.length,
        rateLimitedCount: 0,
        rateLimitWorking: false,
        hasRetryAfter: false,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 验证速率限制响应头
   * 检查429响应是否包含必要的响应头
   * @param endpoint 端点路径
   * @param limit 速率限制阈值
   * @returns Promise<{ valid: boolean; headers: Record<string, string>; details: string }>
   */
  async validateRateLimitHeaders(
    endpoint: string,
    limit: number
  ): Promise<{ valid: boolean; headers: Record<string, string>; details: string }> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.debug(`Validating rate limit headers for: ${url}`);

    try {
      // 发送足够多的请求以触发速率限制
      let rateLimitResponse: { status: number; headers: Headers } | null = null;

      for (let i = 0; i < limit + 5; i++) {
        const result = await timedRequest(url);

        if (result.status === 429) {
          rateLimitResponse = {
            status: result.status,
            headers: result.headers,
          };
          break;
        }

        await sleep(this.config.requestInterval);
      }

      if (!rateLimitResponse) {
        return {
          valid: false,
          headers: {},
          details: 'Rate limit was not triggered',
        };
      }

      // 提取响应头
      const headers: Record<string, string> = {};
      rateLimitResponse.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // 检查必需的响应头
      const hasRetryAfter = rateLimitResponse.headers.has('Retry-After') ||
                           rateLimitResponse.headers.has('retry-after');
      const hasRateLimitHeaders = rateLimitResponse.headers.has('X-RateLimit-Limit') ||
                                 rateLimitResponse.headers.has('X-Rate-Limit-Limit');

      const valid = hasRetryAfter;
      const details = valid
        ? `Rate limit headers are valid. Has Retry-After: ${hasRetryAfter}, Has rate limit info: ${hasRateLimitHeaders}`
        : 'Missing required Retry-After header';

      this.validatorLogger.info('Rate limit headers validation completed', {
        endpoint,
        valid,
        hasRetryAfter,
        hasRateLimitHeaders,
      });

      return { valid, headers, details };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Rate limit headers validation failed', error as Error, { endpoint });

      return {
        valid: false,
        headers: {},
        details: `Validation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * 测试速率限制重置
   * 等待速率限制窗口重置后验证是否可以继续请求
   * @param endpoint 端点路径
   * @param limit 速率限制阈值
   * @param window 时间窗口(秒)
   * @returns Promise<{ reset: boolean; details: string }>
   */
  async testRateLimitReset(
    endpoint: string,
    limit: number,
    window: number
  ): Promise<{ reset: boolean; details: string }> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.info(`Testing rate limit reset for: ${url}`, { limit, window });

    try {
      // 第一阶段: 触发速率限制
      this.validatorLogger.debug('Phase 1: Triggering rate limit');
      let rateLimitTriggered = false;

      for (let i = 0; i < limit + 5; i++) {
        const result = await timedRequest(url);

        if (result.status === 429) {
          rateLimitTriggered = true;
          this.validatorLogger.debug('Rate limit triggered', { requestNumber: i + 1 });
          break;
        }

        await sleep(this.config.requestInterval);
      }

      if (!rateLimitTriggered) {
        return {
          reset: false,
          details: 'Rate limit was not triggered in phase 1',
        };
      }

      // 第二阶段: 等待窗口重置
      const waitTime = (window + 2) * 1000; // 额外等待2秒确保重置
      this.validatorLogger.debug(`Phase 2: Waiting ${waitTime}ms for rate limit window to reset`);
      await sleep(waitTime);

      // 第三阶段: 验证是否可以继续请求
      this.validatorLogger.debug('Phase 3: Testing if rate limit has reset');
      const result = await timedRequest(url);

      const reset = result.status !== 429;
      const details = reset
        ? `Rate limit reset successfully. Status after reset: ${result.status}`
        : `Rate limit did not reset. Status: ${result.status}`;

      this.validatorLogger.info('Rate limit reset test completed', {
        endpoint,
        reset,
        statusAfterReset: result.status,
      });

      return { reset, details };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Rate limit reset test failed', error as Error, { endpoint });

      return {
        reset: false,
        details: `Test failed: ${errorMessage}`,
      };
    }
  }

  /**
   * 测试多IP速率限制
   * 验证不同IP的速率限制是否独立计算
   * 注意: 此功能需要能够模拟不同IP的请求,实际实现可能需要代理或测试环境支持
   * @param endpoint 端点路径
   * @param limit 速率限制阈值
   * @returns Promise<{ independent: boolean; details: string }>
   */
  async testMultiIPRateLimit(
    endpoint: string,
    limit: number
  ): Promise<{ independent: boolean; details: string }> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.info(`Testing multi-IP rate limit for: ${url}`, { limit });

    try {
      // 注意: 实际测试多IP速率限制需要能够模拟不同的源IP
      // 这里提供一个基础实现框架,实际使用时可能需要配合代理或测试环境

      // 模拟IP1的请求
      this.validatorLogger.debug('Testing with IP1 (simulated)');
      const ip1Responses: number[] = [];

      for (let i = 0; i < limit + 2; i++) {
        const result = await timedRequest(url, {
          headers: {
            'X-Forwarded-For': '192.168.1.1', // 模拟IP1
          },
        });
        ip1Responses.push(result.status);
        await sleep(this.config.requestInterval);
      }

      const ip1RateLimited = ip1Responses.some(status => status === 429);

      // 模拟IP2的请求
      this.validatorLogger.debug('Testing with IP2 (simulated)');
      const ip2Responses: number[] = [];

      for (let i = 0; i < limit + 2; i++) {
        const result = await timedRequest(url, {
          headers: {
            'X-Forwarded-For': '192.168.1.2', // 模拟IP2
          },
        });
        ip2Responses.push(result.status);
        await sleep(this.config.requestInterval);
      }

      const ip2RateLimited = ip2Responses.some(status => status === 429);

      // 如果两个IP都被独立限制,说明速率限制是按IP独立计算的
      const independent = ip1RateLimited && ip2RateLimited;

      const details = independent
        ? 'Rate limits are independent per IP (both IPs were rate limited separately)'
        : `Rate limits may not be independent. IP1 limited: ${ip1RateLimited}, IP2 limited: ${ip2RateLimited}`;

      this.validatorLogger.info('Multi-IP rate limit test completed', {
        endpoint,
        independent,
        ip1RateLimited,
        ip2RateLimited,
      });

      return { independent, details };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Multi-IP rate limit test failed', error as Error, { endpoint });

      return {
        independent: false,
        details: `Test failed: ${errorMessage}. Note: This test requires proxy or test environment support to simulate different IPs.`,
      };
    }
  }

  /**
   * 批量测试速率限制
   * @param configs 速率限制配置列表
   * @returns Promise<RateLimitTestResult[]> 所有端点的测试结果
   */
  async testRateLimits(configs: RateLimitConfig[]): Promise<RateLimitTestResult[]> {
    this.validatorLogger.info(`Testing rate limits for ${configs.length} endpoints`);

    const results: RateLimitTestResult[] = [];

    // 顺序执行以避免相互干扰
    for (const config of configs) {
      const result = await this.testRateLimit(config.endpoint, config.limit);
      results.push(result);

      // 等待一段时间确保速率限制重置
      if (config.window) {
        const waitTime = (config.window + 1) * 1000;
        this.validatorLogger.debug(`Waiting ${waitTime}ms before next test`);
        await sleep(waitTime);
      }
    }

    const workingCount = results.filter(r => r.rateLimitWorking).length;
    this.validatorLogger.info('Batch rate limit test completed', {
      total: results.length,
      working: workingCount,
      notWorking: results.length - workingCount,
    });

    return results;
  }

  /**
   * 获取速率限制验证摘要
   */
  getRateLimitSummary(results: RateLimitTestResult[]): {
    total: number;
    working: number;
    notWorking: number;
    withRetryAfter: number;
    avgRateLimitedCount: number;
  } {
    const working = results.filter(r => r.rateLimitWorking).length;
    const notWorking = results.length - working;
    const withRetryAfter = results.filter(r => r.hasRetryAfter).length;

    const avgRateLimitedCount = results.length > 0
      ? results.reduce((sum, r) => sum + r.rateLimitedCount, 0) / results.length
      : 0;

    return {
      total: results.length,
      working,
      notWorking,
      withRetryAfter,
      avgRateLimitedCount: Math.round(avgRateLimitedCount * 100) / 100,
    };
  }
}
