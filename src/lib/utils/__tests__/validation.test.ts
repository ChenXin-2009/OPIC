import {
  validateNumber,
  validateRange,
  validateRequired,
  validateString,
  validateDate,
  validateArray,
  validatePositive,
  validateNonNegative,
} from '../validation';
import { ValidationError } from '../../errors/base';

describe('validateNumber', () => {
  it('should return the number for valid finite numbers', () => {
    expect(validateNumber(42, 'field')).toBe(42);
    expect(validateNumber(0, 'field')).toBe(0);
    expect(validateNumber(-1, 'field')).toBe(-1);
    expect(validateNumber(3.14, 'field')).toBe(3.14);
  });

  it('should throw ValidationError for NaN', () => {
    expect(() => validateNumber(NaN, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for Infinity', () => {
    expect(() => validateNumber(Infinity, 'field')).toThrow(ValidationError);
    expect(() => validateNumber(-Infinity, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-number types', () => {
    expect(() => validateNumber('42', 'field')).toThrow(ValidationError);
    expect(() => validateNumber(null, 'field')).toThrow(ValidationError);
    expect(() => validateNumber(undefined, 'field')).toThrow(ValidationError);
    expect(() => validateNumber({}, 'field')).toThrow(ValidationError);
  });
});

describe('validateRange', () => {
  it('should return the number when within range', () => {
    expect(validateRange(5, 0, 10, 'field')).toBe(5);
    expect(validateRange(0, 0, 10, 'field')).toBe(0);
    expect(validateRange(10, 0, 10, 'field')).toBe(10);
  });

  it('should throw ValidationError when below minimum', () => {
    expect(() => validateRange(-1, 0, 10, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError when above maximum', () => {
    expect(() => validateRange(11, 0, 10, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-number values', () => {
    expect(() => validateRange('abc', 0, 10, 'field')).toThrow(ValidationError);
  });
});

describe('validateRequired', () => {
  it('should return the value when not null/undefined', () => {
    expect(validateRequired('hello', 'field')).toBe('hello');
    expect(validateRequired(0, 'field')).toBe(0);
    expect(validateRequired(false, 'field')).toBe(false);
    expect(validateRequired([], 'field')).toEqual([]);
    expect(validateRequired({}, 'field')).toEqual({});
  });

  it('should throw ValidationError for null', () => {
    expect(() => validateRequired(null, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for undefined', () => {
    expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError);
  });
});

describe('validateString', () => {
  it('should return trimmed string for valid non-empty strings', () => {
    expect(validateString('hello', 'field')).toBe('hello');
    expect(validateString('  hello  ', 'field')).toBe('hello');
  });

  it('should throw ValidationError for empty string', () => {
    expect(() => validateString('', 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for whitespace-only string', () => {
    expect(() => validateString('   ', 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-string values', () => {
    expect(() => validateString(123, 'field')).toThrow(ValidationError);
    expect(() => validateString(null, 'field')).toThrow(ValidationError);
    expect(() => validateString(undefined, 'field')).toThrow(ValidationError);
  });
});

describe('validateDate', () => {
  it('should return Date for valid Date objects', () => {
    const date = new Date('2024-01-01');
    expect(validateDate(date, 'field')).toEqual(date);
  });

  it('should return Date for valid date strings', () => {
    const result = validateDate('2024-01-01', 'field');
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(new Date('2024-01-01').getTime());
  });

  it('should throw ValidationError for invalid dates', () => {
    expect(() => validateDate('not-a-date', 'field')).toThrow(ValidationError);
    expect(() => validateDate(undefined, 'field')).toThrow(ValidationError);
  });
});

describe('validateArray', () => {
  it('should return the array for non-empty arrays', () => {
    expect(validateArray([1], 'field')).toEqual([1]);
    expect(validateArray(['a', 'b'], 'field')).toEqual(['a', 'b']);
  });

  it('should throw ValidationError for empty array', () => {
    expect(() => validateArray([], 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-array values', () => {
    expect(() => validateArray(null, 'field')).toThrow(ValidationError);
    expect(() => validateArray('string', 'field')).toThrow(ValidationError);
    expect(() => validateArray({}, 'field')).toThrow(ValidationError);
  });
});

describe('validatePositive', () => {
  it('should return the number for positive values', () => {
    expect(validatePositive(1, 'field')).toBe(1);
    expect(validatePositive(0.1, 'field')).toBe(0.1);
  });

  it('should throw ValidationError for zero', () => {
    expect(() => validatePositive(0, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for negative values', () => {
    expect(() => validatePositive(-1, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-number values', () => {
    expect(() => validatePositive('abc', 'field')).toThrow(ValidationError);
  });
});

describe('validateNonNegative', () => {
  it('should return the number for non-negative values', () => {
    expect(validateNonNegative(0, 'field')).toBe(0);
    expect(validateNonNegative(5, 'field')).toBe(5);
  });

  it('should throw ValidationError for negative values', () => {
    expect(() => validateNonNegative(-1, 'field')).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-number values', () => {
    expect(() => validateNonNegative('abc', 'field')).toThrow(ValidationError);
  });
});
