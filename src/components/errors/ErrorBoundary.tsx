'use client';

import { Component, ReactNode, ReactElement, ErrorInfo } from 'react';
import { logError } from '@/lib/utils/errors';

/**
 * Props for the ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional fallback UI to display when an error occurs */
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  /** Optional callback invoked when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional identifier for this error boundary (for logging) */
  boundaryId?: string;
}

/**
 * State for the ErrorBoundary component.
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error, if any */
  error: Error | null;
  /** Additional error information from React */
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component that catches React rendering errors.
 * 
 * Prevents errors in child components from crashing the entire application.
 * Displays a fallback UI and logs errors for debugging.
 * 
 * @example
 * ```tsx
 * // Basic usage with default fallback
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * // With custom fallback
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * // With error callback
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     sendToErrorTracking(error, errorInfo);
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * // With function fallback for custom error display
 * <ErrorBoundary
 *   fallback={(error, errorInfo) => (
 *     <ErrorDisplay error={error} info={errorInfo} />
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method called when an error is thrown during rendering.
   * Updates state to trigger fallback UI rendering.
   * 
   * @param error - The error that was thrown
   * @returns New state with error information
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error is caught.
   * Logs the error and invokes the optional onError callback.
   * 
   * @param error - The error that was thrown
   * @param errorInfo - Additional information about the error (component stack)
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo });

    // Log the error with context
    logError(error, {
      boundaryId: this.props.boundaryId,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Resets the error boundary state, allowing retry.
   * Can be called from fallback UI to attempt re-rendering.
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  override render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, errorInfo!);
        }
        return fallback;
      }

      // Render default fallback
      return <DefaultErrorFallback error={error} errorInfo={errorInfo} onReset={this.resetError} />;
    }

    // No error, render children normally
    return children;
  }
}

/**
 * Props for the DefaultErrorFallback component.
 */
interface DefaultErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Additional error information */
  errorInfo: ErrorInfo | null;
  /** Optional callback to reset the error boundary */
  onReset?: () => void;
}

/**
 * Default fallback UI displayed when an error is caught.
 * 
 * Shows a user-friendly error message with optional details
 * and a retry button in development mode.
 * 
 * @param props - Component props
 * @returns Fallback UI element
 */
function DefaultErrorFallback({ error, errorInfo, onReset }: DefaultErrorFallbackProps): ReactElement {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div
      style={{
        padding: '2rem',
        margin: '1rem',
        border: '2px solid #ef4444',
        borderRadius: '0.5rem',
        backgroundColor: '#fef2f2',
        color: '#991b1b',
      }}
    >
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
        Something went wrong
      </h2>
      
      <p style={{ margin: '0 0 1rem 0' }}>
        An error occurred while rendering this component. Please try refreshing the page.
      </p>

      {isDevelopment && (
        <>
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Error Details
            </summary>
            <pre
              style={{
                padding: '1rem',
                backgroundColor: '#fff',
                border: '1px solid #fca5a5',
                borderRadius: '0.25rem',
                overflow: 'auto',
                fontSize: '0.875rem',
              }}
            >
              {error.toString()}
            </pre>
          </details>

          {errorInfo?.componentStack && (
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Component Stack
              </summary>
              <pre
                style={{
                  padding: '1rem',
                  backgroundColor: '#fff',
                  border: '1px solid #fca5a5',
                  borderRadius: '0.25rem',
                  overflow: 'auto',
                  fontSize: '0.875rem',
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </>
      )}

      {onReset && (
        <button
          onClick={onReset}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
