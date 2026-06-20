import { WindowManager } from '../WindowManager';
import type { RegisteredWindow } from '../types';

function createMockEventBus() {
  const listeners: Record<string, ((data: unknown) => void)[]> = {};
  return {
    emit: jest.fn((event: string, data?: unknown) => {
      (listeners[event] || []).forEach(h => h(data));
    }),
    on: jest.fn((event: string, handler: (data: unknown) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
  } as any;
}

function makeWindowDef(overrides: Partial<RegisteredWindow> = {}): RegisteredWindow {
  return {
    id: 'win1',
    title: 'Settings',
    component: 'SettingsPanel',
    modId: 'mod1',
    fullId: 'mod1.win1',
    resizable: true,
    minimizable: true,
    defaultPosition: { x: 100, y: 100 },
    defaultSize: { width: 800, height: 600 },
    ...overrides,
  };
}

describe('WindowManager', () => {
  let wm: WindowManager;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    eventBus = createMockEventBus();
    let counter = 0;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1000000 + counter++);
    wm = new WindowManager(eventBus);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  describe('openWindow', () => {
    it('should open a window and return instance ID', () => {
      const instanceId = wm.openWindow(makeWindowDef());
      expect(instanceId).toBeDefined();
      expect(instanceId).toContain('mod1.win1');
    });

    it('should store window instance', () => {
      const instanceId = wm.openWindow(makeWindowDef());
      const instance = wm.getInstance(instanceId);
      expect(instance).toBeDefined();
      expect(instance!.definition.fullId).toBe('mod1.win1');
    });

    it('should emit window:opened event', () => {
      wm.openWindow(makeWindowDef());
      expect(eventBus.emit).toHaveBeenCalledWith('window:opened', expect.objectContaining({
        windowId: 'mod1.win1',
        modId: 'mod1',
      }));
    });

    it('should use default position and size from definition', () => {
      const instanceId = wm.openWindow(makeWindowDef());
      const instance = wm.getInstance(instanceId)!;
      expect(instance.position).toEqual({ x: 100, y: 100 });
      expect(instance.size).toEqual({ width: 800, height: 600 });
    });

    it('should use custom options over defaults', () => {
      const instanceId = wm.openWindow(makeWindowDef(), {
        position: { x: 200, y: 300 },
        size: { width: 1024, height: 768 },
      });
      const instance = wm.getInstance(instanceId)!;
      expect(instance.position).toEqual({ x: 200, y: 300 });
      expect(instance.size).toEqual({ width: 1024, height: 768 });
    });

    it('should set focused to true on open', () => {
      const instanceId = wm.openWindow(makeWindowDef());
      expect(wm.getInstance(instanceId)!.focused).toBe(true);
    });

    it('should open multiple instances of same window', () => {
      const id1 = wm.openWindow(makeWindowDef());
      const id2 = wm.openWindow(makeWindowDef());
      expect(id1).not.toBe(id2);
      expect(wm.getWindowCount()).toBe(2);
    });
  });

  describe('closeWindow', () => {
    it('should remove the window instance', () => {
      const instanceId = wm.openWindow(makeWindowDef());
      wm.closeWindow(instanceId);
      expect(wm.getInstance(instanceId)).toBeUndefined();
    });

    it('should emit window:closed event', () => {
      const instanceId = wm.openWindow(makeWindowDef());
      eventBus.emit.mockClear();
      wm.closeWindow(instanceId);
      expect(eventBus.emit).toHaveBeenCalledWith('window:closed', expect.objectContaining({
        instanceId,
        windowId: 'mod1.win1',
      }));
    });

    it('should not throw when closing non-existent instance', () => {
      expect(() => wm.closeWindow('nonexistent')).not.toThrow();
    });

    it('should transfer focus on close', () => {
      const id1 = wm.openWindow(makeWindowDef({ fullId: 'mod1.win1' }));
      const id2 = wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2' }));

      wm.closeWindow(id1);
      expect(wm.getFocusedWindow()!.id).toBe(id2);
    });
  });

  describe('closeModWindows', () => {
    it('should close all windows for a given mod', () => {
      wm.openWindow(makeWindowDef({ fullId: 'mod1.win1' }));
      wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2' }));
      wm.openWindow(makeWindowDef({ id: 'win3', fullId: 'mod2.win3', modId: 'mod2' }));

      wm.closeModWindows('mod1');
      expect(wm.getWindowCount()).toBe(1);
      expect(wm.getModInstances('mod2').length).toBe(1);
    });
  });

  describe('setFocus', () => {
    it('should set focused on the target window', () => {
      const id1 = wm.openWindow(makeWindowDef({ fullId: 'mod1.win1' }));
      const id2 = wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2' }));

      wm.setFocus(id1);
      expect(wm.getInstance(id1)!.focused).toBe(true);
      expect(wm.getInstance(id2)!.focused).toBe(false);
    });

    it('should emit window:focused event', () => {
      const instanceId = wm.openWindow(makeWindowDef());
      eventBus.emit.mockClear();
      wm.setFocus(instanceId);
      expect(eventBus.emit).toHaveBeenCalledWith('window:focused', expect.objectContaining({
        instanceId,
      }));
    });

    it('should increment z-index', () => {
      const id = wm.openWindow(makeWindowDef());
      const initialZ = wm.getInstance(id)!.zIndex;
      wm.setFocus(id);
      expect(wm.getInstance(id)!.zIndex).toBeGreaterThan(initialZ);
    });
  });

  describe('minimizeWindow', () => {
    it('should minimize the window', () => {
      const id = wm.openWindow(makeWindowDef({ minimizable: true }));
      wm.minimizeWindow(id);
      expect(wm.getInstance(id)!.minimized).toBe(true);
    });

    it('should not minimize if not minimizable', () => {
      const id = wm.openWindow(makeWindowDef({ minimizable: false }));
      wm.minimizeWindow(id);
      expect(wm.getInstance(id)!.minimized).toBe(false);
    });

    it('should transfer focus when minimizing focused window', () => {
      const id1 = wm.openWindow(makeWindowDef({ fullId: 'mod1.win1', minimizable: true }));
      const id2 = wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2', minimizable: true }));

      wm.minimizeWindow(id2);
      expect(wm.getFocusedWindow()!.id).toBe(id1);
    });
  });

  describe('restoreWindow', () => {
    it('should restore a minimized window', () => {
      const id = wm.openWindow(makeWindowDef({ minimizable: true }));
      wm.minimizeWindow(id);
      wm.restoreWindow(id);
      expect(wm.getInstance(id)!.minimized).toBe(false);
    });

    it('should not restore if not minimized', () => {
      const id = wm.openWindow(makeWindowDef());
      wm.restoreWindow(id);
      expect(wm.getInstance(id)!.minimized).toBe(false);
    });
  });

  describe('updatePosition', () => {
    it('should update window position', () => {
      const id = wm.openWindow(makeWindowDef());
      wm.updatePosition(id, { x: 500, y: 600 });
      expect(wm.getInstance(id)!.position).toEqual({ x: 500, y: 600 });
    });

    it('should emit window:moved event', () => {
      const id = wm.openWindow(makeWindowDef());
      eventBus.emit.mockClear();
      wm.updatePosition(id, { x: 500, y: 600 });
      expect(eventBus.emit).toHaveBeenCalledWith('window:moved', expect.objectContaining({
        instanceId: id,
        position: { x: 500, y: 600 },
      }));
    });
  });

  describe('updateSize', () => {
    it('should update size if resizable', () => {
      const id = wm.openWindow(makeWindowDef({ resizable: true }));
      wm.updateSize(id, { width: 1024, height: 768 });
      expect(wm.getInstance(id)!.size).toEqual({ width: 1024, height: 768 });
    });

    it('should not update size if not resizable', () => {
      const id = wm.openWindow(makeWindowDef({ resizable: false }));
      wm.updateSize(id, { width: 1024, height: 768 });
      expect(wm.getInstance(id)!.size).toEqual({ width: 800, height: 600 });
    });
  });

  describe('query methods', () => {
    it('getAllInstances should return all instances', () => {
      wm.openWindow(makeWindowDef());
      wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2' }));
      expect(wm.getAllInstances().length).toBe(2);
    });

    it('getVisibleWindows should exclude minimized', () => {
      const id1 = wm.openWindow(makeWindowDef({ fullId: 'mod1.win1', minimizable: true }));
      wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2', minimizable: true }));
      wm.minimizeWindow(id1);

      const visible = wm.getVisibleWindows();
      expect(visible.length).toBe(1);
      expect(visible[0].definition.fullId).toBe('mod1.win2');
    });

    it('getMinimizedWindows should return only minimized', () => {
      const id1 = wm.openWindow(makeWindowDef({ fullId: 'mod1.win1', minimizable: true }));
      wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2', minimizable: true }));
      wm.minimizeWindow(id1);

      expect(wm.getMinimizedWindows().length).toBe(1);
    });

    it('getTopWindow should return highest z-index visible window', () => {
      const id1 = wm.openWindow(makeWindowDef({ fullId: 'mod1.win1' }));
      const id2 = wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2' }));

      const top = wm.getTopWindow();
      expect(top!.id).toBe(id2);
    });

    it('getTopWindow should return undefined when no windows', () => {
      expect(wm.getTopWindow()).toBeUndefined();
    });

    it('getModInstances should filter by mod', () => {
      wm.openWindow(makeWindowDef({ fullId: 'mod1.win1', modId: 'mod1' }));
      wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod2.win2', modId: 'mod2' }));

      expect(wm.getModInstances('mod1').length).toBe(1);
      expect(wm.getModInstances('mod2').length).toBe(1);
    });

    it('isOpen should check instance existence', () => {
      const id = wm.openWindow(makeWindowDef());
      expect(wm.isOpen(id)).toBe(true);
      wm.closeWindow(id);
      expect(wm.isOpen(id)).toBe(false);
    });

    it('getWindowCount should return correct count', () => {
      expect(wm.getWindowCount()).toBe(0);
      wm.openWindow(makeWindowDef());
      expect(wm.getWindowCount()).toBe(1);
    });
  });

  describe('closeAllWindows', () => {
    it('should close all windows', () => {
      wm.openWindow(makeWindowDef());
      wm.openWindow(makeWindowDef({ id: 'win2', fullId: 'mod1.win2' }));
      wm.closeAllWindows();
      expect(wm.getWindowCount()).toBe(0);
    });
  });

  describe('window-unregistered event listener', () => {
    it('should register listener on construction', () => {
      expect(eventBus.on).toHaveBeenCalledWith(
        'contribution:window-unregistered',
        expect.any(Function)
      );
    });
  });
});
