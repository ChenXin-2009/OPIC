import { satelliteTrackingHooks, getSatelliteTrackingMod } from '../index';
import { satelliteTrackingManifest } from '../manifest';

const mockState: Record<string, any> = {};
const mockUnsubscribe = jest.fn();

function createMockContext(overrides?: Record<string, any>) {
  return {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    render: {
      getScene: jest.fn(),
      onBeforeRender: jest.fn(() => jest.fn()),
    },
    satellite: {
      fetchSatellites: jest.fn(),
      onSatellitesUpdate: jest.fn(() => mockUnsubscribe),
    },
    setState: jest.fn((s: any) => { Object.assign(mockState, s); }),
    getState: jest.fn(() => ({ ...mockState })),
    emit: jest.fn(),
    ...overrides,
  };
}

describe('satelliteTrackingHooks', () => {
  beforeEach(() => {
    Object.keys(mockState).forEach(k => delete mockState[k]);
    jest.clearAllMocks();
  });

  describe('onLoad', () => {
    it('should fetch satellites and log', async () => {
      const ctx = createMockContext() as any;
      await satelliteTrackingHooks.onLoad(ctx);
      expect(ctx.satellite.fetchSatellites).toHaveBeenCalled();
      expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('加载完成'));
    });

    it('should log error when fetch fails', async () => {
      const ctx = createMockContext() as any;
      ctx.satellite.fetchSatellites.mockRejectedValue(new Error('fetch fail'));
      await satelliteTrackingHooks.onLoad(ctx);
      expect(ctx.logger.error).toHaveBeenCalled();
    });
  });

  describe('onEnable', () => {
    it('should subscribe to satellite updates', async () => {
      const ctx = createMockContext() as any;
      await satelliteTrackingHooks.onEnable(ctx);
      expect(ctx.satellite.onSatellitesUpdate).toHaveBeenCalled();
      expect(ctx.setState).toHaveBeenCalledWith({ unsubscribe: mockUnsubscribe });
    });
  });

  describe('onDisable', () => {
    it('should unsubscribe if state has unsubscribe function', async () => {
      const ctx = createMockContext() as any;
      Object.assign(mockState, { unsubscribe: mockUnsubscribe });
      await satelliteTrackingHooks.onDisable(ctx);
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle no unsubscribe state', async () => {
      const ctx = createMockContext() as any;
      await satelliteTrackingHooks.onDisable(ctx);
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('onUnload', () => {
    it('should log unload message', async () => {
      const ctx = createMockContext() as any;
      await satelliteTrackingHooks.onUnload(ctx);
      expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('卸载'));
    });
  });

  describe('onError', () => {
    it('should log error', () => {
      const ctx = createMockContext() as any;
      const error = new Error('test error');
      satelliteTrackingHooks.onError(error, ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(expect.any(String), error);
    });
  });

  describe('handleToggle', () => {
    it('should emit open-window event', () => {
      const ctx = createMockContext() as any;
      satelliteTrackingHooks.handleToggle(ctx);
      expect(ctx.emit).toHaveBeenCalledWith('mod:open-window', expect.objectContaining({
        modId: 'satellite-tracking',
        windowId: 'satellite-tracking-window',
      }));
    });
  });

  describe('handleRefresh', () => {
    it('should fetch satellites and log', async () => {
      const ctx = createMockContext() as any;
      await satelliteTrackingHooks.handleRefresh(ctx);
      expect(ctx.satellite.fetchSatellites).toHaveBeenCalled();
      expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('刷新完成'));
    });

    it('should log error when refresh fails', async () => {
      const ctx = createMockContext() as any;
      ctx.satellite.fetchSatellites.mockRejectedValue(new Error('refresh fail'));
      await satelliteTrackingHooks.handleRefresh(ctx);
      expect(ctx.logger.error).toHaveBeenCalled();
    });
  });

  describe('getSatelliteTrackingMod', () => {
    it('should return manifest and hooks', () => {
      const mod = getSatelliteTrackingMod();
      expect(mod.manifest).toBe(satelliteTrackingManifest);
      expect(mod.hooks).toBe(satelliteTrackingHooks);
    });
  });
});
