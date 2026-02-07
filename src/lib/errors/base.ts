/**
 * Base error class for application-specific errors.
 * 
 * Extends the native Error class to provide additional context
 * and error codes for better error handling and debugging.
 * 
 * @example
 * ```typescript
 * throw new AppError('Something went wrong', 'GENERIC_ERROR', { userId: 123 });
 * ```
 */
export class AppError extends Error {
  /**
   * Creates a new AppError instance.
   * 
   * @param message - Human-readable error message
   * @param code - Machine-readable error code for categorization
   * @param context - Optional additional context data for debugging
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a numerical computation fails to converge.
 * 
 * Commonly used in iterative algorithms like Kepler's equation solver
 * when the solution doesn't converge within the maximum iterations.
 * 
 * @example
 * ```typescript
 * throw new ConvergenceError(
 *   'Kepler equation failed to converge',
 *   { iterations: 100, tolerance: 1e-6 }
 * );
 * ```
 */
export class ConvergenceError extends AppError {
  /**
   * Creates a new ConvergenceError instance.
   * 
   * @param message - Description of the convergence failure
   * @param context - Optional context including iterations, tolerance, etc.
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONVERGENCE_ERROR', context);
  }
}

/**
 * Error thrown when texture loading fails.
 * 
 * Used in 3D rendering when texture files cannot be loaded,
 * allowing the application to fall back to default textures.
 * 
 * @example
 * ```typescript
 * throw new TextureLoadError(
 *   'Failed to load planet texture',
 *   { path: '/textures/earth.jpg', status: 404 }
 * );
 * ```
 */
export class TextureLoadError extends AppError {
  /**
   * Creates a new TextureLoadError instance.
   * 
   * @param message - Description of the texture loading failure
   * @param context - Optional context including file path, HTTP status, etc.
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TEXTURE_LOAD_ERROR', context);
  }
}

/**
 * Error thrown when input validation fails.
 * 
 * Used to indicate that user input or external data does not meet
 * the required validation criteria.
 * 
 * @example
 * ```typescript
 * throw new ValidationError(
 *   'Invalid date range',
 *   { startDate: '2024-01-01', endDate: '2023-01-01' }
 * );
 * ```
 */
export class ValidationError extends AppError {
  /**
   * Creates a new ValidationError instance.
   * 
   * @param message - Description of the validation failure
   * @param context - Optional context including invalid values, constraints, etc.
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Error thrown when 3D rendering operations fail.
 * 
 * Used to handle errors in Three.js rendering, scene management,
 * or WebGL operations without crashing the entire application.
 * 
 * @example
 * ```typescript
 * throw new RenderError(
 *   'Failed to initialize WebGL context',
 *   { canvas: canvasElement, error: glError }
 * );
 * ```
 */
export class RenderError extends AppError {
  /**
   * Creates a new RenderError instance.
   * 
   * @param message - Description of the rendering failure
   * @param context - Optional context including scene info, WebGL errors, etc.
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'RENDER_ERROR', context);
  }
}
