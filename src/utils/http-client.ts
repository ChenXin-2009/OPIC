/**
 * HTTP客户端工具
 * 提供带超时控制、重试机制和请求计时的HTTP请求功能
 */

/**
 * HTTP请求结果
 */
export interface HttpRequestResult<T = any> {
  /** 响应数据 */
  data: T;
  /** 响应状态码 */
  status: number;
  /** 响应头 */
  headers: Headers;
  /** 请求耗时(毫秒) */
  duration: number;
  /** 是否成功 */
  success: boolean;
}

/**
 * HTTP请求错误
 */
export class HttpRequestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public duration?: number
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟(毫秒) */
  retryDelay: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
  /** 可重试的HTTP状态码 */
  retryableStatusCodes?: number[];
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * 带超时控制的fetch请求
 * @param url 请求URL
 * @param timeout 超时时间(毫秒)
 * @param options fetch选项
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  timeout: number = 5000,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpRequestError(`Request timeout after ${timeout}ms`, undefined, timeout);
    }
    throw error;
  }
}

/**
 * 计算重试延迟时间
 * @param attempt 当前重试次数
 * @param config 重试配置
 * @returns 延迟时间(毫秒)
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  if (config.exponentialBackoff) {
    return config.retryDelay * Math.pow(2, attempt);
  }
  return config.retryDelay;
}

/**
 * 判断是否应该重试
 * @param error 错误对象
 * @param status HTTP状态码
 * @param config 重试配置
 * @returns 是否应该重试
 */
function shouldRetry(
  error: Error | null,
  status: number | undefined,
  config: RetryConfig
): boolean {
  // 网络错误应该重试
  if (error && !status) {
    return true;
  }

  // 检查状态码是否可重试
  if (status && config.retryableStatusCodes) {
    return config.retryableStatusCodes.includes(status);
  }

  return false;
}

/**
 * 延迟函数
 * @param ms 延迟时间(毫秒)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试机制的HTTP请求
 * @param url 请求URL
 * @param timeout 超时时间(毫秒)
 * @param options fetch选项
 * @param retryConfig 重试配置
 * @returns Promise<HttpRequestResult>
 */
export async function fetchWithRetry<T = any>(
  url: string,
  timeout: number = 5000,
  options?: RequestInit,
  retryConfig: Partial<RetryConfig> = {}
): Promise<HttpRequestResult<T>> {
  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      const response = await fetchWithTimeout(url, timeout, options);
      const duration = Date.now() - startTime;
      lastStatus = response.status;

      // 检查响应状态
      if (!response.ok) {
        // 如果状态码不可重试,直接抛出错误
        if (!shouldRetry(null, response.status, config)) {
          throw new HttpRequestError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            duration
          );
        }

        // 如果还有重试机会,继续重试
        if (attempt < config.maxRetries) {
          const delay = calculateRetryDelay(attempt, config);
          await sleep(delay);
          continue;
        }

        // 没有重试机会了,抛出错误
        throw new HttpRequestError(
          `HTTP ${response.status}: ${response.statusText} (after ${attempt} retries)`,
          response.status,
          duration
        );
      }

      // 解析响应数据
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
        duration,
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是HttpRequestError且状态码不可重试,直接抛出
      if (error instanceof HttpRequestError && error.status) {
        if (!shouldRetry(null, error.status, config)) {
          throw error;
        }
      }

      // 如果还有重试机会且应该重试,继续重试
      if (attempt < config.maxRetries && shouldRetry(lastError, lastStatus, config)) {
        const delay = calculateRetryDelay(attempt, config);
        await sleep(delay);
        continue;
      }

      // 没有重试机会了,抛出错误
      if (error instanceof HttpRequestError) {
        throw new HttpRequestError(
          `${error.message} (after ${attempt} retries)`,
          error.status,
          duration
        );
      }
      throw new HttpRequestError(
        `Request failed: ${lastError.message} (after ${attempt} retries)`,
        lastStatus,
        duration
      );
    }
  }

  // 理论上不会到达这里,但为了类型安全
  throw new HttpRequestError(
    `Request failed after ${config.maxRetries} retries`,
    lastStatus
  );
}

/**
 * 计时请求 - 简单的请求计时包装器
 * @param url 请求URL
 * @param options fetch选项
 * @returns Promise<HttpRequestResult>
 */
export async function timedRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<HttpRequestResult<T>> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    let data: T;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = (await response.text()) as T;
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
      duration,
      success: response.ok,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    throw new HttpRequestError(
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      duration
    );
  }
}
