/**
 * SatelliteMenu - 卫星菜单组件（明日方舟风格）
 * 
 * 合并卫星控制面板和信息面板，通过按钮展开/收起
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSatelliteStore } from '@/lib/store/useSatelliteStore';
import { OrbitType } from '@/lib/types/satellite';

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
    leo: '#00aaff',
    meo: '#00ff00',
    geo: '#ff0000',
    heo: '#ffffff',
  },
};

interface SatelliteMenuProps {
  lang?: 'zh' | 'en';
}

export function SatelliteMenu({ lang = 'zh' }: SatelliteMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    searchQuery,
    showSatellites,
    visibleSatellites,
    lastUpdate,
    loading,
    selectedSatellite,
    showOrbits,
    setSearchQuery,
    setShowSatellites,
    fetchSatellites,
    selectSatellite,
    toggleOrbit,
  } = useSatelliteStore();

  // 只在需要时获取选中的卫星数据
  const satellite = selectedSatellite 
    ? useSatelliteStore.getState().satellites.get(selectedSatellite) 
    : null;

  // 搜索防抖 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, setSearchQuery]);

  // 组件加载时自动获取卫星数据
  useEffect(() => {
    const state = useSatelliteStore.getState();
    // 只在没有数据时才自动获取
    if (state.tleData.size === 0 && !loading) {
      fetchSatellites();
    }
  }, [fetchSatellites, loading]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  // 格式化更新时间
  const formatUpdateTime = (date: Date | null) => {
    if (!date) return lang === 'zh' ? '未更新' : 'Not updated';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (minutes < 60) return lang === 'zh' ? `${minutes}分钟前` : `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return lang === 'zh' ? `${hours}小时前` : `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return lang === 'zh' ? `${days}天前` : `${days}d ago`;
  };

  // 获取轨道类型颜色
  const getOrbitColor = (orbitType: OrbitType): string => {
    switch (orbitType) {
      case OrbitType.LEO:
        return ARKNIGHTS_CONFIG.colors.leo;
      case OrbitType.MEO:
        return ARKNIGHTS_CONFIG.colors.meo;
      case OrbitType.GEO:
        return ARKNIGHTS_CONFIG.colors.geo;
      case OrbitType.HEO:
        return ARKNIGHTS_CONFIG.colors.heo;
      default:
        return ARKNIGHTS_CONFIG.colors.text;
    }
  };

  // 获取轨道类型标签
  const getOrbitTypeLabel = (orbitType: OrbitType): string => {
    const labels = {
      [OrbitType.LEO]: { zh: '低轨', en: 'LEO' },
      [OrbitType.MEO]: { zh: '中轨', en: 'MEO' },
      [OrbitType.GEO]: { zh: '同步轨道', en: 'GEO' },
      [OrbitType.HEO]: { zh: '高椭圆轨道', en: 'HEO' },
    };
    return labels[orbitType]?.[lang] || orbitType;
  };

  // 计算轨道颜色和可见性
  const orbitColor = satellite ? getOrbitColor(satellite.orbitType) : ARKNIGHTS_CONFIG.colors.primary;
  const isOrbitVisible = selectedSatellite ? showOrbits.has(selectedSatellite) : false;

  return (
    <>
      {/* 卫星按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.primary;
          e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = ARKNIGHTS_CONFIG.colors.border;
          e.currentTarget.style.boxShadow = 'none';
        }}
        className="fixed"
        style={{
          top: '2rem',
          right: 'calc(2rem + 120px)',
          zIndex: 1001,
          background: ARKNIGHTS_CONFIG.colors.dark,
          border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
          cursor: 'pointer',
          padding: '8px 16px',
          transition: 'all 0.3s ease',
          color: ARKNIGHTS_CONFIG.colors.text,
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}
        aria-label={lang === 'zh' ? '地球卫星' : 'Earth Satellites'}
      >
        {/* 左上角菱形装饰 */}
        <div 
          style={{
            position: 'absolute',
            top: '-1px',
            left: '-1px',
            width: '12px',
            height: '12px',
            background: ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />
        
        {/* 右下角菱形装饰 */}
        <div 
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '12px',
            height: '12px',
            background: ARKNIGHTS_CONFIG.colors.primary,
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />
        
        {lang === 'zh' ? '地球卫星' : 'EARTH SATELLITES'}
      </button>

      {/* 卫星菜单面板 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 satellite-menu-scrollbar"
          style={{
            top: 'calc(2rem + 50px)',
            right: 'calc(2rem + 120px)',
            width: '22rem',
            maxHeight: 'calc(100vh - 6rem)',
            background: ARKNIGHTS_CONFIG.colors.dark,
            border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            animation: 'slideIn 0.3s ease-out',
            overflowY: 'auto',
            overflowX: 'hidden',
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
              background: ARKNIGHTS_CONFIG.colors.primary,
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            }}
          />
          
          {/* 右下角装饰 */}
          <div 
            className="absolute"
            style={{
              bottom: '-1px',
              right: '-1px',
              width: '12px',
              height: '12px',
              background: ARKNIGHTS_CONFIG.colors.primary,
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            }}
          />
          
          <div className="p-4">
            {/* 标题 */}
            <div
              className="flex items-center gap-2 pb-3 mb-4"
              style={{
                borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
              }}
            >
              <div
                style={{
                  width: '4px',
                  height: '16px',
                  background: ARKNIGHTS_CONFIG.colors.primary,
                }}
              />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: ARKNIGHTS_CONFIG.colors.text }}
              >
                {lang === 'zh' ? '卫星控制' : 'SATELLITE CONTROL'}
              </span>
            </div>

            {/* 可见性开关 */}
            <div className="mb-4">
              <button
                onClick={() => setShowSatellites(!showSatellites)}
                className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                style={{
                  background: showSatellites
                    ? ARKNIGHTS_CONFIG.colors.primary
                    : ARKNIGHTS_CONFIG.colors.darkLight,
                  color: showSatellites
                    ? ARKNIGHTS_CONFIG.colors.dark
                    : ARKNIGHTS_CONFIG.colors.textDim,
                  border: `1px solid ${
                    showSatellites
                      ? ARKNIGHTS_CONFIG.colors.primary
                      : ARKNIGHTS_CONFIG.colors.border
                  }`,
                  clipPath:
                    'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                }}
              >
                {showSatellites
                  ? lang === 'zh'
                    ? '隐藏卫星'
                    : 'HIDE SATELLITES'
                  : lang === 'zh'
                  ? '显示卫星'
                  : 'SHOW SATELLITES'}
              </button>
            </div>

            {/* 搜索栏 */}
            <div className="mb-4">
              <label
                className="text-xs uppercase tracking-wide block mb-2"
                style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
              >
                {lang === 'zh' ? '搜索' : 'SEARCH'}
              </label>
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder={
                  lang === 'zh' ? '名称或NORAD ID...' : 'Name or NORAD ID...'
                }
                className="w-full px-3 py-2 text-xs font-mono"
                style={{
                  background: ARKNIGHTS_CONFIG.colors.darkLight,
                  color: ARKNIGHTS_CONFIG.colors.text,
                  border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                  clipPath:
                    'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                  outline: 'none',
                }}
              />
            </div>

            {/* 数据状态 */}
            <div
              className="p-3 mb-4"
              style={{
                background: ARKNIGHTS_CONFIG.colors.darkLight,
                border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                clipPath:
                  'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span
                  className="text-xs uppercase tracking-wide"
                  style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                >
                  {lang === 'zh' ? '可见卫星' : 'VISIBLE'}
                </span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: ARKNIGHTS_CONFIG.colors.primary }}
                >
                  {visibleSatellites.size}
                </span>
              </div>

              <div className="flex justify-between items-center mb-3">
                <span
                  className="text-xs uppercase tracking-wide"
                  style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                >
                  {lang === 'zh' ? '更新时间' : 'UPDATED'}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                >
                  {formatUpdateTime(lastUpdate)}
                </span>
              </div>

              <button
                onClick={() => fetchSatellites()}
                disabled={loading}
                className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                style={{
                  background: loading
                    ? ARKNIGHTS_CONFIG.colors.darkLight
                    : ARKNIGHTS_CONFIG.colors.dark,
                  color: loading
                    ? ARKNIGHTS_CONFIG.colors.textDim
                    : ARKNIGHTS_CONFIG.colors.text,
                  border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                  clipPath:
                    'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? lang === 'zh'
                    ? '刷新中...'
                    : 'REFRESHING...'
                  : lang === 'zh'
                  ? '刷新数据'
                  : 'REFRESH DATA'}
              </button>
            </div>

            {/* 选中卫星信息 */}
            {satellite && (
              <>
                {/* 分隔线 */}
                <div 
                  style={{
                    height: '1px',
                    background: ARKNIGHTS_CONFIG.colors.border,
                    marginBottom: '1rem',
                  }}
                />

                {/* 卫星信息标题 */}
                <div
                  className="flex items-center justify-between pb-3 mb-4"
                  style={{
                    borderBottom: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: '4px',
                        height: '16px',
                        background: orbitColor,
                      }}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: ARKNIGHTS_CONFIG.colors.text }}
                    >
                      {lang === 'zh' ? '卫星信息' : 'SATELLITE INFO'}
                    </span>
                  </div>
                  <button
                    onClick={() => selectSatellite(null)}
                    className="text-xs hover:opacity-70 transition-opacity"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    ✕
                  </button>
                </div>

                {/* 卫星名称 */}
                <div className="mb-4">
                  <h3
                    className="text-base font-bold mb-1"
                    style={{ color: ARKNIGHTS_CONFIG.colors.text }}
                  >
                    {satellite.name}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 font-bold uppercase tracking-wide inline-block"
                    style={{
                      background: `${orbitColor}20`,
                      color: orbitColor,
                      border: `1px solid ${orbitColor}`,
                    }}
                  >
                    {getOrbitTypeLabel(satellite.orbitType)}
                  </span>
                </div>

                {/* 基本信息 */}
                <div className="mb-4">
                  <h4
                    className="text-xs uppercase tracking-wide mb-2"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    {lang === 'zh' ? '基本信息' : 'BASIC INFO'}
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        NORAD ID
                      </span>
                      <span
                        className="font-mono font-bold"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.noradId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '高度' : 'ALTITUDE'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.altitude.toFixed(2)} km
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '速度' : 'VELOCITY'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.velocity.length().toFixed(2)} km/s
                      </span>
                    </div>
                  </div>
                </div>

                {/* 轨道参数 */}
                <div className="mb-4">
                  <h4
                    className="text-xs uppercase tracking-wide mb-2"
                    style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}
                  >
                    {lang === 'zh' ? '轨道参数' : 'ORBITAL PARAMETERS'}
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '倾角' : 'INCLINATION'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.inclination.toFixed(2)}°
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '偏心率' : 'ECCENTRICITY'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.eccentricity.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '周期' : 'PERIOD'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.period.toFixed(2)}{' '}
                        {lang === 'zh' ? '分钟' : 'min'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: ARKNIGHTS_CONFIG.colors.textDim }}>
                        {lang === 'zh' ? '半长轴' : 'SEMI-MAJOR AXIS'}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: ARKNIGHTS_CONFIG.colors.secondary }}
                      >
                        {satellite.orbitalElements.semiMajorAxis.toFixed(2)} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* 轨道控制按钮 */}
                <button
                  onClick={() => selectedSatellite && toggleOrbit(selectedSatellite)}
                  className="w-full py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200"
                  style={{
                    background: isOrbitVisible
                      ? `${orbitColor}20`
                      : ARKNIGHTS_CONFIG.colors.darkLight,
                    color: isOrbitVisible ? orbitColor : ARKNIGHTS_CONFIG.colors.text,
                    border: `1px solid ${
                      isOrbitVisible ? orbitColor : ARKNIGHTS_CONFIG.colors.border
                    }`,
                    clipPath:
                      'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  }}
                >
                  {isOrbitVisible
                    ? lang === 'zh'
                      ? '隐藏轨道'
                      : 'HIDE ORBIT'
                    : lang === 'zh'
                    ? '显示轨道'
                    : 'SHOW ORBIT'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
