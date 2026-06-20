import { ensureError, logError, tryCatch, tryCatchAsync } from '../errors';
import { AppError } from '../../errors/base';

describe('logError', () => {
  it('should log simple errors without context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logError(new Error('test error'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log errors with context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logError(new Error('context error'), { key: 'value' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should extract context from AppError', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const appError = new AppError('app error', { appContext: 'test' });
    logError(appError, { extra: 'info' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('tryCatch', () => {
  it('should return function result on success', () => {
    const result = tryCatch(() => 42, {});
    expect(result).toBe(42);
  });

  it('should return fallback on error', () => {
    const result = tryCatch(() => { throw new Error('fail'); }, {}, 'fallback');
    expect(result).toBe('fallback');
  });

  it('should re-throw error without fallback', () => {
    expect(() => {
      tryCatch(() => { throw new Error('rethrow'); }, {});
    }).toThrow('rethrow');
  });

  it('should wrap non-Error throws', () => {
    const result = tryCatch(() => { throw 'string error'; }, {}, 'recovered');
    expect(result).toBe('recovered');
  });
});

describe('ensureError', () => {
  it('should return the same Error instance if already Error', () => {
    const original = new Error('test');
    const result = ensureError(original);
    expect(result).toBe(original);
  });

  it('should wrap a string into an Error', () => {
    const result = ensureError('something went wrong');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('something went wrong');
  });

  it('should wrap a non-Error object with cause', () => {
    const obj = { code: 42 };
    const result = ensureError(obj);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Unknown error');
    expect(result.cause).toBe(obj);
  });

  it('should wrap null with cause', () => {
    const result = ensureError(null);
    expect(result).toBeInstanceOf(Error);
  });

  it('should wrap undefined with cause', () => {
    const result = ensureError(undefined);
    expect(result).toBeInstanceOf(Error);
  });

  it('should wrap a number with cause', () => {
    const result = ensureError(404);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Unknown error');
    expect(result.cause).toBe(404);
  });
});

describe('tryCatchAsync', () => {
  it('should return function result on success', async () => {
    const result = await tryCatchAsync(() => Promise.resolve(42), {});
    expect(result).toBe(42);
  });

  it('should return fallback on error', async () => {
    const result = await tryCatchAsync(
      () => Promise.reject(new Error('async fail')),
      {},
      'fallback'
    );
    expect(result).toBe('fallback');
  });

  it('should re-throw without fallback', async () => {
    await expect(
      tryCatchAsync(() => Promise.reject(new Error('async rethrow')), {})
    ).rejects.toThrow('async rethrow');
  });
});
