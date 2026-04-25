/**
 * macOS 风格设计系统 Tokens
 * 
 * 定义统一的设计规范，包括颜色、间距、圆角、阴影、模糊、动画等
 * 支持亮色和暗色主题
 */

export type Theme = 'light' | 'dark' | 'auto';

/**
 * 颜色系统
 */
export const colors = {
  // macOS 主色调
  primary: {
    light: '#007AFF',
    dark: '#0A84FF',
  },
  
  // 背景色
  background: {
    light: {
      primary: 'rgba(255, 255, 255, 0.8)',
      secondary: 'rgba(242, 242, 247, 0.8)',
      tertiary: 'rgba(255, 255, 255, 0.6)',
    },
    dark: {
      primary: 'rgba(30, 30, 30, 0.8)',
      secondary: 'rgba(44, 44, 46, 0.8)',
      tertiary: 'rgba(58, 58, 60, 0.8)',
    },
  },
  
  // 文字颜色
  text: {
    light: {
      primary: '#000000',
      secondary: '#666666',
      tertiary: '#999999',
      disabled: '#CCCCCC',
    },
    dark: {
      primary: '#FFFFFF',
      secondary: '#EBEBF5',
      tertiary: '#AEAEB2',
      disabled: '#636366',
    },
  },
  
  // 边框颜色
  border: {
    light: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(255, 255, 255, 0.1)',
  },
  
  // 辅助色
  accent: {
    red: {
      light: '#FF3B30',
      dark: '#FF453A',
    },
    orange: {
      light: '#FF9500',
      dark: '#FF9F0A',
    },
    yellow: {
      light: '#FFCC00',
      dark: '#FFD60A',
    },
    green: {
      light: '#34C759',
      dark: '#32D74B',
    },
    blue: {
      light: '#007AFF',
      dark: '#0A84FF',
    },
    purple: {
      light: '#AF52DE',
      dark: '#BF5AF2',
    },
    pink: {
      light: '#FF2D55',
      dark: '#FF375F',
    },
  },
  
  // macOS 窗口控制按钮颜色
  windowControls: {
    close: '#FF5F57',
    minimize: '#FEBC2E',
    maximize: '#28C840',
  },
} as const;

/**
 * 间距系统 (4px 基准网格)
 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

/**
 * 圆角规范
 */
export const borderRadius = {
  none: '0',
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '18px',
  full: '9999px',
} as const;

/**
 * 阴影规范
 */
export const shadows = {
  none: 'none',
  sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
  md: '0 4px 16px rgba(0, 0, 0, 0.15)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.2)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.25)',
} as const;

/**
 * 毛玻璃效果参数
 */
export const blur = {
  none: 'blur(0)',
  light: 'blur(20px)',
  medium: 'blur(40px)',
  heavy: 'blur(60px)',
} as const;

/**
 * 动画规范
 */
export const animations = {
  // 持续时间
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },
  
  // 缓动函数
  easing: {
    // 标准缓动
    default: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    // 弹性缓动 (macOS 风格)
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    // 进入
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    // 退出
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    // 进入退出
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;

/**
 * 字体系统
 */
export const typography = {
  // 字体族
  fontFamily: {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  
  // 字号
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  
  // 行高
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  
  // 字重
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/**
 * z-index 层级
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

/**
 * 断点 (响应式)
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * 设计系统 Tokens 集合
 */
export const designTokens = {
  colors,
  spacing,
  borderRadius,
  shadows,
  blur,
  animations,
  typography,
  zIndex,
  breakpoints,
} as const;

/**
 * 获取主题相关的颜色
 */
export function getThemeColor(theme: Theme, colorPath: string): string {
  const actualTheme = theme === 'auto' 
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  
  const parts = colorPath.split('.');
  let value: any = colors;
  
  for (const part of parts) {
    value = value[part];
    if (value === undefined) {
      console.warn(`Color path "${colorPath}" not found`);
      return '';
    }
  }
  
  // 如果值是对象且包含 light/dark，返回对应主题的值
  if (typeof value === 'object' && (value.light || value.dark)) {
    return value[actualTheme] || value.light || '';
  }
  
  return value;
}

export default designTokens;
