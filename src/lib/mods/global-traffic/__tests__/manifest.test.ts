import { globalTrafficManifest } from '../manifest';

describe('globalTrafficManifest', () => {
  it('should have valid structure', () => {
    expect(globalTrafficManifest.id).toBe('global-traffic');
    expect(globalTrafficManifest.version).toBe('1.0.0');
    expect(globalTrafficManifest.name).toBe('Global Traffic & Trade Routes');
    expect(globalTrafficManifest.entryPoint).toBe('onLoad');
    expect(globalTrafficManifest.defaultEnabled).toBe(false);
    expect(globalTrafficManifest.hasConfig).toBe(true);
    expect(globalTrafficManifest.configComponent).toBe('GlobalTrafficConfig');
    expect(globalTrafficManifest.apiVersion).toBe('1.0.0');
  });

  it('should have permissions', () => {
    expect(globalTrafficManifest.permissions).toContain('render:write');
    expect(globalTrafficManifest.permissions).toContain('render:execute');
  });

  it('should have contributes extension points', () => {
    expect(globalTrafficManifest.contributes).toBeDefined();
    expect(globalTrafficManifest.contributes?.dockIcons).toHaveLength(1);
    expect(globalTrafficManifest.contributes?.commands).toHaveLength(1);
    expect(globalTrafficManifest.contributes?.commands?.[0].handler).toBe('handleToggle');
  });

  it('should have required fields', () => {
    expect(globalTrafficManifest.id).toBeTruthy();
    expect(globalTrafficManifest.version).toBeTruthy();
    expect(globalTrafficManifest.name).toBeTruthy();
    expect(globalTrafficManifest.entryPoint).toBeTruthy();
  });
});
