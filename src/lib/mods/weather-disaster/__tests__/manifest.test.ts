import { weatherDisasterManifest } from '../manifest';

describe('weatherDisasterManifest', () => {
  it('should have valid structure', () => {
    expect(weatherDisasterManifest.id).toBe('weather-disaster');
    expect(weatherDisasterManifest.version).toBe('1.0.0');
    expect(weatherDisasterManifest.name).toBe('Weather & Disaster Monitor');
    expect(weatherDisasterManifest.entryPoint).toBe('onLoad');
    expect(weatherDisasterManifest.defaultEnabled).toBe(false);
    expect(weatherDisasterManifest.hasConfig).toBe(true);
    expect(weatherDisasterManifest.apiVersion).toBe('1.0.0');
  });

  it('should have permissions', () => {
    expect(weatherDisasterManifest.permissions).toContain('render:read');
    expect(weatherDisasterManifest.permissions).toContain('render:write');
    expect(weatherDisasterManifest.permissions).toContain('render:execute');
  });

  it('should have contributes extension points', () => {
    expect(weatherDisasterManifest.contributes).toBeDefined();
    expect(weatherDisasterManifest.contributes?.dockIcons).toHaveLength(1);
    expect(weatherDisasterManifest.contributes?.commands).toHaveLength(1);
    expect(weatherDisasterManifest.contributes?.commands?.[0].handler).toBe('handleToggle');
  });

  it('should have required fields', () => {
    expect(weatherDisasterManifest.id).toBeTruthy();
    expect(weatherDisasterManifest.version).toBeTruthy();
    expect(weatherDisasterManifest.name).toBeTruthy();
    expect(weatherDisasterManifest.entryPoint).toBeTruthy();
  });
});
