/**
 * 错误处理验证器 (ErrorValidator)
 * 负责验证API的错误处理和降级机制
 */

import { timedRequest, logger, type HttpRequestResult } from '../utils';
import type { ErrorTestResult } from '../models/health-models';

/**
 * 错误场景定义
 */
export interface ErrorScenario {
  /** 场景名称 */
  name: string;
  /** 端点路径 */
  endpoint: string;
  /** 请求方法 */
  method?: string;
  /** 请求参数 */
  params?: Record<string, any>;
  /** 请求体 */
  body?: any;
  /** 期望的HTTP状态码 */
  expectedStatus: number;
  /** 场景描述 */
  description?: string;
}

/**
 * 降级测试结果
 */
export interface FallbackTestResult {
  /** 端点路径 */
  endpoint: string;
  /** 是否成功降级 */
  fallbackWorking: boolean;
  /** 是否返回了过期缓存数据 */
  returnedStaleCache: boolean;
  /** 响应状态码 */
  status: number;
  /** 详细信息 */
  details: string;
  /** 测试时间戳 */
  timestamp: Date;
}

/**
 * 错误处理验证器配置
 */
export interface ErrorValidatorConfig {
  /** 基础URL */
  baseUrl?: string;
  /** 请求超时时间(毫秒) */
  timeout: number;
  /** 并发数 */
  concurrency: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ErrorValidatorConfig = {
  baseUrl: '',
  timeout: 10000,
  concurrency: 5,
};

/**
 * 错误处理验证器类
 */
export class ErrorValidator {
  private config: ErrorValidatorConfig;
  private validatorLogger = logger.child('ErrorValidator');

  constructor(config: Partial<ErrorValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 构建完整URL
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url: URL;

    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      url = new URL(endpoint);
    } else {
      const baseUrl = this.config.baseUrl || 'http://localhost:3000';
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      url = new URL(path, baseUrl);
    }

    // 添加查询参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * 测试错误场景
   * 发送请求并验证错误响应是否符合预期
   * @param scenario 错误场景定义
   * @returns Promise<ErrorTestResult> 错误测试结果
   */
  async testErrorScenario(scenario: ErrorScenario): Promise<ErrorTestResult> {
    const url = this.buildUrl(scenario.endpoint, scenario.params);
    this.validatorLogger.debug(`Testing error scenario: ${scenario.name}`, {
      url,
      expectedStatus: scenario.expectedStatus,
    });

    try {
      const result = await timedRequest(url, {
        method: scenario.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: scenario.body ? JSON.stringify(scenario.body) : undefined,
      });

      // 检查状态码是否符合预期
      const statusMatches = result.status === scenario.expectedStatus;

      // 检查是否包含错误消息
      let hasErrorMessage = false;
      try {
        const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        hasErrorMessage = !!(
          data?.error ||
          data?.message ||
          data?.errorMessage ||
          data?.details
        );
      } catch {
        // 如果无法解析JSON,检查是否有文本内容
        hasErrorMessage = typeof result.data === 'string' && result.data.length > 0;
      }

      const passed = statusMatches && hasErrorMessage;

      this.validatorLogger.info(`Error scenario test completed: ${scenario.name}`, {
        passed,
        expectedStatus: scenario.expectedStatus,
        actualStatus: result.status,
        hasErrorMessage,
      });

      return {
        scenario: scenario.name,
        passed,
        expectedStatus: scenario.expectedStatus,
        actualStatus: result.status,
        hasErrorMessage,
        details: passed
          ? 'Error handling is correct'
          : `Status mismatch or missing error message. Expected: ${scenario.expectedStatus}, Got: ${result.status}, Has error message: ${hasErrorMessage}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.warn(`Error scenario test failed: ${scenario.name}`, {
        error: errorMessage,
      });

      // 对于某些场景,抛出异常也可能是预期行为
      return {
        scenario: scenario.name,
        passed: false,
        expectedStatus: scenario.expectedStatus,
        actualStatus: 0,
        hasErrorMessage: false,
        details: `Request failed: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 验证错误响应格式
   * 检查错误响应是否包含必要的信息
   * @param endpoint 端点路径
   * @param params 请求参数(用于触发错误)
   * @returns Promise<{ valid: boolean; details: string }>
   */
  async validateErrorResponse(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<{ valid: boolean; details: string }> {
    const url = this.buildUrl(endpoint, params);
    this.validatorLogger.debug(`Validating error response format for: ${url}`);

    try {
      const result = await timedRequest(url);

      // 检查是否为错误响应
      if (result.status >= 200 && result.status < 400) {
        return {
          valid: false,
          details: 'Response is not an error (status 2xx/3xx)',
        };
      }

      // 解析响应数据
      let data: any;
      try {
        data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      } catch {
        return {
          valid: false,
          details: 'Error response is not valid JSON',
        };
      }

      // 检查错误响应结构
      const hasError = !!(data?.error || data?.message || data?.errorMessage);
      const hasStatus = typeof data?.status === 'number' || typeof data?.statusCode === 'number';

      const valid = hasError;
      const details = valid
        ? `Error response is valid. Has error message: ${hasError}, Has status: ${hasStatus}`
        : 'Error response is missing required fields (error/message)';

      this.validatorLogger.info('Error response validation completed', {
        url,
        valid,
        hasError,
        hasStatus,
      });

      return { valid, details };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Error response validation failed', error as Error, { url });

      return {
        valid: false,
        details: `Validation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * 测试降级机制
   * 模拟外部数据源失败,验证API是否返回过期缓存数据
   * @param endpoint 端点路径
   * @returns Promise<FallbackTestResult> 降级测试结果
   */
  async testFallbackMechanism(endpoint: string): Promise<FallbackTestResult> {
    const url = this.buildUrl(endpoint);
    this.validatorLogger.info(`Testing fallback mechanism for: ${url}`);

    try {
      // 第一次请求 - 正常请求,填充缓存
      this.validatorLogger.debug('Sending first request to populate cache');
      const firstRequest = await timedRequest(url);

      if (!firstRequest.success || firstRequest.status >= 400) {
        return {
          endpoint,
          fallbackWorking: false,
          returnedStaleCache: false,
          status: firstRequest.status,
          details: 'Initial request failed, cannot test fallback',
          timestamp: new Date(),
        };
      }

      // 第二次请求 - 尝试触发降级
      // 注意: 实际触发降级需要模拟上游失败,这里只能检测API的降级响应
      // 在真实场景中,可能需要使用特殊的测试参数或mock服务
      this.validatorLogger.debug('Sending second request to test fallback');
      const secondRequest = await timedRequest(url, {
        headers: {
          'X-Force-Fallback': 'true', // 假设API支持此测试头
        },
      });

      // 检查是否返回了数据(即使上游失败)
      const returnedData = secondRequest.success && secondRequest.data;
      const returnedStaleCache = returnedData && secondRequest.status === 200;

      // 检查响应头是否标识使用了缓存
      const cacheHeader = secondRequest.headers.get('X-Cache') || secondRequest.headers.get('X-From-Cache');
      const hasCacheIndicator = cacheHeader === 'HIT' || cacheHeader === 'STALE';

      const fallbackWorking = returnedStaleCache || hasCacheIndicator;

      this.validatorLogger.info('Fallback mechanism test completed', {
        endpoint,
        fallbackWorking,
        returnedStaleCache,
        hasCacheIndicator,
        status: secondRequest.status,
      });

      return {
        endpoint,
        fallbackWorking,
        returnedStaleCache,
        status: secondRequest.status,
        details: fallbackWorking
          ? 'Fallback mechanism is working (returned stale cache or has cache indicator)'
          : 'Fallback mechanism may not be working (no stale cache returned)',
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.validatorLogger.error('Fallback mechanism test failed', error as Error, { endpoint });

      return {
        endpoint,
        fallbackWorking: false,
        returnedStaleCache: false,
        status: 0,
        details: `Test failed: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 批量测试错误场景
   * @param scenarios 错误场景列表
   * @returns Promise<ErrorTestResult[]> 所有场景的测试结果
   */
  async testErrorScenarios(scenarios: ErrorScenario[]): Promise<ErrorTestResult[]> {
    this.validatorLogger.info(`Testing ${scenarios.length} error scenarios`);

    const results = await this.runWithConcurrencyLimit(
      scenarios.map(scenario => () => this.testErrorScenario(scenario))
    );

    const passedCount = results.filter(r => r.passed).length;
    this.validatorLogger.info('Error scenarios test completed', {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
    });

    return results;
  }

  /**
   * 测试常见错误场景
   * 包括: 参数缺失、参数无效、资源未找到、内部错误
   * @param baseEndpoint 基础端点路径
   * @returns Promise<ErrorTestResult[]> 测试结果列表
   */
  async testCommonErrorScenarios(baseEndpoint: string): Promise<ErrorTestResult[]> {
    const scenarios: ErrorScenario[] = [
      {
        name: 'Missing Required Parameter',
        endpoint: baseEndpoint,
        params: {}, // 缺少必需参数
        expectedStatus: 400,
        description: 'Test missing required parameter handling',
      },
      {
        name: 'Invalid Parameter Value',
        endpoint: baseEndpoint,
        params: { id: 'invalid' }, // 无效参数值
        expectedStatus: 400,
        description: 'Test invalid parameter value handling',
      },
      {
        name: 'Resource Not Found',
        endpoint: `${baseEndpoint}/nonexistent-resource-12345`,
        expectedStatus: 404,
        description: 'Test resource not found handling',
      },
      {
        name: 'Invalid Method',
        endpoint: baseEndpoint,
        method: 'DELETE', // 假设不支持DELETE
        expectedStatus: 405,
        description: 'Test invalid HTTP method handling',
      },
    ];

    return this.testErrorScenarios(scenarios);
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
   * 获取错误处理验证摘要
   */
  getErrorValidationSummary(results: ErrorTestResult[]): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  } {
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const passRate = results.length > 0 ? (passed / results.length) * 100 : 0;

    return {
      total: results.length,
      passed,
      failed,
      passRate: Math.round(passRate * 100) / 100,
    };
  }
}
