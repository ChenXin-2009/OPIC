import {
  enableHighContrastMode,
  disableHighContrastMode,
  toggleHighContrastMode,
  isHighContrastEnabled,
  initializeHighContrastMode,
  WCAG_AAA_THEME,
  watchSystemPreference,
} from '../high-contrast';

beforeEach(() => {
  document.documentElement.classList.remove('high-contrast-mode');
  Object.values({
    '--hc-text': '', '--hc-background': '', '--hc-border': '', '--hc-focus': '',
    '--hc-link': '', '--hc-link-visited': '', '--hc-button-text': '', '--hc-button-bg': '',
    '--hc-disabled': '', '--hc-error': '', '--hc-success': '', '--hc-warning': '',
  }).forEach(v => document.documentElement.style.removeProperty(v));
  try { localStorage.removeItem('opic_high_contrast_enabled'); } catch {}
});

describe('enableHighContrastMode', () => {
  it('should add class and apply theme CSS vars', () => {
    enableHighContrastMode();
    expect(document.documentElement.classList.contains('high-contrast-mode')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--hc-text')).toBe(WCAG_AAA_THEME.text);
    expect(document.documentElement.style.getPropertyValue('--hc-background')).toBe(WCAG_AAA_THEME.background);
  });

  it('should persist to localStorage', () => {
    enableHighContrastMode();
    expect(localStorage.getItem('opic_high_contrast_enabled')).toBe('true');
  });

  it('should accept custom theme', () => {
    const customTheme = {
      text: '#111', background: '#222', border: '#333', focus: '#444',
      link: '#555', linkVisited: '#666', buttonText: '#777', buttonBackground: '#888',
      disabled: '#999', error: '#aaa', success: '#bbb', warning: '#ccc',
    };
    enableHighContrastMode(customTheme);
    expect(document.documentElement.style.getPropertyValue('--hc-text')).toBe('#111');
  });
});

describe('disableHighContrastMode', () => {
  it('should remove class and CSS vars', () => {
    enableHighContrastMode();
    disableHighContrastMode();
    expect(document.documentElement.classList.contains('high-contrast-mode')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--hc-text')).toBe('');
  });

  it('should persist false to localStorage', () => {
    disableHighContrastMode();
    expect(localStorage.getItem('opic_high_contrast_enabled')).toBe('false');
  });
});

describe('toggleHighContrastMode', () => {
  it('should toggle from off to on', () => {
    expect(toggleHighContrastMode()).toBe(true);
    expect(isHighContrastEnabled()).toBe(true);
  });

  it('should toggle from on to off', () => {
    enableHighContrastMode();
    expect(toggleHighContrastMode()).toBe(false);
    expect(isHighContrastEnabled()).toBe(false);
  });
});

describe('isHighContrastEnabled', () => {
  it('should return false when not enabled', () => {
    expect(isHighContrastEnabled()).toBe(false);
  });

  it('should return true when enabled', () => {
    enableHighContrastMode();
    expect(isHighContrastEnabled()).toBe(true);
  });
});

describe('initializeHighContrastMode', () => {
  it('should enable from localStorage', () => {
    localStorage.setItem('opic_high_contrast_enabled', 'true');
    initializeHighContrastMode();
    expect(isHighContrastEnabled()).toBe(true);
  });

  it('should not enable from localStorage false', () => {
    localStorage.setItem('opic_high_contrast_enabled', 'false');
    initializeHighContrastMode();
    expect(isHighContrastEnabled()).toBe(false);
  });
});

describe('watchSystemPreference', () => {
  it('should return a cleanup function', () => {
    const cleanup = watchSystemPreference();
    expect(cleanup).toBeInstanceOf(Function);
    cleanup();
  });
});
