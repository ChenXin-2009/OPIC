/**
 * macOS 风格主题配置
 * 
 * 提供主题切换和主题相关的工具函数
 */

import { Theme, designTokens, getThemeColor } from './tokens';

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  theme: Theme;
  accentColor?: string;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

/**
 * 默认主题配置
 */
export const defaultThemeConfig: ThemeConfig = {
  theme: 'auto',
  reducedMotion: false,
  highContrast: false,
};

/**
 * 获取当前系统主题
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 解析主题 (处理 auto 模式)
 */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'auto' ? getSystemTheme() : theme;
}

/**
 * 检测用户是否偏好减少动画
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 生成 CSS 变量
 */
export function generateCSSVariables(config: ThemeConfig): Record<string, string> {
  const actualTheme = resolveTheme(config.theme);
  
  return {
    // 颜色
    '--color-primary': designTokens.colors.primary[actualTheme],
    '--color-bg-primary': designTokens.colors.background[actualTheme].primary,
    '--color-bg-secondary': designTokens.colors.background[actualTheme].secondary,
    '--color-bg-tertiary': designTokens.colors.background[actualTheme].tertiary,
    '--color-text-primary': designTokens.colors.text[actualTheme].primary,
    '--color-text-secondary': designTokens.colors.text[actualTheme].secondary,
    '--color-text-tertiary': designTokens.colors.text[actualTheme].tertiary,
    '--color-text-disabled': designTokens.colors.text[actualTheme].disabled,
    '--color-border': designTokens.colors.border[actualTheme],
    
    // 窗口控制按钮
    '--color-window-close': designTokens.colors.windowControls.close,
    '--color-window-minimize': designTokens.colors.windowControls.minimize,
    '--color-window-maximize': designTokens.colors.windowControls.maximize,
    
    // 间距
    '--spacing-xs': designTokens.spacing.xs,
    '--spacing-sm': designTokens.spacing.sm,
    '--spacing-md': designTokens.spacing.md,
    '--spacing-lg': designTokens.spacing.lg,
    '--spacing-xl': designTokens.spacing.xl,
    
    // 圆角
    '--radius-sm': designTokens.borderRadius.sm,
    '--radius-md': designTokens.borderRadius.md,
    '--radius-lg': designTokens.borderRadius.lg,
    
    // 阴影
    '--shadow-sm': designTokens.shadows.sm,
    '--shadow-md': designTokens.shadows.md,
    '--shadow-lg': designTokens.shadows.lg,
    
    // 模糊
    '--blur-light': designTokens.blur.light,
    '--blur-medium': designTokens.blur.medium,
    '--blur-heavy': designTokens.blur.heavy,
    
    // 动画
    '--duration-fast': config.reducedMotion ? '0ms' : designTokens.animations.duration.fast,
    '--duration-normal': config.reducedMotion ? '0ms' : designTokens.animations.duration.normal,
    '--duration-slow': config.reducedMotion ? '0ms' : designTokens.animations.duration.slow,
    '--easing-default': designTokens.animations.easing.default,
    '--easing-spring': designTokens.animations.easing.spring,
  };
}

/**
 * 应用主题到 DOM
 */
export function applyTheme(config: ThemeConfig): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  const root = document.documentElement;
  const cssVars = generateCSSVariables(config);
  
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // 设置 data-theme 属性
  root.setAttribute('data-theme', resolveTheme(config.theme));
}

/**
 * 监听系统主题变化
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

export { Theme, designTokens, getThemeColor };
