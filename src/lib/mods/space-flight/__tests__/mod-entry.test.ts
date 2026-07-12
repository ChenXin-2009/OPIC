import { spaceFlightHooks, getSpaceFlightMod } from '../index';
import { spaceFlightManifest } from '../manifest';

function createMockContext(): any {
  const state: Record<string, unknown> = {};
  return {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
    },
    setState: jest.fn((s: Record<string, unknown>) => Object.assign(state, s)),
    getState: jest.fn(() => state),
    emit: jest.fn(),
  };
}

describe('space-flight mod entry', () => {
  it('exports a valid mod bundle via getSpaceFlightMod', () => {
    const mod = getSpaceFlightMod();
    expect(mod.manifest).toBe(spaceFlightManifest);
    expect(mod.hooks).toBe(spaceFlightHooks);
    expect(mod.manifest.id).toBe('space-flight');
    expect(mod.manifest.version).toBe('0.1.0');
  });

  it('onLoad sets integratorReady and default state', async () => {
    const ctx = createMockContext();
    await spaceFlightHooks.onLoad!(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith('[Space Flight] 航天飞行 MOD 加载');
    expect(ctx.setState).toHaveBeenCalledWith({
      integratorReady: true,
      launched: false,
      currentVehicle: null,
      currentFlightState: null,
      timeScale: 1,
    });
  });

  it('onEnable sets integratorReady', async () => {
    const ctx = createMockContext();
    await spaceFlightHooks.onEnable!(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith('[Space Flight] 航天飞行 MOD 已启用');
    expect(ctx.setState).toHaveBeenCalledWith({ integratorReady: true });
  });

  it('onDisable resets flight state', async () => {
    const ctx = createMockContext();
    await spaceFlightHooks.onDisable!(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith('[Space Flight] 航天飞行 MOD 已禁用');
    expect(ctx.setState).toHaveBeenCalledWith({
      integratorReady: false,
      launched: false,
      currentFlightState: null,
    });
  });

  it('onUnload logs', async () => {
    const ctx = createMockContext();
    await spaceFlightHooks.onUnload!(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith('[Space Flight] 航天飞行 MOD 卸载');
  });

  it('onError logs the error', () => {
    const ctx = createMockContext();
    const error = new Error('test failure');
    spaceFlightHooks.onError!(error, ctx);
    expect(ctx.logger.error).toHaveBeenCalledWith('[Space Flight] 错误:', error);
  });

  it('handleToggle emits open-window event', () => {
    const ctx = createMockContext();
    spaceFlightHooks.handleToggle!(ctx);
    expect(ctx.emit).toHaveBeenCalledWith('mod:open-window', {
      modId: 'space-flight',
      windowId: 'space-flight-window',
      title: 'Space Flight',
      titleZh: '航天飞行',
    });
  });
});
