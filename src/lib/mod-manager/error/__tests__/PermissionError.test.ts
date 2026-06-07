import { PermissionError, PermissionDeniedError, InvalidPermissionError } from '../PermissionError';

describe('PermissionError', () => {
  it('should construct with message, modId, and permission', () => {
    const err = new PermissionError('test msg', 'mod1', 'read');
    expect(err.message).toBe('test msg');
    expect(err.modId).toBe('mod1');
    expect(err.permission).toBe('read');
    expect(err.name).toBe('PermissionError');
  });
});

describe('PermissionDeniedError', () => {
  it('should construct without reason', () => {
    const err = new PermissionDeniedError('mod1', 'write');
    expect(err.message).toContain('mod1');
    expect(err.message).toContain('write');
    expect(err.name).toBe('PermissionDeniedError');
  });

  it('should construct with reason', () => {
    const err = new PermissionDeniedError('mod1', 'write', 'not allowed');
    expect(err.message).toContain('not allowed');
  });
});

describe('InvalidPermissionError', () => {
  it('should construct with modId, permission, and reason', () => {
    const err = new InvalidPermissionError('mod1', 'admin', 'bad format');
    expect(err.message).toContain('mod1');
    expect(err.message).toContain('admin');
    expect(err.message).toContain('bad format');
    expect(err.name).toBe('InvalidPermissionError');
  });
});
