import { spaceLaunchesHooks, getSpaceLaunchesMod, spaceLaunchesManifest } from '../index';

const mockGroup = { add: jest.fn(), remove: jest.fn() };
const mockRenderer = {
  getGroup: jest.fn(() => mockGroup),
  tick: jest.fn(),
  dispose: jest.fn(),
};
const mockScene = { add: jest.fn(), remove: jest.fn() };

jest.mock('../LaunchRenderer', () => ({
  LaunchRenderer: jest.fn(() => mockRenderer),
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

describe('spaceLaunchesHooks', () => {
  beforeEach(() => {
    Object.keys(mockState).forEach(k => delete mockState[k]);
    jest.clearAllMocks();
  });

  describe('onLoad', () => {
    it('should log load message', async () => {
      const ctx = createMockContext() as any;
      await spaceLaunchesHooks.onLoad(ctx);
      expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('加载'));
    });
  });

  describe('onEnable', () => {
    it('should create renderer and register beforeRender callback', async () => {
      const ctx = createMockContext() as any;
      await spaceLaunchesHooks.onEnable(ctx);
      expect(mockRenderer.getGroup).toHaveBeenCalled();
      expect(mockScene.add).toHaveBeenCalledWith(mockGroup);
      expect(ctx.render.onBeforeRender).toHaveBeenCalled();
      expect(ctx.setState).toHaveBeenCalledWith(expect.objectContaining({ renderer: mockRenderer }));
    });

    it('should handle scene not available', async () => {
      const ctx = createMockContext({ render: { getScene: jest.fn(() => { throw new Error(); }), onBeforeRender: jest.fn(() => jest.fn()) } }) as any;
      await spaceLaunchesHooks.onEnable(ctx);
      expect(ctx.logger.warn).toHaveBeenCalled();
    });
  });

  describe('onDisable', () => {
    it('should unsubscribe and dispose renderer', async () => {
      const unsub = jest.fn();
      const ctx = createMockContext() as any;
      Object.assign(mockState, { renderer: mockRenderer, unsubscribeRender: unsub });
      await spaceLaunchesHooks.onDisable(ctx);
      expect(unsub).toHaveBeenCalled();
      expect(mockScene.remove).toHaveBeenCalledWith(mockGroup);
      expect(mockRenderer.dispose).toHaveBeenCalled();
    });

    it('should handle no renderer state', async () => {
      const ctx = createMockContext() as any;
      await spaceLaunchesHooks.onDisable(ctx);
      expect(mockRenderer.dispose).not.toHaveBeenCalled();
    });
  });

  describe('onUnload', () => {
    it('should log unload message', async () => {
      const ctx = createMockContext() as any;
      await spaceLaunchesHooks.onUnload(ctx);
      expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('卸载'));
    });
  });

  describe('onError', () => {
    it('should log error', () => {
      const ctx = createMockContext() as any;
      const error = new Error('test error');
      spaceLaunchesHooks.onError(error, ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(expect.any(String), error);
    });
  });

  describe('handleToggle', () => {
    it('should emit open-window event', () => {
      const ctx = createMockContext() as any;
      spaceLaunchesHooks.handleToggle(ctx);
      expect(ctx.emit).toHaveBeenCalledWith('mod:open-window', expect.objectContaining({
        modId: 'space-launches',
        windowId: 'space-launches-window',
      }));
    });
  });

  describe('getSpaceLaunchesMod', () => {
    it('should return manifest and hooks', () => {
      const mod = getSpaceLaunchesMod();
      expect(mod.manifest).toBe(spaceLaunchesManifest);
      expect(mod.hooks).toBe(spaceLaunchesHooks);
    });
  });
});
