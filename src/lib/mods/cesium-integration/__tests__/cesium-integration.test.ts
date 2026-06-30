import { cesiumIntegrationHooks, getCesiumIntegrationMod } from '../index';
import { cesiumIntegrationManifest } from '../manifest';

describe('cesiumIntegrationManifest', () => {
  it('should have correct structure', () => {
    expect(cesiumIntegrationManifest.id).toBe('cesium-integration');
    expect(cesiumIntegrationManifest.version).toBe('1.0.0');
    expect(cesiumIntegrationManifest.author).toBe('OPIC');
    expect(cesiumIntegrationManifest.defaultEnabled).toBe(true);
    expect(cesiumIntegrationManifest.permissions).toContain('render:read');
    expect(cesiumIntegrationManifest.permissions).toContain('render:write');
  });

  it('should have dock icons', () => {
    expect(cesiumIntegrationManifest.contributes.dockIcons).toHaveLength(1);
    expect(cesiumIntegrationManifest.contributes.dockIcons[0].id).toBe('cesium-integration-icon');
  });

  it('should have commands', () => {
    expect(cesiumIntegrationManifest.contributes.commands).toHaveLength(1);
    expect(cesiumIntegrationManifest.contributes.commands[0].id).toBe('toggle');
  });

  it('should have capabilities', () => {
    expect(cesiumIntegrationManifest.capabilities).toHaveLength(2);
    expect(cesiumIntegrationManifest.capabilities[0].name).toBe('render:cesium');
  });
});

describe('cesiumIntegrationHooks', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  const mockRender = {
    registerCesiumLayer: jest.fn(),
    unregisterCesiumLayer: jest.fn(),
  };
  const mockContext = {
    logger: mockLogger,
    render: mockRender,
    emit: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onLoad should log info', async () => {
    await cesiumIntegrationHooks.onLoad(mockContext);
    expect(mockLogger.info).toHaveBeenCalledWith('[Cesium Integration] MOD加载中...');
  });

  it('onEnable should register Cesium layer', async () => {
    await cesiumIntegrationHooks.onEnable(mockContext);
    expect(mockRender.registerCesiumLayer).toHaveBeenCalledWith({
      id: 'default-imagery',
      type: 'imagery',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    });
    expect(mockLogger.info).toHaveBeenCalledWith('[Cesium Integration] MOD启用');
  });

  it('onDisable should unregister Cesium layer', async () => {
    await cesiumIntegrationHooks.onDisable(mockContext);
    expect(mockRender.unregisterCesiumLayer).toHaveBeenCalledWith('default-imagery');
    expect(mockLogger.info).toHaveBeenCalledWith('[Cesium Integration] MOD禁用');
  });

  it('onUnload should log info', async () => {
    await cesiumIntegrationHooks.onUnload(mockContext);
    expect(mockLogger.info).toHaveBeenCalledWith('[Cesium Integration] MOD卸载');
  });

  it('onError should log error', () => {
    const error = new Error('test error');
    cesiumIntegrationHooks.onError(error, mockContext);
    expect(mockLogger.error).toHaveBeenCalledWith('[Cesium Integration] MOD错误:', error);
  });

  it('handleToggle should emit mod:open-window event', () => {
    cesiumIntegrationHooks.handleToggle(mockContext);
    expect(mockContext.emit).toHaveBeenCalledWith('mod:open-window', {
      modId: 'cesium-integration',
      windowId: 'cesium-integration-window',
      title: 'Cesium Earth',
      titleZh: 'Cesium 地球',
    });
  });
});

describe('getCesiumIntegrationMod', () => {
  it('should return manifest and hooks', () => {
    const mod = getCesiumIntegrationMod();
    expect(mod.manifest).toBe(cesiumIntegrationManifest);
    expect(mod.hooks).toBe(cesiumIntegrationHooks);
  });
});
