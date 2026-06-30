import {
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  focusElement,
  FocusStore,
  createFocusTrap,
  FocusTrapManager,
  getFocusTrapManager,
  focusNext,
  focusPrevious,
  focusFirst,
  focusLast,
} from '../focus-management';

// Helper: make jsdom elements appear as non-hidden so offsetParent is non-null
function mockOffsetParent(el: HTMLElement) {
  Object.defineProperty(el, 'offsetParent', { value: document.body, configurable: true });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('getFocusableElements', () => {
  it('should return focusable elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">OK</button>
      <a href="#" id="link1">Link</a>
      <input id="input1" />
      <button id="btn2" disabled>Disabled</button>
      <div id="div1" tabindex="0">Focusable div</div>
    `;
    document.body.appendChild(container);
    // mock offsetParent for all button, a, input, div elements
    container.querySelectorAll('button, a, input, div').forEach(el => mockOffsetParent(el as HTMLElement));
    const result = getFocusableElements(container);
    expect(result.length).toBe(4);
    expect(result[0].id).toBe('btn1');
    expect(result[1].id).toBe('link1');
    expect(result[2].id).toBe('input1');
    expect(result[3].id).toBe('div1');
  });

  it('should return empty for hidden elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button style="display:none">Hidden</button>`;
    document.body.appendChild(container);
    expect(getFocusableElements(container)).toEqual([]);
  });
});

describe('getFirstFocusable / getLastFocusable', () => {
  it('should return first and last', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button id="first">A</button><button id="last">B</button>`;
    document.body.appendChild(container);
    container.querySelectorAll('button').forEach(el => mockOffsetParent(el as HTMLElement));
    expect(getFirstFocusable(container)!.id).toBe('first');
    expect(getLastFocusable(container)!.id).toBe('last');
  });

  it('should return null when no focusable elements', () => {
    const container = document.createElement('div');
    expect(getFirstFocusable(container)).toBeNull();
    expect(getLastFocusable(container)).toBeNull();
  });
});

describe('focusElement', () => {
  it('should focus and scroll into view', () => {
    const el = document.createElement('button');
    document.body.appendChild(el);
    el.focus = jest.fn();
    el.scrollIntoView = jest.fn();
    focusElement(el);
    expect(el.focus).toHaveBeenCalled();
    expect(el.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  });

  it('should not throw for null', () => {
    expect(() => focusElement(null)).not.toThrow();
  });
});

describe('FocusStore', () => {
  it('should store, restore, and clear focus', () => {
    const store = new FocusStore();
    const el = document.createElement('button');
    document.body.appendChild(el);
    el.focus();
    store.store();
    expect(store.getStoredElement()).toBe(el);
    store.clear();
    expect(store.getStoredElement()).toBeNull();
    store.setStoredElement(el);
    expect(store.getStoredElement()).toBe(el);
    store.restore();
    expect(store.getStoredElement()).toBeNull();
  });
});

describe('createFocusTrap', () => {
  it('should create a focus trap with activate/deactivate', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button id="a">A</button><button id="b">B</button>`;
    document.body.appendChild(container);
    container.querySelectorAll('button').forEach(el => mockOffsetParent(el as HTMLElement));
    const trap = createFocusTrap(container);
    expect(trap.isActive()).toBe(false);
    expect(trap.getElement()).toBe(container);
    trap.activate();
    expect(trap.isActive()).toBe(true);
    trap.deactivate();
    expect(trap.isActive()).toBe(false);
  });

  it('should handle clickOutsideDeactivates', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button>Inside</button>`;
    document.body.appendChild(container);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const trap = createFocusTrap(container, { clickOutsideDeactivates: true });
    trap.activate();
    expect(trap.isActive()).toBe(true);
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(trap.isActive()).toBe(false);
  });

  it('should call onActivate and onDeactivate callbacks', () => {
    const onActivate = jest.fn();
    const onDeactivate = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const trap = createFocusTrap(container, { onActivate, onDeactivate });
    trap.activate();
    expect(onActivate).toHaveBeenCalled();
    trap.deactivate();
    expect(onDeactivate).toHaveBeenCalled();
  });
});

describe('FocusTrapManager', () => {
  it('should register, activate, deactivate, and unregister traps', () => {
    const manager = new FocusTrapManager();
    const el = document.createElement('div');
    document.body.appendChild(el);
    const trap = createFocusTrap(el);
    manager.register('test', trap);
    expect(manager.getActiveTraps()).toEqual([]);
    manager.activate('test');
    expect(manager.getActiveTraps()).toEqual(['test']);
    manager.deactivate('test');
    expect(manager.getActiveTraps()).toEqual([]);
    manager.unregister('test');
  });

  it('should deactivate all traps', () => {
    const manager = new FocusTrapManager();
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    document.body.appendChild(el1);
    document.body.appendChild(el2);
    manager.register('a', createFocusTrap(el1));
    manager.register('b', createFocusTrap(el2));
    manager.activate('a');
    manager.activate('b');
    expect(manager.getActiveTraps().length).toBe(2);
    manager.deactivateAll();
    expect(manager.getActiveTraps()).toEqual([]);
  });

  it('should deactivate on unregister if active', () => {
    const manager = new FocusTrapManager();
    const el = document.createElement('div');
    document.body.appendChild(el);
    const trap = createFocusTrap(el);
    const deactivateSpy = jest.spyOn(trap, 'deactivate');
    manager.register('t', trap);
    manager.activate('t');
    manager.unregister('t');
    expect(deactivateSpy).toHaveBeenCalled();
  });
});

describe('getFocusTrapManager', () => {
  it('should return singleton', () => {
    const a = getFocusTrapManager();
    const b = getFocusTrapManager();
    expect(a).toBe(b);
  });
});

describe('focusNext / focusPrevious / focusFirst / focusLast', () => {
  function setupWithFocusable(): HTMLElement[] {
    document.body.innerHTML = `<button id="a">A</button><button id="b">B</button>`;
    const buttons = document.querySelectorAll('button');
    buttons.forEach(el => mockOffsetParent(el as HTMLElement));
    return [document.getElementById('a')!, document.getElementById('b')!];
  }

  it('should navigate forward', () => {
    const [a, b] = setupWithFocusable();
    a.focus();
    focusNext();
    expect(document.activeElement).toBe(b);
  });

  it('should wrap around forward', () => {
    const [a, b] = setupWithFocusable();
    b.focus();
    focusNext();
    expect(document.activeElement).toBe(a);
  });

  it('should navigate backward', () => {
    const [a, b] = setupWithFocusable();
    b.focus();
    focusPrevious();
    expect(document.activeElement).toBe(a);
  });

  it('should wrap around backward', () => {
    const [a, b] = setupWithFocusable();
    a.focus();
    focusPrevious();
    expect(document.activeElement).toBe(b);
  });

  it('should focus first element', () => {
    setupWithFocusable();
    focusFirst();
    expect(document.activeElement).toBe(document.getElementById('a'));
  });

  it('should focus last element', () => {
    setupWithFocusable();
    focusLast();
    expect(document.activeElement).toBe(document.getElementById('b'));
  });
});
