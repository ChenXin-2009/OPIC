/**
 * 卫星追踪MOD实现
 */

import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import { satelliteTrackingManifest } from './manifest';

/**
 * 卫星追踪MOD生命周期钩子
 */
export const satelliteTrackingHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[Satellite Tracking] MOD加载中...');
    
    // 加载卫星数据
    try {
      await context.satellite.fetchSatellites();
      context.logger.info('[Satellite Tracking] 卫星数据加载完成');
    } catch (error) {
      context.logger.error('[Satellite Tracking] 卫星数据加载失败:', error);
    }
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('[Satellite Tracking] MOD启用');
    
    // 订阅卫星更新
    const unsubscribe = context.satellite.onSatellitesUpdate((satellites) => {
      context.logger.debug(`[Satellite Tracking] 卫星数据更新: ${satellites.length}颗`);
    });

    // 存储取消订阅函数
    context.setState({ unsubscribe });
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[Satellite Tracking] MOD禁用');
    
    // 取消订阅
    const state = context.getState();
    if (state.unsubscribe) {
      (state.unsubscribe as () => void)();
    }
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('[Satellite Tracking] MOD卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('[Satellite Tracking] MOD错误:', error);
  },
};

/**
 * 获取卫星追踪MOD配置
 */
export function getSatelliteTrackingMod() {
  return {
    manifest: satelliteTrackingManifest,
    hooks: satelliteTrackingHooks,
  };
}