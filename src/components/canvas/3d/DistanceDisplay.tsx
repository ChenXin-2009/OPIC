/**
 * DistanceDisplay.tsx - 距离和宇宙尺度显示组件
 * 
 * 在左侧垂直居中显示相机距离和当前宇宙尺度
 * 支持多种单位：AU、公里、光年等
 */

'use client';

import { DISTANCE_DISPLAY_CONFIG } from '@/lib/config/visualConfig';
import { UniverseScale } from '@/lib/types/universeTypes';
import { UNIVERSE_SCALE_CONFIG } from '@/lib/config/universeConfig';

// 单位转换常量
const AU_TO_KM = 149597870.7; // 1 AU = 149,597,870.7 公里
const AU_TO_LIGHT_YEAR = 1 / 63241.077; // 1 AU = 1/63241.077 光年

interface DistanceDisplayProps {
  distanceAU: number; // 距离（AU单位，地心距离）
}

// 地球半径（AU）
const EARTH_RADIUS_AU = 0.000043;
// 地球半径（km）
const EARTH_RADIUS_KM = EARTH_RADIUS_AU * AU_TO_KM; // ≈ 6432 km

// 尺度名称映射（中文）
const scaleNames: Record<UniverseScale, string> = {
  [UniverseScale.SolarSystem]: '太阳系',
  [UniverseScale.NearbyStars]: '近邻恒星',
  [UniverseScale.Galaxy]: '银河系',
  [UniverseScale.LocalGroup]: '本星系群',
  [UniverseScale.NearbyGroups]: '近邻星系群',
  [UniverseScale.VirgoSupercluster]: '室女座超星系团',
  [UniverseScale.LaniakeaSupercluster]: '拉尼亚凯亚超星系团',
  [UniverseScale.NearbySupercluster]: '近邻超星系团',
  [UniverseScale.ObservableUniverse]: '可观测宇宙',
};

/**
 * 根据相机距离确定当前宇宙尺度
 */
function getUniverseScale(distance: number): UniverseScale {
  const config = UNIVERSE_SCALE_CONFIG;
  
  if (distance >= config.observableUniverseShowStart) {
    return UniverseScale.ObservableUniverse;
  } else if (distance >= config.nearbySuperclusterShowStart) {
    return UniverseScale.NearbySupercluster;
  } else if (distance >= config.laniakeaShowStart) {
    return UniverseScale.LaniakeaSupercluster;
  } else if (distance >= config.virgoShowStart) {
    return UniverseScale.VirgoSupercluster;
  } else if (distance >= config.nearbyGroupsShowStart) {
    return UniverseScale.NearbyGroups;
  } else if (distance >= config.localGroupShowStart) {
    return UniverseScale.LocalGroup;
  } else if (distance >= config.galaxyShowStart) {
    return UniverseScale.Galaxy;
  } else if (distance >= config.nearbyStarsShowStart) {
    return UniverseScale.NearbyStars;
  } else {
    return UniverseScale.SolarSystem;
  }
}

/**
 * 格式化距离显示
 * 根据距离大小自动选择合适的单位
 * 当距离接近地球时，显示地表距离（地心距离 - 地球半径）
 */
function formatDistance(distanceAU: number): { value: string; unit: string; label: string } {
  const distanceKM = distanceAU * AU_TO_KM;
  const distanceLY = distanceAU * AU_TO_LIGHT_YEAR;

  // 距离地球中心 < 0.01 AU（约 150 万公里）时，显示地表距离
  if (distanceAU < 0.01) {
    const surfaceDistKM = distanceKM - EARTH_RADIUS_KM;
    const label = '距地表';

    if (surfaceDistKM <= 0) {
      // 在地表以下（不应发生，但保险起见）
      return { value: '0', unit: 'm', label };
    } else if (surfaceDistKM < 0.001) {
      // < 1 m
      return { value: (surfaceDistKM * 1000).toFixed(1), unit: 'm', label };
    } else if (surfaceDistKM < 1) {
      // 1m ~ 1km
      return { value: (surfaceDistKM * 1000).toFixed(0), unit: 'm', label };
    } else if (surfaceDistKM < 1000) {
      // 1km ~ 1000km
      return { value: surfaceDistKM.toFixed(2), unit: 'km', label };
    } else if (surfaceDistKM < 1000000) {
      // 1000km ~ 100万km
      return { value: (surfaceDistKM / 1000).toFixed(3), unit: '千km', label };
    } else {
      return { value: (surfaceDistKM / 1000000).toFixed(4), unit: '百万km', label };
    }
  }

  const label = '距地球';

  // 0.01 - 1 AU 之间
  if (distanceAU < 1) {
    const millionKM = distanceKM / 1000000;
    if (millionKM < 10) {
      return { value: millionKM.toFixed(3), unit: '百万km', label };
    }
    return { value: distanceAU.toFixed(5), unit: 'AU', label };
  }

  // 1 - 10 AU
  if (distanceAU < 10) {
    return { value: distanceAU.toFixed(4), unit: 'AU', label };
  }

  // 10 - 10000 AU
  if (distanceAU < 10000) {
    return { value: distanceAU.toFixed(2), unit: 'AU', label };
  }

  // > 10000 AU 切换到光年
  if (distanceLY < 1) {
    return { value: distanceLY.toFixed(4), unit: '光年', label };
  }
  if (distanceLY < 100) {
    return { value: distanceLY.toFixed(3), unit: '光年', label };
  }
  if (distanceLY < 10000) {
    return { value: distanceLY.toFixed(1), unit: '光年', label };
  }
  if (distanceLY < 1000000) {
    return { value: (distanceLY / 1000).toFixed(2), unit: '千光年', label };
  }
  return { value: (distanceLY / 1000000).toFixed(2), unit: '百万光年', label };
}

export default function DistanceDisplay({ distanceAU }: DistanceDisplayProps) {
  const { value, unit, label } = formatDistance(distanceAU);
  const cfg = DISTANCE_DISPLAY_CONFIG;
  const scale = getUniverseScale(distanceAU);
  const scaleName = scaleNames[scale];
  
  // 判断是否显示精度警告（距离超过 3000 AU 时）
  const showPrecisionWarning = distanceAU > 3000;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${cfg.left}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        color: cfg.textColor,
        fontSize: `${cfg.titleFontSize}px`,
        fontFamily: cfg.fontFamily,
        textShadow: cfg.textShadow,
        backgroundColor: cfg.backgroundColor,
        backdropFilter: `blur(${cfg.backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${cfg.backdropBlur}px)`,
        padding: `${cfg.padding.vertical}px ${cfg.padding.horizontal}px`,
        borderRadius: `${cfg.borderRadius}px`,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: cfg.zIndex,
        display: 'flex',
        flexDirection: 'column',
        gap: `${cfg.lineGap}px`,
      }}
    >
      {/* 宇宙尺度 */}
      <div style={{ 
        opacity: 0.6,
        fontSize: '11px',
        fontWeight: 400,
      }}>当前尺度</div>
      <div style={{ 
        fontSize: '16px', 
        fontWeight: 700,
        fontFamily: '"Novecento Wide", sans-serif',
        marginBottom: '8px',
      }}>{scaleName}</div>
      
      {/* 距离信息 */}
      <div style={{ opacity: cfg.titleOpacity }}>{label}</div>
      <div style={{ 
        fontSize: `${cfg.valueFontSize}px`, 
        fontWeight: 400,
        fontFamily: '"Novecento Wide", sans-serif',
      }}>{value}</div>
      <div style={{ 
        fontSize: `${cfg.unitFontSize}px`, 
        opacity: cfg.unitOpacity,
        fontWeight: 700,
        fontFamily: '"Novecento Wide", sans-serif',
      }}>{unit}</div>
      
      {/* 精度警告 */}
      {showPrecisionWarning && (
        <div style={{ 
          fontSize: '11px', 
          color: '#999999',
          opacity: 0.7,
          marginTop: '4px',
          maxWidth: '120px',
          lineHeight: '1.3',
        }}>
          该尺度下精度有限
        </div>
      )}
    </div>
  );
}
