import {
  getSystemTheme,
  resolveTheme,
  prefersReducedMotion,
  generateCSSVariables,
  applyTheme,
  watchSystemTheme,
  defaultThemeConfig,
} from '../theme';
import type { ThemeConfig } from '../theme';

describe('getSystemTheme', () => {
  it('should return "light" when matchMedia says light', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    expect(getSystemTheme()).toBe('light');
  });

  it('should return "dark" when matchMedia says dark', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    expect(getSystemTheme()).toBe('dark');
  });
});

describe('resolveTheme', () => {
  it('should return "light" for light theme', () => {
    expect(resolveTheme('light')).toBe('light');
  });

  it('should return "dark" for dark theme', () => {
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('should resolve auto to system theme (light)', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    expect(resolveTheme('auto')).toBe('light');
  });

  it('should resolve auto to system theme (dark)', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    expect(resolveTheme('auto')).toBe('dark');
  });
});

describe('prefersReducedMotion', () => {
  it('should return false when prefers-reduced-motion is not set', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it('should return true when prefers-reduced-motion: reduce', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('generateCSSVariables', () => {
  it('should generate variables for light theme', () => {
    const config: ThemeConfig = { theme: 'light' };
    const variables = generateCSSVariables(config);
    expect(variables['--color-primary']).toBe('#007AFF');
    expect(variables['--color-bg-primary']).toBe('rgba(255, 255, 255, 0.8)');
    expect(variables['--color-text-primary']).toBe('#000000');
    expect(variables['--spacing-md']).toBe('16px');
    expect(variables['--radius-md']).toBe('10px');
  });

  it('should generate variables for dark theme', () => {
    const config: ThemeConfig = { theme: 'dark' };
    const variables = generateCSSVariables(config);
    expect(variables['--color-primary']).toBe('#0A84FF');
    expect(variables['--color-bg-primary']).toBe('rgba(30, 30, 30, 0.8)');
    expect(variables['--color-text-primary']).toBe('#FFFFFF');
  });

  it('should set animation durations to 0ms when reducedMotion is true', () => {
    const config: ThemeConfig = { theme: 'light', reducedMotion: true };
    const variables = generateCSSVariables(config);
    expect(variables['--duration-fast']).toBe('0ms');
    expect(variables['--duration-normal']).toBe('0ms');
    expect(variables['--duration-slow']).toBe('0ms');
  });

  it('should use normal animation durations when reducedMotion is false', () => {
    const config: ThemeConfig = { theme: 'light', reducedMotion: false };
    const variables = generateCSSVariables(config);
    expect(variables['--duration-fast']).toBe('150ms');
    expect(variables['--duration-normal']).toBe('250ms');
    expect(variables['--duration-slow']).toBe('350ms');
  });

  it('should include window control colors', () => {
    const config: ThemeConfig = { theme: 'light' };
    const variables = generateCSSVariables(config);
    expect(variables['--color-window-close']).toBe('#FF5F57');
    expect(variables['--color-window-minimize']).toBe('#FEBC2E');
    expect(variables['--color-window-maximize']).toBe('#28C840');
  });

  it('should include shadow variables', () => {
    const config: ThemeConfig = { theme: 'light' };
    const variables = generateCSSVariables(config);
    expect(variables['--shadow-sm']).toBe('0 2px 8px rgba(0, 0, 0, 0.1)');
    expect(variables['--shadow-md']).toBe('0 4px 16px rgba(0, 0, 0, 0.15)');
  });

  it('should include blur variables', () => {
    const config: ThemeConfig = { theme: 'light' };
    const variables = generateCSSVariables(config);
    expect(variables['--blur-light']).toBe('blur(20px)');
    expect(variables['--blur-medium']).toBe('blur(40px)');
  });
});

describe('applyTheme', () => {
  it('should set CSS variables on document root', () => {
    const setProperty = jest.fn();
    const setAttribute = jest.fn();
    jest.spyOn(document, 'documentElement', 'get').mockReturnValue({
      style: { setProperty },
      setAttribute,
    } as any);

    const config: ThemeConfig = { theme: 'dark' };
    applyTheme(config);
    expect(setProperty).toHaveBeenCalled();
    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });
});

describe('watchSystemTheme', () => {
  it('should add event listener and return cleanup function', () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener,
      removeEventListener,
    }));

    const callback = jest.fn();
    const cleanup = watchSystemTheme(callback);

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(typeof cleanup).toBe('function');

    cleanup();
    expect(removeEventListener).toHaveBeenCalled();
  });
});

describe('defaultThemeConfig', () => {
  it('should have expected defaults', () => {
    expect(defaultThemeConfig.theme).toBe('auto');
    expect(defaultThemeConfig.reducedMotion).toBe(false);
    expect(defaultThemeConfig.highContrast).toBe(false);
  });
});
