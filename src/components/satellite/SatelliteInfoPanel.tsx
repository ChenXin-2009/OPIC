/**
 * SatelliteInfoPanel - 卫星信息面板（明日方舟风格）
 * 
 * 显示选中卫星的详细信息和轨道参数
 */

'use client';

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

interface SatelliteInfoPanelProps {
  lang?: 'zh' | 'en';
}

export function SatelliteInfoPanel({ lang = 'zh' }: SatelliteInfoPanelProps) {
  const {
    selectedSatellite,
    satellites,
    showOrbits,
    selectSatellite,
    toggleOrbit,
  } = useSatelliteStore();

  if (!selectedSatellite) return null;

  const satellite = satellites.get(selectedSatellite);
  if (!satellite) return null;

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

  // 获取类别标签
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, { zh: string; en: string }> = {
      active: { zh: '活跃卫星', en: 'Active' },
      stations: { zh: '空间站', en: 'ISS' },
      'gps-ops': { zh: 'GPS', en: 'GPS' },
      geo: { zh: '通信卫星', en: 'Communication' },
      weather: { zh: '气象卫星', en: 'Weather' },
      science: { zh: '科学卫星', en: 'Science' },
      other: { zh: '其他', en: 'Other' },
    };
    return labels[category]?.[lang] || category;
  };

  const orbitColor = getOrbitColor(satellite.orbitType);
  const isOrbitVisible = showOrbits.has(selectedSatellite);

  return (
    <div
      className="fixed z-40"
      style={{
        top: '5rem',
        right: '1rem',
        width: '20rem',
        background: ARKNIGHTS_CONFIG.colors.dark,
        border: `2px solid ${ARKNIGHTS_CONFIG.colors.border}`,
        clipPath:
          'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        animation: 'slideInFromRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
        {/* 标题栏 */}
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
          <div className="flex gap-2">
            <span
              className="text-xs px-2 py-0.5 font-bold uppercase tracking-wide"
              style={{
                background: `${orbitColor}20`,
                color: orbitColor,
                border: `1px solid ${orbitColor}`,
              }}
            >
              {getOrbitTypeLabel(satellite.orbitType)}
            </span>
            <span
              className="text-xs px-2 py-0.5 font-mono"
              style={{
                background: ARKNIGHTS_CONFIG.colors.darkLight,
                color: ARKNIGHTS_CONFIG.colors.secondary,
                border: `1px solid ${ARKNIGHTS_CONFIG.colors.border}`,
              }}
            >
              {getCategoryLabel(satellite.category)}
            </span>
          </div>
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
          onClick={() => toggleOrbit(selectedSatellite)}
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
      </div>

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
