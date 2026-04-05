/**
 * Cesium集成MOD实现
 */

import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import { cesiumIntegrationManifest } from './manifest';

/**
 * Cesium集成MOD生命周期钩子
 */
export const cesiumIntegrationHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[Cesium Integration] MOD加载中...');
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('[Cesium Integration] MOD启用');
    
    // 注册Cesium图层
    context.render.registerCesiumLayer({
      id: 'default-imagery',
      type: 'imagery',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    });
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[Cesium Integration] MOD禁用');
    
    // 注销Cesium图层
    context.render.unregisterCesiumLayer('default-imagery');
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('[Cesium Integration] MOD卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('[Cesium Integration] MOD错误:', error);
  },
};

/**
 * 获取Cesium集成MOD配置
 */
export function getCesiumIntegrationMod() {
  return {
    manifest: cesiumIntegrationManifest,
    hooks: cesiumIntegrationHooks,
  };
}