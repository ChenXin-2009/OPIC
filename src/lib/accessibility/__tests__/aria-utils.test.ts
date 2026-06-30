import {
  addAriaLabel,
  addAriaLabelledBy,
  addAriaDescribedBy,
  addAriaRole,
  setAriaExpanded,
  setAriaChecked,
  setAriaPressed,
  setAriaSelected,
  setAriaDisabled,
  setAriaHidden,
  setAriaCurrent,
  createLiveRegion,
  announceToScreenReader,
  createAndLinkDescription,
  makeAccessibleButton,
  makeAccessibleToggle,
  makeAccessibleCheckbox,
  setProgressAttributes,
  announceRouteChange,
  announceLoading,
  announceError,
  announceSuccess,
} from '../aria-utils';

jest.useFakeTimers();

beforeEach(() => {
  document.body.innerHTML = '';
  // remove global announcer if any
  const existing = document.getElementById('aria-announcer-global');
  if (existing) existing.remove();
});

describe('addAriaLabel', () => {
  it('should set aria-label attribute', () => {
    const el = document.createElement('div');
    addAriaLabel(el, 'test label');
    expect(el.getAttribute('aria-label')).toBe('test label');
  });
});

describe('addAriaLabelledBy', () => {
  it('should set aria-labelledby attribute', () => {
    const el = document.createElement('div');
    addAriaLabelledBy(el, 'label-id');
    expect(el.getAttribute('aria-labelledby')).toBe('label-id');
  });
});

describe('addAriaDescribedBy', () => {
  it('should set aria-describedby attribute', () => {
    const el = document.createElement('div');
    addAriaDescribedBy(el, 'desc-id');
    expect(el.getAttribute('aria-describedby')).toBe('desc-id');
  });
});

describe('addAriaRole', () => {
  it('should set role attribute', () => {
    const el = document.createElement('div');
    addAriaRole(el, 'button');
    expect(el.getAttribute('role')).toBe('button');
  });
});

describe('setAriaExpanded', () => {
  it('should set aria-expanded to true/false', () => {
    const el = document.createElement('div');
    setAriaExpanded(el, true);
    expect(el.getAttribute('aria-expanded')).toBe('true');
    setAriaExpanded(el, false);
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('setAriaChecked', () => {
  it('should set aria-checked for boolean', () => {
    const el = document.createElement('div');
    setAriaChecked(el, true);
    expect(el.getAttribute('aria-checked')).toBe('true');
    setAriaChecked(el, false);
    expect(el.getAttribute('aria-checked')).toBe('false');
  });

  it('should set aria-checked to mixed', () => {
    const el = document.createElement('div');
    setAriaChecked(el, 'mixed');
    expect(el.getAttribute('aria-checked')).toBe('mixed');
  });
});

describe('setAriaPressed', () => {
  it('should set aria-pressed for boolean', () => {
    const el = document.createElement('div');
    setAriaPressed(el, true);
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('should set aria-pressed to mixed', () => {
    const el = document.createElement('div');
    setAriaPressed(el, 'mixed');
    expect(el.getAttribute('aria-pressed')).toBe('mixed');
  });
});

describe('setAriaSelected', () => {
  it('should set aria-selected', () => {
    const el = document.createElement('div');
    setAriaSelected(el, true);
    expect(el.getAttribute('aria-selected')).toBe('true');
  });
});

describe('setAriaDisabled', () => {
  it('should set aria-disabled', () => {
    const el = document.createElement('div');
    setAriaDisabled(el, true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('setAriaHidden', () => {
  it('should set aria-hidden', () => {
    const el = document.createElement('div');
    setAriaHidden(el, true);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('setAriaCurrent', () => {
  it('should set aria-current to page', () => {
    const el = document.createElement('div');
    setAriaCurrent(el, 'page');
    expect(el.getAttribute('aria-current')).toBe('page');
  });

  it('should set aria-current to true', () => {
    const el = document.createElement('div');
    setAriaCurrent(el, true);
    expect(el.getAttribute('aria-current')).toBe('true');
  });

  it('should remove aria-current when false', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-current', 'page');
    setAriaCurrent(el, false);
    expect(el.hasAttribute('aria-current')).toBe(false);
  });
});

describe('createLiveRegion', () => {
  it('should create a div with sr-only styles', () => {
    const region = createLiveRegion('polite');
    expect(region).toBeInstanceOf(HTMLDivElement);
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.className).toBe('sr-only');
  });

  it('should create assertive live region', () => {
    const region = createLiveRegion('assertive', false);
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.getAttribute('aria-atomic')).toBe('false');
  });
});

describe('announceToScreenReader', () => {
  it('should not throw when called with empty message', () => {
    expect(() => announceToScreenReader('')).not.toThrow();
  });

  it('should create announcer and post message', () => {
    announceToScreenReader('Hello world', 'polite');
    const announcer = document.getElementById('aria-announcer-global');
    expect(announcer).not.toBeNull();
    expect(announcer!.getAttribute('aria-live')).toBe('polite');
    jest.advanceTimersByTime(100);
    expect(announcer!.textContent).toBe('Hello world');
  });

  it('should reuse existing announcer', () => {
    announceToScreenReader('First');
    announceToScreenReader('Second');
    const announcers = document.querySelectorAll('#aria-announcer-global');
    expect(announcers.length).toBe(1);
  });
});

describe('createAndLinkDescription', () => {
  it('should create description element and link it', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);
    const desc = createAndLinkDescription(target, 'Close dialog');
    expect(desc).toBeInstanceOf(HTMLElement);
    expect(desc.textContent).toBe('Close dialog');
    expect(target.getAttribute('aria-describedby')).toBe(desc.id);
    expect(desc.className).toBe('sr-only');
  });

  it('should use provided descriptionId', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);
    const desc = createAndLinkDescription(target, 'Test', 'my-desc');
    expect(desc.id).toBe('my-desc');
  });
});

describe('makeAccessibleButton', () => {
  it('should set role, label, tabIndex and handle click/keydown', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const onClick = jest.fn();
    makeAccessibleButton(el, 'Submit', onClick);
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('aria-label')).toBe('Submit');
    expect(el.tabIndex).toBe(0);
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onClick).toHaveBeenCalledTimes(2);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});

describe('makeAccessibleToggle', () => {
  it('should toggle aria-pressed on click', () => {
    const el = document.createElement('div');
    const onToggle = jest.fn();
    makeAccessibleToggle(el, 'Toggle me', false, onToggle);
    expect(el.getAttribute('aria-pressed')).toBe('false');
    el.click();
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(onToggle).toHaveBeenCalledWith(true);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(el.getAttribute('aria-pressed')).toBe('false');
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});

describe('makeAccessibleCheckbox', () => {
  it('should toggle aria-checked on click', () => {
    const el = document.createElement('div');
    const onChange = jest.fn();
    makeAccessibleCheckbox(el, 'Check me', false, onChange);
    expect(el.getAttribute('aria-checked')).toBe('false');
    el.click();
    expect(el.getAttribute('aria-checked')).toBe('true');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('setProgressAttributes', () => {
  it('should set progress bar attributes', () => {
    const el = document.createElement('div');
    setProgressAttributes(el, 50, 0, 100, 'Loading');
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-valuenow')).toBe('50');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(el.getAttribute('aria-label')).toBe('Loading');
    expect(el.getAttribute('aria-valuetext')).toBe('50%');
  });

  it('should work without label', () => {
    const el = document.createElement('div');
    setProgressAttributes(el, 75);
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('aria-valuetext')).toBe('75%');
  });
});

describe('announceRouteChange / announceLoading / announceError / announceSuccess', () => {
  it('should announce route change', () => {
    announceRouteChange('Home');
    jest.advanceTimersByTime(100);
    const announcer = document.getElementById('aria-announcer-global');
    expect(announcer!.textContent).toBe('Navigated to Home');
  });

  it('should announce loading', () => {
    announceLoading('Loading data...');
    jest.advanceTimersByTime(100);
    const announcer = document.getElementById('aria-announcer-global');
    expect(announcer!.textContent).toBe('Loading data...');
  });

  it('should announce error with assertive', () => {
    announceError('Network failure');
    jest.advanceTimersByTime(100);
    const announcer = document.getElementById('aria-announcer-global');
    expect(announcer!.textContent).toBe('Error: Network failure');
    expect(announcer!.getAttribute('aria-live')).toBe('assertive');
  });

  it('should announce success', () => {
    announceSuccess('Operation completed');
    jest.advanceTimersByTime(100);
    const announcer = document.getElementById('aria-announcer-global');
    expect(announcer!.textContent).toBe('Operation completed');
  });
});
