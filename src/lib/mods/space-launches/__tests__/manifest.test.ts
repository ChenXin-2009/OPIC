import { spaceLaunchesManifest } from '../manifest';

describe('spaceLaunchesManifest', () => {
  it('should have valid structure', () => {
    expect(spaceLaunchesManifest.id).toBe('space-launches');
    expect(spaceLaunchesManifest.version).toBe('1.0.0');
    expect(spaceLaunchesManifest.name).toBe('Space Launch Tracker');
    expect(spaceLaunchesManifest.entryPoint).toBe('onLoad');
    expect(spaceLaunchesManifest.defaultEnabled).toBe(false);
    expect(spaceLaunchesManifest.hasConfig).toBe(true);
    expect(spaceLaunchesManifest.apiVersion).toBe('1.0.0');
  });

  it('should have permissions', () => {
    expect(spaceLaunchesManifest.permissions).toContain('render:write');
    expect(spaceLaunchesManifest.permissions).toContain('render:execute');
  });

  it('should have contributes extension points', () => {
    expect(spaceLaunchesManifest.contributes).toBeDefined();
    expect(spaceLaunchesManifest.contributes?.dockIcons).toHaveLength(1);
    expect(spaceLaunchesManifest.contributes?.commands).toHaveLength(1);
    expect(spaceLaunchesManifest.contributes?.commands?.[0].handler).toBe('handleToggle');
  });

  it('should have required fields', () => {
    expect(spaceLaunchesManifest.id).toBeTruthy();
    expect(spaceLaunchesManifest.version).toBeTruthy();
    expect(spaceLaunchesManifest.name).toBeTruthy();
    expect(spaceLaunchesManifest.entryPoint).toBeTruthy();
  });
});
