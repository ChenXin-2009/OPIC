/**
 * MOD自动注册表
 * 
 * ⚠️ 此文件由脚本自动生成，请勿手动编辑！
 * 
 * 生成时间: 2026-07-11T15:13:12.382Z
 * MOD数量: 8
 * 
 * 要重新生成此文件，运行: npm run generate-mods
 */

// 自动导入所有MOD
import { getCesiumIntegrationMod } from './cesium-integration';
import { getGlobalTrafficMod } from './global-traffic';
import { getGravityGridMod } from './gravity-grid';
import { getMoonMod } from './moon';
import { getSatelliteTrackingMod } from './satellite-tracking';
import { getSpaceFlightMod } from './space-flight';
import { getSpaceLaunchesMod } from './space-launches';
import { getWeatherDisasterMod } from './weather-disaster';

/**
 * MOD注册表
 * 所有可用的MOD都在这里注册
 */
export const MOD_REGISTRY = [
  getCesiumIntegrationMod,
  getGlobalTrafficMod,
  getGravityGridMod,
  getMoonMod,
  getSatelliteTrackingMod,
  getSpaceFlightMod,
  getSpaceLaunchesMod,
  getWeatherDisasterMod,
] as const;

/**
 * 获取所有注册的 MOD 实例。
 * 遍历注册表中的工厂函数并依次调用，加载失败的 MOD 会被过滤掉。
 * @returns 已成功初始化的 MOD 实例数组，每个元素是解析后的 Mod 对象
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
 * 获取注册表中的 MOD 总数（包含可能加载失败的条目）。
 * @returns 注册在 MOD_REGISTRY 中的工厂函数个数
 */
export function getModCount(): number {
  return MOD_REGISTRY.length;
}

/**
 * 获取所有已成功加载的 MOD 精简摘要列表。
 * 每个条目包含 MOD 的元信息（id、名称、版本、描述），不包含运行时实例。
 * @returns 由已加载 MOD 的 manifest 元数据组成的数组
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
