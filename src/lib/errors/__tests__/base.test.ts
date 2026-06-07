import { AppError, ConvergenceError, TextureLoadError, ValidationError, RenderError } from '../base';

describe('AppError', () => {
  it('should create error with message and code', () => {
    const error = new AppError('test message', 'TEST_CODE');
    expect(error.message).toBe('test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('AppError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should create error with context', () => {
    const context = { userId: 123, action: 'test' };
    const error = new AppError('test message', 'TEST_CODE', context);
    expect(error.context).toEqual(context);
  });

  it('should create error without context', () => {
    const error = new AppError('test message', 'TEST_CODE');
    expect(error.context).toBeUndefined();
  });

  it('should have a stack trace', () => {
    const error = new AppError('test message', 'TEST_CODE');
    expect(error.stack).toBeDefined();
  });
});

describe('ConvergenceError', () => {
  it('should create with CONVERGENCE_ERROR code', () => {
    const error = new ConvergenceError('Failed to converge');
    expect(error.message).toBe('Failed to converge');
    expect(error.code).toBe('CONVERGENCE_ERROR');
    expect(error.name).toBe('ConvergenceError');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should create with context', () => {
    const context = { iterations: 100, tolerance: 1e-6 };
    const error = new ConvergenceError('Failed to converge', context);
    expect(error.context).toEqual(context);
  });
});

describe('TextureLoadError', () => {
  it('should create with TEXTURE_LOAD_ERROR code', () => {
    const error = new TextureLoadError('Failed to load texture');
    expect(error.message).toBe('Failed to load texture');
    expect(error.code).toBe('TEXTURE_LOAD_ERROR');
    expect(error.name).toBe('TextureLoadError');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should create with context about file path', () => {
    const context = { path: '/textures/earth.jpg', status: 404 };
    const error = new TextureLoadError('Failed to load texture', context);
    expect(error.context).toEqual(context);
  });
});

describe('ValidationError', () => {
  it('should create with VALIDATION_ERROR code', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should create with context about invalid values', () => {
    const context = { fieldName: 'age', value: -1 };
    const error = new ValidationError('Invalid input', context);
    expect(error.context).toEqual(context);
  });
});

describe('RenderError', () => {
  it('should create with RENDER_ERROR code', () => {
    const error = new RenderError('Failed to render');
    expect(error.message).toBe('Failed to render');
    expect(error.code).toBe('RENDER_ERROR');
    expect(error.name).toBe('RenderError');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should create with context about WebGL', () => {
    const context = { canvas: '<canvas>', error: 'WebGL not supported' };
    const error = new RenderError('Failed to render', context);
    expect(error.context).toEqual(context);
  });
});
