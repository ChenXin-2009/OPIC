'use client';

import type { ReactElement } from 'react';

/**
 * Props for error fallback components.
 */
export interface ErrorFallbackProps {
  /** Optional error message to display */
  message?: string;
  /** Optional title for the error display */
  title?: string;
  /** Optional callback to retry/reset */
  onRetry?: () => void;
  /** Optional flag to show retry button */
  showRetry?: boolean;
}

/**
 * Simple error fallback component for displaying user-friendly error messages.
 * 
 * Can be used as a fallback prop for ErrorBoundary or standalone
 * for displaying error states in components.
 * 
 * @param props - Component props
 * @returns Error fallback UI element
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorFallback message="Failed to load data" />
 * 
 * // With retry button
 * <ErrorFallback
 *   message="Failed to load 3D scene"
 *   onRetry={() => window.location.reload()}
 *   showRetry
 * />
 * 
 * // With custom title
 * <ErrorFallback
 *   title="Rendering Error"
 *   message="Unable to initialize WebGL context"
 * />
 * 
 * // As ErrorBoundary fallback
 * <ErrorBoundary fallback={<ErrorFallback message="Component failed to render" />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorFallback({
  message = 'An unexpected error occurred',
  title = 'Error',
  onRetry,
  showRetry = false,
}: ErrorFallbackProps): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        minHeight: '200px',
      }}
    >
      <div
        style={{
          fontSize: '3rem',
          marginBottom: '1rem',
        }}
      >
        ⚠️
      </div>
      
      <h3
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#dc2626',
        }}
      >
        {title}
      </h3>
      
      <p
        style={{
          margin: '0 0 1.5rem 0',
          color: '#6b7280',
          maxWidth: '400px',
        }}
      >
        {message}
      </p>

      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Compact error fallback for inline error states.
 * 
 * Displays a minimal error message suitable for small UI areas.
 * 
 * @param props - Component props
 * @returns Compact error UI element
 * 
 * @example
 * ```tsx
 * <CompactErrorFallback message="Failed to load" />
 * ```
 */
export function CompactErrorFallback({ message = 'Error' }: { message?: string }): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem',
        color: '#dc2626',
        fontSize: '0.875rem',
      }}
    >
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

/**
 * Full-page error fallback for critical errors.
 * 
 * Displays a centered error message that takes up the full viewport.
 * Suitable for top-level error boundaries.
 * 
 * @param props - Component props
 * @returns Full-page error UI element
 * 
 * @example
 * ```tsx
 * <FullPageErrorFallback
 *   title="Application Error"
 *   message="The application encountered a critical error"
 *   onRetry={() => window.location.reload()}
 * />
 * ```
 */
export function FullPageErrorFallback({
  message = 'An unexpected error occurred',
  title = 'Something went wrong',
  onRetry,
}: ErrorFallbackProps): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1.5rem',
        }}
      >
        ⚠️
      </div>
      
      <h1
        style={{
          margin: '0 0 1rem 0',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#111827',
        }}
      >
        {title}
      </h1>
      
      <p
        style={{
          margin: '0 0 2rem 0',
          fontSize: '1.125rem',
          color: '#6b7280',
          maxWidth: '500px',
        }}
      >
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          Reload Page
        </button>
      )}
    </div>
  );
}
