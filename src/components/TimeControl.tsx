/**
 * 时间控制组件
 * 显示当前时间，提供坐标轴式滑块控制时间流速
 */

'use client';

import React, { useRef } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import TimeSlider from './TimeSlider';
import { TIME_CONTROL_CONFIG, TIME_SLIDER_CONFIG } from '@/lib/config/visualConfig';
import { useRealTime, useThrottledTime } from './TimeControl.hooks';
import { formatTimeDiff, useTranslation } from '@/hooks/useTranslation';
import {
  calculateTimeControlOpacity,
  calculateTimeDiff,
  createDateWithPreservedTime,
  formatDate,
  formatTime,
  shouldShowPrecisionWarning,
} from './TimeControl.helpers';

/**
 * TimeControl component
 * Displays current time and provides axis-style slider for time control
 */
const TimeControl = React.memo(() => {
  // State subscriptions
  const currentTime = useSolarSystemStore((state) => state.currentTime);
  const setCurrentTime = useSolarSystemStore((state) => state.setCurrentTime);
  const { t, lang } = useTranslation();
  const cameraDistance = useSolarSystemStore((state) => state.cameraDistance);
  
  // Check if an exoplanet system is selected
  const [hasExoplanetSelection, setHasExoplanetSelection] = React.useState(false);
  
  React.useEffect(() => {
    // Import dynamically to avoid circular dependencies
    import('@/lib/store/useExoplanetStore').then(({ useExoplanetStore }) => {
      const unsubscribe = useExoplanetStore.subscribe((state) => {
        setHasExoplanetSelection(!!state.selectedHostName);
      });
      
      // Set initial state
      setHasExoplanetSelection(!!useExoplanetStore.getState().selectedHostName);
      
      return () => unsubscribe();
    });
  }, []);
  
  // Refs
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // 响应式检测
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Custom hooks
  const realTime = useRealTime();
  const displayTime = useThrottledTime(currentTime, 100);
  
  // Calculations
  const timeControlOpacity = calculateTimeControlOpacity(cameraDistance, hasExoplanetSelection);
  const timeDiff = calculateTimeDiff(displayTime, realTime);
  const absTimeDiff = Math.abs(timeDiff);
  const showPrecisionWarning = shouldShowPrecisionWarning(timeDiff);

  // Event handlers
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = createDateWithPreservedTime(e.target.value, currentTime);
    if (newDate) {
      setCurrentTime(newDate);
    }
  };

  const handleCalendarClick = () => {
    if (dateInputRef.current && 'showPicker' in dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  const handleNowClick = () => {
    setCurrentTime(new Date());
  };

  // Early return if fully transparent
  if (timeControlOpacity <= 0) {
    return null;
  }

  const cfg = TIME_CONTROL_CONFIG;
  
  // 响应式配置
  const dateTimeWidth = isMobile ? cfg.dateTimeWidthMobile : cfg.dateTimeWidth;
  const middleSectionWidth = isMobile ? cfg.middleSectionWidthMobile : cfg.middleSectionWidth;
  const sliderWidth = isMobile ? TIME_SLIDER_CONFIG.widthMobile : TIME_SLIDER_CONFIG.width;

  return (
    <>
      {/* 时间控制面板 */}
      <div 
        className="absolute left-0 right-0 z-10 flex flex-col items-center px-2 sm:px-4" 
        style={{ 
          bottom: `${cfg.bottomOffset + 80}px`, // 上移 80px 避开 Dock (16-24px 间距)
          gap: `${isMobile ? 8 : 12}px`,
          willChange: 'auto', 
          transform: 'translateZ(0)', 
          pointerEvents: 'none',
          opacity: timeControlOpacity,
          transition: 'opacity 0.3s ease-out',
        }}
      >
        {/* 时间信息行 */}
        <div 
          className="flex items-center justify-center flex-nowrap gap-4" 
          style={{ 
            flexWrap: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {/* 左边：日期 */}
          <div 
            className="font-mono font-semibold text-right" 
            style={{ 
              pointerEvents: 'none',
              color: '#ffffff',
              fontSize: `${isMobile ? 18 : 20}px`,
              minWidth: `${isMobile ? 120 : 140}px`,
              flexShrink: 0,
            }} 
            suppressHydrationWarning
          >
            {formatDate(displayTime)}
          </div>
          
          {/* 中间：时间差/现在 + 日历按钮 */}
          <div 
            className="flex items-center justify-center gap-2" 
            style={{ 
              pointerEvents: 'none',
              minWidth: `${isMobile ? 100 : 120}px`,
              flexShrink: 0,
            }}
          >
            {absTimeDiff > 0.01 && realTime ? (
              <>
                <div 
                  className="font-bold whitespace-nowrap" 
                  style={{ 
                    pointerEvents: 'none',
                    color: timeDiff > 0 ? '#60a5fa' : '#9ca3af',
                    fontSize: `${isMobile ? 12 : 14}px`,
                  }}
                >
                  {timeDiff > 0 
                    ? (lang === 'zh' ? `${t('timeControl.future')} ${formatTimeDiff(timeDiff, lang)}` : `+${formatTimeDiff(timeDiff, lang)}`)
                    : (lang === 'zh' ? `${t('timeControl.past')} ${formatTimeDiff(absTimeDiff, lang)}` : `-${formatTimeDiff(absTimeDiff, lang)}`)
                  }
                </div>
                <button
                  onClick={handleNowClick}
                  className="px-3 py-1 rounded-md font-medium transition-all hover:scale-105"
                  title={t('timeControl.jumpToNow')}
                  style={{ 
                    pointerEvents: 'auto',
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    color: '#ffffff',
                    fontSize: `${isMobile ? 11 : 12}px`,
                  }}
                >
                  {t('common.now')}
                </button>
              </>
            ) : (
              <div 
                className="font-bold" 
                style={{ 
                  pointerEvents: 'none',
                  color: '#ffffff',
                  fontSize: `${isMobile ? 12 : 14}px`,
                }}
              >
                {t('common.now')}
              </div>
            )}
            
            {/* 日历按钮 */}
            <button
              ref={calendarButtonRef}
              onClick={handleCalendarClick}
              className="p-1 rounded-md transition-all hover:bg-white/10"
              title={t('timeControl.selectDate')}
              style={{ pointerEvents: 'auto', color: 'rgba(255, 255, 255, 0.6)' }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width={16} 
                height={16} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
          </div>
          
          {/* 右边：时间 */}
          <div 
            className="font-mono font-semibold text-left" 
            style={{ 
              pointerEvents: 'none',
              color: '#ffffff',
              fontSize: `${isMobile ? 18 : 20}px`,
              minWidth: `${isMobile ? 120 : 140}px`,
              flexShrink: 0,
            }} 
            suppressHydrationWarning
          >
            {formatTime(displayTime)}
          </div>
        </div>
        
        {/* 精度警告 */}
        {showPrecisionWarning && (
          <div 
            className="flex items-center gap-1 font-medium text-sm" 
            style={{ 
              pointerEvents: 'none',
              color: '#facc15',
            }}
          >
            <span>⚠️</span>
            <span>{t('timeControl.accuracyWarning')}</span>
          </div>
        )}

        {/* 时间滑块 */}
        <div style={{ pointerEvents: 'auto' }}>
          <TimeSlider width={sliderWidth} height={TIME_SLIDER_CONFIG.height} />
        </div>
      </div>

      {/* 隐藏的日期输入框 */}
      <input
        ref={dateInputRef}
        type="date"
        value={formatDate(displayTime)}
        onChange={handleDateChange}
        className="hidden"
        max={formatDate(new Date(2100, 11, 31))}
        min={formatDate(new Date(1900, 0, 1))}
      />
    </>  
  );
});

TimeControl.displayName = 'TimeControl';

export default TimeControl;
