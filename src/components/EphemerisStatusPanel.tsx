/**
 * EphemerisStatusPanel.tsx - 星历数据状态面板（明日方舟风格）
 * 显示所有天体的星历数据加载状态，允许用户控制每个天体的高精度模式
 */

'use client';

import { useRef, useEffect } from 'react';
import { useSolarSystemStore } from '@/lib/state';
import { useEphemerisStore, LoadingStatus, type BodyKey } from '@/lib/store/useEphemerisStore';
import { dateToJulianDay } from '@/lib/astronomy/time';

// 明日方舟风格配置
const ARKNIGHTS_CONFIG = {
  colors: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    accent: '#f0f0f0',
    dark: '#0a0a0a',
    darkLight: '#1a1a1a',
    border: '#333333',
    text: '#ffffff',
    textDim: '#999999',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#ef4444',
  },
};

// 天体分组
const BODY_GROUPS = {
  planets: ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as BodyKey[],
  earthSatellites: ['moon'] as BodyKey[],
  jupiterSatellites: ['io', 'europa', 'ganymede', 'callisto'] as BodyKey[],
  saturnSatellites: ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'hyperion', 'iapetus'] as BodyKey[],
  uranusSatellites: ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'] as BodyKey[],
  neptuneSatellites: ['triton'] as BodyKey[],
};

// 天体名称映射
const BODY_NAMES: Record<BodyKey, { zh: string; en: string }> = {
  mercury: { zh: '水星', en: 'Mercury' },
  venus: { zh: '金星', en: 'Venus' },
  earth: { zh: '地球', en: 'Earth' },
  mars: { zh: '火星', en: 'Mars' },
  jupiter: { zh: '木星', en: 'Jupiter' },
  saturn: { zh: '土星', en: 'Saturn' },
  uranus: { zh: '天王星', en: 'Uranus' },
  neptune: { zh: '海王星', en: 'Neptune' },
  moon: { zh: '月球', en: 'Moon' },
  io: { zh: '木卫一', en: 'Io' },
  europa: { zh: '木卫二', en: 'Europa' },
  ganymede: { zh: '木卫三', en: 'Ganymede' },
  callisto: { zh: '木卫四', en: 'Callisto' },
  mimas: { zh: '土卫一', en: 'Mimas' },
  enceladus: { zh: '土卫二', en: 'Enceladus' },
  tethys: { zh: '土卫三', en: 'Tethys' },
  dione: { zh: '土卫四', en: 'Dione' },
  rhea: { zh: '土卫五', en: 'Rhea' },
  titan: { zh: '土卫六', en: 'Titan' },
  hyperion: { zh: '土卫七', en: 'Hyperion' },
  iapetus: { zh: '土卫八', en: 'Iapetus' },
  miranda: { zh: '天卫五', en: 'Miranda' },
  ariel: { zh: '天卫一', en: 'Ariel' },
  umbriel: { zh: '天卫二', en: 'Umbriel' },
  titania: { zh: '天卫三', en: 'Titania' },
  oberon: { zh: '天卫四', en: 'Oberon' },
  triton: { zh: '海卫一', en: 'Triton' },
};

interface EphemerisStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EphemerisStatusPanel({ isOpen, onClose }: EphemerisStatusPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lang = useSolarSystemStore((state) => state.lang);
  const currentTime = useSolarSystemStore((state) => state.currentTime);
  const { bodies, enableBody, disableBody, enableAll, disableAll } = useEphemerisStore();

  // 当前儒略日
  const currentJD = dateToJulianDay(currentTime);

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
    return undefined;
  }, [isOpen, onClose]);

  // 焦点管理
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 检查时间是否在范围内
  const isTimeInRange = (bodyKey: BodyKey): boolean => {
    const config = bodies[bodyKey];
    if (!config.timeRange) return true;
    return currentJD >= config.timeRange.start && currentJD <= config.timeRange.end;
  };

  // 将儒略日转换为日期字符串
  const julianToDateString = (jd: number): string => {
    const date = new Date((jd - 2440587.5) * 86400000);
    return date.toISOString().split('T')[0];
  };

  // 获取状态颜色
  const getStatusColor = (status: LoadingStatus) => {
    switch (status) {
      case LoadingStatus.LOADED:
        return ARKNIGHTS_CONFIG.colors.success;
      case LoadingStatus.LOADING:
        return ARKNIGHTS_CONFIG.colors.warning;
      case LoadingStatus.ERROR:
        return ARKNIGHTS_CONFIG.colors.error;
      default:
        return ARKNIGHTS_CONFIG.colors.textDim;
    }
  };

  // 获取状态文本
  const getStatusText = (status: LoadingStatus) => {
    const texts = {
      [LoadingStatus.NOT_LOADED]: { zh: '未加载', en: 'Not Loaded' },
      [LoadingStatus.LOADING]: { zh: '加载中', en: 'Loading' },
      [LoadingStatus.LOADED]: { zh: '已加载', en: 'Loaded' },
      [LoadingStatus.ERROR]: { zh: '错误', en: 'Error' },
    };
    return texts[status][lang];
  };

  // 渲染天体项
  const renderBodyItem = (bodyKey: BodyKey) => {
    const config = bodies[bodyKey];
    const name = BODY_NAMES[bodyKey][lang];
    const statusColor = getStatusColor(config.status);
    const statusText = getStatusText(config.status);
    const inRange = isTimeInRange(bodyKey);
    
    // 获取使用状态说明
    const getUsageText = () => {
      if (!config.enabled) {
        return lang === 'zh' ? '使用解析模型（快速）' : 'Using Analytical Model (Fast)';
      }
      
      if (!inRange) {
        return lang === 'zh' ? '超出时间范围，使用解析模型' : 'Out of Range, Using Analytical';
      }
      
      switch (config.status) {
        case LoadingStatus.NOT_LOADED:
          return lang === 'zh' ? '等待加载星历数据' : 'Waiting to Load Ephemeris';
        case LoadingStatus.LOADING:
          return lang === 'zh' ? '正在下载星历数据...' : 'Downloading Ephemeris...';
        case LoadingStatus.LOADED:
          return lang === 'zh' ? '使用星历数据（高精度）' : 'Using Ephemeris (High Precision)';
        case LoadingStatus.ERROR:
          return lang === 'zh' ? '加载失败，使用解析模型' : 'Load Failed, Using Analytical';
        default:
          return '';
      }
    };

    return (
      <div
        key={bodyKey}
        className="flex flex-col gap-2 py-3 px-4"
        style={{
          background: ARKNIGHTS_CONFIG.colors.darkLight,
          border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
        }}
      >
        {/* 第一行：名称、开关、状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* 开关 */}
            <button
              onClick={() => {
                if (!inRange && !config.enabled) {
                  // 超出范围时不允许启用
                  return;
                }
                config.enabled ? disableBody(bodyKey) : enableBody(bodyKey);
              }}
              className="relative w-10 h-5 transition-all duration-200"
              style={{
                background: config.enabled && inRange ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border,
                border: `1px solid ${config.enabled && inRange ? ARKNIGHTS_CONFIG.colors.primary : ARKNIGHTS_CONFIG.colors.border}`,
                opacity: !inRange && !config.enabled ? 0.5 : 1,
                cursor: !inRange && !config.enabled ? 'not-allowed' : 'pointer',
              }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 transition-all duration-200"
                style={{
                  left: config.enabled && inRange ? 'calc(100% - 1.125rem)' : '0.125rem',
                  background: config.enabled && inRange ? ARKNIGHTS_CONFIG.colors.dark : ARKNIGHTS_CONFIG.colors.textDim,
                }}
              />
            </button>

            {/* 名称 */}
            <span
              className="text-sm font-medium"
              style={{ color: ARKNIGHTS_CONFIG.colors.text }}
            >
              {name}
            </span>
          </div>

          {/* 状态 */}
          <span
            className="text-xs"
            style={{ color: statusColor }}
          >
            {statusText}
          </span>
        </div>
        
        {/* 第二行：使用状态说明 */}
        <div className="text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.textDim, paddingLeft: '52px' }}>
          {getUsageText()}
        </div>

        {/* 第三行：时间范围（如果有） */}
        {config.timeRange && (
          <div className="text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.textDim, paddingLeft: '52px' }}>
            {lang === 'zh' ? '时间范围: ' : 'Time Range: '}
            {julianToDateString(config.timeRange.start)} ~ {julianToDateString(config.timeRange.end)}
            {!inRange && (
              <span style={{ color: ARKNIGHTS_CONFIG.colors.error, marginLeft: '8px' }}>
                ({lang === 'zh' ? '当前时间超出范围' : 'Current time out of range'})
              </span>
            )}
          </div>
        )}

        {/* 第四行：精度信息（如果有） */}
        {config.accuracy && (
          <div className="text-xs" style={{ color: ARKNIGHTS_CONFIG.colors.textDim, paddingLeft: '52px' }}>
            {lang === 'zh' ? '精度: ' : 'Accuracy: '}
            {lang === 'zh' ? '星历' : 'Ephemeris'} {config.accuracy.ephemeris} / 
            {lang === 'zh' ? ' 解析' : ' Analytical'} {config.accuracy.analytical}
          </div>
        )}
      </div>
    );
  };

  // 渲染分组
  const renderGroup = (title: string, bodyKeys: BodyKey[]) => (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center gap-2">
        <div
          style={{
            width: '3px',
            height: '14px',
            background: ARKNIGHTS_CONFIG.colors.primary,
          }}
        />
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: ARKNIGHTS_CONFIG.colors.text }}
        >
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {bodyKeys.map(renderBodyItem)}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[2000] pointer-events-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 右侧面板容器 - 明日方舟风格 */}
      <article
        ref={modalRef}
        className="relative bg-black/95 backdrop-blur-md overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '140px',
          right: '20px',
          bottom: '80px',
          width: '450px',
          maxWidth: '90vw',
          maxHeight: 'calc(100vh - 220px)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}
      >
        {/* 左上角装饰 */}
        <div 
          className="absolute"
          style={{
            top: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: '#ffffff',
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            zIndex: 20,
          }}
        />

        {/* 左下角装饰 */}
        <div 
          className="absolute"
          style={{
            bottom: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: '#ffffff',
            clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
            zIndex: 20,
          }}
        />

        {/* 关闭按钮 */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          style={{
            width: '32px',
            height: '32px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
            zIndex: 30,
            background: '#0a0a0a',
          }}
          aria-label={lang === 'zh' ? '关闭' : 'Close'}
        >
          <svg
            className="w-4 h-4 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* 标题 */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: '4px',
                height: '20px',
                background: ARKNIGHTS_CONFIG.colors.primary,
              }}
            />
            <h2
              className="text-base font-bold uppercase tracking-wider"
              style={{ color: ARKNIGHTS_CONFIG.colors.text }}
            >
              {lang === 'zh' ? '星历数据设置' : 'EPHEMERIS SETTINGS'}
            </h2>
          </div>
        </div>

        {/* 内容区域 - 带滚动条 */}
        <section
          className="px-6 pb-6 overflow-y-auto satellite-menu-scrollbar"
          style={{
            height: 'calc(100% - 140px)',
          }}
        >
          {renderGroup(lang === 'zh' ? '行星 (8)' : 'PLANETS (8)', BODY_GROUPS.planets)}
          {renderGroup(lang === 'zh' ? '地球卫星 (1)' : 'EARTH SATELLITES (1)', BODY_GROUPS.earthSatellites)}
          {renderGroup(lang === 'zh' ? '木星卫星 (4)' : 'JUPITER SATELLITES (4)', BODY_GROUPS.jupiterSatellites)}
          {renderGroup(lang === 'zh' ? '土星卫星 (8)' : 'SATURN SATELLITES (8)', BODY_GROUPS.saturnSatellites)}
          {renderGroup(lang === 'zh' ? '天王星卫星 (5)' : 'URANUS SATELLITES (5)', BODY_GROUPS.uranusSatellites)}
          {renderGroup(lang === 'zh' ? '海王星卫星 (1)' : 'NEPTUNE SATELLITES (1)', BODY_GROUPS.neptuneSatellites)}
        </section>

        {/* 底部按钮 */}
        <div
          className="absolute bottom-0 left-0 right-0 flex gap-2 p-4"
          style={{
            background: ARKNIGHTS_CONFIG.colors.dark,
            borderTop: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          }}
        >
          <button
            onClick={enableAll}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors"
            style={{
              background: ARKNIGHTS_CONFIG.colors.darkLight,
              color: ARKNIGHTS_CONFIG.colors.text,
              border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
              clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.primary;
              e.currentTarget.style.color = ARKNIGHTS_CONFIG.colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.border;
              e.currentTarget.style.color = ARKNIGHTS_CONFIG.colors.text;
            }}
          >
            {lang === 'zh' ? '全部启用' : 'ENABLE ALL'}
          </button>
          <button
            onClick={disableAll}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors"
            style={{
              background: ARKNIGHTS_CONFIG.colors.darkLight,
              color: ARKNIGHTS_CONFIG.colors.text,
              border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
              clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.primary;
              e.currentTarget.style.color = ARKNIGHTS_CONFIG.colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.border;
              e.currentTarget.style.color = ARKNIGHTS_CONFIG.colors.text;
            }}
          >
            {lang === 'zh' ? '全部禁用' : 'DISABLE ALL'}
          </button>
        </div>
      </article>
    </div>
  );
}
