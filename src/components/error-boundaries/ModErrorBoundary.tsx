/**
 * MOD 错误边界 (Mod Error Boundary)
 *
 * 捕获 MOD 插件渲染和生命周期中的错误，防止单个 MOD 崩溃影响整个应用。
 * 提供错误日志记录和用户友好的降级 UI。
 */

'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { logger } from '@/utils/logger';

/**
 * Props for ModErrorBoundary component
 */
export interface ModErrorBoundaryProps {
  children: ReactNode;
  modId: string;
  modName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onModFailure?: (modId: string, error: Error) => void;
  isolateFailure?: boolean;
}

/**
 * State for ModErrorBoundary component
 */
interface ModErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDisabled: boolean;
  timestamp: number | null;
}

/**
 * ModErrorBoundary
 * 
 * Specialized error boundary for MOD (modular extension) system components.
 * Prevents MOD errors from crashing the entire application by isolating failures.
 * 
 * **Features:**
 * - MOD failure isolation: prevents cascading failures
 * - Automatic MOD disabling on critical errors
 * - Detailed error reporting for MOD developers
 * - User-friendly fallback UI
 * - Optional MOD re-enabling after error resolution
 * 
 * **MOD Error Categories:**
 * - Initialization errors: MOD failed to load or initialize
 * - Runtime errors: MOD encountered error during execution
 * - Permission errors: MOD attempted unauthorized operation
 * - Resource errors: MOD exceeded resource limits
 * 
 * **Usage:**
 * ```tsx
 * <ModErrorBoundary
 *   modId="stellar-catalog-mod"
 *   modName="Stellar Catalog Viewer"
 *   onModFailure={(modId, error) => {
 *     console.error(`MOD ${modId} failed:`, error);
 *     modManager.disableMod(modId);
 *   }}
 * >
 *   <ModComponent />
 * </ModErrorBoundary>
 * ```
 * 
 * @see Requirements 1.10, 1.11, 1.12, 1.13
 */
export class ModErrorBoundary extends Component<ModErrorBoundaryProps, ModErrorBoundaryState> {
  static defaultProps = {
    isolateFailure: true,
  };

  constructor(props: ModErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDisabled: false,
      timestamp: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ModErrorBoundaryState> {
    return {
      hasError: true,
      error,
      timestamp: Date.now(),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { modId, modName, isolateFailure } = this.props;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log error details
    console.error(`[ModErrorBoundary] MOD "${modName || modId}" caught error:`, {
      modId,
      error: error.message,
      errorName: error.name,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Log full stack in development
    if (isDevelopment) {
      console.error('Error stack:', error.stack);
      console.error('Component stack:', errorInfo.componentStack);
    }

    this.setState({ errorInfo });

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);

    // Isolate MOD failure if enabled
    if (isolateFailure) {
      this.disableMod(error);
    }
  }

  /**
   * Disable the MOD after critical error
   */
  private disableMod(error: Error): void {
    const { modId, onModFailure } = this.props;

    console.warn(`[ModErrorBoundary] Disabling MOD "${modId}" due to critical error`);

    this.setState({ isDisabled: true });

    // Notify parent via callback
    onModFailure?.(modId, error);
  }

  /**
   * Attempt to re-enable and retry the MOD
   */
  private handleRetry = (): void => {
    logger.debug(`[ModErrorBoundary] Retrying MOD "${this.props.modId}"`);

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDisabled: false,
      timestamp: null,
    });
  };

  /**
   * Permanently disable the MOD
   */
  private handleDisable = (): void => {
    const { modId, onModFailure } = this.props;
    const { error } = this.state;

    logger.debug(`[ModErrorBoundary] Permanently disabling MOD "${modId}"`);

    this.setState({ isDisabled: true });

    if (error) {
      onModFailure?.(modId, error);
    }
  };

  /**
   * Categorize error type for user-friendly messaging
   */
  private categorizeError(error: Error | null): string {
    if (!error) return 'unknown';

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (
      message.includes('initialization') ||
      message.includes('init') ||
      message.includes('load')
    ) {
      return 'initialization';
    }

    if (message.includes('permission') || name.includes('permission')) {
      return 'permission';
    }

    if (
      message.includes('memory') ||
      message.includes('quota') ||
      message.includes('resource')
    ) {
      return 'resource';
    }

    return 'runtime';
  }

  /**
   * Render error message based on category
   */
  private renderErrorMessage(): { title: string; message: string; suggestions: string[] } {
    const { error } = this.state;
    const { modName, modId } = this.props;
    const category = this.categorizeError(error);

    const displayName = modName || modId;

    switch (category) {
      case 'initialization':
        return {
          title: 'MOD Initialization Failed',
          message: `The MOD "${displayName}" failed to initialize properly.`,
          suggestions: [
            'Check if all required dependencies are available',
            'Verify MOD configuration is correct',
            'Update the MOD to the latest version',
            'Contact the MOD developer for support',
          ],
        };

      case 'permission':
        return {
          title: 'MOD Permission Error',
          message: `The MOD "${displayName}" attempted an unauthorized operation.`,
          suggestions: [
            'Review MOD permissions in settings',
            'Grant necessary permissions if trusted',
            'Contact the MOD developer about permission requirements',
            'Disable the MOD if untrusted',
          ],
        };

      case 'resource':
        return {
          title: 'MOD Resource Limit Exceeded',
          message: `The MOD "${displayName}" exceeded resource limits (memory, CPU, or storage).`,
          suggestions: [
            'Close other applications to free up resources',
            'Check if the MOD has a memory leak',
            'Reduce MOD resource usage in settings',
            'Report the issue to the MOD developer',
          ],
        };

      case 'runtime':
      default:
        return {
          title: 'MOD Runtime Error',
          message: `The MOD "${displayName}" encountered an error during execution.`,
          suggestions: [
            'Try reloading the MOD',
            'Check the browser console for details',
            'Update the MOD to the latest version',
            'Report the error to the MOD developer',
          ],
        };
    }
  }

  override render(): ReactNode {
    const { hasError, error, errorInfo, isDisabled, timestamp } = this.state;
    const { children, fallback, modId, modName } = this.props;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const { title, message, suggestions } = this.renderErrorMessage();
      const displayName = modName || modId;

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: '2rem',
            margin: '1rem',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            color: '#92400e',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
              {title}
            </h3>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#78350f' }}>
              MOD ID: <code style={{ backgroundColor: '#fef3c7', padding: '0.125rem 0.25rem', borderRadius: '2px' }}>{modId}</code>
            </p>
            {timestamp && (
              <p style={{ margin: '0', fontSize: '0.75rem', color: '#78350f' }}>
                Error occurred at: {new Date(timestamp).toLocaleString()}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{message}</p>

            {isDevelopment && error && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#78350f' }}>
                  Technical Details (Development Only)
                </summary>
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
                    Error: {error.name}
                  </p>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                    {error.message}
                  </p>
                  <pre
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#fffbeb',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    {error.stack}
                  </pre>
                  {errorInfo?.componentStack && (
                    <>
                      <p style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
                        Component Stack:
                      </p>
                      <pre
                        style={{
                          marginTop: '0.25rem',
                          padding: '0.5rem',
                          backgroundColor: '#fffbeb',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: '200px',
                        }}
                      >
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              What you can do:
            </p>
            <ul style={{ margin: '0', paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {!isDisabled && (
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
                aria-label={`Retry loading MOD ${displayName}`}
              >
                Retry MOD
              </button>
            )}
            <button
              onClick={this.handleDisable}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: '1px solid #f59e0b',
                backgroundColor: 'white',
                color: '#f59e0b',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
              aria-label={`Disable MOD ${displayName}`}
            >
              {isDisabled ? 'MOD Disabled' : 'Disable MOD'}
            </button>
          </div>

          {isDisabled && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#fffbeb',
                borderRadius: '4px',
              }}
            >
              <p style={{ margin: '0', fontSize: '0.875rem', color: '#78350f' }}>
                ⚠️ This MOD has been disabled to prevent further errors. The rest of the application will continue to work normally.
              </p>
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}
