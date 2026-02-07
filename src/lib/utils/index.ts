/**
 * Utility Functions Index
 * 
 * This module exports shared utility functions used throughout the application,
 * including mathematical operations, validation, and error handling.
 */

// Mathematical utilities
export {
  clamp,
  lerp,
  smoothstep,
  degreesToRadians,
  radiansToDegrees,
  wrapAngle,
  wrapAngleSigned,
  normalize,
  mod,
  approxEqual,
  square,
  distance2D,
  distance3D
} from './math';

// Validation utilities
export {
  validateNumber,
  validateRange,
  validateRequired,
  validateString,
  validateDate,
  validateArray,
  validatePositive,
  validateNonNegative
} from './validation';

// Error handling utilities
export {
  tryCatch,
  tryCatchAsync,
  logError
} from './errors';
