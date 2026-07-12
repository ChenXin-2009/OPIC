import { useWindowManagerStore } from '../WindowManagerStore';
import type { WindowConfig } from '@/types/window';

function makeConfig(overrides?: Partial<WindowConfig>): WindowConfig {
  return {
    id: 'test-window',
    title: 'Test Window',
    content: jest.fn(),
    ...overrides,
  };
}

describe('useWindowManagerStore', () => {
  beforeEach(() => {
    useWindowManagerStore.setState({
      windows: new Map(),
      activeWindowId: null,
      maxZIndex: 1000,
    });
  });

  it('has correct initial state', () => {
    const state = useWindowManagerStore.getState();
    expect(state.windows.size).toBe(0);
    expect(state.activeWindowId).toBeNull();
    expect(state.maxZIndex).toBe(1000);
  });

  describe('openWindow', () => {
    it('opens a new window with default settings', () => {
      useWindowManagerStore.getState().openWindow(makeConfig());
      const state = useWindowManagerStore.getState();
      expect(state.windows.size).toBe(1);
      const w = state.windows.get('test-window')!;
      expect(w.id).toBe('test-window');
      expect(w.isVisible).toBe(true);
      expect(w.isMinimized).toBe(false);
      expect(w.isMaximized).toBe(false);
      expect(w.zIndex).toBe(1001);
      expect(state.activeWindowId).toBe('test-window');
    });

    it('focuses existing window instead of duplicating', () => {
      useWindowManagerStore.getState().openWindow(makeConfig());
      useWindowManagerStore.getState().openWindow(makeConfig());
      expect(useWindowManagerStore.getState().windows.size).toBe(1);
    });
  });

  describe('closeWindow', () => {
    it('closes an existing window', () => {
      useWindowManagerStore.getState().openWindow(makeConfig());
      useWindowManagerStore.getState().closeWindow('test-window');
      const state = useWindowManagerStore.getState();
      expect(state.windows.has('test-window')).toBe(false);
      expect(state.activeWindowId).toBeNull();
    });

    it('does nothing for non-existent window', () => {
      expect(() => useWindowManagerStore.getState().closeWindow('nonexistent')).not.toThrow();
    });
  });

  describe('minimizeWindow', () => {
    it('minimizes a minimizable window', () => {
      useWindowManagerStore.getState().openWindow(makeConfig({ minimizable: true }));
      useWindowManagerStore.getState().minimizeWindow('test-window');
      const w = useWindowManagerStore.getState().windows.get('test-window')!;
      expect(w.isMinimized).toBe(true);
      expect(w.isVisible).toBe(false);
    });

    it('does not minimize a non-minimizable window', () => {
      useWindowManagerStore.getState().openWindow(makeConfig({ minimizable: false }));
      useWindowManagerStore.getState().minimizeWindow('test-window');
      const w = useWindowManagerStore.getState().windows.get('test-window')!;
      expect(w.isMinimized).toBe(false);
    });
  });

  describe('maximizeWindow', () => {
    it('maximizes a maximizable window', () => {
      useWindowManagerStore.getState().openWindow(makeConfig({ maximizable: true }));
      useWindowManagerStore.getState().maximizeWindow('test-window');
      const w = useWindowManagerStore.getState().windows.get('test-window')!;
      expect(w.isMaximized).toBe(true);
      expect(w.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('restoreWindow', () => {
    it('restores from minimized state', () => {
      useWindowManagerStore.getState().openWindow(makeConfig());
      useWindowManagerStore.getState().minimizeWindow('test-window');
      useWindowManagerStore.getState().restoreWindow('test-window');
      const w = useWindowManagerStore.getState().windows.get('test-window')!;
      expect(w.isMinimized).toBe(false);
      expect(w.isVisible).toBe(true);
    });

    it('does nothing for non-existent window', () => {
      expect(() => useWindowManagerStore.getState().restoreWindow('nope')).not.toThrow();
    });
  });

  describe('focusWindow', () => {
    it('brings window to the front', () => {
      useWindowManagerStore.getState().openWindow(makeConfig({ id: 'a' }));
      useWindowManagerStore.getState().openWindow(makeConfig({ id: 'b' }));
      useWindowManagerStore.getState().focusWindow('a');
      const w = useWindowManagerStore.getState().windows.get('a')!;
      expect(w.zIndex).toBe(1003);
      expect(useWindowManagerStore.getState().activeWindowId).toBe('a');
    });
  });

  describe('updateWindowPosition', () => {
    it('updates window position', () => {
      useWindowManagerStore.getState().openWindow(makeConfig());
      useWindowManagerStore.getState().updateWindowPosition('test-window', { x: 200, y: 300 });
      const w = useWindowManagerStore.getState().windows.get('test-window')!;
      expect(w.position).toEqual({ x: 200, y: 300 });
    });
  });

  describe('updateWindowSize', () => {
    it('updates window size', () => {
      useWindowManagerStore.getState().openWindow(makeConfig());
      useWindowManagerStore.getState().updateWindowSize('test-window', { width: 800, height: 600 });
      const w = useWindowManagerStore.getState().windows.get('test-window')!;
      expect(w.size).toEqual({ width: 800, height: 600 });
    });
  });
});
