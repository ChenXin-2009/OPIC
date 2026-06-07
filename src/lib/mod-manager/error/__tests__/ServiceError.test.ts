import {
  ServiceError, ServiceNotFoundError, ServiceAccessDeniedError,
  ServiceIdConflictError, CircularDependencyError, ServiceInitializationError,
} from '../ServiceError';

describe('ServiceError', () => {
  it('should construct with message', () => {
    const err = new ServiceError('svc err');
    expect(err.message).toBe('svc err');
    expect(err.name).toBe('ServiceError');
  });

  it('should construct with serviceId and modId', () => {
    const err = new ServiceError('svc err', 'svc1', 'mod1');
    expect(err.serviceId).toBe('svc1');
    expect(err.modId).toBe('mod1');
  });
});

describe('ServiceNotFoundError', () => {
  it('should construct with serviceId', () => {
    const err = new ServiceNotFoundError('svc1');
    expect(err.message).toContain('svc1');
    expect(err.name).toBe('ServiceNotFoundError');
  });
});

describe('ServiceAccessDeniedError', () => {
  it('should construct with details', () => {
    const err = new ServiceAccessDeniedError('svc1', 'mod1', 'no permission');
    expect(err.message).toContain('mod1');
    expect(err.message).toContain('svc1');
    expect(err.reason).toBe('no permission');
    expect(err.name).toBe('ServiceAccessDeniedError');
  });
});

describe('ServiceIdConflictError', () => {
  it('should construct with serviceId', () => {
    const err = new ServiceIdConflictError('svc1');
    expect(err.message).toContain('svc1');
    expect(err.name).toBe('ServiceIdConflictError');
  });
});

describe('CircularDependencyError', () => {
  it('should construct with cycle array', () => {
    const err = new CircularDependencyError(['a', 'b', 'c']);
    expect(err.message).toContain('a');
    expect(err.cycle).toEqual(['a', 'b', 'c']);
    expect(err.name).toBe('CircularDependencyError');
  });
});

describe('ServiceInitializationError', () => {
  it('should construct with serviceId, modId, and original error', () => {
    const original = new Error('init failed');
    const err = new ServiceInitializationError('svc1', 'mod1', original);
    expect(err.message).toContain('svc1');
    expect(err.originalError).toBe(original);
    expect(err.name).toBe('ServiceInitializationError');
  });
});
