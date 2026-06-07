import { SandboxError, QuotaExceededError, ResourceLeakError } from '../SandboxError';

describe('SandboxError', () => {
  it('should construct with message and modId', () => {
    const err = new SandboxError('sandbox issue', 'mod1');
    expect(err.message).toBe('sandbox issue');
    expect(err.modId).toBe('mod1');
    expect(err.name).toBe('SandboxError');
  });
});

describe('QuotaExceededError', () => {
  it('should construct with resource details', () => {
    const err = new QuotaExceededError('mod1', 'memory', 100, 200);
    expect(err.message).toContain('mod1');
    expect(err.message).toContain('memory');
    expect(err.resourceType).toBe('memory');
    expect(err.limit).toBe(100);
    expect(err.current).toBe(200);
    expect(err.name).toBe('QuotaExceededError');
  });
});

describe('ResourceLeakError', () => {
  it('should construct with resource type and count', () => {
    const err = new ResourceLeakError('mod1', 'sockets', 5);
    expect(err.message).toContain('sockets');
    expect(err.resourceType).toBe('sockets');
    expect(err.count).toBe(5);
    expect(err.name).toBe('ResourceLeakError');
  });
});
