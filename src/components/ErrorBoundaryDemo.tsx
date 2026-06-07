/**
 * Demo component to showcase ErrorBoundary functionality
 * 
 * This component demonstrates:
 * - Basic error catching
 * - Retry mechanism with 5-second delay
 * - Max 3 retries before cooldown
 * - 30-second cooldown period
 * - Countdown timers
 * - Environment-specific error display
 * 
 * Usage:
 * Navigate to /error-boundary-demo to see the demo
 */

'use client';

import React, { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { logger } from '@/utils/logger';

/**
 * Component that can throw errors on demand
 */
const ControlledErrorComponent: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('Demo error: This is a simulated error to test the ErrorBoundary');
  }

  return (
    <div className="p-6 bg-green-100 border-2 border-green-500 rounded-lg">
      <h3 className="text-xl font-bold text-green-800 mb-2">✓ Component Rendered Successfully</h3>
      <p className="text-green-700">
        The component is working normally. Click &quot;Trigger Error&quot; to simulate an error.
      </p>
    </div>
  );
};

/**
 * Demo page component
 */
export const ErrorBoundaryDemo: React.FC = () => {
  const [shouldError, setShouldError] = useState(false);
  const [key, setKey] = useState(0);

  const handleTriggerError = () => {
    setShouldError(true);
    // Force re-render by changing key
    setKey((prev) => prev + 1);
  };

  const handleReset = () => {
    setShouldError(false);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">
          ErrorBoundary Component Demo
        </h1>
        <p className="text-gray-600 mb-8">
          This demo showcases the enhanced ErrorBoundary component with retry mechanism, 
          countdown timers, and environment-specific error display.
        </p>

        {/* Feature List */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Catches JavaScript errors in child component trees</li>
            <li>✓ 5-second delay before retry attempts</li>
            <li>✓ Maximum 3 retry attempts</li>
            <li>✓ 30-second cooldown period after max retries</li>
            <li>✓ Visual countdown timers for delays and cooldown</li>
            <li>✓ Progress bars for visual feedback</li>
            <li>✓ Environment-specific error display (dev vs prod)</li>
            <li>✓ Detailed stack traces in development mode</li>
            <li>✓ Sanitized error messages in production mode</li>
            <li>✓ Console logging with timestamps</li>
          </ul>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Demo Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={handleTriggerError}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded transition-colors"
            >
              Trigger Error
            </button>
            <button
              onClick={handleReset}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors"
            >
              Reset Demo
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            <strong>Instructions:</strong>
          </p>
          <ol className="text-sm text-gray-600 mt-2 list-decimal list-inside space-y-1">
            <li>Click &quot;Trigger Error&quot; to throw an error</li>
            <li>Click &quot;Retry&quot; in the error UI to see the 5-second delay countdown</li>
            <li>The error will be thrown again (since we&apos;re still in error state)</li>
            <li>After 3 retry attempts, you&apos;ll see a 30-second cooldown</li>
            <li>Watch the countdown timer and progress bar</li>
            <li>Click &quot;Reset Demo&quot; above to start over</li>
          </ol>
        </div>

        {/* Error Boundary Demo Area */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Demo Area</h2>
          <ErrorBoundary
            key={key}
            componentName="ErrorBoundaryDemo"
            maxRetries={3}
            retryDelay={5000}
            cooldownPeriod={30000}
            onError={(error, errorInfo) => {
              logger.debug('Custom error handler called');
              logger.debug('Error:', { error });
              logger.debug('Error info:', { errorInfo });
            }}
          >
            <ControlledErrorComponent shouldError={shouldError} />
          </ErrorBoundary>
        </div>

        {/* Environment Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Environment Info</h2>
          <p className="text-gray-700">
            <strong>Current Environment:</strong>{' '}
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              {process.env.NODE_ENV}
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {process.env.NODE_ENV === 'development' ? (
              <>
                In development mode, you&apos;ll see detailed error information including 
                stack traces and component stacks.
              </>
            ) : (
              <>
                In production mode, error details are sanitized and sensitive information 
                is hidden.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundaryDemo;
