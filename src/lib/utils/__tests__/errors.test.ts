import { logError, tryCatch, tryCatchAsync } from '../errors';
import { AppError } from '../../errors/base';

describe('logError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log a simple error', () => {
    const error = new Error('test error');
    logError(error);
    expect(console.error).toHaveBeenCalled();
  });

  it('should log error with additional context', () => {
    const error = new Error('test error');
    logError(error, { operation: 'test', userId: 123 });
    expect(console.error).toHaveBeenCalled();
  });

  it('should extract context from AppError', () => {
    const appError = new AppError('app error', 'APP_ERROR', { field: 'name' });
    logError(appError, { operation: 'test' });
    expect(console.error).toHaveBeenCalled();
  });
});

describe('tryCatch', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return result when function succeeds', () => {
    const result = tryCatch(() => 42, { operation: 'test' });
    expect(result).toBe(42);
  });

  it('should return fallback when function throws and fallback is provided', () => {
    const result = tryCatch(
      () => { throw new Error('fail'); },
      { operation: 'test' },
      'fallback'
    );
    expect(result).toBe('fallback');
  });

  it('should re-throw when function throws and no fallback', () => {
    expect(() => {
      tryCatch(
        () => { throw new Error('critical'); },
        { operation: 'test' }
      );
    }).toThrow('critical');
  });

  it('should log error on failure', () => {
    tryCatch(
      () => { throw new Error('fail'); },
      { operation: 'test' },
      'fallback'
    );
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle non-Error thrown values', () => {
    const result = tryCatch(
      () => { throw 'string error'; },
      { operation: 'test' },
      'fallback'
    );
    expect(result).toBe('fallback');
  });

  it('should preserve function return type with fallback', () => {
    const result = tryCatch(
      () => JSON.parse('{"key": "value"}'),
      { operation: 'parse' },
      {}
    );
    expect(result).toEqual({ key: 'value' });
  });

  it('should use fallback on parse error', () => {
    const result = tryCatch(
      () => JSON.parse('invalid json'),
      { operation: 'parse' },
      { default: true }
    );
    expect(result).toEqual({ default: true });
  });
});

describe('tryCatchAsync', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return result when async function succeeds', async () => {
    const result = await tryCatchAsync(
      () => Promise.resolve(42),
      { operation: 'test' }
    );
    expect(result).toBe(42);
  });

  it('should return fallback when async function rejects with fallback', async () => {
    const result = await tryCatchAsync(
      () => Promise.reject(new Error('fail')),
      { operation: 'test' },
      'fallback'
    );
    expect(result).toBe('fallback');
  });

  it('should re-throw when async function rejects without fallback', async () => {
    await expect(
      tryCatchAsync(
        () => Promise.reject(new Error('critical')),
        { operation: 'test' }
      )
    ).rejects.toThrow('critical');
  });

  it('should log error on async failure', async () => {
    await tryCatchAsync(
      () => Promise.reject(new Error('fail')),
      { operation: 'test' },
      'fallback'
    );
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle non-Error rejection values', async () => {
    const result = await tryCatchAsync(
      () => Promise.reject('string error'),
      { operation: 'test' },
      'fallback'
    );
    expect(result).toBe('fallback');
  });

  it('should await the promise before returning', async () => {
    const result = await tryCatchAsync(
      () => Promise.resolve('delayed'),
      { operation: 'test' }
    );
    expect(result).toBe('delayed');
  });

  it('should work with AppError rejection', async () => {
    const context = { field: 'name' };
    const result = await tryCatchAsync(
      () => Promise.reject(new AppError('validation failed', 'VALIDATION_ERROR', context)),
      { operation: 'validate' },
      null
    );
    expect(result).toBeNull();
  });
});
