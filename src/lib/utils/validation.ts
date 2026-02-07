import { ValidationError } from '../errors/base';

/**
 * Validates that a value is a finite number.
 * 
 * Checks if the value is a number and not NaN or Infinity.
 * Throws ValidationError if validation fails.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated number
 * @throws {ValidationError} If value is not a finite number
 * 
 * @example
 * ```typescript
 * const age = validateNumber(userInput.age, 'age');
 * // Throws if age is NaN, Infinity, or not a number
 * ```
 */
export function validateNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(
      `${fieldName} must be a finite number`,
      { fieldName, value, type: typeof value }
    );
  }
  return value;
}

/**
 * Validates that a number is within a specified range.
 * 
 * Checks if the value is between min and max (inclusive).
 * Throws ValidationError if validation fails.
 * 
 * @param value - The number to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param fieldName - Name of the field for error messages
 * @returns The validated number
 * @throws {ValidationError} If value is not a finite number or outside range
 * 
 * @example
 * ```typescript
 * const opacity = validateRange(userInput.opacity, 0, 1, 'opacity');
 * // Throws if opacity is not between 0 and 1
 * ```
 */
export function validateRange(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
): number {
  const num = validateNumber(value, fieldName);
  
  if (num < min || num > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      { fieldName, value: num, min, max }
    );
  }
  
  return num;
}

/**
 * Validates that a value is not null or undefined.
 * 
 * Checks if the value is defined and not null.
 * Throws ValidationError if validation fails.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated value
 * @throws {ValidationError} If value is null or undefined
 * 
 * @example
 * ```typescript
 * const userId = validateRequired(request.userId, 'userId');
 * // Throws if userId is null or undefined
 * ```
 */
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(
      `${fieldName} is required`,
      { fieldName, value }
    );
  }
  return value;
}

/**
 * Validates that a value is a non-empty string.
 * 
 * Checks if the value is a string with at least one non-whitespace character.
 * Throws ValidationError if validation fails.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated string (trimmed)
 * @throws {ValidationError} If value is not a non-empty string
 * 
 * @example
 * ```typescript
 * const name = validateString(userInput.name, 'name');
 * // Throws if name is not a string or is empty/whitespace
 * ```
 */
export function validateString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(
      `${fieldName} must be a non-empty string`,
      { fieldName, value, type: typeof value }
    );
  }
  return value.trim();
}

/**
 * Validates that a value is a valid Date object or date string.
 * 
 * Checks if the value can be converted to a valid Date.
 * Throws ValidationError if validation fails.
 * 
 * @param value - The value to validate (Date object or date string)
 * @param fieldName - Name of the field for error messages
 * @returns The validated Date object
 * @throws {ValidationError} If value cannot be converted to a valid Date
 * 
 * @example
 * ```typescript
 * const startDate = validateDate(userInput.startDate, 'startDate');
 * // Throws if startDate is not a valid date
 * ```
 */
export function validateDate(value: unknown, fieldName: string): Date {
  const date = value instanceof Date ? value : new Date(value as string);
  
  if (isNaN(date.getTime())) {
    throw new ValidationError(
      `${fieldName} must be a valid date`,
      { fieldName, value }
    );
  }
  
  return date;
}

/**
 * Validates that a value is an array with at least one element.
 * 
 * Checks if the value is an array and not empty.
 * Throws ValidationError if validation fails.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated array
 * @throws {ValidationError} If value is not a non-empty array
 * 
 * @example
 * ```typescript
 * const items = validateArray(userInput.items, 'items');
 * // Throws if items is not an array or is empty
 * ```
 */
export function validateArray<T>(value: unknown, fieldName: string): T[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(
      `${fieldName} must be a non-empty array`,
      { fieldName, value, isArray: Array.isArray(value) }
    );
  }
  return value;
}

/**
 * Validates that a number is positive (greater than zero).
 * 
 * Checks if the value is a finite number and greater than zero.
 * Throws ValidationError if validation fails.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated positive number
 * @throws {ValidationError} If value is not a positive number
 * 
 * @example
 * ```typescript
 * const radius = validatePositive(planetData.radius, 'radius');
 * // Throws if radius is not positive
 * ```
 */
export function validatePositive(value: unknown, fieldName: string): number {
  const num = validateNumber(value, fieldName);
  
  if (num <= 0) {
    throw new ValidationError(
      `${fieldName} must be positive`,
      { fieldName, value: num }
    );
  }
  
  return num;
}

/**
 * Validates that a number is non-negative (greater than or equal to zero).
 * 
 * Checks if the value is a finite number and not negative.
 * Throws ValidationError if validation fails.
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated non-negative number
 * @throws {ValidationError} If value is negative
 * 
 * @example
 * ```typescript
 * const distance = validateNonNegative(userInput.distance, 'distance');
 * // Throws if distance is negative
 * ```
 */
export function validateNonNegative(value: unknown, fieldName: string): number {
  const num = validateNumber(value, fieldName);
  
  if (num < 0) {
    throw new ValidationError(
      `${fieldName} must be non-negative`,
      { fieldName, value: num }
    );
  }
  
  return num;
}
