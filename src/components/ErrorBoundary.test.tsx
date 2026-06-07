/**
 * Tests for ErrorBoundary component
 * 
 * Tests cover:
 * - Basic error catching
 * - Retry mechanism with 5-second delay
 * - Maximum retry limit (3 attempts)
 * - 30-second cooldown after max retries
 * - Countdown timers display
 * - Environment-specific error display
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Success</div>;
};

// Mock console.error to avoid cluttering test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

// Clean up timers after each test
afterEach(() => {
  jest.clearAllTimers();
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('catches errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/encountered an unexpected error/i)).toBeInTheDocument();
  });

  test('displays timestamp when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should display a timestamp (checking for date/time pattern - matches formats like "2026/6/7 16:04:46")
    const timestampElement = screen.getByText(/\d{4}\/\d{1,2}\/\d{1,2}/);
    expect(timestampElement).toBeInTheDocument();
  });

  test('retry button initiates 5-second delay', async () => {
    const user = userEvent.setup({ delay: null });

    const { rerender } = render(
      <ErrorBoundary retryDelay={5000}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    
    await act(async () => {
      await user.click(retryButton);
    });

    // Should show retrying message
    await waitFor(() => {
      expect(screen.getByText(/retrying in \d+ seconds/i)).toBeInTheDocument();
    });

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should attempt to reset error
    // (Component will re-render and throw again, which is expected in this test)
    await waitFor(() => {
      expect(screen.queryByText(/retrying in \d+ seconds/i)).not.toBeInTheDocument();
    });
  });

  test('displays countdown during retry delay', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ErrorBoundary retryDelay={5000}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    
    await act(async () => {
      await user.click(retryButton);
    });

    // Should show 5 seconds initially
    await waitFor(() => {
      expect(screen.getByText(/retrying in 5 seconds/i)).toBeInTheDocument();
    });

    // Advance 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should show 4 seconds
    await waitFor(() => {
      expect(screen.getByText(/retrying in 4 seconds/i)).toBeInTheDocument();
    });
  });

  test('tracks retry count', async () => {
    const user = userEvent.setup({ delay: null });

    const { rerender } = render(
      <ErrorBoundary retryDelay={5000} maxRetries={3}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });

    // First retry
    await act(async () => {
      await user.click(retryButton);
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should show retry count after first attempt
    await waitFor(() => {
      expect(screen.getByText(/retry attempts: 1 \/ 3/i)).toBeInTheDocument();
    });
  });

  test('enters cooldown after 3 failed retries', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ErrorBoundary retryDelay={5000} maxRetries={3} cooldownPeriod={30000}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Simulate 3 retry attempts
    for (let i = 0; i < 3; i++) {
      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      await act(async () => {
        await user.click(retryButton);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Wait for state update
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`retry attempts: ${i + 1} / 3`, 'i'))).toBeInTheDocument();
      });
    }

    // Fourth click should trigger cooldown
    const retryButton = screen.getByRole('button', { name: /retry/i });
    
    await act(async () => {
      await user.click(retryButton);
    });

    // Should show cooldown message
    await waitFor(() => {
      expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait \d+ seconds/i)).toBeInTheDocument();
    });

    // Retry button should be disabled
    expect(screen.getByRole('button', { name: /retry disabled/i })).toBeDisabled();
  });

  test('displays cooldown countdown', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ErrorBoundary retryDelay={5000} maxRetries={3} cooldownPeriod={30000}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Reach max retries
    for (let i = 0; i < 3; i++) {
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await act(async () => {
        await user.click(retryButton);
      });
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`retry attempts: ${i + 1} / 3`, 'i'))).toBeInTheDocument();
      });
    }

    // Trigger cooldown
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await act(async () => {
      await user.click(retryButton);
    });

    // Should show 30 seconds initially
    await waitFor(() => {
      expect(screen.getByText(/please wait 30 seconds/i)).toBeInTheDocument();
    });

    // Advance 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should show 29 seconds
    await waitFor(() => {
      expect(screen.getByText(/please wait 29 seconds/i)).toBeInTheDocument();
    });
  });

  test('re-enables retry after cooldown expires', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <ErrorBoundary retryDelay={5000} maxRetries={3} cooldownPeriod={30000}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Reach cooldown
    for (let i = 0; i < 4; i++) {
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await act(async () => {
        await user.click(retryButton);
      });
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      if (i < 3) {
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`retry attempts: ${i + 1} / 3`, 'i'))).toBeInTheDocument();
        });
      }
    }

    // Wait for cooldown message
    await waitFor(() => {
      expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
    });

    // Fast-forward through cooldown
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Retry button should be enabled again and retry count reset
    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /^retry$/i });
      expect(retryButton).not.toBeDisabled();
    });
  });

  test('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  test('displays component name in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary componentName="TestComponent">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error in TestComponent component/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('shows detailed error stack in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error details \(development mode\)/i)).toBeInTheDocument();
    expect(screen.getByText(/stack trace/i)).toBeInTheDocument();
    expect(screen.getByText(/component stack/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('hides sensitive details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary componentName="TestComponent">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show generic message
    expect(screen.getByText(/encountered an unexpected error/i)).toBeInTheDocument();

    // Should NOT show component name
    expect(screen.queryByText(/error in TestComponent component/i)).not.toBeInTheDocument();

    // Should NOT show detailed stack traces
    expect(screen.queryByText(/error details \(development mode\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('refresh button is present and enabled', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByRole('button', { name: /refresh page/i });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  test('uses custom fallback when provided', () => {
    const customFallback = <div>Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  test('logs error details to console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');

    render(
      <ErrorBoundary componentName="TestComponent">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('ErrorBoundary caught an error'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Component:'), 'TestComponent');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error message:'), 'Test error');
  });

  test('cleans up timers on unmount', async () => {
    const user = userEvent.setup({ delay: null });

    const { unmount } = render(
      <ErrorBoundary retryDelay={5000}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    
    await act(async () => {
      await user.click(retryButton);
    });

    // Unmount before delay completes
    unmount();

    // Advance timers - should not throw errors
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Test passes if no errors are thrown
  });
});
