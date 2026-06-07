'use client';

import React from 'react';
import { logger } from '@/utils/logger';

/**
 * Global Error Boundary for Next.js App
 * 
 * This is a Next.js app-level error boundary that catches errors not caught
 * by component-level boundaries. It handles:
 * - Critical app-level failures
 * - Layout errors
 * - Routing errors
 * - SSR/hydration mismatches
 * 
 * **Next.js Convention:**
 * - Must be named `error.tsx` in the app directory
 * - Must be a client component ('use client')
 * - Receives `error` and `reset` props automatically
 * 
 * @see Requirements 1.9
 */

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  React.useEffect(() => {
    // Log error to console
    console.error('[Global Error Boundary] App-level error caught:', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });

    if (isDevelopment) {
      console.error('Error stack:', error.stack);
    }
  }, [error, isDevelopment]);

  /**
   * Categorize error for better user messaging
   */
  const categorizeError = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes('hydration') || message.includes('hydrating')) {
      return 'hydration';
    }

    if (message.includes('layout') || message.includes('rendering')) {
      return 'layout';
    }

    if (message.includes('routing') || message.includes('navigation')) {
      return 'routing';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }

    return 'unknown';
  };

  /**
   * Get user-friendly error information
   */
  const getErrorInfo = (): {
    title: string;
    message: string;
    suggestions: string[];
  } => {
    const category = categorizeError(error);

    switch (category) {
      case 'hydration':
        return {
          title: 'Application Hydration Error',
          message:
            'The application encountered an error while loading. This usually happens when the server and client render differently.',
          suggestions: [
            'Try refreshing the page',
            'Clear your browser cache',
            'Disable browser extensions temporarily',
            'Try opening in an incognito/private window',
          ],
        };

      case 'layout':
        return {
          title: 'Layout Rendering Error',
          message: 'The application layout failed to render properly.',
          suggestions: [
            'Refresh the page to reload the layout',
            'Try navigating to the home page',
            'Clear browser cache and cookies',
            'Check your browser compatibility',
          ],
        };

      case 'routing':
        return {
          title: 'Navigation Error',
          message: 'An error occurred while navigating to this page.',
          suggestions: [
            'Go back and try again',
            'Navigate to the home page',
            'Check if the URL is correct',
            'Clear browser cache',
          ],
        };

      case 'network':
        return {
          title: 'Network Error',
          message: 'The application could not connect to the server.',
          suggestions: [
            'Check your internet connection',
            'Verify the server is accessible',
            'Try again in a few moments',
            'Disable VPN if enabled',
          ],
        };

      case 'unknown':
      default:
        return {
          title: 'Application Error',
          message: 'Something went wrong. We apologize for the inconvenience.',
          suggestions: [
            'Try refreshing the page',
            'Go back to the previous page',
            'Navigate to the home page',
            'Contact support if the problem persists',
          ],
        };
    }
  };

  const { title, message, suggestions } = getErrorInfo();

  /**
   * Handle retry action
   */
  const handleRetry = () => {
    logger.debug('[Global Error Boundary] User triggered retry');
    reset();
  };

  /**
   * Navigate to home page
   */
  const handleGoHome = () => {
    logger.debug('[Global Error Boundary] User navigating to home');
    window.location.href = '/';
  };

  /**
   * Reload the page
   */
  const handleReload = () => {
    logger.debug('[Global Error Boundary] User triggered page reload');
    window.location.reload();
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              padding: '2.5rem',
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1.875rem',
                fontWeight: 700,
                color: '#111827',
                textAlign: 'center',
              }}
            >
              {title}
            </h1>

            {/* Message */}
            <p
              style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1rem',
                color: '#4b5563',
                textAlign: 'center',
                lineHeight: '1.5',
              }}
            >
              {message}
            </p>

            {/* Error Digest (production only) */}
            {!isDevelopment && error.digest && (
              <div
                style={{
                  marginBottom: '1.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    margin: '0',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  Error Reference: <code style={{ fontFamily: 'monospace' }}>{error.digest}</code>
                </p>
              </div>
            )}

            {/* Development Details */}
            {isDevelopment && (
              <details
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#fef2f2',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#991b1b',
                    marginBottom: '0.5rem',
                  }}
                >
                  Technical Details (Development Only)
                </summary>
                <div>
                  <p
                    style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.875rem',
                      color: '#7f1d1d',
                      fontWeight: 600,
                    }}
                  >
                    {error.name}: {error.message}
                  </p>
                  {error.stack && (
                    <pre
                      style={{
                        margin: '0',
                        padding: '0.75rem',
                        backgroundColor: '#fff1f2',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#7f1d1d',
                        overflow: 'auto',
                        maxHeight: '200px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Suggestions */}
            <div
              style={{
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                What you can do:
              </p>
              <ul
                style={{
                  margin: '0',
                  paddingLeft: '1.5rem',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={handleRetry}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                aria-label="Try again"
              >
                Try Again
              </button>

              <button
                onClick={handleReload}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
                aria-label="Reload page"
              >
                Reload Page
              </button>

              <button
                onClick={handleGoHome}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
                aria-label="Go to home page"
              >
                Go Home
              </button>
            </div>

            {/* Support Information */}
            <div
              style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: '0',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                }}
              >
                If this error persists, please contact support and provide the error reference
                {error.digest ? ` (${error.digest})` : ''}.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
