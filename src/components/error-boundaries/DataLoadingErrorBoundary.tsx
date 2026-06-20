/**
 * 数据加载错误边界 (Data Loading Error Boundary)
 *
 * 捕获数据加载过程中的错误，提供重试机制和降级策略。
 * 支持指数退避、线性退避和手动重试三种策略。
 */

'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

/**
 * Retry strategy for data loading operations
 */
export type RetryStrategy = 'exponential' | 'linear' | 'manual';

/**
 * Props for DataLoadingErrorBoundary component
 */
export interface DataLoadingErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
  retryStrategy?: RetryStrategy;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * State for DataLoadingErrorBoundary component
 */
interface DataLoadingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  nextRetryIn: number;
}

/**
 * DataLoadingErrorBoundary
 * 
 * Specialized error boundary for data fetching components with intelligent retry strategies.
 * Supports exponential, linear, and manual retry modes with configurable delays.
 * 
 * **Features:**
 * - Exponential backoff: 2s, 4s, 8s, 16s, ...
 * - Linear backoff: constant delay
 * - Manual retry: user-triggered only
 * - Network error detection and specialized handling
 * - Timeout detection with clear messaging
 * 
 * **Usage:**
 * ```tsx
 * <DataLoadingErrorBoundary
 *   retryStrategy="exponential"
 *   maxRetries={3}
 *   onError={(error) => console.error('Data load failed:', error)}
 * >
 *   <DataFetchingComponent />
 * </DataLoadingErrorBoundary>
 * ```
 * 
 * @see Requirements 1.10, 1.11, 1.12, 1.13
 */
export class DataLoadingErrorBoundary extends Component<
  DataLoadingErrorBoundaryProps,
  DataLoadingErrorBoundaryState
> {
  private retryTimerId: NodeJS.Timeout | null = null;
  private countdownIntervalId: NodeJS.Timeout | null = null;

  static defaultProps = {
    retryStrategy: 'exponential' as RetryStrategy,
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds base delay
  };

  constructor(props: DataLoadingErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      nextRetryIn: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DataLoadingErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log error details
    console.error(
      `[DataLoadingErrorBoundary] ${this.props.componentName || 'Component'} caught error:`,
      {
        error: error.message,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      }
    );

    // Log full stack in development
    if (isDevelopment) {
      console.error('Error stack:', error.stack);
    }

    this.setState({ errorInfo });

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);

    // Auto-retry if strategy allows
    if (this.props.retryStrategy !== 'manual' && this.canRetry()) {
      this.scheduleRetry();
    }
  }

  override componentWillUnmount(): void {
    this.clearTimers();
  }

  /**
   * Check if retry is allowed based on retry count
   */
  private canRetry(): boolean {
    const { maxRetries = 3 } = this.props;
    return this.state.retryCount < maxRetries;
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(): number {
    const { retryStrategy = 'exponential', retryDelay = 2000 } = this.props;
    const { retryCount } = this.state;

    switch (retryStrategy) {
      case 'exponential':
        return retryDelay * (2 ** retryCount);
      case 'linear':
        return retryDelay;
      case 'manual':
        return 0;
      default:
        return retryDelay;
    }
  }

  /**
   * Schedule automatic retry with countdown
   */
  private scheduleRetry(): void {
    const delay = this.calculateRetryDelay();

    this.setState({
      isRetrying: true,
      nextRetryIn: Math.ceil(delay / 1000),
    });

    // Countdown timer
    this.countdownIntervalId = setInterval(() => {
      this.setState((prevState) => ({
        nextRetryIn: Math.max(0, prevState.nextRetryIn - 1),
      }));
    }, 1000);

    // Retry timer
    this.retryTimerId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.retryTimerId) {
      clearTimeout(this.retryTimerId);
      this.retryTimerId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  /**
   * Handle retry action
   */
  private handleRetry = (): void => {
    this.clearTimers();

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
      nextRetryIn: 0,
    }));
  };

  /**
   * Cancel ongoing retry
   */
  private handleCancelRetry = (): void => {
    this.clearTimers();

    this.setState({
      isRetrying: false,
      nextRetryIn: 0,
    });
  };

  /**
   * Reset error boundary state
   */
  private handleReset = (): void => {
    this.clearTimers();

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      nextRetryIn: 0,
    });
  };

  /**
   * Detect if error is network-related
   */
  private isNetworkError(error: Error | null): boolean {
    if (!error) return false;

    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('cors') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError'
    );
  }

  /**
   * Detect if error is timeout-related
   */
  private isTimeoutError(error: Error | null): boolean {
    if (!error) return false;

    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  }

  /**
   * Render error message with context
   */
  private renderErrorMessage(): string {
    const { error } = this.state;

    if (this.isTimeoutError(error)) {
      return 'The request took too long to complete. Please check your connection and try again.';
    }

    if (this.isNetworkError(error)) {
      return 'Unable to load data. Please check your network connection and try again.';
    }

    return error?.message || 'An error occurred while loading data.';
  }

  /**
   * Render suggestions based on error type
   */
  private renderSuggestions(): string[] {
    const { error } = this.state;

    if (this.isTimeoutError(error)) {
      return [
        'Check your internet connection',
        'Try again later when the server is less busy',
        'Contact support if the problem persists',
      ];
    }

    if (this.isNetworkError(error)) {
      return [
        'Verify your internet connection is active',
        'Check if the server is accessible',
        'Try disabling VPN or proxy if enabled',
        'Clear browser cache and cookies',
      ];
    }

    return [
      'Refresh the page and try again',
      'Check the browser console for details',
      'Contact support if the error persists',
    ];
  }

  override render(): ReactNode {
    const { hasError, error, errorInfo, retryCount, isRetrying, nextRetryIn } = this.state;
    const { children, fallback, componentName, retryStrategy = 'exponential', maxRetries = 3 } = this.props;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const canRetry = this.canRetry();
      const isManualRetry = retryStrategy === 'manual';

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: '2rem',
            margin: '1rem',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
              Data Loading Error
            </h3>
            {componentName && (
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#7f1d1d' }}>
                Component: {componentName}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{this.renderErrorMessage()}</p>

            {isDevelopment && error && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#7f1d1d' }}>
                  Technical Details (Development Only)
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#fff1f2',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                  }}
                >
                  {error.stack || error.message}
                </pre>
                {errorInfo?.componentStack && (
                  <pre
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#fff1f2',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                    }}
                  >
                    {errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              Suggestions:
            </p>
            <ul style={{ margin: '0', paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
              {this.renderSuggestions().map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isRetrying ? (
              <>
                <span style={{ fontSize: '0.875rem' }}>
                  Retrying in {nextRetryIn} second{nextRetryIn !== 1 ? 's' : ''}...
                </span>
                <button
                  onClick={this.handleCancelRetry}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #dc2626',
                    backgroundColor: 'white',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                  aria-label="Cancel automatic retry"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={this.handleRetry}
                  disabled={!isManualRetry && !canRetry}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: canRetry || isManualRetry ? '#dc2626' : '#9ca3af',
                    color: 'white',
                    cursor: canRetry || isManualRetry ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem',
                  }}
                  aria-label={`Retry loading data (attempt ${retryCount + 1})`}
                >
                  Retry {isManualRetry ? '' : `(${retryCount}/${maxRetries})`}
                </button>
                <button
                  onClick={this.handleReset}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #dc2626',
                    backgroundColor: 'white',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                  aria-label="Reset and clear error"
                >
                  Reset
                </button>
              </>
            )}
          </div>

          {!canRetry && !isManualRetry && (
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#7f1d1d' }}>
              Maximum retry attempts reached. Please try again later or contact support.
            </p>
          )}
        </div>
      );
    }

    return children;
  }
}
