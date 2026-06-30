import { moonHooks, getMoonMod } from '../index';
import { moonManifest } from '../manifest';

describe('moonManifest', () => {
  it('should have correct structure', () => {
    expect(moonManifest.id).toBe('moon');
    expect(moonManifest.version).toBe('1.0.0');
    expect(moonManifest.author).toBe('OPIC');
    expect(moonManifest.defaultEnabled).toBe(false);
    expect(moonManifest.permissions).toContain('render:read');
    expect(moonManifest.permissions).toContain('render:write');
    expect(moonManifest.capabilities).toHaveLength(2);
  });

  it('should have dock icons', () => {
    expect(moonManifest.contributes.dockIcons).toHaveLength(1);
    expect(moonManifest.contributes.dockIcons[0].id).toBe('moon-icon');
  });

  it('should have commands', () => {
    expect(moonManifest.contributes.commands).toHaveLength(1);
    expect(moonManifest.contributes.commands[0].id).toBe('toggle');
  });
});

describe('moonHooks', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  const mockContext = {
    logger: mockLogger,
    emit: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onLoad should log info', async () => {
    await moonHooks.onLoad(mockContext);
    expect(mockLogger.info).toHaveBeenCalledWith('[Moon] MOD 加载完成');
  });

  it('onEnable should log info', async () => {
    await moonHooks.onEnable(mockContext);
    expect(mockLogger.info).toHaveBeenCalledWith('[Moon] MOD 已启用');
  });

  it('onDisable should log info', async () => {
    await moonHooks.onDisable(mockContext);
    expect(mockLogger.info).toHaveBeenCalledWith('[Moon] MOD 已禁用');
  });

  it('onUnload should log info', async () => {
    await moonHooks.onUnload(mockContext);
    expect(mockLogger.info).toHaveBeenCalledWith('[Moon] MOD 已卸载');
  });

  it('onError should log error with message', () => {
    const error = new Error('test error');
    moonHooks.onError(error, mockContext);
    expect(mockLogger.error).toHaveBeenCalledWith('[Moon] 错误:', 'test error');
  });

  it('handleToggle should emit mod:open-window event', () => {
    moonHooks.handleToggle(mockContext);
    expect(mockContext.emit).toHaveBeenCalledWith('mod:open-window', {
      modId: 'moon',
      windowId: 'moon-window',
      title: 'Moon Explorer',
      titleZh: '月球探索',
    });
  });
});

describe('getMoonMod', () => {
  it('should return manifest and hooks', () => {
    const mod = getMoonMod();
    expect(mod.manifest).toBe(moonManifest);
    expect(mod.hooks).toBe(moonHooks);
  });
});
