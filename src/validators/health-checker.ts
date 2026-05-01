/**
 * 健康检查器 (HealthChecker)
 * 负责验证HTTP API端点的可访问性和基本功能
 */

import { EndpointHealth } from '../models/health-models';
import { EndpointConfig } from '../models/config-models';
import { fetchWithRetry, HttpRequestError } from '../utils/http-client';
import { logger } from '../utils/logger';

/**
 * 并发控制器
 * 限制同时执行的任务数量
 */
class ConcurrencyController {
  constructor(private maxConcurrency: number) {}

  /**
   * 以受控并发方式运行任务
   * @param tasks 任务函数数组
   * @returns 任务结果数组
   */
  async runWithLimit<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then((result) => {
        results.push(result);
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(promise);

      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }
}

/**
 * 健康检查器配置
 */
export interface HealthCheckerConfig {
  /** 请求超时时间(毫秒) */
  timeout: number;
  /** 重试次数 */
  retries: number;
  /** 并发数 */
  concurrency: number;
  /** 基础URL(用于相对路径) */
  baseUrl?: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: HealthCheckerConfig = {
  timeout: 5000,
  retries: 3,
  concurrency: 10,
  baseUrl: '',
};

/**
 * 健康检查器类
 */
export class HealthChecker {
  private config: HealthCheckerConfig;
  private concurrencyController: ConcurrencyController;
  private log = logger.child('HealthChecker');

  constructor(config: Partial<HealthCheckerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.concurrencyController = new ConcurrencyController(this.config.concurrency);
  }

  /**
   * 从配置文件加载端点列表
   * @param configPath 配置文件路径
   * @returns 端点配置数组
   */
  async loadEndpointsFromConfig(configPath: string): Promise<EndpointConfig[]> {
    this.log.info('从配置文件加载端点列表', { configPath });

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // 读取配置文件
      const absolutePath = path.resolve(configPath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const config = JSON.parse(fileContent);

      // 验证配置格式
      if (!config.endpoints || !Array.isArray(config.endpoints)) {
        throw new Error('配置文件格式无效: 缺少endpoints数组');
      }

      this.log.info('成功加载端点配置', { count: config.endpoints.length });
      return config.endpoints;
    } catch (error) {
      this.log.error('加载端点配置失败', error as Error, { configPath });
      throw error;
    }
  }

  /**
   * 动态发现API端点
   * 扫描/api目录下的所有路由文件
   * @param apiDir API目录路径
   * @returns 发现的端点路径数组
   */
  async discoverEndpoints(apiDir: string): Promise<string[]> {
    this.log.info('开始动态发现API端点', { apiDir });

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const endpoints: string[] = [];

      /**
       * 递归扫描目录
       */
      async function scanDirectory(dir: string, basePath: string = ''): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const routePath = path.join(basePath, entry.name);

          if (entry.isDirectory()) {
            // 递归扫描子目录
            await scanDirectory(fullPath, routePath);
          } else if (entry.isFile()) {
            // 检查是否为路由文件
            const isRouteFile =
              entry.name === 'route.ts' ||
              entry.name === 'route.js' ||
              entry.name === 'route.tsx' ||
              entry.name === 'route.jsx';

            if (isRouteFile) {
              // 将文件路径转换为API路径
              const apiPath = '/api/' + basePath.replace(/\\/g, '/');
              endpoints.push(apiPath);
            }
          }
        }
      }

      await scanDirectory(apiDir);

      this.log.info('端点发现完成', { count: endpoints.length, endpoints });
      return endpoints;
    } catch (error) {
      this.log.error('端点发现失败', error as Error, { apiDir });
      throw error;
    }
  }

  /**
   * 构建完整的请求URL
   * @param endpoint 端点路径或完整URL
   * @param params 查询参数
   * @returns 完整的URL
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    // 如果是完整URL,直接使用
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      const url = new URL(endpoint);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }
      return url.toString();
    }

    // 处理路径参数(如 /api/satellites/[noradId]/details)
    let path = endpoint;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`[${key}]`, String(value));
      });
    }

    // 构建完整URL
    const baseUrl = this.config.baseUrl || '';
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(fullPath, baseUrl || 'http://localhost:3000');

    // 添加查询参数(排除已用于路径替换的参数)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (!endpoint.includes(`[${key}]`)) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * 检查单个端点的健康状态
   * @param endpoint 端点路径或完整URL
   * @param params 查询参数
   * @returns 端点健康状态
   */
  async checkEndpoint(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<EndpointHealth> {
    const url = this.buildUrl(endpoint, params);
    this.log.debug('检查端点健康状态', { url });

    const startTime = Date.now();

    try {
      // 发送请求
      const result = await fetchWithRetry(
        url,
        this.config.timeout,
        { method: 'GET' },
        { maxRetries: this.config.retries }
      );

      const responseTime = result.duration;
      const healthy = result.status >= 200 && result.status < 400;

      this.log.debug('端点检查完成', {
        url,
        status: result.status,
        responseTime,
        healthy,
      });

      return {
        url,
        status: result.status,
        responseTime,
        healthy,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 从HttpRequestError中提取状态码
      let status = 0;
      if (error instanceof HttpRequestError && error.status) {
        status = error.status;
      }

      this.log.warn('端点检查失败', {
        url,
        error: errorMessage,
        responseTime,
      });

      return {
        url,
        status,
        responseTime,
        healthy: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 批量检查多个端点
   * @param endpoints 端点配置数组
   * @returns 所有端点的健康状态数组
   */
  async checkAllEndpoints(endpoints: EndpointConfig[]): Promise<EndpointHealth[]> {
    this.log.info('开始批量检查端点', { count: endpoints.length });

    // 创建检查任务
    const tasks = endpoints.map((endpoint) => {
      return () => this.checkEndpoint(endpoint.path, endpoint.testParams);
    });

    // 使用并发控制器执行任务
    const results = await this.concurrencyController.runWithLimit(tasks);

    // 统计结果
    const healthyCount = results.filter((r) => r.healthy).length;
    const unhealthyCount = results.length - healthyCount;

    this.log.info('批量检查完成', {
      total: results.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
    });

    return results;
  }

  /**
   * 检查端点列表(简化版本,只需要路径数组)
   * @param endpointPaths 端点路径数组
   * @returns 所有端点的健康状态数组
   */
  async checkEndpoints(endpointPaths: string[]): Promise<EndpointHealth[]> {
    this.log.info('开始检查端点列表', { count: endpointPaths.length });

    // 创建检查任务
    const tasks = endpointPaths.map((path) => {
      return () => this.checkEndpoint(path);
    });

    // 使用并发控制器执行任务
    const results = await this.concurrencyController.runWithLimit(tasks);

    // 统计结果
    const healthyCount = results.filter((r) => r.healthy).length;
    const unhealthyCount = results.length - healthyCount;

    this.log.info('端点检查完成', {
      total: results.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
    });

    return results;
  }

  /**
   * 获取健康状态摘要
   * @param results 端点健康状态数组
   * @returns 摘要信息
   */
  getSummary(results: EndpointHealth[]): {
    total: number;
    healthy: number;
    unhealthy: number;
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  } {
    const healthy = results.filter((r) => r.healthy).length;
    const unhealthy = results.length - healthy;

    const responseTimes = results.map((r) => r.responseTime);
    const avgResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    return {
      total: results.length,
      healthy,
      unhealthy,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      minResponseTime,
    };
  }
}
