import { satelliteTrackingManifest } from '../manifest';

describe('satelliteTrackingManifest', () => {
  it('should have valid structure', () => {
    expect(satelliteTrackingManifest.id).toBe('satellite-tracking');
    expect(satelliteTrackingManifest.version).toBe('2.0.0');
    expect(satelliteTrackingManifest.name).toBe('Satellite Tracking');
    expect(satelliteTrackingManifest.entryPoint).toBe('onLoad');
    expect(satelliteTrackingManifest.defaultEnabled).toBe(true);
    expect(satelliteTrackingManifest.hasConfig).toBe(true);
    expect(satelliteTrackingManifest.apiVersion).toBe('1.0.0');
  });

  it('should have permissions', () => {
    expect(satelliteTrackingManifest.permissions).toContain('satellite:read');
    expect(satelliteTrackingManifest.permissions).toContain('satellite:write');
    expect(satelliteTrackingManifest.permissions).toContain('satellite:execute');
    expect(satelliteTrackingManifest.permissions).toContain('render:write');
    expect(satelliteTrackingManifest.permissions).toContain('render:execute');
  });

  it('should have contributes extension points', () => {
    expect(satelliteTrackingManifest.contributes).toBeDefined();
    expect(satelliteTrackingManifest.contributes?.dockIcons).toHaveLength(1);
    expect(satelliteTrackingManifest.contributes?.commands).toHaveLength(2);
    expect(satelliteTrackingManifest.contributes?.commands?.[0].handler).toBe('handleToggle');
    expect(satelliteTrackingManifest.contributes?.commands?.[1].handler).toBe('handleRefresh');
  });

  it('should have required fields', () => {
    expect(satelliteTrackingManifest.id).toBeTruthy();
    expect(satelliteTrackingManifest.version).toBeTruthy();
    expect(satelliteTrackingManifest.name).toBeTruthy();
    expect(satelliteTrackingManifest.entryPoint).toBeTruthy();
  });
});
