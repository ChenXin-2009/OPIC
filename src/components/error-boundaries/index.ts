/**
 * Error Boundaries Module
 * 
 * Specialized error boundary components for different parts of the application.
 * Each boundary provides tailored error handling and recovery strategies.
 * 
 * @module error-boundaries
 */

export { CanvasErrorBoundary } from './CanvasErrorBoundary';
export type { CanvasErrorBoundaryProps } from './CanvasErrorBoundary';

export { DataLoadingErrorBoundary } from './DataLoadingErrorBoundary';
export type { DataLoadingErrorBoundaryProps, RetryStrategy } from './DataLoadingErrorBoundary';

export { ModErrorBoundary } from './ModErrorBoundary';
export type { ModErrorBoundaryProps } from './ModErrorBoundary';
