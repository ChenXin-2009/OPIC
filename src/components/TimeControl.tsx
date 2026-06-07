/**
 * 时间控制组件 (TimeControl)
 * 
 * 核心职责：
 * - 显示当前模拟时间（日期和时间）
 * - 提供时间导航和快速跳转功能
 * - 显示时间差信息（相对于现实时间）
 * - 集成时间滑块控制时间流速
 * - 响应式适配不同屏幕尺寸
 * 
 * UI布局（从上到下）：
 * 1. 时间信息行：
 *    - 左侧：日期 (YYYY-MM-DD)
 *    - 中间：时间差显示 + "现在"按钮 + 日历按钮
 *    - 右侧：时间 (HH:MM:SS)
 * 2. 精度警告（当时间差>100年时显示）
 * 3. 时间滑块（轴式滑块，控制时间流速）
 * 
 * 响应式设计：
 * - 桌面版：较大的字体和间距
 * - 移动版：紧凑的布局和字体
 * - 自动检测屏幕宽度调整（阈值：768px）
 * 
 * 性能优化：
 * - 使用 React.memo 避免不必要的重渲染
 * - 节流时间更新（100ms间隔）
 * - 选择性状态订阅
 * - CSS transform和opacity优化动画性能
 * 
 * 渐隐效果：
 * - 当相机距离超过3000AU时开始淡出
 * - 5000AU时完全隐藏
 * - 选中系外行星系统时重新显示
 * - 使用opacity transition实现平滑过渡
 * 
 * 交互功能：
 * 1. 日期选择：
 *    - 点击日历图标打开原生日期选择器
 *    - 选择新日期时保留当前时间
 *    - 支持1900-2100年范围
 * 
 * 2. 快速跳转：
 *    - 点击"现在"按钮跳转到当前时间
 *    - 仅在时间差显著时显示（>0.01天）
 * 
 * 3. 时间差显示：
 *    - 未来时间：蓝色显示，带"未来"或"+"前缀
 *    - 过去时间：灰色显示，带"过去"或"-"前缀
 *    - 人性化格式：分钟、小时、天、年
 * 
 * 国际化：
 * - 支持中文和英文
 * - 使用useTranslation hook
 * - 时间格式根据语言调整
 * 
 * 与其他组件的关系：
 * - TimeSlider：时间流速控制滑块（子组件）
 * - useSolarSystemStore：全局状态管理
 * - useExoplanetStore：系外行星选择状态
 * 
 * @component
 * @example
 * ```tsx
 * // 基本使用
 * <TimeControl />
 * 
 * // 通常放置在场景的底部
 * <div className="scene-container">
 *   <Canvas />
 *   <TimeControl />
 *   <Dock />
 * </div>
 * ```
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
 * 
 * 使用React.memo优化性能，只有当props改变时才重新渲染。
 * 但由于此组件没有props，所以主要依靠Zustand的选择性订阅来优化。
 * 
 * 内部状态管理：
 * - 从useSolarSystemStore选择性订阅必要的状态
 * - 使用自定义hooks处理时间节流和实时时间
 * - 响应式检测使用本地useState管理
 * - 系外行星选择状态动态导入避免循环依赖
 * 
 * 渲染优化策略：
 * 1. 早期返回（Early Return）：
 *    - opacity为0时不渲染任何内容
 *    - 避免不必要的DOM操作
 * 
 * 2. 样式优化：
 *    - 使用willChange和transform: translateZ(0)触发GPU加速
 *    - pointerEvents精确控制交互区域
 * 
 * 3. 事件处理：
 *    - useCallback缓存事件处理函数
 *    - 避免子组件不必要的重渲染
 */
const TimeControl = React.memo(() => {
  // ========== 状态订阅 ==========
  // 从全局store中选择性订阅需要的状态
  // 只订阅必要的状态可以减少不必要的重渲染
  const currentTime = useSolarSystemStore((state) => state.currentTime);
  const setCurrentTime = useSolarSystemStore((state) => state.setCurrentTime);
  const { t, lang } = useTranslation();
  const cameraDistance = useSolarSystemStore((state) => state.cameraDistance);
  
  // ========== 系外行星选择状态 ==========
  // 检测是否选中了系外行星系统
  // 动态导入避免循环依赖问题
  const [hasExoplanetSelection, setHasExoplanetSelection] = React.useState(false);
  
  React.useEffect(() => {
    // 动态导入useExoplanetStore避免循环依赖
    import('@/lib/store/useExoplanetStore').then(({ useExoplanetStore }) => {
      // 订阅系外行星选择状态
      const unsubscribe = useExoplanetStore.subscribe((state) => {
        setHasExoplanetSelection(!!state.selectedHostName);
      });
      
      // 设置初始状态
      setHasExoplanetSelection(!!useExoplanetStore.getState().selectedHostName);
      
      // 清理订阅
      return () => unsubscribe();
    });
  }, []);
  
  // ========== Refs ==========
  // 日历按钮和隐藏的日期输入框的引用
  // 用于程序化地打开日期选择器
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // ========== 响应式检测 ==========
  // 检测屏幕宽度，决定使用桌面版还是移动版布局
  // 阈值：768px (常见的平板/手机分界点)
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初始检测
    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    
    // 清理监听器
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // ========== 自定义Hooks ==========
  // realTime: 当前真实世界时间（客户端）
  // displayTime: 节流后的显示时间，减少重渲染频率
  const realTime = useRealTime();
  const displayTime = useThrottledTime(currentTime, 100);
  
  // ========== 计算值 ==========
  // 根据状态计算UI显示所需的各种值
  
  // 透明度：基于相机距离和系外行星选择状态
  const timeControlOpacity = calculateTimeControlOpacity(cameraDistance, hasExoplanetSelection);
  
  // 时间差：当前显示时间与真实时间的差距（天）
  const timeDiff = calculateTimeDiff(displayTime, realTime);
  const absTimeDiff = Math.abs(timeDiff);
  
  // 是否显示精度警告：时间差超过100年时显示
  const showPrecisionWarning = shouldShowPrecisionWarning(timeDiff);

  // ========== 事件处理 ==========
  
  /**
   * 处理日期变更
   * 
   * 当用户在日期选择器中选择新日期时触发。
   * 保留当前的时间（小时、分钟、秒），只更新日期部分。
   * 
   * 实现逻辑：
   * 1. 从input获取新日期字符串
   * 2. 创建新Date对象，保留当前时间
   * 3. 验证日期有效性
   * 4. 更新全局时间状态
   * 
   * @param e - React change事件
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = createDateWithPreservedTime(e.target.value, currentTime);
    if (newDate) {
      setCurrentTime(newDate);
    }
  };

  /**
   * 处理日历按钮点击
   * 
   * 程序化地触发隐藏的日期输入框的原生日期选择器。
   * 使用原生日期选择器提供更好的用户体验和无障碍支持。
   * 
   * 兼容性：
   * - 现代浏览器支持showPicker API
   * - 旧浏览器会降级为手动聚焦输入框
   */
  const handleCalendarClick = () => {
    if (dateInputRef.current && 'showPicker' in dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  /**
   * 处理"现在"按钮点击
   * 
   * 将模拟时间重置为当前真实世界时间。
   * 常用于从历史或未来时间快速返回当前。
   */
  const handleNowClick = () => {
    setCurrentTime(new Date());
  };

  // ========== 早期返回优化 ==========
  // 如果完全透明，不渲染任何DOM元素
  // 避免不必要的DOM操作和布局计算
  if (timeControlOpacity <= 0) {
    return null;
  }

  // ========== 响应式配置 ==========
  // 根据屏幕尺寸选择合适的配置值
  const cfg = TIME_CONTROL_CONFIG;
  
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
