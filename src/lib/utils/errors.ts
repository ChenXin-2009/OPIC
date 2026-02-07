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
 * Can be replaced using setErrorLogger().
 */
let currentLogger: ErrorLogger = defaultLogger;

/**
 * Sets a custom error logger.
 * 
 * @param logger - Custom logger function
 * 
 * @example
 * ```typescript
 * setErrorLogger((error, context) => {
 *   myLoggingService.error(error, context);
 * });
 * ```
 */
export function setErrorLogger(logger: ErrorLogger): void {
  currentLogger = logger;
}

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
