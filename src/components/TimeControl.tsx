/**
 * 时间控制组件
 * 显示当前时间，提供弧形滑块控制时间流速
 */

'use client';

import React, { useRef } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import TimeSlider from './TimeSlider';
import { TIME_CONTROL_CONFIG, TIME_SLIDER_CONFIG } from '@/lib/config/visualConfig';
import { useThrottledTime, useRealTime } from './TimeControl.hooks';
import {
  calculateTimeControlOpacity,
  formatTime,
  formatDate,
  formatTimeDiff,
  calculateTimeDiff,
  shouldShowPrecisionWarning,
  createDateWithPreservedTime,
} from './TimeControl.helpers';

/**
 * TimeControl component
 * Displays current time and provides arc slider for time control
 */
const TimeControl = React.memo(() => {
  // State subscriptions
  const currentTime = useSolarSystemStore((state) => state.currentTime);
  const setCurrentTime = useSolarSystemStore((state) => state.setCurrentTime);
  const lang = useSolarSystemStore((state) => state.lang);
  const cameraDistance = useSolarSystemStore((state) => state.cameraDistance);
  
  // Refs
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Custom hooks
  const realTime = useRealTime();
  const displayTime = useThrottledTime(currentTime, 100);
  
  // Calculations
  const timeControlOpacity = calculateTimeControlOpacity(cameraDistance);
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

  return (
    <>
      {/* 主控制行：日期 | 状态/日历 | 时间 */}
      <div 
        className="absolute left-0 right-0 z-10 flex flex-col items-center px-2 sm:px-4" 
        style={{ 
          bottom: `${cfg.bottomOffset}px`,
          gap: `${cfg.gapMobile}px`,
          willChange: 'auto', 
          transform: 'translateZ(0)', 
          pointerEvents: 'none',
          opacity: timeControlOpacity,
          transition: 'opacity 0.3s ease-out',
        }}
      >
        {/* 时间信息行 - 一行显示，使用固定宽度中间区域，禁止换行 */}
        <div 
          className="flex items-center justify-center flex-nowrap" 
          style={{ 
            pointerEvents: 'none',
            gap: `${cfg.gapMobile}px`,
            flexWrap: 'nowrap',
          }}
        >
          {/* 左边：日期 - 固定宽度右对齐 */}
          <div 
            className="font-mono font-semibold text-right" 
            style={{ 
              pointerEvents: 'none', 
              color: cfg.textColor,
              fontSize: `${cfg.dateTimeSizeMobile}px`,
              width: `${cfg.dateTimeWidth}px`,
              flexShrink: 0,
            }} 
            suppressHydrationWarning
          >
            {formatDate(displayTime)}
          </div>
          
          {/* 中间：时间差/现在 + 日历按钮 - 固定宽度居中 */}
          <div 
            className="flex items-center justify-center gap-2" 
            style={{ 
              pointerEvents: 'none',
              width: `${cfg.middleSectionWidth}px`,
              flexShrink: 0,
            }}
          >
            {absTimeDiff > 0.01 && realTime ? (
              <>
                <div 
                  className="font-bold" 
                  style={{ 
                    pointerEvents: 'none', 
                    color: timeDiff > 0 ? cfg.futureColor : cfg.pastColor,
                    fontSize: `${cfg.timeDiffSizeMobile}px`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {timeDiff > 0 
                    ? (lang === 'zh' ? `未来 ${formatTimeDiff(timeDiff, lang)}` : `+${formatTimeDiff(timeDiff, lang)}`)
                    : (lang === 'zh' ? `过去 ${formatTimeDiff(absTimeDiff, lang)}` : `-${formatTimeDiff(absTimeDiff, lang)}`)
                  }
                </div>
                <button
                  onClick={handleNowClick}
                  className="transition-colors font-medium"
                  title={lang === 'zh' ? '跳转到现在' : 'Jump to now'}
                  style={{ 
                    pointerEvents: 'auto',
                    backgroundColor: cfg.nowButtonBg,
                    color: cfg.nowButtonTextColor,
                    fontSize: `${cfg.nowButtonTextSize}px`,
                    padding: cfg.nowButtonPadding,
                    borderRadius: `${cfg.nowButtonRadius}px`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = cfg.nowButtonHoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = cfg.nowButtonBg}
                >
                  {lang === 'zh' ? '现在' : 'Now'}
                </button>
              </>
            ) : (
              <div 
                className="font-bold" 
                style={{ 
                  pointerEvents: 'none', 
                  color: cfg.nowColor,
                  fontSize: `${cfg.timeDiffSizeMobile}px`,
                }}
              >
                {lang === 'zh' ? '现在' : 'Now'}
              </div>
            )}
            
            {/* 日历按钮 */}
            <button
              ref={calendarButtonRef}
              onClick={handleCalendarClick}
              className="transition-colors cursor-pointer p-0.5"
              title={lang === 'zh' ? '选择日期' : 'Select date'}
              style={{ pointerEvents: 'auto', color: cfg.calendarButtonColor }}
              onMouseEnter={(e) => e.currentTarget.style.color = cfg.calendarButtonHoverColor}
              onMouseLeave={(e) => e.currentTarget.style.color = cfg.calendarButtonColor}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width={cfg.calendarButtonSize} 
                height={cfg.calendarButtonSize} 
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
          
          {/* 右边：时间 - 固定宽度左对齐 */}
          <div 
            className="font-mono font-semibold text-left" 
            style={{ 
              pointerEvents: 'none', 
              color: cfg.textColor,
              fontSize: `${cfg.dateTimeSizeMobile}px`,
              width: `${cfg.dateTimeWidth}px`,
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
            className="flex items-center gap-1 font-medium" 
            style={{ 
              pointerEvents: 'none', 
              color: cfg.warningColor,
              fontSize: `${cfg.warningSize}px`,
            }}
          >
            <span>⚠️</span>
            <span>{lang === 'zh' ? '精度可能降低' : 'Accuracy may be reduced'}</span>
          </div>
        )}

        {/* 弧形时间滑块 */}
        <div style={{ pointerEvents: 'auto' }}>
          <TimeSlider width={TIME_SLIDER_CONFIG.width} height={TIME_SLIDER_CONFIG.height} />
        </div>
      </div>

      {/* 隐藏的日期输入框，用于直接打开日历选择器 */}
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
