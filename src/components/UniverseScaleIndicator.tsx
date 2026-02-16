/**
 * UniverseScaleIndicator.tsx - 宇宙尺度指示器组件
 * 
 * 显示当前相机所在的宇宙尺度和距离信息
 */

import React from 'react';
import { UniverseScale } from '../lib/types/universeTypes';
import { UNIVERSE_SCALE_CONFIG, LIGHT_YEAR_TO_AU } from '../lib/config/universeConfig';

interface UniverseScaleIndicatorProps {
  cameraDistance: number; // 相机距离（AU）
}

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
 */
function formatDistance(distance: number): string {
  const lightYear = LIGHT_YEAR_TO_AU;
  
  if (distance < 1000) {
    return `${distance.toFixed(1)} AU`;
  } else if (distance < lightYear) {
    return `${distance.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} AU`;
  } else if (distance < 1000 * lightYear) {
    const ly = distance / lightYear;
    return `${ly.toFixed(1)} 光年`;
  } else if (distance < 1_000_000 * lightYear) {
    const ly = distance / lightYear;
    return `${ly.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 光年`;
  } else if (distance < 1_000_000_000 * lightYear) {
    const mly = distance / (lightYear * 1_000_000);
    return `${mly.toFixed(1)} 百万光年`;
  } else {
    const bly = distance / (lightYear * 100_000_000);
    return `${bly.toFixed(1)} 亿光年`;
  }
}

/**
 * 宇宙尺度指示器组件
 */
export const UniverseScaleIndicator: React.FC<UniverseScaleIndicatorProps> = ({ cameraDistance }) => {
  const scale = getUniverseScale(cameraDistance);
  const scaleName = scaleNames[scale];
  const formattedDistance = formatDistance(cameraDistance);
  
  return (
    <div className="fixed top-4 right-4 bg-black/70 text-white px-4 py-3 rounded-lg backdrop-blur-sm z-50 min-w-[200px]">
      <div className="text-sm font-medium text-gray-300 mb-1">当前尺度</div>
      <div className="text-lg font-bold mb-2">{scaleName}</div>
      <div className="text-sm text-gray-400">
        <span className="text-gray-500">距离：</span>
        <span className="text-white font-mono">{formattedDistance}</span>
      </div>
    </div>
  );
};
