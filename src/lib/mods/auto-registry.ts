/**
 * MOD自动注册表
 * 
 * ⚠️ 此文件由脚本自动生成，请勿手动编辑！
 * 
 * 生成时间: 2026-05-01T00:41:29.316Z
 * MOD数量: 5
 * 
 * 要重新生成此文件，运行: npm run generate-mods
 */

// 自动导入所有MOD
import { getCesiumIntegrationMod } from './cesium-integration';
import { getGlobalTrafficMod } from './global-traffic';
import { getSatelliteTrackingMod } from './satellite-tracking';
import { getSpaceLaunchesMod } from './space-launches';
import { getWeatherDisasterMod } from './weather-disaster';

/**
 * MOD注册表
 * 所有可用的MOD都在这里注册
 */
export const MOD_REGISTRY = [
  getCesiumIntegrationMod,
  getGlobalTrafficMod,
  getSatelliteTrackingMod,
  getSpaceLaunchesMod,
  getWeatherDisasterMod,
] as const;

/**
 * 获取所有注册的MOD
 */
export function getAllRegisteredMods() {
  return MOD_REGISTRY.map(getModFn => {
    try {
      return getModFn();
    } catch (error) {
      console.error('[Auto Registry] 加载MOD失败:', error);
      return null;
    }
  }).filter(mod => mod !== null);
}

/**
 * 获取MOD数量
 */
export function getModCount(): number {
  return MOD_REGISTRY.length;
}

/**
 * 获取MOD列表信息
 */
export function getModList() {
  return getAllRegisteredMods().map(mod => ({
    id: mod.manifest.id,
    name: mod.manifest.name,
    nameZh: mod.manifest.nameZh,
    version: mod.manifest.version,
    description: mod.manifest.description,
  }));
}
