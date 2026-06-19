/**
 * 宇宙尺度工具函数
 *
 * 提供 UniverseScale 枚举到数据文件路径的映射，
 * 以及相邻/远距离尺度的计算。
 */

import { UniverseScale } from '../types/universeTypes';

/**
 * 所有尺度的有序列表（从小到大的空间范围）
 */
const ALL_SCALES = [
  UniverseScale.SolarSystem,
  UniverseScale.NearbyStars,
  UniverseScale.Galaxy,
  UniverseScale.LocalGroup,
  UniverseScale.NearbyGroups,
  UniverseScale.VirgoSupercluster,
  UniverseScale.LaniakeaSupercluster,
  UniverseScale.NearbySupercluster,
  UniverseScale.ObservableUniverse,
];

/**
 * 根据尺度获取对应的数据文件路径
 */
export function getFilenameForScale(scale: UniverseScale): string {
  const basePath = '/data/universe/';

  switch (scale) {
    case UniverseScale.LocalGroup:
      return `${basePath}local-group.bin`;
    case UniverseScale.NearbyGroups:
      return `${basePath}nearby-groups.bin`;
    case UniverseScale.VirgoSupercluster:
      return `${basePath}virgo-supercluster.bin`;
    case UniverseScale.LaniakeaSupercluster:
      return `${basePath}laniakea.bin`;
    default:
      throw new Error(`No data file for scale: ${scale}`);
  }
}

/**
 * 获取相邻的尺度（±1 级）
 */
export function getAdjacentScales(scale: UniverseScale): UniverseScale[] {
  const currentIndex = ALL_SCALES.indexOf(scale);
  if (currentIndex === -1) return [];

  const adjacent: UniverseScale[] = [];

  if (currentIndex > 0) {
    adjacent.push(ALL_SCALES[currentIndex - 1]);
  }

  if (currentIndex < ALL_SCALES.length - 1) {
    adjacent.push(ALL_SCALES[currentIndex + 1]);
  }

  return adjacent;
}

/**
 * 获取远距离的尺度（距离 >= 3 级）
 */
export function getDistantScales(scale: UniverseScale): UniverseScale[] {
  const currentIndex = ALL_SCALES.indexOf(scale);
  if (currentIndex === -1) return [];

  const distant: UniverseScale[] = [];

  for (let i = 0; i < ALL_SCALES.length; i++) {
    if (Math.abs(i - currentIndex) >= 3) {
      distant.push(ALL_SCALES[i]);
    }
  }

  return distant;
}
