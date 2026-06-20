/**
 * 全球货运与贸易路线追踪 MOD
 */

import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import * as THREE from 'three';
import { globalTrafficManifest } from './manifest';
import { TrafficRenderer } from './TrafficRenderer';
import { DEMO_TRADE_ROUTES, DEMO_AIR_ROUTES, MAJOR_PORTS, MAJOR_AIRPORTS } from './demoData';
import { DEFAULT_CONFIG, type GlobalTrafficConfig } from './types';

export const globalTrafficHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[Global Traffic] MOD 加载中...');
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('[Global Traffic] MOD 启用');

    const config: GlobalTrafficConfig = {
      ...DEFAULT_CONFIG,
      ...(context.config as Partial<GlobalTrafficConfig>),
    };

    // 创建渲染器
    const renderer = new TrafficRenderer();
    const group = renderer.getGroup();

    // 将 group 添加到 Three.js 场景
    try {
      const scene = context.render.getScene() as THREE.Scene;
      scene.add(group);
    } catch {
      context.logger.warn('[Global Traffic] 无法获取场景，渲染器未添加');
    }

    // 渲染静态演示数据（贸易路线 + 港口）
    const allRoutes = [
      ...(config.showTradeRoutes ? DEMO_TRADE_ROUTES : []),
      ...(config.showTradeRoutes ? DEMO_AIR_ROUTES : []),
    ];
    renderer.updateTradeRoutes(allRoutes, config.opacity);

    const allPorts = [
      ...(config.showPorts ? MAJOR_PORTS : []),
      ...(config.showPorts ? MAJOR_AIRPORTS : []),
    ];
    renderer.updatePorts(allPorts, config.opacity);

    // 存储状态
    context.setState({ renderer, config });

    context.logger.info('[Global Traffic] 静态贸易路线和港口已渲染');
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[Global Traffic] MOD 禁用');

    const state = context.getState() as { renderer?: TrafficRenderer };
    if (state.renderer) {
      try {
        const scene = context.render.getScene() as THREE.Scene;
        scene.remove(state.renderer.getGroup());
      } catch { /* ignore */ }
      state.renderer.dispose();
    }
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('[Global Traffic] MOD 卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('[Global Traffic] 错误:', error);
  },
  
  // 命令处理器
  handleToggle: (context: ModContext) => {
    context.logger.info('[Global Traffic] 切换全球交通监测显示');
    
    // 触发打开窗口的事件
    context.emit('mod:open-window', {
      modId: 'global-traffic',
      windowId: 'global-traffic-window',
      title: 'Global Traffic & Trade Routes',
      titleZh: '全球货运与贸易路线',
    });
  },
};

export function getGlobalTrafficMod() {
  return {
    manifest: globalTrafficManifest,
    hooks: globalTrafficHooks,
  };
}

// Re-exports for UI components
export { globalTrafficManifest } from './manifest';
export type { GlobalTrafficConfig, VesselPosition, FlightPosition, TradeRoute, Port } from './types';
export { DEFAULT_CONFIG } from './types';
export { TRAFFIC_DATA_SOURCES, DATA_SOURCE_MAP, CATEGORY_LABELS } from './dataSources';
export { DEMO_TRADE_ROUTES, DEMO_AIR_ROUTES, MAJOR_PORTS, MAJOR_AIRPORTS } from './demoData';
