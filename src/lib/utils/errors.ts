/**
 * 错误处理工具 (Error Handling Utilities)
 *
 * 提供统一的错误记录和重试机制。
 *
 * 工具函数：
 * - withRetry: 带指数退避的自动重试执行器
 * - handleError: 统一错误处理器（记录日志 + 分类处理）
 * - ErrorLogger: 可自定义的错误日志接口
 */

import { AppError } from '../errors/base';

/**
 * Logger function type for error logging.
 * Can be customized to integrate with different logging systems.
 */
export type ErrorLogger = (error: Error, context?: Record<string, unknown>) => void;

/**
 * Default error logger that logs to console.
 * In production, this should be replaced with a proper logging service.
 * 
 * @param error - The error to log
 * @param context - Additional context information
 */
const defaultLogger: ErrorLogger = (error: Error, context?: Record<string, unknown>) => {
  console.error('[Error]', error.name, ':', error.message);
  if (context) {
    console.error('[Context]', context);
  }
  if (error.stack) {
    console.error('[Stack]', error.stack);
  }
};

/**
 * Current error logger instance.
 */
const currentLogger: ErrorLogger = defaultLogger;

/**
 * Logs an error with optional context information.
 * 
 * Uses the configured error logger (default: console.error).
 * Automatically extracts context from AppError instances.
 * 
 * @param error - The error to log
 * @param additionalContext - Additional context to include in the log
 * 
 * @example
 * ```typescript
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   logError(error instanceof Error ? error : new Error(String(error)), {
 *     operation: 'riskyOperation',
 *     userId: currentUser.id
 *   });
 * }
 * ```
 */
export function logError(error: Error, additionalContext?: Record<string, unknown>): void {
  const context = {
    ...additionalContext,
    ...(error instanceof AppError ? error.context : {}),
  };
  
  currentLogger(error, context);
}

/**
 * Wraps a synchronous function with try-catch error handling.
 * 
 * Executes the function and catches any errors, logging them with context.
 * Can optionally return a fallback value on error.
 * 
 * @param fn - The function to execute
 * @param context - Context information for error logging
 * @param fallback - Optional fallback value to return on error
 * @returns The function result or fallback value
 * @throws Re-throws the error after logging (unless fallback is provided)
 * 
 * @example
 * ```typescript
 * // With fallback value
 * const result = tryCatch(
 *   () => JSON.parse(userInput),
 *   { operation: 'parseJSON', input: userInput },
 *   {} // fallback to empty object
 * );
 * 
 * // Without fallback (re-throws)
 * const result = tryCatch(
 *   () => criticalOperation(),
 *   { operation: 'criticalOperation' }
 * );
 * ```
 */
export function tryCatch<T>(
  fn: () => T,
  context: Record<string, unknown>,
  fallback?: T
): T {
  try {
    return fn();
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}

/**
 * Wraps an asynchronous function with try-catch error handling.
 * 
 * Executes the async function and catches any errors, logging them with context.
 * Can optionally return a fallback value on error.
 * 
 * @param fn - The async function to execute
 * @param context - Context information for error logging
 * @param fallback - Optional fallback value to return on error
 * @returns Promise resolving to the function result or fallback value
 * @throws Re-throws the error after logging (unless fallback is provided)
 * 
 * @example
 * ```typescript
 * // With fallback value
 * const data = await tryCatchAsync(
 *   () => fetchUserData(userId),
 *   { operation: 'fetchUserData', userId },
 *   null // fallback to null
 * );
 * 
 * // Without fallback (re-throws)
 * const data = await tryCatchAsync(
 *   () => criticalAsyncOperation(),
 *   { operation: 'criticalAsyncOperation' }
 * );
 * ```
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  context: Record<string, unknown>,
  fallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}
