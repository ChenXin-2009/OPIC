import {
  KeyboardNavigationManager,
  keyboardNavigationManager,
  initializeKeyboardNavigation,
  registerKeyboardShortcut,
  enableFocusTrap,
  disableFocusTrap,
} from '../keyboard-nav';
import defaultExport from '../keyboard-nav';

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

  it('should export default as the singleton', () => {
    expect(defaultExport).toBe(keyboardNavigationManager);
    expect(defaultExport).toBe(KeyboardNavigationManager.getInstance());
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

  it('should register keydown listener on document via addEventListener', () => {
    const spy = jest.spyOn(document, 'addEventListener');
    manager.initialize();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    spy.mockRestore();
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

  it('should match shortcut with ctrl modifier', () => {
    const action = jest.fn();
    manager.initialize();
    (manager as any).shortcuts.clear();
    manager.registerShortcut('ctrl-s', { key: 's', ctrl: true, description: 'Save', action });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    expect(action).toHaveBeenCalled();
  });

  it('should not match shortcut when ctrl modifier is required but not pressed', () => {
    const action = jest.fn();
    manager.initialize();
    (manager as any).shortcuts.clear();
    manager.registerShortcut('ctrl-s', { key: 's', ctrl: true, description: 'Save', action });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: false, bubbles: true }));
    expect(action).not.toHaveBeenCalled();
  });

  it('should match shortcut with shift modifier', () => {
    const action = jest.fn();
    manager.initialize();
    (manager as any).shortcuts.clear();
    manager.registerShortcut('shift-p', { key: 'p', shift: true, description: 'P', action });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', shiftKey: true, bubbles: true }));
    expect(action).toHaveBeenCalled();
  });

  it('should match shortcut with alt modifier', () => {
    const action = jest.fn();
    manager.initialize();
    (manager as any).shortcuts.clear();
    manager.registerShortcut('alt-x', { key: 'x', alt: true, description: 'X', action });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', altKey: true, bubbles: true }));
    expect(action).toHaveBeenCalled();
  });

  it('should catch errors in shortcut action and log them', () => {
    const action = jest.fn().mockImplementation(() => { throw new Error('oops'); });
    manager.initialize();
    (manager as any).shortcuts.clear();
    manager.registerShortcut('faulty', { key: 'f', description: 'Faulty', action });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    }).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
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

  it('should cycle focus forward with Tab in focus trap', () => {
    manager.initialize();
    const container = document.createElement('div');
    container.innerHTML = `<button id="first">A</button><button id="second">B</button><button id="last">C</button>`;
    document.body.appendChild(container);
    manager.enableFocusTrap(container);
    expect(document.activeElement!.id).toBe('first');
    container.querySelector('#last')!.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement!.id).toBe('first');
  });

  it('should cycle focus backward with Shift+Tab in focus trap', () => {
    manager.initialize();
    const container = document.createElement('div');
    container.innerHTML = `<button id="first">A</button><button id="second">B</button><button id="last">C</button>`;
    document.body.appendChild(container);
    manager.enableFocusTrap(container);
    expect(document.activeElement!.id).toBe('first');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement!.id).toBe('last');
  });

  it('should not cycle when trap is not set', () => {
    manager.initialize();
    document.body.innerHTML = `<button id="first">A</button><button id="second">B</button>`;
    document.querySelector('#first')!.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(() => manager.disableFocusTrap()).not.toThrow();
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

  it('should navigate forward with focusNext', () => {
    document.body.innerHTML = `<button id="a">A</button><button id="b">B</button><button id="c">C</button>`;
    manager.focusFirst();
    expect(document.activeElement!.id).toBe('a');
    manager.focusNext();
    expect(document.activeElement!.id).toBe('b');
    manager.focusNext();
    expect(document.activeElement!.id).toBe('c');
    manager.focusNext();
    expect(document.activeElement!.id).toBe('a');
  });

  it('should navigate backward with focusPrevious', () => {
    document.body.innerHTML = `<button id="a">A</button><button id="b">B</button><button id="c">C</button>`;
    manager.focusLast();
    expect(document.activeElement!.id).toBe('c');
    manager.focusPrevious();
    expect(document.activeElement!.id).toBe('b');
    manager.focusPrevious();
    expect(document.activeElement!.id).toBe('a');
    manager.focusPrevious();
    expect(document.activeElement!.id).toBe('c');
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
