import {
  ModError, CircularDependencyError, VersionMismatchError,
  ManifestValidationError, DuplicateIdError, MissingDependencyError,
  LifecycleError, RenderError, ApiError,
} from '../ModError';

describe('ModError', () => {
  it('should construct with type, modId, and message', () => {
    const err = new ModError('validation_error', 'test-mod', 'something failed');
    expect(err.message).toContain('test-mod');
    expect(err.type).toBe('validation_error');
    expect(err.modId).toBe('test-mod');
    expect(err.name).toBe('ModError');
  });

  it('should accept optional cause', () => {
    const cause = new Error('root cause');
    const err = new ModError('validation_error', 'test-mod', 'failed', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('CircularDependencyError', () => {
  it('should construct with modId and cycles', () => {
    const err = new CircularDependencyError('mod1', [['a', 'b', 'c']]);
    expect(err.message).toContain('mod1');
    expect(err.cycles).toEqual([['a', 'b', 'c']]);
    expect(err.name).toBe('CircularDependencyError');
  });
});

describe('VersionMismatchError', () => {
  it('should construct with version info', () => {
    const err = new VersionMismatchError('mod1', '1.0.0', '0.9.0');
    expect(err.message).toContain('1.0.0');
    expect(err.required).toBe('1.0.0');
    expect(err.current).toBe('0.9.0');
    expect(err.name).toBe('VersionMismatchError');
  });
});

describe('ManifestValidationError', () => {
  it('should construct with errors array', () => {
    const errors = [{ field: 'name', message: 'required' }];
    const err = new ManifestValidationError('mod1', errors);
    expect(err.message).toContain('name');
    expect(err.errors).toEqual(errors);
    expect(err.name).toBe('ManifestValidationError');
  });
});

describe('DuplicateIdError', () => {
  it('should construct with modId', () => {
    const err = new DuplicateIdError('mod1');
    expect(err.message).toContain('mod1');
    expect(err.name).toBe('DuplicateIdError');
  });
});

describe('MissingDependencyError', () => {
  it('should construct with missing dependencies', () => {
    const err = new MissingDependencyError('mod1', ['dep1', 'dep2']);
    expect(err.message).toContain('dep1');
    expect(err.missingDependencies).toEqual(['dep1', 'dep2']);
    expect(err.name).toBe('MissingDependencyError');
  });
});

describe('LifecycleError', () => {
  it('should construct with hook name', () => {
    const err = new LifecycleError('mod1', 'onInit');
    expect(err.message).toContain('onInit');
    expect(err.hook).toBe('onInit');
    expect(err.name).toBe('LifecycleError');
  });
});

describe('RenderError', () => {
  it('should construct with rendererId', () => {
    const err = new RenderError('mod1', 'renderer-1');
    expect(err.message).toContain('renderer-1');
    expect(err.rendererId).toBe('renderer-1');
    expect(err.name).toBe('RenderError');
  });
});

describe('ApiError', () => {
  it('should construct with apiName', () => {
    const err = new ApiError('mod1', 'getPosition');
    expect(err.message).toContain('getPosition');
    expect(err.apiName).toBe('getPosition');
    expect(err.name).toBe('ApiError');
  });
});
