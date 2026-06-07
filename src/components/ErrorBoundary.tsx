/**
 * 通用错误边界组件
 * 
 * 捕获组件树中的 JavaScript 错误，防止整个应用崩溃。
 * 
 * 功能：
 * - 捕获渲染错误
 * - 显示友好的降级 UI
 * - 提供重试功能
 * - 记录错误详情（开发环境）
 * - 区分开发/生产环境显示
 * 
 * 使用场景：
 * - 包裹容易出错的组件
 * - 包裹第三方库集成
 * - 包裹数据加载组件
 * 
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

/**
 * 错误边界 Props
 */
interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  
  /** 自定义降级 UI（可选） */
  fallback?: ReactNode;
  
  /** 错误回调函数（可选） */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /** 组件名称（用于日志） */
  componentName?: string;
  
  /** 最大重试次数（默认 3） */
  maxRetries?: number;
  
  /** 重试延迟（毫秒，默认 5000） */
  retryDelay?: number;
  
  /** 冷却期（毫秒，默认 30000） */
  cooldownPeriod?: number;
}

/**
 * 错误边界 State
 */
interface ErrorBoundaryState {
  /** 是否有错误 */
  hasError: boolean;
  
  /** 错误对象 */
  error: Error | null;
  
  /** 错误信息 */
  errorInfo: ErrorInfo | null;
  
  /** 重试次数 */
  retryCount: number;
  
  /** 最后重试时间 */
  lastRetryTime: number | null;
  
  /** 是否在冷却期 */
  isInCooldown: boolean;
  
  /** 冷却期剩余时间（秒） */
  cooldownRemaining: number;
  
  /** 是否正在延迟重试 */
  isRetryDelayed: boolean;
  
  /** 重试延迟剩余时间（秒） */
  retryDelayRemaining: number;
}

// Timer IDs for cleanup
let retryTimer: NodeJS.Timeout | null = null;
let cooldownTimer: NodeJS.Timeout | null = null;
let countdownInterval: NodeJS.Timeout | null = null;

/**
 * 通用错误边界组件
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastRetryTime: null,
      isInCooldown: false,
      cooldownRemaining: 0,
      isRetryDelayed: false,
      retryDelayRemaining: 0,
    };
  }

  override componentWillUnmount(): void {
    // Clean up timers
    this.clearTimers();
  }

  /**
   * Clear all active timers
   */
  private clearTimers(): void {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (cooldownTimer) {
      clearTimeout(cooldownTimer);
      cooldownTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  /**
   * 捕获错误并更新状态
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Error handling after catch
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state
    this.setState({
      errorInfo,
    });

    // Log error details to console (always, but format differs by environment)
    const timestamp = new Date().toISOString();

    // Console logging with full details
    console.error('========================================');
    console.error('ErrorBoundary caught an error');
    console.error('========================================');
    console.error('Timestamp:', timestamp);
    if (this.props.componentName) {
      console.error('Component:', this.props.componentName);
    }
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('========================================');

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, we could report to error monitoring service
    // (e.g., Sentry, LogRocket, etc.)
    // if (!_isDevelopment) {
    //   reportErrorToService({
    //     error,
    //     errorInfo,
    //     timestamp,
    //     componentName: this.props.componentName,
    //   });
    // }
  }

  /**
   * 重置错误状态，重新渲染
   */
  handleReset = (): void => {
    const { maxRetries = 3, retryDelay = 5000, cooldownPeriod = 30000 } = this.props;
    const { retryCount, isInCooldown } = this.state;

    // If in cooldown, don't allow retry
    if (isInCooldown) {
      return;
    }

    // Check if we've reached max retries
    if (retryCount >= maxRetries) {
      // Enter cooldown mode
      this.setState({
        isInCooldown: true,
        cooldownRemaining: Math.floor(cooldownPeriod / 1000),
      });

      // Start cooldown countdown
      countdownInterval = setInterval(() => {
        this.setState((prevState) => {
          const newRemaining = prevState.cooldownRemaining - 1;
          if (newRemaining <= 0) {
            if (countdownInterval) {
              clearInterval(countdownInterval);
              countdownInterval = null;
            }
            return {
              cooldownRemaining: 0,
              isInCooldown: false,
              retryCount: 0,
            } as ErrorBoundaryState;
          }
          return { cooldownRemaining: newRemaining } as ErrorBoundaryState;
        });
      }, 1000);

      // End cooldown after period
      cooldownTimer = setTimeout(() => {
        this.setState({
          isInCooldown: false,
          retryCount: 0,
          cooldownRemaining: 0,
        });
      }, cooldownPeriod);

      return;
    }

    // Start retry delay
    this.setState({
      isRetryDelayed: true,
      retryDelayRemaining: Math.floor(retryDelay / 1000),
      lastRetryTime: Date.now(),
    });

    // Start delay countdown
    countdownInterval = setInterval(() => {
      this.setState((prevState) => {
        const newRemaining = prevState.retryDelayRemaining - 1;
        if (newRemaining <= 0) {
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
          return { retryDelayRemaining: 0 };
        }
        return { retryDelayRemaining: newRemaining };
      });
    }, 1000);

    // Execute retry after delay
    retryTimer = setTimeout(() => {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetryDelayed: false,
        retryDelayRemaining: 0,
      }));
    }, retryDelay);
  };

  /**
   * 刷新页面
   */
  handleRefresh = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    const {
      hasError,
      error,
      errorInfo,
      retryCount,
      isInCooldown,
      cooldownRemaining,
      isRetryDelayed,
      retryDelayRemaining,
    } = this.state;
    const { children, fallback, componentName, maxRetries = 3 } = this.props;

    if (hasError && error) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';
      const timestamp = new Date().toLocaleString();

      // Otherwise, use default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-6">
            {/* Error Icon */}
            <div className="flex items-center mb-4">
              <svg
                className="w-12 h-12 text-red-500 mr-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                {isDevelopment && componentName && (
                  <p className="text-gray-400 text-sm mt-1">
                    Error in {componentName} component
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">{timestamp}</p>
              </div>
            </div>

            {/* Error Message */}
            <div className="mb-6">
              {/* Production: Sanitized error message */}
              {!isDevelopment && (
                <p className="text-gray-300 mb-2">
                  We&apos;re sorry, the application encountered an unexpected error. Please try again or refresh the page.
                </p>
              )}

              {/* Development: Detailed error information */}
              {isDevelopment && (
                <>
                  <p className="text-gray-300 mb-4">
                    The application encountered an error during rendering.
                  </p>
                  <details className="bg-gray-900 p-4 rounded" open>
                    <summary className="cursor-pointer text-yellow-400 font-semibold mb-2">
                      Error Details (Development Mode)
                    </summary>
                    <div className="mt-2 text-sm font-mono">
                      <p className="text-red-400 mb-2">
                        <strong>Error:</strong> {error.toString()}
                      </p>
                      {error.stack && (
                        <div className="mb-4">
                          <p className="text-yellow-400 mb-1">
                            <strong>Stack Trace:</strong>
                          </p>
                          <pre className="text-gray-400 overflow-auto max-h-60 text-xs bg-black p-2 rounded">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      {errorInfo && errorInfo.componentStack && (
                        <div>
                          <p className="text-yellow-400 mb-1">
                            <strong>Component Stack:</strong>
                          </p>
                          <pre className="text-gray-400 overflow-auto max-h-40 text-xs bg-black p-2 rounded">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </>
              )}
            </div>

            {/* Retry Information */}
            {retryCount > 0 && (
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <p className="text-sm text-gray-300">
                  Retry attempts: {retryCount} / {maxRetries}
                </p>
              </div>
            )}

            {/* Cooldown Warning */}
            {isInCooldown && (
              <div className="mb-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded">
                <p className="text-yellow-400 text-sm font-semibold mb-1">
                  Maximum retry attempts reached
                </p>
                <p className="text-yellow-300 text-sm">
                  Please wait {cooldownRemaining} seconds before trying again
                </p>
                <div className="mt-2 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full transition-all duration-1000"
                    style={{
                      width: `${(cooldownRemaining / 30) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Retry Delay Warning */}
            {isRetryDelayed && (
              <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-600 rounded">
                <p className="text-blue-400 text-sm">
                  Retrying in {retryDelayRemaining} seconds...
                </p>
                <div className="mt-2 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-1000"
                    style={{
                      width: `${(retryDelayRemaining / 5) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                disabled={isInCooldown || isRetryDelayed}
                className={`flex-1 font-semibold py-2 px-4 rounded transition-colors ${
                  isInCooldown || isRetryDelayed
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRetryDelayed ? 'Retrying...' : isInCooldown ? 'Retry Disabled' : 'Retry'}
              </button>
              <button
                onClick={this.handleRefresh}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Refresh Page
              </button>
            </div>

            {/* Help Information */}
            <div className="mt-6 text-sm text-gray-400 text-center">
              If the problem persists, please try clearing your browser cache or contact support
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return children;
  }
}

/**
 * 错误边界 Hook 版本（用于函数组件）
 * 
 * 注意：React 目前不支持错误边界的 Hook 版本，
 * 这是一个包装器，内部使用 class 组件
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    showError: setError,
    resetError,
  };
}

export default ErrorBoundary;
