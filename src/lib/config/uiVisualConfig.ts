/**
 * UI 布局常量配置 (UI Visual Config)
 *
 * 定义前端 UI 组件的布局参数和样式常量：
 * - HEADER_CONFIG: 顶部 Logo 区域（位置、大小、浮动模式）
 * - DISTANCE_DISPLAY_CONFIG: 天体距离显示面板
 * - TIME_SLIDER_CONFIG: 时间控制滑块
 * - TIME_CONTROL_CONFIG: 时间播放控制按钮
 */

export const HEADER_CONFIG = {
  enabled: true,
  logoPath: '/LOGO/logolw.svg',
  logoSize: 200,
  paddingLeft: 10,
  height: 80,
  floatingMode: true,
  floatingPosition: {
    top: 12,
    left: 12,
  },
  floatingStyle: {
    transitionDuration: 180,
    backgroundColor: 'transparent',
    hoverBackgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    boxShadow: 'none',
    backdropFilter: 'none',
  },
  logoOpacity: 0.6,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  titleText: 'OPIC开放集成宇宙',
  subtitleText: 'opic.cxin.tech',
  titleFontSize: 24,
  subtitleFontSize: 14,
  titleFontWeight: 600,
  subtitleFontWeight: 400,
  textColor: '#ffffff',
  subtitleColor: '#b0b0b0',
  textSpacing: 4,
  contentGap: 20,
};

export const DISTANCE_DISPLAY_CONFIG = {
  left: 5,
  verticalPosition: 'center' as 'center' | number,
  backgroundColor: 'transparent',
  backdropBlur: 0,
  borderRadius: 0,
  padding: {
    vertical: 0,
    horizontal: 0,
  },
  titleText: '您现在距离地球',
  titleFontSize: 12,
  titleOpacity: 0.8,
  valueFontSize: 16,
  valueFontWeight: 'bold' as string,
  unitFontSize: 15,
  unitOpacity: 0.9,
  lineGap: 1,
  textColor: '#ffffff',
  fontFamily: '"Source Han Serif CN", "SimSun", serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)',
  zIndex: 10,
};

export const TIME_SLIDER_CONFIG = {
  width: 600,
  widthMobile: 280,
  height: 35,
  arcDepthRatio: 0.6,
  sliderRadius: 10,
  trackPadding: 4,
  trackMinWidth: 1,
  trackMaxWidth: 1.5,
  maxSpeed: 1095,
  speedExponent: 2.5,
  deadZone: 0.05,
  speedZones: [
    {
      name: 'second',
      start: 0.05,
      end: 0.15,
      maxSpeed: 60 / 86400,
      exponent: 1.8,
      unit: { zh: '秒/秒', en: 's/s' }
    },
    {
      name: 'minute',
      start: 0.15,
      end: 0.3,
      maxSpeed: 60 / 1440,
      exponent: 1.8,
      unit: { zh: '分/秒', en: 'min/s' }
    },
    {
      name: 'hour',
      start: 0.3,
      end: 0.5,
      maxSpeed: 24 / 24,
      exponent: 2.0,
      unit: { zh: '时/秒', en: 'h/s' }
    },
    {
      name: 'day',
      start: 0.5,
      end: 0.7,
      maxSpeed: 30,
      exponent: 2.0,
      unit: { zh: '天/秒', en: 'd/s' }
    },
    {
      name: 'month',
      start: 0.7,
      end: 0.85,
      maxSpeed: 365,
      exponent: 2.2,
      unit: { zh: '月/秒', en: 'm/s' }
    },
    {
      name: 'year',
      start: 0.85,
      end: 1.0,
      maxSpeed: 1095,
      exponent: 2.5,
      unit: { zh: '年/秒', en: 'y/s' }
    }
  ] as const,
  trackColorEnd: 'rgba(255, 255, 255, 0.1)',
  trackColorCenter: 'rgba(255, 255, 255, 0.4)',
  forwardColorEnd: 'rgba(59, 130, 246, 0.1)',
  forwardColorCenter: 'rgba(59, 130, 246, 0.6)',
  backwardColorEnd: 'rgba(239, 68, 68, 0.1)',
  backwardColorCenter: 'rgba(239, 68, 68, 0.6)',
  sliderBorderColor: 'rgba(255, 255, 255, 0.8)',
  sliderForwardColor: '#3b82f6',
  sliderBackwardColor: '#ef4444',
  sliderBorderWidth: 2,
  sliderGlowRadius: 12,
  speedTextForwardColor: '#3b82f6',
  speedTextBackwardColor: '#ef4444',
  speedTextSize: 15,
  speedTextBottom: -5,
};

export const TIME_CONTROL_CONFIG = {
  textColor: '#ffffff',
  futureColor: '#60a5fa',
  pastColor: '#9ca3af',
  nowColor: '#ffffffff',
  warningColor: '#facc15',
  dateTimeSizeMobile: 20,
  dateTimeSizeDesktop: 20,
  timeDiffSizeMobile: 14,
  timeDiffSizeDesktop: 14,
  warningSize: 14,
  nowButtonBg: 'rgba(59, 130, 246, 0.8)',
  nowButtonHoverBg: '#3b82f6',
  nowButtonTextColor: '#ffffff',
  nowButtonTextSize: 12,
  nowButtonRadius: 4,
  nowButtonPadding: '2px 8px',
  calendarButtonColor: 'rgba(255, 255, 255, 0.6)',
  calendarButtonHoverColor: '#ffffff',
  calendarButtonSize: 16,
  bottomOffset: 10,
  gapMobile: 6,
  gapDesktop: 8,
  dateTimeWidth: 200,
  dateTimeWidthMobile: 140,
  middleSectionWidth: 250,
  middleSectionWidthMobile: 120,
};
