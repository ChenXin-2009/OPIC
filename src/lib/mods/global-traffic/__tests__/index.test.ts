import { globalTrafficHooks, getGlobalTrafficMod, globalTrafficManifest } from '../index';

const mockGroup = { add: jest.fn(), remove: jest.fn() };
const mockRenderer = {
  getGroup: jest.fn(() => mockGroup),
  updateTradeRoutes: jest.fn(),
  updatePorts: jest.fn(),
  dispose: jest.fn(),
};
const mockScene = { add: jest.fn(), remove: jest.fn() };

jest.mock('../TrafficRenderer', () => ({
  TrafficRenderer: jest.fn(() => mockRenderer),
}));

jest.mock('../demoData', () => ({
  DEMO_TRADE_ROUTES: [{ id: 'r1' }],
  DEMO_AIR_ROUTES: [{ id: 'r2' }],
  MAJOR_PORTS: [{ id: 'p1' }],
  MAJOR_AIRPORTS: [{ id: 'p2' }],
}));

const mockState: Record<string, any> = {};

function createMockContext(overrides?: Record<string, any>) {
  return {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    render: {
      getScene: jest.fn(() => mockScene as any),
      onBeforeRender: jest.fn(() => jest.fn()),
    },
    satellite: { fetchSatellites: jest.fn(), onSatellitesUpdate: jest.fn(() => jest.fn()) },
    setState: jest.fn((s: any) => { Object.assign(mockState, s); }),
    getState: jest.fn(() => ({ ...mockState })),
    emit: jest.fn(),
    ...overrides,
  };
}

describe('globalTrafficHooks', () => {
  beforeEach(() => {
    Object.keys(mockState).forEach(k => delete mockState[k]);
    jest.clearAllMocks();
  });

  describe('onLoad', () => {
    it('should log load message', async () => {
      const ctx = createMockContext() as any;
      await globalTrafficHooks.onLoad(ctx);
      expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('加载'));
    });
  });

  describe('onEnable', () => {
    it('should create renderer and add to scene', async () => {
      const ctx = createMockContext() as any;
      await globalTrafficHooks.onEnable(ctx);
      expect(mockRenderer.getGroup).toHaveBeenCalled();
      expect(mockScene.add).toHaveBeenCalledWith(mockGroup);
      expect(mockRenderer.updateTradeRoutes).toHaveBeenCalled();
      expect(mockRenderer.updatePorts).toHaveBeenCalled();
      expect(ctx.setState).toHaveBeenCalledWith(expect.objectContaining({ renderer: mockRenderer }));
    });

    it('should handle scene not available', async () => {
      const ctx = createMockContext({ render: { getScene: jest.fn(() => { throw new Error(); }) } }) as any;
      await globalTrafficHooks.onEnable(ctx);
      expect(ctx.logger.warn).toHaveBeenCalled();
    });

    it('should respect config flags for empty routes and ports', async () => {
      const ctx = createMockContext({
        config: { showTradeRoutes: false, showPorts: false, opacity: 0.5 },
      }) as any;
      await globalTrafficHooks.onEnable(ctx);
      expect(mockRenderer.updateTradeRoutes).toHaveBeenCalledWith([], 0.5);
      expect(mockRenderer.updatePorts).toHaveBeenCalledWith([], 0.5);
    });
  });

  describe('onDisable', () => {
    it('should remove renderer and dispose', async () => {
      const ctx = createMockContext() as any;
      Object.assign(mockState, { renderer: mockRenderer });
      await globalTrafficHooks.onDisable(ctx);
      expect(mockScene.remove).toHaveBeenCalledWith(mockGroup);
      expect(mockRenderer.dispose).toHaveBeenCalled();
    });

    it('should handle no renderer state', async () => {
      const ctx = createMockContext() as any;
      await globalTrafficHooks.onDisable(ctx);
      expect(mockRenderer.dispose).not.toHaveBeenCalled();
    });
  });

  describe('onUnload', () => {
    it('should log unload message', async () => {
      const ctx = createMockContext() as any;
      await globalTrafficHooks.onUnload(ctx);
      expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('卸载'));
    });
  });

  describe('onError', () => {
    it('should log error', () => {
      const ctx = createMockContext() as any;
      const error = new Error('test error');
      globalTrafficHooks.onError(error, ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(expect.any(String), error);
    });
  });

  describe('handleToggle', () => {
    it('should emit open-window event', () => {
      const ctx = createMockContext() as any;
      globalTrafficHooks.handleToggle(ctx);
      expect(ctx.emit).toHaveBeenCalledWith('mod:open-window', expect.objectContaining({
        modId: 'global-traffic',
        windowId: 'global-traffic-window',
      }));
    });
  });

  describe('getGlobalTrafficMod', () => {
    it('should return manifest and hooks', () => {
      const mod = getGlobalTrafficMod();
      expect(mod.manifest).toBe(globalTrafficManifest);
      expect(mod.hooks).toBe(globalTrafficHooks);
    });
  });
});
