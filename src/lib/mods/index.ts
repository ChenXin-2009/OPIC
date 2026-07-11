/**
 * @module mods
 * @description 核心MOD模块导出 - 支持自动注册和动态加载
 */

import { registerMod } from '@/lib/mod-manager/init';
import { getAllRegisteredMods } from './auto-registry';

/**
 * 注册所有核心MOD - 自动从注册表加载
 * 
 * **新的MOD加载机制：**
 * - 系统会自动从 auto-registry.ts 加载所有MOD
 * - 无需手动配置列表，只需添加导入
 * - 即插即用，自动发现
 * 
 * **添加新 MOD：**
 * 1. 在 src/lib/mods/ 下创建 MOD 文件夹
 * 2. 创建 manifest.ts 和 index.ts
 * 3. 在 index.ts 中导出 get*Mod() 函数
 * 4. 在 auto-registry.ts 中添加导入和注册
 * 5. 重启应用
 * 
 * **删除 MOD：**
 * 1. 从 auto-registry.ts 中移除导入和注册
 * 2. 删除 MOD 文件夹（可选）
 * 3. 重启应用
 * 
 * **优势：**
 * - 不需要维护 JSON 配置文件
 * - TypeScript 类型检查
 * - 构建时错误检测
 * - 更好的 IDE 支持
 */
export async function registerCoreMods(): Promise<void> {
  try {
    console.log('[MODs] 开始从自动注册表加载MOD...');
    
    // 从注册表获取所有MOD
    const allMods = getAllRegisteredMods();
    
    if (allMods.length === 0) {
      console.warn('[MODs] 注册表中没有MOD');
      return;
    }
    
    console.log(`[MODs] 发现 ${allMods.length} 个MOD，开始注册...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 注册所有MOD
    for (const mod of allMods) {
      try {
        const success = registerMod(mod.manifest, mod.hooks);
        if (success) {
          successCount++;
          console.log(`[MODs] ✓ ${mod.manifest.name} (${mod.manifest.id})`);
        } else {
          failCount++;
          console.warn(`[MODs] ✗ ${mod.manifest.name} (${mod.manifest.id}) - 注册失败`);
        }
      } catch (error) {
        failCount++;
        console.error(`[MODs] ✗ ${mod.manifest.name} (${mod.manifest.id}) - 错误:`, error);
      }
    }
    
    console.log(
      `[MODs] MOD注册完成: ${successCount}个成功` +
      (failCount > 0 ? `, ${failCount}个失败` : '')
    );
  } catch (error) {
    console.error('[MODs] MOD自动注册失败:', error);
  }
}

// 导出各个MOD（保持向后兼容）
export { getSatelliteTrackingMod } from './satellite-tracking';
export { getCesiumIntegrationMod } from './cesium-integration';
export { getGravityGridMod } from './gravity-grid';
export { getWeatherDisasterMod } from './weather-disaster';
export { getGlobalTrafficMod } from './global-traffic';
export { getSpaceLaunchesMod } from './space-launches';
export { getMoonMod } from './moon';
export { getSpaceFlightMod } from './space-flight';


// 导出注册表工具
export { getAllRegisteredMods, getModCount } from './auto-registry';
