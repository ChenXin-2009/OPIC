import {
  KeyboardNavigationManager,
  keyboardNavigationManager,
  initializeKeyboardNavigation,
  registerKeyboardShortcut,
  enableFocusTrap,
  disableFocusTrap,
} from '../keyboard-nav';

let manager: KeyboardNavigationManager;

function resetSingleton() {
  manager = KeyboardNavigationManager.getInstance();
  manager.destroy();
  (manager as any).shortcuts = new Map();
  (manager as any).isInitialized = false;
  (manager as any).focusTrap = null;
  (manager as any).trapFirstElement = null;
  (manager as any).trapLastElement = null;
  (manager as any).isHelpVisible = false;
  (manager as any).helpOverlay = null;
}

beforeEach(() => {
  document.body.innerHTML = '';
  resetSingleton();
});

describe('KeyboardNavigationManager singleton', () => {
  it('should return same instance', () => {
    const a = KeyboardNavigationManager.getInstance();
    const b = KeyboardNavigationManager.getInstance();
    expect(a).toBe(b);
  });
});

describe('initialize / destroy', () => {
  it('should initialize and destroy', () => {
    manager.initialize();
    expect((manager as any).isInitialized).toBe(true);
    expect((manager as any).shortcuts.size).toBeGreaterThan(0);
    manager.destroy();
    expect((manager as any).isInitialized).toBe(false);
  });

  it('should not double-initialize', () => {
    manager.initialize();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    manager.initialize();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should not destroy when not initialized', () => {
    expect(() => manager.destroy()).not.toThrow();
  });
});

describe('registerShortcut / unregisterShortcut / getAllShortcuts', () => {
  it('should register and unregister shortcuts', () => {
    const action = jest.fn();
    manager.registerShortcut('test', { key: 'a', description: 'Test shortcut', action });
    expect(manager.getAllShortcuts().has('test')).toBe(true);
    manager.unregisterShortcut('test');
    expect(manager.getAllShortcuts().has('test')).toBe(false);
  });

  it('should set default options', () => {
    manager.registerShortcut('test', { key: 'b', description: 'Test', action: jest.fn() });
    const s = manager.getAllShortcuts().get('test')!;
    expect(s.preventDefault).toBe(true);
    expect(s.stopPropagation).toBe(false);
    expect(s.category).toBe('other');
  });
});

describe('keyboard event handling', () => {
  it('should execute matching shortcut action', () => {
    const action = jest.fn();
    manager.initialize();
    (manager as any).shortcuts.clear();
    manager.registerShortcut('test', { key: 'a', description: 'A', action });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(action).toHaveBeenCalled();
  });

  it('should prevent default when set', () => {
    const action = jest.fn();
    manager.initialize();
    (manager as any).shortcuts.clear();
    manager.registerShortcut('test', { key: 'a', description: 'A', action, preventDefault: true });
    const evt = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    const spy = jest.spyOn(evt, 'preventDefault');
    document.dispatchEvent(evt);
    expect(spy).toHaveBeenCalled();
  });
});

describe('focus trap', () => {
  it('should enable and disable focus trap', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button id="first">A</button><button id="last">B</button>`;
    document.body.appendChild(container);
    manager.enableFocusTrap(container);
    expect((manager as any).focusTrap).toBe(container);
    manager.disableFocusTrap();
    expect((manager as any).focusTrap).toBeNull();
  });

  it('should warn when no focusable elements', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const container = document.createElement('div');
    manager.enableFocusTrap(container);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('focusNext / focusPrevious / focusFirst / focusLast', () => {
  it('should focus first and last', () => {
    document.body.innerHTML = `<button id="a">A</button>`;
    manager.focusFirst();
    expect(document.activeElement!.id).toBe('a');
    manager.focusLast();
    expect(document.activeElement!.id).toBe('a');
  });
});

describe('convenience functions', () => {
  it('initializeKeyboardNavigation should not throw', () => {
    expect(() => initializeKeyboardNavigation()).not.toThrow();
  });

  it('registerKeyboardShortcut should register shortcut', () => {
    const action = jest.fn();
    registerKeyboardShortcut('conv', { key: 'x', description: 'X', action });
    expect(manager.getAllShortcuts().has('conv')).toBe(true);
  });

  it('enableFocusTrap / disableFocusTrap', () => {
    const el = document.createElement('div');
    enableFocusTrap(el);
    expect((manager as any).focusTrap).toBe(el);
    disableFocusTrap();
    expect((manager as any).focusTrap).toBeNull();
  });
});
