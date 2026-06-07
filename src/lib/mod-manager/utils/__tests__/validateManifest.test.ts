import { validateManifest, isValidManifest } from '../validateManifest';

describe('validateManifest', () => {
  it('should return invalid for non-object input', () => {
    const result = validateManifest(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('root');
  });

  it('should return invalid for array input', () => {
    const result = validateManifest([]);
    expect(result.valid).toBe(false);
  });

  it('should return invalid for string input', () => {
    const result = validateManifest('foo');
    expect(result.valid).toBe(false);
  });

  it('should return invalid when missing required fields', () => {
    const result = validateManifest({});
    expect(result.valid).toBe(false);
    const fields = result.errors.map(e => e.field);
    expect(fields).toContain('id');
    expect(fields).toContain('version');
    expect(fields).toContain('name');
    expect(fields).toContain('entryPoint');
  });

  it('should return invalid when a required field has wrong type', () => {
    const result = validateManifest({ id: 123, version: '1.0.0', name: 'test', entryPoint: 'main' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('should validate id format (kebab-case)', () => {
    const base = { id: 'valid-id', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    expect(validateManifest(base).valid).toBe(true);

    const bad = validateManifest({ ...base, id: 'Invalid_ID' });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('should reject id longer than 100 chars', () => {
    const result = validateManifest({ id: 'a'.repeat(101), version: '1.0.0', name: 'Test', entryPoint: 'main' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('100'))).toBe(true);
  });

  it('should validate version format (semver)', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    expect(validateManifest(base).valid).toBe(true);

    const bad = validateManifest({ ...base, version: 'abc' });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some(e => e.field === 'version')).toBe(true);
  });

  it('should accept valid optional fields', () => {
    const manifest = {
      id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main',
      description: 'A test mod', author: 'Me', hasConfig: true, defaultEnabled: false,
    };
    expect(validateManifest(manifest).valid).toBe(true);
  });

  it('should validate apiVersion format when present', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, apiVersion: '2.0.0' });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, apiVersion: '2' });
    expect(bad.errors.some(e => e.field === 'apiVersion')).toBe(true);
  });

  it('should validate dependencies array', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, dependencies: [{ id: 'dep-1' }] });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, dependencies: 'not-array' });
    expect(bad.errors.some(e => e.field === 'dependencies')).toBe(true);
  });

  it('should validate dependency entries', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const result = validateManifest({ ...base, dependencies: [{ optional: 'not-boolean' }] });
    expect(result.errors.some(e => e.field.includes('dependencies'))).toBe(true);
  });

  it('should validate capabilities array', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, capabilities: [{ name: 'render', required: true }] });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, capabilities: 'bad' });
    expect(bad.errors.some(e => e.field === 'capabilities')).toBe(true);
  });

  it('should validate permissions', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, permissions: ['time:read'] });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, permissions: ['invalid_format'] });
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('should validate optionalPermissions', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, optionalPermissions: ['camera:write'] });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, optionalPermissions: 'string' });
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('should validate contributes structure', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const result = validateManifest({ ...base, contributes: { dockIcons: 'invalid' } });
    expect(result.errors.some(e => e.field === 'contributes.dockIcons')).toBe(true);
  });

  it('should validate dockIcons', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, contributes: { dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'cmd' }] } });
    expect(ok.valid).toBe(true);
  });

  it('should validate windows', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const result = validateManifest({ ...base, contributes: { windows: 'bad' } });
    expect(result.errors.some(e => e.field === 'contributes.windows')).toBe(true);
  });

  it('should validate commands', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const bad = validateManifest({ ...base, contributes: { commands: ['not-object'] } });
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('should validate configSchema', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, configSchema: { type: 'object' } });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, configSchema: 'string' });
    expect(bad.errors.some(e => e.field === 'configSchema')).toBe(true);
  });

  it('should validate services', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, services: [{ id: 'svc1', interface: 'IService' }] });
    expect(ok.valid).toBe(true);
  });

  it('should validate services with visibility', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, services: [{ id: 'svc1', interface: 'IService', visibility: 'public' }] });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, services: [{ id: 'svc1', interface: 'IService', visibility: 'unknown' }] });
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('should validate resourceQuota', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const ok = validateManifest({ ...base, resourceQuota: { maxMemoryMB: 100 } });
    expect(ok.valid).toBe(true);

    const bad = validateManifest({ ...base, resourceQuota: 'string' });
    expect(bad.errors.some(e => e.field === 'resourceQuota')).toBe(true);
  });

  it('should validate resourceQuota field types', () => {
    const base = { id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' };
    const result = validateManifest({ ...base, resourceQuota: { maxMemoryMB: -1 } });
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('isValidManifest', () => {
  it('should return true for valid manifest', () => {
    expect(isValidManifest({ id: 'test', version: '1.0.0', name: 'Test', entryPoint: 'main' })).toBe(true);
  });

  it('should return false for invalid manifest', () => {
    expect(isValidManifest(null)).toBe(false);
  });
});
